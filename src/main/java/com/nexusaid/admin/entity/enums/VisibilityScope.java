package com.nexusaid.admin.entity.enums;

public enum VisibilityScope {
    ALL, // Visible to everyone (e.g., templates mapped by Secrétaire Général)
    SAME_ROLE_HIERARCHY, // Visible only to users with the same role in child committees
    SPECIALIZED_TEAMS // Visible to specialized intervention teams like NDRT, RDRT, ERT
}
