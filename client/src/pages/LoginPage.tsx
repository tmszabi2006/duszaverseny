import { useState, type FormEvent } from 'react';
import { Navigate, useLocation, useNavigate } from 'react-router-dom';
import { ApiError } from '../api';
import { useAuth } from '../auth';
import { GameIcon } from '../components/GameIcon';
import { WeatherControl } from '../components/Winter';

export function LoginPage() {
  const { user, loading, login, register } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const from = (location.state as { from?: string } | null)?.from ?? '/';

  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  if (!loading && user) {
    return <Navigate to={from} replace />;
  }

  function switchMode(next: 'login' | 'register') {
    setMode(next);
    setError(null);
    setPassword('');
    setConfirm('');
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    const trimmedUsername = username.trim();
    if (!trimmedUsername || !password) {
      setError('Add meg a felhasználónevet és a jelszót.');
      return;
    }
    if (mode === 'register') {
      if (password.length < 8) {
        setError('A jelszó legalább 8 karakter legyen.');
        return;
      }
      if (password !== confirm) {
        setError('A két jelszó nem egyezik.');
        return;
      }
    }

    setSubmitting(true);
    try {
      if (mode === 'login') {
        await login(trimmedUsername, password);
      } else {
        await register(trimmedUsername, password);
      }
      navigate(from, { replace: true });
    } catch (cause) {
      setError(
        cause instanceof ApiError
          ? cause.message
          : 'Váratlan hiba történt. Próbáld újra később.',
      );
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) {
    return (
      <div className="full-page-loader login-loader">
        <div className="loader-spinner" aria-hidden="true" />
        <p>Bejárat keresése…</p>
      </div>
    );
  }

  return (
    <div className="login-page">
      <section className="login-hero">
        <div className="login-scene" aria-hidden="true" />
        <header className="login-brand-row">
          <a href="/login" className="brand" aria-label="MineScript kezdőlap">
            <span className="brand-icon"><GameIcon name="mine" /></span>
            <span className="brand-text"><strong>MineScript<span>.</span></strong><span>Bányászrobot szimulátor</span></span>
          </a>
          <WeatherControl />
        </header>
        <div className="login-story">
          <h1>A kaland mélyén.<br /><span>Te írod a kódot.</span></h1>
          <p>Odakint hull a hó. A hegy gyomrában arany vár.<br className="desktop-break" /> Programozd be a robotod, és hozd felszínre a kincset.</p>
          <a className="login-mobile-cta btn btn-primary" href="#auth-title">Irány a bánya <GameIcon name="arrow" /></a>
        </div>
        <div className="expedition-intro">
          <span className="intro-symbol"><GameIcon name="code" /></span>
          <div><strong>Egy robot. A te programod.</strong><p>Írj kódot · Fedezz fel tárnákat · Gyűjts aranyat</p></div>
        </div>
      </section>
      <section className="login-panel" aria-labelledby="auth-title">
        <div className="login-card">
          <div className="auth-emblem" aria-hidden="true"><GameIcon name="pickaxe" /></div>
          <div className="auth-tabs" role="group" aria-label="Bejelentkezés vagy regisztráció">
            <button
              type="button"
              
              aria-pressed={mode === 'login'}
              className={mode === 'login' ? 'active' : ''}
              onClick={() => switchMode('login')}
            >
              Belépés
            </button>
            <button
              type="button"
              
              aria-pressed={mode === 'register'}
              className={mode === 'register' ? 'active' : ''}
              onClick={() => switchMode('register')}
            >
              Regisztráció
            </button>
          </div>

          <h2 id="auth-title">
            {mode === 'login' ? 'Indulhat a kaland?' : 'Légy te is bányász!'}
          </h2>
          <p className="muted">
            {mode === 'login'
              ? 'Lépj be, és vedd át a robot irányítását.'
              : 'Hozz létre egy fiókot, hogy menthesd a programjaidat és eredményeidet.'}
          </p>

          <form onSubmit={handleSubmit} className="auth-form">
            <label className="field">
              <span className="field-label">Felhasználónév</span>
              <input
                type="text"
                name="username"
                value={username}
                onChange={(event) => setUsername(event.target.value)}
                autoComplete="username"
                                maxLength={24}
                placeholder="pl. AranyAnna"
                required
              />
              {mode === 'register' && (
                <span className="field-hint">
                  3–24 karakter: betű, szám, pont, alávonás vagy kötőjel.
                </span>
              )}
            </label>

            <label className="field">
              <span className="field-label">Jelszó</span>
              <input
                type="password"
                name="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
                placeholder={mode === 'register' ? 'Legalább 8 karakter' : 'Jelszó'}
                required
              />
            </label>

            {mode === 'register' && (
              <label className="field">
                <span className="field-label">Jelszó újra</span>
                <input
                  type="password"
                  name="confirm"
                  value={confirm}
                  onChange={(event) => setConfirm(event.target.value)}
                  autoComplete="new-password"
                  placeholder="Írd be újra a jelszót"
                  required
                />
              </label>
            )}

            {error && (
              <div className="alert alert-error" role="alert">
                {error}
              </div>
            )}

            <button type="submit" className="btn btn-primary btn-large btn-full" disabled={submitting}>
              {submitting ? 'Bányalámpa gyújtása…' : mode === 'login' ? 'Belépés a bányába' : 'Fiók létrehozása'}
            </button>
          </form>

          <p className="auth-footnote">
            {mode === 'login' ? 'Nincs még fiókod?' : 'Már van fiókod?'}{' '}
            <button
              type="button"
              className="link-button"
              onClick={() => switchMode(mode === 'login' ? 'register' : 'login')}
            >
              {mode === 'login' ? 'Regisztrálj itt' : 'Jelentkezz be'}
            </button>
          </p>
        </div>

        <p className="competition-note">
          Dusza Árpád Országos Programozói Emlékverseny · 2026/2027 · I. forduló
        </p>
      </section>
    </div>
  );
}
