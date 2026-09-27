import { useState } from 'react';
import { useCredentials, type ProjectId } from '../../../entities/project';
import { SectionFallback } from '../../../shared/ui/Section';

/**
 * Доступи до рекламних кабінетів (А-7).
 * - Окремий запит лише за натисканням, у загальній картці їх немає.
 * - gcTime 0: закрили блок — дані зникли з кешу.
 * - Нічого не пишеться в localStorage / sessionStorage / IndexedDB (Б-12).
 * Згорнутий блок — не захист [лише UX]: чужі доступи шлюз не віддає взагалі (Б-12с).
 */
export function CredentialsBlock({ projectId }: { projectId: ProjectId }) {
  const [open, setOpen] = useState(false);
  const creds = useCredentials(projectId, open);

  if (!open) {
    return (
      <button type="button" className="btn btn--ghost" onClick={() => setOpen(true)}>
        Показати доступи до кабінетів
      </button>
    );
  }

  return (
    <div className="creds">
      {creds.isPending && <p className="muted">Завантаження…</p>}
      {creds.isError && <SectionFallback error={creds.error} onRetry={() => creds.refetch()} />}
      {creds.data && (
        <table className="table">
          <thead><tr><th>Кабінет</th><th>Логін</th><th>Ключ</th></tr></thead>
          <tbody>
            {creds.data.map((c) => (
              <tr key={c.platform}><td>{c.platform}</td><td>{c.login}</td><td><code>{c.secret}</code></td></tr>
            ))}
          </tbody>
        </table>
      )}
      <button type="button" className="btn btn--ghost" onClick={() => setOpen(false)}>
        Сховати
      </button>
    </div>
  );
}
