package com.nexusaid.admin.entity.enums;

/**
 * Statuts du cycle de vie d'un besoin de don.
 * Workflow : PENDING_VALIDATION → VALIDATED (publié) ou REJECTED
 * FULFILLED : objectif atteint. CANCELLED : annulé par créateur.
 */
public enum NeedsStatus {
    /** Créé par Responsable, attend validation Président/VP */
    PENDING_VALIDATION,
    /** Validé et publié — visible aux donateurs */
    VALIDATED,
    /** Rejeté par Président/VP avec motif obligatoire */
    REJECTED,
    /** Objectif de dons atteint */
    FULFILLED,
    /** Annulé avant validation */
    CANCELLED
}
