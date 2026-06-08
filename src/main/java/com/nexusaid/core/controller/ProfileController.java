package com.nexusaid.core.controller;

import com.nexusaid.core.dto.HierarchyDtos;
import com.nexusaid.core.dto.TrainerDto;
import com.nexusaid.core.entity.Volunteer;
import com.nexusaid.core.security.UserDetailsImpl;
import com.nexusaid.core.service.ProfileService;
import com.nexusaid.core.service.TrainerService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/profiles")
@RequiredArgsConstructor
public class ProfileController {

    private final ProfileService profileService;
    private final TrainerService trainerService;

    // === SELF-SERVICE ENDPOINTS ===

    @GetMapping("/me")
    public ResponseEntity<Map<String, Object>> getMyProfile(
            @AuthenticationPrincipal UserDetailsImpl userDetails) {
        return ResponseEntity.ok(profileService.getMyProfile(userDetails.getUser().getId()));
    }

    @PutMapping("/me")
    public ResponseEntity<String> updateMyProfile(
            @RequestBody Map<String, Object> updates,
            @AuthenticationPrincipal UserDetailsImpl userDetails) {
        profileService.updateProfile(userDetails.getUser().getId(), updates);
        return ResponseEntity.ok("Profile updated successfully.");
    }

    @PutMapping("/me/avatar-url")
    public ResponseEntity<String> updateMyAvatar(
            @RequestBody Map<String, String> requestBody,
            @AuthenticationPrincipal UserDetailsImpl userDetails) {
        String avatarUrl = requestBody.get("avatarUrl");
        String publicId = requestBody.get("publicId");
        profileService.updateAvatarUrl(userDetails.getUser().getId(), avatarUrl, publicId);
        return ResponseEntity.ok("Avatar updated successfully.");
    }

    @GetMapping("/me/visible-volunteers")
    public ResponseEntity<List<HierarchyDtos.CommitteeOverview>> getMyVisibleVolunteers(
            @AuthenticationPrincipal UserDetailsImpl userDetails) {
        return ResponseEntity.ok(profileService.getMyVisibleVolunteers(userDetails.getUser().getId()));
    }

    @GetMapping("/me/assignable-users")
    public ResponseEntity<List<Map<String, Object>>> getAssignableUsers(
            @AuthenticationPrincipal UserDetailsImpl userDetails) {
        return ResponseEntity.ok(profileService.getAssignableUsers(userDetails.getUser().getId()));
    }

    // === COMMITTEE-SCOPED ENDPOINTS (President actions) ===

    @GetMapping("/committees/{committeeId}/pending-volunteers")
    @PreAuthorize("hasAnyRole('PRESIDENT', 'VICE_PRESIDENT', 'SECRETAIRE_GENERAL', 'RESP_JEUNESSE', 'ADMIN')")
    public ResponseEntity<List<Volunteer>> getPendingVolunteers(
            @PathVariable UUID committeeId,
            @AuthenticationPrincipal UserDetailsImpl userDetails) {
        return ResponseEntity
                .ok(profileService.getPendingVolunteersForCommittee(committeeId, userDetails.getUser().getId()));
    }

    @GetMapping("/committees/{committeeId}/volunteers")
    @PreAuthorize("hasAnyRole('PRESIDENT', 'VICE_PRESIDENT', 'SECRETAIRE_GENERAL', 'RESP_JEUNESSE', 'ADMIN')")
    public ResponseEntity<List<Volunteer>> getAllVolunteers(
            @PathVariable UUID committeeId,
            @AuthenticationPrincipal UserDetailsImpl userDetails) {
        return ResponseEntity
                .ok(profileService.getAllVolunteersForCommittee(committeeId, userDetails.getUser().getId()));
    }

    @PutMapping("/volunteers/{volunteerId}/approve")
    @PreAuthorize("hasAnyRole('PRESIDENT', 'VICE_PRESIDENT', 'SECRETAIRE_GENERAL', 'RESP_JEUNESSE', 'ADMIN')")
    public ResponseEntity<String> approveVolunteer(
            @PathVariable UUID volunteerId,
            @AuthenticationPrincipal UserDetailsImpl userDetails) {
        profileService.approveVolunteer(volunteerId, userDetails.getUser().getId());
        return ResponseEntity.ok("Volunteer approved successfully.");
    }

    @PutMapping("/volunteers/{volunteerId}/reject")
    @PreAuthorize("hasAnyRole('PRESIDENT', 'VICE_PRESIDENT', 'SECRETAIRE_GENERAL', 'RESP_JEUNESSE', 'ADMIN')")
    public ResponseEntity<String> rejectVolunteer(
            @PathVariable UUID volunteerId,
            @AuthenticationPrincipal UserDetailsImpl userDetails) {
        profileService.rejectVolunteer(volunteerId, userDetails.getUser().getId());
        return ResponseEntity.ok("Volunteer rejected.");
    }

    @PutMapping("/volunteers/{volunteerId}/promote-to-trainer")
    @PreAuthorize("hasAnyRole('PRESIDENT', 'PRESIDENT_LOCAL', 'PRESIDENT_REGIONAL', 'PRESIDENT_NATIONAL', 'RESP_JEUNESSE', 'RESP_JEUNESSE_LOCAL', 'RESP_JEUNESSE_REGIONAL', 'ADMIN')")
    public ResponseEntity<String> promoteToTrainer(
            @PathVariable UUID volunteerId,
            @RequestBody Map<String, String> requestBody,
            @AuthenticationPrincipal UserDetailsImpl userDetails) {
        String expertiseDomains = requestBody.get("expertiseDomains");
        profileService.promoteToTrainer(volunteerId, expertiseDomains, userDetails.getUser().getId());
        return ResponseEntity.ok("Volunteer successfully promoted to Trainer.");
    }

