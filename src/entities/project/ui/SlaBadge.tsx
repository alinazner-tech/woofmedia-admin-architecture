import { useNow } from '../../../shared/lib/time';
import { formatLeft, slaLevel } from '../sla';

const TITLE = { ok: 'є запас', warn: 'менше 3 год', overdue: 'прострочено' } as const;

export function SlaBadge({ deadlineAt }: { deadlineAt: string }) {
  const now = useNow();
  const level = slaLevel(deadlineAt, now);
  return (
    <span className={`sla sla--${level}`} title={TITLE[level]} data-sla={level}>
      <span className="sla__dot" aria-hidden />
      {formatLeft(deadlineAt, now)}
    </span>
  );
}
