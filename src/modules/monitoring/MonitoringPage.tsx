import { useQuery } from '@tanstack/react-query';
import { api } from '../../shared/api/instance';
import { Section } from '../../shared/ui/Section';

// Агрегований ендпоїнт замість восьми запитів (А-16).
interface ServiceHealth {
  service: string;
  status: 'up' | 'down';
  uptime24h: number;
  errorRate5m: number;
  p95ms: number;
  sampledAt: string;
}

// Опитування раз на 30 с у видимій вкладці: метрики вже агреговані, push нічого
// не додає. Застереження: коли лежить шлюз, цей екран мовчить саме тоді, коли
// найпотрібніший. Алерти мають іти із зовнішнього інструменту, а не звідси.

export default function MonitoringPage() {
  const services = useQuery({
    queryKey: ['monitoring', 'services'],
    queryFn: () => api.get<ServiceHealth[]>('/monitoring/services'),
    refetchInterval: 30_000,
    staleTime: 0,
  });
  return (
    <div className="page">
      <h1>Моніторинг сервісів</h1>
      <Section title="Стан восьми сервісів" query={services}>
        {(list) => (
          <table className="table">
            <thead><tr><th>Сервіс</th><th>Стан</th><th>Аптайм 24 год</th><th>Помилки 5 хв</th><th>p95</th></tr></thead>
            <tbody>
              {list.map((s) => (
                <tr key={s.service}>
                  <td>{s.service}</td>
                  <td><span className={`sla sla--${s.status === 'up' ? 'ok' : 'overdue'}`}><span className="sla__dot" aria-hidden />{s.status === 'up' ? 'працює' : 'лежить'}</span></td>
                  <td>{s.uptime24h.toFixed(2)}%</td>
                  <td>{(s.errorRate5m * 100).toFixed(1)}%</td>
                  <td>{s.p95ms} мс</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Section>
    </div>
  );
}
