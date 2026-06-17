package com.nexusaid.core.service;

import com.nexusaid.core.entity.*;
import com.nexusaid.core.entity.enums.*;
import com.nexusaid.core.repository.*;
import lombok.RequiredArgsConstructor;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.*;

@Service
@RequiredArgsConstructor
public class VolunteerOnboardingService {

    private final VolunteerExtendedProfileRepository extProfileRepo;
    private final VolunteerCertificationRepository certRepo;
    private final SecourismeCertificationRepository catalogRepo;
    private final VolunteerRepository volunteerRepo;
    private final UserRepository userRepo;
    private final CommitteeRoleRepository roleRepo;

    // ─── Get Extended Profile ─────────────────────────────────────────────────

    public VolunteerExtendedProfile getExtendedProfile(UUID volunteerId) {
        return extProfileRepo.findByVolunteerId(volunteerId)
                .orElseGet(() -> {
                    VolunteerExtendedProfile p = new VolunteerExtendedProfile();
                    p.setVolunteerId(volunteerId);
                    return p;
                });
    }

    public boolean isProfileCompleted(UUID volunteerId) {
        return extProfileRepo.findByVolunteerId(volunteerId)
                .map(VolunteerExtendedProfile::isProfileCompleted)
                .orElse(false);
    }

    // ─── Save/Submit Extended Profile ────────────────────────────────────────

    @Transactional
    public VolunteerExtendedProfile saveExtendedProfile(UUID volunteerId, Map<String, Object> data) {
        VolunteerExtendedProfile profile = extProfileRepo.findByVolunteerId(volunteerId)
                .orElseGet(() -> {
                    VolunteerExtendedProfile p = new VolunteerExtendedProfile();
                    p.setVolunteerId(volunteerId);
                    return p;
                });

        // Map data
        if (data.containsKey("phone"))
            profile.setPhone((String) data.get("phone"));
        if (data.containsKey("emergencyContactName"))
            profile.setEmergencyContactName((String) data.get("emergencyContactName"));
        if (data.containsKey("emergencyContactPhone"))
            profile.setEmergencyContactPhone((String) data.get("emergencyContactPhone"));
        if (data.containsKey("emergencyContactRelation"))
            profile.setEmergencyContactRelation((String) data.get("emergencyContactRelation"));
        if (data.containsKey("photoUrl"))
            profile.setPhotoUrl((String) data.get("photoUrl"));
        if (data.containsKey("photoPublicId"))
            profile.setPhotoPublicId((String) data.get("photoPublicId"));
        if (data.containsKey("educationLevel") && data.get("educationLevel") != null) {
            try {
                profile.setEducationLevel(EducationLevel.valueOf((String) data.get("educationLevel")));
            } catch (IllegalArgumentException ignored) {}
        }
        if (data.containsKey("specializationDomain"))
            profile.setSpecializationDomain((String) data.get("specializationDomain"));
        if (data.containsKey("trainingCoursesAttended"))
            profile.setTrainingCoursesAttended((String) data.get("trainingCoursesAttended"));
        if (data.containsKey("realIntegrationDate") && data.get("realIntegrationDate") != null) {
            try {
                profile.setRealIntegrationDate(LocalDate.parse((String) data.get("realIntegrationDate")));
            } catch (Exception ignored) {}
        }
        if (data.containsKey("otherSkills"))
            profile.setOtherSkills((String) data.get("otherSkills"));

        // Calculate completion score
        int score = calculateScore(profile);
        profile.setProfileCompletionScore(score);

        // Mark as completed if score >= 80
        if (score >= 80 && !profile.isProfileCompleted()) {
            profile.setProfileCompleted(true);
            profile.setSubmittedAt(LocalDateTime.now());

            // Update user first_login_completed
            userRepo.findById(volunteerId).ifPresent(u -> {
                u.setFirstLoginCompleted(true);
                userRepo.save(u);
            });
        }

        return extProfileRepo.save(profile);
    }

