package com.nexusaid.core.service;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.nexusaid.core.dto.TrainerDto;
import com.nexusaid.core.entity.Committee;
import com.nexusaid.core.entity.Trainer;
import com.nexusaid.core.entity.User;
import com.nexusaid.core.entity.enums.UserType;
import com.nexusaid.core.repository.CommitteeRepository;
import com.nexusaid.core.repository.TrainerRepository;
import com.nexusaid.core.repository.UserRepository;
import jakarta.persistence.EntityManager;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
public class TrainerService {

    private final TrainerRepository trainerRepository;
    private final UserRepository userRepository;
    private final CommitteeRepository committeeRepository;
    private final ProfileService profileService;
    private final EmailService emailService;
    private final NotificationService notificationService;
    private final EntityManager entityManager;

    private static final ObjectMapper MAPPER = new ObjectMapper();

    // ─────────────────────────────────────────────────────────────────────────
    // GET TRAINERS (scoped by hierarchy)
    // ─────────────────────────────────────────────────────────────────────────

    public List<TrainerDto> getTrainers(UUID requestingUserId) {
        List<UUID> visibleCommitteeIds = profileService.getVisibleCommitteeIds(requestingUserId);

        List<Trainer> trainers;
        if (visibleCommitteeIds.isEmpty()) {
            // Admin or national sees all
            User user = userRepository.findById(requestingUserId).orElse(null);
            if (user != null && user.getType() == UserType.ADMIN) {
                trainers = trainerRepository.findAll();
            } else {
                trainers = List.of();
            }
        } else {
            trainers = trainerRepository.findByCommitteeIdIn(visibleCommitteeIds);
        }

        // Build committee name map
        Map<UUID, Committee> committeeMap = committeeRepository.findAll().stream()
                .collect(Collectors.toMap(Committee::getId, c -> c));

        LocalDateTime now = LocalDateTime.now();
        LocalDateTime warnCutoff = now.minusYears(2).plusDays(30); // 2 years - 30 days = warn zone
        LocalDateTime expiredCutoff = now.minusYears(2);           // 2 years = expired

        return trainers.stream().map(t -> {
            List<String> domains = parseDomains(t.getExpertiseDomains());
            boolean hasSecourisme = domains.stream()
                    .anyMatch(d -> d.toLowerCase().contains("secourisme"));

            boolean expiringSoon = false;
            boolean expired = false;
            if (hasSecourisme && t.getPromotedAt() != null) {
                expiringSoon = t.getPromotedAt().isBefore(warnCutoff);
                expired = t.getPromotedAt().isBefore(expiredCutoff);
            }

            Committee c = t.getCommitteeId() != null ? committeeMap.get(t.getCommitteeId()) : null;

            return TrainerDto.builder()
                    .id(t.getId())
                    .fullName(t.getFullName())
                    .email(t.getEmail())
                    .phone(t.getPhone())
                    .matricule(t.getMatricule())
                    .avatar(t.getAvatar())
                    .committeeId(t.getCommitteeId())
                    .committeeName(c != null ? c.getName() : null)
                    .committeeType(c != null ? c.getType().name() : null)
                    .expertiseDomains(domains)
                    .promotedAt(t.getPromotedAt())
                    .secourismeExpiringSoon(expiringSoon && !expired)
                    .secourismeExpired(expired)
                    .build();
        }).collect(Collectors.toList());
    }

    // ─────────────────────────────────────────────────────────────────────────
    // UPDATE TRAINER (modify domains)
    // ─────────────────────────────────────────────────────────────────────────

    @Transactional
    public TrainerDto updateTrainer(UUID trainerId, List<String> newDomains, UUID requestingUserId) {
        Trainer trainer = trainerRepository.findById(trainerId)
                .orElseThrow(() -> new IllegalArgumentException("Formateur introuvable"));

        // Access check (reuse ProfileService hierarchy check)
        if (trainer.getCommitteeId() != null) {
            profileService.verifyManagerAccess(trainer.getCommitteeId(), requestingUserId);
        }

        String domainsJson = toJson(newDomains);

        entityManager.createNativeQuery(
                "UPDATE trainers SET expertise_domains = CAST(:domains AS jsonb) WHERE id = :id")
                .setParameter("domains", domainsJson)
                .setParameter("id", trainerId)
                .executeUpdate();

        entityManager.flush();
        entityManager.clear();

        // Send email + notification
        emailService.sendTrainerUpdateEmail(trainer.getEmail(), trainer.getFullName(), newDomains);

        User trainerUser = userRepository.findById(trainerId).orElse(null);
        if (trainerUser != null) {
            notificationService.sendNotification(
                    trainerUser,
                    "TRAINER_UPDATE",
                    "Domaines d'expertise mis à jour",
                    "Vos domaines de formation ont été modifiés : " + String.join(", ", newDomains),
                    "/volunteers"
            );
        }

        return getTrainers(requestingUserId).stream()
                .filter(dto -> dto.getId().equals(trainerId))
                .findFirst()
                .orElseThrow();
    }

