package com.nexusaid.core.controller;

import com.nexusaid.core.entity.SecourismeCertification;
import com.nexusaid.core.entity.VolunteerCertification;
import com.nexusaid.core.entity.VolunteerExtendedProfile;
import com.nexusaid.core.repository.CommitteeRepository;
import com.nexusaid.core.entity.Committee;
import com.nexusaid.core.entity.enums.CommitteeStatus;
import com.nexusaid.core.entity.enums.CommitteeType;
import com.nexusaid.core.security.UserDetailsImpl;
import com.nexusaid.core.service.VolunteerOnboardingService;
import lombok.RequiredArgsConstructor;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.util.*;

@RestController
@RequestMapping("/api/v1/onboarding")
@RequiredArgsConstructor
public class VolunteerOnboardingController {

    private final VolunteerOnboardingService onboardingService;
    private final CommitteeRepository committeeRepository;

    // ─── Profile ─────────────────────────────────────────────────────────────

    @GetMapping("/my-extended-profile")
    public ResponseEntity<VolunteerExtendedProfile> getMyExtendedProfile(
            @AuthenticationPrincipal UserDetailsImpl userDetails) {
        return ResponseEntity.ok(
                onboardingService.getExtendedProfile(userDetails.getUser().getId()));
    }

    @PostMapping("/complete-profile")
    public ResponseEntity<Map<String, Object>> completeProfile(
            @RequestBody Map<String, Object> data,
            @AuthenticationPrincipal UserDetailsImpl userDetails) {
        VolunteerExtendedProfile saved = onboardingService.saveExtendedProfile(
                userDetails.getUser().getId(), data);
        Map<String, Object> resp = new LinkedHashMap<>();
        resp.put("profileCompleted", saved.isProfileCompleted());
        resp.put("completionScore", saved.getProfileCompletionScore());
        resp.put("message", saved.isProfileCompleted()
                ? "Profil complété avec succès !"
                : "Profil sauvegardé. Score: " + saved.getProfileCompletionScore() + "%");
        return ResponseEntity.ok(resp);
    }

    @GetMapping("/completion-score")
    public ResponseEntity<Map<String, Object>> getCompletionScore(
            @AuthenticationPrincipal UserDetailsImpl userDetails) {
        VolunteerExtendedProfile p = onboardingService.getExtendedProfile(
                userDetails.getUser().getId());
        Map<String, Object> resp = new LinkedHashMap<>();
        resp.put("score", p.getProfileCompletionScore());
        resp.put("completed", p.isProfileCompleted());
        return ResponseEntity.ok(resp);
    }

    @GetMapping("/completeness-stats")
    public ResponseEntity<Map<String, Object>> getCompletenessStats() {
        return ResponseEntity.ok(onboardingService.getCompletenessStats());
    }

    // ─── Admin: view/edit volunteer extended profile ──────────────────────────

    @GetMapping("/admin/volunteer/{volunteerId}/extended-profile")
    public ResponseEntity<VolunteerExtendedProfile> getVolunteerExtendedProfile(
            @PathVariable UUID volunteerId,
            @AuthenticationPrincipal UserDetailsImpl userDetails) {
        return ResponseEntity.ok(onboardingService.getExtendedProfile(volunteerId));
    }

    @PutMapping("/admin/volunteer/{volunteerId}/extended-profile")
    public ResponseEntity<VolunteerExtendedProfile> adminUpdateProfile(
            @PathVariable UUID volunteerId,
            @RequestParam(defaultValue = "false") boolean approve,
            @RequestBody Map<String, Object> data,
            @AuthenticationPrincipal UserDetailsImpl userDetails) {
        return ResponseEntity.ok(onboardingService.adminUpdateExtendedProfile(
                volunteerId, userDetails.getUser().getId(), data, approve));
    }

    // ─── Certifications ──────────────────────────────────────────────────────

    @GetMapping("/certifications")
    public ResponseEntity<List<SecourismeCertification>> getAvailableCertifications() {
        return ResponseEntity.ok(onboardingService.getAvailableCertifications());
    }

    @GetMapping("/my-certifications")
    public ResponseEntity<List<VolunteerCertification>> getMyCertifications(
            @AuthenticationPrincipal UserDetailsImpl userDetails) {
        return ResponseEntity.ok(onboardingService.getMyCertifications(
                userDetails.getUser().getId()));
    }

    @GetMapping("/volunteer/{volunteerId}/certifications")
    public ResponseEntity<List<VolunteerCertification>> getVolunteerCertifications(
            @PathVariable UUID volunteerId) {
        return ResponseEntity.ok(onboardingService.getMyCertifications(volunteerId));
    }

    @PostMapping("/my-certifications")
    public ResponseEntity<VolunteerCertification> addMyCertification(
            @RequestBody Map<String, Object> body,
            @AuthenticationPrincipal UserDetailsImpl userDetails) {
        UUID certId = UUID.fromString((String) body.get("certificationId"));
        LocalDate dateObtained = LocalDate.parse((String) body.get("dateObtained"));
        LocalDate dateExpiry = body.containsKey("dateExpiry") && body.get("dateExpiry") != null
                ? LocalDate.parse((String) body.get("dateExpiry")) : null;
        String issuedBy = (String) body.getOrDefault("issuedBy", "");

        return ResponseEntity.ok(onboardingService.addCertification(
                userDetails.getUser().getId(), certId, dateObtained, dateExpiry, issuedBy,
                userDetails.getUser().getId()));
    }

