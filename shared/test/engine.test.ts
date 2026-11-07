import { describe, expect, it } from 'vitest';
import {
  MAX_PROCESSED_LINES,
  parseMap,
  parseProgram,
  runProgram,
  type ExecutionResult,
  type GameMap,
  type Program,
} from '../src/index.js';

function makeMap(rows: string[]): GameMap {
  const width = rows[0].length;
  const result = parseMap(`${rows.length} ${width}\n${rows.join('\n')}`);
  if (!result.ok) throw new Error(result.error);
  return result.map;
}

function makeProgram(source: string): Program {
  const result = parseProgram(source);
  if (!result.ok) throw new Error(`${result.error.line}: ${result.error.message}`);
  return result.program;
}

function run(rows: string[] | GameMap, source: string): ExecutionResult {
  const map = Array.isArray(rows) ? makeMap(rows) : rows;
  return runProgram(map, makeProgram(source));
}

describe('runProgram – robotmozgás', () => {
  it('az üres program azonnal sikeresen véget ér', () => {
    const result = run(['>.'], '');
    expect(result.error).toBeNull();
    expect(result.steps).toBe(0);
    expect(result.gold).toBe(0);
    expect(result.robot).toEqual({ row: 0, col: 0, direction: 'E' });
    expect(result.events.map((event) => event.type)).toEqual(['end']);
  });

  it('előrehalad és felfedezi a mezőket', () => {
    const result = run(['>....'], 'step forward 2');
    expect(result.error).toBeNull();
    expect(result.robot).toEqual({ row: 0, col: 2, direction: 'E' });
    expect(result.steps).toBe(1);
    expect(result.discovered[0]).toEqual([true, true, true, false, false]);
    expect(result.events.filter((event) => event.type === 'move')).toHaveLength(2);
  });

  it('a step forward 0 érvényes', () => {
    const result = run(['>.'], 'step forward 0');
    expect(result.error).toBeNull();
    expect(result.robot).toEqual({ row: 0, col: 0, direction: 'E' });
    expect(result.steps).toBe(1);
  });

  it('falnak ütközéskor megáll, a megtett lépések megmaradnak', () => {
    const result = run(['>...#'], 'step forward 5');
    expect(result.error).toMatchObject({ code: 'E_BEDROCK_HIT', line: 1 });
    expect(result.robot).toEqual({ row: 0, col: 3, direction: 'E' });
    expect(result.steps).toBe(1);
  });

  it('a térkép szélén is hibát ad', () => {
    const result = run(['>...'], 'step forward 5');
    expect(result.error).toMatchObject({ code: 'E_BEDROCK_HIT', line: 1 });
    expect(result.robot).toEqual({ row: 0, col: 3, direction: 'E' });
  });

  it('balra fordul negyedfordulatokkal', () => {
    expect(run(['>.'], 'turn by 1').robot.direction).toBe('N');
    expect(run(['>.'], 'turn by 2').robot.direction).toBe('W');
    expect(run(['>.'], 'turn by 3').robot.direction).toBe('S');
    expect(run(['>.'], 'turn by 4').robot.direction).toBe('E');
    expect(run(['>.'], 'turn by 0').robot.direction).toBe('E');
  });

  it('a turn negatív vagy nem egész paramétere hibás', () => {
    expect(run(['>.'], 'set x to 0 - 1\nturn by x').error).toMatchObject({
      code: 'E_BAD_ARG',
      line: 2,
    });
    expect(run(['>.'], 'turn by true').error).toMatchObject({ code: 'E_BAD_ARG' });
  });

  it('a step nemnegatív egész paramétert vár', () => {
    expect(run(['>.'], 'set x to 0 - 2\nstep forward x').error).toMatchObject({
      code: 'E_BAD_ARG',
      line: 2,
    });
    expect(run(['>.'], 'step forward false').error).toMatchObject({ code: 'E_BAD_ARG' });
  });
});

