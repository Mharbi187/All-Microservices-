package com.nexusaid.core.service.domains.jeunesse;

import com.nexusaid.core.entity.Committee;
import com.nexusaid.core.entity.CommitteeRole;
import com.nexusaid.core.entity.User;
import com.nexusaid.core.entity.Volunteer;
import com.nexusaid.core.entity.enums.CommitteeType;
import com.nexusaid.core.entity.enums.RoleTitle;
import com.nexusaid.core.entity.enums.UserType;
import com.nexusaid.core.entity.enums.AccountStatus;
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
import jakarta.persistence.EntityManager;

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
    private final EntityManager entityManager;

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

    public List<UUID> getTargetCommittees(UUID userId, UUID committeeId) {
        List<UUID> allowed = resolveUserAccessibleCommittees(userId);
        if (committeeId != null) {
            if (!allowed.isEmpty() && !allowed.contains(committeeId)) {
                throw new org.springframework.security.access.AccessDeniedException("Accès non autorisé à ce comité.");
            }
            return Collections.singletonList(committeeId);
        }
        return allowed;
    }

    // ----- Integration Forms & Filtered Queries -----

    @Transactional
    public YouthIntegrationForm submitForm(YouthIntegrationForm form, UUID volunteerId) {
        form.setVolunteerId(volunteerId);
        return formRepository.save(form);
    }

    @Transactional(readOnly = true)
    public List<YouthIntegrationForm> getAllForms() {
        List<YouthIntegrationForm> forms = formRepository.findAll();
        for (YouthIntegrationForm form : forms) {
            userRepository.findById(form.getVolunteerId()).ifPresent(u -> form.setVolunteerName(u.getFullName()));
        }
        return forms;
    }

    @Transactional(readOnly = true)
    public List<YouthIntegrationForm> getAllFormsFiltered(UUID userId, UUID committeeId) {
        List<UUID> allowedCommittees = getTargetCommittees(userId, committeeId);
        List<YouthIntegrationForm> allForms = formRepository.findAll();
        
        for (YouthIntegrationForm form : allForms) {
            userRepository.findById(form.getVolunteerId()).ifPresent(u -> form.setVolunteerName(u.getFullName()));
        }
        
        if (allowedCommittees.isEmpty() && committeeId == null) {
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
    public List<MicroProject> getProjectsFiltered(UUID userId, UUID committeeId) {
        List<UUID> allowedCommittees = getTargetCommittees(userId, committeeId);
        
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

        if (allowedCommittees.isEmpty() && committeeId == null) {
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
    public List<YouthRecommendation> getRecommendationsFiltered(UUID userId, UUID committeeId) {
        List<UUID> allowedCommittees = getTargetCommittees(userId, committeeId);
        
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

        if (allowedCommittees.isEmpty() && committeeId == null) {
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
        if (template.getStatus() == null || template.getStatus().isEmpty()) {
            template.setStatus("PENDING_VALIDATION");
        }
        YouthFormTemplate saved = templateRepository.save(template);

        if ("APPROVED".equals(saved.getStatus())) {
            sendTemplateNotifications(saved);
        }

        return saved;
    }

    private void sendTemplateNotifications(YouthFormTemplate template) {
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
    }

    @Transactional
    public YouthFormTemplate updateTemplate(UUID id, YouthFormTemplate updated, UUID userId) {
        YouthFormTemplate existing = templateRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Formulaire introuvable"));

        existing.setTitle(updated.getTitle());
        existing.setDescription(updated.getDescription());
        existing.setQuestions(updated.getQuestions());
        existing.setTargetLevel(updated.getTargetLevel());
        existing.setCommitteeId(updated.getCommitteeId());
        // Modifier un formulaire remet son statut en attente d'approbation
        existing.setStatus("PENDING_VALIDATION");

        return templateRepository.save(existing);
    }

    @Transactional
    public YouthFormTemplate validateTemplate(UUID templateId, boolean approve, UUID presidentUserId) {
        YouthFormTemplate template = templateRepository.findById(templateId)
                .orElseThrow(() -> new RuntimeException("Formulaire introuvable"));

        List<CommitteeRole> roles = roleRepository.findByVolunteerId(presidentUserId);
        boolean hasAccess = false;
        for (CommitteeRole role : roles) {
            if (role.getTitle() == RoleTitle.PRESIDENT) {
                if (role.getCommittee().getType() == CommitteeType.NATIONAL) {
                    hasAccess = true;
                } else if ("ALL".equalsIgnoreCase(template.getCommitteeId()) || role.getCommittee().getId().toString().equals(template.getCommitteeId())) {
                    hasAccess = true;
                } else if (role.getCommittee().getType() == CommitteeType.REGIONAL) {
                    List<Committee> subCommittees = committeeRepository.findByParentCommitteeId(role.getCommittee().getId());
                    if (subCommittees.stream().anyMatch(c -> c.getId().toString().equals(template.getCommitteeId()))) {
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
            throw new org.springframework.security.access.AccessDeniedException("Seul le Président autorisé peut valider ce formulaire.");
        }

        template.setStatus(approve ? "APPROVED" : "REJECTED");
        YouthFormTemplate saved = templateRepository.save(template);

        if (approve) {
            sendTemplateNotifications(saved);
        }

        return saved;
    }

    @Transactional(readOnly = true)
    public List<YouthFormTemplate> getAllTemplates() {
        return templateRepository.findAll();
    }

    @Transactional(readOnly = true)
    public List<YouthFormTemplate> getTemplatesFiltered(UUID userId, UUID committeeId) {
        List<UUID> allowedCommittees = getTargetCommittees(userId, committeeId);
        List<YouthFormTemplate> allTemplates = templateRepository.findAll();
        
        if (allowedCommittees.isEmpty() && committeeId == null) {
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

    @Transactional(readOnly = true)
    public List<Map<String, Object>> getResponsesByTemplateSummary(UUID templateId) {
        List<YouthFormResponse> responses = responseRepository.findByIdFormTemplate(templateId);
        List<Map<String, Object>> summary = new ArrayList<>();
        for (YouthFormResponse r : responses) {
            Map<String, Object> map = new LinkedHashMap<>();
            map.put("id", r.getId());
            map.put("idFormTemplate", r.getIdFormTemplate());
            map.put("idVolunteer", r.getIdVolunteer());
            map.put("responses", r.getResponses());
            map.put("submittedAt", r.getSubmittedAt());
            
            String name = userRepository.findById(r.getIdVolunteer())
                    .map(User::getFullName)
                    .orElse("Volontaire Inconnu");
            map.put("volunteerName", name);
            summary.add(map);
        }
        return summary;
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

        com.nexusaid.core.dto.jeunesse.AiRecommendationResponse aiResponse;
        try {
            aiResponse = aiService.generateRecommendation(aiRequest);
        } catch (Exception e) {
            aiResponse = com.nexusaid.core.dto.jeunesse.AiRecommendationResponse.builder()
                    .recommandations(List.of(
                            com.nexusaid.core.dto.jeunesse.AiRecommendationResponse.AiRecommendationDetail.builder()
                                    .formation("Secourisme de base (PSC1)")
                                    .priorité("Haute")
                                    .competences_developper(List.of("Premiers secours", "RCP"))
                                    .role_possible("Secouriste de terrain")
                                    .build(),
                            com.nexusaid.core.dto.jeunesse.AiRecommendationResponse.AiRecommendationDetail.builder()
                                    .formation("Gestion de crise et Logistique")
                                    .priorité("Moyenne")
                                    .competences_developper(List.of("Logistique", "Coordination"))
                                    .role_possible("Coordonnateur de centre d'accueil")
                                    .build(),
                            com.nexusaid.core.dto.jeunesse.AiRecommendationResponse.AiRecommendationDetail.builder()
                                    .formation("Sensibilisation et animation jeunesse")
                                    .priorité("Basse")
                                    .competences_developper(List.of("Animation", "Pédagogie"))
                                    .role_possible("Animateur jeunesse")
                                    .build()
                    ))
                    .build();
        }

        YouthRecommendation recommendation = new YouthRecommendation();
        recommendation.setFormId(formId);
        recommendation.setGeneratedAt(java.time.LocalDateTime.now());
        recommendation.setStatus("APPROVED");

        if (aiResponse != null && aiResponse.getRecommandations() != null
                && !aiResponse.getRecommandations().isEmpty()) {
            List<String> trainings = new java.util.ArrayList<>();
            List<String> missions = new java.util.ArrayList<>();

            for (com.nexusaid.core.dto.jeunesse.AiRecommendationResponse.AiRecommendationDetail detail : aiResponse
                    .getRecommandations()) {
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

    @Transactional
    public YouthRecommendation simulateFormAndRecommendation() {
        // 1. Find a volunteer in the system (or mock one if none exists)
        List<Volunteer> volunteers = volunteerRepository.findAll();
        Volunteer volunteer;
        if (volunteers.isEmpty()) {
            volunteer = new Volunteer();
            volunteer.setEmail("simulated.volunteer@" + UUID.randomUUID() + ".com");
            volunteer.setFullName("Simulation Volontaire");
            volunteer.setType(UserType.VOLUNTEER);
            volunteer.setAccountStatus(AccountStatus.APPROVED);
            volunteer = volunteerRepository.save(volunteer);
        } else {
            volunteer = volunteers.get(0);
        }

        // 2. Create a mock form
        YouthIntegrationForm form = new YouthIntegrationForm();
        form.setVolunteerId(volunteer.getId());
        form.setAspirations(List.of("Aider les jeunes", "Participer aux campagnes humanitaires"));
        form.setSkills(List.of("Secourisme", "Logistique", "Communication"));
        form.setAptitudes(List.of("Travail d'équipe", "Empathie"));
        form.setInterestAreas(List.of("SANTE", "EDUCATION", "ENVIRONNEMENT"));
        form.setSubmittedAt(java.time.LocalDateTime.now());
        YouthIntegrationForm savedForm = formRepository.save(form);

        // Populate transient name
        savedForm.setVolunteerName(volunteer.getFullName());

        // 3. Generate recommendation
        return autoGenerateRecommendation(savedForm.getId());
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
        return getYouthStatsFiltered(null, null);
    }

    @Transactional(readOnly = true)
    public Map<String, Object> getYouthStatsFiltered(UUID userId, UUID committeeId) {
        List<UUID> allowedCommittees = getTargetCommittees(userId, committeeId);
        
        List<YouthIntegrationForm> forms = formRepository.findAll();
        List<MicroProject> projects = projectRepository.findAll();
        List<YouthRecommendation> recommendations = recommendationRepository.findAll();
        List<YouthFormResponse> responses = responseRepository.findAll();
        List<YouthFormTemplate> templates = templateRepository.findAll();

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

            templates = templates.stream().filter(t -> {
                if ("ALL".equalsIgnoreCase(t.getCommitteeId())) {
                    return true;
                }
                try {
                    UUID cId = UUID.fromString(t.getCommitteeId());
                    return allowedCommittees.contains(cId);
                } catch (Exception e) {
                    return false;
                }
            }).toList();
        }

        Map<String, Object> stats = new HashMap<>();
        stats.put("totalForms", (long) forms.size());
        stats.put("totalResponses", (long) responses.size());
        stats.put("totalProjects", (long) projects.size());
        stats.put("totalRecommendations", (long) recommendations.size());
        stats.put("totalTemplates", (long) templates.size());

        List<Volunteer> volunteersList = volunteerRepository.findAll();
        if (!allowedCommittees.isEmpty()) {
            volunteersList = volunteersList.stream()
                    .filter(v -> v.getCommitteeId() != null && allowedCommittees.contains(v.getCommitteeId()))
                    .toList();
        }
        double globalHours = volunteersList.stream()
                .mapToDouble(v -> v.getHoursVolunteered() != null ? v.getHoursVolunteered() : 0.0)
                .sum();
        stats.put("totalHours", (long) globalHours);

        long totalCertified = 0;
        try {
            if (allowedCommittees.isEmpty()) {
                totalCertified = ((Number) entityManager.createNativeQuery(
                        "SELECT COUNT(DISTINCT volunteer_id) FROM volunteer_certifications"
                ).getSingleResult()).longValue();
            } else {
                totalCertified = ((Number) entityManager.createNativeQuery(
                        "SELECT COUNT(DISTINCT vc.volunteer_id) FROM volunteer_certifications vc " +
                        "JOIN volunteers v ON vc.volunteer_id = v.id " +
                        "WHERE v.committee_id IN :cIds"
                ).setParameter("cIds", allowedCommittees).getSingleResult()).longValue();
            }
        } catch (Exception e) {
            totalCertified = volunteersList.stream()
                    .filter(v -> v.getHoursVolunteered() != null && v.getHoursVolunteered() > 40)
                    .count();
        }
        stats.put("totalCertified", totalCertified);

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

        // --- Seeding Real Dynamic Data ---
        List<Map<String, Object>> engagementList = new ArrayList<>();
        if (allowedCommittees.isEmpty()) {
            List<Committee> regionCommittees = committeeRepository.findAll().stream()
                    .filter(c -> c.getType() == CommitteeType.REGIONAL)
                    .toList();
            for (Committee rc : regionCommittees) {
                List<UUID> subIds = new ArrayList<>();
                subIds.add(rc.getId());
                committeeRepository.findByParentCommitteeId(rc.getId()).forEach(sub -> subIds.add(sub.getId()));

                long volsCount = volunteerRepository.findAll().stream()
                        .filter(v -> v.getCommitteeId() != null && subIds.contains(v.getCommitteeId()))
                        .count();

                long projCount = projectRepository.findAll().stream()
                        .filter(p -> p.getCommitteeId() != null && subIds.contains(p.getCommitteeId()))
                        .count();

                double totalHours = volunteerRepository.findAll().stream()
                        .filter(v -> v.getCommitteeId() != null && subIds.contains(v.getCommitteeId()))
                        .mapToDouble(Volunteer::getHoursVolunteered)
                        .sum();

                Map<String, Object> engMap = new HashMap<>();
                engMap.put("region", rc.getRegion() != null ? rc.getRegion() : rc.getName());
                engMap.put("volontaires", volsCount);
                engMap.put("projets", projCount);
                engMap.put("heures", (long) totalHours);
                engagementList.add(engMap);
            }
        } else {
            List<Committee> localComms = committeeRepository.findAll().stream()
                    .filter(c -> allowedCommittees.contains(c.getId()))
                    .toList();
            for (Committee lc : localComms) {
                long volsCount = volunteerRepository.findAll().stream()
                        .filter(v -> lc.getId().equals(v.getCommitteeId()))
                        .count();

                long projCount = projectRepository.findAll().stream()
                        .filter(p -> lc.getId().equals(p.getCommitteeId()))
                        .count();

                double totalHours = volunteerRepository.findAll().stream()
                        .filter(v -> lc.getId().equals(v.getCommitteeId()))
                        .mapToDouble(Volunteer::getHoursVolunteered)
                        .sum();

                Map<String, Object> engMap = new HashMap<>();
                engMap.put("region", lc.getName());
                engMap.put("volontaires", volsCount);
                engMap.put("projets", projCount);
                engMap.put("heures", (long) totalHours);
                engagementList.add(engMap);
            }
        }
        stats.put("engagement", engagementList);

        Map<String, Long> formTrend = new HashMap<>();
        Map<String, Long> recTrend = new HashMap<>();
        List<String> months = List.of("Janv", "Févr", "Mars", "Avr", "Mai", "Juin", "Juil", "Août", "Sept", "Oct", "Nov", "Déc");
        for (String m : months) {
            formTrend.put(m, 0L);
            recTrend.put(m, 0L);
        }
        for (YouthIntegrationForm f : forms) {
            if (f.getSubmittedAt() != null) {
                int monthVal = f.getSubmittedAt().getMonthValue();
                String mName = getShortMonthName(monthVal);
                formTrend.put(mName, formTrend.get(mName) + 1);
            }
        }
        for (YouthRecommendation r : recommendations) {
            if (r.getDateCreation() != null) {
                int monthVal = r.getDateCreation().getMonthValue();
                String mName = getShortMonthName(monthVal);
                recTrend.put(mName, recTrend.get(mName) + 1);
            }
        }
        List<Map<String, Object>> trendList = new ArrayList<>();
        for (String m : List.of("Janv", "Févr", "Mars", "Avr", "Mai", "Juin")) {
            Map<String, Object> tMap = new HashMap<>();
            tMap.put("month", m);
            tMap.put("inscriptions", formTrend.get(m));
            tMap.put("certifications", recTrend.get(m));
            trendList.add(tMap);
        }
        stats.put("trend", trendList);

        List<Volunteer> topVolunteers = volunteerRepository.findAll().stream()
                .filter(v -> allowedCommittees.isEmpty() || (v.getCommitteeId() != null && allowedCommittees.contains(v.getCommitteeId())))
                .sorted(Comparator.comparing(Volunteer::getHoursVolunteered).reversed())
                .limit(5)
                .toList();
        List<Map<String, Object>> leadersList = new ArrayList<>();
        int rank = 1;
        for (Volunteer v : topVolunteers) {
            String name = userRepository.findById(v.getId()).map(User::getFullName).orElse("Volontaire");
            String committeeName = committeeRepository.findById(v.getCommitteeId()).map(Committee::getName).orElse("Comité");

            Map<String, Object> leader = new HashMap<>();
            leader.put("rank", rank++);
            leader.put("name", name);
            leader.put("region", committeeName);
            leader.put("points", (int) (v.getHoursVolunteered() * 10));
            leader.put("badge", v.getHoursVolunteered() > 100 ? "Formatrice" : v.getHoursVolunteered() > 50 ? "Coordinateur" : "Leader");
            leader.put("avatar", name.isEmpty() ? "V" : name.substring(0, 1).toUpperCase());
            leadersList.add(leader);
        }
        stats.put("leaders", leadersList);

        return stats;
    }

    private String getShortMonthName(int month) {
        return switch (month) {
            case 1 -> "Janv";
            case 2 -> "Févr";
            case 3 -> "Mars";
            case 4 -> "Avr";
            case 5 -> "Mai";
            case 6 -> "Juin";
            case 7 -> "Juil";
            case 8 -> "Août";
            case 9 -> "Sept";
            case 10 -> "Oct";
            case 11 -> "Nov";
            case 12 -> "Déc";
            default -> "Mois";
        };
    }
}
