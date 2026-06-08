package com.nexusaid.core.service.domains.catastrophe;

import com.nexusaid.core.entity.Committee;
import com.nexusaid.core.entity.User;
import com.nexusaid.core.entity.Volunteer;
import com.nexusaid.core.entity.domains.catastrophe.DisasterFieldReport;
import com.nexusaid.core.entity.domains.catastrophe.DisasterMission;
import com.nexusaid.core.entity.enums.AccountStatus;
import com.nexusaid.core.repository.CommitteeRepository;
import com.nexusaid.core.repository.VolunteerRepository;
import com.nexusaid.core.repository.UserRepository;
import com.nexusaid.core.repository.domains.catastrophe.DisasterMissionRepository;
import com.nexusaid.core.repository.domains.catastrophe.DisasterFieldReportRepository;
import com.nexusaid.core.repository.domains.catastrophe.DisasterTeamMemberRepository;
import com.nexusaid.core.service.EmailService;
import com.nexusaid.core.service.NotificationService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.*;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
public class CatastropheService {

    private final DisasterMissionRepository missionRepository;
    private final DisasterFieldReportRepository fieldReportRepository;
    private final CommitteeRepository committeeRepository;
    private final VolunteerRepository volunteerRepository;
    private final UserRepository userRepository;
    private final DisasterTeamMemberRepository disasterTeamMemberRepository;
    private final NotificationService notificationService;
    private final EmailService emailService;

    // ─── Missions ────────────────────────────────────────────────────────────

    public List<DisasterMission> getAllMissions() {
        return missionRepository.findAllOrderByCreatedAtDesc();
    }

    public List<DisasterMission> getMissionsByCommittee(UUID committeeId) {
        return missionRepository.findByCommitteeId(committeeId);
    }

    public DisasterMission getMissionById(UUID missionId) {
        return missionRepository.findById(missionId)
                .orElseThrow(() -> new RuntimeException("Mission not found: " + missionId));
    }

    public List<DisasterMission> getMissionsByVolunteer(UUID volunteerId) {
        return missionRepository.findMissionsByVolunteerIdNative(volunteerId, volunteerId.toString());
    }

    @Transactional
    public DisasterMission createMission(UUID committeeId, DisasterMission mission, UUID createdBy) {
        Committee committee = committeeRepository.findById(committeeId)
                .orElseThrow(() -> new RuntimeException("Committee not found: " + committeeId));
        mission.setCommittee(committee);
        mission.setCreatedBy(createdBy);
        mission.setStatus("PLANNED");
        DisasterMission saved = missionRepository.save(mission);
        log.info("Created disaster mission {} for committee {}", saved.getId(), committeeId);
        
        // Notify Team Chief & Assigned Volunteers
        notifyMissionAssignment(saved);
        
        return saved;
    }

    @Transactional
    public DisasterMission updateMission(UUID missionId, DisasterMission updates) {
        DisasterMission existing = getMissionById(missionId);
        if (updates.getTitle() != null) existing.setTitle(updates.getTitle());
        if (updates.getDescription() != null) existing.setDescription(updates.getDescription());
        if (updates.getMissionType() != null) existing.setMissionType(updates.getMissionType());
        if (updates.getStatus() != null) existing.setStatus(updates.getStatus());
        if (updates.getStartDatetime() != null) existing.setStartDatetime(updates.getStartDatetime());
        if (updates.getEndDatetime() != null) existing.setEndDatetime(updates.getEndDatetime());
        if (updates.getLocationGps() != null) existing.setLocationGps(updates.getLocationGps());
        if (updates.getTeamChiefId() != null) existing.setTeamChiefId(updates.getTeamChiefId());
        if (updates.getTeamChiefName() != null) existing.setTeamChiefName(updates.getTeamChiefName());
        if (updates.getAssignedVolunteers() != null) existing.setAssignedVolunteers(updates.getAssignedVolunteers());
        if (updates.getRequiredMaterials() != null) existing.setRequiredMaterials(updates.getRequiredMaterials());
        if (updates.getInstructions() != null) existing.setInstructions(updates.getInstructions());
        if (updates.getReportTemplateId() != null) existing.setReportTemplateId(updates.getReportTemplateId());
        DisasterMission saved = missionRepository.save(existing);
        
        // Re-notify Team Chief & Assigned Volunteers (assume modifications warrant notifications)
        notifyMissionAssignment(saved);
        
        return saved;
    }

