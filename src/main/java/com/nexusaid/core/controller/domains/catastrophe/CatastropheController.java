package com.nexusaid.core.controller.domains.catastrophe;

import com.nexusaid.core.entity.domains.catastrophe.DisasterFieldReport;
import com.nexusaid.core.entity.domains.catastrophe.DisasterMission;
import com.nexusaid.core.security.JwtService;
import com.nexusaid.core.service.domains.catastrophe.CatastropheService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/catastrophe")
@RequiredArgsConstructor
public class CatastropheController {

    private final CatastropheService catastropheService;
    private final JwtService jwtService;

    private static final String RESP_CATASTRO_ROLES = "'PRESIDENT', 'VICE_PRESIDENT', 'RESP_CATASTROPHES', " +
            "'PRESIDENT_LOCAL', 'PRESIDENT_REGIONAL', 'PRESIDENT_NATIONAL'";

    // ─── Missions ────────────────────────────────────────────────────────────

    /**
     * List all missions — national managers see all, others filtered by committee.
     */
    @GetMapping("/missions")
    @PreAuthorize("hasAnyRole(" + RESP_CATASTRO_ROLES + ")")
    public ResponseEntity<List<DisasterMission>> getAllMissions() {
        return ResponseEntity.ok(catastropheService.getAllMissions());
    }

    /**
     * List missions for a specific committee.
     */
    @GetMapping("/missions/committee/{committeeId}")
    @PreAuthorize("hasAnyRole(" + RESP_CATASTRO_ROLES + ")")
    public ResponseEntity<List<DisasterMission>> getMissionsByCommittee(@PathVariable UUID committeeId) {
        return ResponseEntity.ok(catastropheService.getMissionsByCommittee(committeeId));
    }

    /**
     * Get a specific mission by ID.
     */
    @GetMapping("/missions/{missionId}")
    @PreAuthorize("hasAnyRole(" + RESP_CATASTRO_ROLES + ", 'VOLUNTEER')")
    public ResponseEntity<DisasterMission> getMissionById(@PathVariable UUID missionId) {
        return ResponseEntity.ok(catastropheService.getMissionById(missionId));
    }

    /**
     * Get missions assigned to the logged-in volunteer.
     */
    @GetMapping("/missions/my-missions")
    public ResponseEntity<List<DisasterMission>> getMyMissions(@RequestHeader("Authorization") String token) {
        UUID volunteerId = jwtService.extractUserId(token.substring(7));
        return ResponseEntity.ok(catastropheService.getMissionsByVolunteer(volunteerId));
    }

    /**
     * Create a new disaster mission.
     */
    @PostMapping("/missions")
    @PreAuthorize("hasAnyRole(" + RESP_CATASTRO_ROLES + ")")
    public ResponseEntity<DisasterMission> createMission(
            @RequestHeader("Authorization") String token,
            @RequestBody Map<String, Object> body) {
        UUID createdBy = jwtService.extractUserId(token.substring(7));
        String committeeIdStr = (String) body.get("committeeId");
        UUID committeeId = UUID.fromString(committeeIdStr);

        DisasterMission mission = buildMissionFromBody(body);
        DisasterMission saved = catastropheService.createMission(committeeId, mission, createdBy);
        return ResponseEntity.status(HttpStatus.CREATED).body(saved);
    }

    /**
     * Update an existing mission.
     */
    @PutMapping("/missions/{missionId}")
    @PreAuthorize("hasAnyRole(" + RESP_CATASTRO_ROLES + ")")
    public ResponseEntity<DisasterMission> updateMission(
            @PathVariable UUID missionId,
            @RequestBody Map<String, Object> body) {
        DisasterMission updates = buildMissionFromBody(body);
        return ResponseEntity.ok(catastropheService.updateMission(missionId, updates));
    }

