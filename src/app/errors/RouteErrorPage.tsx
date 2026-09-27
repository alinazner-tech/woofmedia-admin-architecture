import { useRouteError } from 'react-router';
import { isStaleChunkError } from './staleChunk';

// Межа маршруту. Окремо ловимо випадок застарілого chunk після деплою:
// людина бачить «оновіть сторінку», а не білий екран (Б-15).

export function RouteErrorPage() {
  return <ChunkLoadErrorPage error={useRouteError()} />;
}

/** Екран для помилки маршруту: окремо — застарілий chunk, окремо — збій рендеру модуля. */
export function ChunkLoadErrorPage({ error }: { error: unknown }) {
  if (isStaleChunkError(error)) {
    return (
      <div className="page page--center" role="alert">
        <h1>Вийшла нова версія панелі</h1>
        <p className="muted">Оновіть сторінку, щоб продовжити.</p>
        <button type="button" className="btn" onClick={() => location.reload()}>
          Оновити
        </button>
      </div>
    );
  }
  return (
    <div className="page page--center" role="alert">
      <h1>Щось пішло не так на цій сторінці</h1>
      <p className="muted">Меню й інші розділи працюють.</p>
    </div>
  );
}
