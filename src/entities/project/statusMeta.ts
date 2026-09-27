import type { ProjectStatus } from './types';

// Лише мітки станів. Графа переходів фронтенд не знає (ADR-5).
const LABEL: Record<ProjectStatus, string> = {
  awaiting_assignment: 'Очікує призначення',
  assigned: 'Призначено',
  in_progress: 'В роботі',
  needs_client_info: 'Потрібна інформація від клієнта',
  on_review: 'На перевірці',
  done: 'Виконано',
  published: 'Опубліковано',
  closed: 'Закрито',
};

export function statusLabel(s: ProjectStatus | string): string {
  return LABEL[s as ProjectStatus] ?? s;
}
