import { useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../../shared/api/instance';
import { broadcastInvalidate } from '../../shared/lib/tabSync';
import { projectKeys } from './keys';
import type { Project, ProjectId, ProjectStatus } from './types';

export interface TransitionInput {
  to: ProjectStatus;
  expectedVersion: number;
  comment?: string;
}

/**
 * Перехід статусу (розділ 4.2).
 * - Без оптимістичного оновлення: сервер може відмовити з причин, яких фронтенд не бачить.
 * - Idempotency-Key: повтор того самого натискання не створює другий перехід.
 * - 409 не повторюємо автоматично — людина має побачити, що статус уже змінився (Б-6ф).
 */
export function useTransition(id: ProjectId) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: TransitionInput) =>
      api.post<Project>(`/projects/${id}/transitions`, input, { 'Idempotency-Key': crypto.randomUUID() }),
    retry: false,
    onSuccess: (project) => {
      qc.setQueryData(projectKeys.detail(id), project);
      qc.invalidateQueries({ queryKey: projectKeys.lists() });
      broadcastInvalidate([projectKeys.lists(), projectKeys.detail(id)]);
    },
    onError: () => {
      qc.invalidateQueries({ queryKey: projectKeys.detail(id) });
    },
  });
}
