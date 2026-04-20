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
    }

    @Data
    @Builder
    @AllArgsConstructor
    @NoArgsConstructor
    public static class AuthResponse {
        private String token;
        private UUID id;
        private String email;
        private String fullName;
        private String message;
    }
}
