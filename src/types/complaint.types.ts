export const ComplaintStatus = {
  EN_ATTENTE: 'EN_ATTENTE',
  EN_COURS: 'EN_COURS',
  RESOLU: 'RESOLU',
  REJETE: 'REJETE',
} as const;
export type ComplaintStatus = typeof ComplaintStatus[keyof typeof ComplaintStatus];

export const ComplaintVisibility = {
  ANONYMOUS: 'ANONYMOUS',
  VISIBLE: 'VISIBLE',
} as const;
export type ComplaintVisibility = typeof ComplaintVisibility[keyof typeof ComplaintVisibility];

export interface ComplaintAttachment {
  id: string;
  fileName: string;
  fileUrl: string;
  fileType: string;
}

export interface ComplaintResponse {
  id: string;
  message: string;
  createdAt: string;
  responderId: string;
  responderName: string;
  responderAvatar?: string;
}

export interface ComplaintDto {
  id: string;
  subject: string;
  message: string;
  visibility: ComplaintVisibility;
  status: ComplaintStatus;
  createdAt: string;
  updatedAt: string;
  submitterId?: string | null;
  submitterName?: string;
  submitterType?: 'RESPONSABLE' | 'VOLONTAIRE';
  targetCommitteeId: string;

  targetCommitteeName: string;
  attachments: ComplaintAttachment[];
  responses: ComplaintResponse[];
}

export interface ComplaintCreateDto {
  subject: string;
  message: string;
  targetCommitteeId: string;
  visibility: ComplaintVisibility;
}

export interface ComplaintStatusUpdateDto {
  status: ComplaintStatus;
  responseMessage?: string;
}