describe('runProgram – arany és isThere', () => {
  it('az utolsó arany után a beágyazott végtelen ciklusból is sikeresen kilép', () => {
    const result = run(['>@'], 'while true\n    if true\n        step forward 1\n        mine here\n        print 99');
    expect(result.error).toBeNull();
    expect(result.gold).toBe(1);
    expect(result.steps).toBe(4);
    expect(result.console).toEqual([]);
    expect(result.events.slice(-2).map(event => event.type)).toEqual(['mine', 'end']);
  });

  it('az első arany után folytatódik, amíg maradt másik', () => {
    const result = run(['>@.@'], 'step forward 1\nmine here\nprint 7\nstep forward 2\nmine here\nprint 99');
    expect(result.gold).toBe(2);
    expect(result.error).toBeNull();
    expect(result.console.map(entry => entry.text)).toEqual(['7']);
  });
  it('a robot ráléphet az aranyra, de csak a mine here szedi fel', () => {
    const result = run(['>..@'], 'step forward 3\nmine here\nmine here');
    expect(result.error).toBeNull();
    expect(result.steps).toBe(2);
    expect(result.gold).toBe(1);
    expect(result.cells[0][3]).toBe('empty');
  });

  it('az isThere a robot előtti mezőt vizsgálja és felfedi', () => {
    const result = run(
      ['>@.#'],
      ['set a to isThere 2', 'set b to isThere 1', 'set c to isThere 0', 'print a', 'print b', 'print c'].join(
        '\n',
      ),
    );
    expect(result.error).toBeNull();
    expect(result.console.map((entry) => entry.text)).toEqual(['true', 'false', 'false']);
    expect(result.discovered[0]).toEqual([true, true, false, false]);
  });

  it('a térképen kívüli mezőt falnak tekinti', () => {
    const result = run(
      ['>'],
      ['set a to isThere 1', 'set b to isThere 0', 'set c to isThere 2', 'print a', 'print b', 'print c'].join(
        '\n',
      ),
    );
    expect(result.error).toBeNull();
    expect(result.console.map((entry) => entry.text)).toEqual(['true', 'false', 'false']);
  });

  it('az isThere csak 0, 1 vagy 2 paramétert fogad el', () => {
    expect(run(['>.'], 'set x to isThere 3').error).toMatchObject({
      code: 'E_BAD_ARG',
      line: 1,
    });
    expect(run(['>.'], 'set x to isThere true').error).toMatchObject({ code: 'E_BAD_ARG' });
  });

  it('az isThere oldalsó hatása akkor is megmarad, ha később hiba történik', () => {
    const result = run(['>@#'], 'set x to isThere 2\nmine here');
    expect(result.error).toMatchObject({ code: 'E_NO_GOLD', line: 2 });
    expect(result.discovered[0]).toEqual([true, true, false]);
  });
});

describe('runProgram – szemantika', () => {
  it('a set létrehozza, majd típusrögzítetten frissíti a változót', () => {
    const result = run(['>.'], 'set x to 1\nset x to 2\nprint x');
    expect(result.error).toBeNull();
    expect(result.console[0].text).toBe('2');
  });

  it('típust váltó értékadás hibás', () => {
    const result = run(['>.'], 'set x to 1\nset x to true');
    expect(result.error).toMatchObject({ code: 'E_TYPE_MISMATCH', line: 2 });
    expect(result.steps).toBe(2);
  });

  it('nem inicializált változó olvasása hibás', () => {
    expect(run(['>.'], 'print x').error).toMatchObject({ code: 'E_UNINITIALIZED', line: 1 });
  });

  it('az if és while feltétele logikai kell legyen', () => {
    expect(run(['>.'], 'if 1\n  print 1').error).toMatchObject({
      code: 'E_NON_BOOL_CONDITION',
      line: 1,
    });
    expect(run(['>.'], 'while false\n  print 1').error).toBeNull();
    expect(run(['>.'], 'while 0\n  print 1').error).toMatchObject({
      code: 'E_NON_BOOL_CONDITION',
    });
  });

  it('a műveletek típusellenőrzése futásidőben történik', () => {
    expect(run(['>.'], 'set x to true + 1').error).toMatchObject({ code: 'E_BAD_OPERAND' });
    expect(run(['>.'], 'set x to true and 1').error).toMatchObject({ code: 'E_BAD_OPERAND' });
    expect(run(['>.'], 'set x to 1 = true').error).toMatchObject({ code: 'E_BAD_OPERAND' });
    expect(run(['>.'], 'set x to not 1').error).toMatchObject({ code: 'E_BAD_OPERAND' });
  });

  it('a bal operandus típusát a jobb beolvasása előtt ellenőrzi', () => {
    expect(run(['>.'], 'set x to true + y').error).toMatchObject({ code: 'E_BAD_OPERAND' });
    expect(run(['>.'], 'set x to true = y').error).toMatchObject({ code: 'E_UNINITIALIZED' });
  });

  it('nincs rövidzárlat: a jobb operandust akkor is beolvassa', () => {
    expect(run(['>.'], 'set x to true or y').error).toMatchObject({ code: 'E_UNINITIALIZED' });
    expect(run(['>.'], 'set x to false and y').error).toMatchObject({ code: 'E_UNINITIALIZED' });
  });

  it('kiírja az egész és logikai értékeket', () => {
    const result = run(['>.'], 'print 42\nprint true\nprint false');
    expect(result.console.map((entry) => entry.text)).toEqual(['42', 'true', 'false']);
  });
});

