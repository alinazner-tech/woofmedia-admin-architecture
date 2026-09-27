import { useQuery } from '@tanstack/react-query';
import { api } from '../../shared/api/instance';
import { Section } from '../../shared/ui/Section';
import { formatUsd } from '../../shared/i18n/t';

// Типи модуля живуть у модулі: finance не імпортує навіть entities/project (розділ 1.2).
interface FinanceSummary {
  mrrUsd: number;
  activeSubscriptions: Record<'basic' | 'pro' | 'scale', number>;
}

// Лише супер-адмін. Chunk цього модуля спеціалісту не вантажиться (Б-3),
// а дані без finance.read шлюз не віддає взагалі (Б-4, перевіряється на стенді).
// Визначення метрик (churn, LTV) — на бекенді; панель їх не рахує.

export default function FinancePage() {
  const summary = useQuery({
    queryKey: ['finance', 'summary'],
    queryFn: () => api.get<FinanceSummary>('/finance/summary'),
    staleTime: 5 * 60_000,
  });
  return (
    <div className="page">
      <h1>Фінанси</h1>
      <Section title="MRR і підписки" query={summary}>
        {(s) => (
          <div className="kpis">
            <div className="kpi"><span className="kpi__label">MRR</span><span className="kpi__value">{formatUsd(s.mrrUsd)}</span></div>
            <div className="kpi"><span className="kpi__label">Basic</span><span className="kpi__value">{s.activeSubscriptions.basic}</span></div>
            <div className="kpi"><span className="kpi__label">Pro</span><span className="kpi__value">{s.activeSubscriptions.pro}</span></div>
            <div className="kpi"><span className="kpi__label">Scale</span><span className="kpi__value">{s.activeSubscriptions.scale}</span></div>
          </div>
        )}
      </Section>
    </div>
  );
}
