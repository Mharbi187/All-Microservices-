package com.nexusaid.core.controller;

import com.nexusaid.core.dto.HierarchyDtos;
import com.nexusaid.core.entity.Committee;
import com.nexusaid.core.entity.CommitteeRole;
import com.nexusaid.core.entity.HierarchyAuditLog;
import com.nexusaid.core.entity.enums.CommitteeType;
import com.nexusaid.core.entity.enums.RoleTitle;
import com.nexusaid.core.security.UserDetailsImpl;
import com.nexusaid.core.service.CommitteeService;
import lombok.Data;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/management/committees")
@RequiredArgsConstructor
public class CommitteeController {

    private final CommitteeService committeeService;

    @GetMapping
    // Public: liste des comités accessible pour la page d'inscription (utilisateur non connecté)
    public ResponseEntity<List<java.util.Map<String, Object>>> getAllCommittees() {
        return ResponseEntity.ok(committeeService.getAllCommitteesSummary());
    }

    @GetMapping("/hierarchy/overview")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<List<HierarchyDtos.CommitteeOverview>> getHierarchyOverview(
            @AuthenticationPrincipal UserDetailsImpl userDetails) {
        return ResponseEntity.ok(
                committeeService.getHierarchyOverview(userDetails.getUser().getId()));
    }

    @PostMapping
    @PreAuthorize("hasRole('ADMIN') or hasRole('NATIONAL_PRESIDENT')")
    public ResponseEntity<Committee> createCommittee(@RequestBody CreateCommitteeRequest request) {
        Committee committee = committeeService.createCommittee(
                request.getName(),
                request.getType(),
                request.getRegion(),
                request.getParentId());
        return ResponseEntity.ok(committee);
    }

    @PostMapping("/{committeeId}/approve")
    @PreAuthorize("hasRole('ADMIN') or hasRole('NATIONAL_PRESIDENT')")
    public ResponseEntity<String> approveCommittee(
            @PathVariable UUID committeeId,
            @AuthenticationPrincipal UserDetailsImpl userDetails) {
        committeeService.approveCommittee(committeeId, userDetails.getUser().getId());
        return ResponseEntity.ok("Committee approved successfully");
    }

    @PostMapping("/{committeeId}/roles")
    @PreAuthorize("hasAnyRole('PRESIDENT', 'ADMIN')")
    public ResponseEntity<String> proposeRole(
            @PathVariable UUID committeeId,
            @RequestBody AssignRoleRequest request,
            @AuthenticationPrincipal UserDetailsImpl userDetails) {

        committeeService.proposeRole(
                committeeId,
                request.getVolunteerId(),
                request.getTitle(),
                userDetails.getUser().getId(),
                request.getReason());
        return ResponseEntity.ok("Role proposed successfully and awaiting validation.");
    }

    @PostMapping("/roles/{roleId}/validate")
    @PreAuthorize("hasAnyRole('PRESIDENT', 'ADMIN')")
    public ResponseEntity<String> validateRoleAssignment(
            @PathVariable UUID roleId,
            @RequestParam boolean approve,
            @RequestParam(required = false) String reason,
            @AuthenticationPrincipal UserDetailsImpl userDetails) {
        committeeService.validateRoleAssignment(roleId, approve, userDetails.getUser().getId(), reason);
        return ResponseEntity.ok("Role validation processed.");
    }

    @GetMapping("/roles/pending")
    @PreAuthorize("hasAnyRole('PRESIDENT', 'ADMIN')")
    public ResponseEntity<List<CommitteeRole>> getPendingProposals(
            @AuthenticationPrincipal UserDetailsImpl userDetails) {
        return ResponseEntity.ok(committeeService.getPendingProposals(userDetails.getUser().getId()));
    }

    @DeleteMapping("/{committeeId}/roles/{title}")
    @PreAuthorize("hasAnyRole('PRESIDENT', 'ADMIN')")
    public ResponseEntity<String> revokeRole(
            @PathVariable UUID committeeId,
            @PathVariable RoleTitle title,
            @RequestBody(required = false) String reason,
            @AuthenticationPrincipal UserDetailsImpl userDetails) {
        committeeService.revokeRole(committeeId, title, userDetails.getUser().getId(), reason);
        return ResponseEntity.ok("Role revoked successfully.");
    }

    @GetMapping("/{committeeId}/governance")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<HierarchyDtos.CommitteeGovernance> getGovernanceInfo(@PathVariable UUID committeeId) {
        return ResponseEntity.ok(committeeService.getGovernanceInfo(committeeId));
    }

    @GetMapping("/audit-logs")
    @PreAuthorize("hasAnyRole('PRESIDENT', 'ADMIN')")
    public ResponseEntity<List<HierarchyDtos.AuditLogResponse>> getAuditLogs(
            @AuthenticationPrincipal UserDetailsImpl userDetails) {
        return ResponseEntity.ok(committeeService.getHierarchicalAuditLogs(userDetails.getUser().getId()));
    }

    @GetMapping("/my-accessible")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<List<UUID>> getMyAccessibleCommitteeIds(
            @AuthenticationPrincipal UserDetailsImpl userDetails) {
        return ResponseEntity.ok(committeeService.getAccessibleCommitteeIds(userDetails.getUser().getId()));
    }

    @GetMapping("/{id}/presidents")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<List<com.nexusaid.core.entity.User>> getCommitteePresidents(
            @PathVariable("id") UUID committeeId) {
        return ResponseEntity.ok(committeeService.getCommitteePresidents(committeeId));
    }

    // DTOs for requests
    @Data
    public static class CreateCommitteeRequest {
        private String name;
        private CommitteeType type;
        private String region;
        private UUID parentId;
    }

    @Data
    public static class AssignRoleRequest {
        private UUID volunteerId;
        private RoleTitle title;
        private String reason;
    }
}