describe('runProgram – vezérlés és sorszámolás', () => {
  it('az if else ág sora csak akkor számít, ha az else lefut', () => {
    const withElse = [
      'set flag to false',
      'if flag',
      '  print 1',
      'else',
      '  print 2',
    ].join('\n');
    const result = run(['>.'], withElse);
    expect(result.error).toBeNull();
    expect(result.steps).toBe(4);
    expect(result.console[0].text).toBe('2');

    const withoutElse = ['set flag to true', 'if flag', '  print 1', 'else', '  print 2'].join(
      '\n',
    );
    const result2 = run(['>.'], withoutElse);
    expect(result2.steps).toBe(3);
    expect(result2.console[0].text).toBe('1');
  });

  it('a while sora minden feltétel-kiértékeléskor számít', () => {
    const result = run(
      ['>.'],
      [
        'set i to 0',
        'set megy to true',
        'while megy',
        '  set i to i + 1',
        '  set megy to i < 2',
        'print i',
      ].join('\n'),
    );
    expect(result.error).toBeNull();
    expect(result.console[0].text).toBe('2');
    // set, set, while(igaz), set, set, while(igaz), set, set, while(hamis), print
    expect(result.steps).toBe(10);
  });

  it('a 1000. feldolgozott sor után megszakad', () => {
    const result = run(['>.'], 'while true');
    expect(result.error).toMatchObject({
      code: 'INSTRUCTION_COUNT_LIMIT_EXCEEDED',
      line: 1,
    });
    expect(result.steps).toBe(MAX_PROCESSED_LINES);
  });

  it('a futásidejű hiba sora és kódja megjelenik', () => {
    const result = run(['>.'], 'print 1\nmine here');
    expect(result.error).toMatchObject({ code: 'E_NO_GOLD', line: 2 });
    expect(result.events.at(-1)).toMatchObject({
      type: 'end',
      error: 'E_NO_GOLD',
      steps: 2,
    });
  });
});

describe('runProgram – izoláció', () => {
  it('nem módosítja a bemeneti térképet', () => {
    const map = makeMap(['>..@']);
    const result = run(map, 'step forward 3\nmine here');
    expect(result.gold).toBe(1);
    expect(map.cells[0][3]).toBe('gold');
    expect(map.robot).toEqual({ row: 0, col: 0, direction: 'E' });
  });

  it('az ismételt futás ugyanazt az eredményt adja', () => {
    const map = makeMap(['>..@']);
    const program = makeProgram('step forward 3\nmine here');
    const first = runProgram(map, program);
    const second = runProgram(map, program);
    expect(first.gold).toBe(second.gold);
    expect(first.steps).toBe(second.steps);
    expect(first.events).toEqual(second.events);
  });
});
