package com.nexusaid.core.controller.domains.jeunesse;

import com.nexusaid.core.entity.domains.jeunesse.*;
import com.nexusaid.core.security.JwtService;
import com.nexusaid.core.service.domains.jeunesse.JeunesseService;
import com.nexusaid.core.service.domains.jeunesse.RecommendationAiService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/jeunesse")
@RequiredArgsConstructor
public class JeunesseController {

    private final JeunesseService jeunesseService;
    private final JwtService jwtService;
    private final RecommendationAiService aiService;

    // ----- Integration Forms & Recommendations -----

    @PostMapping("/recommendations/generate-ai")
    @PreAuthorize("hasAnyRole('PRESIDENT', 'RESP_JEUNESSE', 'ADMIN')")
    public ResponseEntity<com.nexusaid.core.dto.jeunesse.AiRecommendationResponse> generateAiRecommendation(
            @RequestBody com.nexusaid.core.dto.jeunesse.AiRecommendationRequest request) {
        return ResponseEntity.ok(aiService.generateRecommendation(request));
    }

    @PostMapping("/forms/{formId}/auto-recommend")
    @PreAuthorize("hasAnyRole('PRESIDENT', 'RESP_JEUNESSE', 'ADMIN')")
    public ResponseEntity<YouthRecommendation> autoGenerateRecommendation(@PathVariable UUID formId) {
        return ResponseEntity.ok(jeunesseService.autoGenerateRecommendation(formId));
    }

    @PostMapping("/forms")
    @PreAuthorize("hasRole('VOLUNTEER') or hasRole('ADMIN')")
    public ResponseEntity<YouthIntegrationForm> submitForm(
            @RequestHeader("Authorization") String token,
            @RequestBody YouthIntegrationForm form) {
        UUID volunteerId = jwtService.extractUserId(token.substring(7));
        return ResponseEntity.ok(jeunesseService.submitForm(form, volunteerId));
    }

    @GetMapping("/forms")
    @PreAuthorize("hasAnyRole('PRESIDENT', 'RESP_JEUNESSE', 'ADMIN')")
    public ResponseEntity<List<YouthIntegrationForm>> getAllForms() {
        return ResponseEntity.ok(jeunesseService.getAllForms());
    }

    @GetMapping("/forms/{formId}/recommendation")
    @PreAuthorize("hasAnyRole('PRESIDENT', 'RESP_JEUNESSE', 'VOLUNTEER', 'ADMIN')")
    public ResponseEntity<YouthRecommendation> getRecommendation(@PathVariable UUID formId) {
        return ResponseEntity.ok(jeunesseService.getRecommendationForForm(formId).orElse(null));
    }

    @PostMapping("/forms/{formId}/recommendation")
    @PreAuthorize("hasAnyRole('PRESIDENT', 'RESP_JEUNESSE', 'ADMIN')")
    public ResponseEntity<YouthRecommendation> createRecommendation(
            @PathVariable UUID formId,
            @RequestBody YouthRecommendation recommendation) {
        return ResponseEntity.ok(jeunesseService.createRecommendation(formId, recommendation));
    }

    // ----- Micro Projects -----

    @PostMapping("/projects")
    @PreAuthorize("hasRole('VOLUNTEER') or hasRole('ADMIN')")
    public ResponseEntity<MicroProject> createProject(
            @RequestHeader("Authorization") String token,
            @RequestBody MicroProject project) {
        UUID leadVolunteerId = jwtService.extractUserId(token.substring(7));
        return ResponseEntity.ok(jeunesseService.createProject(project, leadVolunteerId));
    }

    @GetMapping("/projects")
    @PreAuthorize("hasAnyRole('PRESIDENT', 'RESP_JEUNESSE', 'VOLUNTEER', 'ADMIN')")
    public ResponseEntity<List<MicroProject>> getAllProjects() {
        return ResponseEntity.ok(jeunesseService.getAllProjects());
    }

    // ----- Dynamic Templates & Builder -----

    @PostMapping("/templates")
    @PreAuthorize("hasAnyRole('PRESIDENT', 'RESP_JEUNESSE', 'ADMIN')")
    public ResponseEntity<YouthFormTemplate> createTemplate(@RequestBody YouthFormTemplate template) {
        return ResponseEntity.ok(jeunesseService.createTemplate(template));
    }

    @GetMapping("/templates")
    @PreAuthorize("hasAnyRole('PRESIDENT', 'RESP_JEUNESSE', 'VOLUNTEER', 'ADMIN')")
    public ResponseEntity<List<YouthFormTemplate>> getAllTemplates() {
        return ResponseEntity.ok(jeunesseService.getAllTemplates());
    }

    // ----- Dynamic Responses -----

    @PostMapping("/responses")
    @PreAuthorize("hasRole('VOLUNTEER') or hasRole('ADMIN')")
    public ResponseEntity<YouthFormResponse> submitDynamicForm(
            @RequestHeader("Authorization") String token,
            @RequestBody YouthFormResponse response) {
        UUID volunteerId = jwtService.extractUserId(token.substring(7));
        return ResponseEntity.ok(jeunesseService.submitDynamicForm(response, volunteerId));
    }

    @GetMapping("/templates/{templateId}/responses")
    @PreAuthorize("hasAnyRole('PRESIDENT', 'RESP_JEUNESSE', 'ADMIN')")
    public ResponseEntity<List<YouthFormResponse>> getResponsesByTemplate(@PathVariable UUID templateId) {
        return ResponseEntity.ok(jeunesseService.getResponsesByTemplate(templateId));
    }

    // ----- Configuration & Options -----

    @GetMapping("/config/options")
    @PreAuthorize("isAuthenticated()") // More permissive: anyone logged in can see options
    public ResponseEntity<List<YouthDomainOption>> getAllOptions() {
        return ResponseEntity.ok(jeunesseService.getAllOptions());
    }

    @PostMapping("/config/options")
    @PreAuthorize("hasAnyRole('PRESIDENT', 'RESP_JEUNESSE', 'ADMIN')")
    public ResponseEntity<YouthDomainOption> saveOption(@RequestBody YouthDomainOption option) {
        return ResponseEntity.ok(jeunesseService.saveOption(option));
    }

    @DeleteMapping("/config/options/{id}")
    @PreAuthorize("hasAnyRole('PRESIDENT', 'RESP_JEUNESSE', 'ADMIN')")
    public ResponseEntity<Void> deleteOption(@PathVariable UUID id) {
        jeunesseService.deleteOption(id);
        return ResponseEntity.noContent().build();
    }

    // ----- Statistics -----

    @GetMapping("/stats")
    @PreAuthorize("hasAnyRole('PRESIDENT', 'RESP_JEUNESSE', 'ADMIN')")
    public ResponseEntity<Map<String, Object>> getStats() {
        return ResponseEntity.ok(jeunesseService.getYouthStats());
    }
}
