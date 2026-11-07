import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { ApiError, api } from '../api';
import { useAuth } from '../auth';
import type { MapSummary } from '../types';
import { errorMessage, formatDate } from '../utils';
import { GameIcon } from '../components/GameIcon';

function MineArt({ seed = 0 }: { seed?: number }) {
  return <div className={`mine-art mine-art-${seed % 15}`} aria-hidden="true" />;
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
            <GameIcon name="gold" /><strong>{map.goldCount}</strong> aranyrög
          </span>
          <span>
            <strong>{map.runCount}</strong> futás
          </span>
          <span className="muted">Frissítve: {formatDate(map.updatedAt)}</span>
        </div>

        <div className="map-card-actions">
          <Link to={`/maps/${map.id}`} className="btn btn-primary btn-small">
            Expedíció indítása <GameIcon name="arrow" />
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
  const [sort, setSort] = useState('recent');

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
    const matches = maps.filter((map) => {
      if (onlyOwn && !map.isOwner) return false;
      if (!needle) return true;
      return (
        map.name.toLocaleLowerCase('hu-HU').includes(needle) ||
        map.description.toLocaleLowerCase('hu-HU').includes(needle) ||
        map.owner.toLocaleLowerCase('hu-HU').includes(needle)
      );
    });
    return matches.sort((a, b) => sort === 'gold' ? b.goldCount - a.goldCount : sort === 'name' ? a.name.localeCompare(b.name, 'hu') : new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
  }, [maps, search, onlyOwn, sort]);

  const systemCount = maps.filter((map) => map.owner === 'Rendszer').length;
  const ownCount = maps.filter((map) => map.isOwner).length;

  return (
    <div className="page maps-page">
      <div className="page-heading page-heading-with-action">
        <div><h1>Vár a következő expedíció.</h1><p className="page-lead">Jó szerencsét, {user?.username}! Melyik tárnát fedezed fel ma?</p></div>
        <Link to="/maps/new" className="btn btn-ghost"><GameIcon name="plus" /> Új térkép építése</Link>
      </div>
      <section className="expedition-hero" aria-label="Téli bányászexpedíció">
        <div className="expedition-hero-content">
          <h2>Odakint tél.<br /><span>Odabent arany.</span></h2>
          <p>Gyújtsd fel a bányalámpát. Írd meg a programot.<br />A felfedezés a következő sorral kezdődik.</p>
          <a href="#expeditions" className="btn btn-primary">Felfedezem a tárnákat <GameIcon name="arrow" /></a>
        </div>
        <span className="hero-caption"><GameIcon name="snow" /> Téli expedíció · MineScript</span>
      </section>
      <div className="expedition-summary" aria-label="Térképösszesítő">
        <span><GameIcon name="map" /><strong>{maps.length}</strong> elérhető térkép</span>
        <span><strong>{systemCount}</strong> rendszerpálya</span>
        <span><strong>{ownCount}</strong> saját tárna</span>
        <span><GameIcon name="gold" /><strong>{maps.reduce((sum, map) => sum + map.goldCount, 0)}</strong> aranyrög vár</span>
      </div>
      <div className="section-heading" id="expeditions"><h2>Válassz tárnát</h2><span className="muted small-text">{filtered.length} felfedezhető pálya</span></div>
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
        <select className="map-sort" aria-label="Térképek rendezése" value={sort} onChange={event => setSort(event.target.value)}>
          <option value="recent">Legutóbb frissített</option><option value="gold">Legtöbb arany</option><option value="name">Név szerint</option>
        </select>
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
