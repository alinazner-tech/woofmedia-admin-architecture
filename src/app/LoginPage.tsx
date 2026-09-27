import { useState } from 'react';
import { api } from '../shared/api/instance';
import { session } from '../shared/session/token';

// ДЕМО-вхід: у локальному стенді з моком шлюзу обираємо одного з чотирьох
// тестових користувачів (спеціалісти двох команд, тімлід, супер-адмін). У реальній панелі тут форма логіну, а токен видає
// сервіс авторизації (А-1).

const DEMO_USERS = [
  { id: 'spec-a', label: 'Олена — спеціаліст, команда A' },
  { id: 'spec-b', label: 'Максим — спеціаліст, команда B' },
  { id: 'lead-a', label: 'Ірина — тімлід команди A' },
  { id: 'admin', label: 'Андрій — супер-адмін' },
];

export function LoginPage({ onLoggedIn }: { onLoggedIn: () => void }) {
  const [error, setError] = useState<string | null>(null);

  async function login(userId: string) {
    setError(null);
    try {
      const { accessToken } = await api.post<{ accessToken: string }>('/auth/login', { userId });
      session.set(accessToken);
      onLoggedIn();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Помилка входу');
    }
  }

  return (
    <div className="page page--center login">
      <div className="brand">🐾 WoofMedia</div>
      <h1>Вхід до панелі</h1>
      <p className="muted">Демо-стенд: оберіть тестового користувача.</p>
      <div className="login__list">
        {DEMO_USERS.map((u) => (
          <button key={u.id} type="button" className="btn btn--wide" onClick={() => login(u.id)}>
            {u.label}
          </button>
        ))}
      </div>
      {error && <p role="alert" className="error">{error}</p>}
    </div>
  );
}
