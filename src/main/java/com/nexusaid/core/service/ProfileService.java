package com.nexusaid.core.service;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.nexusaid.core.dto.HierarchyDtos;
import com.nexusaid.core.entity.Committee;
import com.nexusaid.core.entity.CommitteeRole;
import com.nexusaid.core.entity.Trainer;
import com.nexusaid.core.entity.User;
import com.nexusaid.core.entity.Volunteer;
import com.nexusaid.core.entity.Donor;
import com.nexusaid.core.entity.enums.AccountStatus;
import com.nexusaid.core.entity.enums.CommitteeRoleStatus;
import com.nexusaid.core.entity.enums.CommitteeType;
import com.nexusaid.core.entity.enums.RoleTitle;
import com.nexusaid.core.entity.enums.UserType;
import com.nexusaid.core.repository.CommitteeRepository;
import com.nexusaid.core.repository.CommitteeRoleRepository;
import com.nexusaid.core.repository.TrainerRepository;
import com.nexusaid.core.repository.UserRepository;
import com.nexusaid.core.repository.VolunteerRepository;
import jakarta.persistence.EntityManager;
import lombok.RequiredArgsConstructor;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import lombok.RequiredArgsConstructor;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class ProfileService {

    private final VolunteerRepository volunteerRepository;
    private final TrainerRepository trainerRepository;
    private final UserRepository userRepository;
    private final CommitteeRoleRepository committeeRoleRepository;
    private final CommitteeRepository committeeRepository;
    private final CloudinaryService cloudinaryService;
    private final EntityManager entityManager;
    private final EmailService emailService;
    private final NotificationService notificationService;

    public List<Volunteer> getPendingVolunteersForCommittee(UUID committeeId, UUID requestingUserId) {
        verifyPresidentAccess(committeeId, requestingUserId);
        return volunteerRepository.findByCommitteeIdAndAccountStatus(committeeId, AccountStatus.PENDING);
    }

    public List<Volunteer> getAllVolunteersForCommittee(UUID committeeId, UUID requestingUserId) {
        verifyPresidentAccess(committeeId, requestingUserId);
        return volunteerRepository.findByCommitteeId(committeeId);
    }

    @Transactional
    public void approveVolunteer(UUID volunteerId, UUID requestingUserId) {
        Volunteer volunteer = volunteerRepository.findById(volunteerId)
                .orElseThrow(() -> new IllegalArgumentException("Volunteer not found"));

        if (volunteer.getCommitteeId() == null) {
            throw new IllegalArgumentException("Volunteer does not belong to any committee");
        }

        verifyPresidentAccess(volunteer.getCommitteeId(), requestingUserId);

        volunteer.setAccountStatus(AccountStatus.APPROVED);
        volunteerRepository.save(volunteer);
    }

    @Transactional
    public void rejectVolunteer(UUID volunteerId, UUID requestingUserId) {
        Volunteer volunteer = volunteerRepository.findById(volunteerId)
                .orElseThrow(() -> new IllegalArgumentException("Volunteer not found"));

        if (volunteer.getCommitteeId() == null) {
            throw new IllegalArgumentException("Volunteer does not belong to any committee");
        }

        verifyPresidentAccess(volunteer.getCommitteeId(), requestingUserId);

        volunteer.setAccountStatus(AccountStatus.REJECTED);
        volunteerRepository.save(volunteer);
    }

    @Transactional
    public Trainer promoteToTrainer(UUID volunteerId, String expertiseDomains, UUID requestingUserId) {
        Volunteer volunteer = volunteerRepository.findById(volunteerId)
                .orElseThrow(() -> new IllegalArgumentException("Volunteer not found"));

        if (volunteer.getCommitteeId() == null) {
            throw new IllegalArgumentException("Volunteer does not belong to any committee");
        }

        verifyPresidentAccess(volunteer.getCommitteeId(), requestingUserId);

        String domains = expertiseDomains != null ? expertiseDomains : "[]";

        // Upsert into trainers join-table
        int updated = entityManager.createNativeQuery(
                "UPDATE trainers SET expertise_domains = CAST(:domains AS jsonb), promoted_at = NOW() WHERE id = :id")
                .setParameter("domains", domains)
                .setParameter("id", volunteerId)
                .executeUpdate();

        if (updated == 0) {
            entityManager.createNativeQuery(
                    "INSERT INTO trainers (id, expertise_domains, promoted_at) VALUES (:id, CAST(:domains AS jsonb), NOW())")
                    .setParameter("id", volunteerId)
                    .setParameter("domains", domains)
                    .executeUpdate();
        }

        // Also update user_type in users table to TRAINER so that user.getType() returns TRAINER
        entityManager.createNativeQuery(
                "UPDATE users SET user_type = 'TRAINER' WHERE id = :id")
                .setParameter("id", volunteerId)
                .executeUpdate();

        entityManager.flush();
        entityManager.clear();

        Trainer trainer = trainerRepository.findById(volunteerId)
                .orElseThrow(() -> new IllegalStateException("Trainer not found after promotion"));

        // Parse domains list for email
        List<String> domainList = new ArrayList<>();
        try {
            domainList = new com.fasterxml.jackson.databind.ObjectMapper()
                    .readValue(domains, new com.fasterxml.jackson.core.type.TypeReference<List<String>>() {});
        } catch (Exception ignored) {}

        // Send promotion email
        final List<String> finalDomains = domainList;
        emailService.sendTrainerPromotionEmail(trainer.getEmail(), trainer.getFullName(), finalDomains);

        // Send platform notification
        User trainerUser = userRepository.findById(volunteerId).orElse(null);
        if (trainerUser != null) {
            notificationService.sendNotification(
                    trainerUser,
                    "TRAINER_PROMOTED",
                    "🎓 Félicitations — Vous êtes maintenant Formateur !",
                    "Vous avez été promu(e) formateur avec les domaines : " + String.join(", ", finalDomains),
                    "/volunteers"
            );
        }

        return trainer;
    }

    /**
     * Access check for trainer management actions (President, VP, RespJeunesse, Admin).
     * Used by TrainerService. VP is included (unlike verifyPresidentAccess).
     */
    public void verifyManagerAccess(UUID committeeId, UUID requestingUserId) {
        User user = userRepository.findById(requestingUserId)
                .orElseThrow(() -> new AccessDeniedException("User not found"));

        if (user.getType() == UserType.ADMIN) return;

        List<CommitteeRole> approvedRoles = committeeRoleRepository.findByVolunteerId(requestingUserId)
                .stream()
                .filter(r -> r.getStatus() == CommitteeRoleStatus.APPROVED)
                .toList();

        // National role → access all
        boolean isNational = approvedRoles.stream()
                .anyMatch(r -> r.getCommittee().getType() == CommitteeType.NATIONAL);
        if (isNational) return;

        // Direct PRESIDENT, VP, or RESP_JEUNESSE of this committee
        boolean directAccess = approvedRoles.stream()
                .filter(r -> r.getCommittee().getId().equals(committeeId))
                .anyMatch(r -> r.getTitle() == RoleTitle.PRESIDENT
                        || r.getTitle() == RoleTitle.VICE_PRESIDENT
                        || r.getTitle() == RoleTitle.RESP_JEUNESSE);
        if (directAccess) return;

        // Regional ancestor access
        boolean regionalAccess = approvedRoles.stream()
                .filter(r -> r.getCommittee().getType() == CommitteeType.REGIONAL)
                .anyMatch(r -> {
                    List<Committee> subs = committeeRepository.findByParentCommitteeId(r.getCommittee().getId());
                    return subs.stream().anyMatch(sub -> sub.getId().equals(committeeId));
                });
        if (regionalAccess) return;

        throw new AccessDeniedException(
                "Accès refusé : vous n'avez pas les droits pour gérer les formateurs de ce comité.");
    }

    public void verifyPresidentAccess(UUID committeeId, UUID requestingUserId) {
        User user = userRepository.findById(requestingUserId)
                .orElseThrow(() -> new AccessDeniedException("User not found"));

        // Rule 0: Super Admins have 360° access
        if (user.getType() == UserType.ADMIN)
            return;

        // Rule 1: Multi-level President access (Direct or Ancestor)
        boolean isPresidentResult = committeeRoleRepository.existsByCommitteeIdAndTitleAndVolunteerId(
                committeeId, RoleTitle.PRESIDENT, requestingUserId);
        if (isPresidentResult)
            return;

        boolean isAncestorPresident = isPresidentOfAncestor(committeeId, requestingUserId);
        if (isAncestorPresident)
            return;

        // Rule 2: RESP_JEUNESSE (direct or hierarchical ancestor)
        List<CommitteeRole> approvedRoles = committeeRoleRepository.findByVolunteerId(requestingUserId)
                .stream()
                .filter(r -> r.getStatus() == CommitteeRoleStatus.APPROVED)
                .toList();

        boolean isRespJeunesseOfDirectOrParent = approvedRoles.stream()
                .filter(r -> r.getTitle() == RoleTitle.RESP_JEUNESSE)
                .anyMatch(r -> {
                    if (r.getCommittee().getId().equals(committeeId)) {
                        return true;
                    }
                    if (r.getCommittee().getType() == CommitteeType.REGIONAL) {
                        List<Committee> subCommittees = committeeRepository.findByParentCommitteeId(r.getCommittee().getId());
                        return subCommittees.stream().anyMatch(sub -> sub.getId().equals(committeeId));
                    }
                    if (r.getCommittee().getType() == CommitteeType.NATIONAL) {
                        return true;
                    }
                    return false;
                });

        if (isRespJeunesseOfDirectOrParent)
            return;

        // Check if user is National President (another way to be sure)
        List<CommitteeRole> myRoles = committeeRoleRepository.findByVolunteerId(requestingUserId);
        boolean isNationalPresident = myRoles.stream()
                .anyMatch(r -> r.getTitle() == RoleTitle.PRESIDENT &&
                        r.getCommittee().getType() == CommitteeType.NATIONAL &&
                        r.getStatus() == CommitteeRoleStatus.APPROVED);
        if (isNationalPresident)
            return;

        throw new AccessDeniedException(
                "Seul le PRÉSIDENT (hiérarchique) ou le RESP_JEUNESSE (de ce comité) peut effectuer cette action.");
    }


    /**
     * Checks if the user is a President of any ancestor committee.
     */
    private boolean isPresidentOfAncestor(UUID committeeId, UUID userId) {
        Committee committee = committeeRepository.findById(committeeId).orElse(null);
        if (committee == null)
            return false;

        Committee parent = committee.getParentCommittee();
        while (parent != null) {
            Optional<CommitteeRole> role = committeeRoleRepository.findByCommitteeIdAndTitle(parent.getId(),
                    RoleTitle.PRESIDENT);
            if (role.isPresent() && role.get().getVolunteer().getId().equals(userId)
                    && role.get().getStatus() == CommitteeRoleStatus.APPROVED) {
                return true;
            }
            parent = parent.getParentCommittee();
        }
        return false;
    }

    /**
     * Returns all committees that the requesting user can see,
     * based on their highest president role.
     */
    public List<UUID> getVisibleCommitteeIds(UUID requestingUserId) {
        User user = userRepository.findById(requestingUserId).orElse(null);
        if (user != null && user.getType() == UserType.ADMIN) {
            return committeeRepository.findAll().stream().map(Committee::getId).toList();
        }

        List<CommitteeRole> approvedRoles = committeeRoleRepository.findByVolunteerId(requestingUserId)
                .stream()
                .filter(r -> r.getStatus() == CommitteeRoleStatus.APPROVED)
                .toList();

        if (approvedRoles.isEmpty()) {
            Volunteer v = volunteerRepository.findById(requestingUserId).orElse(null);
            if (v != null && v.getCommitteeId() != null) {
                return List.of(v.getCommitteeId());
            }
            return List.of();
        }

        boolean isNational = approvedRoles.stream()
                .anyMatch(r -> r.getCommittee().getType() == CommitteeType.NATIONAL);
        boolean isRegional = approvedRoles.stream()
                .anyMatch(r -> r.getCommittee().getType() == CommitteeType.REGIONAL);

        if (isNational) {
            return committeeRepository.findAll().stream().map(Committee::getId).toList();
        } else if (isRegional) {
            List<UUID> ids = new ArrayList<>();
            for (CommitteeRole role : approvedRoles) {
                if (role.getCommittee().getType() == CommitteeType.REGIONAL) {
                    ids.add(role.getCommittee().getId());
                    committeeRepository.findByParentCommitteeId(role.getCommittee().getId())
                            .forEach(c -> ids.add(c.getId()));
                } else {
                    ids.add(role.getCommittee().getId());
                }
            }
            return ids.stream().distinct().toList();
        } else {
            return approvedRoles.stream()
                    .map(r -> r.getCommittee().getId())
                    .distinct()
                    .toList();
        }
    }


    /**
     * Returns ALL volunteers visible to the requesting user
     * based on their hierarchy level.
     */
    public List<HierarchyDtos.CommitteeOverview> getMyVisibleVolunteers(UUID requestingUserId) {
        List<UUID> visibleIds = getVisibleCommitteeIds(requestingUserId);

        return visibleIds.stream().map(cid -> {
            Committee c = committeeRepository.findById(cid).orElse(null);
            if (c == null)
                return null;

            List<CommitteeRole> roles = committeeRoleRepository.findByCommitteeId(cid);
            List<HierarchyDtos.RoleAssignment> roleAssignments = roles.stream()
                    .map(r -> HierarchyDtos.RoleAssignment.builder()
                            .title(r.getTitle())
                            .volunteerId(r.getVolunteer().getId())
                            .volunteerName(r.getVolunteer().getFullName())
                            .volunteerEmail(r.getVolunteer().getEmail())
                            .build())
                    .collect(Collectors.toList());

            List<Volunteer> volunteers = volunteerRepository.findByCommitteeId(cid);
            int approvedCount = (int) volunteers.stream()
                    .filter(v -> v.getAccountStatus() == com.nexusaid.core.entity.enums.AccountStatus.APPROVED).count();
            int pendingCount = (int) volunteers.stream()
                    .filter(v -> v.getAccountStatus() == com.nexusaid.core.entity.enums.AccountStatus.PENDING).count();

            return HierarchyDtos.CommitteeOverview.builder()
                    .id(c.getId())
                    .name(c.getName())
                    .type(c.getType())
                    .region(c.getRegion())
                    .parentCommitteeName(c.getParentCommittee() != null ? c.getParentCommittee().getName() : null)
                    .roles(roleAssignments)
                    .totalVolunteers(approvedCount)
                    .pendingVolunteers(pendingCount)
                    .build();
        }).filter(o -> o != null).collect(Collectors.toList());
    }

    @Transactional
    public void updateAvatarUrl(UUID userId, String avatarUrl, String publicId) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new RuntimeException("Utilisateur non trouvé"));

        // 1. If an old image exists, delete it from Cloudinary
        if (user.getAvatarPublicId() != null && !user.getAvatarPublicId().isEmpty()) {
            cloudinaryService.deleteImage(user.getAvatarPublicId());
        }

        // 2. Persist new image details
        user.setAvatar(avatarUrl);
        user.setAvatarPublicId(publicId);
        userRepository.save(user);
    }

    /**
     * Returns the profile of the currently logged-in user, including
     * their committee roles.
     */
    public Map<String, Object> getMyProfile(UUID userId) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new IllegalArgumentException("User not found"));

        List<CommitteeRole> myRoles = committeeRoleRepository.findByVolunteerId(userId);
        List<Map<String, Object>> rolesList = myRoles.stream().map(r -> {
            Map<String, Object> m = new java.util.LinkedHashMap<>();
            m.put("role", r.getTitle().name());
            m.put("committee", r.getCommittee().getName());
            m.put("committeeType", r.getCommittee().getType().name());
            m.put("committeeId", r.getCommittee().getId());
            return m;
        }).collect(Collectors.toList());

        Map<String, Object> profile = new java.util.LinkedHashMap<>();
        profile.put("id", user.getId());
        profile.put("fullName", user.getFullName());
        profile.put("email", user.getEmail());
        Trainer trainerEntity = trainerRepository.findById(userId).orElse(null);
        boolean isTrainer = trainerEntity != null;
        profile.put("userType", isTrainer ? "TRAINER" : user.getType().name());
        profile.put("accountStatus", user.getAccountStatus().name());
        profile.put("avatar", user.getAvatar());
        profile.put("roles", rolesList);
        profile.put("phone", user.getPhone());
        profile.put("address", user.getAddress());
        profile.put("educationLevel", user.getEducationLevel());

        // Volunteer-specific extra fields
        if (user instanceof Volunteer v) {
            profile.put("skills", v.getSkills());
            profile.put("matricule", v.getMatricule());
            profile.put("cin", v.getCin());
            profile.put("committeeId", v.getCommitteeId());
            profile.put("bloodType", v.getBloodType());
        }

        // Trainer-specific extra fields (expertise domains)
        if (isTrainer && trainerEntity.getExpertiseDomains() != null) {
            profile.put("trainerDomains", trainerEntity.getExpertiseDomains());
        } else if (isTrainer) {
            profile.put("trainerDomains", "[]");
        }

        // Always expose firstLoginCompleted so the frontend can gate the onboarding
        // form
        profile.put("firstLoginCompleted", user.isFirstLoginCompleted());

        return profile;
    }

    /**
     * Updates editable profile fields for the authenticated user.
     * Phone and fullName are always editable.
     * Skills are only editable once the account is APPROVED.
     */
    @Transactional
    public void updateProfile(UUID userId, Map<String, Object> updates) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new IllegalArgumentException("User not found"));

        if (updates.containsKey("fullName") && updates.get("fullName") != null) {
            user.setFullName((String) updates.get("fullName"));
        }
        if (updates.containsKey("phone") && updates.get("phone") != null) {
            user.setPhone((String) updates.get("phone"));
        }
        if (updates.containsKey("address")) {
            user.setAddress((String) updates.get("address"));
        }
        if (updates.containsKey("educationLevel")) {
            user.setEducationLevel((String) updates.get("educationLevel"));
        }

        // Skills update only for approved volunteers
        if (user instanceof Volunteer volunteer
                && user.getAccountStatus() == AccountStatus.APPROVED
                && updates.containsKey("skills")) {
            Object skillsVal = updates.get("skills");
            if (skillsVal instanceof java.util.List<?> skillsList) {
                volunteer.setSkills(skillsList.stream()
                        .map(Object::toString)
                        .collect(Collectors.toList()));
            }
        }

        userRepository.save(user);
    }

    /**
     * Mark the first login as completed after the volunteer fills the extended
     * profile form.
     */
    @Transactional
    public void markFirstLoginCompleted(UUID userId) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new IllegalArgumentException("User not found"));
        user.setFirstLoginCompleted(true);
        userRepository.save(user);
    }

    @Transactional
    public void updateVolunteerDetails(UUID volunteerId, Map<String, Object> updates, UUID requestingUserId) {
        Volunteer volunteer = volunteerRepository.findById(volunteerId)
                .orElseThrow(() -> new IllegalArgumentException("Volunteer not found"));

        if (volunteer.getCommitteeId() == null) {
            throw new IllegalArgumentException("Volunteer does not belong to any committee");
        }

        verifyPresidentAccess(volunteer.getCommitteeId(), requestingUserId);

        if (updates.containsKey("skills")) {
            Object skillsVal = updates.get("skills");
            if (skillsVal instanceof List<?> skillsList) {
                volunteer.setSkills(skillsList.stream()
                        .map(Object::toString)
                        .collect(Collectors.toList()));
            } else if (skillsVal instanceof String skillsStr) {
                try {
                    List<String> list = new com.fasterxml.jackson.databind.ObjectMapper()
                            .readValue(skillsStr, new com.fasterxml.jackson.core.type.TypeReference<List<String>>() {});
                    volunteer.setSkills(list);
                } catch (Exception e) {
                    volunteer.setSkills(java.util.Arrays.stream(skillsStr.split(","))
                            .map(String::trim)
                            .filter(s -> !s.isEmpty())
                            .collect(Collectors.toList()));
                }
            }
        }

        if (updates.containsKey("bloodType")) {
            volunteer.setBloodType((String) updates.get("bloodType"));
        }

        volunteerRepository.save(volunteer);
    }

    public List<Map<String, Object>> getDonors(UUID requestingUserId) {
        return userRepository.findAll().stream()
                .filter(u -> u.getType() == UserType.DONOR)
                .map(d -> {
                    Map<String, Object> dto = new java.util.LinkedHashMap<>();
                    dto.put("id", d.getId());
                    dto.put("fullName", d.getFullName());
                    dto.put("email", d.getEmail());
                    dto.put("phone", d.getPhone());
                    dto.put("cin", d.getCin());
                    dto.put("accountStatus", d.getAccountStatus().name());
                    dto.put("avatar", d.getAvatar());
                    if (d instanceof Donor donor) {
                        dto.put("preferredCategories", donor.getPreferredCategories());
                        dto.put("targetZones", donor.getTargetZones());
                        dto.put("totalDonationsCount", donor.getTotalDonationsCount());
                    }
                    return dto;
                })
                .collect(Collectors.toList());
    }
}