    @Transactional
    public DisasterMission updateStatus(UUID missionId, String status) {
        DisasterMission mission = getMissionById(missionId);
        mission.setStatus(status);
        return missionRepository.save(mission);
    }

    @Transactional
    public DisasterMission assignTemplate(UUID missionId, UUID templateId, LocalDateTime deadline) {
        DisasterMission mission = getMissionById(missionId);
        mission.setReportTemplateId(templateId);
        mission.setReportDeadline(deadline);
        mission.setReportAssignedAt(LocalDateTime.now());
        mission.setReportReminderSent(false);
        DisasterMission saved = missionRepository.save(mission);
        
        // Notify volunteers that a report is required using the new HTML template
        String subject = "📝 Rapport requis pour la mission : " + mission.getTitle();
        String link = "/catastrophes/missions/" + mission.getId();
        
        if (mission.getAssignedVolunteers() != null) {
            for (Map<String, Object> vol : mission.getAssignedVolunteers()) {
                String volIdStr = (String) vol.get("volunteerId");
                if (volIdStr != null) {
                    userRepository.findById(UUID.fromString(volIdStr)).ifPresent(u -> {
                        notificationService.sendNotification(u, "INFO", subject, "Un modèle de rapport a été assigné à votre mission. Veuillez le remplir avant la date limite.", link);
                        emailService.sendReportAssignmentEmail(u.getEmail(), u.getFullName(), mission, deadline);
                    });
                }
            }
        }
        
        return saved;
    }

    public void notifyVolunteers(UUID missionId, boolean sendEmail) {
        DisasterMission mission = getMissionById(missionId);
        notifyMissionAssignment(mission);
    }

    private void notifyMissionAssignment(DisasterMission mission) {
        String subject = "🔔 Assignation de Mission : " + mission.getTitle();
        String link = "/catastrophes/missions/" + mission.getId();

        // 1. Notify Team Chief
        if (mission.getTeamChiefId() != null) {
            userRepository.findById(mission.getTeamChiefId()).ifPresent(chief -> {
                notificationService.sendNotification(chief, "MISSION", subject, "Vous avez été assigné(e) comme Chef d'équipe.", link);
                emailService.sendMissionAssignmentEmail(chief.getEmail(), chief.getFullName(), mission);
            });
        }

        // 2. Notify Volunteers
        if (mission.getAssignedVolunteers() != null) {
            for (Map<String, Object> vol : mission.getAssignedVolunteers()) {
                String volIdStr = (String) vol.get("volunteerId");
                if (volIdStr != null) {
                    try {
                        UUID volId = UUID.fromString(volIdStr);
                        // Skip if it's the team chief (already notified)
                        if (mission.getTeamChiefId() != null && mission.getTeamChiefId().equals(volId)) continue;
                        
                        userRepository.findById(volId).ifPresent(user -> {
                            notificationService.sendNotification(user, "MISSION", subject, "Vous avez été assigné(e) à une nouvelle mission.", link);
                            emailService.sendMissionAssignmentEmail(user.getEmail(), user.getFullName(), mission);
                        });
                    } catch (Exception e) {
                        log.warn("Invalid volunteer ID in mission assignment: {}", volIdStr);
                    }
                }
            }
        }
    }

    // ─── Team Members (NDRT / RDRT) ───────────────────────────────────────────

