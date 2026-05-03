package com.nexusaid.admin.entity.enums;

/**
 * Template visibility/hierarchy scope.
 * Controls who can create templates and which reports can use them.
 */
public enum TemplateScope {
    /** Created by PRESIDENT_NATIONAL / SG_NATIONAL — applies to all committees */
    NATIONAL,
    /** Created by PRESIDENT_REGIONAL / VP_REGIONAL — applies to regional + local committees */
    REGIONAL,
    /** Created by local committee responsible — applies only to their committee */
    LOCAL
}
