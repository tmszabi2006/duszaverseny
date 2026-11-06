import {
  countGold,
  DIRECTION_LABELS_HU,
  DIRECTION_TO_ARROW,
  formatMap,
  NEW_MAP_TEMPLATE,
  parseGrid,
  parseMap,
  type Direction,
  type GameMap,
} from '@minescript/shared';
import { useEffect, useRef, useState, type ChangeEvent } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { ApiError, api } from '../api';
import { MapView } from '../components/MapView';
import type { MapDetail } from '../types';
import { downloadText, errorMessage, slugify } from '../utils';

type Tool = 'wall' | 'gold' | 'empty' | 'robot';

const TOOLS: { id: Tool; label: string; symbol: string; hint: string }[] = [
  { id: 'wall', label: 'Fal', symbol: '#', hint: 'Áthatolhatatlan kőzet.' },
  { id: 'gold', label: 'Arany', symbol: '@', hint: 'Bányászható aranyrög.' },
  { id: 'empty', label: 'Üres', symbol: '.', hint: 'Járható kamra.' },
  { id: 'robot', label: 'Robot', symbol: '>', hint: 'A robot kiindulóhelye.' },
];

const DIRECTIONS: Direction[] = ['N', 'E', 'S', 'W'];

function createTemplateMap(): GameMap {
  const parsed = parseGrid(NEW_MAP_TEMPLATE.split('\n'));
  if (!parsed.ok) {
    throw new Error(`A szerkesztő sablonja érvénytelen: ${parsed.error}`);
  }
  return parsed.map;
}

function clampSize(value: number): number {
  if (!Number.isFinite(value)) return 1;
  return Math.min(15, Math.max(1, Math.trunc(value)));
}

