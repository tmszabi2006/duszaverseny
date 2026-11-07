import { useState } from 'react';
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../auth';
import { GameIcon, MiningRobot } from './GameIcon';
import { WeatherControl } from './Winter';

export function Layout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const [logoutError, setLogoutError] = useState('');
  const section = pathname === '/profile' ? 'Bányásznapló' : pathname.includes('edit') || pathname.endsWith('new') ? 'Pályaműhely' : pathname.startsWith('/maps/') ? 'Robotvezérlő' : 'Expedíciós központ';
  async function handleLogout() {
    try { await logout(); navigate('/login', { replace: true }); }
    catch { setLogoutError('A kijelentkezés nem sikerült. Próbáld újra.'); }
  }
  return <div className="app-shell">
    <a href="#main-content" className="skip-link">Ugrás a tartalomra</a>
    <aside className="expedition-sidebar">
      <NavLink to="/" className="brand" aria-label="MineScript kezdőlap">
        <span className="brand-icon"><GameIcon name="mine" /></span>
        <span className="brand-text"><strong>MineScript<span>.</span></strong><span>Bányászrobot szimulátor</span></span>
      </NavLink>
      <nav className="main-nav" aria-label="Fő navigáció">
        <NavLink to="/" end className="nav-link"><GameIcon name="map" /><span>Térképek</span><span className="nav-arrow">↗</span></NavLink>
        <NavLink to="/maps/new" className="nav-link"><GameIcon name="pickaxe" /><span>Pályaműhely</span></NavLink>
        <NavLink to="/profile" className="nav-link"><GameIcon name="user" /><span>Bányásznapló</span></NavLink>
      </nav>
      <div className="sidebar-expedition" aria-hidden="true"><MiningRobot /><span>Téli expedíció</span><p>A következő aranyrög<br />egy jó programra vár.</p></div>
      <div className="sidebar-account"><span className="user-avatar">{user?.username.slice(0, 1).toLocaleUpperCase('hu-HU')}</span><div><strong>{user?.username}</strong><span>Bányász</span></div><button type="button" className="icon-button" onClick={handleLogout} aria-label="Kilépés"><GameIcon name="logout" /></button></div>
      {logoutError && <p role="alert" className="error-text">{logoutError}</p>}
    </aside>
    <div className="expedition-workspace">
      <header className="workspace-header"><div><GameIcon name="mine" /><span>{section}</span></div><div className="workspace-weather"><span className="winter-season">Téli expedíció</span><WeatherControl /></div></header>
      <main className="site-main" id="main-content" tabIndex={-1}><Outlet /></main>
      <footer className="site-footer"><span>MineScript · A mélyben a kód számít.</span><span>Dusza Árpád Emlékverseny · 2026/2027</span></footer>
    </div>
  </div>;
}
