package com.nexusaid.core.controller;

import com.nexusaid.core.dto.HierarchyDtos;
import com.nexusaid.core.entity.Committee;
import com.nexusaid.core.entity.enums.CommitteeType;
import com.nexusaid.core.entity.enums.RoleTitle;
import com.nexusaid.core.security.UserDetailsImpl;
import com.nexusaid.core.service.CommitteeService;
import lombok.Data;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/management")
@RequiredArgsConstructor
public class ManagementCompatibilityController {

    private final CommitteeService committeeService;

    @GetMapping("/hierarchy")
    public ResponseEntity<List<HierarchyDtos.CommitteeOverview>> getHierarchy(
            @AuthenticationPrincipal UserDetailsImpl userDetails) {
        return ResponseEntity.ok(committeeService.getHierarchyOverview(userDetails.getUser().getId()));
    }

    @PostMapping("/committees/{committeeId}/president")
    public ResponseEntity<String> assignPresident(
            @PathVariable UUID committeeId,
            @RequestBody PresidentAssignmentRequest request,
            @AuthenticationPrincipal UserDetailsImpl userDetails) {
        committeeService.proposeRole(
                committeeId,
                request.getVolunteerId(),
                RoleTitle.PRESIDENT,
                userDetails.getUser().getId(),
                request.getReason());
        return ResponseEntity.ok("President assignment proposed successfully.");
    }

    @DeleteMapping("/committees/{committeeId}/president")
    public ResponseEntity<String> removePresident(
            @PathVariable UUID committeeId,
            @RequestParam(required = false) String reason,
            @AuthenticationPrincipal UserDetailsImpl userDetails) {
        committeeService.revokeRole(committeeId, RoleTitle.PRESIDENT, userDetails.getUser().getId(), reason);
        return ResponseEntity.ok("President assignment revoked successfully.");
    }

    @GetMapping("/teams/regional")
    public ResponseEntity<List<Committee>> getRegionalTeams() {
        List<Committee> regionalCommittees = committeeService.getAllCommittees().stream()
                .filter(c -> c.getType() == CommitteeType.REGIONAL)
                .toList();
        return ResponseEntity.ok(regionalCommittees);
    }

    @GetMapping("/national/overview")
    public ResponseEntity<Map<String, Object>> getNationalOverview(
            @AuthenticationPrincipal UserDetailsImpl userDetails) {
        List<HierarchyDtos.CommitteeOverview> hierarchy = committeeService.getHierarchyOverview(userDetails.getUser().getId());
        Map<String, Object> overview = new LinkedHashMap<>();
        overview.put("totalCommittees", hierarchy.size());
        overview.put("committees", hierarchy);
        return ResponseEntity.ok(overview);
    }

    @PostMapping("/alerts/emergency")
    public ResponseEntity<Map<String, String>> triggerEmergencyAlert(
            @RequestBody EmergencyAlertRequest request,
            @AuthenticationPrincipal UserDetailsImpl userDetails) {
        Map<String, String> result = new LinkedHashMap<>();
        result.put("status", "RECEIVED");
        result.put("message", request.getMessage());
        result.put("triggeredBy", userDetails.getUser().getId().toString());
        return ResponseEntity.ok(result);
    }

    @Data
    public static class PresidentAssignmentRequest {
        private UUID volunteerId;
        private String reason;
    }

    @Data
    public static class EmergencyAlertRequest {
        private String message;
    }
}
