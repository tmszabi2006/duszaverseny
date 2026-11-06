import { describe, expect, it } from 'vitest';
import {
  countGold,
  DEMO_MAPS,
  formatMap,
  mapToGrid,
  parseGrid,
  parseMap,
  type GameMap,
} from '../src/index.js';

const EXAMPLE = ['3 15', '....@..........', '.#############.', '.......@...>...'].join('\n');

describe('parseMap', () => {
  it('beolvassa a feladatsor példatérképét', () => {
    const result = parseMap(EXAMPLE);
    expect(result.ok).toBe(true);
    if (!result.ok) return;

    expect(result.map.width).toBe(15);
    expect(result.map.height).toBe(3);
    expect(result.map.robot).toEqual({ row: 2, col: 11, direction: 'E' });
    expect(result.map.cells[0][4]).toBe('gold');
    expect(result.map.cells[2][7]).toBe('gold');
    expect(result.map.cells[1][0]).toBe('empty');
    expect(result.map.cells[1][7]).toBe('wall');
    expect(countGold(result.map)).toBe(2);
  });

  it('elfogadja a CRLF sorvégeket és az egy záró újsort', () => {
    const result = parseMap('1 1\r\n>\r\n');
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.map.robot).toEqual({ row: 0, col: 0, direction: 'E' });
    }
  });

  it('elfogadja a BOM-ot', () => {
    expect(parseMap('\uFEFF1 2\n>.').ok).toBe(true);
  });

  it('körbe tudja alakítani a térképet szöveggé', () => {
    const result = parseMap(EXAMPLE);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(formatMap(result.map)).toBe(EXAMPLE);
    expect(mapToGrid(result.map)).toEqual(EXAMPLE.split('\n').slice(1));
  });

  it('elutasítja az üres fájlt', () => {
    expect(parseMap('')).toMatchObject({ ok: false, error: expect.stringContaining('üres') });
    expect(parseMap('   \n ').ok).toBe(false);
  });

  it('elutasítja a hibás fejlécet', () => {
    expect(parseMap('3\n...\n...\n...')).toMatchObject({ ok: false, line: 1 });
    expect(parseMap('3 0\n...').ok).toBe(false);
    expect(parseMap('16 1\n................').ok).toBe(false);
    expect(parseMap('1 16\n>').ok).toBe(false);
  });

  it('elutasítja a hiányzó és a túl sok sort', () => {
    expect(parseMap('2 2\n>.\n')).toMatchObject({ ok: false, error: expect.stringContaining('2 sorból') });
    expect(parseMap('1 1\n>\n.\n')).toMatchObject({ ok: false, line: 3 });
  });

  it('elutasítja a rossz hosszú sort', () => {
    expect(parseMap('2 3\n>..\n..')).toMatchObject({ ok: false, line: 3 });
  });

  it('elutasítja az érvénytelen karaktert és a tabulátort', () => {
    expect(parseMap('1 3\n>.x')).toMatchObject({ ok: false, line: 2 });
    expect(parseMap('1 3\n>\t.')).toMatchObject({ ok: false, line: 2 });
  });

  it('elutasítja a robot nélküli és a több robotos térképet', () => {
    expect(parseMap('1 3\n...')).toMatchObject({ ok: false, error: expect.stringContaining('robot') });
    expect(parseMap('1 3\n>.<')).toMatchObject({ ok: false, line: 2 });
  });

  it('nem módosítja a bemenetet', () => {
    const text = '2 2\n>@\n..';
    const result = parseMap(text);
    expect(result.ok).toBe(true);
    if (result.ok) {
      const map: GameMap = result.map;
      expect(map.cells[0][1]).toBe('gold');
    }
  });
});

describe('parseGrid', () => {
  it('a rács méretéből állítja elő a fejlécet', () => {
    const result = parseGrid(['>@', '..']);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.map.width).toBe(2);
    expect(result.map.height).toBe(2);
    expect(result.map.robot.row).toBe(0);
    expect(result.map.cells[0][1]).toBe('gold');
  });

  it('elutasítja az üres és a szabálytalan rácsot', () => {
    expect(parseGrid([]).ok).toBe(false);
    expect(parseGrid(['>@', '.']).ok).toBe(false);
    expect(parseGrid(['>', '...']).ok).toBe(false);
  });
});

describe('demo térképek', () => {
  it('minden rendszer-térkép érvényes és van benne arany', () => {
    expect(DEMO_MAPS.length).toBeGreaterThan(0);
    for (const demo of DEMO_MAPS) {
      const parsed = parseMap(demo.data);
      expect(parsed.ok, demo.name).toBe(true);
      if (!parsed.ok) continue;
      expect(parsed.map.width).toBeGreaterThanOrEqual(1);
      expect(parsed.map.width).toBeLessThanOrEqual(15);
      expect(parsed.map.height).toBeGreaterThanOrEqual(1);
      expect(parsed.map.height).toBeLessThanOrEqual(15);
      expect(countGold(parsed.map)).toBeGreaterThan(0);
      expect(formatMap(parsed.map)).toBe(demo.data);
    }
  });

  it('a rendszer-térképnevek egyediek', () => {
    const names = DEMO_MAPS.map((demo) => demo.name);
    expect(new Set(names).size).toBe(names.length);
  });
});
