package com.nexusaid.core.messaging;

import com.nexusaid.core.entity.Committee;
import com.nexusaid.core.entity.User;
import com.nexusaid.core.repository.CommitteeRepository;
import com.nexusaid.core.repository.UserRepository;
import com.nexusaid.core.service.EmailService;
import com.nexusaid.core.service.NotificationService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.amqp.rabbit.annotation.RabbitListener;
import org.springframework.stereotype.Component;

import java.util.List;
import java.util.Map;
import java.util.UUID;

@Component
@RequiredArgsConstructor
@Slf4j
public class DonationNotificationConsumer {

    private final NotificationService notificationService;
    private final EmailService emailService;
    private final CommitteeRepository committeeRepository;
    private final UserRepository userRepository;

    @RabbitListener(queues = "nexusaid.donation.need.created")
    public void handleNeedCreated(Map<String, Object> event) {
        log.info("[CORE] Received donation need created event: {}", event);
        try {
            UUID committeeId = UUID.fromString(String.valueOf(event.get("committeeId")));
            String title = String.valueOf(event.get("title"));

            Committee committee = committeeRepository.findById(committeeId).orElse(null);
            if (committee == null) return;

            // Trouver les présidents et VP du comité pour les notifier
            List<User> validators = userRepository.findPresidentsAndVpsByCommittee(committeeId);
            
            for (User validator : validators) {
                // In-app notification
                notificationService.sendNotification(
                        validator,
                        "NOUVEAU_BESOIN",
                        "Nouveau besoin de don à valider",
                        "Le besoin '" + title + "' nécessite votre validation.",
                        "/admin/donations/needs"
                );

                // Email
                emailService.sendDonationNeedCreatedEmail(
                        validator.getEmail(),
                        validator.getFullName(),
                        title,
                        committee.getName()
                );
            }
        } catch (Exception e) {
            log.error("[CORE] Error processing donation need created event", e);
        }
    }

    @RabbitListener(queues = "nexusaid.donation.need.validated")
    public void handleNeedValidated(Map<String, Object> event) {
        log.info("[CORE] Received donation need validated event: {}", event);
        try {
            UUID createdBy = UUID.fromString(String.valueOf(event.get("createdBy")));
            String title = String.valueOf(event.get("title"));

            userRepository.findById(createdBy).ifPresent(creator -> {
                notificationService.sendNotification(
                        creator,
                        "BESOIN_VALIDE",
                        "Besoin de don validé",
                        "Votre besoin '" + title + "' a été validé et publié.",
                        "/admin/donations/needs"
                );

                emailService.sendDonationNeedValidatedEmail(
                        creator.getEmail(),
                        creator.getFullName(),
                        title
                );
            });
        } catch (Exception e) {
            log.error("[CORE] Error processing donation need validated event", e);
        }
    }

    @RabbitListener(queues = "nexusaid.donation.need.rejected")
    public void handleNeedRejected(Map<String, Object> event) {
        log.info("[CORE] Received donation need rejected event: {}", event);
        try {
            UUID createdBy = UUID.fromString(String.valueOf(event.get("createdBy")));
            String title = String.valueOf(event.get("title"));
            String reason = String.valueOf(event.get("reason"));

            userRepository.findById(createdBy).ifPresent(creator -> {
                notificationService.sendNotification(
                        creator,
                        "BESOIN_REJETE",
                        "Besoin de don rejeté",
                        "Votre besoin '" + title + "' a été rejeté. Motif : " + reason,
                        "/admin/donations/needs"
                );

                emailService.sendDonationNeedRejectedEmail(
                        creator.getEmail(),
                        creator.getFullName(),
                        title,
                        reason
                );
            });
        } catch (Exception e) {
            log.error("[CORE] Error processing donation need rejected event", e);
        }
    }

    @RabbitListener(queues = "nexusaid.donation.fiscal.receipt")
    public void handleFiscalReceipt(Map<String, Object> event) {
        log.info("[CORE] Received fiscal receipt event: {}", event);
        try {
            String donorEmail = String.valueOf(event.get("donorEmail"));
            String receiptLink = String.valueOf(event.get("receiptLink"));

            if (donorEmail != null && !donorEmail.isBlank() && !"null".equals(donorEmail)) {
                emailService.sendDonationFiscalReceiptEmail(donorEmail, receiptLink);
            }
        } catch (Exception e) {
            log.error("[CORE] Error processing fiscal receipt event", e);
        }
    }
}
