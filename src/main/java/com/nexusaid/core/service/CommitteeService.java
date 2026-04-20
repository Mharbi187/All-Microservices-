package com.nexusaid.core.service;

import com.nexusaid.core.dto.HierarchyDtos;
import com.nexusaid.core.entity.Committee;
import com.nexusaid.core.entity.CommitteeRole;
import com.nexusaid.core.entity.HierarchyAuditLog;
import com.nexusaid.core.entity.User;
import com.nexusaid.core.entity.Volunteer;
import com.nexusaid.core.entity.enums.CommitteeStatus;
import com.nexusaid.core.entity.enums.CommitteeRoleStatus;
import com.nexusaid.core.entity.enums.CommitteeType;
import com.nexusaid.core.entity.enums.RoleTitle;
import com.nexusaid.core.entity.enums.UserType;
import com.nexusaid.core.repository.CommitteeRepository;
import com.nexusaid.core.repository.CommitteeRoleRepository;
import com.nexusaid.core.repository.HierarchyAuditLogRepository;
import com.nexusaid.core.repository.UserRepository;
import com.nexusaid.core.repository.VolunteerRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;

/**
 * Service de gestion des comités CRT.
 * Implémente les règles de gouvernance conformes au décret-loi n° 88-2011,
 * aux statuts du CRT et aux bonnes pratiques FICR.
 *
 * Règles métier principales :
 * 1. Compétence territoriale exclusive (1 LOCAL/délégation, 1
 * REGIONAL/gouvernorat, 1 seul NATIONAL)
 * 2. Hiérarchie stricte : LOCAL → REGIONAL → NATIONAL
 * 3. Bureau minimum obligatoire : PRESIDENT + SECRETAIRE_GENERAL
 * 4. Mandat quadriennal (4 ans) pour tous les membres du bureau
 * 5. Agrément institutionnel : validation par le Comité Central
 * 6. Unicité des rôles obligatoires (un seul PRESIDENT, un seul SG par comité)
 */
@Service
@RequiredArgsConstructor
public class CommitteeService {

    private final CommitteeRepository committeeRepository;
    private final CommitteeRoleRepository committeeRoleRepository;
    private final VolunteerRepository volunteerRepository;
    private final HierarchyAuditLogRepository auditLogRepository;
    private final UserRepository userRepository;

    public List<Committee> getAllCommittees() {
        return committeeRepository.findAll();
    }

    // =========================================================================
    // CREATE COMMITTEE — avec validations CRT
    // =========================================================================

    @Transactional
    public Committee createCommittee(String name, CommitteeType type, String region, UUID parentId) {

        // ---- Règle 1 : Compétence territoriale exclusive ----
        if (committeeRepository.existsByTypeAndRegion(type, region)) {
            String label = type == CommitteeType.REGIONAL ? "gouvernorat" : "délégation";
            throw new IllegalArgumentException(
                    "Un comité " + type.name() + " existe déjà pour le " + label + " « " + region + " ». " +
                            "Règle de compétence territoriale exclusive (Art. statuts CRT).");
        }

        // ---- Règle 2 : Il ne peut y avoir qu'un seul comité NATIONAL ----
        if (type == CommitteeType.NATIONAL && committeeRepository.countByType(CommitteeType.NATIONAL) > 0) {
            throw new IllegalArgumentException(
                    "Un seul Siège National peut exister. Le Comité National est unique.");
        }

        // ---- Règle 3 : Hiérarchie obligatoire ----
        Committee parent = null;
        if (type == CommitteeType.LOCAL) {
            if (parentId == null) {
                throw new IllegalArgumentException(
                        "Un comité LOCAL doit obligatoirement être rattaché à un comité REGIONAL (parent requis).");
            }
            parent = committeeRepository.findById(parentId)
                    .orElseThrow(() -> new IllegalArgumentException("Comité parent introuvable."));
            if (parent.getType() != CommitteeType.REGIONAL) {
                throw new IllegalArgumentException(
                        "Un comité LOCAL doit être rattaché à un comité REGIONAL. Le parent sélectionné est de type "
                                + parent.getType() + ".");
            }
        } else if (type == CommitteeType.REGIONAL) {
            if (parentId == null) {
                throw new IllegalArgumentException(
                        "Un comité REGIONAL doit obligatoirement être rattaché au Siège National (parent requis).");
            }
            parent = committeeRepository.findById(parentId)
                    .orElseThrow(() -> new IllegalArgumentException("Comité parent introuvable."));
            if (parent.getType() != CommitteeType.NATIONAL) {
                throw new IllegalArgumentException(
                        "Un comité REGIONAL doit être rattaché au Siège NATIONAL. Le parent sélectionné est de type "
                                + parent.getType() + ".");
            }
        } else if (type == CommitteeType.NATIONAL && parentId != null) {
            throw new IllegalArgumentException(
                    "Le Siège National ne peut pas avoir de comité parent.");
        }

        // ---- Créer le comité en statut PENDING_CONSTITUTION ----
        Committee committee = new Committee();
        committee.setName(name);
        committee.setType(type);
        committee.setRegion(region);
        committee.setStatus(CommitteeStatus.PENDING_CONSTITUTION);
        committee.setCreatedAt(LocalDateTime.now());
        if (parent != null) {
            committee.setParentCommittee(parent);
        }

        return committeeRepository.save(committee);
    }

