import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '../auth';
import { PickaxeLogo } from './Logo';

export function Layout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  async function handleLogout() {
    await logout();
    navigate('/login', { replace: true });
  }

  return (
    <div className="app-shell">
      <a href="#main-content" className="skip-link">
        Ugrás a tartalomra
      </a>

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

      <main className="site-main" id="main-content" tabIndex={-1}>
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
