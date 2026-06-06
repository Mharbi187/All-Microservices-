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
    | 'RESP_VFF'
    | 'PRESIDENT_LOCAL'
    | 'PRESIDENT_REGIONAL'
    | 'PRESIDENT_NATIONAL'
    | 'VICE_PRESIDENT_LOCAL'
    | 'VICE_PRESIDENT_REGIONAL'
    | 'VICE_PRESIDENT_NATIONAL'
    | 'SECRETAIRE_GENERAL_LOCAL'
    | 'SECRETAIRE_GENERAL_REGIONAL'
    | 'SECRETAIRE_GENERAL_NATIONAL'
    | 'RESP_DIFFUSION_NATIONAL';

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
    /** Raw role objects from backend: [{role, committee, committeeType, committeeId}] */
    rawRoles?: ProfileRoleEntry[];
    committeeId?: string;
    committeeName?: string;
    status?: AccountStatus;
    /** Whether the volunteer has completed the post-approval extended profile form */
    firstLoginCompleted?: boolean;
    // Volunteer-specific
    matricule?: string;
    skills?: string;
    cin?: string;
    hoursVolunteered?: number;
    dateAdhesion?: string;
    bloodType?: string;
    // Kept for UI compatibility
    firstName?: string;
    lastName?: string;
    role?: Role;
    avatar?: string;
    phone?: string;
    address?: string;
    educationLevel?: string;
    isActive?: boolean;
    /** Trainer-specific: JSON array of expertise domain names, e.g. ["SECOURISME", "RCP"] */
    trainerDomains?: string[];
}

export interface AuthResponse {
    token: string;
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
    captchaToken?: string;
}

export interface RegisterData {
    fullName: string;
    email: string;
    password: string;
    cin: string;
    phone: string;
    birthDate?: string;          // format: YYYY-MM-DD
    userType: UserType;
    // Volunteer/Trainer fields
    matricule?: string;
    skills?: string;
    committeeId?: string;
    expertiseDomains?: string;
    // Donor fields
    preferredCategories?: string;
    targetZones?: string;
    captchaToken?: string;
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
    firstLoginCompleted?: boolean;
    // Volunteer fields
    matricule?: string;
    cin?: string;
    skills?: string;
    hoursVolunteered?: number;
    dateAdhesion?: string;
    bloodType?: string;
    phone?: string;
    address?: string;
    educationLevel?: string;
    avatar?: string;
    committeeId?: string;
    trainerDomains?: string | string[];
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
    pendingVolunteers: number;
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
    bloodType?: string;
}

// ---- Stock/Inventory Types ----

export interface StorageLocationDTO {
    id?: string;
    name: string;
    type: 'ENTREPOT' | 'PHARMACIE' | 'BUREAU' | 'AUTRE';
    acquisitionType: 'LOUE' | 'ACHETE' | 'DON' | 'AUTRE';
    address?: string;
    gpsLatitude?: number;
    gpsLongitude?: number;
    photo?: string;
    capacity?: number;
    committeeId: string;
    status?: 'ACTIVE' | 'INACTIVE';
}

export interface InventoryItemDTO {
    id: string;
    name: string;
    category: StockCategory;
    currentQuantity: number;
    minThreshold: number;
    storageLocationId?: string;
}

export interface StockMovementDTO {
    quantity: number;
    reason: string;
    proofPhoto?: string;
    recordedByName?: string;
    itemCondition?: string;
    supplier?: string;
    receivedBy?: string;
}

export interface StockMovementResponse {
    id: string;
    quantity: number;
    type: 'IN' | 'OUT';
    reason: string;
    timestamp: string;
    recordedBy: string;
    status?: 'PENDING' | 'APPROVED' | 'REJECTED';
    proofPhoto?: string;
    approvedBy?: string;
    approvedByName?: string;
    approvedAt?: string;
    rejectionReason?: string;
    recordedByName?: string;
    itemCondition?: string;
    supplier?: string;
    receivedBy?: string;
    inventoryItem?: {
        id: string;
        name: string;
        category: string;
        currentQuantity: number;
    };
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
    lastInspectionDate?: string;
    imageUrl?: string;
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
    volunteersNeeded?: boolean;
    volunteersCount?: number;
    actionChiefName?: string;
    eventTime?: string;
    approvalStatus?: string; // PENDING, APPROVED, REJECTED
}

// ---- Domain: Diffusion ----

export interface EducationalResourceDTO {
    id?: string;
    title: string;
    description?: string;
    category: string;
    contentType: string;
    fileUrl?: string;
    contentUrl?: string;
    tags?: string[];
    topic?: string;
    language?: string;
}

