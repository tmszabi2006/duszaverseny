import {
  DIRECTION_LABELS_HU,
  MAX_PROCESSED_LINES,
  parseMap,
  parseProgram,
  runProgram,
  type CellKind,
  type ConsoleEntry,
  type ExecutionResult,
  type GameMap,
  type ProgramParseError,
  type RobotState,
  type RunEvent,
  type RuntimeErrorInfo,
} from '@minescript/shared';
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ChangeEvent,
  type KeyboardEvent as ReactKeyboardEvent,
} from 'react';
import { Link, useParams } from 'react-router-dom';
import { ApiError, api } from '../api';
import { Leaderboard } from '../components/Leaderboard';
import { MapView } from '../components/MapView';
import { ProgramEditor } from '../components/ProgramEditor';
import { loadDraft, saveDraft } from '../drafts';
import { defaultProgramForMap, samplesForMap } from '../samples';
import type { LeaderboardEntry, MapDetail, Run, RunResponse } from '../types';
import { downloadText, errorMessage, slugify } from '../utils';

type Speed = 'slow' | 'normal' | 'fast' | 'instant';
type RunStatus = 'idle' | 'running' | 'finished' | 'stopped';
type SubmissionStatus = 'idle' | 'saving' | 'saved' | 'error';

interface SimState {
  robot: RobotState;
  cells: CellKind[][];
  discovered: boolean[][];
  gold: number;
  steps: number;
  currentLine: number | null;
  console: ConsoleEntry[];
  error: RuntimeErrorInfo | null;
}

interface CurrentRun {
  mapId: number;
  source: string;
  token: number;
}

const SPEED_OPTIONS: { value: Speed; label: string }[] = [
  { value: 'slow', label: 'Lassú' },
  { value: 'normal', label: 'Normál' },
  { value: 'fast', label: 'Gyors' },
  { value: 'instant', label: 'Azonnali' },
];

function initialSim(map: GameMap): SimState {
  const discovered = Array.from({ length: map.height }, () =>
    Array.from({ length: map.width }, () => false),
  );
  discovered[map.robot.row][map.robot.col] = true;
  return {
    robot: { ...map.robot },
    cells: map.cells.map((row) => [...row]),
    discovered,
    gold: 0,
    steps: 0,
    currentLine: null,
    console: [],
    error: null,
  };
}

function applyEvent(state: SimState, event: RunEvent): SimState {
  switch (event.type) {
    case 'exec':
      return { ...state, steps: event.steps, currentLine: event.line };
    case 'move': {
      const discovered = state.discovered.map((row) => [...row]);
      if (discovered[event.to.row]?.[event.to.col] !== undefined) {
        discovered[event.to.row][event.to.col] = true;
      }
      return {
        ...state,
        robot: { ...state.robot, row: event.to.row, col: event.to.col },
        discovered,
      };
    }
    case 'turn':
      return {
        ...state,
        robot: { ...state.robot, direction: event.to },
        currentLine: event.line,
      };
    case 'scan': {
      if (!event.discovered) return { ...state, currentLine: event.line };
      const discovered = state.discovered.map((row) => [...row]);
      if (discovered[event.target.row]?.[event.target.col] !== undefined) {
        discovered[event.target.row][event.target.col] = true;
      }
      return { ...state, discovered, currentLine: event.line };
    }
    case 'mine': {
      const cells = state.cells.map((row) => [...row]);
      if (cells[event.position.row]?.[event.position.col] !== undefined) {
        cells[event.position.row][event.position.col] = 'empty';
      }
      return { ...state, cells, gold: event.gold, currentLine: event.line };
    }
    case 'print':
      return {
        ...state,
        currentLine: event.line,
        console: [...state.console, { line: event.line, text: event.value }],
      };
    case 'error':
      return {
        ...state,
        currentLine: event.line,
        error: { code: event.code, line: event.line, message: event.message },
      };
    case 'end':
      return { ...state, steps: event.steps, gold: event.gold };
    default:
      return state;
  }
}

