package com.nexusaid.core.dto;

import lombok.Data;

import java.time.LocalDateTime;
import java.util.Map;
import java.util.UUID;

public class DonationDtos {

    @Data
    public static class DonationNeedDto {
        private UUID id;
        private UUID committeeId;
        private String committeeName;
        private String committeeRegion;
        private String type;
        private String priority;
        private String description;
        private String quantityNeeded;
        private Integer beneficiaries;
        private String status;
        private LocalDateTime publishedAt;
    }

    @Data
    public static class DonationNeedCreateDto {
        private String type;
        private String priority;
        private String description;
        private String quantityNeeded;
        private Integer beneficiaries;
    }

    @Data
    public static class DonationDto {
        private UUID id;
        private String donationNumber;
        private DonationNeedDto need;
        private String donationType;
        private String description;
        private String quantity;
        private String note;
        private String photoUrl;
        private String status;
        private LocalDateTime createdAt;
    }

    @Data
    public static class DonationCreateDto {
        private UUID needId;
        private String donationType;
        private String description;
        private String quantity;
        private String note;
        private String photoUrl;
    }

    @Data
    public static class DonationReceiptDto {
        private UUID id;
        private String receiptNumber;
        private UUID donationId;
        private String donationNumber;
        private String donationType;
        private String quantity;
        private String description;
        private UUID needId;
        private String committeeName;
        private LocalDateTime validatedAt;
        private String validationNote;
        private LocalDateTime createdAt;
        private String status; // Derived from donation status
    }

    @Data
    public static class DonorNotificationDto {
        private UUID id;
        private String type;
        private String title;
        private String message;
        private boolean read;
        private String link;
        private Map<String, String> metadata;
        private LocalDateTime createdAt;
    }

    @Data
    public static class DonorStatsDto {
        private long totalDonations;
        private long beneficiariesHelped;
        private long zonesCovered;
        private long validatedDonations;
        private Map<String, Integer> donationsByCategory;
    }
}
