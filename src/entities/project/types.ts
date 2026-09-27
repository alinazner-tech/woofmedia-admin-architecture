// Типи проєкту. У реальному проєкті генеруються з OpenAPI шлюзу
// (openapi-typescript, ПТ-5); тут записані за контрактом, Додаток А.

// Вісім станів зі статусної машини ТЗ (п. 2.4).
export type ProjectStatus =
  | 'awaiting_assignment'
  | 'assigned'
  | 'in_progress'
  | 'needs_client_info'
  | 'on_review'
  | 'done'
  | 'published'
  | 'closed';

// Правка рев'ю до v3 (R2): перехід несе ознаку обовʼязкового коментаря,
// щоб UI попросив коментар ДО запиту, а не після відмови 422.
export interface AllowedTransition {
  to: ProjectStatus;
  requiresComment: boolean;
}

export type ProjectId = string;

export interface Project {
  id: ProjectId;
  title: string;
  clientName: string;
  type: string;
  assigneeId: string | null;
  teamId: string;
  status: ProjectStatus;
  version: number;
  deadlineAt: string; // UTC ISO-8601
  allowedTransitions: AllowedTransition[];
  allowedActions: string[];
}

export interface ChecklistItem {
  id: string;
  label: string;
  done: boolean;
}

export interface Note {
  id: string;
  visibility: 'internal' | 'client';
  text: string;
  author: string;
}

export interface Credentials {
  platform: string;
  login: string;
  secret: string;
}
