package com.nexusaid.core.entity;

import com.fasterxml.jackson.annotation.JsonIgnore;
import com.nexusaid.core.entity.enums.CommitteeRoleStatus;
import com.nexusaid.core.entity.enums.RoleTitle;
import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.UUID;

/**
 * Rôle d'un volontaire au sein d'un comité.
 * Conformément aux statuts CRT : mandat quadriennal (4 ans),
 * élection démocratique par l'assemblée des bénévoles.
 */
@Entity
@Table(name = "committee_roles")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
public class CommitteeRole {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private RoleTitle title;

    @ManyToOne
    @JoinColumn(name = "committee_id", nullable = false)
    @JsonIgnore
    private Committee committee;

    @ManyToOne
    @JoinColumn(name = "volunteer_id", nullable = false)
    private Volunteer volunteer;

    @Column(name = "assigned_at")
    private LocalDateTime assignedAt = LocalDateTime.now();

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private CommitteeRoleStatus status = CommitteeRoleStatus.APPROVED;

    @Column(name = "proposed_by")
    private UUID proposedBy;

    @Column(name = "approved_by")
    private UUID approvedBy;

    @Column(name = "proposed_at")
    private LocalDateTime proposedAt;

    @Column(name = "approved_at")
    private LocalDateTime approvedAt;

    @Column(columnDefinition = "TEXT")
    private String reason;

    /** Fin du mandat = assignedAt + 4 ans (calculé automatiquement) */
    @Column(name = "mandate_end_date")
    private LocalDate mandateEndDate;

    /** Le mandat est-il expiré ? */
    public boolean isMandateExpired() {
        return mandateEndDate != null && LocalDate.now().isAfter(mandateEndDate);
    }

    @com.fasterxml.jackson.annotation.JsonProperty("committee")
    public java.util.Map<String, String> getCommitteeInfo() {
        if (this.committee == null) return null;
        return java.util.Map.of(
            "id", this.committee.getId().toString(),
            "name", this.committee.getName(),
            "type", this.committee.getType().name()
        );
    }
}
