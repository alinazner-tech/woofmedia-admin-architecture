import { useQuery } from '@tanstack/react-query';
import { api } from '../../shared/api/instance';
import { projectKeys } from './keys';
import type { ChecklistItem, Credentials, Note, Project, ProjectId } from './types';

// Зміна статусу — опитування у видимій вкладці + refetch при фокусі +
// BroadcastChannel між вкладками. SSE/WS не потрібні (розділ 5, ADR-4).
const LIST_POLL_MS = 30_000;
const CARD_POLL_MS = 15_000;

export function useProjectList() {
  return useQuery({
    queryKey: projectKeys.lists(),
    queryFn: () => api.get<Project[]>('/projects'),
    staleTime: 30_000,
    refetchInterval: LIST_POLL_MS,
  });
}

export function useProject(id: ProjectId) {
  return useQuery({
    queryKey: projectKeys.detail(id),
    queryFn: () => api.get<Project>(`/projects/${id}`),
    staleTime: 15_000,
    refetchInterval: CARD_POLL_MS,
  });
}

export function useChecklist(id: ProjectId) {
  return useQuery({
    queryKey: projectKeys.checklist(id),
    queryFn: () => api.get<ChecklistItem[]>(`/projects/${id}/checklist`),
    staleTime: 15_000,
  });
}

export function useNotes(id: ProjectId) {
  return useQuery({
    queryKey: projectKeys.notes(id),
    queryFn: () => api.get<Note[]>(`/projects/${id}/notes`),
    staleTime: 15_000,
  });
}

/**
 * Доступи до рекламних кабінетів: запит лише при розкритті блоку,
 * gcTime 0 — щойно блок закрито, дані зникають із кешу (А-7, Б-12).
 */
export function useCredentials(id: ProjectId, enabled: boolean) {
  return useQuery({
    queryKey: projectKeys.credentials(id),
    queryFn: () => api.get<Credentials[]>(`/projects/${id}/credentials`),
    enabled,
    staleTime: 0,
    gcTime: 0,
    retry: false,
  });
}
