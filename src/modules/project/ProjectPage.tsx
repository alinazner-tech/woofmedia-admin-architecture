import { Link, useParams } from 'react-router';
import { Section } from '../../shared/ui/Section';
import { SlaBadge, statusLabel, useChecklist, useNotes, useProject } from '../../entities/project';
import { TransitionBar } from './transitions/TransitionBar';
import { CredentialsBlock } from './access/CredentialsBlock';

// Картка — набір незалежних блоків. Кожен ходить у свій сервіс і падає окремо (Б-7).

export default function ProjectPage() {
  const { id = '' } = useParams();
  const project = useProject(id);
  const checklist = useChecklist(id);
  const notes = useNotes(id);
  const hidden = project.isError && (project.error as { status?: number }).status === 404;

  return (
    <div className="page">
      <Link to="/queue" className="back">← До черги</Link>

      <Section title="Проєкт" query={project} notFoundText="Проєкт не знайдено або він вам недоступний.">
        {(p, stale) => (
          <div className="card-head">
            <h1>{p.title}</h1>
            <div className="card-head__meta">
              <span className="status">{statusLabel(p.status)}</span>
              <SlaBadge deadlineAt={p.deadlineAt} />
              <span className="muted">{p.clientName} · {p.type}</span>
            </div>
            <TransitionBar project={p} disabled={stale} />
          </div>
        )}
      </Section>

      {/* На 404 не показуємо жодного вкладеного блоку: навіть чек-лист чужого проєкту. */}
      {!hidden && (
        <>
          <div className="grid-2">
            <Section title="Чек-лист" query={checklist}>
              {(items) => (
                <ul className="checklist">
                  {items.map((i) => (
                    <li key={i.id} className={i.done ? 'done' : ''}>
                      <span aria-hidden>{i.done ? '☑' : '☐'}</span> {i.label}
                    </li>
                  ))}
                </ul>
              )}
            </Section>

            <Section title="Нотатки" query={notes}>
              {(list) => (
                <ul className="notes">
                  {list.map((n) => (
                    <li key={n.id}>
                      <span className={`tag tag--${n.visibility}`}>
                        {n.visibility === 'internal' ? 'внутрішня' : 'видно клієнту'}
                      </span>
                      {n.text}
                      <div className="muted small">{n.author}</div>
                    </li>
                  ))}
                </ul>
              )}
            </Section>
          </div>

          <section className="section" aria-label="Доступи до кабінетів">
            <h2 className="section__title">Доступи до рекламних кабінетів</h2>
            <CredentialsBlock projectId={id} />
          </section>
        </>
      )}
    </div>
  );
}
