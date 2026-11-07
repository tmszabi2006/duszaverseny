import {
  cellKindLabel,
  DIRECTION_LABELS_HU,
  type CellKind,
  type GameMap,
  type RobotState,
} from '@minescript/shared';
import type { CSSProperties } from 'react';

interface MapViewProps {
  map: GameMap;
  robot?: RobotState;
  cells?: CellKind[][];
  discovered?: boolean[][];
  className?: string;
  ariaLabel?: string;
  interactive?: boolean;
  onCellPointerDown?: (row: number, col: number) => void;
  onCellPointerEnter?: (row: number, col: number) => void;
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
  className = '',
  ariaLabel,
  interactive = false,
  onCellPointerDown,
  onCellPointerEnter,
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
          return (
            <div
              key={`${rowIndex}:${colIndex}`}
              className={`map-cell ${hidden ? 'map-cell-hidden' : `map-cell-${kind}`}`}
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
        <svg viewBox="0 0 24 24" focusable="false">
          <path d="M12 2.2 20.4 20.4 12 16.2 3.6 20.4Z" />
        </svg>
      </div>
    </div>
  );
}
