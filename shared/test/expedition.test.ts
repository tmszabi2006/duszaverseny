import { expect, it } from 'vitest';
import { DEMO_MAPS, parseMap, parseProgram, runProgram, countGold } from '../src/index.js';

it('az Örökfagy összes kincse elérhető és 1000 soron belül összegyűjthető', () => {
  const definition = DEMO_MAPS.find(map => map.name === 'Örökfagy labirintusa')!;
  const parsed = parseMap(definition.data);
  if (!parsed.ok) throw new Error(parsed.error);
  const map = parsed.map;
  expect(countGold(map)).toBe(18);
  const cells = map.cells.map(row => [...row]);
  let position = { row: map.robot.row, col: map.robot.col };
  let direction = 1; // N, E, S, W
  const offsets = [[-1,0],[0,1],[1,0],[0,-1]];
  const program: string[] = [];
  for (let gold = 0; gold < 18; gold++) {
    const queue = [{ ...position, path: [] as number[] }];
    const seen = new Set([`${position.row},${position.col}`]);
    let found = false;
    for (let index = 0; index < queue.length; index++) {
      const current = queue[index];
      if (cells[current.row][current.col] === 'gold') {
        for (const next of current.path) {
          const leftTurns = (direction - next + 4) % 4;
          if (leftTurns) program.push(`turn by ${leftTurns}`);
          program.push('step forward 1'); direction = next;
        }
        program.push('mine here'); cells[current.row][current.col] = 'empty';
        position = current; found = true; break;
      }
      offsets.forEach(([dr,dc], next) => {
        const row = current.row + dr, col = current.col + dc, key = `${row},${col}`;
        if (cells[row]?.[col] && cells[row][col] !== 'wall' && !seen.has(key)) {
          seen.add(key); queue.push({row, col, path: [...current.path, next]});
        }
      });
    }
    expect(found).toBe(true);
  }
  const source = parseProgram(program.join('\n'));
  if (!source.ok) throw new Error(source.error.message);
  const result = runProgram(map, source.program);
  expect(result.error).toBeNull(); expect(result.gold).toBe(18);
  expect(result.steps).toBeLessThan(1000);
});