    // =========================================================================
    // APPROVE COMMITTEE — Agrément institutionnel par le Comité Central
    // =========================================================================

    @Transactional
    public Committee approveCommittee(UUID committeeId, UUID approvedByUserId) {
        Committee committee = committeeRepository.findById(committeeId)
                .orElseThrow(() -> new IllegalArgumentException("Comité introuvable."));

        if (committee.getStatus() != CommitteeStatus.PENDING_CONSTITUTION) {
            throw new IllegalStateException(
                    "Seuls les comités en statut PENDING_CONSTITUTION peuvent être approuvés. Statut actuel : "
                            + committee.getStatus());
        }

        // Vérifier que le bureau minimum est constitué (PRESIDENT + SG)
        long mandatoryCount = committeeRoleRepository.countMandatoryRoles(committeeId);
        if (mandatoryCount < 2) {
            throw new IllegalStateException(
                    "Le bureau minimum obligatoire n'est pas complet. " +
                            "Un PRESIDENT et un SECRETAIRE_GENERAL doivent être assignés avant l'approbation " +
                            "(conformément au décret-loi n° 88-2011, Art. bureau exécutif).");
        }

        // Activer le comité et démarrer le mandat
        committee.setStatus(CommitteeStatus.ACTIVE);
        committee.setApprovedAt(LocalDateTime.now());
        committee.setCurrentMandateStart(LocalDate.now());
        committee.setCurrentMandateEnd(LocalDate.now().plusYears(Committee.MANDATE_DURATION_YEARS));

        // Mettre à jour la date de fin de mandat de tous les rôles
        List<CommitteeRole> roles = committeeRoleRepository.findByCommitteeId(committeeId);
        for (CommitteeRole role : roles) {
            if (role.getMandateEndDate() == null) {
                role.setMandateEndDate(LocalDate.now().plusYears(Committee.MANDATE_DURATION_YEARS));
                committeeRoleRepository.save(role);
            }
        }

        // Audit log
        HierarchyAuditLog log = new HierarchyAuditLog();
        log.setAction("APPROVE_COMMITTEE");
        log.setPerformedBy(approvedByUserId);
        log.setTargetCommitteeId(committeeId);
        log.setReason("Agrément institutionnel — Validation par le Comité Central");
        log.setTimestamp(LocalDateTime.now());
        auditLogRepository.save(log);

        return committeeRepository.save(committee);
    }

