// ============================================================
// NEXUS-AID — Quiz Service (Frontend)
// Connexion dynamique au backend /api/v1/quizzes
// Portée hiérarchique : LOCAL | REGIONAL | NATIONAL
// ============================================================

import api from './api';

// ── Types ──────────────────────────────────────────────────────

export type TargetScope = 'LOCAL' | 'REGIONAL' | 'NATIONAL';
export type QuestionType = 'SINGLE' | 'MULTIPLE' | 'TRUE_FALSE';
export type QuizStatus = 'DRAFT' | 'PUBLISHED' | 'ARCHIVED';

export interface QuizQuestion {
  id?: string;
  text: string;
  type: QuestionType;
  options: string[];
  /** Indices des options correctes */
  correctAnswers: number[];
  points: number;
}

export interface QuizDTO {
  id: string;
  title: string;
  description: string;
  category: string;
  /** Score minimum pour réussir (0-100 %) */
  minScore: number;
  /** Durée limite en minutes (null = illimité) */
  timeLimit?: number;
  questions: QuizQuestion[];
  badgeTitle?: string;
  badgeColor?: string;
  committeeId?: string;
  committeeName?: string;
  createdByName?: string;
  createdAt: string;
  status: QuizStatus;
  targetScope?: TargetScope;
  totalParticipants?: number;
  passRate?: number;
}

export interface QuizCreateDTO {
  title: string;
  description: string;
  category: string;
  minScore: number;
  timeLimit?: number;
  questions: QuizQuestion[];
  badgeTitle?: string;
  badgeColor?: string;
  committeeId?: string;
  targetScope?: TargetScope;
}

export interface QuizAnswerDTO {
  questionIndex: number;
  selectedAnswers: number[];
}

export interface QuizSubmitDTO {
  quizId: string;
  answers: QuizAnswerDTO[];
  timeTaken?: number;
}

export interface QuizResultDTO {
  id: string;
  quizId: string;
  quizTitle: string;
  volunteerId: string;
  volunteerName: string;
  score: number;
  passed: boolean;
  badgeEarned?: string;
  badgeColor?: string;
  timeTaken?: number;
  submittedAt: string;
  answers: QuizAnswerDTO[];
}

// ── Service (100% dynamique, zéro mock) ───────────────────────

class QuizService {

  /** Liste tous les quiz du comité (Resp. Diffusion) */
  async getQuizzes(committeeId?: string): Promise<QuizDTO[]> {
    const res = await api.get<QuizDTO[]>('/quizzes', {
      params: committeeId ? { committeeId } : undefined,
    });
    return Array.isArray(res.data) ? res.data : [];
  }

  /** Liste uniquement les quiz publiés (visible aux volontaires) */
  async getPublishedQuizzes(committeeId?: string): Promise<QuizDTO[]> {
    const res = await api.get<QuizDTO[]>('/quizzes/published', {
      params: committeeId ? { committeeId } : undefined,
    });
    return Array.isArray(res.data) ? res.data : [];
  }

  /** Détail d'un quiz */
  async getQuizById(id: string): Promise<QuizDTO> {
    const res = await api.get<QuizDTO>(`/quizzes/${id}`);
    return res.data;
  }

  /** Crée un quiz en brouillon */
  async createQuiz(data: QuizCreateDTO): Promise<QuizDTO> {
    const res = await api.post<QuizDTO>('/quizzes', data);
    return res.data;
  }

  /** Publie un quiz (le rend visible aux volontaires) */
  async publishQuiz(quizId: string): Promise<QuizDTO> {
    const res = await api.put<QuizDTO>(`/quizzes/${quizId}/publish`);
    return res.data;
  }

  /** Archive un quiz (le retire du catalogue volontaire) */
  async archiveQuiz(quizId: string): Promise<void> {
    await api.put(`/quizzes/${quizId}/archive`);
  }

  /** Supprime un quiz */
  async deleteQuiz(quizId: string): Promise<void> {
    await api.delete(`/quizzes/${quizId}`);
  }

  /** Soumet les réponses d'un volontaire — renvoie le résultat calculé */
  async submitQuiz(data: QuizSubmitDTO): Promise<QuizResultDTO> {
    const res = await api.post<QuizResultDTO>('/quizzes/submit', data);
    return res.data;
  }

  /** Résultats personnels du volontaire connecté */
  async getMyResults(): Promise<QuizResultDTO[]> {
    const res = await api.get<QuizResultDTO[]>('/quizzes/my-results');
    return Array.isArray(res.data) ? res.data : [];
  }

  /** Résultats de tous les participants d'un quiz (Resp. Diffusion) */
  async getQuizResults(quizId: string): Promise<QuizResultDTO[]> {
    const res = await api.get<QuizResultDTO[]>(`/quizzes/${quizId}/results`);
    return Array.isArray(res.data) ? res.data : [];
  }

  // ── Helpers UI ───────────────────────────────────────────────

  categoryColor(cat: string): string {
    const m: Record<string, string> = {
      SECOURISME: '#EF4444',
      GOUVERNANCE: '#CC0000',
      SANTE: '#10B981',
      FORMATION: '#3B82F6',
      DIFFUSION: '#F59E0B',
    };
    return m[cat] ?? '#6B7280';
  }

  categoryLabel(cat: string): string {
    const m: Record<string, string> = {
      SECOURISME: 'Secourisme',
      GOUVERNANCE: 'Gouvernance',
      SANTE: 'Santé',
      FORMATION: 'Formation',
      DIFFUSION: 'Diffusion',
    };
    return m[cat] ?? cat;
  }

  statusColor(status: QuizStatus): string {
    return { PUBLISHED: '#10B981', DRAFT: '#F59E0B', ARCHIVED: '#6B7280' }[status] ?? '#6B7280';
  }

  statusLabel(status: QuizStatus): string {
    return { PUBLISHED: 'Publié', DRAFT: 'Brouillon', ARCHIVED: 'Archivé' }[status] ?? status;
  }
}

const quizService = new QuizService();
export default quizService;
