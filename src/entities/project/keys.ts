import type { ProjectId } from './types';

export const projectKeys = {
  all: ['projects'] as const,
  lists: () => [...projectKeys.all, 'list'] as const,
  detail: (id: ProjectId) => [...projectKeys.all, 'detail', id] as const,
  checklist: (id: ProjectId) => [...projectKeys.detail(id), 'checklist'] as const,
  notes: (id: ProjectId) => [...projectKeys.detail(id), 'notes'] as const,
  credentials: (id: ProjectId) => [...projectKeys.detail(id), 'credentials'] as const,
};
