package com.nexusaid.admin.dto;

import com.nexusaid.admin.entity.enums.DonationCategory;
import com.nexusaid.admin.entity.enums.NeedsStatus;
import lombok.Data;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

public class DonationDtos {

    // ─── Création d'un besoin (Responsable) ────────────────────────────────────

    @Data
    public static class CreateNeedRequest {
        private UUID committeeId;
        private String committeeType;   // LOCAL, REGIONAL, NATIONAL
        private String committeeName;
        private String title;
        private String description;
        private DonationCategory category;
        private BigDecimal targetAmount;
        private Integer targetQuantity;
    }

    // ─── Validation / Rejet (Président / VP) ──────────────────────────────────

    @Data
    public static class ValidateNeedRequest {
        /** VALIDATE ou REJECT */
        private String action;
        /** Motif obligatoire si action = REJECT */
        private String reason;
        /** Nom complet du valideur pour affichage */
        private String validatorName;
    }

    // ─── Réponse enrichie besoin ────────────────────────────────────────────────

    @Data
    public static class DonationNeedResponse {
        private UUID id;
        private UUID committeeId;
        private String committeeType;
        private String committeeName;
        private String title;
        private String description;
        private DonationCategory category;
        private NeedsStatus status;
        private BigDecimal targetAmount;
        private Integer targetQuantity;
        private BigDecimal currentAmount;
        private Integer currentQuantity;
        private UUID createdBy;
        private String creatorName;
        private String creatorRoleName;
        private UUID validatedBy;
        private String validatorName;
        private LocalDateTime validatedAt;
        private UUID rejectedBy;
        private String rejectorName;
        private LocalDateTime rejectedAt;
        private String rejectionReason;
        private LocalDateTime createdAt;
        private LocalDateTime updatedAt;
    }

    // ─── Don monétaire (Donateur / Bénévole) ──────────────────────────────────

    @Data
    public static class CreateMonetaryDonationRequest {
        private UUID donorId;       // optionnel
        private String donorName;
        private String donorEmail;  // pour notification reçu fiscal
        private String donorCin;
        private UUID needId;        // optionnel — lié à un besoin
        private BigDecimal amount;
        private String currency;    // TND par défaut
        private String paymentMethod;
    }

    // ─── Don en nature (Donateur / Bénévole) ──────────────────────────────────

    @Data
    public static class CreateInKindDonationRequest {
        private UUID donorId;
        private String donorName;
        private String donorEmail;
        private String donorCin;
        private UUID needId;
        /** JSON représentant les articles : [{item, quantity, unit}] */
        private String itemsDescription;
    }

    // ─── Réponse reçu (après don) ─────────────────────────────────────────────

    @Data
    public static class DonationReceiptResponse {
        private String receiptNumber;
        private String message;
        private String qrCodeData;
        private String pdfDownloadLink;
    }

    // ─── Statistiques dons (Présidents) ───────────────────────────────────────

    @Data
    public static class DonationStatsResponse {
        private long totalNeeds;
        private long pendingNeeds;
        private long validatedNeeds;
        private long rejectedNeeds;
        private long fulfilledNeeds;
        private BigDecimal totalMonetaryReceived;
        private long totalInKindDonations;
        private List<UUID> committeeIds;
    }
}