    // ─── Score Calculation ────────────────────────────────────────────────────

    public int calculateScore(VolunteerExtendedProfile p) {
        int score = 0;
        int total = 10;
        if (p.getPhone() != null && !p.getPhone().isBlank()) score++;
        if (p.getEmergencyContactName() != null && !p.getEmergencyContactName().isBlank()) score++;
        if (p.getEmergencyContactPhone() != null && !p.getEmergencyContactPhone().isBlank()) score++;
        if (p.getEmergencyContactRelation() != null && !p.getEmergencyContactRelation().isBlank()) score++;
        if (p.getPhotoUrl() != null && !p.getPhotoUrl().isBlank()) score++;
        if (p.getEducationLevel() != null) score++;
        if (p.getSpecializationDomain() != null && !p.getSpecializationDomain().isBlank()) score++;
        if (p.getTrainingCoursesAttended() != null && !p.getTrainingCoursesAttended().isBlank()) score++;
        if (p.getRealIntegrationDate() != null) score++;
        if (p.getOtherSkills() != null && !p.getOtherSkills().isBlank()) score++;
        return (score * 100) / total;
    }

    // ─── Admin: Review Extended Profile ──────────────────────────────────────

    /**
     * RESP_JEUNESSE_NATIONAL can edit; PRESIDENT_NATIONAL can approve.
     */
    @Transactional
    public VolunteerExtendedProfile adminUpdateExtendedProfile(
            UUID volunteerId, UUID requestingUserId, Map<String, Object> data, boolean approve) {

        verifyAdminAccess(requestingUserId, approve);

        VolunteerExtendedProfile profile = extProfileRepo.findByVolunteerId(volunteerId)
                .orElseThrow(() -> new IllegalArgumentException("Extended profile not found"));

        // Apply edits (same mapping)
        saveExtendedProfile(volunteerId, data);

        if (approve) {
            profile.setReviewedBy(requestingUserId);
            profile.setReviewedAt(LocalDateTime.now());
            if (data.containsKey("reviewNotes"))
                profile.setReviewNotes((String) data.get("reviewNotes"));
        }
        return extProfileRepo.save(profile);
    }

    private void verifyAdminAccess(UUID requestingUserId, boolean needsApproval) {
        User user = userRepo.findById(requestingUserId)
                .orElseThrow(() -> new AccessDeniedException("User not found"));
        if (user.getType() == UserType.ADMIN) return;

        List<CommitteeRole> roles = roleRepo.findByVolunteerId(requestingUserId);
        boolean isNationalRJ = roles.stream().anyMatch(r ->
                r.getTitle() == RoleTitle.RESP_JEUNESSE
                && r.getCommittee().getType() == CommitteeType.NATIONAL
                && r.getStatus() == CommitteeRoleStatus.APPROVED);
        boolean isNationalPresident = roles.stream().anyMatch(r ->
                r.getTitle() == RoleTitle.PRESIDENT
                && r.getCommittee().getType() == CommitteeType.NATIONAL
                && r.getStatus() == CommitteeRoleStatus.APPROVED);

        if (needsApproval && !isNationalPresident) {
            throw new AccessDeniedException("Only the National President can approve extended profiles.");
        }
        if (!needsApproval && !isNationalRJ && !isNationalPresident) {
            throw new AccessDeniedException("Only RESP_JEUNESSE_NATIONAL or PRESIDENT_NATIONAL can edit extended profiles.");
        }
    }

    // ─── Certifications ──────────────────────────────────────────────────────

    public List<SecourismeCertification> getAvailableCertifications() {
        return catalogRepo.findByActiveTrueOrderByLevel();
    }

