// ============================================================
// NEXUS-AID — Calendar Service (Frontend)
// Connexion dynamique au backend /api/v1/events
// Portée : LOCAL | REGIONAL | NATIONAL (CommitteeType backend)
// ============================================================

import api from './api';

// ── Types (alignés sur CalendarEventDTO / CalendarEventCreateDTO backend) ──

/** Portée hiérarchique CRT (aligne sur CommitteeType Java enum) */
export type TargetScope = 'LOCAL' | 'REGIONAL' | 'NATIONAL';

/** Statut workflow événement */
export type EventStatus = 'EN_ATTENTE' | 'VALIDE' | 'REJETE' | 'ANNULE';

export interface CalendarEventDTO {
  id: string;
  title: string;
  description?: string;
  /** ex: 'EVENT' | 'FORMATION' | 'REUNION' | 'COLLECTE' | 'URGENCE' | 'DIFFUSION' */
  type: string;
  startDate: string;
  endDate: string;
  location?: string;
  organizerName: string;
  committeeId?: string;
  committeeName?: string;
  maxParticipants?: number;
  registeredCount: number;
  isRegistered?: boolean;
  /** Portée hiérarchique : LOCAL | REGIONAL | NATIONAL */
  targetScope: TargetScope;
  /** Statut : EN_ATTENTE | VALIDE | REJETE | ANNULE */
  status: EventStatus;
}

export interface CalendarEventCreateDTO {
  title: string;
  description?: string;
  type: string;
  startDate: string;
  endDate: string;
  location?: string;
  committeeId?: string;
  maxParticipants?: number;
  /** Portée hiérarchique : LOCAL | REGIONAL | NATIONAL */
  targetScope: TargetScope;
}

// ── Service ───────────────────────────────────────────────────

const calendarService = {
  /** Récupère tous les événements visibles pour l'utilisateur courant */
  async getUpcomingEvents(): Promise<CalendarEventDTO[]> {
    const res = await api.get<CalendarEventDTO[]>('/events');
    return Array.isArray(res.data) ? res.data : [];
  },

  /** Alias pour compatibilité — accepte month/year optionnels (ignorés si le backend ne les supporte pas encore) */
  async getEvents(_month?: number, _year?: number): Promise<CalendarEventDTO[]> {
    return this.getUpcomingEvents();
  },

  /** Crée un événement (status = EN_ATTENTE sauf si scope NATIONAL) */
  async createEvent(data: CalendarEventCreateDTO): Promise<CalendarEventDTO> {
    const res = await api.post<CalendarEventDTO>('/events', data);
    return res.data;
  },

  /** S'inscrire / se désinscrire d'un événement */
  async toggleRegistration(eventId: string): Promise<CalendarEventDTO> {
    const res = await api.post<CalendarEventDTO>(`/events/${eventId}/register`);
    return res.data;
  },

  /** Alias court utilisé par CalendarPage */
  async register(eventId: string): Promise<CalendarEventDTO> {
    return this.toggleRegistration(eventId);
  },

  /** Supprime un événement */
  async deleteEvent(eventId: string): Promise<void> {
    await api.delete(`/events/${eventId}`);
  },

  // ── Validation workflow (Président / VP) ───────────────────

  /**
   * Récupère les événements en attente de validation.
   * Filtre côté frontend sur status = EN_ATTENTE.
   */
  async getPendingValidation(): Promise<CalendarEventDTO[]> {
    const all = await this.getUpcomingEvents();
    return all.filter(e => e.status === 'EN_ATTENTE');
  },

  // ── Helpers de présentation ───────────────────────────────────

  scopeLabel(scope: TargetScope): string {
    return { LOCAL: 'Local', REGIONAL: 'Régional', NATIONAL: 'National' }[scope] ?? scope;
  },

  scopeColor(scope: TargetScope): string {
    return { LOCAL: '#3B82F6', REGIONAL: '#8B5CF6', NATIONAL: '#DC2626' }[scope] ?? '#6B7280';
  },

  statusLabel(status: EventStatus): string {
    return { EN_ATTENTE: 'En Attente', VALIDE: 'Validé', REJETE: 'Rejeté', ANNULE: 'Annulé' }[status] ?? status;
  },

  statusColor(status: EventStatus): string {
    return { EN_ATTENTE: '#B45309', VALIDE: '#15803D', REJETE: '#DC2626', ANNULE: '#6B7280' }[status] ?? '#6B7280';
  },

  typeColor(type: string): string {
    const m: Record<string, string> = {
      DIFFUSION: '#F59E0B', EVENT: '#10B981', FORMATION: '#3B82F6',
      REUNION: '#8B5CF6', URGENCE: '#EF4444', COLLECTE: '#F97316',
    };
    return m[type] ?? '#6B7280';
  },

  typeLabel(type: string): string {
    const m: Record<string, string> = {
      DIFFUSION: 'Diffusion',
      EVENT: 'Événement',
      FORMATION: 'Formation',
      REUNION: 'Réunion',
      URGENCE: 'Urgence',
      COLLECTE: 'Collecte',
    };
    return m[type] ?? type;
  },

  /** Formate une date ISO en chaîne lisible (ex: «Lundi 12 Mai 2025») */
  formatDate(isoDate: string): string {
    const d = new Date(isoDate);
    const DAYS = ['Dimanche', 'Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi'];
    const MONTHS = [
      'Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin',
      'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre',
    ];
    return `${DAYS[d.getDay()]} ${d.getDate()} ${MONTHS[d.getMonth()]} ${d.getFullYear()}`;
  },

  /** Formate une date ISO en heure locale (ex: «14:30») */
  formatTime(isoDate: string): string {
    const d = new Date(isoDate);
    return d.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
  },

  /**
   * Regroupe un tableau d'événements par jour (clé: YYYY-MM-DD).
   * Utilisé par CalendarPage pour construire la grille mensuelle.
   */
  groupByDay(events: CalendarEventDTO[]): Record<string, CalendarEventDTO[]> {
    const map: Record<string, CalendarEventDTO[]> = {};
    for (const ev of events) {
      const key = new Date(ev.startDate).toISOString().slice(0, 10);
      if (!map[key]) map[key] = [];
      map[key].push(ev);
    }
    return map;
  },
};

export default calendarService;
