import {
  cellKindLabel,
  DIRECTION_LABELS_HU,
  type CellKind,
  type GameMap,
  type RobotState,
} from '@minescript/shared';
import type { CSSProperties } from 'react';
import { MiningRobot } from './GameIcon';

interface MapViewProps {
  map: GameMap;
  robot?: RobotState;
  cells?: CellKind[][];
  discovered?: boolean[][];
  /** Igaz esetén a felderítetlen mezők teljesen sötétek; egyébként a falak és az aranyak halványan látszanak. */
  fullDark?: boolean;
  className?: string;
  ariaLabel?: string;
  interactive?: boolean;
  onCellPointerDown?: (row: number, col: number) => void;
  onCellPointerEnter?: (row: number, col: number) => void;
  onCellActivate?: (row: number, col: number) => void;
}

const ROTATION: Record<RobotState['direction'], number> = {
  N: 0,
  E: 90,
  S: 180,
  W: 270,
};

export function MapView({
  map,
  robot,
  cells,
  discovered,
  fullDark = false,
  className = '',
  ariaLabel,
  interactive = false,
  onCellPointerDown,
  onCellPointerEnter,
  onCellActivate,
}: MapViewProps) {
  const activeRobot = robot ?? map.robot;
  const activeCells = cells ?? map.cells;
  const width = map.width;
  const height = map.height;

  return (
    <div
      className={`map-view ${className}`.trim()}
      style={{
        gridTemplateColumns: `repeat(${width}, minmax(0, 1fr))`,
        aspectRatio: `${width} / ${height}`,
        '--cols': width,
        '--rows': height,
        '--map-max-width': `${Math.min(720, 520 * width / height)}px`,
      } as CSSProperties}
      role={interactive ? 'group' : 'img'}
      aria-label={
        ariaLabel ??
        `${width} oszlopból és ${height} sorból álló térkép. A robot a ${activeRobot.row + 1}. sor ${activeRobot.col + 1}. oszlopában áll, arccal ${DIRECTION_LABELS_HU[activeRobot.direction]} felé.`
      }
    >
      {activeCells.map((row, rowIndex) =>
        row.map((kind, colIndex) => {
          const hidden = discovered ? !discovered[rowIndex]?.[colIndex] : false;
          const showFaint = hidden && !fullDark && kind !== 'empty';
          const cellClassName = hidden
            ? showFaint
              ? `map-cell-hidden map-cell-faint map-cell-faint-${kind}`
              : 'map-cell-hidden'
            : `map-cell-${kind}`;
          return (
            <div
              key={`${rowIndex}:${colIndex}`}
              className={`map-cell ${cellClassName}`}
              role={interactive ? 'button' : undefined}
              tabIndex={interactive ? 0 : undefined}
              aria-label={interactive ? `${rowIndex + 1}. sor, ${colIndex + 1}. oszlop: ${activeRobot.row === rowIndex && activeRobot.col === colIndex ? 'robot' : cellKindLabel(kind)}` : undefined}
              onKeyDown={interactive ? (event) => {
                const offsets: Record<string, number> = { ArrowLeft: -1, ArrowRight: 1, ArrowUp: -width, ArrowDown: width };
                if (event.key in offsets) {
                  event.preventDefault();
                  const index = rowIndex * width + colIndex + offsets[event.key];
                  if (index >= 0 && index < width * height) {
                    (event.currentTarget.parentElement?.children[index] as HTMLElement)?.focus();
                  }
                }
                if (event.key === 'Enter' || event.key === ' ') {
                  event.preventDefault();
                  onCellActivate?.(rowIndex, colIndex);
                }
              } : undefined}
              title={`${rowIndex + 1}. sor, ${colIndex + 1}. oszlop: ${
                hidden ? 'még nem felderített mező' : cellKindLabel(kind)
              }`}
              onPointerDown={
                interactive && onCellPointerDown
                  ? () => onCellPointerDown(rowIndex, colIndex)
                  : undefined
              }
              onPointerEnter={
                interactive && onCellPointerEnter
                  ? () => onCellPointerEnter(rowIndex, colIndex)
                  : undefined
              }
            >
              {!hidden && kind === 'gold' && (
                <span className="gold-nugget" aria-hidden="true" />
              )}
            </div>
          );
        }),
      )}

      <div
        className="map-robot"
        style={
          {
            left: `${((activeRobot.col + 0.5) / width) * 100}%`,
            top: `${((activeRobot.row + 0.5) / height) * 100}%`,
            '--robot-rotation': `${ROTATION[activeRobot.direction]}deg`,
          } as CSSProperties
        }
        aria-hidden="true"
      >
        <MiningRobot />
      </div>
    </div>
  );
}