    // =========================================================================
    /**
     * PROPOSE ROLE — Étape 1 : Proposition d'un rôle (élection/nomination)
     * Reste en attente (PROPOSED) jusqu'à validation par le Président compétent.
     */
    @Transactional
    public void proposeRole(UUID committeeId, UUID volunteerId, RoleTitle title, UUID proposedByUserId, String reason) {
        Committee committee = committeeRepository.findById(committeeId)
                .orElseThrow(() -> new IllegalArgumentException("Comité introuvable."));

        Volunteer volunteer = volunteerRepository.findById(volunteerId)
                .orElseThrow(() -> new IllegalArgumentException("Volontaire introuvable."));

        // ---- Règle : Unicité des rôles ----
        committeeRoleRepository.findByCommitteeIdAndTitle(committeeId, title)
                .ifPresent(existingRole -> {
                    if (existingRole.getStatus() != CommitteeRoleStatus.REJECTED) {
                        throw new IllegalArgumentException(
                                "Le rôle " + title.name() + " est déjà occupé ou en attente d'approbation. " +
                                        "Veuillez d'abord révoquer le rôle existant.");
                    }
                });

        // ---- Créer le rôle en statut PROPOSED ----
        CommitteeRole role = new CommitteeRole();
        role.setCommittee(committee);
        role.setVolunteer(volunteer);
        role.setTitle(title);
        role.setStatus(CommitteeRoleStatus.PROPOSED);
        role.setProposedBy(proposedByUserId);
        role.setProposedAt(LocalDateTime.now());
        role.setReason(reason);

        committeeRoleRepository.save(role);

        // Audit Logging
        HierarchyAuditLog log = new HierarchyAuditLog();
        log.setAction("PROPOSE_ROLE_" + title.name());
        log.setPerformedBy(proposedByUserId);
        log.setTargetCommitteeId(committeeId);
        log.setTargetVolunteerId(volunteerId);
        log.setReason(reason != null ? reason : "Proposé via API");
        log.setTimestamp(LocalDateTime.now());
        auditLogRepository.save(log);
    }

    /**
     * VALIDATE ROLE — Étape 2 : Approbation/Rejet par le Président
     */
    @Transactional
    public void validateRoleAssignment(UUID roleId, boolean approve, UUID validatedByUserId, String reason) {
        CommitteeRole role = committeeRoleRepository.findById(roleId)
                .orElseThrow(() -> new IllegalArgumentException("Proposition de rôle introuvable."));

        if (role.getStatus() != CommitteeRoleStatus.PROPOSED) {
            throw new IllegalStateException("Ce rôle a déjà été traité (Statut: " + role.getStatus() + ").");
        }

        if (approve) {
            role.setStatus(CommitteeRoleStatus.APPROVED);
            role.setApprovedBy(validatedByUserId);
            role.setApprovedAt(LocalDateTime.now());
            role.setAssignedAt(LocalDateTime.now());
            role.setMandateEndDate(LocalDate.now().plusYears(Committee.MANDATE_DURATION_YEARS));
        } else {
            role.setStatus(CommitteeRoleStatus.REJECTED);
        }

        committeeRoleRepository.save(role);

        // Audit
        HierarchyAuditLog audit = new HierarchyAuditLog();
        audit.setAction(approve ? "APPROVE_ROLE" : "REJECT_ROLE");
        audit.setPerformedBy(validatedByUserId);
        audit.setTargetCommitteeId(role.getCommittee().getId());
        audit.setTargetVolunteerId(role.getVolunteer().getId());
        audit.setReason(reason);
        auditLogRepository.save(audit);
    }

    public List<CommitteeRole> getPendingProposals(UUID requestingUserId) {
        return committeeRoleRepository.findByStatus(CommitteeRoleStatus.PROPOSED);
    }

    // =========================================================================
    // REVOKE ROLE — Révocation d'un rôle
    // =========================================================================