    public List<VolunteerCertification> getMyCertifications(UUID volunteerId) {
        List<VolunteerCertification> certs = certRepo.findByVolunteerId(volunteerId);
        // Enrich with catalogue data
        certs.forEach(vc -> catalogRepo.findById(vc.getCertificationId()).ifPresent(cat -> {
            vc.setCertificationCode(cat.getCode());
            vc.setCertificationLabel(cat.getLabel());
        }));
        return certs;
    }

    @Transactional
    public VolunteerCertification addCertification(UUID volunteerId, UUID certId,
                                                   LocalDate dateObtained, LocalDate dateExpiry,
                                                   String issuedBy, UUID addedBy) {
        if (certRepo.existsByVolunteerIdAndCertificationId(volunteerId, certId)) {
            throw new IllegalArgumentException("Certification already exists for this volunteer");
        }
        SecourismeCertification cat = catalogRepo.findById(certId)
                .orElseThrow(() -> new IllegalArgumentException("Certification not found"));
        if (!cat.isActive()) throw new IllegalArgumentException("Certification is not active");

        VolunteerCertification vc = VolunteerCertification.builder()
                .volunteerId(volunteerId)
                .certificationId(certId)
                .dateObtained(dateObtained)
                .dateExpiry(dateExpiry)
                .issuedBy(issuedBy)
                .status(dateExpiry != null && dateExpiry.isBefore(LocalDate.now()) ? "EXPIRED" : "ACTIVE")
                .addedBy(addedBy)
                .build();
        return certRepo.save(vc);
    }

    @Transactional
    public void removeCertification(UUID volunteerId, UUID certId, UUID requestingUserId) {
        verifyCanEditCertification(requestingUserId, certId);
        certRepo.findByVolunteerIdAndCertificationId(volunteerId, certId)
                .ifPresent(certRepo::delete);
    }

    private void verifyCanEditCertification(UUID requestingUserId, UUID certId) {
        User user = userRepo.findById(requestingUserId)
                .orElseThrow(() -> new AccessDeniedException("User not found"));
        if (user.getType() == UserType.ADMIN) return;

        List<CommitteeRole> roles = roleRepo.findByVolunteerId(requestingUserId);
        boolean hasPermission = roles.stream().anyMatch(r ->
                (r.getTitle() == RoleTitle.RESP_SECOURISME || r.getTitle() == RoleTitle.RESP_JEUNESSE
                        || r.getTitle() == RoleTitle.PRESIDENT)
                && r.getCommittee().getType() == CommitteeType.NATIONAL
                && r.getStatus() == CommitteeRoleStatus.APPROVED);
        if (!hasPermission) throw new AccessDeniedException("Not authorized to manage certifications");
    }

    // ─── Dashboard Stats ─────────────────────────────────────────────────────

    public Map<String, Object> getCompletenessStats() {
        Map<String, Object> stats = new LinkedHashMap<>();
        stats.put("totalCompleted", extProfileRepo.countCompleted());
        stats.put("totalIncomplete", extProfileRepo.countIncomplete());
        stats.put("averageScore", extProfileRepo.averageCompletionScore());
        return stats;
    }

    // ─── CRUD Certification Catalogue (admin) ─────────────────────────────────

    @Transactional
    public SecourismeCertification createCertification(SecourismeCertification cert, UUID requestingUserId) {
        verifyCanEditCertification(requestingUserId, null);
        return catalogRepo.save(cert);
    }

    @Transactional
    public SecourismeCertification updateCertification(UUID certId, SecourismeCertification updated, UUID requestingUserId) {
        verifyCanEditCertification(requestingUserId, certId);
        SecourismeCertification existing = catalogRepo.findById(certId)
                .orElseThrow(() -> new IllegalArgumentException("Certification not found"));
        existing.setLabel(updated.getLabel());
        existing.setDescription(updated.getDescription());
        existing.setLevel(updated.getLevel());
        existing.setActive(updated.isActive());
        existing.setEditableBy(updated.getEditableBy());
        return catalogRepo.save(existing);
    }
}