export function MapEditorPage() {
  const { id } = useParams();
  const parsedId = id ? Number(id) : null;
  const mapId = parsedId !== null && Number.isInteger(parsedId) && parsedId > 0 ? parsedId : null;

  const navigate = useNavigate();
  const [map, setMap] = useState<GameMap | null>(null);
  const [loadedMap, setLoadedMap] = useState<MapDetail | null>(null);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [isPublic, setIsPublic] = useState(true);
  const [tool, setTool] = useState<Tool>('wall');
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saveMessage, setSaveMessage] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [importError, setImportError] = useState<string | null>(null);
  const [importMessage, setImportMessage] = useState<string | null>(null);
  const [painting, setPainting] = useState(false);

  const draggingRef = useRef(false);
  const mapFileRef = useRef<HTMLInputElement>(null);

  const isNew = mapId === null;
  const invalidId = id !== undefined && mapId === null;
  const canEdit = !loadedMap || loadedMap.isOwner;

  useEffect(() => {
    let active = true;

    async function load() {
      setLoading(true);
      setLoadError(null);
      setSaveError(null);
      setSaveMessage(null);
      setLoadedMap(null);

      if (invalidId) {
        setLoadError('Érvénytelen térképazonosító.');
        setLoading(false);
        return;
      }

      if (mapId === null) {
        try {
          const template = createTemplateMap();
          if (!active) return;
          setMap(template);
          setName('');
          setDescription('');
          setIsPublic(true);
          setTool('wall');
        } catch (cause) {
          if (active) setLoadError(errorMessage(cause));
        } finally {
          if (active) setLoading(false);
        }
        return;
      }

      try {
        const response = await api.getMap(mapId);
        if (!active) return;
        if (!response.map.isOwner) {
          setLoadError('Ehhez a térképhez nincs szerkesztési jogosultságod.');
          setLoading(false);
          return;
        }
        const parsed = parseMap(response.map.data);
        if (!parsed.ok) {
          setLoadError(`A mentett térkép érvénytelen: ${parsed.error}`);
          setLoading(false);
          return;
        }
        setLoadedMap(response.map);
        setMap(parsed.map);
        setName(response.map.name);
        setDescription(response.map.description);
        setIsPublic(response.map.isPublic);
        setTool('wall');
      } catch (cause) {
        if (!active) return;
        setLoadError(
          cause instanceof ApiError ? cause.message : 'A térkép betöltése nem sikerült.',
        );
      } finally {
        if (active) setLoading(false);
      }
    }

    void load();
    return () => {
      active = false;
    };
  }, [mapId, invalidId]);

  useEffect(() => {
    function stopPainting() {
      draggingRef.current = false;
      setPainting(false);
    }
    window.addEventListener('pointerup', stopPainting);
    window.addEventListener('pointercancel', stopPainting);
    return () => {
      window.removeEventListener('pointerup', stopPainting);
      window.removeEventListener('pointercancel', stopPainting);
    };
  }, []);

  function paintCell(row: number, col: number) {
    setMap((previous) => {
      if (!previous) return previous;

      if (tool === 'robot') {
        const cells = previous.cells.map((cellsRow) => [...cellsRow]);
        cells[row][col] = 'empty';
        return {
          ...previous,
          cells,
          robot: { ...previous.robot, row, col },
        };
      }

      if (previous.robot.row === row && previous.robot.col === col) {
        return previous;
      }

      const cells = previous.cells.map((cellsRow) => [...cellsRow]);
      cells[row][col] = tool === 'wall' ? 'wall' : tool === 'gold' ? 'gold' : 'empty';
      return { ...previous, cells };
    });
    setSaveMessage(null);
  }

  function handleCellPointerDown(row: number, col: number) {
    draggingRef.current = true;
    setPainting(true);
    paintCell(row, col);
  }

  function handleCellPointerEnter(row: number, col: number) {
    if (draggingRef.current) paintCell(row, col);
  }

  function resize(nextHeight: number, nextWidth: number) {
    setMap((previous) => {
      if (!previous) return previous;
      const height = clampSize(nextHeight);
      const width = clampSize(nextWidth);
      if (height === previous.height && width === previous.width) return previous;

      const cells = Array.from({ length: height }, (_, row) =>
        Array.from({ length: width }, (_, col) => previous.cells[row]?.[col] ?? 'empty'),
      );
      const robot = {
        ...previous.robot,
        row: Math.min(previous.robot.row, height - 1),
        col: Math.min(previous.robot.col, width - 1),
      };
      return { width, height, cells, robot };
    });
    setSaveMessage(null);
  }

  function setRobotDirection(direction: Direction) {
    setMap((previous) => (previous ? { ...previous, robot: { ...previous.robot, direction } } : previous));
    setSaveMessage(null);
  }

  async function handleMapImport(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;

    setImportError(null);
    setImportMessage(null);
    try {
      if (file.size > 64 * 1024) {
        setImportError('A fájl túl nagy. A térképek legfeljebb 15 × 15 mezőből állnak.');
        return;
      }
      const text = await file.text();
      const parsed = parseMap(text);
      if (!parsed.ok) {
        setImportError(
          `A térkép importálása sikertelen${parsed.line ? ` (${parsed.line}. sor)` : ''}: ${parsed.error}`,
        );
        return;
      }
      setMap(parsed.map);
      if (!name.trim()) {
        setName(file.name.replace(/\.[^.]+$/, '').slice(0, 80));
      }
      setImportMessage(
        `Térkép betöltve: ${parsed.map.height} sor × ${parsed.map.width} oszlop, ${countGold(parsed.map)} aranyrög.`,
      );
      setSaveMessage(null);
    } catch (cause) {
      setImportError(errorMessage(cause));
    }
  }

  function handleExport() {
    if (!map) return;
    downloadText(`${slugify(name || 'minescript-terkep')}.map`, formatMap(map), 'text/plain');
  }

  async function handleSave() {
    if (!map) return;
    const trimmedName = name.trim();
    if (!trimmedName) {
      setSaveError('Adj nevet a térképnek.');
      return;
    }

    setSaving(true);
    setSaveError(null);
    setSaveMessage(null);

    try {
      const payload = {
        name: trimmedName,
        description: description.trim(),
        data: formatMap(map),
        isPublic,
      };

      if (mapId === null) {
        const response = await api.createMap(payload);
        navigate(`/maps/${response.map.id}/edit`, { replace: true });
        return;
      }

      const response = await api.updateMap(mapId, payload);
      setLoadedMap(response.map);
      setName(response.map.name);
      setDescription(response.map.description);
      setIsPublic(response.map.isPublic);
      setSaveMessage('A térkép mentése sikerült.');
    } catch (cause) {
      if (cause instanceof ApiError) {
        setSaveError(
          cause.code === 'MAP_HAS_RUNS'
            ? `${cause.message} A név és a leírás viszont továbbra is szerkeszthető.`
            : cause.message,
        );
      } else {
        setSaveError('A térkép mentése nem sikerült.');
      }
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (mapId === null || !loadedMap?.isOwner) return;
    const confirmed = window.confirm(
      `Biztosan törlöd a(z) „${loadedMap.name}” térképet? A térképhez tartozó összes futás és ranglista-bejegyzés is törlődik. Ez a művelet nem vonható vissza.`,
    );
    if (!confirmed) return;

    setDeleting(true);
    setSaveError(null);
    try {
      await api.deleteMap(mapId);
      navigate('/', { replace: true });
    } catch (cause) {
      setSaveError(cause instanceof ApiError ? cause.message : 'A törlés nem sikerült.');
    } finally {
      setDeleting(false);
    }
  }

  if (loading) {
    return (
      <div className="page">
        <div className="editor-loading">
          <div className="loader-spinner" aria-hidden="true" />
          <p>A térkép előkészítése…</p>
        </div>
      </div>
    );
  }

  if (loadError || !map) {
    return (
      <div className="page">
        <div className="empty-state">
          <span className="empty-icon" aria-hidden="true">
            ⛔
          </span>
          <h1>Nem tölthető be a szerkesztő</h1>
          <p>{loadError ?? 'Ismeretlen hiba történt.'}</p>
          <div className="button-row">
            <Link to="/" className="btn btn-primary">
              Vissza a térképekhez
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const gold = countGold(map);
  const toolInfo = TOOLS.find((entry) => entry.id === tool)!;

  return (
    <div className="page editor-page">
      <div className="page-heading page-heading-with-action">
        <div>
          <p className="eyebrow">{isNew ? 'Új pálya' : 'Pályaszerkesztő'}</p>
          <h1>{isNew ? 'Építs új tárnát' : name || 'Névtelen térkép'}</h1>
          <p className="page-lead">
            Kattints vagy húzd az egeret a rácsra a festéshez. A robot mindig pontosan egy mezőn
            áll, és a pálya mentésekor a szerver is ellenőrzi.
          </p>
        </div>
        <div className="button-row">
          <Link to={mapId ? `/maps/${mapId}` : '/'} className="btn btn-ghost">
            Mégse
          </Link>
          <button type="button" className="btn btn-primary" onClick={() => void handleSave()} disabled={saving}>
            {saving ? 'Mentés…' : isNew ? 'Térkép létrehozása' : 'Mentés'}
          </button>
        </div>
      </div>

      {!canEdit && (
        <div className="alert alert-error">Csak a saját térképeidet szerkesztheted.</div>
      )}
      {saveError && (
        <div className="alert alert-error" role="alert">
          {saveError}
        </div>
      )}
      {saveMessage && (
        <div className="alert alert-success" role="status">
          {saveMessage}
        </div>
      )}

      <div className="editor-layout">
        <section className="panel editor-board-panel" aria-labelledby="editor-board-title">
          <div className="panel-header">
            <div>
              <h2 id="editor-board-title">Pálya rajzolása</h2>
              <p className="panel-subtitle">
                {map.height} sor × {map.width} oszlop · {gold} aranyrög · aktuális eszköz:{' '}
                <strong>{toolInfo.label}</strong>
              </p>
            </div>
            <span className="coordinate-badge">
              Robot: {map.robot.row + 1}. sor, {map.robot.col + 1}. oszlop
            </span>
          </div>

          <div className="editor-toolbar" role="toolbar" aria-label="Festőeszközök">
            {TOOLS.map((entry) => (
              <button
                key={entry.id}
                type="button"
                className={`tool-button${tool === entry.id ? ' active' : ''}`}
                onClick={() => setTool(entry.id)}
                title={entry.hint}
                aria-pressed={tool === entry.id}
              >
                <span className={`tool-swatch tool-swatch-${entry.id}`} aria-hidden="true">
                  {entry.symbol}
                </span>
                {entry.label}
              </button>
            ))}
            <span className="toolbar-hint">{toolInfo.hint}</span>
          </div>

          <div className="editor-board-wrap">
            <MapView
              map={map}
              className={`map-editor-grid${painting ? ' is-painting' : ''}`}
              interactive
              ariaLabel={`Szerkeszthető térkép, ${map.height} sor és ${map.width} oszlop.`}
              onCellPointerDown={handleCellPointerDown}
              onCellPointerEnter={handleCellPointerEnter}
            />
          </div>

          <div className="editor-board-footer">
            <div className="direction-picker">
              <span className="field-label">Robot iránya</span>
              <div className="direction-buttons">
                {DIRECTIONS.map((direction) => (
                  <button
                    key={direction}
                    type="button"
                    className={`direction-button${
                      map.robot.direction === direction ? ' active' : ''
                    }`}
                    onClick={() => setRobotDirection(direction)}
                    aria-pressed={map.robot.direction === direction}
                    title={DIRECTION_LABELS_HU[direction]}
                  >
                    {DIRECTION_TO_ARROW[direction]}
                  </button>
                ))}
              </div>
            </div>
            <p className="editor-tip">
              Tipp: a robot mezőjére festett fal vagy arany nem kerül a pályára – előbb helyezd át a
              robotot.
            </p>
          </div>
        </section>

        <aside className="editor-sidebar">
          <section className="panel" aria-labelledby="map-properties-title">
            <div className="panel-header">
              <h2 id="map-properties-title">Térkép adatai</h2>
            </div>

            <label className="field">
              <span className="field-label">Név</span>
              <input
                type="text"
                value={name}
                onChange={(event) => {
                  setName(event.target.value);
                  setSaveMessage(null);
                }}
                maxLength={80}
                placeholder="pl. Elhagyott ezüstbánya"
              />
            </label>

            <label className="field">
              <span className="field-label">Leírás</span>
              <textarea
                value={description}
                onChange={(event) => {
                  setDescription(event.target.value);
                  setSaveMessage(null);
                }}
                maxLength={500}
                rows={4}
                placeholder="Mit érdemes tudni a pályáról?"
              />
              <span className="field-hint">{description.length}/500 karakter</span>
            </label>

            <div className="size-fields">
              <label className="field">
                <span className="field-label">Sorok</span>
                <input
                  type="number"
                  min={1}
                  max={15}
                  value={map.height}
                  onChange={(event) => resize(Number(event.target.value), map.width)}
                />
              </label>
              <label className="field">
                <span className="field-label">Oszlopok</span>
                <input
                  type="number"
                  min={1}
                  max={15}
                  value={map.width}
                  onChange={(event) => resize(map.height, Number(event.target.value))}
                />
              </label>
            </div>

            <label className="switch-field">
              <input
                type="checkbox"
                checked={isPublic}
                onChange={(event) => {
                  setIsPublic(event.target.checked);
                  setSaveMessage(null);
                }}
              />
              <span>
                <strong>Nyilvános térkép</strong>
                <small>Minden bejelentkezett játékos láthatja és játszhat rajta.</small>
              </span>
            </label>

            {mapId !== null && (
              <div className="danger-zone">
                <div>
                  <strong>Térkép törlése</strong>
                  <p>Minden hozzá tartozó futás és ranglista-bejegyzés törlődik.</p>
                </div>
                <button
                  type="button"
                  className="btn btn-danger btn-small"
                  onClick={() => void handleDelete()}
                  disabled={deleting || !canEdit}
                >
                  {deleting ? 'Törlés…' : 'Törlés'}
                </button>
              </div>
            )}
          </section>

          <section className="panel" aria-labelledby="map-files-title">
            <div className="panel-header">
              <h2 id="map-files-title">Import és export</h2>
            </div>
            <p className="muted small-text">
              A térképfájl első sora a sorok és oszlopok száma, utána a rács következik. Például:{' '}
              <code>
                {map.height} {map.width}
              </code>
              .
            </p>
            <div className="button-row">
              <button
                type="button"
                className="btn btn-ghost btn-small"
                onClick={() => mapFileRef.current?.click()}
              >
                Fájl importálása
              </button>
              <button type="button" className="btn btn-ghost btn-small" onClick={handleExport}>
                Fájl exportálása
              </button>
            </div>
            <input
              ref={mapFileRef}
              type="file"
              accept=".txt,.map,text/plain"
              hidden
              onChange={(event) => void handleMapImport(event)}
            />
            {importError && <div className="alert alert-error small-text">{importError}</div>}
            {importMessage && <div className="alert alert-success small-text">{importMessage}</div>}
            <p className="field-hint">
              Az importálás csak érvényes térképet fogad el; hiba esetén a jelenlegi pálya
              változatlan marad.
            </p>
          </section>

          <section className="panel" aria-labelledby="map-reset-title">
            <div className="panel-header">
              <h2 id="map-reset-title">Újrakezdés</h2>
            </div>
            <p className="muted small-text">
              Visszaállítja a 9 × 9-es alaprajzot. A név és a leírás megmarad.
            </p>
            <button
              type="button"
              className="btn btn-ghost btn-small"
              onClick={() => {
                if (window.confirm('Visszaállítod a pályát az alap 9 × 9-es sablonra?')) {
                  setMap(createTemplateMap());
                  setSaveMessage(null);
                }
              }}
            >
              Alapsablon betöltése
            </button>
          </section>
        </aside>
      </div>
    </div>
  );
}
