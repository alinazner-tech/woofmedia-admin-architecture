import { useState } from 'react';
import { isApiError } from '../../../shared/api/errors';
import { statusLabel, useTransition, type AllowedTransition, type Project } from '../../../entities/project';

/**
 * Кнопки будуються ТІЛЬКИ з allowedTransitions, які сервер обчислив для
 * поточного користувача (ADR-2, ADR-5). Клієнт не знає графа переходів.
 * Сховати кнопку — не захист [лише UX]: недозволений POST відхиляє шлюз (Б-5),
 * а цей компонент лише не пропонує зайвого (Б-5ф).
 */
export function TransitionBar({ project, disabled = false }: { project: Project; disabled?: boolean }) {
  const transition = useTransition(project.id);
  const [pending, setPending] = useState<AllowedTransition | null>(null);
  const [comment, setComment] = useState('');

  function run(t: AllowedTransition, text?: string) {
    transition.mutate(
      { to: t.to, expectedVersion: project.version, comment: text },
      { onSettled: () => { setPending(null); setComment(''); } },
    );
  }

  const err = transition.error;
  const conflict = isApiError(err) && err.status === 409;

  if (disabled) {
    return <span className="muted">Дії тимчасово вимкнені: дані можуть бути застарілими.</span>;
  }

  return (
    <div className="transitions">
      {project.allowedTransitions.length === 0 && (
        <span className="muted">Для вас немає доступних переходів у цьому стані.</span>
      )}
      {project.allowedTransitions.map((t) => (
        <button
          key={t.to}
          type="button"
          className="btn"
          disabled={transition.isPending}
          onClick={() => (t.requiresComment ? setPending(t) : run(t))}
        >
          → {statusLabel(t.to)}
        </button>
      ))}

      {pending && (
        <form
          className="comment"
          onSubmit={(e) => {
            e.preventDefault();
            if (comment.trim()) run(pending, comment.trim());
          }}
        >
          <label htmlFor="transition-comment">Коментар до переходу «{statusLabel(pending.to)}»</label>
          <textarea id="transition-comment" value={comment} onChange={(e) => setComment(e.target.value)} />
          <button type="submit" className="btn">Надіслати</button>
        </form>
      )}

      {conflict && (
        <p role="alert" className="notice">
          Статус уже змінився{err.currentStatus ? `: тепер «${statusLabel(err.currentStatus)}»` : ''}. Картку оновлено.
        </p>
      )}
      {err && !conflict && (
        <p role="alert" className="error">
          {isApiError(err) ? err.message : 'Не вдалося змінити статус'}
        </p>
      )}
    </div>
  );
}
