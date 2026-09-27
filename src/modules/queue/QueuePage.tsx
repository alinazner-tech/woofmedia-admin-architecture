import { Link } from 'react-router';
import { Section } from '../../shared/ui/Section';
import { SlaBadge, statusLabel, useProjectList } from '../../entities/project';

// Список рівно такий, яким його віддав шлюз. Обсяг (свої / команда / усі)
// визначає сервер за токеном — фронтенд нічого не фільтрує «для безпеки».
// Сортування за абсолютним deadlineAt: порядок не застаріває з часом.

export default function QueuePage() {
  const list = useProjectList();
  return (
    <div className="page">
      <h1>Черга проєктів</h1>
      <Section title="Активні проєкти" query={list}>
        {(projects) =>
          projects.length === 0 ? (
            <p className="muted">Проєктів немає.</p>
          ) : (
            <table className="table">
              <thead>
                <tr><th>Проєкт</th><th>Клієнт</th><th>Статус</th><th>SLA</th></tr>
              </thead>
              <tbody>
                {[...projects]
                  .sort((a, b) => Date.parse(a.deadlineAt) - Date.parse(b.deadlineAt))
                  .map((p) => (
                    <tr key={p.id}>
                      <td>
                        <Link to={`/projects/${p.id}`}>{p.title}</Link>
                        <div className="muted small">{p.type}</div>
                      </td>
                      <td>{p.clientName}</td>
                      <td><span className="status">{statusLabel(p.status)}</span></td>
                      <td><SlaBadge deadlineAt={p.deadlineAt} /></td>
                    </tr>
                  ))}
              </tbody>
            </table>
          )
        }
      </Section>
    </div>
  );
}