export interface AwarenessCampaignDTO {
    id?: string;
    name?: string;
    title?: string;
    description?: string;
    targetAudience?: string;
    channels?: string[];
    startDate?: string;
    endDate?: string;
    status?: string;
    imageUrl?: string;
    location?: string;
    volunteersNeeded?: number;
    collaborationType?: string; // "INTERNAL" or "COLLABORATION"
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
    status?: string;
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
    formId?: string;
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
    actionType?: string;
    date?: string;
    startDate?: string;
    endDate?: string;
    location?: string;
    address?: string;
    gpsCoordinates?: { lat: number; lng: number };
    beneficiaries?: number;
    beneficiariesCount?: number;
    status?: string;
    description?: string;
    priority?: string;           // URGENCE, HAUTE, NORMALE, FAIBLE
    category?: string;
    // Volontaires
    volunteersNeeded?: boolean;
    volunteersCount?: number;
    collaborationType?: string;  // INTERNAL, EXTERNAL
    volunteersList?: Array<{ id?: string; name: string; committeeId?: string }>;
    // Chef d'action
    actionChiefName?: string;
    actionChiefPhotoUrl?: string;
    actionChiefId?: string;
    // Hôpital
    hospitalDestination?: string;
    // Médias
    photosUrls?: string[];
    filesUrls?: string[];
    // Traçabilité
    createdBy?: string;
    [key: string]: unknown;
}

export interface BloodDonationDTO {
    id?: string;
    donorVolunteerId?: string;
    donorId?: string;
    committeeId?: string;
    bloodType: string;
    donationDate: string;
    collectionCenter: string;
    zone?: string;
    quantity?: number;
    status?: string;
    notes?: string;
    // Hôpital & Bénéficiaire
    hospitalDestination?: string;
    beneficiaryName?: string;
    // Volontaires
    volunteersNeeded?: boolean;
    volunteersCount?: number;
    // Chef d'action
    actionChiefName?: string;
    actionChiefId?: string;
    // Médias
    photosUrls?: string[];
    volunteersList?: Array<{ id?: string; name: string; committeeId?: string }>;
}

// ---- Domain: Distribution Médicale ----

export interface MedicalDistributionDTO {
    id?: string;
    committeeId?: string;
    resourceType: string;       // MEDICAMENTS, KITS_MEDICAUX, POCHES_SANG, EQUIPEMENTS, DISPOSITIFS_MEDICAUX, DOCUMENTS_MEDICAUX, AUTRES
    title: string;
    description?: string;
    destinationType?: string;   // HOPITAL, ASSOCIATION, MISSION, COMITE, BENEFICIAIRE
    destinationName?: string;
    destinationAddress?: string;
    quantity?: number;
    unit?: string;
    status?: string;            // PENDING, APPROVED, REJECTED, DISTRIBUTED
    requestedBy?: string;
    requestedByName?: string;
    requestedAt?: string;
    approvedBy?: string;
    approvedByName?: string;
    approvedAt?: string;
    rejectionReason?: string;
    notes?: string;
    photosUrls?: string[];
    documentsUrls?: string[];
}

// ---- Domain: Social ----

export interface FamilyDTO {
    id?: string;
    headOfFamily?: string;
    headOfHousehold?: string;
    householdSize?: number;
    address?: string;
    phoneNumber?: string;
    incomeCategory?: string;
    status?: string;
    members?: number;
    familyName?: string;
    cin?: string;
    recipientName?: string;
    imageUrl?: string;
    gpsCoordinates?: { lat: number; lng: number };
    needsType?: string[];
    urgentNeeds?: string[];
    eventTags?: string[];
    registeredAt?: string;
    lastVisitDate?: string;
}

export interface SocialActionDTO {
    id?: string;
    familyId?: string;
    type?: string;
    date?: string;
    description?: string;
    status?: string;
    assignedVolunteerId?: string | null;
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
    fullName?: string;
    migrantName?: string;
    dateOfBirth?: string;
    nationality?: string;
    arrivalDate?: string;
    legalSituation?: string;
    accommodationType?: string;
    gender?: string;
    notes?: string;
    status?: string;
}

export interface FamilyLinkCaseDTO {
    id?: string;
    migrant1Id?: string;
    migrant2Id?: string;
    relationshipType?: string;
    status?: string;
    resolutionNotes?: string;
    resolvedDate?: string;
    [key: string]: unknown;
}

// ---- Domain: VFF ----

export interface VictimCaseDTO {
    id?: string;
    victimName?: string;
    victimAge?: number;
    victimGender?: string;
    incidentType?: string;
    incidentDate?: string;
    riskLevel?: string;
    status?: string;
    victimType?: string;
    gender?: string;
    age?: number;
    description?: string;
    priority?: string;
    isConfidential?: boolean;
    accessRestricted?: boolean;
    typeOfViolence?: string;
    createdAt?: string;
}

