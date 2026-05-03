package com.nexusaid.core.dto;

import com.nexusaid.core.entity.enums.UserType;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;
import java.util.UUID;

public class AuthDtos {

    @Data
    @Builder
    @AllArgsConstructor
    @NoArgsConstructor
    public static class LoginRequest {
        private String email;
        private String password;
        /** reCAPTCHA token — required after 2 failed attempts */
        private String captchaToken;
    }

    @Data
    @Builder
    @AllArgsConstructor
    @NoArgsConstructor
    public static class RegisterRequest {
        private String fullName;
        private String email;
        private String password;
        private String cin;
        private String phone;
        private UserType userType;

        // Specific to Volunteer
        private String matricule;
        private List<String> skills;
        private UUID committeeId;

        // Specific to Trainer
        private List<String> expertiseDomains;

        // Specific to Donor
        private List<String> preferredCategories;
        private List<String> targetZones;

        /** reCAPTCHA token — always required for registration */
        private String captchaToken;
    }

    @Data
    @Builder
    @AllArgsConstructor
    @NoArgsConstructor
    public static class AuthResponse {
        private String token;
        private String refreshToken;
        private UUID id;
        private String email;
        private String fullName;
        private String message;
        /** Set to true when CAPTCHA is required (after 2+ failed attempts) */
        @Builder.Default
        private boolean captchaRequired = false;
        /** Number of failed login attempts from this IP */
        @Builder.Default
        private int failedAttempts = 0;
        /** Seconds remaining until IP is unblocked (0 if not blocked) */
        @Builder.Default
        private long blockRemainingSeconds = 0;
    }

    @Data
    @Builder
    @AllArgsConstructor
    @NoArgsConstructor
    public static class RefreshTokenRequest {
        private String refreshToken;
    }

    @Data
    @Builder
    @AllArgsConstructor
    @NoArgsConstructor
    public static class RefreshTokenResponse {
        private String token;
        private String refreshToken;
        private String message;
    }
}