    /**
     * Update mission status (start, complete, cancel).
     */
    @PutMapping("/missions/{missionId}/status")
    @PreAuthorize("hasAnyRole(" + RESP_CATASTRO_ROLES + ")")
    public ResponseEntity<DisasterMission> updateStatus(
            @PathVariable UUID missionId,
            @RequestParam String status) {
        return ResponseEntity.ok(catastropheService.updateStatus(missionId, status));
    }

    /**
     * Assign a report template to a mission.
     */
    @PutMapping("/missions/{missionId}/template")
    @PreAuthorize("hasAnyRole(" + RESP_CATASTRO_ROLES + ")")
    public ResponseEntity<DisasterMission> assignTemplate(
            @PathVariable UUID missionId,
            @RequestParam String templateId,
            @RequestParam(required = false) String deadline) {
        java.time.LocalDateTime parsedDeadline = null;
        if (deadline != null && !deadline.isBlank()) {
            parsedDeadline = parseFlexibleDateTime(deadline);
        }
        return ResponseEntity
                .ok(catastropheService.assignTemplate(missionId, UUID.fromString(templateId), parsedDeadline));
    }

    /**
     * Notify all assigned volunteers for a mission (platform + optional email).
     */
    @PostMapping("/missions/{missionId}/notify")
    @PreAuthorize("hasAnyRole(" + RESP_CATASTRO_ROLES + ")")
    public ResponseEntity<Void> notifyVolunteers(
            @PathVariable UUID missionId,
            @RequestParam(defaultValue = "true") boolean sendEmail) {
        catastropheService.notifyVolunteers(missionId, sendEmail);
        return ResponseEntity.ok().build();
    }

    // ─── Team Members ─────────────────────────────────────────────────────────

    @GetMapping("/team-members")
    @PreAuthorize("hasAnyRole(" + RESP_CATASTRO_ROLES + ")")
    public ResponseEntity<List<Map<String, Object>>> getTeamMembers(
            @RequestParam(required = false) UUID committeeId) {
        return ResponseEntity.ok(catastropheService.getTeamMembers(committeeId));
    }

    @GetMapping("/team-members/available")
    @PreAuthorize("hasAnyRole(" + RESP_CATASTRO_ROLES + ")")
    public ResponseEntity<List<Map<String, Object>>> getAvailableVolunteers(
            @RequestParam(required = false) UUID committeeId) {
        return ResponseEntity.ok(catastropheService.getAvailableVolunteers(committeeId));
    }

    @PostMapping("/team-members")
    @PreAuthorize("hasAnyRole(" + RESP_CATASTRO_ROLES + ")")
    public ResponseEntity<com.nexusaid.core.entity.domains.catastrophe.DisasterTeamMember> addTeamMember(
            @RequestBody Map<String, String> body) {
        UUID volunteerId = UUID.fromString(body.get("volunteerId"));
        String teamType = body.get("teamType");
        String specialty = body.get("specialty");
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(catastropheService.addTeamMember(volunteerId, teamType, specialty));
    }

    @PatchMapping("/team-members/{id}/status")
    @PreAuthorize("hasAnyRole(" + RESP_CATASTRO_ROLES + ")")
    public ResponseEntity<com.nexusaid.core.entity.domains.catastrophe.DisasterTeamMember> updateTeamMemberStatus(
            @PathVariable UUID id,
            @RequestParam String status) {
        return ResponseEntity.ok(catastropheService.updateTeamMemberStatus(id, status));
    }

    @DeleteMapping("/team-members/{id}")
    @PreAuthorize("hasAnyRole(" + RESP_CATASTRO_ROLES + ")")
    public ResponseEntity<Void> deleteTeamMember(@PathVariable UUID id) {
        catastropheService.deleteTeamMember(id);
        return ResponseEntity.noContent().build();
    }

    // ─── Field Reports ────────────────────────────────────────────────────────

    /**
     * Get all field reports for a mission.
     */
    @GetMapping("/missions/{missionId}/reports")
    @PreAuthorize("hasAnyRole(" + RESP_CATASTRO_ROLES + ")")
    public ResponseEntity<List<DisasterFieldReport>> getFieldReports(@PathVariable UUID missionId) {
        return ResponseEntity.ok(catastropheService.getFieldReportsByMission(missionId));
    }