    @Transactional
    public void revokeRole(UUID committeeId, RoleTitle title, UUID revokedByUserId, String reason) {
        CommitteeRole role = committeeRoleRepository.findByCommitteeIdAndTitle(committeeId, title)
                .orElseThrow(() -> new IllegalArgumentException(
                        "Aucun rôle " + title.name() + " trouvé pour ce comité."));

        committeeRoleRepository.delete(role);

        // Si on supprime un rôle obligatoire sur un comité ACTIVE, le passer en PENDING
        Committee committee = committeeRepository.findById(committeeId).orElse(null);
        if (committee != null && committee.getStatus() == CommitteeStatus.ACTIVE) {
            long mandatoryCount = committeeRoleRepository.countMandatoryRoles(committeeId);
            if (mandatoryCount < 2) {
                committee.setStatus(CommitteeStatus.PENDING_CONSTITUTION);
                committeeRepository.save(committee);
            }
        }

        // Audit
        HierarchyAuditLog log = new HierarchyAuditLog();
        log.setAction("REVOKE_ROLE_" + title.name());
        log.setPerformedBy(revokedByUserId);
        log.setTargetCommitteeId(committeeId);
        log.setTargetVolunteerId(role.getVolunteer().getId());
        log.setReason(reason != null ? reason : "Révoqué via API");
        log.setTimestamp(LocalDateTime.now());
        auditLogRepository.save(log);
    }

    /**
     * Audit Trail Hiérarchique
     */
    public List<HierarchyAuditLog> getHierarchicalAuditLogs(UUID auditRequesterId) {
        List<UUID> visibleCommittees = getVisibleCommitteeIds(auditRequesterId);

        if (visibleCommittees.isEmpty()) {
            return new ArrayList<>();
        }

        return auditLogRepository.findByTargetCommitteeIdInOrderByTimestampDesc(visibleCommittees);
    }

    private List<UUID> getVisibleCommitteeIds(UUID requestingUserId) {
        User requester = userRepository.findById(requestingUserId).orElse(null);
        if (requester != null && requester.getType() == UserType.ADMIN) {
            return committeeRepository.findAll().stream().map(Committee::getId).toList();
        }

        List<CommitteeRole> roles = committeeRoleRepository.findByVolunteerId(requestingUserId);

        boolean isNational = roles.stream()
                .anyMatch(r -> r.getTitle() == RoleTitle.PRESIDENT &&
                        r.getCommittee().getType() == CommitteeType.NATIONAL &&
                        r.getStatus() == CommitteeRoleStatus.APPROVED);

        if (isNational) {
            return committeeRepository.findAll().stream().map(Committee::getId).toList();
        }

        List<UUID> scope = new ArrayList<>();
        for (CommitteeRole role : roles) {
            if (role.getStatus() != CommitteeRoleStatus.APPROVED)
                continue;

            if (role.getTitle() == RoleTitle.PRESIDENT) {
                scope.add(role.getCommittee().getId());
                committeeRepository.findByParentCommitteeId(role.getCommittee().getId())
                        .forEach(child -> scope.add(child.getId()));
            } else {
                scope.add(role.getCommittee().getId());
            }
        }
        return scope.stream().distinct().collect(Collectors.toList());
    }

    // =========================================================================
    // GET COMMITTEE GOVERNANCE INFO
    // =========================================================================

    public HierarchyDtos.CommitteeGovernance getGovernanceInfo(UUID committeeId) {
        Committee committee = committeeRepository.findById(committeeId)
                .orElseThrow(() -> new IllegalArgumentException("Comité introuvable."));

        List<CommitteeRole> roles = committeeRoleRepository.findByCommitteeId(committeeId);
        boolean hasPresident = roles.stream().anyMatch(r -> r.getTitle() == RoleTitle.PRESIDENT);
        boolean hasSG = roles.stream().anyMatch(r -> r.getTitle() == RoleTitle.SECRETAIRE_GENERAL);

        List<String> missingMandatory = new ArrayList<>();
        if (!hasPresident)
            missingMandatory.add("PRESIDENT");
        if (!hasSG)
            missingMandatory.add("SECRETAIRE_GENERAL");

        List<String> warnings = new ArrayList<>();
        if (committee.isMandateExpired()) {
            warnings.add("Le mandat du bureau est expiré. Renouvellement nécessaire.");
        }
        for (CommitteeRole r : roles) {
            if (r.isMandateExpired()) {
                warnings.add("Le mandat de " + r.getVolunteer().getFullName() + " (" + r.getTitle() + ") est expiré.");
            }
        }

        return HierarchyDtos.CommitteeGovernance.builder()
                .committeeId(committeeId)
                .status(committee.getStatus())
                .hasMandatoryBureau(hasPresident && hasSG)
                .missingMandatoryRoles(missingMandatory)
                .mandateStartDate(committee.getCurrentMandateStart())
                .mandateEndDate(committee.getCurrentMandateEnd())
                .mandateExpired(committee.isMandateExpired())
                .mandateDurationYears(Committee.MANDATE_DURATION_YEARS)
                .warnings(warnings)
                .build();
    }

