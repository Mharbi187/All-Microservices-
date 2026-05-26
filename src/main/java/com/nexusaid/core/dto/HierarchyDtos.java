package com.nexusaid.core.dto;

import com.nexusaid.core.entity.enums.CommitteeStatus;
import com.nexusaid.core.entity.enums.CommitteeType;
import com.nexusaid.core.entity.enums.RoleTitle;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

public class HierarchyDtos {

    @Data
    @Builder
    @AllArgsConstructor
    @NoArgsConstructor
    public static class CommitteeOverview {
        private UUID id;
        private String name;
        private CommitteeType type;
        private String region;
        private CommitteeStatus status;
        private String parentCommitteeName;
        private List<RoleAssignment> roles;
        private int totalVolunteers;
        private int pendingVolunteers;
        // Governance
        private LocalDate mandateStartDate;
        private LocalDate mandateEndDate;
        private boolean mandateExpired;
        private boolean hasMandatoryBureau;
    }

    @Data
    @Builder
    @AllArgsConstructor
    @NoArgsConstructor
    public static class RoleAssignment {
        private RoleTitle title;
        private UUID volunteerId;
        private String volunteerName;
        private String volunteerEmail;
        private LocalDate mandateEndDate;
        private boolean mandateExpired;
    }

    /**
     * Informations de gouvernance d'un comité.
     * Utilisé pour afficher les règles CRT et alerter sur les problèmes.
     */
    @Data
    @Builder
    @AllArgsConstructor
    @NoArgsConstructor
    public static class CommitteeGovernance {
        private UUID committeeId;
        private CommitteeStatus status;
        private boolean hasMandatoryBureau;
        private List<String> missingMandatoryRoles;
        private LocalDate mandateStartDate;
        private LocalDate mandateEndDate;
        private boolean mandateExpired;
        private int mandateDurationYears;
        private List<String> warnings;
    }
}