function finalSim(map: GameMap, result: ExecutionResult): SimState {
  const lastExec = [...result.events].reverse().find((event) => event.type === 'exec');
  return {
    robot: { ...result.robot },
    cells: result.cells.map((row) => [...row]),
    discovered: result.discovered.map((row) => [...row]),
    gold: result.gold,
    steps: result.steps,
    currentLine: result.error?.line ?? lastExec?.line ?? null,
    console: [...result.console],
    error: result.error,
  };
}

function eventDelay(event: RunEvent, speed: Speed): number {
  if (speed === 'instant') return 0;
  if (event.type === 'exec') return speed === 'slow' ? 70 : speed === 'fast' ? 12 : 28;
  const base = speed === 'slow' ? 240 : speed === 'fast' ? 55 : 125;
  switch (event.type) {
    case 'move':
      return base;
    case 'turn':
      return base * 0.8;
    case 'scan':
      return base * 0.7;
    case 'mine':
      return base * 1.1;
    case 'print':
      return base * 0.8;
    case 'error':
    case 'end':
      return 0;
    default:
      return base;
  }
}

function streamLabel(speed: Speed): string {
  switch (speed) {
    case 'slow':
      return 'Lassú';
    case 'normal':
      return 'Normál';
    case 'fast':
      return 'Gyors';
    case 'instant':
      return 'Azonnali';
  }
}