    public List<Map<String, Object>> getTeamMembers(UUID committeeId) {
        // Return existing disaster team members joined with volunteer info
        List<com.nexusaid.core.entity.domains.catastrophe.DisasterTeamMember> members = disasterTeamMemberRepository.findAll();
        List<Map<String, Object>> result = new ArrayList<>();
        
        for (com.nexusaid.core.entity.domains.catastrophe.DisasterTeamMember m : members) {
            volunteerRepository.findById(m.getVolunteerId()).ifPresent(v -> {
                // NDRT/RDRT are mobile units, we allow them to be visible for mission assignments
                // even outside their base committee, or you can restrict RDRT to regional later.
                // For now, allow all active NDRT/RDRT to be searched.
                
                Map<String, Object> entry = new LinkedHashMap<>();
                entry.put("id", m.getId().toString()); // the DisasterTeamMember id
                entry.put("volunteerId", v.getId().toString());
                entry.put("fullName", v.getFullName());
                entry.put("email", v.getEmail());
                entry.put("matricule", v.getMatricule());
                entry.put("phone", v.getPhone());
                entry.put("teamType", m.getTeamType());
                entry.put("specialty", m.getSpecialty());
                entry.put("status", m.getStatus()); // ACTIVE / SUSPENDED
                entry.put("committeeType", v.getCommitteeId() != null ? committeeRepository.findById(v.getCommitteeId()).map(c -> c.getType().name()).orElse(null) : null);
                
                if (v.getCommitteeId() != null) {
                    committeeRepository.findById(v.getCommitteeId()).ifPresent(c -> {
                        entry.put("committeeName", c.getName());
                    });
                }
                result.add(entry);
            });
        }
        return result;
    }

    public List<Map<String, Object>> getAvailableVolunteers(UUID committeeId) {
        List<Volunteer> volunteers;
        if (committeeId != null) {
            volunteers = volunteerRepository.findByCommitteeIdAndAccountStatus(committeeId, com.nexusaid.core.entity.enums.AccountStatus.APPROVED);
        } else {
            volunteers = volunteerRepository.findAll().stream()
                    .filter(v -> v.getAccountStatus() == com.nexusaid.core.entity.enums.AccountStatus.APPROVED)
                    .collect(Collectors.toList());
        }

        return volunteers.stream().map(v -> {
            Map<String, Object> entry = new LinkedHashMap<>();
            entry.put("volunteerId", v.getId().toString());
            entry.put("fullName", v.getFullName());
            entry.put("email", v.getEmail());
            entry.put("matricule", v.getMatricule());
            entry.put("phone", v.getPhone());
            if (v.getCommitteeId() != null) {
                committeeRepository.findById(v.getCommitteeId()).ifPresent(c -> {
                    entry.put("committeeName", c.getName());
                    entry.put("committeeType", c.getType().name());
                });
            }
            return entry;
        }).collect(Collectors.toList());
    }

    @Transactional
    public com.nexusaid.core.entity.domains.catastrophe.DisasterTeamMember addTeamMember(UUID volunteerId, String teamType, String specialty) {
        // Check if already exists
        if (disasterTeamMemberRepository.findByVolunteerId(volunteerId).isPresent()) {
            throw new RuntimeException("Volunteer is already a member of a disaster response team.");
        }
        
        com.nexusaid.core.entity.domains.catastrophe.DisasterTeamMember member = com.nexusaid.core.entity.domains.catastrophe.DisasterTeamMember.builder()
                .volunteerId(volunteerId)
                .teamType(teamType)
                .specialty(specialty)
                .status("ACTIVE")
                .joinedAt(LocalDateTime.now())
                .build();
                
        com.nexusaid.core.entity.domains.catastrophe.DisasterTeamMember saved = disasterTeamMemberRepository.save(member);
        
        // Notify the user
        userRepository.findById(volunteerId).ifPresent(u -> {
            String subject = "Bienvenue dans l'équipe " + teamType;
            String msg = "Vous avez été ajouté à l'équipe d'intervention " + teamType + " en tant que " + specialty;
            notificationService.sendNotification(u, "INFO", subject, msg, "/catastrophes");
            emailService.sendDisasterTeamMemberAddedEmail(u.getEmail(), u.getFullName(), teamType, specialty);
        });
        
        return saved;
    }

