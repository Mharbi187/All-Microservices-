package com.nexusaid.core.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class TrainerDto {

    private UUID id;
    private String fullName;
    private String email;
    private String phone;
    private String matricule;
    private String avatar;

    private UUID committeeId;
    private String committeeName;
    private String committeeType;

    private List<String> expertiseDomains;
    private LocalDateTime promotedAt;

    /**
     * True if the trainer has "Secourisme" in their domains
     * AND their certification is expiring within 30 days (or already expired).
     */
    private boolean secourismeExpiringSoon;
    private boolean secourismeExpired;
}
