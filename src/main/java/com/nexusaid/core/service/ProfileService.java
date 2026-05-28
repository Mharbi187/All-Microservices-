package com.nexusaid.core.service;

import com.nexusaid.core.dto.HierarchyDtos;
import com.nexusaid.core.entity.Committee;
import com.nexusaid.core.entity.CommitteeRole;
import com.nexusaid.core.entity.Trainer;
import com.nexusaid.core.entity.User;
import com.nexusaid.core.entity.Volunteer;
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
import lombok.RequiredArgsConstructor;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

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

        // Native SQL delete is required because changing the discriminator
        // value/inheritance
        // type on an existing row cleanly in JPA is notoriously difficult without
        // custom queries.
        // We delete from volunteers, and re-insert into trainers.
        volunteerRepository.delete(volunteer);
        volunteerRepository.flush();

        Trainer trainer = new Trainer();
        trainer.setId(volunteer.getId()); // keep same ID
        trainer.setEmail(volunteer.getEmail());
        trainer.setPassword(volunteer.getPassword());
        trainer.setFullName(volunteer.getFullName());
        trainer.setCin(volunteer.getCin());
        trainer.setPhone(volunteer.getPhone());
        trainer.setType(UserType.TRAINER);
        trainer.setAccountStatus(volunteer.getAccountStatus());
        trainer.setMatricule(volunteer.getMatricule());
        trainer.setSkills(volunteer.getSkills());
        trainer.setDateAdhesion(volunteer.getDateAdhesion());
        trainer.setHoursVolunteered(volunteer.getHoursVolunteered());
        trainer.setTrainingProgress(volunteer.getTrainingProgress());
        trainer.setCommitteeId(volunteer.getCommitteeId());

        // Trainer specifics
        trainer.setExpertiseDomains(expertiseDomains);

        return trainerRepository.save(trainer);
    }

    private void verifyPresidentAccess(UUID committeeId, UUID requestingUserId) {
        User user = userRepository.findById(requestingUserId)
                .orElseThrow(() -> new AccessDeniedException("User not found"));

        // Rule 0: Super Admins or National President (if isPresidentOfAncestor handles
        // it) have 360° access
        // Actually, let's explicitly trust ADMIN for 360°
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

        // Rule 2: RESP_JEUNESSE (and potentially other responsibles) restricted to OWN
        // committee only
        boolean isResponsible = committeeRoleRepository.existsByCommitteeIdAndTitleAndVolunteerId(
                committeeId, RoleTitle.RESP_JEUNESSE, requestingUserId);
        if (isResponsible)
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
                "Only the PRESIDENT (hierarchical) or the RESP_JEUNESSE (of this committee) can perform this action.");
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

        List<CommitteeRole> presidentRoles = committeeRoleRepository.findByVolunteerId(requestingUserId)
                .stream()
                .filter(r -> r.getTitle() == RoleTitle.PRESIDENT)
                .toList();

        if (presidentRoles.isEmpty()) {
            // Non-president: can only see their own committee
            Volunteer v = volunteerRepository.findById(requestingUserId).orElse(null);
            if (v != null && v.getCommitteeId() != null) {
                return List.of(v.getCommitteeId());
            }
            return List.of();
        }

        boolean isNational = presidentRoles.stream()
                .anyMatch(r -> r.getCommittee().getType() == CommitteeType.NATIONAL);
        boolean isRegional = presidentRoles.stream()
                .anyMatch(r -> r.getCommittee().getType() == CommitteeType.REGIONAL);

        if (isNational) {
            return committeeRepository.findAll().stream().map(Committee::getId).toList();
        } else if (isRegional) {
            List<UUID> ids = new ArrayList<>();
            for (CommitteeRole pr : presidentRoles) {
                ids.add(pr.getCommittee().getId());
                committeeRepository.findByParentCommitteeId(pr.getCommittee().getId())
                        .forEach(c -> ids.add(c.getId()));
            }
            return ids;
        } else {
            return presidentRoles.stream()
                    .map(r -> r.getCommittee().getId())
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
        profile.put("userType", user.getType().name());
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
}
