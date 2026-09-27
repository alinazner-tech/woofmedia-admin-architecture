import { useQuery } from '@tanstack/react-query';
import { api } from '../../shared/api/instance';
import { Section } from '../../shared/ui/Section';

interface PromptSummary {
  id: string;
  name: string;
  publishedVersion: number;
}

// Реліз 2: редактор, diff (jsdiff у цьому ж chunk) і відкат. Тут — список
// опублікованих версій, щоб показати ізоляцію модуля й окремий chunk.

export default function PromptsPage() {
  const prompts = useQuery({
    queryKey: ['prompts'],
    queryFn: () => api.get<PromptSummary[]>('/prompts'),
    staleTime: 0,
  });
  return (
    <div className="page">
      <h1>AI-промпти</h1>
      <Section title="Опубліковані промпти" query={prompts}>
        {(list) => (
          <table className="table">
            <thead><tr><th>Промпт</th><th>Версія</th></tr></thead>
            <tbody>
              {list.map((p) => (
                <tr key={p.id}><td>{p.name}</td><td>v{p.publishedVersion}</td></tr>
              ))}
            </tbody>
          </table>
        )}
      </Section>
    </div>
  );
}