export function PlayPage() {
  const { id } = useParams();
  const routeId = id ? Number(id) : NaN;
  const mapId = Number.isInteger(routeId) && routeId > 0 ? routeId : null;

  const [map, setMap] = useState<MapDetail | null>(null);
  const [gameMap, setGameMap] = useState<GameMap | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [source, setSource] = useState('');
  const [sourceMapId, setSourceMapId] = useState<number | null>(null);
  const [parseError, setParseError] = useState<ProgramParseError | null>(null);
  const [importError, setImportError] = useState<string | null>(null);
  const [importMessage, setImportMessage] = useState<string | null>(null);

  const [sim, setSim] = useState<SimState | null>(null);
  const [status, setStatus] = useState<RunStatus>('idle');
  const [speed, setSpeed] = useState<Speed>('normal');
  const [runSequence, setRunSequence] = useState(0);
  const [submission, setSubmission] = useState<SubmissionStatus>('idle');
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [savedRun, setSavedRun] = useState<Run | null>(null);
  const [serverResult, setServerResult] = useState<RunResponse['result'] | null>(null);

  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [leaderboardLoading, setLeaderboardLoading] = useState(false);
  const [leaderboardError, setLeaderboardError] = useState<string | null>(null);

  const speedRef = useRef(speed);
  speedRef.current = speed;
  const eventsRef = useRef<RunEvent[]>([]);
  const eventIndexRef = useRef(0);
  const timerRef = useRef<number | null>(null);
  const runTokenRef = useRef(0);
  const currentRunRef = useRef<CurrentRun | null>(null);
  const inFlightTokensRef = useRef(new Set<number>());
  const consoleRef = useRef<HTMLDivElement>(null);
  const programFileRef = useRef<HTMLInputElement>(null);

  const loadLeaderboard = useCallback(async (targetMapId: number) => {
    setLeaderboardLoading(true);
    setLeaderboardError(null);
    try {
      const response = await api.leaderboard(targetMapId);
      setLeaderboard(response.entries);
    } catch (cause) {
      setLeaderboardError(
        cause instanceof ApiError ? cause.message : 'A ranglista betöltése nem sikerült.',
      );
    } finally {
      setLeaderboardLoading(false);
    }
  }, []);

  useEffect(() => {
    let active = true;

    async function load() {
      if (mapId === null) {
        setLoadError('Érvénytelen térképazonosító.');
        setLoading(false);
        return;
      }

      setLoading(true);
      setLoadError(null);
      setMap(null);
      setGameMap(null);
      setSim(null);
      setStatus('idle');
      setSubmission('idle');
      setSubmitError(null);
      setSavedRun(null);
      setServerResult(null);
      setParseError(null);
      setImportError(null);
      setImportMessage(null);
      setLeaderboard([]);

      try {
        const response = await api.getMap(mapId);
        if (!active) return;
        const parsed = parseMap(response.map.data);
        if (!parsed.ok) {
          setLoadError(`A mentett térkép érvénytelen: ${parsed.error}`);
          return;
        }
        setMap(response.map);
        setGameMap(parsed.map);
        setSim(initialSim(parsed.map));

        const draft = loadDraft(response.map.id);
        const initialSource = draft ?? defaultProgramForMap(response.map.name);
        setSource(initialSource);
        setSourceMapId(response.map.id);
        document.title = `${response.map.name} – MineScript`;

        void loadLeaderboard(response.map.id);
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
  }, [mapId, loadLeaderboard]);

  useEffect(() => {
    if (map && sourceMapId === map.id) {
      saveDraft(map.id, source);
    }
  }, [map, source, sourceMapId]);

  useEffect(() => {
    if (consoleRef.current) {
      consoleRef.current.scrollTop = consoleRef.current.scrollHeight;
    }
  }, [sim?.console.length]);

  useEffect(() => {
    if (status !== 'running') return;

    let cancelled = false;

    function tick() {
      if (cancelled) return;
      const event = eventsRef.current[eventIndexRef.current];
      if (!event) {
        setStatus('finished');
        return;
      }
      eventIndexRef.current += 1;
      setSim((previous) => (previous ? applyEvent(previous, event) : previous));

      if (event.type === 'end') {
        setStatus('finished');
        return;
      }

      timerRef.current = window.setTimeout(() => tick(), eventDelay(event, speedRef.current));
    }

    // A nulla késleltetésű indítás miatt a StrictMode kétszeres
    // effektfuttatása nem lépteti át az első eseményt.
    timerRef.current = window.setTimeout(() => tick(), 0);

    return () => {
      cancelled = true;
      if (timerRef.current !== null) {
        window.clearTimeout(timerRef.current);
        timerRef.current = null;
      }
    };
  }, [status, runSequence]);

  const submitRun = useCallback(
    async (run: CurrentRun) => {
      if (inFlightTokensRef.current.has(run.token)) return;
      inFlightTokensRef.current.add(run.token);
      setSubmission('saving');
      setSubmitError(null);

      try {
        const response = await api.run(run.mapId, run.source);
        if (run.token !== runTokenRef.current) return;
        setSavedRun(response.run);
        setServerResult(response.result);
        setSubmission('saved');
        void loadLeaderboard(run.mapId);
      } catch (cause) {
        if (run.token !== runTokenRef.current) return;
        setSubmission('error');
        setSubmitError(
          cause instanceof ApiError
            ? cause.message
            : 'Az eredmény hitelesítése nem sikerült. Próbáld újra.',
        );
      } finally {
        inFlightTokensRef.current.delete(run.token);
      }
    },
    [loadLeaderboard],
  );

  useEffect(() => {
    if (status === 'finished' && currentRunRef.current && submission === 'idle') {
      void submitRun(currentRunRef.current);
    }
  }, [status, submission, submitRun]);

  function resetRunState(nextMap: GameMap | null = gameMap) {
    setStatus('idle');
    setSubmission('idle');
    setSubmitError(null);
    setSavedRun(null);
    setServerResult(null);
    setParseError(null);
    setImportError(null);
    setImportMessage(null);
    currentRunRef.current = null;
    eventsRef.current = [];
    eventIndexRef.current = 0;
    if (nextMap) setSim(initialSim(nextMap));
  }

  function handleRun() {
    if (!map || !gameMap || status === 'running') return;
    const parsed = parseProgram(source);
    if (!parsed.ok) {
      setParseError(parsed.error);
      setImportError(null);
      setImportMessage(null);
      setStatus('idle');
      return;
    }

    setParseError(null);
    setImportError(null);
    setImportMessage(null);
    setSubmission('idle');
    setSubmitError(null);
    setSavedRun(null);
    setServerResult(null);

    const result = runProgram(gameMap, parsed.program);
    const token = runTokenRef.current + 1;
    runTokenRef.current = token;
    currentRunRef.current = { mapId: map.id, source, token };
    eventsRef.current = result.events;
    eventIndexRef.current = 0;
    setSim(initialSim(gameMap));

    if (speed === 'instant') {
      setSim(finalSim(gameMap, result));
      setStatus('finished');
      setRunSequence((value) => value + 1);
      void submitRun(currentRunRef.current);
      return;
    }

    setStatus('running');
    setRunSequence((value) => value + 1);
  }

  function handleStop() {
    if (status !== 'running') return;
    setStatus('stopped');
    currentRunRef.current = null;
    setSubmission('idle');
    setSubmitError(null);
  }

  function handleReset() {
    resetRunState();
    setRunSequence((value) => value + 1);
  }

  function handleProgramImport(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;

    setImportError(null);
    setImportMessage(null);
    setParseError(null);
    currentRunRef.current = null;
    setStatus('idle');
    setSubmission('idle');
    setSavedRun(null);
    setServerResult(null);
    if (gameMap) setSim(initialSim(gameMap));

    if (file.size > 64 * 1024) {
      setImportError('A programfájl túl nagy (legfeljebb 64 KiB lehet).');
      return;
    }

    void file
      .text()
      .then((text) => {
        if (text.length > 20000) {
          setImportError('A program legfeljebb 20 000 karakter lehet.');
          return;
        }
        const parsed = parseProgram(text);
        if (!parsed.ok) {
          setImportError(
            `A program importálása sikertelen (${parsed.error.line}. sor): ${parsed.error.message}`,
          );
          return;
        }
        setSource(text);
        setImportMessage(`Program betöltve: ${file.name}`);
      })
      .catch((cause) => setImportError(errorMessage(cause)));
  }

  function handleProgramExport() {
    if (!map) return;
    downloadText(`${slugify(map.name)}-program.txt`, source, 'text/plain');
  }

  function handleSampleChange(name: string) {
    if (!map) return;
    const sample = samplesForMap(map.name).find((entry) => entry.name === name);
    if (!sample) return;
    resetRunState();
    setSource(sample.source);
    setImportMessage(`Minta betöltve: ${sample.name}`);
  }

  function handleSourceChange(value: string) {
    setSource(value);
    setParseError(null);
    setImportMessage(null);
    if (status !== 'idle') {
      setStatus('idle');
      setSubmission('idle');
      setSavedRun(null);
      setServerResult(null);
      currentRunRef.current = null;
      if (gameMap) setSim(initialSim(gameMap));
    }
  }

  const samples = useMemo(() => (map ? samplesForMap(map.name) : []), [map]);
  const statusLabel = useMemo(() => {
    switch (status) {
      case 'idle':
        return 'Készen áll';
      case 'running':
        return `Futás · ${streamLabel(speed)}`;
      case 'finished':
        return sim?.error ? 'Hiba történt' : 'Futás vége';
      case 'stopped':
        return 'Leállítva';
    }
  }, [status, speed, sim?.error]);

  const selectedSample = useMemo(() => {
    return samples.find((sample) => sample.source === source)?.name ?? '';
  }, [samples, source]);

  if (loading) {
    return (
      <div className="page">
        <div className="editor-loading">
          <div className="loader-spinner" aria-hidden="true" />
          <p>A tárna feltérképezése…</p>
        </div>
      </div>
    );
  }

  if (loadError || !map || !gameMap || !sim) {
    return (
      <div className="page">
        <div className="empty-state">
          <span className="empty-icon" aria-hidden="true">
            ⛔
          </span>
          <h1>A térkép nem nyitható meg</h1>
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

  const isRunning = status === 'running';
  const completed = status === 'finished';
  const collectedAll = sim.gold === map.goldCount && map.goldCount > 0;
  const progress =
    map.goldCount > 0 ? Math.min(100, Math.round((sim.gold / map.goldCount) * 100)) : 0;
  const serverMismatch =
    serverResult !== null && (serverResult.gold !== sim.gold || serverResult.steps !== sim.steps);

  function handlePageKeyDown(event: ReactKeyboardEvent<HTMLDivElement>) {
    if ((event.ctrlKey || event.metaKey) && event.key === 'Enter') {
      event.preventDefault();
      handleRun();
    }
  }

  return (
    <div className="page play-page" onKeyDown={handlePageKeyDown}>
      <nav className="breadcrumb" aria-label="Morzsamenü">
        <Link to="/">Térképek</Link>
        <span aria-hidden="true">/</span>
        <span>{map.name}</span>
      </nav>

      <div className="page-heading page-heading-with-action play-heading">
        <div>
          <div className="title-with-badges">
            <h1>{map.name}</h1>
            {map.owner === 'Rendszer' ? (
              <span className="badge badge-system">Rendszer</span>
            ) : map.isOwner ? (
              <span className="badge badge-owner">Saját</span>
            ) : (
              <span className="badge">{map.owner}</span>
            )}
            {!map.isPublic && <span className="badge badge-private">Privát</span>}
          </div>
          <p className="page-lead">{map.description || 'Ehhez a térképhez nincs leírás.'}</p>
          <div className="meta-row">
            <span>
              {map.width} × {map.height}
            </span>
            <span>{map.goldCount} aranyrög</span>
            <span>{map.runCount} futás</span>
            <span>Készítette: {map.owner}</span>
          </div>
        </div>
        <div className="button-row">
          {map.isOwner && (
            <Link to={`/maps/${map.id}/edit`} className="btn btn-ghost">
              Szerkesztés
            </Link>
          )}
          <Link to="/" className="btn btn-ghost">
            Térképek
          </Link>
        </div>
      </div>

      {parseError && (
        <div className="alert alert-error" role="alert">
          <strong>Szintaktikai hiba a(z) {parseError.line}. sorban:</strong> {parseError.message}
        </div>
      )}
      {importError && (
        <div className="alert alert-error" role="alert">
          {importError}
        </div>
      )}
      {importMessage && (
        <div className="alert alert-info" role="status">
          {importMessage}
        </div>
      )}

      <div className="play-layout">
        <div className="play-main">
          <section className="panel map-panel" aria-labelledby="map-title">
            <div className="panel-header">
              <div>
                <h2 id="map-title">A tárna</h2>
                <p className="panel-subtitle">
                  A robot a {sim.robot.row + 1}. sor {sim.robot.col + 1}. oszlopában áll, arccal{' '}
                  {DIRECTION_LABELS_HU[sim.robot.direction]} felé.
                </p>
              </div>
              <span className={`run-status run-status-${status}`}>{statusLabel}</span>
            </div>

            <div className="map-stage">
              <MapView map={gameMap} robot={sim.robot} cells={sim.cells} discovered={sim.discovered} />
            </div>

            <div className="map-legend" aria-label="Térkép jelmagyarázat">
              <span>
                <span className="legend-dot legend-empty" aria-hidden="true" /> Járat
              </span>
              <span>
                <span className="legend-dot legend-wall" aria-hidden="true" /> Fal
              </span>
              <span>
                <span className="legend-dot legend-gold" aria-hidden="true" /> Arany
              </span>
              <span>
                <span className="legend-dot legend-robot" aria-hidden="true" /> Robot
              </span>
              <span className="legend-note">A feltérképezetlen mezők sötétek maradnak.</span>
            </div>

            <div className="progress-block">
              <div className="progress-label">
                <span>Arany begyűjtése</span>
                <span>
                  {sim.gold} / {map.goldCount} · {progress}%
                </span>
              </div>
              <div
                className="progress-track"
                role="progressbar"
                aria-valuenow={sim.gold}
                aria-valuemin={0}
                aria-valuemax={map.goldCount}
                aria-label="Összegyűjtött arany aránya"
              >
                <div className="progress-fill" style={{ width: `${progress}%` }} />
              </div>
            </div>

            <div className="run-stats">
              <div className="run-stat">
                <span className="run-stat-label">Összegyűjtött arany</span>
                <strong className={collectedAll ? 'text-gold' : ''}>
                  {sim.gold} / {map.goldCount}
                </strong>
              </div>
              <div className="run-stat">
                <span className="run-stat-label">Feldolgozott programsor</span>
                <strong>
                  {sim.steps} / {MAX_PROCESSED_LINES}
                </strong>
              </div>
              <div className="run-stat">
                <span className="run-stat-label">Aktuális programsor</span>
                <strong>{sim.currentLine ?? '–'}</strong>
              </div>
            </div>

            {sim.error && (
              <div className="alert alert-error runtime-error" role="alert">
                <span className="error-code">{sim.error.code}</span>
                <div>
                  <strong>{sim.error.line}. sor:</strong> {sim.error.message}
                  {submission === 'saved' && (
                    <p className="small-text">
                      A hibás futás is bekerült az előzményekbe, de a ranglista sorrendjét a
                      begyűjtött arany és a lépésszám dönti el.
                    </p>
                  )}
                </div>
              </div>
            )}

            {completed && !sim.error && (
              <div className={`alert ${collectedAll ? 'alert-success' : 'alert-info'}`}>
                {collectedAll ? (
                  <>
                    <strong>Minden arany a felszínen!</strong> {sim.gold} aranyrög, {sim.steps}{' '}
                    feldolgozott programsor.
                  </>
                ) : (
                  <>
                    <strong>A program lefutott.</strong> {sim.gold} aranyrögöt sikerült
                    összegyűjteni {sim.steps} feldolgozott programsor alatt.
                  </>
                )}
              </div>
            )}

            {status === 'stopped' && (
              <div className="alert alert-warning">
                A futást leállítottad. A részeredmény nem került a ranglistára. Indíts új futást,
                vagy állítsd vissza a pályát.
              </div>
            )}

            {serverMismatch && (
              <div className="alert alert-warning">
                A helyi animáció és a szerver eredménye eltér. A hitelesített érték: {serverResult?.gold}{' '}
                arany, {serverResult?.steps} lépés. A ranglista a szerver eredményét használja.
              </div>
            )}
          </section>

          <section className="panel console-panel" aria-labelledby="console-title">
            <div className="panel-header">
              <div>
                <h2 id="console-title">Konzol</h2>
                <p className="panel-subtitle">A print utasítások kimenete, soronként.</p>
              </div>
              <span className="console-count">{sim.console.length} sor</span>
            </div>
            <div className="console-output" ref={consoleRef} role="log" aria-live="polite">
              {sim.console.length === 0 ? (
                <p className="console-empty">A program még nem írt ki semmit.</p>
              ) : (
                sim.console.map((entry, index) => (
                  <div className="console-line" key={`${entry.line}-${index}`}>
                    <span className="console-line-number">{entry.line}</span>
                    <span>{entry.text}</span>
                  </div>
                ))
              )}
            </div>
          </section>
        </div>

        <div className="play-side">
          <section className="panel program-panel" aria-labelledby="program-title">
            <div className="panel-header">
              <div>
                <h2 id="program-title">Program</h2>
                <p className="panel-subtitle">
                  MineScript · {source.split('\n').length} sor · legfeljebb{' '}
                  {MAX_PROCESSED_LINES} feldolgozott programsor
                </p>
              </div>
              <span className={`run-status run-status-${status}`}>{statusLabel}</span>
            </div>

            <div className="program-toolbar">
              <select
                value={selectedSample}
                onChange={(event) => handleSampleChange(event.target.value)}
                disabled={isRunning}
                aria-label="Mintaprogram betöltése"
              >
                <option value="">Mintaprogram betöltése…</option>
                {samples.map((sample) => (
                  <option key={sample.name} value={sample.name}>
                    {sample.name}
                  </option>
                ))}
              </select>
              <button
                type="button"
                className="btn btn-ghost btn-small"
                onClick={() => programFileRef.current?.click()}
                disabled={isRunning}
              >
                Import
              </button>
              <button
                type="button"
                className="btn btn-ghost btn-small"
                onClick={handleProgramExport}
              >
                Export
              </button>
              <button
                type="button"
                className="btn btn-ghost btn-small"
                onClick={() => handleSourceChange('')}
                disabled={isRunning}
              >
                Törlés
              </button>
              <input
                ref={programFileRef}
                type="file"
                accept=".txt,.minescript,text/plain"
                hidden
                onChange={handleProgramImport}
              />
            </div>

            <ProgramEditor
              value={source}
              onChange={handleSourceChange}
              readOnly={isRunning}
              currentLine={sim.currentLine}
              errorLine={sim.error?.line ?? parseError?.line ?? null}
              ariaLabel={`MineScript program a(z) ${map.name} térképhez`}
            />

            {samples.find((sample) => sample.name === selectedSample) && (
              <p className="sample-description">
                {samples.find((sample) => sample.name === selectedSample)?.description}
              </p>
            )}
            {parseError && (
              <p className="field-hint error-text">
                {parseError.line}. sor: {parseError.message}
              </p>
            )}

            <div className="run-controls">
              <button
                type="button"
                className="btn btn-primary btn-run"
                onClick={handleRun}
                disabled={isRunning}
                title="Futtatás (Ctrl + Enter)"
              >
                {isRunning ? 'Futás folyamatban…' : completed ? 'Újrafuttatás' : 'Futtatás'}
              </button>
              {isRunning && (
                <button type="button" className="btn btn-danger" onClick={handleStop}>
                  Leállítás
                </button>
              )}
              <button
                type="button"
                className="btn btn-ghost"
                onClick={handleReset}
                disabled={isRunning}
              >
                Visszaállítás
              </button>
              <label className="speed-field">
                <span>Sebesség</span>
                <select
                  value={speed}
                  onChange={(event) => setSpeed(event.target.value as Speed)}
                  aria-label="Animáció sebessége"
                >
                  {SPEED_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </label>
            </div>

            <p className="shortcut-hint">
              Tipp: a <kbd>Ctrl</kbd> + <kbd>Enter</kbd> (macon <kbd>⌘</kbd> + <kbd>Enter</kbd>)
              azonnal elindítja a programot.
            </p>

            <div className={`verification-row verification-${submission}`}>
              {submission === 'idle' && (
                <span className="muted small-text">
                  A futás végén a szerver újrafuttatja a programot, és az eredményt hitelesíti.
                </span>
              )}
              {submission === 'saving' && (
                <span className="verification-saving">
                  <span className="loader-spinner tiny" aria-hidden="true" /> Eredmény hitelesítése…
                </span>
              )}
              {submission === 'saved' && serverResult && savedRun && (
                <span className="verification-saved">
                  ✓ Hitelesítve a szerveren · {serverResult.gold} arany · {serverResult.steps} lépés
                  {savedRun.error ? ` · ${savedRun.error.code}` : ''}
                </span>
              )}
              {submission === 'error' && (
                <div className="verification-error">
                  <span>{submitError}</span>
                  {currentRunRef.current && (
                    <button
                      type="button"
                      className="btn btn-ghost btn-small"
                      onClick={() => {
                        if (currentRunRef.current) void submitRun(currentRunRef.current);
                      }}
                    >
                      Újrapróbálás
                    </button>
                  )}
                </div>
              )}
            </div>
          </section>

          <Leaderboard
            entries={leaderboard}
            loading={leaderboardLoading}
            error={leaderboardError}
            totalGold={map.goldCount}
            onRefresh={() => void loadLeaderboard(map.id)}
          />
        </div>
      </div>
    </div>
  );
}
