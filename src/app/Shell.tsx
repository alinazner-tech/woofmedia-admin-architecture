import { NavLink, Outlet } from 'react-router';
import type { Me } from '../entities/user/types';

const ROLE = { specialist: 'Спеціаліст', teamlead: 'Тімлід', super_admin: 'Супер-адмін' } as const;

// Оболонка залежить лише від /me: меню будується з ролі й реєстру маршрутів,
// тому падіння будь-якого предметного сервісу її не зачіпає.

export function Shell({ me, nav, onLogout }: { me: Me; nav: { to: string; label: string }[]; onLogout: () => void }) {
  return (
    <div className="shell">
      <header className="topbar">
        <div className="brand">🐾 WoofMedia</div>
        <nav className="nav">
          {nav.map((n) => (
            <NavLink key={n.to} to={n.to} className={({ isActive }) => (isActive ? 'nav__link active' : 'nav__link')}>
              {n.label}
            </NavLink>
          ))}
        </nav>
        <div className="user">
          <span>{me.name}</span>
          <span className="role">{ROLE[me.role]}</span>
          <button type="button" className="btn btn--ghost" onClick={onLogout}>Вийти</button>
        </div>
      </header>
      <main className="main">
        <Outlet />
      </main>
    </div>
  );
}
