// ============================================================
// NEXUS-AID — Type Definitions
// Core types used across the entire application
// ============================================================

// ---- Backend Enums ----

export type UserType = 'VOLUNTEER' | 'TRAINER' | 'DONOR' | 'ADMIN';

export type AccountStatus = 'PENDING' | 'APPROVED' | 'REJECTED' | 'SUSPENDED';

export type CommitteeType = 'NATIONAL' | 'REGIONAL' | 'LOCAL';

export type CommitteeStatus = 'PENDING_CONSTITUTION' | 'ACTIVE' | 'SUSPENDED' | 'DISSOLVED';

export type RoleTitle =
    | 'PRESIDENT'
    | 'VICE_PRESIDENT'
    | 'SECRETAIRE_GENERAL'
    | 'RESP_SECOURISME'
    | 'RESP_DIFFUSION'
    | 'RESP_JEUNESSE'
    | 'RESP_SANTE'
    | 'RESP_CATASTROPHES'
    | 'RESP_ACTION_SOCIALE'
    | 'RESP_IMMIGRATION'
    | 'RESP_VFF';

export type StockCategory = 'MEDICAL' | 'CLOTHING' | 'FOOD' | 'EQUIPMENT' | 'RESCUE_GEAR';

export type AlertType = 'EXPIRY' | 'MIN_STOCK' | 'TEMPERATURE';
export type AlertSeverity = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
export type ComplaintStatus = 'PENDING' | 'RESOLVED' | 'REJECTED';
export type ReportStatus = 'DRAFT' | 'VALIDATED' | 'FINALIZED';

// ---- Legacy Role (kept for compatibility) ----

export type Role =
    | 'admin'
    | 'president_national'
    | 'president_regional'
    | 'president_local'
    | 'secretaire_general'
    | 'resp_secourisme'
    | 'formateur'
    | 'donateur'
    | 'secouriste'
    | 'gestionnaire_stock'
    | 'volontaire';

// ---- User & Auth Types ----

export interface User {
    id: string;
    email: string;
    fullName: string;
    type?: UserType;
    roles: RoleTitle[];
    committeeId?: string;
    committeeName?: string;
    status?: AccountStatus;
    // Volunteer-specific
    matricule?: string;
    skills?: string;
    // Kept for UI compatibility
    firstName?: string;
    lastName?: string;
    role?: Role;
    avatar?: string;
    phone?: string;
    isActive?: boolean;
}

export interface AuthResponse {
    token: string;
    refreshToken?: string;
    id: string;
    email: string;
    fullName: string;
    message: string;
    captchaRequired?: boolean;
    failedAttempts?: number;
    blockRemainingSeconds?: number;
}

export interface LoginCredentials {
    email: string;
    password: string;
}

export interface RegisterData {
    fullName: string;
    email: string;
    password: string;
    cin: string;
    phone: string;
    userType: UserType;
    // Volunteer/Trainer fields
    matricule?: string;
    skills?: string;
    committeeId?: string;
    expertiseDomains?: string;
    // Donor fields
    preferredCategories?: string;
    targetZones?: string;
}

// ---- Profile Response (matches backend /profiles/me flat response) ----

export interface ProfileRoleEntry {
    role: string;
    committee: string;
    committeeType: string;
    committeeId: string;
}

export interface ProfileResponse {
    id: string;
    fullName: string;
    email: string;
    userType: UserType;
    accountStatus: AccountStatus;
    roles: ProfileRoleEntry[];
}

// ---- Committee / Organization Types ----

export interface Committee {
    id: string;
    name: string;
    type: CommitteeType;
    region?: string;
    status?: CommitteeStatus;
    parentId?: string;
    parentCommitteeName?: string;
    createdAt?: string;
    approvedAt?: string;
    currentMandateStart?: string;
    currentMandateEnd?: string;
}

export interface CommitteeOverview {
    id: string;
    name: string;
    type: CommitteeType;
    region: string;
    status: CommitteeStatus;
    parentCommitteeName?: string;
    roles: CommitteeRoleInfo[];
    totalVolunteers: number;
    // Governance
    mandateStartDate?: string;
    mandateEndDate?: string;
    mandateExpired: boolean;
    hasMandatoryBureau: boolean;
}

