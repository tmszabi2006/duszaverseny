import { useState, type FormEvent } from 'react';
import { Navigate, useLocation, useNavigate } from 'react-router-dom';
import { ApiError } from '../api';
import { useAuth } from '../auth';
import { PickaxeLogo } from '../components/Logo';

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
      <div className="login-background" aria-hidden="true">
        <div className="lamp-glow" />
        <div className="tunnel-lines" />
      </div>

      <section className="login-hero">
        <div className="login-hero-inner">
          <div className="brand brand-large">
            <span className="brand-icon" aria-hidden="true">
              <PickaxeLogo />
            </span>
            <span className="brand-text">
              <strong>MineScript</strong>
              <span>Bányászrobot szimulátor</span>
            </span>
          </div>

          <h1>
            A mélyben
            <br />
            <span className="text-gold">a kód számít.</span>
          </h1>
          <p className="login-lead">
            Írj MineScript programot, vezesd végig a robotot a tárnákon, bányássz ki minden
            aranyrögöt, és szerezz helyet a ranglistán. A cél nem az, hogy gyorsan fuss, hanem hogy
            okosan.
          </p>

          <ul className="feature-list">
            <li>
              <span className="feature-icon">01</span>
              <span>
                <strong>Valódi interpreter</strong> – a szerver ugyanazzal a motorral ellenőrzi
                minden futásodat.
              </span>
            </li>
            <li>
              <span className="feature-icon">02</span>
              <span>
                <strong>Élő animáció</strong> – lépésről lépésre követheted a robotot, a kiírt
                szöveget és az aktuális programsort.
              </span>
            </li>
            <li>
              <span className="feature-icon">03</span>
              <span>
                <strong>Saját térképek</strong> – építs pályát, oszd meg a közösséggel, és nézd meg,
                ki oldja meg a legjobban.
              </span>
            </li>
          </ul>

          <pre className="login-code" aria-label="MineScript példakód">
            <code>
              <span className="tok-keyword">set</span> arany <span className="tok-keyword">to</span>{' '}
              <span className="tok-number">0</span>
              {'\n'}
              <span className="tok-keyword">step</span>{' '}
              <span className="tok-keyword">forward</span> <span className="tok-number">3</span>
              {'\n'}
              <span className="tok-keyword">mine</span> <span className="tok-keyword">here</span>
              {'\n'}
              <span className="tok-keyword">set</span> fal{' '}
              <span className="tok-keyword">to</span> <span className="tok-keyword">isThere</span>{' '}
              <span className="tok-number">1</span>
              {'\n'}
              <span className="tok-keyword">print</span> fal
            </code>
          </pre>
        </div>
      </section>

      <section className="login-panel" aria-labelledby="auth-title">
        <div className="login-card">
          <div className="auth-tabs" role="tablist" aria-label="Bejelentkezés vagy regisztráció">
            <button
              type="button"
              role="tab"
              aria-selected={mode === 'login'}
              className={mode === 'login' ? 'active' : ''}
              onClick={() => switchMode('login')}
            >
              Belépés
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={mode === 'register'}
              className={mode === 'register' ? 'active' : ''}
              onClick={() => switchMode('register')}
            >
              Regisztráció
            </button>
          </div>

          <h2 id="auth-title">
            {mode === 'login' ? 'Jó újra a bányában!' : 'Csatlakozz a bányászokhoz'}
          </h2>
          <p className="muted">
            {mode === 'login'
              ? 'Add meg a bányászazonosítódat, és folytasd ott, ahol abbahagytad.'
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
                autoFocus
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
