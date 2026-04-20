package com.nexusaid.admin.dto;

import com.nexusaid.admin.entity.enums.DonationCategory;
import lombok.Data;

import java.math.BigDecimal;
import java.util.UUID;

public class DonationDtos {

    @Data
    public static class CreateNeedRequest {
        private UUID committeeId;
        private String title;
        private String description;
        private DonationCategory category;
        private BigDecimal targetAmount;
        private Integer targetQuantity;
    }

    @Data
    public static class CreateMonetaryDonationRequest {
        private UUID donorId; // optional
        private String donorName;
        private String donorCin;
        private UUID needId; // optional
        private BigDecimal amount;
        private String paymentMethod;
    }

    @Data
    public static class CreateInKindDonationRequest {
        private UUID donorId; // optional
        private String donorName;
        private String donorCin;
        private UUID needId; // optional
        private String itemsDescription; // json representing items
    }

    @Data
    public static class DonationReceiptResponse {
        private String receiptNumber;
        private String message;
        private String qrCodeData;
        private String pdfDownloadLink; // Future endpoint to download the generated PDF
    }
}