    // =========================================================================
    // HIERARCHY OVERVIEW
    // =========================================================================

    public List<HierarchyDtos.CommitteeOverview> getHierarchyOverview(UUID requestingUserId) {
        User user = userRepository.findById(requestingUserId).orElse(null);
        boolean isAdmin = (user != null && user.getType() == UserType.ADMIN);

        List<CommitteeRole> presidentRoles = committeeRoleRepository.findByVolunteerId(requestingUserId)
                .stream()
                .filter(r -> r.getTitle() == RoleTitle.PRESIDENT && r.getStatus() == CommitteeRoleStatus.APPROVED)
                .toList();

        if (presidentRoles.isEmpty() && !isAdmin) {
            return java.util.Collections.emptyList();
        }

        boolean isNational = isAdmin || presidentRoles.stream()
                .anyMatch(r -> r.getCommittee().getType() == CommitteeType.NATIONAL);
        boolean isRegional = presidentRoles.stream()
                .anyMatch(r -> r.getCommittee().getType() == CommitteeType.REGIONAL);

        List<Committee> visibleCommittees;
        if (isNational) {
            visibleCommittees = committeeRepository.findAll();
        } else if (isRegional) {
            visibleCommittees = new ArrayList<>();
            for (CommitteeRole pr : presidentRoles) {
                Committee regional = pr.getCommittee();
                visibleCommittees.add(regional);
                visibleCommittees.addAll(committeeRepository.findByParentCommitteeId(regional.getId()));
            }
        } else {
            visibleCommittees = presidentRoles.stream()
                    .map(CommitteeRole::getCommittee)
                    .toList();
        }

        return visibleCommittees.stream().map(c -> {
            List<CommitteeRole> roles = committeeRoleRepository.findByCommitteeId(c.getId());
            List<HierarchyDtos.RoleAssignment> roleAssignments = roles.stream()
                    .map(r -> HierarchyDtos.RoleAssignment.builder()
                            .title(r.getTitle())
                            .volunteerId(r.getVolunteer().getId())
                            .volunteerName(r.getVolunteer().getFullName())
                            .volunteerEmail(r.getVolunteer().getEmail())
                            .mandateEndDate(r.getMandateEndDate())
                            .mandateExpired(r.isMandateExpired())
                            .build())
                    .collect(Collectors.toList());

            boolean hasPresident = roles.stream().anyMatch(r -> r.getTitle() == RoleTitle.PRESIDENT);
            boolean hasSG = roles.stream().anyMatch(r -> r.getTitle() == RoleTitle.SECRETAIRE_GENERAL);

            List<Volunteer> volunteers = volunteerRepository.findByCommitteeId(c.getId());

            return HierarchyDtos.CommitteeOverview.builder()
                    .id(c.getId())
                    .name(c.getName())
                    .type(c.getType())
                    .region(c.getRegion())
                    .status(c.getStatus())
                    .parentCommitteeName(c.getParentCommittee() != null ? c.getParentCommittee().getName() : null)
                    .roles(roleAssignments)
                    .totalVolunteers(volunteers.size())
                    .mandateStartDate(c.getCurrentMandateStart())
                    .mandateEndDate(c.getCurrentMandateEnd())
                    .mandateExpired(c.isMandateExpired())
                    .hasMandatoryBureau(hasPresident && hasSG)
                    .build();
        }).collect(Collectors.toList());
    }
}