    @Transactional
    public com.nexusaid.core.entity.domains.catastrophe.DisasterTeamMember updateTeamMemberStatus(UUID id, String status) {
        com.nexusaid.core.entity.domains.catastrophe.DisasterTeamMember member = disasterTeamMemberRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Member not found"));
        member.setStatus(status);
        
        userRepository.findById(member.getVolunteerId()).ifPresent(u -> {
            String subject = "Mise à jour de votre statut " + member.getTeamType();
            String msg = "Votre statut dans l'équipe " + member.getTeamType() + " est désormais : " + status;
            notificationService.sendNotification(u, "WARNING", subject, msg, "/catastrophes");
            emailService.sendDisasterTeamMemberStatusUpdateEmail(u.getEmail(), u.getFullName(), member.getTeamType(), status);
        });
        
        return disasterTeamMemberRepository.save(member);
    }

    @Transactional
    public void deleteTeamMember(UUID id) {
        com.nexusaid.core.entity.domains.catastrophe.DisasterTeamMember member = disasterTeamMemberRepository.findById(id).orElse(null);
        if (member != null) {
            disasterTeamMemberRepository.delete(member);
            userRepository.findById(member.getVolunteerId()).ifPresent(u -> {
                String subject = "Retrait de l'équipe " + member.getTeamType();
                String msg = "Vous avez été retiré de l'équipe " + member.getTeamType();
                notificationService.sendNotification(u, "WARNING", subject, msg, "/catastrophes");
                emailService.sendDisasterTeamMemberRemovedEmail(u.getEmail(), u.getFullName(), member.getTeamType());
            });
        }
    }
    
    // ─── Field Reports ────────────────────────────────────────────────────────

    public List<DisasterFieldReport> getFieldReportsByMission(UUID missionId) {
        return fieldReportRepository.findByMissionId(missionId);
    }

    public List<DisasterFieldReport> getFieldReportsByVolunteer(UUID volunteerId) {
        return fieldReportRepository.findByVolunteerId(volunteerId);
    }

    public DisasterFieldReport getFieldReportById(UUID reportId) {
        return fieldReportRepository.findById(reportId)
                .orElseThrow(() -> new RuntimeException("Field report not found: " + reportId));
    }

    @Transactional
    public DisasterFieldReport submitFieldReport(UUID missionId, DisasterFieldReport report, UUID volunteerId) {
        DisasterMission mission = getMissionById(missionId);
        report.setMission(mission);
        report.setVolunteerId(volunteerId);
        report.setStatus("SUBMITTED");
        report.setSubmittedAt(LocalDateTime.now());
        DisasterFieldReport saved = fieldReportRepository.save(report);

        // Notify Team Chief
        if (mission.getTeamChiefId() != null) {
            userRepository.findById(mission.getTeamChiefId()).ifPresent(chief -> {
                String volunteerName = userRepository.findById(volunteerId).map(User::getFullName).orElse("Un volontaire");
                String subject = "📝 Nouveau rapport soumis : " + mission.getTitle();
                String msg = volunteerName + " a soumis un rapport pour la mission. Veuillez le valider.";
                String link = "/catastrophes/missions/" + mission.getId();
                notificationService.sendNotification(chief, "INFO", subject, msg, link);
            });
        }

        return saved;
    }

    @Transactional
    public DisasterFieldReport validateFieldReport(UUID reportId, String notes) {
        DisasterFieldReport report = getFieldReportById(reportId);
        report.setStatus("VALIDATED");
        report.setValidatorNotes(notes);
        DisasterFieldReport saved = fieldReportRepository.save(report);

        // Notify Volunteer
        if (report.getVolunteerId() != null) {
            userRepository.findById(report.getVolunteerId()).ifPresent(vol -> {
                String subject = "✅ Rapport validé : " + (report.getMission() != null ? report.getMission().getTitle() : "Mission");
                String msg = "Votre rapport a été validé par le superviseur.";
                String link = report.getMission() != null ? "/catastrophes/missions/" + report.getMission().getId() : "/catastrophes";
                notificationService.sendNotification(vol, "SUCCESS", subject, msg, link);
            });
        }

        return saved;
    }
}