    @PostMapping("/admin/volunteer/{volunteerId}/certifications")
    public ResponseEntity<VolunteerCertification> addVolunteerCertification(
            @PathVariable UUID volunteerId,
            @RequestBody Map<String, Object> body,
            @AuthenticationPrincipal UserDetailsImpl userDetails) {
        UUID certId = UUID.fromString((String) body.get("certificationId"));
        LocalDate dateObtained = LocalDate.parse((String) body.get("dateObtained"));
        LocalDate dateExpiry = body.containsKey("dateExpiry") && body.get("dateExpiry") != null
                ? LocalDate.parse((String) body.get("dateExpiry")) : null;
        String issuedBy = (String) body.getOrDefault("issuedBy", "");

        return ResponseEntity.ok(onboardingService.addCertification(
                volunteerId, certId, dateObtained, dateExpiry, issuedBy,
                userDetails.getUser().getId()));
    }

    @DeleteMapping("/volunteer/{volunteerId}/certifications/{certId}")
    public ResponseEntity<String> removeCertification(
            @PathVariable UUID volunteerId,
            @PathVariable UUID certId,
            @AuthenticationPrincipal UserDetailsImpl userDetails) {
        onboardingService.removeCertification(volunteerId, certId, userDetails.getUser().getId());
        return ResponseEntity.ok("Certification removed.");
    }

    // ─── Certification Catalogue Admin ───────────────────────────────────────

    @PostMapping("/admin/certifications")
    public ResponseEntity<SecourismeCertification> createCertification(
            @RequestBody SecourismeCertification cert,
            @AuthenticationPrincipal UserDetailsImpl userDetails) {
        return ResponseEntity.ok(onboardingService.createCertification(
                cert, userDetails.getUser().getId()));
    }

    @PutMapping("/admin/certifications/{certId}")
    public ResponseEntity<SecourismeCertification> updateCertification(
            @PathVariable UUID certId,
            @RequestBody SecourismeCertification cert,
            @AuthenticationPrincipal UserDetailsImpl userDetails) {
        return ResponseEntity.ok(onboardingService.updateCertification(
                certId, cert, userDetails.getUser().getId()));
    }

    // ─── Cascade Committee Selection (public for registration) ───────────────

    @GetMapping("/public/gouvernorats")
    public ResponseEntity<List<String>> getGouvernorats() {
        return ResponseEntity.ok(committeeRepository.findAllActiveGouvernorats());
    }

    /** Tous les comités actifs — DTO léger pour la page d'inscription (sans token) */
    @GetMapping("/public/committees/all")
    @Transactional(readOnly = true)
    public ResponseEntity<List<Map<String, Object>>> getAllActiveCommittees() {
        List<Committee> all = committeeRepository.findAll().stream()
                .filter(c -> c.getStatus() == CommitteeStatus.ACTIVE
                        || c.getStatus() == CommitteeStatus.PENDING_CONSTITUTION)
                .toList();
        List<Map<String, Object>> dtos = all.stream().map(c -> {
            Map<String, Object> dto = new LinkedHashMap<>();
            dto.put("id", c.getId());
            dto.put("name", c.getName());
            dto.put("type", c.getType().name());
            dto.put("region", c.getRegion());
            dto.put("status", c.getStatus().name());
            dto.put("parentRegion", c.getParentCommittee() != null ? c.getParentCommittee().getRegion() : null);
            return dto;
        }).toList();
        return ResponseEntity.ok(dtos);
    }

    @GetMapping("/public/committees/regional")
    public ResponseEntity<List<Map<String, Object>>> getRegionalCommittees(
            @RequestParam(required = false) String gouvernorat) {
        List<Committee> list;
        if (gouvernorat != null && !gouvernorat.isBlank()) {
            list = committeeRepository.findByTypeAndRegionContainingIgnoreCaseAndStatus(
                    CommitteeType.REGIONAL, gouvernorat, CommitteeStatus.ACTIVE);
        } else {
            list = committeeRepository.findByTypeAndStatus(CommitteeType.REGIONAL, CommitteeStatus.ACTIVE);
        }
        List<Map<String, Object>> dtos = list.stream().map(c -> {
            Map<String, Object> dto = new LinkedHashMap<>();
            dto.put("id", c.getId());
            dto.put("name", c.getName());
            dto.put("type", c.getType().name());
            dto.put("region", c.getRegion());
            return dto;
        }).toList();
        return ResponseEntity.ok(dtos);
    }

    @GetMapping("/public/committees/{parentId}/sub-committees")
    public ResponseEntity<List<Map<String, Object>>> getLocalCommittees(@PathVariable UUID parentId) {
        List<Committee> list = committeeRepository.findByParentCommitteeIdAndStatus(
                parentId, CommitteeStatus.ACTIVE);
        List<Map<String, Object>> dtos = list.stream().map(c -> {
            Map<String, Object> dto = new LinkedHashMap<>();
            dto.put("id", c.getId());
            dto.put("name", c.getName());
            dto.put("type", c.getType().name());
            dto.put("region", c.getRegion());
            return dto;
        }).toList();
        return ResponseEntity.ok(dtos);
    }
}
