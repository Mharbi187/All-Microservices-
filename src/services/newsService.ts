// ============================================================
// NEXUS-AID — News Service (Frontend)
// Connexion dynamique au backend /api/v1/news
// Portée : LOCAL | REGIONAL | NATIONAL (CommitteeType backend)
// ============================================================

import api from './api';

// ── Types (alignés sur NewsDTO et NewsCreateDTO backend) ──────

/** Portée hiérarchique CRT (aligne sur CommitteeType Java enum) */
export type TargetScope = 'LOCAL' | 'REGIONAL' | 'NATIONAL';

/** Statut de validation workflow */
export type NewsStatus = 'EN_ATTENTE' | 'PUBLIE' | 'REJETE';

export interface NewsItemDTO {
  id: string;
  title: string;
  summary: string;
  content: string;
  /** ex: 'NATIONAL' | 'EVENT' | 'FORMATION' | 'COMMITTEE' | 'URGENCE' */
  category: string;
  authorName: string;
  committeeId?: string;
  committeeName?: string;
  imageUrl?: string;
  publishedAt?: string;
  likesCount: number;
  isLiked: boolean;
  /** Tags optionnels */
  tags?: string[];
  /** Portée hiérarchique : LOCAL | REGIONAL | NATIONAL */
  targetScope: TargetScope;
  /** Statut : EN_ATTENTE | PUBLIE | REJETE */
  status: NewsStatus;
}

export interface NewsCreateDTO {
  title: string;
  summary: string;
  content: string;
  category: string;
  imageUrl?: string;
  committeeId?: string;
  /** Portée hiérarchique : LOCAL | REGIONAL | NATIONAL */
  targetScope: TargetScope;
}

// ── Service ───────────────────────────────────────────────────

const newsService = {
  /** Récupère toutes les actualités visibles pour l'utilisateur courant */
  async getAll(params?: { committeeId?: string; category?: string }): Promise<NewsItemDTO[]> {
    const res = await api.get<NewsItemDTO[]>('/news', { params });
    return Array.isArray(res.data) ? res.data : [];
  },

  /** Crée une actualité (status = EN_ATTENTE sauf si scope NATIONAL) */
  async createNews(data: NewsCreateDTO): Promise<NewsItemDTO> {
    const res = await api.post<NewsItemDTO>('/news', data);
    return res.data;
  },

  /** Toggle like sur une actualité */
  async toggleLike(newsId: string): Promise<NewsItemDTO> {
    const res = await api.post<NewsItemDTO>(`/news/${newsId}/like`);
    return res.data;
  },

  /** Alias court utilisé par NewsPage */
  async like(newsId: string): Promise<void> {
    await this.toggleLike(newsId).catch(() => {});
  },

  /** Supprime une actualité */
  async deleteNews(newsId: string): Promise<void> {
    await api.delete(`/news/${newsId}`);
  },

  // ── Validation workflow (Président / VP uniquement) ──────────

  /**
   * Récupère les actualités en attente de validation pour un comité.
   * Filtre côté frontend sur status = EN_ATTENTE.
   */
  async getPendingValidation(committeeId?: string): Promise<NewsItemDTO[]> {
    const all = await this.getAll({ committeeId });
    return all.filter(n => n.status === 'EN_ATTENTE');
  },

  // ── Helpers de présentation ───────────────────────────────────

  scopeLabel(scope: TargetScope): string {
    return { LOCAL: 'Local', REGIONAL: 'Régional', NATIONAL: 'National' }[scope] ?? scope;
  },

  scopeColor(scope: TargetScope): string {
    return { LOCAL: '#3B82F6', REGIONAL: '#8B5CF6', NATIONAL: '#DC2626' }[scope] ?? '#6B7280';
  },

  statusLabel(status: NewsStatus): string {
    return { EN_ATTENTE: 'En Attente', PUBLIE: 'Publié', REJETE: 'Rejeté' }[status] ?? status;
  },

  statusColor(status: NewsStatus): string {
    return { EN_ATTENTE: '#B45309', PUBLIE: '#15803D', REJETE: '#DC2626' }[status] ?? '#6B7280';
  },

  /**
   * Retourne une chaîne de temps relatif (ex: «Il y a 3 j», «Il y a 2 h»).
   * Utilisé par NewsPage pour afficher l'heure de publication.
   */
  timeAgo(isoDate?: string): string {
    if (!isoDate) return '';
    const diff = Date.now() - new Date(isoDate).getTime();
    const mins = Math.floor(diff / 60_000);
    if (mins < 1) return 'À l\'instant';
    if (mins < 60) return `Il y a ${mins} min`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `Il y a ${hrs} h`;
    const days = Math.floor(hrs / 24);
    if (days < 30) return `Il y a ${days} j`;
    const months = Math.floor(days / 30);
    return `Il y a ${months} mois`;
  },
};

export default newsService;
