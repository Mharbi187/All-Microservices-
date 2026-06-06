package com.nexusaid.core.service;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.mail.javamail.MimeMessageHelper;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;
import jakarta.mail.internet.MimeMessage;

import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.List;

@Service
@RequiredArgsConstructor
@Slf4j
public class EmailService {

    private final JavaMailSender mailSender;

    private static final String FROM = "Nexus-AID CRT <c6287943@gmail.com>";
    private static final DateTimeFormatter DATE_FMT = DateTimeFormatter.ofPattern("dd/MM/yyyy");

    @Async
    public void sendEmail(String to, String subject, String body) {
        try {
            SimpleMailMessage message = new SimpleMailMessage();
            message.setFrom(FROM);
            message.setTo(to);
            message.setSubject(subject);
            message.setText(body);
            mailSender.send(message);
            log.info("Email sent successfully to {}", to);
        } catch (Exception e) {
            log.error("Failed to send email to {}", to, e);
        }
    }

    @Async
    public void sendHtmlEmail(String to, String subject, String htmlContent) {
        try {
            MimeMessage mimeMessage = mailSender.createMimeMessage();
            MimeMessageHelper helper = new MimeMessageHelper(mimeMessage, true, "UTF-8");
            helper.setFrom(FROM);
            helper.setTo(to);
            helper.setSubject(subject);
            helper.setText(htmlContent, true);
            mailSender.send(mimeMessage);
            log.info("HTML Email sent successfully to {}", to);
        } catch (Exception e) {
            log.error("Failed to send HTML email to {}", to, e);
        }
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Trainer email templates
    // ─────────────────────────────────────────────────────────────────────────

    @Async
    public void sendTrainerPromotionEmail(String to, String name, List<String> domains) {
        String domainsHtml = domains.stream()
                .map(d -> "<span style='background:#e01c2e;color:#fff;padding:3px 10px;border-radius:12px;" +
                          "font-size:13px;margin:2px;display:inline-block'>" + d + "</span>")
                .reduce("", (a, b) -> a + b);

        String html = "<div style='font-family:Inter,Arial,sans-serif;max-width:600px;margin:0 auto;" +
            "background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,.08)'>" +
            "<div style='background:linear-gradient(135deg,#e01c2e,#c0152a);padding:32px;text-align:center'>" +
            "<h1 style='color:#fff;margin:0;font-size:24px'>&#127891; Félicitations !</h1>" +
            "<p style='color:rgba(255,255,255,.85);margin:8px 0 0'>Croissant-Rouge Tunisien — Nexus-AID</p>" +
            "</div><div style='padding:32px'>" +
            "<p style='color:#333;font-size:16px'>Cher(e) <strong>" + name + "</strong>,</p>" +
            "<p style='color:#555;line-height:1.7'>Nous avons le plaisir de vous informer que vous avez été " +
            "<strong style='color:#e01c2e'>promu(e) Formateur</strong> au sein du Croissant-Rouge Tunisien.</p>" +
            "<div style='background:#fef2f2;border-left:4px solid #e01c2e;padding:16px;border-radius:8px;margin:20px 0'>" +
            "<p style='margin:0 0 8px;color:#333;font-weight:600'>Vos domaines d'expertise :</p>" +
            "<div>" + domainsHtml + "</div></div>" +
            "<p style='color:#555;line-height:1.7'>En tant que formateur, vous contribuerez à la formation " +
            "et au développement des compétences des volontaires. Nous comptons sur votre expertise.</p>" +
            "<p style='color:#888;font-size:13px;margin-top:24px'>Envoyé automatiquement par Nexus-AID.</p>" +
            "</div><div style='background:#f8f8f8;padding:16px;text-align:center'>" +
            "<p style='color:#aaa;font-size:12px;margin:0'>© Croissant-Rouge Tunisien — Nexus-AID</p></div></div>";

        sendHtmlEmail(to, "&#127891; Félicitations — Vous êtes maintenant Formateur CRT", html);
    }

    @Async
    public void sendTrainerUpdateEmail(String to, String name, List<String> newDomains) {
        String domainsHtml = newDomains.stream()
                .map(d -> "<span style='background:#0284C7;color:#fff;padding:3px 10px;border-radius:12px;" +
                          "font-size:13px;margin:2px;display:inline-block'>" + d + "</span>")
                .reduce("", (a, b) -> a + b);

        String html = "<div style='font-family:Inter,Arial,sans-serif;max-width:600px;margin:0 auto;" +
            "background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,.08)'>" +
            "<div style='background:linear-gradient(135deg,#0284C7,#0369A1);padding:32px;text-align:center'>" +
            "<h1 style='color:#fff;margin:0;font-size:22px'>&#128221; Mise à jour de votre profil Formateur</h1>" +
            "<p style='color:rgba(255,255,255,.85);margin:8px 0 0'>Croissant-Rouge Tunisien — Nexus-AID</p>" +
            "</div><div style='padding:32px'>" +
            "<p style='color:#333;font-size:16px'>Cher(e) <strong>" + name + "</strong>,</p>" +
            "<p style='color:#555;line-height:1.7'>Vos domaines d'expertise en tant que formateur ont été mis à jour :</p>" +
            "<div style='background:#eff6ff;border-left:4px solid #0284C7;padding:16px;border-radius:8px;margin:20px 0'>" +
            "<p style='margin:0 0 8px;color:#333;font-weight:600'>Nouveaux domaines :</p>" +
            "<div>" + domainsHtml + "</div></div>" +
            "<p style='color:#888;font-size:13px;margin-top:24px'>Si cette modification est incorrecte, contactez votre responsable.</p>" +
            "</div><div style='background:#f8f8f8;padding:16px;text-align:center'>" +
            "<p style='color:#aaa;font-size:12px;margin:0'>© Croissant-Rouge Tunisien — Nexus-AID</p></div></div>";

        sendHtmlEmail(to, "&#128221; Mise à jour de vos domaines d'expertise Formateur", html);
    }

    @Async
    public void sendTrainerRemovedEmail(String to, String name) {
        String html = "<div style='font-family:Inter,Arial,sans-serif;max-width:600px;margin:0 auto;" +
            "background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,.08)'>" +
            "<div style='background:linear-gradient(135deg,#6b7280,#4b5563);padding:32px;text-align:center'>" +
            "<h1 style='color:#fff;margin:0;font-size:22px'>&#8505;&#65039; Information — Statut Formateur</h1>" +
            "<p style='color:rgba(255,255,255,.85);margin:8px 0 0'>Croissant-Rouge Tunisien — Nexus-AID</p>" +
            "</div><div style='padding:32px'>" +
            "<p style='color:#333;font-size:16px'>Cher(e) <strong>" + name + "</strong>,</p>" +
            "<p style='color:#555;line-height:1.7'>Nous vous informons que votre statut de <strong>formateur</strong> " +
            "au sein du Croissant-Rouge Tunisien a été modifié.</p>" +
            "<div style='background:#f3f4f6;border-left:4px solid #6b7280;padding:16px;border-radius:8px;margin:20px 0'>" +
            "<p style='margin:0;color:#333'>Vous restez bien membre actif et volontaire de votre comité.</p></div>" +
            "<p style='color:#555;line-height:1.7'>Pour plus d'informations, contactez votre responsable ou président de comité.</p>" +
            "<p style='color:#888;font-size:13px;margin-top:24px'>Envoyé automatiquement par Nexus-AID.</p>" +
            "</div><div style='background:#f8f8f8;padding:16px;text-align:center'>" +
            "<p style='color:#aaa;font-size:12px;margin:0'>© Croissant-Rouge Tunisien — Nexus-AID</p></div></div>";

        sendHtmlEmail(to, "&#8505; Information — Modification de votre statut Formateur", html);
    }

    @Async
    public void sendSecourismeExpirationAlert(String to, String name, LocalDateTime promotedAt, boolean expired) {
        String dateStr = promotedAt != null ? promotedAt.format(DATE_FMT) : "—";
        String expiryDate = promotedAt != null ? promotedAt.plusYears(2).format(DATE_FMT) : "—";
        String urgencyColor = expired ? "#e01c2e" : "#D97706";
        String urgencyBg = expired ? "#fef2f2" : "#fffbeb";
        String urgencyTitle = expired ? "&#128308; CERTIFICATION EXPIRÉE" : "&#9888;&#65039; Expiration dans moins de 30 jours";
        String urgencyMsg = expired
            ? "Votre certification Secourisme a expiré. Un recyclage est obligatoire pour continuer à exercer."
            : "Votre certification Secourisme arrive à expiration. Inscrivez-vous à un stage de recyclage.";

        String html = "<div style='font-family:Inter,Arial,sans-serif;max-width:600px;margin:0 auto;" +
            "background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,.08)'>" +
            "<div style='background:linear-gradient(135deg," + urgencyColor + ",#b45309);padding:32px;text-align:center'>" +
            "<h1 style='color:#fff;margin:0;font-size:22px'>" + urgencyTitle + "</h1>" +
            "<p style='color:rgba(255,255,255,.85);margin:8px 0 0'>Certification Secourisme — CRT Nexus-AID</p>" +
            "</div><div style='padding:32px'>" +
            "<p style='color:#333;font-size:16px'>Cher(e) Formateur(trice) <strong>" + name + "</strong>,</p>" +
            "<div style='background:" + urgencyBg + ";border-left:4px solid " + urgencyColor + ";padding:16px;border-radius:8px;margin:20px 0'>" +
            "<p style='margin:0;color:#333;font-weight:600'>" + urgencyMsg + "</p></div>" +
            "<table style='width:100%;border-collapse:collapse;margin:16px 0'>" +
            "<tr style='background:#f9fafb'><td style='padding:10px;border:1px solid #e5e7eb;color:#666'>Date de promotion</td>" +
            "<td style='padding:10px;border:1px solid #e5e7eb;font-weight:600'>" + dateStr + "</td></tr>" +
            "<tr><td style='padding:10px;border:1px solid #e5e7eb;color:#666'>Date d'expiration</td>" +
            "<td style='padding:10px;border:1px solid #e5e7eb;font-weight:600;color:" + urgencyColor + "'>" + expiryDate + "</td></tr>" +
            "</table>" +
            "<p style='color:#555;line-height:1.7'>Contactez votre responsable ou connectez-vous sur Nexus-AID pour planifier le recyclage.</p>" +
            "</div><div style='background:#f8f8f8;padding:16px;text-align:center'>" +
            "<p style='color:#aaa;font-size:12px;margin:0'>© Croissant-Rouge Tunisien — Nexus-AID</p></div></div>";

        String subject = expired
            ? "&#128308; Certification Secourisme EXPIRÉE — Recyclage requis"
            : "&#9888; Votre certification Secourisme expire bientôt";

        sendHtmlEmail(to, subject, html);
    }

    @Async
    public void sendComplaintViewedEmail(String to, String name, String subject, String viewerName) {
        String html = "<div style='font-family:Inter,Arial,sans-serif;max-width:600px;margin:0 auto;" +
            "background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,.08)'>" +
            "<div style='background:linear-gradient(135deg,#e01c2e,#c0152a);padding:32px;text-align:center'>" +
            "<div style='margin-bottom:12px'>" +
            "<svg viewBox=\"0 0 1024 1024\" width=\"48\" height=\"48\" fill=\"#ffffff\" style=\"display:inline-block;vertical-align:middle;\">" +
            "<path d=\"M942.2 486.2C847.9 336.5 694 250 512 250S176.1 336.5 81.8 486.2a80.3 80.3 0 0 0 0 51.6C176.1 687.5 330 774 512 774s335.9-86.5 430.2-236.3a80.3 80.3 0 0 0 0-51.5zM512 682c-93.9 0-170-76.1-170-170s76.1-170 170-170 170 76.1 170 170-76.1 170-170 170zm0-272c-56.3 0-102 45.7-102 102s45.7 102 102 102 102-45.7 102-102-45.7-102-102-102z\"/>" +
            "</svg></div>" +
            "<h1 style='color:#fff;margin:0;font-size:22px'>Réclamation consultée</h1>" +
            "<p style='color:rgba(255,255,255,.85);margin:8px 0 0'>Croissant-Rouge Tunisien — Nexus-AID</p>" +
            "</div><div style='padding:32px'>" +
            "<p style='color:#333;font-size:16px'>Cher(e) <strong>" + name + "</strong>,</p>" +
            "<p style='color:#555;line-height:1.7'>Nous vous informons que votre réclamation concernant le sujet <strong>\"" + subject + "\"</strong> " +
            "a été consultée et est maintenant en cours d'examen par " + viewerName + ".</p>" +
            "<div style='text-align:center;margin:30px 0'>" +
            "<a href='http://localhost:5173/volunteer/complaints' style='background:#e01c2e;color:#fff;padding:12px 24px;" +
            "text-decoration:none;border-radius:8px;font-weight:600;display:inline-block;box-shadow:0 4px 12px rgba(224,28,46,0.2)'>Voir ma réclamation</a>" +
            "</div>" +
            "<p style='color:#888;font-size:13px;margin-top:24px'>Envoyé automatiquement par Nexus-AID.</p>" +
            "</div><div style='background:#f8f8f8;padding:16px;text-align:center'>" +
            "<p style='color:#aaa;font-size:12px;margin:0'>© Croissant-Rouge Tunisien — Nexus-AID</p></div></div>";

        sendHtmlEmail(to, "[Nexus-AID] Votre réclamation est en cours de traitement", html);
    }

    @Async
    public void sendComplaintStatusChangedEmail(String to, String name, String subject, String oldStatus, String newStatus) {
        String html = "<div style='font-family:Inter,Arial,sans-serif;max-width:600px;margin:0 auto;" +
            "background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,.08)'>" +
            "<div style='background:linear-gradient(135deg,#e01c2e,#c0152a);padding:32px;text-align:center'>" +
            "<div style='margin-bottom:12px'>" +
            "<svg viewBox=\"0 0 1024 1024\" width=\"48\" height=\"48\" fill=\"#ffffff\" style=\"display:inline-block;vertical-align:middle;\">" +
            "<path d=\"M512 64C264.6 64 64 264.6 64 512s200.6 448 448 448 448-200.6 448-448S759.4 64 512 64zm0 820c-205.4 0-372-166.6-372-372s166.6-372 372-372 372 166.6 372 372-166.6 372-372 372zM512 224c-159.1 0-288 128.9-288 288s128.9 288 288 288v-96l128 128-128 128v-96c-212.1 0-384-171.9-384-384s171.9-384 384-384 384 171.9 384 384h-96c0-159.1-128.9-288-288-288z\"/>" +
            "</svg></div>" +
            "<h1 style='color:#fff;margin:0;font-size:22px'>Statut mis à jour</h1>" +
            "<p style='color:rgba(255,255,255,.85);margin:8px 0 0'>Croissant-Rouge Tunisien — Nexus-AID</p>" +
            "</div><div style='padding:32px'>" +
            "<p style='color:#333;font-size:16px'>Cher(e) <strong>" + name + "</strong>,</p>" +
            "<p style='color:#555;line-height:1.7'>Le statut de votre réclamation concernant <strong>\"" + subject + "\"</strong> a été mis à jour.</p>" +
            "<div style='background:#f9fafb;border:1px solid #e5e7eb;border-radius:8px;padding:16px;margin:20px 0'>" +
            "<table style='width:100%;border-collapse:collapse'>" +
            "<tr><td style='color:#666;padding:6px 0;width:40%'>Ancien statut</td><td style='font-weight:600;color:#666'>" + oldStatus + "</td></tr>" +
            "<tr><td style='color:#666;padding:6px 0'>Nouveau statut</td><td style='font-weight:600;color:#e01c2e'>" + newStatus + "</td></tr>" +
            "</table>" +
            "</div>" +
            "<div style='text-align:center;margin:30px 0'>" +
            "<a href='http://localhost:5173/volunteer/complaints' style='background:#e01c2e;color:#fff;padding:12px 24px;" +
            "text-decoration:none;border-radius:8px;font-weight:600;display:inline-block;box-shadow:0 4px 12px rgba(224,28,46,0.2)'>Voir les détails</a>" +
            "</div>" +
            "<p style='color:#888;font-size:13px;margin-top:24px'>Envoyé automatiquement par Nexus-AID.</p>" +
            "</div><div style='background:#f8f8f8;padding:16px;text-align:center'>" +
            "<p style='color:#aaa;font-size:12px;margin:0'>© Croissant-Rouge Tunisien — Nexus-AID</p></div></div>";

        sendHtmlEmail(to, "[Nexus-AID] Statut de votre réclamation mis à jour", html);
    }

    @Async
    public void sendComplaintResponseEmail(String to, String name, String subject, String responderName, String responseMessage) {
        String html = "<div style='font-family:Inter,Arial,sans-serif;max-width:600px;margin:0 auto;" +
            "background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,.08)'>" +
            "<div style='background:linear-gradient(135deg,#e01c2e,#c0152a);padding:32px;text-align:center'>" +
            "<div style='margin-bottom:12px'>" +
            "<svg viewBox=\"0 0 1024 1024\" width=\"48\" height=\"48\" fill=\"#ffffff\" style=\"display:inline-block;vertical-align:middle;\">" +
            "<path d=\"M512 64C264.6 64 64 222.5 64 418c0 109.3 62 206.5 158.4 270L160 896l221.7-110.9c41.3 11 84.9 16.9 130.3 16.9 247.4 0 448-158.5 448-354S759.4 64 512 64zm0 638c-38.3 0-75.1-4.8-110.1-13.9l-12.2-3.2-83.9 42 23.3-88.7-6.2-9.6C232.2 559.8 192 492.3 192 418c0-154.6 143.6-280 320-280s320 125.4 320 280-143.6 280-320 280z\"/>" +
            "</svg></div>" +
            "<h1 style='color:#fff;margin:0;font-size:22px'>Nouvelle réponse reçue</h1>" +
            "<p style='color:rgba(255,255,255,.85);margin:8px 0 0'>Croissant-Rouge Tunisien — Nexus-AID</p>" +
            "</div><div style='padding:32px'>" +
            "<p style='color:#333;font-size:16px'>Cher(e) <strong>" + name + "</strong>,</p>" +
            "<p style='color:#555;line-height:1.7'>Une nouvelle réponse a été ajoutée à votre réclamation <strong>\"" + subject + "\"</strong> par <strong>" + responderName + "</strong> :</p>" +
            "<div style='background:#f9fafb;border-left:4px solid #e01c2e;padding:16px;border-radius:8px;margin:20px 0;font-style:italic;color:#333'>" +
            "\"" + responseMessage + "\"" +
            "</div>" +
            "<div style='text-align:center;margin:30px 0'>" +
            "<a href='http://localhost:5173/volunteer/complaints' style='background:#e01c2e;color:#fff;padding:12px 24px;" +
            "text-decoration:none;border-radius:8px;font-weight:600;display:inline-block;box-shadow:0 4px 12px rgba(224,28,46,0.2)'>Répondre ou voir la discussion</a>" +
            "</div>" +
            "<p style='color:#888;font-size:13px;margin-top:24px'>Envoyé automatiquement par Nexus-AID.</p>" +
            "</div><div style='background:#f8f8f8;padding:16px;text-align:center'>" +
            "<p style='color:#aaa;font-size:12px;margin:0'>© Croissant-Rouge Tunisien — Nexus-AID</p></div></div>";

        sendHtmlEmail(to, "[Nexus-AID] Nouvelle réponse à votre réclamation", html);
    }

    @Async
    public void sendRcpEvaluationThankYouEmail(String to, String participantName, String trainerName, String decision, java.math.BigDecimal scoreIa, java.math.BigDecimal scoreTrainer) {
        String decisionText = "—";
        String decisionBg = "#f3f4f6";
        String decisionColor = "#4b5563";
        
        if ("PRET".equals(decision)) {
            decisionText = "Prêt pour la certification";
            decisionBg = "#ecfdf5";
            decisionColor = "#10b981";
        } else if ("AMELIORATIONS_MINEURES".equals(decision)) {
            decisionText = "Améliorations mineures requises";
            decisionBg = "#fffbeb";
            decisionColor = "#f59e0b";
        } else if ("AMELIORATIONS_MAJEURES".equals(decision)) {
            decisionText = "Améliorations majeures requises";
            decisionBg = "#fff7ed";
            decisionColor = "#f97316";
        } else if ("NON_RECOMMANDE".equals(decision)) {
            decisionText = "Non recommandé actuellement";
            decisionBg = "#fef2f2";
            decisionColor = "#ef4444";
        }

        String html = "<div style='font-family:Inter,Arial,sans-serif;max-width:600px;margin:0 auto;" +
            "background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,.08)'>" +
            "<div style='background:linear-gradient(135deg,#e01c2e,#c0152a);padding:32px;text-align:center'>" +
            "<div style='margin-bottom:12px'>" +
            "<svg viewBox=\"0 0 1024 1024\" width=\"48\" height=\"48\" fill=\"#ffffff\" style=\"display:inline-block;vertical-align:middle;\">" +
            "<path d=\"M512 64C264.6 64 64 264.6 64 512s200.6 448 448 448 448-200.6 448-448S759.4 64 512 64zm0 820c-205.4 0-372-166.6-372-372s166.6-372 372-372 372 166.6 372 372-166.6 372-372 372zM512 224c-159.1 0-288 128.9-288 288s128.9 288 288 288v-96l128 128-128 128v-96c-212.1 0-384-171.9-384-384s171.9-384 384-384 384 171.9 384 384h-96c0-159.1-128.9-288-288-288z\"/>" +
            "</svg></div>" +
            "<h1 style='color:#fff;margin:0;font-size:22px'>Confirmation d'Évaluation RCP</h1>" +
            "<p style='color:rgba(255,255,255,.85);margin:8px 0 0'>Croissant-Rouge Tunisien — Nexus-AID</p>" +
            "</div><div style='padding:32px'>" +
            "<p style='color:#333;font-size:16px'>Cher(e) <strong>" + participantName + "</strong>,</p>" +
            "<p style='color:#555;line-height:1.7'>Nous vous confirmons qu'une évaluation de réanimation cardio-pulmonaire (RCP) assistée par l'intelligence artificielle a été réalisée par le formateur <strong>" + trainerName + "</strong>.</p>" +
            "<p style='color:#555;line-height:1.7'>Nous tenons à vous remercier chaleureusement pour votre participation et votre contribution active à cette session de formation secourisme.</p>" +
            "<div style='background:#f9fafb;border:1px solid #e5e7eb;border-radius:8px;padding:16px;margin:20px 0'>" +
            "<table style='width:100%;border-collapse:collapse'>" +
            "<tr><td style='color:#666;padding:6px 0;width:50%'>Score Assistant IA</td><td style='font-weight:600;color:#333'>" + (scoreIa != null ? scoreIa : "—") + " / 10</td></tr>" +
            "<tr><td style='color:#666;padding:6px 0'>Note Formateur</td><td style='font-weight:600;color:#333'>" + (scoreTrainer != null ? scoreTrainer : "—") + " / 10</td></tr>" +
            "<tr><td style='color:#666;padding:6px 0'>Décision Formateur</td><td style='padding:6px 0'><span style='background:" + decisionBg + ";color:" + decisionColor + ";padding:3px 10px;border-radius:12px;font-size:12px;font-weight:600'>" + decisionText + "</span></td></tr>" +
            "</table>" +
            "</div>" +
            "<p style='color:#555;line-height:1.7'>Votre évaluation complète, incluant les recommandations personnalisées de recyclage, a été enregistrée dans le système Nexus-AID de votre comité local.</p>" +
            "<p style='color:#888;font-size:13px;margin-top:24px'>Envoyé automatiquement par Nexus-AID. Merci pour votre engagement.</p>" +
            "</div><div style='background:#f8f8f8;padding:16px;text-align:center'>" +
            "<p style='color:#aaa;font-size:12px;margin:0'>© Croissant-Rouge Tunisien — Nexus-AID</p></div></div>";

        sendHtmlEmail(to, "Croissant-Rouge Tunisien — Remerciements & Confirmation d'évaluation RCP", html);
    }

    @Async
    public void sendMissionAssignmentEmail(String to, String name,
            com.nexusaid.core.entity.domains.catastrophe.DisasterMission mission) {
        String typeLabel = switch (mission.getMissionType() != null ? mission.getMissionType() : "") {
            case "SECOURS" -> "Secours";
            case "EVACUATION" -> "Évacuation";
            case "LOGISTIQUE" -> "Logistique";
            case "MEDICAL" -> "Médical";
            case "SURVEILLANCE" -> "Surveillance";
            default -> mission.getMissionType() != null ? mission.getMissionType() : "—";
        };
        String startStr = mission.getStartDatetime() != null
                ? mission.getStartDatetime().format(DateTimeFormatter.ofPattern("dd/MM/yyyy HH:mm"))
                : "—";
        String endStr = mission.getEndDatetime() != null
                ? mission.getEndDatetime().format(DateTimeFormatter.ofPattern("dd/MM/yyyy HH:mm"))
                : "—";
        String chiefStr = mission.getTeamChiefName() != null ? mission.getTeamChiefName() : "—";
        String instrStr = mission.getInstructions() != null ? mission.getInstructions() : "—";
        String missionNum = mission.getMissionNumber() != null ? mission.getMissionNumber() : "—";

        String materialsHtml = "";
        if (mission.getRequiredMaterials() != null && !mission.getRequiredMaterials().isEmpty()) {
            materialsHtml = "<ul style='padding-left:20px;color:#555'>"
                    + mission.getRequiredMaterials().stream()
                            .map(m -> "<li style='margin:4px 0'>" + m + "</li>")
                            .reduce("", String::concat)
                    + "</ul>";
        } else {
            materialsHtml = "<p style='color:#999;font-style:italic'>Aucun matériel spécifié</p>";
        }

        String html = "<div style='font-family:Inter,Arial,sans-serif;max-width:620px;margin:0 auto;"
                + "background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,.08)'>"
                + "<div style='background:linear-gradient(135deg,#e01c2e,#c0152a);padding:32px;text-align:center'>"
                + "<h1 style='color:#fff;margin:0;font-size:22px'>Ordre de Mission — CRT</h1>"
                + "<p style='color:rgba(255,255,255,.85);margin:8px 0 0'>N° " + missionNum + " — Nexus-AID</p>"
                + "</div><div style='padding:32px'>"
                + "<p style='color:#333;font-size:16px'>Cher(e) <strong>" + name + "</strong>,</p>"
                + "<p style='color:#555;line-height:1.7'>Vous avez été assigné(e) à la mission d'intervention suivante par le Croissant-Rouge Tunisien. Veuillez vous connecter à la plateforme Nexus-AID pour télécharger votre ordre de mission complet.</p>"
                + "<div style='background:#fef2f2;border-left:4px solid #e01c2e;padding:20px;border-radius:8px;margin:20px 0'>"
                + "<h3 style='margin:0 0 12px;color:#e01c2e'>" + mission.getTitle() + "</h3>"
                + "<table style='width:100%;border-collapse:collapse'>"
                + "<tr><td style='color:#666;padding:6px 0;width:40%'>Type de mission</td><td style='font-weight:600;color:#333'>" + typeLabel + "</td></tr>"
                + "<tr><td style='color:#666;padding:6px 0'>Début</td><td style='font-weight:600;color:#333'>" + startStr + "</td></tr>"
                + "<tr><td style='color:#666;padding:6px 0'>Fin prévue</td><td style='font-weight:600;color:#333'>" + endStr + "</td></tr>"
                + "<tr><td style='color:#666;padding:6px 0'>Chef d'équipe</td><td style='font-weight:600;color:#333'>" + chiefStr + "</td></tr>"
                + "</table></div>"
                + "<div style='margin:20px 0'>"
                + "<p style='color:#333;font-weight:600;margin-bottom:8px'>Matériel requis :</p>"
                + materialsHtml + "</div>"
                + "<div style='background:#f9fafb;border:1px solid #e5e7eb;border-radius:8px;padding:16px;margin:20px 0'>"
                + "<p style='color:#333;font-weight:600;margin:0 0 8px'>Instructions :</p>"
                + "<p style='color:#555;margin:0;line-height:1.6'>" + instrStr + "</p></div>"
                + "<div style='text-align:center;margin:30px 0'>"
                + "<a href='http://localhost:5173/catastrophes' style='background:#e01c2e;color:#fff;padding:14px 28px;"
                + "text-decoration:none;border-radius:8px;font-weight:600;display:inline-block;"
                + "box-shadow:0 4px 12px rgba(224,28,46,0.2)'>Voir mes missions &amp; Télécharger l'ordre</a></div>"
                + "<p style='color:#888;font-size:13px;margin-top:24px'>Envoyé automatiquement par Nexus-AID. Pour toute question, contactez votre responsable catastrophes.</p>"
                + "</div><div style='background:#f8f8f8;padding:16px;text-align:center'>"
                + "<p style='color:#aaa;font-size:12px;margin:0'>© Croissant-Rouge Tunisien — Nexus-AID</p>"
                + "</div></div>";

        sendHtmlEmail(to, "[CRT-Nexus-AID] Ordre de mission — " + mission.getTitle(), html);
    }

    // ─────────────────────────────────────────────────────────────────────────
    // NDRT / RDRT Team Member templates
    // ─────────────────────────────────────────────────────────────────────────

    @Async
    public void sendDisasterTeamMemberAddedEmail(String to, String name, String teamType, String specialty) {
        String html = "<div style='font-family:Inter,Arial,sans-serif;max-width:600px;margin:0 auto;" +
            "background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,.08)'>" +
            "<div style='background:linear-gradient(135deg,#e01c2e,#c0152a);padding:32px;text-align:center'>" +
            "<h1 style='color:#fff;margin:0;font-size:22px'>&#128104;&#8205;&#128658; Bienvenue dans l'équipe " + teamType + "</h1>" +
            "<p style='color:rgba(255,255,255,.85);margin:8px 0 0'>Croissant-Rouge Tunisien — Nexus-AID</p>" +
            "</div><div style='padding:32px'>" +
            "<p style='color:#333;font-size:16px'>Cher(e) <strong>" + name + "</strong>,</p>" +
            "<p style='color:#555;line-height:1.7'>Nous avons le plaisir de vous informer que vous avez été ajouté(e) à l'équipe d'intervention <strong>" + teamType + "</strong> en tant que <strong style='color:#e01c2e'>" + specialty + "</strong>.</p>" +
            "<p style='color:#555;line-height:1.7'>En tant que membre de cette équipe d'intervention, vous pourrez être sollicité(e) à tout moment pour des missions d'urgence ou de planification.</p>" +
            "<div style='text-align:center;margin:30px 0'>" +
            "<a href='http://localhost:5173/volunteer/interventions' style='background:#e01c2e;color:#fff;padding:12px 24px;" +
            "text-decoration:none;border-radius:8px;font-weight:600;display:inline-block;box-shadow:0 4px 12px rgba(224,28,46,0.2)'>Voir mon espace Intervention</a>" +
            "</div>" +
            "<p style='color:#888;font-size:13px;margin-top:24px'>Envoyé automatiquement par Nexus-AID.</p>" +
            "</div><div style='background:#f8f8f8;padding:16px;text-align:center'>" +
            "<p style='color:#aaa;font-size:12px;margin:0'>© Croissant-Rouge Tunisien — Nexus-AID</p></div></div>";

        sendHtmlEmail(to, "Bienvenue dans l'équipe d'intervention " + teamType, html);
    }

    @Async
    public void sendDisasterTeamMemberStatusUpdateEmail(String to, String name, String teamType, String status) {
        String statusLabel = "SUSPENDED".equalsIgnoreCase(status) ? "Suspendu(e)" : "Actif(ve)";
        String color = "SUSPENDED".equalsIgnoreCase(status) ? "#ef4444" : "#10b981";

        String html = "<div style='font-family:Inter,Arial,sans-serif;max-width:600px;margin:0 auto;" +
            "background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,.08)'>" +
            "<div style='background:linear-gradient(135deg,#e01c2e,#c0152a);padding:32px;text-align:center'>" +
            "<h1 style='color:#fff;margin:0;font-size:22px'>&#9888;&#65039; Mise à jour de votre statut</h1>" +
            "<p style='color:rgba(255,255,255,.85);margin:8px 0 0'>Croissant-Rouge Tunisien — Nexus-AID</p>" +
            "</div><div style='padding:32px'>" +
            "<p style='color:#333;font-size:16px'>Cher(e) <strong>" + name + "</strong>,</p>" +
            "<p style='color:#555;line-height:1.7'>Nous vous informons que votre statut au sein de l'équipe d'intervention <strong>" + teamType + "</strong> a été mis à jour.</p>" +
            "<div style='background:#f9fafb;border:1px solid #e5e7eb;border-radius:8px;padding:16px;margin:20px 0;text-align:center'>" +
            "<p style='color:#666;margin:0 0 8px'>Nouveau Statut</p>" +
            "<span style='background:" + color + "20;color:" + color + ";padding:6px 16px;border-radius:20px;font-weight:bold;font-size:16px'>" + statusLabel + "</span>" +
            "</div>" +
            "<p style='color:#888;font-size:13px;margin-top:24px'>Envoyé automatiquement par Nexus-AID. Si vous avez des questions, veuillez contacter votre responsable Catastrophes.</p>" +
            "</div><div style='background:#f8f8f8;padding:16px;text-align:center'>" +
            "<p style='color:#aaa;font-size:12px;margin:0'>© Croissant-Rouge Tunisien — Nexus-AID</p></div></div>";

        sendHtmlEmail(to, "Mise à jour de votre statut dans l'équipe " + teamType, html);
    }

    @Async
    public void sendDisasterTeamMemberRemovedEmail(String to, String name, String teamType) {
        String html = "<div style='font-family:Inter,Arial,sans-serif;max-width:600px;margin:0 auto;" +
            "background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,.08)'>" +
            "<div style='background:linear-gradient(135deg,#e01c2e,#c0152a);padding:32px;text-align:center'>" +
            "<h1 style='color:#fff;margin:0;font-size:22px'>Mise à jour d'équipe</h1>" +
            "<p style='color:rgba(255,255,255,.85);margin:8px 0 0'>Croissant-Rouge Tunisien — Nexus-AID</p>" +
            "</div><div style='padding:32px'>" +
            "<p style='color:#333;font-size:16px'>Cher(e) <strong>" + name + "</strong>,</p>" +
            "<p style='color:#555;line-height:1.7'>Nous vous informons que vous avez été retiré(e) de la liste de l'équipe d'intervention <strong>" + teamType + "</strong>.</p>" +
            "<p style='color:#555;line-height:1.7'>Nous vous remercions pour votre engagement et votre participation passée au sein de cette équipe.</p>" +
            "<p style='color:#888;font-size:13px;margin-top:24px'>Envoyé automatiquement par Nexus-AID.</p>" +
            "</div><div style='background:#f8f8f8;padding:16px;text-align:center'>" +
            "<p style='color:#aaa;font-size:12px;margin:0'>© Croissant-Rouge Tunisien — Nexus-AID</p></div></div>";

        sendHtmlEmail(to, "Retrait de l'équipe " + teamType, html);
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Disaster Report Email Templates
    // ─────────────────────────────────────────────────────────────────────────

    @Async
    public void sendReportAssignmentEmail(String to, String name, com.nexusaid.core.entity.domains.catastrophe.DisasterMission mission, LocalDateTime deadline) {
        String deadlineStr = deadline != null ? deadline.format(DateTimeFormatter.ofPattern("dd/MM/yyyy HH:mm")) : "Aucune date limite";
        String html = "<div style='font-family:Inter,Arial,sans-serif;max-width:600px;margin:0 auto;" +
            "background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,.08)'>" +
            "<div style='background:linear-gradient(135deg,#e01c2e,#c0152a);padding:32px;text-align:center'>" +
            "<h1 style='color:#fff;margin:0;font-size:22px'>&#128221; Rapport Requis : " + mission.getTitle() + "</h1>" +
            "<p style='color:rgba(255,255,255,.85);margin:8px 0 0'>Croissant-Rouge Tunisien — Nexus-AID</p>" +
            "</div><div style='padding:32px'>" +
            "<p style='color:#333;font-size:16px'>Cher(e) <strong>" + name + "</strong>,</p>" +
            "<p style='color:#555;line-height:1.7'>Un modèle de rapport a été assigné à la mission <strong>" + mission.getTitle() + "</strong>.</p>" +
            "<div style='background:#fef2f2;border-left:4px solid #e01c2e;padding:16px;border-radius:8px;margin:20px 0'>" +
            "<p style='margin:0 0 8px;color:#333;font-weight:600'>Détails de la mission :</p>" +
            "<p style='margin:0;color:#555'>Date limite de soumission : <strong style='color:#e01c2e'>" + deadlineStr + "</strong></p>" +
            "</div>" +
            "<p style='color:#555;line-height:1.7'>Veuillez vous connecter à la plateforme pour soumettre votre rapport de terrain.</p>" +
            "<div style='text-align:center;margin:30px 0'>" +
            "<a href='http://localhost:5173/catastrophes/missions/" + mission.getId() + "' style='background:#e01c2e;color:#fff;padding:12px 24px;" +
            "text-decoration:none;border-radius:8px;font-weight:600;display:inline-block;box-shadow:0 4px 12px rgba(224,28,46,0.2)'>Remplir le rapport</a>" +
            "</div>" +
            "<p style='color:#888;font-size:13px;margin-top:24px'>Envoyé automatiquement par Nexus-AID.</p>" +
            "</div><div style='background:#f8f8f8;padding:16px;text-align:center'>" +
            "<p style='color:#aaa;font-size:12px;margin:0'>© Croissant-Rouge Tunisien — Nexus-AID</p></div></div>";

        sendHtmlEmail(to, "[Nexus-AID] Rapport Requis - Mission " + mission.getTitle(), html);
    }

    @Async
    public void sendReportReminderEmail(String to, String name, com.nexusaid.core.entity.domains.catastrophe.DisasterMission mission, LocalDateTime deadline) {
        String deadlineStr = deadline != null ? deadline.format(DateTimeFormatter.ofPattern("dd/MM/yyyy HH:mm")) : "Aucune date limite";
        String html = "<div style='font-family:Inter,Arial,sans-serif;max-width:600px;margin:0 auto;" +
            "background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,.08)'>" +
            "<div style='background:linear-gradient(135deg,#D97706,#b45309);padding:32px;text-align:center'>" +
            "<h1 style='color:#fff;margin:0;font-size:22px'>&#9888;&#65039; Rappel : Rapport de mission</h1>" +
            "<p style='color:rgba(255,255,255,.85);margin:8px 0 0'>Croissant-Rouge Tunisien — Nexus-AID</p>" +
            "</div><div style='padding:32px'>" +
            "<p style='color:#333;font-size:16px'>Cher(e) <strong>" + name + "</strong>,</p>" +
            "<p style='color:#555;line-height:1.7'>Nous vous rappelons que vous devez soumettre un rapport pour la mission <strong>" + mission.getTitle() + "</strong>.</p>" +
            "<div style='background:#fffbeb;border-left:4px solid #D97706;padding:16px;border-radius:8px;margin:20px 0'>" +
            "<p style='margin:0;color:#333;font-weight:600'>Veuillez remplir le rapport avant le : <strong style='color:#D97706'>" + deadlineStr + "</strong></p>" +
            "</div>" +
            "<p style='color:#555;line-height:1.7'>Merci de votre engagement et de votre réactivité.</p>" +
            "<div style='text-align:center;margin:30px 0'>" +
            "<a href='http://localhost:5173/catastrophes/missions/" + mission.getId() + "' style='background:#D97706;color:#fff;padding:12px 24px;" +
            "text-decoration:none;border-radius:8px;font-weight:600;display:inline-block;box-shadow:0 4px 12px rgba(217,119,6,0.2)'>Remplir le rapport</a>" +
            "</div>" +
            "<p style='color:#888;font-size:13px;margin-top:24px'>Envoyé automatiquement par Nexus-AID.</p>" +
            "</div><div style='background:#f8f8f8;padding:16px;text-align:center'>" +
            "<p style='color:#aaa;font-size:12px;margin:0'>© Croissant-Rouge Tunisien — Nexus-AID</p></div></div>";

        sendHtmlEmail(to, "[RAPPEL] Rapport Requis - Mission " + mission.getTitle(), html);
    }
}
