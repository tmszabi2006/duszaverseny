import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { ApiError, api } from '../api';
import { useAuth } from '../auth';
import type { MapSummary } from '../types';
import { errorMessage, formatDate } from '../utils';

function MineArt({ seed = 0 }: { seed?: number }) {
  const variant = seed % 3;
  return (
    <svg viewBox="0 0 240 96" className="map-card-art" aria-hidden="true" focusable="false">
      <defs>
        <linearGradient id={`tunnel-${seed}`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#1c2a38" />
          <stop offset="100%" stopColor="#0b1118" />
        </linearGradient>
        <radialGradient id={`lamp-${seed}`} cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#f5b301" stopOpacity="0.55" />
          <stop offset="100%" stopColor="#f5b301" stopOpacity="0" />
        </radialGradient>
      </defs>
      <rect width="240" height="96" fill={`url(#tunnel-${seed})`} />
      <circle cx={variant === 0 ? 60 : variant === 1 ? 186 : 120} cy="34" r="42" fill={`url(#lamp-${seed})`} />
      <g stroke="#2c3d4f" strokeWidth="2" fill="none" opacity="0.9">
        <path d="M0 78 38 52l28 18 34-26 30 20 38-28 46 22 26-14" />
        <path d="M0 90 42 66l30 16 36-22 32 18 34-22 40 18 26-12" opacity="0.55" />
      </g>
      <g fill="#f5b301">
        <circle cx={variant === 0 ? 68 : variant === 1 ? 176 : 108} cy="58" r="4" />
        <circle cx={variant === 0 ? 80 : variant === 1 ? 164 : 120} cy="70" r="3" />
        <circle cx={variant === 0 ? 58 : variant === 1 ? 188 : 96} cy="72" r="2.5" />
      </g>
      <g fill="#40556b">
        <path d="M12 72h16v8H12zM36 46h14v8H36zM204 42h18v8h-18zM222 64h12v8h-12z" />
      </g>
      <g fill="#0b1118" opacity="0.8">
        <path d="M0 0h240v10c-30 14-60-6-94 4S86 22 54 14 18 2 0 14Z" />
      </g>
    </svg>
  );
}

function MapCard({ map }: { map: MapSummary }) {
  return (
    <article className="map-card">
      <div className="map-card-media">
        <MineArt seed={map.id} />
        <div className="map-badges">
          {map.isOwner ? (
            <span className="badge badge-owner">Saját</span>
          ) : map.owner === 'Rendszer' ? (
            <span className="badge badge-system">Rendszer</span>
          ) : (
            <span className="badge">{map.owner}</span>
          )}
          {!map.isPublic && <span className="badge badge-private">Privát</span>}
        </div>
      </div>

      <div className="map-card-body">
        <div className="map-card-heading">
          <h2>
            <Link to={`/maps/${map.id}`}>{map.name}</Link>
          </h2>
          <span className="map-size">
            {map.width} × {map.height}
          </span>
        </div>
        <p className="map-description">{map.description || 'Nincs leírás ehhez a térképhez.'}</p>

        <div className="map-meta">
          <span>
            <strong>{map.goldCount}</strong> aranyrög
          </span>
          <span>
            <strong>{map.runCount}</strong> futás
          </span>
          <span className="muted">Frissítve: {formatDate(map.updatedAt)}</span>
        </div>

        <div className="map-card-actions">
          <Link to={`/maps/${map.id}`} className="btn btn-primary btn-small">
            Játszom
          </Link>
          {map.isOwner && (
            <Link to={`/maps/${map.id}/edit`} className="btn btn-ghost btn-small">
              Szerkesztés
            </Link>
          )}
        </div>
      </div>
    </article>
  );
}

export function MapsPage() {
  const { user } = useAuth();
  const [maps, setMaps] = useState<MapSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [onlyOwn, setOnlyOwn] = useState(false);

  const loadMaps = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await api.listMaps();
      setMaps(response.maps);
    } catch (cause) {
      setError(
        cause instanceof ApiError ? cause.message : 'A térképek betöltése nem sikerült.',
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadMaps();
  }, [loadMaps]);

  const filtered = useMemo(() => {
    const needle = search.trim().toLocaleLowerCase('hu-HU');
    return maps.filter((map) => {
      if (onlyOwn && !map.isOwner) return false;
      if (!needle) return true;
      return (
        map.name.toLocaleLowerCase('hu-HU').includes(needle) ||
        map.description.toLocaleLowerCase('hu-HU').includes(needle) ||
        map.owner.toLocaleLowerCase('hu-HU').includes(needle)
      );
    });
  }, [maps, search, onlyOwn]);

  const systemCount = maps.filter((map) => map.owner === 'Rendszer').length;
  const ownCount = maps.filter((map) => map.isOwner).length;

  return (
    <div className="page">
      <div className="page-heading page-heading-with-action">
        <div>
          <p className="eyebrow">Bányaközpont</p>
          <h1>Üdv, {user?.username}!</h1>
          <p className="page-lead">
            Válassz egy tárnát, írd meg a programot, és hozd fel az aranyat. Minden futásod
            bekerül az előzményekbe, a ranglistán pedig a legjobb eredményed számít.
          </p>
        </div>
        <Link to="/maps/new" className="btn btn-primary">
          + Új térkép építése
        </Link>
      </div>

      <div className="stats-strip">
        <div className="stat-chip">
          <span className="stat-value">{maps.length}</span>
          <span className="stat-label">elérhető térkép</span>
        </div>
        <div className="stat-chip">
          <span className="stat-value">{systemCount}</span>
          <span className="stat-label">hivatalos pálya</span>
        </div>
        <div className="stat-chip">
          <span className="stat-value">{ownCount}</span>
          <span className="stat-label">saját térkép</span>
        </div>
        <div className="stat-chip">
          <span className="stat-value">
            {maps.reduce((sum, map) => sum + map.goldCount, 0)}
          </span>
          <span className="stat-label">aranyrög a mélyben</span>
        </div>
      </div>

      <section className="maps-toolbar" aria-label="Térképek szűrése">
        <div className="search-field">
          <span className="search-icon" aria-hidden="true">
            ⌕
          </span>
          <input
            type="search"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Keresés név, leírás vagy készítő szerint…"
            aria-label="Keresés a térképek között"
          />
          {search && (
            <button
              type="button"
              className="search-clear"
              onClick={() => setSearch('')}
              aria-label="Keresés törlése"
            >
              ×
            </button>
          )}
        </div>
        <label className="toggle-field">
          <input
            type="checkbox"
            checked={onlyOwn}
            onChange={(event) => setOnlyOwn(event.target.checked)}
          />
          <span>Csak a sajátjaim</span>
        </label>
        <button type="button" className="btn btn-ghost btn-small" onClick={() => void loadMaps()}>
          {loading ? 'Betöltés…' : 'Frissítés'}
        </button>
      </section>

      {error && (
        <div className="alert alert-error" role="alert">
          {error}
        </div>
      )}

      {loading && maps.length === 0 ? (
        <div className="map-grid">
          {Array.from({ length: 4 }, (_, index) => (
            <div key={index} className="map-card skeleton-card" aria-hidden="true">
              <div className="skeleton skeleton-media" />
              <div className="skeleton skeleton-line" />
              <div className="skeleton skeleton-line short" />
            </div>
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="empty-state">
          <span className="empty-icon" aria-hidden="true">
            ⛏
          </span>
          <h2>Nincs találat</h2>
          <p>
            {maps.length === 0
              ? 'Még nincs egyetlen térkép sem. Hozd létre az elsőt!'
              : 'Próbálj más keresőszót, vagy kapcsold ki a szűrőt.'}
          </p>
          {maps.length === 0 && (
            <Link to="/maps/new" className="btn btn-primary">
              Első térkép létrehozása
            </Link>
          )}
        </div>
      ) : (
        <div className="map-grid">
          {filtered.map((map) => (
            <MapCard key={map.id} map={map} />
          ))}
        </div>
      )}

      <div className="alert alert-info tip-alert">
        <strong>Új vagy a MineScriptben?</strong> Nyiss meg egy térképet, és tölts be egy
        mintaprogramot a program szerkesztőjében. A <em>Szintaxis-bemutató</em> minden pályán
        működik.
      </div>
    </div>
  );
}
