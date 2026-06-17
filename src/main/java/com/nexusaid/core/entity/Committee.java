package com.nexusaid.core.entity;

import com.fasterxml.jackson.annotation.JsonIgnore;
import com.nexusaid.core.entity.enums.CommitteeStatus;
import com.nexusaid.core.entity.enums.CommitteeType;
import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

/**
 * Entité Comité CRT.
 * Conformément au décret-loi n° 88-2011 et aux statuts du CRT :
 * - Compétence territoriale exclusive : 1 seul comité LOCAL par délégation, 1
 * seul REGIONAL par gouvernorat
 * - Bureau minimum obligatoire : PRESIDENT + SECRETAIRE_GENERAL
 * - Mandats de 4 ans (quadriennaux)
 * - Agrément institutionnel requis (validation par le Comité Central)
 */
@Entity
@Table(name = "committees", uniqueConstraints = {
        @UniqueConstraint(name = "uk_committee_type_region", columnNames = { "type", "region" })
})
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
public class Committee {

    /** Durée légale d'un mandat en années (Art. statuts CRT) */
    public static final int MANDATE_DURATION_YEARS = 4;

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(nullable = false)
    private String name;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private CommitteeType type;

    /**
     * Gouvernorat (REGIONAL) ou Délégation (LOCAL) — aligné sur le découpage
     * administratif
     */
    @Column(nullable = false)
    private String region;

    /** Statut du comité dans le cycle de vie institutionnel */
    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private CommitteeStatus status = CommitteeStatus.PENDING_CONSTITUTION;

    /** Date de création (assemblée constitutive) */
    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt = LocalDateTime.now();

    /** Date d'approbation par le Comité Central (null = en attente) */
    @Column(name = "approved_at")
    private LocalDateTime approvedAt;

    /** Date de début du mandat en cours du bureau */
    @Column(name = "current_mandate_start")
    private LocalDate currentMandateStart;

    /** Date de fin du mandat en cours (start + 4 ans) */
    @Column(name = "current_mandate_end")
    private LocalDate currentMandateEnd;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "parent_committee_id")
    @JsonIgnore
    private Committee parentCommittee;

    @OneToMany(mappedBy = "parentCommittee", cascade = CascadeType.ALL, orphanRemoval = true)
    private List<Committee> subCommittees = new ArrayList<>();

    @OneToMany(mappedBy = "committee", cascade = CascadeType.ALL, orphanRemoval = true)
    private List<CommitteeRole> roles = new ArrayList<>();

    // ---- Helpers ----

    /** Le bureau obligatoire (PRESIDENT + SG) est-il complet ? */
    public boolean hasMandatoryRoles() {
        boolean hasPresident = roles.stream().anyMatch(r -> r.getTitle().name().equals("PRESIDENT"));
        boolean hasSG = roles.stream().anyMatch(r -> r.getTitle().name().equals("SECRETAIRE_GENERAL"));
        return hasPresident && hasSG;
    }

    /** Le mandat est-il expiré ? */
    public boolean isMandateExpired() {
        return currentMandateEnd != null && LocalDate.now().isAfter(currentMandateEnd);
    }
}