export interface CommitteeRoleInfo {
    title: RoleTitle;
    volunteerId: string;
    volunteerName: string;
    volunteerEmail: string;
    mandateEndDate?: string;
    mandateExpired: boolean;
}

export interface CommitteeGovernance {
    committeeId: string;
    status: CommitteeStatus;
    hasMandatoryBureau: boolean;
    missingMandatoryRoles: string[];
    mandateStartDate?: string;
    mandateEndDate?: string;
    mandateExpired: boolean;
    mandateDurationYears: number;
    warnings: string[];
}

// ---- Volunteer Types ----

export interface VolunteerDTO {
    id: string;
    userId: string;
    fullName: string;
    email: string;
    phone?: string;
    matricule: string;
    skills: string;
    status: AccountStatus;
    type: string;
    accountStatus: string;
    committeeId?: string;
    committeeName?: string;
    dateAdhesion?: string;
    hoursVolunteered?: number;
    trainingProgress?: string;
}

// ---- Stock/Inventory Types ----

export interface InventoryItemDTO {
    id: string;
    name: string;
    category: StockCategory;
    currentQuantity: number;
    minThreshold: number;
}

export interface StockMovementDTO {
    quantity: number;
    reason: string;
}

export interface StockMovementResponse {
    id: string;
    quantity: number;
    type: 'IN' | 'OUT';
    reason: string;
    timestamp: string;
    recordedBy: string;
}

export interface StockAlertDTO {
    id: string;
    itemId: string;
    alertType: AlertType;
    severity: AlertSeverity;
    triggeredAt: string;
    resolvedAt: string | null;
    resolvedBy: string | null;
}

// ---- Report Types ----

export interface MonthlyReportDTO {
    id: string;
    committeeId: string;
    committeeName?: string;
    period: string;
    status: ReportStatus;
    content?: Record<string, unknown>;
    createdAt: string;
    updatedAt: string;
}

// ---- Complaint Types ----

export interface ComplaintDTO {
    id: string;
    subject: string;
    description: string;
    targetCommitteeId: string;
    status: ComplaintStatus;
    createdAt: string;
}

// ---- Domain: Secourisme ----

export interface RescueEquipmentDTO {
    id?: string;
    committeeId?: string;
    name?: string;
    type?: string;
    status?: string;
    quantity?: number;
}

export interface RescueDeviceDTO {
    id?: string;
    committeeId?: string;
    eventName: string;
    eventDate: string;
    location: string;
    requiredRescuers: number;
    assignedRescuers?: string[];
    equipmentList?: string[];
    status: string;
}

// ---- Domain: Diffusion ----

export interface EducationalResourceDTO {
    id?: string;
    title: string;
    category: string;
    contentType: string;
    fileUrl?: string;
    topic?: string;
    language?: string;
}

export interface AwarenessCampaignDTO {
    id?: string;
    name?: string;
    title?: string;
    description?: string;
    startDate?: string;
    endDate?: string;
    status?: string;
}

// ---- Domain: Jeunesse ----

export interface YouthIntegrationFormDTO {
    id?: string;
    volunteerId?: string;
    volunteerName?: string;
    committeeId?: string;
    aspirations?: string[];
    skills?: string[];
    aptitudes?: string[];
    interestAreas?: string[];
    submittedAt?: string;
}

export interface YouthFormTemplateDTO {
    id?: string;
    title: string;
    description: string;
    questions: string; // JSON string
    targetLevel: string;
    committeeId?: string;
    createdAt?: string;
}

export interface YouthFormResponseDTO {
    id?: string;
    idFormTemplate: string;
    idVolunteer: string;
    volunteerName?: string;
    responses: string; // JSON string
    submittedAt?: string;
}

export interface YouthRecommendationDTO {
    id?: string;
    formId: string;
    title: string;
    description: string;
    category: string;
    target: string;
    priority: string;
    status: string;
    dateCreation?: string;
}