    // ─────────────────────────────────────────────────────────────────────────
    // REMOVE TRAINER (suppress trainer status — remains volunteer)
    // ─────────────────────────────────────────────────────────────────────────

    @Transactional
    public void removeTrainer(UUID trainerId, UUID requestingUserId) {
        Trainer trainer = trainerRepository.findById(trainerId)
                .orElseThrow(() -> new IllegalArgumentException("Formateur introuvable"));

        if (trainer.getCommitteeId() != null) {
            profileService.verifyManagerAccess(trainer.getCommitteeId(), requestingUserId);
        }

        String trainerName = trainer.getFullName();
        String trainerEmail = trainer.getEmail();

        // Delete only the trainers join-table row — volunteer + user rows stay intact
        entityManager.createNativeQuery("DELETE FROM trainers WHERE id = :id")
                .setParameter("id", trainerId)
                .executeUpdate();

        entityManager.flush();
        entityManager.clear();

        // Informational email
        emailService.sendTrainerRemovedEmail(trainerEmail, trainerName);

        // Platform notification — reload user since entity was cleared
        User volunteerUser = userRepository.findById(trainerId).orElse(null);
        if (volunteerUser != null) {
            notificationService.sendNotification(
                    volunteerUser,
                    "TRAINER_REMOVED",
                    "Statut formateur modifié",
                    "Votre statut de formateur a été retiré. Vous restez volontaire actif de votre comité.",
                    "/volunteers"
            );
        }

        log.info("Trainer {} removed by user {}", trainerId, requestingUserId);
    }

    // ─────────────────────────────────────────────────────────────────────────
    // SCHEDULER — Secourisme certification 2-year expiry (runs every day at 8am)
    // ─────────────────────────────────────────────────────────────────────────

    @Scheduled(cron = "0 0 8 * * *")
    public void checkSecourismeExpirations() {
        log.info("[Scheduler] Checking Secourisme certification expirations...");

        LocalDateTime now = LocalDateTime.now();
        LocalDateTime expiredCutoff = now.minusYears(2);
        LocalDateTime warnCutoff = now.minusYears(2).plusDays(30);

        List<Trainer> allTrainers = trainerRepository.findAll();

        int alertCount = 0;
        for (Trainer trainer : allTrainers) {
            List<String> domains = parseDomains(trainer.getExpertiseDomains());
            boolean hasSecourisme = domains.stream()
                    .anyMatch(d -> d.toLowerCase().contains("secourisme"));

            if (!hasSecourisme || trainer.getPromotedAt() == null) continue;

            boolean expired = trainer.getPromotedAt().isBefore(expiredCutoff);
            boolean expiringSoon = !expired && trainer.getPromotedAt().isBefore(warnCutoff);

            if (expired || expiringSoon) {
                log.info("[Scheduler] Sending Secourisme alert to {} (expired={})", trainer.getEmail(), expired);
                emailService.sendSecourismeExpirationAlert(
                        trainer.getEmail(),
                        trainer.getFullName(),
                        trainer.getPromotedAt(),
                        expired
                );

                // Platform notification
                User u = userRepository.findById(trainer.getId()).orElse(null);
                if (u != null) {
                    String title = expired ? "🔴 Certification Secourisme expirée" : "⚠️ Certification Secourisme bientôt expirée";
                    String msg = expired
                            ? "Votre certification Secourisme a expiré. Un recyclage est requis."
                            : "Votre certification Secourisme expire dans moins de 30 jours.";
                    notificationService.sendNotification(u, "SECOURISME_EXPIRY", title, msg, "/volunteers");
                }
                alertCount++;
            }
        }

        log.info("[Scheduler] Secourisme check done. {} alerts sent.", alertCount);
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Helpers
    // ─────────────────────────────────────────────────────────────────────────

    private List<String> parseDomains(String json) {
        if (json == null || json.isBlank()) return new ArrayList<>();
        try {
            return MAPPER.readValue(json, new TypeReference<List<String>>() {});
        } catch (Exception e) {
            return new ArrayList<>();
        }
    }

    private String toJson(List<String> domains) {
        try {
            return MAPPER.writeValueAsString(domains);
        } catch (Exception e) {
            return "[]";
        }
    }
}
