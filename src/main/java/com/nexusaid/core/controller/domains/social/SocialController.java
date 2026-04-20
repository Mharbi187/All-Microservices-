package com.nexusaid.core.controller.domains.social;

import com.nexusaid.core.entity.domains.social.Family;
import com.nexusaid.core.entity.domains.social.SocialAction;
import com.nexusaid.core.entity.domains.social.VulnerabilityScore;
import com.nexusaid.core.security.JwtService;
import com.nexusaid.core.service.domains.social.SocialService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/social")
@RequiredArgsConstructor
public class SocialController {

    private final SocialService socialService;
    private final JwtService jwtService;

    // ===== Families =====

    @PostMapping("/families")
    @PreAuthorize("hasAnyRole('PRESIDENT', 'RESP_ACTION_SOCIALE')")
    public ResponseEntity<Family> registerFamily(@RequestBody Family family) {
        return ResponseEntity.ok(socialService.registerFamily(family));
    }

    @GetMapping("/families")
    @PreAuthorize("hasAnyRole('PRESIDENT', 'RESP_ACTION_SOCIALE')")
    public ResponseEntity<List<Family>> getAllFamilies() {
        return ResponseEntity.ok(socialService.getAllFamilies());
    }

    @GetMapping("/families/{familyId}")
    @PreAuthorize("hasAnyRole('PRESIDENT', 'RESP_ACTION_SOCIALE')")
    public ResponseEntity<Family> getFamilyById(@PathVariable UUID familyId) {
        return socialService.getFamilyById(familyId)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }

    @PutMapping("/families/{familyId}")
    @PreAuthorize("hasAnyRole('PRESIDENT', 'RESP_ACTION_SOCIALE')")
    public ResponseEntity<Family> updateFamily(
            @PathVariable UUID familyId,
            @RequestBody Family family) {
        return ResponseEntity.ok(socialService.updateFamily(familyId, family));
    }

    // ===== Vulnerability Scores =====

    @GetMapping("/families/{familyId}/score")
    @PreAuthorize("hasAnyRole('PRESIDENT', 'RESP_ACTION_SOCIALE')")
    public ResponseEntity<VulnerabilityScore> getLatestScore(@PathVariable UUID familyId) {
        return socialService.getLatestScoreForFamily(familyId)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }

    @GetMapping("/families/{familyId}/score/history")
    @PreAuthorize("hasAnyRole('PRESIDENT', 'RESP_ACTION_SOCIALE')")
    public ResponseEntity<List<VulnerabilityScore>> getScoreHistory(@PathVariable UUID familyId) {
        return ResponseEntity.ok(socialService.getScoreHistory(familyId));
    }

    @PostMapping("/families/{familyId}/score")
    @PreAuthorize("hasAnyRole('PRESIDENT', 'RESP_ACTION_SOCIALE')")
    public ResponseEntity<VulnerabilityScore> updateScore(
            @PathVariable UUID familyId,
            @RequestBody VulnerabilityScore score) {
        return ResponseEntity.ok(socialService.calculateAndSaveScore(familyId, score));
    }

    // ===== Social Actions =====

    @PostMapping("/actions")
    @PreAuthorize("hasAnyRole('PRESIDENT', 'RESP_ACTION_SOCIALE', 'VOLUNTEER')")
    public ResponseEntity<SocialAction> performAction(
            @RequestHeader("Authorization") String token,
            @RequestBody SocialAction action) {

        UUID volunteerId = jwtService.extractUserId(token.substring(7));
        return ResponseEntity.ok(socialService.performAction(action, volunteerId));
    }

    @GetMapping("/families/{familyId}/actions")
    @PreAuthorize("hasAnyRole('PRESIDENT', 'RESP_ACTION_SOCIALE')")
    public ResponseEntity<List<SocialAction>> getActionsForFamily(@PathVariable UUID familyId) {
        return ResponseEntity.ok(socialService.getActionsForFamily(familyId));
    }

    @GetMapping("/actions")
    @PreAuthorize("hasAnyRole('PRESIDENT', 'RESP_ACTION_SOCIALE')")
    public ResponseEntity<List<SocialAction>> getAllActions() {
        return ResponseEntity.ok(socialService.getAllActions());
    }

    // ===== Analytics =====

    @GetMapping("/analytics")
    @PreAuthorize("hasAnyRole('PRESIDENT', 'RESP_ACTION_SOCIALE')")
    public ResponseEntity<Map<String, Object>> getAnalytics() {
        return ResponseEntity.ok(socialService.getAnalytics());
    }
}
