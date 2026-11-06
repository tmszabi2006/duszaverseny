import {
  ARROW_TO_DIRECTION,
  DIRECTION_TO_ARROW,
  MAP_MAX_SIZE,
  MAP_MIN_SIZE,
  cellKey,
  type CellKind,
  type Direction,
  type GameMap,
  type MapParseResult,
  type Position,
  type RobotState,
} from './types.js';

const HEADER_RE = /^\s*(\d+)\s+(\d+)\s*$/;
const ALLOWED_CELL_CHARS = new Set(['.', '#', '@']);

/**
 * Térképfájl beolvasása és validálása az 1. fejezet szabályai szerint.
 *
 * Formátum:
 *   <sorok száma> <oszlopok száma>
 *   <sorok száma darab, pontosan oszlopok száma hosszú sor>
 *
 * A `.` üres, a `#` fal, az `@` aranyrög, a `> < ^ v` pedig a robotot jelöli.
 */
export function parseMap(text: string): MapParseResult {
  const source = text.replace(/^\uFEFF/, '').replace(/\r\n?/g, '\n');

  if (source.trim() === '') {
    return { ok: false, error: 'A térképfájl üres.' };
  }

  const lines = source.split('\n');
  if (lines[lines.length - 1] === '') {
    lines.pop();
  }

  const header = lines[0];
  const headerMatch = HEADER_RE.exec(header);
  if (!headerMatch) {
    return {
      ok: false,
      line: 1,
      error:
        'Az első sorban a sorok és az oszlopok száma áll, két egész számként, szóközzel elválasztva (pl. „7 7”).',
    };
  }

  // A formátum első száma a sorok (magasság), a második az oszlopok (szélesség)
  // száma. A feladatsor példája is ezt követi: „3 15” = 3 sor × 15 oszlop.
  const height = Number(headerMatch[1]);
  const width = Number(headerMatch[2]);

  if (
    !Number.isInteger(width) ||
    !Number.isInteger(height) ||
    width < MAP_MIN_SIZE ||
    height < MAP_MIN_SIZE ||
    width > MAP_MAX_SIZE ||
    height > MAP_MAX_SIZE
  ) {
    return {
      ok: false,
      line: 1,
      error: `A térkép sorainak és oszlopainak száma ${MAP_MIN_SIZE} és ${MAP_MAX_SIZE} közötti egész szám lehet.`,
    };
  }

  const rowCount = lines.length - 1;
  if (rowCount < height) {
    return {
      ok: false,
      error: `A térképnek ${height} sorból kell állnia, de csak ${rowCount} sor található a fájlban.`,
    };
  }
  if (rowCount > height) {
    return {
      ok: false,
      line: 2 + height,
      error: `A térkép a megadott ${height} sornál több sort tartalmaz.`,
    };
  }

  const cells: CellKind[][] = [];
  let robot: RobotState | null = null;

  for (let row = 0; row < height; row++) {
    const raw = lines[row + 1];
    const lineNo = row + 2;

    if (raw.length !== width) {
      return {
        ok: false,
        line: lineNo,
        error: `A(z) ${lineNo}. sornak pontosan ${width} karakterből kell állnia, de ${raw.length} karaktert tartalmaz.`,
      };
    }

    const cellRow: CellKind[] = [];
    for (let col = 0; col < width; col++) {
      const ch = raw[col];
      if (ch === '.') {
        cellRow.push('empty');
      } else if (ch === '#') {
        cellRow.push('wall');
      } else if (ch === '@') {
        cellRow.push('gold');
      } else if (ch in ARROW_TO_DIRECTION) {
        if (robot) {
          return {
            ok: false,
            line: lineNo,
            error: `A térképen pontosan egy robot lehet, de a(z) ${lineNo}. sor ${col + 1}. oszlopában újabb robot szerepel.`,
          };
        }
        robot = {
          row,
          col,
          direction: ARROW_TO_DIRECTION[ch] as Direction,
        };
        cellRow.push('empty');
      } else {
        const shown = ch === '\t' ? 'tabulátor' : `„${ch}”`;
        return {
          ok: false,
          line: lineNo,
          error: `A(z) ${lineNo}. sor ${col + 1}. oszlopában érvénytelen karakter áll (${shown}). Megengedett karakterek: . # @ > < ^ v`,
        };
      }
    }
    cells.push(cellRow);
  }

  if (!robot) {
    return {
      ok: false,
      error: 'A térképen pontosan egy robotnak kell lennie, de egy sem található. Használd a > < ^ v karakterek valamelyikét.',
    };
  }

  return {
    ok: true,
    map: { width, height, cells, robot },
  };
}

/** Kanonikus térképfájl-előállítás (mentéshez és exportáláshoz). */
export function formatMap(map: GameMap): string {
  const rows: string[] = [];
  for (let row = 0; row < map.height; row++) {
    let line = '';
    for (let col = 0; col < map.width; col++) {
      if (map.robot.row === row && map.robot.col === col) {
        line += DIRECTION_TO_ARROW[map.robot.direction];
      } else {
        const cell = map.cells[row][col];
        line += cell === 'wall' ? '#' : cell === 'gold' ? '@' : '.';
      }
    }
    rows.push(line);
  }
  return `${map.height} ${map.width}\n${rows.join('\n')}`;
}

/** Szöveges rács (a szerkesztő állapota) átalakítása térképpé. */
export function parseGrid(grid: string[]): MapParseResult {
  if (grid.length === 0) {
    return { ok: false, error: 'A térkép nem tartalmaz sorokat.' };
  }
  const width = grid[0].length;
  return parseMap(`${grid.length} ${width}\n${grid.join('\n')}`);
}

/** A térkép szöveges rácsaként adja vissza (a szerkesztőhöz). */
export function mapToGrid(map: GameMap): string[] {
  return formatMap(map).split('\n').slice(1);
}

export function countGold(map: GameMap): number {
  let count = 0;
  for (const row of map.cells) {
    for (const cell of row) {
      if (cell === 'gold') count++;
    }
  }
  return count;
}

export function cloneMap(map: GameMap): GameMap {
  return {
    width: map.width,
    height: map.height,
    cells: map.cells.map((row) => [...row]),
    robot: { ...map.robot },
  };
}

export function isInside(map: { width: number; height: number }, pos: Position): boolean {
  return pos.row >= 0 && pos.row < map.height && pos.col >= 0 && pos.col < map.width;
}

export function frontPosition(robot: RobotState, steps = 1): Position {
  switch (robot.direction) {
    case 'N':
      return { row: robot.row - steps, col: robot.col };
    case 'E':
      return { row: robot.row, col: robot.col + steps };
    case 'S':
      return { row: robot.row + steps, col: robot.col };
    case 'W':
      return { row: robot.row, col: robot.col - steps };
  }
}

export function rotateLeft(direction: Direction, quarterTurns: number): Direction {
  const order: Direction[] = ['E', 'N', 'W', 'S'];
  const index = order.indexOf(direction);
  const next = (index + (quarterTurns % 4) + 4) % 4;
  return order[next] as Direction;
}

/** Emberi olvasásra szánt cellanév. */
export function cellKindLabel(kind: CellKind): string {
  return kind === 'wall' ? 'fal' : kind === 'gold' ? 'aranyrög' : 'üres kamra';
}

export function discoveredSummary(discovered: boolean[][]): string[] {
  const result: string[] = [];
  for (let row = 0; row < discovered.length; row++) {
    for (let col = 0; col < discovered[row].length; col++) {
      if (discovered[row][col]) result.push(cellKey(row, col));
    }
  }
  return result;
}