export interface YouthStatsDTO {
    totalForms: number;
    totalResponses: number;
    totalProjects: number;
    totalRecommendations: number;
    ageDemographics: { type: string; value: number }[];
}

export interface MicroProjectDTO {
    id?: string;
    title: string;
    theme: string;
    description: string;
    leadVolunteerId?: string;
    participants?: string[];
    startDate: string;
    endDate?: string;
    status?: string;
}

// ---- Domain: Santé ----

export interface HealthActionDTO {
    id?: string;
    committeeId?: string;
    title?: string;
    type?: string;
    date?: string;
    [key: string]: unknown;
}

export interface BloodDonationDTO {
    id?: string;
    donorVolunteerId: string;
    bloodType: string;
    donationDate: string;
    collectionCenter: string;
    zone?: string;
    quantity?: number;
    status?: string;
}

// ---- Domain: Social ----

export interface FamilyDTO {
    id?: string;
    familyName: string;
    headOfFamily: string;
    members: number;
    address: string;
    gpsCoordinates?: { lat: number; lng: number };
    needsType?: string[];
    urgentNeeds?: string[];
    eventTags?: string[];
    registeredAt?: string;
    lastVisitDate?: string;
    status: string;
}

export interface SocialActionDTO {
    id?: string;
    familyId?: string;
    actionType?: string;
    eventContext?: string;
    aidProvided?: Record<string, unknown>;
    quantity?: number;
    performedBy?: string;
    performedAt?: string;
    photosUrls?: string[];
    notes?: string;
}

export interface VulnerabilityScoreDTO {
    id?: string;
    familyId: string;
    score: number;
    factors?: Record<string, number>;
    calculatedAt?: string;
    trend: 'STABLE' | 'IMPROVING' | 'WORSENING';
}

export interface SocialAnalyticsDTO {
    totalFamilies: number;
    totalMembers: number;
    activeFamilies: number;
    totalActions: number;
    familiesByStatus: Record<string, number>;
    actionsByType: Record<string, number>;
    needsDistribution: Record<string, number>;
    urgentCases: number;
    eventTagDistribution: Record<string, number>;
    vulnerabilityBands: { critical: number; high: number; moderate: number; low: number };
    trendOverview: Record<string, number>;
    priorityFamilies: Array<{ familyId: string; score: number; trend: string; familyName?: string; members?: number }>;
}

// ---- Domain: Immigration ----

export interface MigrantCaseDTO {
    id?: string;
    fullName: string;
    nationality: string;
    arrivalDate: string;
    legalSituation: string;
    accommodationType?: string;
    status?: string;
}

export interface FamilyLinkCaseDTO {
    id?: string;
    status?: string;
    [key: string]: unknown;
}

// ---- Domain: VFF ----

export interface VictimCaseDTO {
    id?: string;
    victimAge: number;
    victimGender: string;
    victimType: string;
    incidentType: string;
    incidentDate: string;
    riskLevel: string;
    isConfidential?: boolean;
    accessRestricted?: boolean;
    status?: string;
}

export interface ProtectionCampaignDTO {
    id?: string;
    name?: string;
    description?: string;
    status?: string;
    [key: string]: unknown;
}

// ---- Common / Shared Types ----

export interface PaginatedResponse<T> {
    data: T[];
    total: number;
    page: number;
    pageSize: number;
    totalPages: number;
}

export interface ApiError {
    statusCode: number;
    message: string;
    errors?: Record<string, string[]>;
}

export interface SelectOption {
    label: string;
    value: string | number;
}

export interface TableParams {
    page: number;
    pageSize: number;
    sortField?: string;
    sortOrder?: 'ascend' | 'descend';
    filters?: Record<string, string | string[]>;
    search?: string;
}

// Legacy types kept for compatibility
export type CommitteeLevel = 'national' | 'regional' | 'local' | 'club_universitaire';

export interface Certification {
    id: string;
    name: string;
    issuedBy: string;
    issuedAt: string;
    expiresAt?: string;
    documentUrl?: string;
}

export interface AuthTokens {
    accessToken: string;
    refreshToken: string;
    expiresIn: number;
}
// ---- Crisis / MS4 Types ----
export * from './crisisTypes';