export interface ProtectionCampaignDTO {
    id?: string;
    name?: string;
    title?: string;
    description?: string;
    status?: string;
    startDate?: string;
    endDate?: string;
    targetAudience?: string;
    location?: string;
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

// ---- Additional VFF Types ----
export interface ShelterDTO {
    id?: string;
    name: string;
    address?: string;
    manager?: string;
    phone?: string;
    capacity: number;
    available: number;
    region?: string;
    services: string[];
}

export interface PartnerDTO {
    id?: string;
    type: string;
    label: string;
    region?: string;
    phone?: string;
    address?: string;
    latitude?: number;
    longitude?: number;
}

// ---- RCP AI Evaluation Types ----

export type ParticipantLevel = 'DEBUTANT' | 'INTERMEDIAIRE' | 'AVANCE' | 'PROFESSIONNEL';
export type ConcordanceLevel = 'EXCELLENT' | 'BON' | 'MOYEN' | 'FAIBLE';
export type TrainerDecision = 'PRET' | 'AMELIORATIONS_MINEURES' | 'AMELIORATIONS_MAJEURES' | 'NON_RECOMMANDE';

export interface RcpEvaluationDTO {
    id?: string;
    committeeId?: string;
    committeeName?: string;
    trainerId?: string;
    trainerName: string;
    trainerCenter?: string;
    aiVersion?: string;
    evaluationDate?: string;       // YYYY-MM-DD
    evaluationTime?: string;       // HH:mm
    participantName?: string;
    participantEmail?: string;
    participantLevel?: ParticipantLevel;
    totalAttempts?: number;
    // Photos (base64)
    photoParticipant?: string;
    photoCardiacPosition?: string;
    photoAiScreenshot?: string;
    videoTestUrl?: string;
    // Evaluation data
    scores?: Record<string, number>;
    comments?: Record<string, string>;
    problemsEncountered?: string[];
    problemDescription?: string;
    // Results
    scoreIa?: number;
    scoreTrainer?: number;
    concordanceLevel?: ConcordanceLevel;
    concordanceGap?: number;
    recommendations?: { high?: string[]; medium?: string[]; low?: string[] };
    // Decision
    trainerDecision?: TrainerDecision;
    trainerFinalComments?: string;
    trainerSignature?: string;
    // Metadata
    createdAt?: string;
    updatedAt?: string;
}

export interface RcpNationalStatsDTO {
    totalEvaluations: number;
    avgScoreIa: number;
    avgScoreTrainer: number;
    byConcordance: Record<string, number>;
    byDecision: Record<string, number>;
    byCommittee: Record<string, number>;
    avgIaByCommittee: Record<string, number>;
}

// ============================================================
// ---- Domain: Catastrophes — NDRT/RDRT Mission Management ----
// ============================================================

export type MissionType = 'SECOURS' | 'EVACUATION' | 'LOGISTIQUE' | 'MEDICAL' | 'SURVEILLANCE';
export type MissionStatus = 'PLANNED' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED';
export type FieldReportStatus = 'PENDING' | 'SUBMITTED' | 'VALIDATED';

export interface GpsLocation {
    lat: number;
    lng: number;
    address?: string;
}

export interface AssignedVolunteerEntry {
    volunteerId: string;
    fullName: string;
    teamType?: string;  // NDRT or RDRT label
    matricule?: string;
    committeeId?: string;
    committeeName?: string;
    phone?: string;
}

export interface DisasterMissionDTO {
    id?: string;
    committeeId?: string;
    committeeName?: string;
    title: string;
    description?: string;
    missionType: MissionType;
    status?: MissionStatus;
    startDatetime: string;           // ISO datetime string
    endDatetime?: string;
    locationGps?: GpsLocation;
    teamChiefId?: string;
    teamChiefName?: string;
    assignedVolunteers?: AssignedVolunteerEntry[];
    requiredMaterials?: string[];
    instructions?: string;
    notificationSent?: boolean;
    reportTemplateId?: string;
    reportDeadline?: string;
    reportAssignedAt?: string;
    reportReminderSent?: boolean;
    missionNumber?: string;
    createdAt?: string;
    updatedAt?: string;
}

export interface DisasterTeamMemberDTO {
    id: string; // ID of the DisasterTeamMember entity
    volunteerId: string;
    fullName: string;
    email?: string;
    matricule?: string;
    phone?: string;
    committeeId?: string;
    committeeName?: string;
    committeeType?: string; // Adjust depending on CommitteeType enum usage
    teamType?: string;
    specialty?: string;
    status?: string; // ACTIVE, SUSPENDED
    skills?: string[] | string;
    isActive: boolean;
}

export interface DisasterFieldReportDTO {
    id?: string;
    missionId?: string;
    volunteerId?: string;
    volunteerName?: string;
    templateId?: string;
    responses?: Record<string, unknown>;
    status?: FieldReportStatus;
    submittedAt?: string;
    validatorNotes?: string;
    createdAt?: string;
}

