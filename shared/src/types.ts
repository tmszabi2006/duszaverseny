/**
 * A MineScript térkép- és futásmodellje.
 *
 * A belső koordináták 0-alapúak. A felületen és a hibaüzenetekben
 * a sorokat és oszlopokat 1-alapúan jelenítjük meg.
 */

export type Direction = 'N' | 'E' | 'S' | 'W';
export type CellKind = 'empty' | 'wall' | 'gold';

export interface Position {
  row: number;
  col: number;
}

export interface RobotState extends Position {
  direction: Direction;
}

export interface GameMap {
  width: number;
  height: number;
  /** cells[row][col] – a robotot nem tartalmazza, az külön mező. */
  cells: CellKind[][];
  robot: RobotState;
}

export interface MapParseSuccess {
  ok: true;
  map: GameMap;
}

export interface MapParseFailure {
  ok: false;
  error: string;
  /** 1-alapú sor a forrásfájlban, ha megállapítható. */
  line?: number;
}

export type MapParseResult = MapParseSuccess | MapParseFailure;

export const MAP_MIN_SIZE = 1;
export const MAP_MAX_SIZE = 15;

export const DIRECTION_TO_ARROW: Record<Direction, string> = {
  E: '>',
  W: '<',
  N: '^',
  S: 'v',
};

export const ARROW_TO_DIRECTION: Record<string, Direction> = {
  '>': 'E',
  '<': 'W',
  '^': 'N',
  'v': 'S',
};

export const DIRECTION_LABELS_HU: Record<Direction, string> = {
  E: 'kelet',
  N: 'észak',
  W: 'nyugat',
  S: 'dél',
};

export function cellKey(row: number, col: number): string {
  return `${row}:${col}`;
}
