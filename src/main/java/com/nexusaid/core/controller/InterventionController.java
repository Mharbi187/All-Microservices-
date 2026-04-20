package com.nexusaid.core.controller;

import com.nexusaid.core.entity.Intervention;
import com.nexusaid.core.entity.InterventionParticipant;
import com.nexusaid.core.entity.enums.InterventionType;
import com.nexusaid.core.service.InterventionService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.*;

@RestController
@RequestMapping("/api/v1/interventions")
@RequiredArgsConstructor
public class InterventionController {

    private final InterventionService interventionService;

    @GetMapping
    public ResponseEntity<List<Intervention>> getAll() {
        return ResponseEntity.ok(interventionService.findAll());
    }

    @PostMapping
    public ResponseEntity<Intervention> create(@RequestBody Map<String, Object> body) {
        UUID committeeId = UUID.fromString((String) body.get("committeeId"));
        UUID responsibleId = body.get("responsibleId") != null ? UUID.fromString((String) body.get("responsibleId"))
                : null;

        Intervention intervention = Intervention.builder()
                .title((String) body.get("title"))
                .description((String) body.get("description"))
                .interventionType(InterventionType.valueOf((String) body.get("interventionType")))
                .startDatetime(LocalDateTime.parse((String) body.get("startDatetime")))
                .locationGps((String) body.get("locationGps"))
                .build();

        return ResponseEntity.status(HttpStatus.CREATED)
                .body(interventionService.create(committeeId, responsibleId, intervention));
    }

    @GetMapping("/{id}")
    public ResponseEntity<Intervention> getById(@PathVariable UUID id) {
        return ResponseEntity.ok(interventionService.findById(id));
    }

    @GetMapping("/committee/{committeeId}")
    public ResponseEntity<List<Intervention>> getByCommittee(@PathVariable UUID committeeId) {
        return ResponseEntity.ok(interventionService.findByCommittee(committeeId));
    }

    @GetMapping("/volunteer/{volunteerId}")
    public ResponseEntity<List<Intervention>> getByVolunteer(@PathVariable UUID volunteerId) {
        return ResponseEntity.ok(interventionService.findByVolunteer(volunteerId));
    }

    @PostMapping("/{id}/start")
    public ResponseEntity<Intervention> start(@PathVariable UUID id) {
        return ResponseEntity.ok(interventionService.startIntervention(id));
    }

    @PostMapping("/{id}/complete")
    public ResponseEntity<Intervention> complete(@PathVariable UUID id, @RequestBody Map<String, Object> body) {
        String reportContent = (String) body.get("reportContent");
        Integer beneficiariesCount = body.get("beneficiariesCount") != null ? (Integer) body.get("beneficiariesCount")
                : null;
        return ResponseEntity.ok(interventionService.completeIntervention(id, reportContent, beneficiariesCount));
    }

    @PutMapping("/{id}/participants")
    public ResponseEntity<InterventionParticipant> addParticipant(@PathVariable UUID id,
            @RequestBody Map<String, Object> body) {
        UUID volunteerId = UUID.fromString((String) body.get("volunteerId"));
        String role = (String) body.get("role");
        BigDecimal hours = body.get("hours") != null ? new BigDecimal(body.get("hours").toString()) : null;
        return ResponseEntity.ok(interventionService.addParticipant(id, volunteerId, role, hours));
    }

    @GetMapping("/{id}/participants")
    public ResponseEntity<List<InterventionParticipant>> getParticipants(@PathVariable UUID id) {
        return ResponseEntity.ok(interventionService.getParticipants(id));
    }
}
