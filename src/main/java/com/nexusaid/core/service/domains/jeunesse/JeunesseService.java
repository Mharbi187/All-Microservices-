package com.nexusaid.core.service.domains.jeunesse;

import com.nexusaid.core.entity.Committee;
import com.nexusaid.core.entity.CommitteeRole;
import com.nexusaid.core.entity.User;
import com.nexusaid.core.entity.Volunteer;
import com.nexusaid.core.entity.enums.CommitteeType;
import com.nexusaid.core.entity.enums.RoleTitle;
import com.nexusaid.core.entity.enums.UserType;
import com.nexusaid.core.repository.CommitteeRepository;
import com.nexusaid.core.repository.CommitteeRoleRepository;
import com.nexusaid.core.repository.UserRepository;
import com.nexusaid.core.repository.VolunteerRepository;
import com.nexusaid.core.service.NotificationService;
import com.nexusaid.core.entity.domains.jeunesse.*;
import com.nexusaid.core.repository.domains.jeunesse.*;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.*;

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
    private final CommitteeRepository committeeRepository;
    private final CommitteeRoleRepository roleRepository;
    private final VolunteerRepository volunteerRepository;
    private final NotificationService notificationService;

    // ----- Access Control Helper -----

    public List<UUID> resolveUserAccessibleCommittees(UUID userId) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new RuntimeException("Utilisateur introuvable"));

        if (user.getType() == UserType.ADMIN) {
            return Collections.emptyList(); // Admin has all access
        }

        List<CommitteeRole> roles = roleRepository.findByVolunteerId(userId);
        boolean isNational = false;
        boolean isRegional = false;
        UUID regionalCommitteeId = null;
        UUID localCommitteeId = null;

        for (CommitteeRole role : roles) {
            if (role.getCommittee() != null) {
                CommitteeType type = role.getCommittee().getType();
                if (type == CommitteeType.NATIONAL) {
                    isNational = true;
                } else if (type == CommitteeType.REGIONAL) {
                    isRegional = true;
                    regionalCommitteeId = role.getCommittee().getId();
                } else if (type == CommitteeType.LOCAL) {
                    localCommitteeId = role.getCommittee().getId();
                }
            }
        }

        if (isNational) {
            return Collections.emptyList();
        }

        if (isRegional && regionalCommitteeId != null) {
            List<UUID> ids = new ArrayList<>();
            ids.add(regionalCommitteeId);
            List<Committee> subCommittees = committeeRepository.findByParentCommitteeId(regionalCommitteeId);
            for (Committee c : subCommittees) {
                ids.add(c.getId());
            }
            return ids;
        }

        if (localCommitteeId != null) {
            return List.of(localCommitteeId);
        }

        if (user instanceof Volunteer) {
            UUID vComm = ((Volunteer) user).getCommitteeId();
            if (vComm != null) {
                return List.of(vComm);
            }
        }

        return Collections.emptyList();
    }

    // ----- Integration Forms & Filtered Queries -----

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
    public List<YouthIntegrationForm> getAllFormsFiltered(UUID userId) {
        List<UUID> allowedCommittees = resolveUserAccessibleCommittees(userId);
        List<YouthIntegrationForm> allForms = formRepository.findAll();
        
        if (allowedCommittees.isEmpty()) {
            return allForms;
        }
        
        List<YouthIntegrationForm> filtered = new ArrayList<>();
        for (YouthIntegrationForm form : allForms) {
            Optional<Volunteer> volOpt = volunteerRepository.findById(form.getVolunteerId());
            if (volOpt.isPresent() && allowedCommittees.contains(volOpt.get().getCommitteeId())) {
                filtered.add(form);
            }
        }
        return filtered;
    }

    @Transactional(readOnly = true)
    public Optional<YouthRecommendation> getRecommendationForForm(UUID formId) {
        return recommendationRepository.findByFormId(formId);
    }

    @Transactional
    public YouthRecommendation createRecommendation(UUID formId, YouthRecommendation recommendation) {
        recommendation.setFormId(formId);
        recommendation.setStatus("APPROVED");
        return recommendationRepository.save(recommendation);
    }

    // ----- Micro Projects -----

    @Transactional
    public MicroProject createProject(MicroProject project, UUID leadVolunteerId) {
        project.setLeadVolunteerId(leadVolunteerId);
        project.setStatus("PENDING_VALIDATION");
        volunteerRepository.findById(leadVolunteerId).ifPresent(v -> {
            project.setCommitteeId(v.getCommitteeId());
        });
        return projectRepository.save(project);
    }

    @Transactional(readOnly = true)
    public List<MicroProject> getAllProjects() {
        return projectRepository.findAll();
    }

    @Transactional(readOnly = true)
    public List<MicroProject> getProjectsFiltered(UUID userId) {
        List<UUID> allowedCommittees = resolveUserAccessibleCommittees(userId);
        
        boolean isStaff = false;
        List<CommitteeRole> roles = roleRepository.findByVolunteerId(userId);
        for (CommitteeRole r : roles) {
            if (r.getTitle() == RoleTitle.PRESIDENT || r.getTitle() == RoleTitle.RESP_JEUNESSE) {
                isStaff = true;
                break;
            }
        }
        
        User user = userRepository.findById(userId).orElse(null);
        if (user != null && user.getType() == UserType.ADMIN) {
            isStaff = true;
        }

        if (allowedCommittees.isEmpty()) {
            if (isStaff) {
                return projectRepository.findAll();
            } else {
                return projectRepository.findByStatus("APPROVED");
            }
        }
        
        if (isStaff) {
            return projectRepository.findByCommitteeIdIn(allowedCommittees);
        } else {
            List<MicroProject> approved = projectRepository.findByCommitteeIdInAndStatus(allowedCommittees, "APPROVED");
            List<MicroProject> active = projectRepository.findByCommitteeIdInAndStatus(allowedCommittees, "ACTIVE");
            List<MicroProject> myProjects = projectRepository.findByLeadVolunteerId(userId);
            
            Set<MicroProject> resultSet = new LinkedHashSet<>();
            resultSet.addAll(approved);
            resultSet.addAll(active);
            resultSet.addAll(myProjects);
            return new ArrayList<>(resultSet);
        }
    }

    // ----- General Recommendations -----

    @Transactional(readOnly = true)
    public List<YouthRecommendation> getRecommendationsFiltered(UUID userId) {
        List<UUID> allowedCommittees = resolveUserAccessibleCommittees(userId);
        
        boolean isStaff = false;
        List<CommitteeRole> roles = roleRepository.findByVolunteerId(userId);
        for (CommitteeRole r : roles) {
            if (r.getTitle() == RoleTitle.PRESIDENT || r.getTitle() == RoleTitle.RESP_JEUNESSE) {
                isStaff = true;
                break;
            }
        }
        
        User user = userRepository.findById(userId).orElse(null);
        if (user != null && user.getType() == UserType.ADMIN) {
            isStaff = true;
        }

        List<YouthRecommendation> allPublished = recommendationRepository.findByFormIdIsNull();

        if (allowedCommittees.isEmpty()) {
            if (isStaff) {
                return allPublished;
            } else {
                return allPublished.stream().filter(r -> "APPROVED".equals(r.getStatus())).toList();
            }
        }

        List<YouthRecommendation> filtered = new ArrayList<>();
        for (YouthRecommendation rec : allPublished) {
            if (rec.getCommitteeId() != null && allowedCommittees.contains(rec.getCommitteeId())) {
                if (isStaff || "APPROVED".equals(rec.getStatus())) {
                    filtered.add(rec);
                }
            }
        }
        return filtered;
    }

    @Transactional
    public YouthRecommendation publishGeneralRecommendation(YouthRecommendation rec, UUID userId) {
        List<CommitteeRole> roles = roleRepository.findByVolunteerId(userId);
        UUID commId = null;
        for (CommitteeRole r : roles) {
            if (r.getTitle() == RoleTitle.RESP_JEUNESSE) {
                commId = r.getCommittee().getId();
                break;
            }
        }
        
        if (commId == null && !roles.isEmpty()) {
            commId = roles.get(0).getCommittee().getId();
        }

        User user = userRepository.findById(userId).orElse(null);
        if (commId == null && user instanceof Volunteer) {
            commId = ((Volunteer) user).getCommitteeId();
        }

        rec.setCommitteeId(commId);
        rec.setStatus("PENDING_VALIDATION");
        rec.setDateCreation(java.time.LocalDateTime.now());
        rec.setFormId(null);
        return recommendationRepository.save(rec);
    }

    @Transactional
    public YouthRecommendation updateRecommendation(UUID id, YouthRecommendation updated, UUID userId) {
        YouthRecommendation existing = recommendationRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Recommandation introuvable"));
        
        existing.setTitle(updated.getTitle());
        existing.setDescription(updated.getDescription());
        existing.setCategory(updated.getCategory());
        existing.setTarget(updated.getTarget());
        existing.setPriority(updated.getPriority());
        existing.setStatus("PENDING_VALIDATION");
        return recommendationRepository.save(existing);
    }

    @Transactional
    public void deleteRecommendation(UUID id, UUID userId) {
        YouthRecommendation existing = recommendationRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Recommandation introuvable"));
        recommendationRepository.delete(existing);
    }

    // ----- Validation Workflow -----

    @Transactional
    public MicroProject validateProject(UUID projectId, boolean approve, UUID presidentUserId) {
        MicroProject project = projectRepository.findById(projectId)
                .orElseThrow(() -> new RuntimeException("Projet introuvable"));

        List<CommitteeRole> roles = roleRepository.findByVolunteerId(presidentUserId);
        boolean hasAccess = false;
        for (CommitteeRole role : roles) {
            if (role.getTitle() == RoleTitle.PRESIDENT) {
                if (role.getCommittee().getType() == CommitteeType.NATIONAL) {
                    hasAccess = true;
                } else if (role.getCommittee().getId().equals(project.getCommitteeId())) {
                    hasAccess = true;
                } else if (role.getCommittee().getType() == CommitteeType.REGIONAL) {
                    List<Committee> subCommittees = committeeRepository.findByParentCommitteeId(role.getCommittee().getId());
                    if (subCommittees.stream().anyMatch(c -> c.getId().equals(project.getCommitteeId()))) {
                        hasAccess = true;
                    }
                }
            }
        }

        User presidentUser = userRepository.findById(presidentUserId).orElse(null);
        if (presidentUser != null && presidentUser.getType() == UserType.ADMIN) {
            hasAccess = true;
        }

        if (!hasAccess) {
            throw new org.springframework.security.access.AccessDeniedException("Seul le Président autorisé peut valider ce projet.");
        }

        project.setStatus(approve ? "APPROVED" : "REJECTED");
        MicroProject saved = projectRepository.save(project);

        userRepository.findById(project.getLeadVolunteerId()).ifPresent(creator -> {
            String msg = "Votre micro-projet '" + project.getTitle() + "' a été " + (approve ? "approuvé !" : "rejeté.");
            notificationService.sendNotification(creator, "INFO", "Statut du Micro-projet", msg, "/volunteer/youth-space");
        });

        return saved;
    }

    @Transactional
    public YouthRecommendation validateRecommendation(UUID recId, boolean approve, UUID presidentUserId) {
        YouthRecommendation rec = recommendationRepository.findById(recId)
                .orElseThrow(() -> new RuntimeException("Recommandation introuvable"));

        List<CommitteeRole> roles = roleRepository.findByVolunteerId(presidentUserId);
        boolean hasAccess = false;
        for (CommitteeRole role : roles) {
            if (role.getTitle() == RoleTitle.PRESIDENT) {
                if (role.getCommittee().getType() == CommitteeType.NATIONAL) {
                    hasAccess = true;
                } else if (role.getCommittee().getId().equals(rec.getCommitteeId())) {
                    hasAccess = true;
                } else if (role.getCommittee().getType() == CommitteeType.REGIONAL) {
                    List<Committee> subCommittees = committeeRepository.findByParentCommitteeId(role.getCommittee().getId());
                    if (subCommittees.stream().anyMatch(c -> c.getId().equals(rec.getCommitteeId()))) {
                        hasAccess = true;
                    }
                }
            }
        }

        User presidentUser = userRepository.findById(presidentUserId).orElse(null);
        if (presidentUser != null && presidentUser.getType() == UserType.ADMIN) {
            hasAccess = true;
        }

        if (!hasAccess) {
            throw new org.springframework.security.access.AccessDeniedException("Seul le Président autorisé peut valider cette recommandation.");
        }

        rec.setStatus(approve ? "APPROVED" : "REJECTED");
        return recommendationRepository.save(rec);
    }

    // ----- Form Metadata & Dynamic Templates -----

    @Transactional
    public YouthFormTemplate createTemplate(YouthFormTemplate template) {
        YouthFormTemplate saved = templateRepository.save(template);

        List<Volunteer> targets;
        if ("ALL".equalsIgnoreCase(template.getCommitteeId())) {
            targets = volunteerRepository.findAll();
        } else {
            try {
                UUID cId = UUID.fromString(template.getCommitteeId());
                targets = volunteerRepository.findAll().stream()
                        .filter(v -> cId.equals(v.getCommitteeId()))
                        .toList();
            } catch (Exception e) {
                targets = Collections.emptyList();
            }
        }

        for (Volunteer v : targets) {
            notificationService.sendNotification(
                    v,
                    "INFO",
                    "Nouveau Formulaire publié !",
                    "Un nouveau formulaire '" + template.getTitle() + "' est disponible pour votre comité.",
                    "/volunteer/youth-space"
            );
        }

        return saved;
    }

    @Transactional(readOnly = true)
    public List<YouthFormTemplate> getAllTemplates() {
        return templateRepository.findAll();
    }

    @Transactional(readOnly = true)
    public List<YouthFormTemplate> getTemplatesFiltered(UUID userId) {
        List<UUID> allowedCommittees = resolveUserAccessibleCommittees(userId);
        List<YouthFormTemplate> allTemplates = templateRepository.findAll();
        
        if (allowedCommittees.isEmpty()) {
            return allTemplates;
        }
        
        List<YouthFormTemplate> filtered = new ArrayList<>();
        for (YouthFormTemplate t : allTemplates) {
            if ("ALL".equalsIgnoreCase(t.getCommitteeId())) {
                filtered.add(t);
            } else {
                try {
                    UUID tCommId = UUID.fromString(t.getCommitteeId());
                    if (allowedCommittees.contains(tCommId)) {
                        filtered.add(t);
                    }
                } catch (Exception ignored) {}
            }
        }
        return filtered;
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
        YouthIntegrationForm form = formRepository.findById(formId)
                .orElseThrow(() -> new RuntimeException("Formulaire introuvable"));

        com.nexusaid.core.entity.User user = userRepository.findById(form.getVolunteerId())
                .orElseThrow(() -> new RuntimeException("Utilisateur introuvable"));

        int userAge = 25;
        if (user.getBirthDate() != null) {
            userAge = java.time.Period.between(user.getBirthDate(), java.time.LocalDate.now()).getYears();
        }

        com.nexusaid.core.dto.jeunesse.AiRecommendationRequest aiRequest = com.nexusaid.core.dto.jeunesse.AiRecommendationRequest
                .builder()
                .age(userAge)
                .competences(form.getSkills())
                .interets(form.getInterestAreas())
                .region("Tunisie")
                .experience("Standard volunteer profile")
                .disponibilite("À définir")
                .formation_souhaitee("Toutes")
                .build();

        com.nexusaid.core.dto.jeunesse.AiRecommendationResponse aiResponse = aiService
                .generateRecommendation(aiRequest);

        YouthRecommendation recommendation = new YouthRecommendation();
        recommendation.setFormId(formId);
        recommendation.setGeneratedAt(java.time.LocalDateTime.now());
        recommendation.setStatus("APPROVED");

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
        }

        Optional<YouthRecommendation> existing = recommendationRepository.findByFormId(formId);
        if (existing.isPresent()) {
            YouthRecommendation toUpdate = existing.get();
            toUpdate.setRecommendedTrainingIA(recommendation.getRecommendedTrainingIA());
            toUpdate.setRecommendedMissions(recommendation.getRecommendedMissions());
            toUpdate.setGeneratedAt(recommendation.getGeneratedAt());
            toUpdate.setStatus("APPROVED");
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
        return getYouthStatsFiltered(null);
    }

    @Transactional(readOnly = true)
    public Map<String, Object> getYouthStatsFiltered(UUID userId) {
        List<UUID> allowedCommittees = userId != null ? resolveUserAccessibleCommittees(userId) : Collections.emptyList();
        
        List<YouthIntegrationForm> forms = formRepository.findAll();
        List<MicroProject> projects = projectRepository.findAll();
        List<YouthRecommendation> recommendations = recommendationRepository.findAll();
        List<YouthFormResponse> responses = responseRepository.findAll();

        if (!allowedCommittees.isEmpty()) {
            forms = forms.stream().filter(f -> {
                Optional<Volunteer> vol = volunteerRepository.findById(f.getVolunteerId());
                return vol.isPresent() && allowedCommittees.contains(vol.get().getCommitteeId());
            }).toList();

            responses = responses.stream().filter(r -> {
                Optional<Volunteer> vol = volunteerRepository.findById(r.getIdVolunteer());
                return vol.isPresent() && allowedCommittees.contains(vol.get().getCommitteeId());
            }).toList();

            projects = projects.stream().filter(p -> p.getCommitteeId() != null && allowedCommittees.contains(p.getCommitteeId())).toList();

            recommendations = recommendations.stream().filter(r -> r.getCommitteeId() != null && allowedCommittees.contains(r.getCommitteeId())).toList();
        }

        Map<String, Object> stats = new HashMap<>();
        stats.put("totalForms", (long) forms.size());
        stats.put("totalResponses", (long) responses.size());
        stats.put("totalProjects", (long) projects.size());
        stats.put("totalRecommendations", (long) recommendations.size());

        long age8_12 = 0, age13_15 = 0, age16_18 = 0, agePlus18 = 0;
        Map<String, Integer> skillFreq = new HashMap<>();
        Map<String, Integer> interestFreq = new HashMap<>();
        Map<String, Integer> trainingFreq = new HashMap<>();

        for (YouthIntegrationForm form : forms) {
            Optional<User> userOpt = userRepository.findById(form.getVolunteerId());
            if (userOpt.isPresent() && userOpt.get().getBirthDate() != null) {
                int age = java.time.Period.between(userOpt.get().getBirthDate(), java.time.LocalDate.now()).getYears();
                if (age >= 8 && age <= 12) age8_12++;
                else if (age >= 13 && age <= 15) age13_15++;
                else if (age >= 16 && age <= 18) age16_18++;
                else if (age > 18) agePlus18++;
            } else {
                agePlus18++;
            }

            if (form.getSkills() != null) {
                for (String s : form.getSkills()) {
                    skillFreq.put(s, skillFreq.getOrDefault(s, 0) + 1);
                }
            }

            if (form.getInterestAreas() != null) {
                for (String i : form.getInterestAreas()) {
                    interestFreq.put(i, interestFreq.getOrDefault(i, 0) + 1);
                }
            }
        }

        for (YouthRecommendation rec : recommendations) {
            if (rec.getRecommendedTrainingIA() != null) {
                for (String t : rec.getRecommendedTrainingIA()) {
                    trainingFreq.put(t, trainingFreq.getOrDefault(t, 0) + 1);
                }
            }
        }

        stats.put("ageDemographics", List.of(
                Map.of("type", "8-12 ans", "value", age8_12),
                Map.of("type", "13-15 ans", "value", age13_15),
                Map.of("type", "16-18 ans", "value", age16_18),
                Map.of("type", "+18 ans", "value", agePlus18)));

        List<Map<String, Object>> skillStats = skillFreq.entrySet().stream()
                .sorted(Map.Entry.<String, Integer>comparingByValue().reversed())
                .limit(6)
                .map(e -> (Map<String, Object>) Map.of("name", (Object) e.getKey(), "value", (Object) e.getValue()))
                .toList();
        stats.put("topSkills", skillStats);

        List<Map<String, Object>> interestStats = interestFreq.entrySet().stream()
                .sorted(Map.Entry.<String, Integer>comparingByValue().reversed())
                .limit(6)
                .map(e -> (Map<String, Object>) Map.of("name", (Object) e.getKey(), "value", (Object) e.getValue()))
                .toList();
        stats.put("emergingInterests", interestStats);

        List<Map<String, Object>> trainingStats = trainingFreq.entrySet().stream()
                .sorted(Map.Entry.<String, Integer>comparingByValue().reversed())
                .limit(6)
                .map(e -> (Map<String, Object>) Map.of("name", (Object) e.getKey(), "value", (Object) e.getValue()))
                .toList();
        stats.put("trainingNeeds", trainingStats);

        return stats;
    }
}
