import type { ReactNode } from 'react';
import type { UseQueryResult } from '@tanstack/react-query';
import { isApiError } from '../api/errors';
import { formatTime, serviceLabel } from '../i18n/t';

// Кожен блок, що залежить від окремого сервісу, має власний стан запиту (розділ 10).
// Падіння одного сервісу гасить лише свій блок, а не сторінку.
//
// Три випадки помилки:
//  - 404: ресурсу немає або він поза обсягом — жодних даних із кешу (Б-1ф);
//  - збій, але дані вже були — показуємо їх із часом і БЕЗ дій (stale = true);
//  - збій і даних немає — заглушка з назвою сервісу й повтором.

interface SectionProps<T> {
  title: string;
  query: UseQueryResult<T>;
  notFoundText?: string;
  children: (data: T, stale: boolean) => ReactNode;
}

export function Section<T>({ title, query, notFoundText, children }: SectionProps<T>) {
  const err = query.error;
  let body: ReactNode;

  if (query.isPending) {
    body = <p className="muted">Завантаження…</p>;
  } else if (isApiError(err) && err.status === 404) {
    body = <p role="alert" className="notice">{notFoundText ?? 'Не знайдено або недоступно.'}</p>;
  } else if (query.isError && query.data !== undefined) {
    body = (
      <>
        <p role="status" className="notice notice--warn">
          {isApiError(err) ? `Не відповідає ${serviceLabel(err.service)}.` : 'Дані не оновлюються.'} Показано дані
          станом на {formatTime(query.dataUpdatedAt)}, дії тимчасово вимкнені.
        </p>
        {children(query.data, true)}
      </>
    );
  } else if (query.isError) {
    body = <SectionFallback error={err} onRetry={() => query.refetch()} />;
  } else {
    body = children(query.data as T, false);
  }

  return (
    <section className="section" aria-label={title}>
      <h2 className="section__title">{title}</h2>
      {body}
    </section>
  );
}

export function SectionFallback({ error, onRetry }: { error: unknown; onRetry?: () => void }) {
  const service = isApiError(error) ? error.service : undefined;
  const requestId = isApiError(error) ? error.requestId : undefined;
  return (
    <div className="fallback" role="alert">
      <strong>Розділ тимчасово недоступний</strong>
      <span>Не відповідає {serviceLabel(service)}. Решта сторінки працює.</span>
      {requestId && <code className="muted">запит: {requestId}</code>}
      {onRetry && (
        <button type="button" className="btn btn--ghost" onClick={onRetry}>
          Повторити
        </button>
      )}
    </div>
  );
}
