import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '../auth';

function PickaxeLogo() {
  return (
    <svg viewBox="0 0 32 32" className="logo-mark" aria-hidden="true" focusable="false">
      <path
        d="M5.2 8.4c4.7-4.6 12.4-5.5 18.3-2.1l-2.6 2.6c-4.2-1.9-9.1-1-12.4 2.3-3.3 3.3-4.2 8.2-2.3 12.4L3.6 26.2C.9 21.2 1.6 12.6 5.2 8.4Z"
        fill="currentColor"
        opacity="0.9"
      />
      <path
        d="M22.7 12.5 30 5.2 28.8 4 21.5 11.3l-3.1-.2-2.7 2.7 7.5 7.5 2.7-2.7-.2-3.1 7.3-7.3-1.2-1.2-7.3 7.3-1.8-1.8Z"
        fill="currentColor"
      />
    </svg>
  );
}

export function Layout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  async function handleLogout() {
    await logout();
    navigate('/login', { replace: true });
  }

  return (
    <div className="app-shell">
      <header className="site-header">
        <div className="site-header-inner">
          <NavLink to="/" className="brand" aria-label="MineScript kezdőlap">
            <span className="brand-icon">
              <PickaxeLogo />
            </span>
            <span className="brand-text">
              <strong>MineScript</strong>
              <span>Bányászrobot szimulátor</span>
            </span>
          </NavLink>

          <nav className="main-nav" aria-label="Fő navigáció">
            <NavLink to="/" end className="nav-link">
              Térképek
            </NavLink>
            <NavLink to="/profile" className="nav-link">
              Profil
            </NavLink>
          </nav>

          <div className="user-menu">
            <span className="user-name" title="Bejelentkezett felhasználó">
              <span className="user-dot" aria-hidden="true" />
              {user?.username}
            </span>
            <button type="button" className="btn btn-ghost btn-small" onClick={handleLogout}>
              Kilépés
            </button>
          </div>
        </div>
      </header>

      <main className="site-main">
        <Outlet />
      </main>

      <footer className="site-footer">
        <span>MineScript · Dusza Árpád Országos Programozói Emlékverseny 2026/2027</span>
        <span className="footer-sep" aria-hidden="true">
          ·
        </span>
        <span>Készült játékos szemléletű oktatási célból</span>
      </footer>
    </div>
  );
}
