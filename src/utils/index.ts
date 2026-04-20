// ============================================================
// NEXUS-AID — Utility Functions
// ============================================================

/**
 * Format a number to a localized currency string
 */
export const formatCurrency = (amount: number, currency = 'TND'): string => {
    return new Intl.NumberFormat('fr-TN', {
        style: 'currency',
        currency,
        minimumFractionDigits: 0,
    }).format(amount);
};

/**
 * Format a date to a localized string
 */
export const formatDate = (date: string | Date, options?: Intl.DateTimeFormatOptions): string => {
    const defaultOptions: Intl.DateTimeFormatOptions = {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        ...options,
    };
    return new Intl.DateTimeFormat('fr-FR', defaultOptions).format(new Date(date));
};

/**
 * Get initials from a name string
 */
export const getInitials = (name: string): string => {
    return name
        .split(' ')
        .map((part) => part[0])
        .join('')
        .toUpperCase()
        .slice(0, 2);
};

/**
 * Truncate text with ellipsis
 */
export const truncate = (text: string, maxLength: number): string => {
    if (text.length <= maxLength) return text;
    return text.slice(0, maxLength) + '...';
};

/**
 * Generate a role display label (French)
 */
export const getRoleLabel = (role: string): string => {
    const labels: Record<string, string> = {
        admin: 'Administrateur',
        president_national: 'Président National',
        president_regional: 'Président Régional',
        president_local: 'Président Local',
        secretaire_general: 'Secrétaire Général',
        resp_secourisme: 'Responsable Secourisme',
        formateur: 'Formateur',
        donateur: 'Donateur',
        secouriste: 'Secouriste',
        gestionnaire_stock: 'Gestionnaire Stock',
        volontaire: 'Volontaire',
    };
    return labels[role] || role;
};