    @PutMapping("/volunteers/{volunteerId}/details")
    @PreAuthorize("hasAnyRole('PRESIDENT', 'PRESIDENT_LOCAL', 'PRESIDENT_REGIONAL', 'PRESIDENT_NATIONAL', 'RESP_JEUNESSE', 'RESP_JEUNESSE_LOCAL', 'RESP_JEUNESSE_REGIONAL', 'ADMIN')")
    public ResponseEntity<String> updateVolunteerDetails(
            @PathVariable UUID volunteerId,
            @RequestBody Map<String, Object> updates,
            @AuthenticationPrincipal UserDetailsImpl userDetails) {
        profileService.updateVolunteerDetails(volunteerId, updates, userDetails.getUser().getId());
        return ResponseEntity.ok("Volunteer details updated successfully.");
    }

    @PutMapping("/me/mark-first-login-complete")
    public ResponseEntity<String> markFirstLoginComplete(
            @AuthenticationPrincipal UserDetailsImpl userDetails) {
        profileService.markFirstLoginCompleted(userDetails.getUser().getId());
        return ResponseEntity.ok("First login completed.");
    }

    // ─── Trainer Management Endpoints ────────────────────────────────────────

    private static final String TRAINER_ROLES =
        "hasAnyRole('PRESIDENT', 'PRESIDENT_LOCAL', 'PRESIDENT_REGIONAL', 'PRESIDENT_NATIONAL'," +
        "'VICE_PRESIDENT', 'VICE_PRESIDENT_LOCAL', 'VICE_PRESIDENT_REGIONAL', 'VICE_PRESIDENT_NATIONAL'," +
        "'RESP_JEUNESSE', 'RESP_JEUNESSE_LOCAL', 'RESP_JEUNESSE_REGIONAL', 'ADMIN')";

    @GetMapping("/trainers")
    @PreAuthorize("hasAnyRole('PRESIDENT', 'PRESIDENT_LOCAL', 'PRESIDENT_REGIONAL', 'PRESIDENT_NATIONAL'," +
        "'VICE_PRESIDENT', 'VICE_PRESIDENT_LOCAL', 'VICE_PRESIDENT_REGIONAL', 'VICE_PRESIDENT_NATIONAL'," +
        "'RESP_JEUNESSE', 'RESP_JEUNESSE_LOCAL', 'RESP_JEUNESSE_REGIONAL', 'ADMIN')")
    public ResponseEntity<List<TrainerDto>> getTrainers(
            @AuthenticationPrincipal UserDetailsImpl userDetails) {
        return ResponseEntity.ok(trainerService.getTrainers(userDetails.getUser().getId()));
    }

    @PutMapping("/trainers/{trainerId}")
    @PreAuthorize("hasAnyRole('PRESIDENT', 'PRESIDENT_LOCAL', 'PRESIDENT_REGIONAL', 'PRESIDENT_NATIONAL'," +
        "'VICE_PRESIDENT', 'VICE_PRESIDENT_LOCAL', 'VICE_PRESIDENT_REGIONAL', 'VICE_PRESIDENT_NATIONAL'," +
        "'RESP_JEUNESSE', 'RESP_JEUNESSE_LOCAL', 'RESP_JEUNESSE_REGIONAL', 'ADMIN')")
    public ResponseEntity<TrainerDto> updateTrainer(
            @PathVariable UUID trainerId,
            @RequestBody Map<String, Object> body,
            @AuthenticationPrincipal UserDetailsImpl userDetails) {
        @SuppressWarnings("unchecked")
        List<String> domains = (List<String>) body.get("expertiseDomains");
        return ResponseEntity.ok(trainerService.updateTrainer(trainerId, domains, userDetails.getUser().getId()));
    }

    @DeleteMapping("/trainers/{trainerId}")
    @PreAuthorize("hasAnyRole('PRESIDENT', 'PRESIDENT_LOCAL', 'PRESIDENT_REGIONAL', 'PRESIDENT_NATIONAL'," +
        "'VICE_PRESIDENT', 'VICE_PRESIDENT_LOCAL', 'VICE_PRESIDENT_REGIONAL', 'VICE_PRESIDENT_NATIONAL'," +
        "'RESP_JEUNESSE', 'RESP_JEUNESSE_LOCAL', 'RESP_JEUNESSE_REGIONAL', 'ADMIN')")
    public ResponseEntity<String> removeTrainer(
            @PathVariable UUID trainerId,
            @AuthenticationPrincipal UserDetailsImpl userDetails) {
        trainerService.removeTrainer(trainerId, userDetails.getUser().getId());
        return ResponseEntity.ok("Statut formateur retiré avec succès.");
    }

    @GetMapping("/donors")
    @PreAuthorize("hasAnyRole('PRESIDENT', 'PRESIDENT_LOCAL', 'PRESIDENT_REGIONAL', 'PRESIDENT_NATIONAL'," +
        "'VICE_PRESIDENT', 'VICE_PRESIDENT_LOCAL', 'VICE_PRESIDENT_REGIONAL', 'VICE_PRESIDENT_NATIONAL', 'ADMIN')")
    public ResponseEntity<List<Map<String, Object>>> getDonors(
            @AuthenticationPrincipal UserDetailsImpl userDetails) {
        return ResponseEntity.ok(profileService.getDonors(userDetails.getUser().getId()));
    }
}
