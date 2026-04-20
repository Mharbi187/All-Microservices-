package com.nexusaid.core.controller;

import com.nexusaid.core.dto.HierarchyDtos;
import com.nexusaid.core.entity.Volunteer;
import com.nexusaid.core.security.UserDetailsImpl;
import com.nexusaid.core.service.ProfileService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
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

    // === SELF-SERVICE ENDPOINTS ===

    @GetMapping("/me")
    public ResponseEntity<Map<String, Object>> getMyProfile(
            @AuthenticationPrincipal UserDetailsImpl userDetails) {
        return ResponseEntity.ok(profileService.getMyProfile(userDetails.getUser().getId()));
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

    // === COMMITTEE-SCOPED ENDPOINTS (President actions) ===

    @GetMapping("/committees/{committeeId}/pending-volunteers")
    public ResponseEntity<List<Volunteer>> getPendingVolunteers(
            @PathVariable UUID committeeId,
            @AuthenticationPrincipal UserDetailsImpl userDetails) {
        return ResponseEntity
                .ok(profileService.getPendingVolunteersForCommittee(committeeId, userDetails.getUser().getId()));
    }

    @GetMapping("/committees/{committeeId}/volunteers")
    public ResponseEntity<List<Volunteer>> getAllVolunteers(
            @PathVariable UUID committeeId,
            @AuthenticationPrincipal UserDetailsImpl userDetails) {
        return ResponseEntity
                .ok(profileService.getAllVolunteersForCommittee(committeeId, userDetails.getUser().getId()));
    }

    @PutMapping("/volunteers/{volunteerId}/approve")
    public ResponseEntity<String> approveVolunteer(
            @PathVariable UUID volunteerId,
            @AuthenticationPrincipal UserDetailsImpl userDetails) {
        profileService.approveVolunteer(volunteerId, userDetails.getUser().getId());
        return ResponseEntity.ok("Volunteer approved successfully.");
    }

    @PutMapping("/volunteers/{volunteerId}/reject")
    public ResponseEntity<String> rejectVolunteer(
            @PathVariable UUID volunteerId,
            @AuthenticationPrincipal UserDetailsImpl userDetails) {
        profileService.rejectVolunteer(volunteerId, userDetails.getUser().getId());
        return ResponseEntity.ok("Volunteer rejected.");
    }

    @PutMapping("/volunteers/{volunteerId}/promote-to-trainer")
    public ResponseEntity<String> promoteToTrainer(
            @PathVariable UUID volunteerId,
            @RequestBody Map<String, String> requestBody,
            @AuthenticationPrincipal UserDetailsImpl userDetails) {
        String expertiseDomains = requestBody.get("expertiseDomains");
        profileService.promoteToTrainer(volunteerId, expertiseDomains, userDetails.getUser().getId());
        return ResponseEntity.ok("Volunteer successfully promoted to Trainer.");
    }
}
