package com.nexusaid.core.entity.enums;

/**
 * Statut d'un comité CRT conformément au décret-loi n° 88-2011.
 *
 * PENDING_CONSTITUTION : En cours de constitution (assemblée générale non
 * tenue)
 * ACTIVE : Approuvé et opérationnel (bureau élu validé par le Comité Central)
 * SUSPENDED : Suspendu temporairement
 * DISSOLVED : Dissous définitivement
 */
public enum CommitteeStatus {
    PENDING_CONSTITUTION,
    ACTIVE,
    SUSPENDED,
    DISSOLVED
}
