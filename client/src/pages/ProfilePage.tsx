import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ApiError, api } from '../api';
import { useAuth } from '../auth';
import { saveDraft } from '../drafts';
import type { Run, RunStats } from '../types';
import { formatDate } from '../utils';

function RunRow({ run }: { run: Run }) {
  const navigate = useNavigate();

  function loadProgram() {
    saveDraft(run.mapId, run.programSource);
    navigate(`/maps/${run.mapId}`);
  }

  return (
    <article className="run-card">
      <div className="run-card-main">
        <div className="run-card-heading">
          <h3>
            <Link to={`/maps/${run.mapId}`}>{run.mapName}</Link>
          </h3>
          <span className="muted small-text">{formatDate(run.createdAt, true)}</span>
        </div>
        <div className="run-card-metrics">
          <span className="metric-pill gold-text">
            <strong>{run.gold}</strong> arany
          </span>
          <span className="metric-pill">
            <strong>{run.steps}</strong> lépés
          </span>
          {run.error ? (
            <span className="metric-pill metric-error" title={run.error.message}>
              {run.error.code}
            </span>
          ) : (
            <span className="metric-pill metric-ok">sikeres futás</span>
          )}
        </div>
        {run.error && (
          <p className="small-text muted run-error-detail">
            {run.error.line}. sor: {run.error.message}
          </p>
        )}
      </div>
      <div className="run-card-actions">
        <button type="button" className="btn btn-ghost btn-small" onClick={loadProgram}>
          Program betöltése
        </button>
        <Link to={`/maps/${run.mapId}`} className="btn btn-primary btn-small">
          Játszom
        </Link>
      </div>
      <details className="run-source-details">
        <summary>Program megtekintése</summary>
        <pre>{run.programSource || '(üres program)'}</pre>
      </details>
    </article>
  );
}

export function ProfilePage() {
  const { user } = useAuth();
  const [runs, setRuns] = useState<Run[]>([]);
  const [stats, setStats] = useState<RunStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError(null);

    api
      .myRuns()
      .then((response) => {
        if (!active) return;
        setRuns(response.runs);
        setStats(response.stats);
      })
      .catch((cause) => {
        if (!active) return;
        setError(
          cause instanceof ApiError ? cause.message : 'A futások betöltése nem sikerült.',
        );
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, []);

  return (
    <div className="page">
      <div className="page-heading">
        <p className="eyebrow">Bányászprofil</p>
        <h1>{user?.username}</h1>
        <p className="page-lead">
          Itt látod a futásaidat, a begyűjtött aranyat és az utolsó programjaidat. Bármelyik
          korábbi programot visszatöltheted a szerkesztőbe.
        </p>
      </div>

      {error && (
        <div className="alert alert-error" role="alert">
          {error}
        </div>
      )}

      <div className="profile-stats">
        <div className="profile-stat-card">
          <span className="profile-stat-label">Összes futás</span>
          <strong>{stats?.totalRuns ?? '–'}</strong>
        </div>
        <div className="profile-stat-card">
          <span className="profile-stat-label">Összes arany</span>
          <strong className="text-gold">{stats?.totalGold ?? '–'}</strong>
        </div>
        <div className="profile-stat-card">
          <span className="profile-stat-label">Kipróbált térkép</span>
          <strong>{stats?.mapsTried ?? '–'}</strong>
        </div>
        <div className="profile-stat-card">
          <span className="profile-stat-label">Hiba nélküli futás</span>
          <strong>{stats?.cleanRuns ?? '–'}</strong>
        </div>
        <div className="profile-stat-card">
          <span className="profile-stat-label">Legjobb arany egy futásban</span>
          <strong className="text-gold">{stats?.bestGold ?? '–'}</strong>
        </div>
      </div>

      <div className="section-heading">
        <h2>Futástörténet</h2>
        <span className="muted small-text">A legutóbbi legfeljebb 50 futás.</span>
      </div>

      {loading ? (
        <div className="run-list">
          {Array.from({ length: 3 }, (_, index) => (
            <div className="run-card skeleton-card" key={index} aria-hidden="true">
              <div className="skeleton skeleton-line" />
              <div className="skeleton skeleton-line short" />
            </div>
          ))}
        </div>
      ) : runs.length === 0 ? (
        <div className="empty-state">
          <span className="empty-icon" aria-hidden="true">
            ⛏
          </span>
          <h2>Még nincs futásod</h2>
          <p>Válassz egy térképet, írj programot, és az első arany után máris itt lesz az eredmény.</p>
          <Link to="/" className="btn btn-primary">
            Térképek felfedezése
          </Link>
        </div>
      ) : (
        <div className="run-list">
          {runs.map((run) => (
            <RunRow key={run.id} run={run} />
          ))}
        </div>
      )}
    </div>
  );
}
