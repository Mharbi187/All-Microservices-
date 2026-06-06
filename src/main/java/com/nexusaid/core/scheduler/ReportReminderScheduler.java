package com.nexusaid.core.scheduler;

import com.nexusaid.core.entity.domains.catastrophe.DisasterMission;
import com.nexusaid.core.repository.UserRepository;
import com.nexusaid.core.repository.domains.catastrophe.DisasterFieldReportRepository;
import com.nexusaid.core.repository.domains.catastrophe.DisasterMissionRepository;
import com.nexusaid.core.service.EmailService;
import com.nexusaid.core.service.NotificationService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.time.Duration;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;
import java.util.UUID;

@Component
@RequiredArgsConstructor
@Slf4j
public class ReportReminderScheduler {

    private final DisasterMissionRepository missionRepository;
    private final DisasterFieldReportRepository fieldReportRepository;
    private final UserRepository userRepository;
    private final EmailService emailService;
    private final NotificationService notificationService;

    // Run every 15 minutes to check for reminders
    @Scheduled(fixedRate = 900000)
    @Transactional
    public void sendHalfwayReportReminders() {
        log.info("Running sendHalfwayReportReminders job...");

        // Fetch all missions with a template, a deadline, and where a reminder hasn't been sent
        List<DisasterMission> missions = missionRepository.findAll().stream()
                .filter(m -> m.getReportTemplateId() != null)
                .filter(m -> m.getReportDeadline() != null)
                .filter(m -> m.getReportAssignedAt() != null)
                .filter(m -> m.getReportReminderSent() != null && !m.getReportReminderSent())
                .filter(m -> m.getReportDeadline().isAfter(LocalDateTime.now())) // Deadline hasn't passed yet
                .toList();

        for (DisasterMission mission : missions) {
            long totalDurationSeconds = Duration.between(mission.getReportAssignedAt(), mission.getReportDeadline()).getSeconds();
            LocalDateTime halfwayPoint = mission.getReportAssignedAt().plusSeconds(totalDurationSeconds / 2);

            // If we are past the halfway point
            if (LocalDateTime.now().isAfter(halfwayPoint)) {
                log.info("Mission {} has passed halfway point. Checking for submitted reports...", mission.getId());
                boolean reminderSentToSomeone = false;

                if (mission.getAssignedVolunteers() != null) {
                    for (Map<String, Object> vol : mission.getAssignedVolunteers()) {
                        String volIdStr = (String) vol.get("volunteerId");
                        if (volIdStr != null) {
                            UUID volId = UUID.fromString(volIdStr);
                            
                            // Check if this volunteer has already submitted a report for this mission
                            boolean hasSubmitted = fieldReportRepository.findByMissionId(mission.getId()).stream()
                                    .anyMatch(r -> r.getVolunteerId().equals(volId));

                            if (!hasSubmitted) {
                                // Send reminder
                                userRepository.findById(volId).ifPresent(u -> {
                                    String subject = "⚠️ Rappel : Rapport de mission requis";
                                    String msg = "N'oubliez pas de remplir votre rapport pour la mission '" + mission.getTitle() + "' avant le délai imparti.";
                                    String link = "/catastrophes/missions/" + mission.getId();

                                    notificationService.sendNotification(u, "WARNING", subject, msg, link);
                                    emailService.sendReportReminderEmail(u.getEmail(), u.getFullName(), mission, mission.getReportDeadline());
                                });
                                reminderSentToSomeone = true;
                            }
                        }
                    }
                }

                // Mark as sent so we don't spam them every 15 minutes
                mission.setReportReminderSent(true);
                missionRepository.save(mission);
                log.info("Marked mission {} as reportReminderSent.", mission.getId());
            }
        }
        
        log.info("sendHalfwayReportReminders job finished.");
    }
}