    /**
     * Get my field reports as a volunteer.
     */
    @GetMapping("/my-reports")
    public ResponseEntity<List<DisasterFieldReport>> getMyReports(
            @RequestHeader("Authorization") String token) {
        UUID volunteerId = jwtService.extractUserId(token.substring(7));
        return ResponseEntity.ok(catastropheService.getFieldReportsByVolunteer(volunteerId));
    }

    /**
     * Volunteer submits a field report for a mission.
     */
    @PostMapping("/missions/{missionId}/reports")
    public ResponseEntity<DisasterFieldReport> submitReport(
            @PathVariable UUID missionId,
            @RequestHeader("Authorization") String token,
            @RequestBody DisasterFieldReport report) {
        UUID volunteerId = jwtService.extractUserId(token.substring(7));
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(catastropheService.submitFieldReport(missionId, report, volunteerId));
    }

    /**
     * Validate a submitted field report.
     */
    @PutMapping("/reports/{reportId}/validate")
    @PreAuthorize("hasAnyRole(" + RESP_CATASTRO_ROLES + ")")
    public ResponseEntity<DisasterFieldReport> validateReport(
            @PathVariable UUID reportId,
            @RequestParam(defaultValue = "") String notes) {
        return ResponseEntity.ok(catastropheService.validateFieldReport(reportId, notes));
    }

    // ─── Helper ───────────────────────────────────────────────────────────────

    @SuppressWarnings("unchecked")
    private DisasterMission buildMissionFromBody(Map<String, Object> body) {
        DisasterMission mission = new DisasterMission();
        if (body.get("title") != null)
            mission.setTitle((String) body.get("title"));
        if (body.get("description") != null)
            mission.setDescription((String) body.get("description"));
        if (body.get("missionType") != null)
            mission.setMissionType((String) body.get("missionType"));
        if (body.get("status") != null)
            mission.setStatus((String) body.get("status"));
        if (body.get("startDatetime") != null)
            mission.setStartDatetime(parseFlexibleDateTime((String) body.get("startDatetime")));
        if (body.get("endDatetime") != null)
            mission.setEndDatetime(parseFlexibleDateTime((String) body.get("endDatetime")));
        if (body.get("locationGps") != null)
            mission.setLocationGps((Map<String, Object>) body.get("locationGps"));
        if (body.get("teamChiefId") != null)
            mission.setTeamChiefId(UUID.fromString((String) body.get("teamChiefId")));
        if (body.get("teamChiefName") != null)
            mission.setTeamChiefName((String) body.get("teamChiefName"));
        if (body.get("assignedVolunteers") != null)
            mission.setAssignedVolunteers((List<Map<String, Object>>) body.get("assignedVolunteers"));
        if (body.get("requiredMaterials") != null)
            mission.setRequiredMaterials((List<String>) body.get("requiredMaterials"));
        if (body.get("instructions") != null)
            mission.setInstructions((String) body.get("instructions"));
        if (body.get("reportTemplateId") != null)
            mission.setReportTemplateId(UUID.fromString((String) body.get("reportTemplateId")));
        return mission;
    }

    /**
     * Parse a datetime string that may be in ISO-8601 Instant format (with Z or
     * offset)
     * or plain LocalDateTime format. Handles JavaScript's toISOString() output.
     */
    private java.time.LocalDateTime parseFlexibleDateTime(String text) {
        try {
            // Try ISO Instant format first (e.g. "2026-06-10T04:15:00.000Z")
            return java.time.Instant.parse(text)
                    .atZone(java.time.ZoneOffset.UTC)
                    .toLocalDateTime();
        } catch (java.time.format.DateTimeParseException e) {
            // Fall back to LocalDateTime format (e.g. "2026-06-10T04:15:00")
            return java.time.LocalDateTime.parse(text);
        }
    }
}
