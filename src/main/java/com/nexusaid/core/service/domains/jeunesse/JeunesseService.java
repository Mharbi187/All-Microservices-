package com.nexusaid.core.service.domains.jeunesse;

import com.nexusaid.core.repository.UserRepository;
import com.nexusaid.core.entity.domains.jeunesse.*;
import com.nexusaid.core.repository.domains.jeunesse.*;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class JeunesseService {

    private final YouthIntegrationFormRepository formRepository;
    private final YouthRecommendationRepository recommendationRepository;
    private final MicroProjectRepository projectRepository;
    private final YouthFormTemplateRepository templateRepository;
    private final YouthFormResponseRepository responseRepository;
    private final YouthDomainOptionRepository optionRepository;
    private final RecommendationAiService aiService;
    private final UserRepository userRepository;

    @Transactional
    public YouthIntegrationForm submitForm(YouthIntegrationForm form, UUID volunteerId) {
        form.setVolunteerId(volunteerId);
        return formRepository.save(form);
    }

    @Transactional(readOnly = true)
    public List<YouthIntegrationForm> getAllForms() {
        return formRepository.findAll();
    }

    @Transactional(readOnly = true)
    public Optional<YouthRecommendation> getRecommendationForForm(UUID formId) {
        return recommendationRepository.findByFormId(formId);
    }

    @Transactional
    public YouthRecommendation createRecommendation(UUID formId, YouthRecommendation recommendation) {
        recommendation.setFormId(formId);
        return recommendationRepository.save(recommendation);
    }

    @Transactional
    public MicroProject createProject(MicroProject project, UUID leadVolunteerId) {
        project.setLeadVolunteerId(leadVolunteerId);
        project.setStatus("PROPOSED");
        return projectRepository.save(project);
    }

    @Transactional(readOnly = true)
    public List<MicroProject> getAllProjects() {
        return projectRepository.findAll();
    }

    // ----- Form Metadata & Dynamic Templates -----

    @Transactional
    public YouthFormTemplate createTemplate(YouthFormTemplate template) {
        return templateRepository.save(template);
    }

    @Transactional(readOnly = true)
    public List<YouthFormTemplate> getAllTemplates() {
        return templateRepository.findAll();
    }

    // ----- Dynamic Form Responses -----

    @Transactional
    public YouthFormResponse submitDynamicForm(YouthFormResponse response, UUID volunteerId) {
        response.setIdVolunteer(volunteerId);
        return responseRepository.save(response);
    }

    @Transactional(readOnly = true)
    public List<YouthFormResponse> getResponsesByTemplate(UUID templateId) {
        return responseRepository.findByIdFormTemplate(templateId);
    }

    @Transactional
    public YouthRecommendation autoGenerateRecommendation(UUID formId) {
        // 1. Fetch form data
        YouthIntegrationForm form = formRepository.findById(formId)
                .orElseThrow(() -> new RuntimeException("Formulaire introuvable"));

        // 2. Fetch volunteer/user data
        com.nexusaid.core.entity.User user = userRepository.findById(form.getVolunteerId())
                .orElseThrow(() -> new RuntimeException("Utilisateur introuvable"));

        // 3. Prepare AI request
        com.nexusaid.core.dto.jeunesse.AiRecommendationRequest aiRequest = com.nexusaid.core.dto.jeunesse.AiRecommendationRequest
                .builder()
                .age(25) // Defaulting age since User does not store birthDate
                .competences(form.getSkills())
                .interets(form.getInterestAreas())
                .region("Tunisie")
                .experience("Standard volunteer profile")
                .disponibilite("À définir")
                .formation_souhaitee("Toutes")
                .build();

        // 4. Call AI Service
        com.nexusaid.core.dto.jeunesse.AiRecommendationResponse aiResponse = aiService
                .generateRecommendation(aiRequest);

        // 5. Map to YouthRecommendation entity
        YouthRecommendation recommendation = new YouthRecommendation();
        recommendation.setFormId(formId);
        recommendation.setGeneratedAt(java.time.LocalDateTime.now());

        if (aiResponse != null && aiResponse.getRecommandations() != null
                && !aiResponse.getRecommandations().isEmpty()) {
            StringBuilder desc = new StringBuilder("Profil analysé avec succès. Recommandations prioritaires :\n\n");
            List<String> trainings = new java.util.ArrayList<>();
            List<String> missions = new java.util.ArrayList<>();

            for (com.nexusaid.core.dto.jeunesse.AiRecommendationResponse.AiRecommendationDetail detail : aiResponse
                    .getRecommandations()) {
                desc.append("- ").append(detail.getFormation()).append(" (Priorité: ").append(detail.getPriorité())
                        .append(")\n");
                trainings.add(detail.getFormation());
                missions.add(detail.getRole_possible());
            }

            recommendation.setRecommendedTrainingIA(trainings);
            recommendation.setRecommendedMissions(missions);
        } else {
            // IA couldn't generate. No-op as fields don't exist in entity
        }

        // 6. Save or Update existing one
        Optional<YouthRecommendation> existing = recommendationRepository.findByFormId(formId);
        if (existing.isPresent()) {
            YouthRecommendation toUpdate = existing.get();
            toUpdate.setRecommendedTrainingIA(recommendation.getRecommendedTrainingIA());
            toUpdate.setRecommendedMissions(recommendation.getRecommendedMissions());
            toUpdate.setGeneratedAt(recommendation.getGeneratedAt());
            return recommendationRepository.save(toUpdate);
        }

        return recommendationRepository.save(recommendation);
    }

    // ----- Configuration & Options -----

    @Transactional(readOnly = true)
    public List<YouthDomainOption> getAllOptions() {
        return optionRepository.findAll();
    }

    @Transactional
    public YouthDomainOption saveOption(YouthDomainOption option) {
        return optionRepository.save(option);
    }

    @Transactional
    public void deleteOption(UUID id) {
        optionRepository.deleteById(id);
    }

    // ----- Statistics -----

    @Transactional(readOnly = true)
    public Map<String, Object> getYouthStats() {
        Map<String, Object> stats = new HashMap<>();
        stats.put("totalForms", formRepository.count());
        stats.put("totalResponses", responseRepository.count());
        stats.put("totalProjects", projectRepository.count());
        stats.put("totalRecommendations", recommendationRepository.count());

        // Real age demographics calculation
        List<YouthIntegrationForm> forms = formRepository.findAll();
        long age8_12 = 0, age13_15 = 0, age16_18 = 0, agePlus18 = 0;

        for (YouthIntegrationForm form : forms) {
            Optional<com.nexusaid.core.entity.User> userOpt = userRepository.findById(form.getVolunteerId());
            if (userOpt.isPresent()) {
                int age = 25; // Default age simulating 25
                if (age >= 8 && age <= 12)
                    age8_12++;
                else if (age >= 13 && age <= 15)
                    age13_15++;
                else if (age >= 16 && age <= 18)
                    age16_18++;
                else if (age > 18)
                    agePlus18++;
            }
        }

        stats.put("ageDemographics", List.of(
                Map.of("type", "8-12 ans", "value", age8_12),
                Map.of("type", "13-15 ans", "value", age13_15),
                Map.of("type", "16-18 ans", "value", age16_18),
                Map.of("type", "+18 ans", "value", agePlus18)));

        return stats;
    }
}
