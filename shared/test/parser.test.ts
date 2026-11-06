import { describe, expect, it } from 'vitest';
import { parseProgram, type Command, type Program } from '../src/index.js';

function parseOk(source: string): Program {
  const result = parseProgram(source);
  expect(result.ok, result.ok ? '' : result.error.message).toBe(true);
  if (!result.ok) throw new Error('unreachable');
  return result.program;
}

function parseError(source: string): { line: number; message: string } {
  const result = parseProgram(source);
  expect(result.ok).toBe(false);
  if (result.ok) throw new Error('unreachable');
  return result.error;
}

describe('parseProgram – alapok', () => {
  it('beolvassa a feladatsor példaprogramját', () => {
    const program = parseOk(
      [
        'set count to 0',
        'set fal to isThere 1',
        'set megy to not fal',
        'print count',
      ].join('\n'),
    );
    expect(program.commands).toHaveLength(4);
    expect(program.commands[0]).toMatchObject({ kind: 'set', name: 'count' });
    expect(program.commands[1]).toMatchObject({ kind: 'set', name: 'fal' });
    expect(program.commands[2]).toMatchObject({ kind: 'set', name: 'megy' });
    expect(program.commands[3]).toMatchObject({ kind: 'print' });
  });

  it('az üres program érvényes', () => {
    expect(parseOk('').commands).toEqual([]);
    expect(parseOk('  \n ').commands).toEqual([]);
  });

  it('az üres sor hibás, ha van más utasítás is', () => {
    const error = parseError('set x to 1\n\nprint x');
    expect(error.line).toBe(2);
    expect(error.message).toContain('Üres sor');
  });

  it('a tabulátor hibás', () => {
    const error = parseError('if true\n\tprint 1');
    expect(error.line).toBe(2);
    expect(error.message).toContain('Tabulátor');
  });

  it('a tokenek között pontosan egy szóköz lehet', () => {
    expect(parseError('set  x to 1').message).toContain('egy szóköz');
    expect(parseError('set x to 1 ').message).toContain('sor végén');
  });
});

describe('parseProgram – behúzás', () => {
  it('az első utasítás nem lehet behúzva', () => {
    expect(parseError('  set x to 1')).toMatchObject({ line: 1 });
  });

  it('blokkon belül egységes behúzás kell', () => {
    const error = parseError(['if true', '  print 1', '   print 2'].join('\n'));
    expect(error.line).toBe(3);
    expect(error.message).toContain('Váratlan behúzás');
  });

  it('különböző blokkokban eltérő behúzás lehet', () => {
    parseOk(
      [
        'if true',
        '  if false',
        '      print 1',
        '  else',
        '   print 2',
        'else',
        '        print 3',
      ].join('\n'),
    );
  });

  it('behúzás csak blokk után lehet', () => {
    const error = parseError(['set x to 1', '  print x'].join('\n'));
    expect(error.line).toBe(2);
    expect(error.message).toContain('Váratlan behúzás');
  });

  it('kezeli a beágyazott blokkokat', () => {
    const program = parseOk(
      [
        'set i to 0',
        'set megy to true',
        'while megy',
        '  set egyenlo to i = 0',
        '  if egyenlo',
        '    print 0',
        '  else',
        '    print 1',
        '  set megy to false',
      ].join('\n'),
    );
    const loop = program.commands[2] as Extract<Command, { kind: 'while' }>;
    expect(loop.kind).toBe('while');
    expect(loop.body).toHaveLength(3);
    const branch = loop.body[1] as Extract<Command, { kind: 'if' }>;
    expect(branch.kind).toBe('if');
    expect(branch.then).toHaveLength(1);
    expect(branch.else?.body).toHaveLength(1);
  });
});

describe('parseProgram – else', () => {
  it('az else az ifhez kapcsolódik', () => {
    const program = parseOk(['if true', '  print 1', 'else', '  print 2'].join('\n'));
    expect(program.commands[0]).toMatchObject({ kind: 'if' });
    expect(
      (program.commands[0] as Extract<Command, { kind: 'if' }>).else?.body,
    ).toHaveLength(1);
  });

  it('az else csak if után állhat', () => {
    const error = parseError('else\n  print 1');
    expect(error.line).toBe(1);
    expect(error.message).toContain('else');
  });

  it('az else nem kaphat extra tokent', () => {
    const error = parseError(['if true', '  print 1', 'else x', '  print 2'].join('\n'));
    expect(error.line).toBe(3);
  });

  it('az else az iffel azonos behúzáson kell legyen', () => {
    const error = parseError(['if true', '  print 1', '  else', '    print 2'].join('\n'));
    expect(error.line).toBe(3);
  });
});

describe('parseProgram – utasítások és kifejezések', () => {
  it('minden utasításforma beolvasható', () => {
    const program = parseOk(
      [
        'step forward 1',
        'turn by 2',
        'mine here',
        'print 5',
        'set a to 1',
        'set b to isThere 2',
        'set c to not a',
        'set d to a + 2',
        'set e to a <= 2',
        'set f to true and false',
        'if a',
        '  print a',
        'while b',
        '  set a to a - 1',
      ].join('\n'),
    );
    expect(program.commands).toHaveLength(12);
  });

  it('a számok 0 és 100 közöttiek', () => {
    expect(parseOk('print 100')).toBeTruthy();
    expect(parseError('print 101').line).toBe(1);
    expect(parseError('print 1000').message).toContain('100');
  });

  it('túl hosszú kifejezés hibás', () => {
    expect(parseError('set x to 1 + 2 * 3').message).toContain('Túl hosszú');
    expect(parseError('set x to not true false').message).toContain('egyetlen érték');
  });

  it('az if és a while feltétele egyetlen érték', () => {
    expect(parseError('if isThere 1\n  print 1').message).toContain('mentsd el');
    expect(parseError('while 1 = 1\n  print 1').message).toContain('egyetlen érték');
  });

  it('a print csak egyetlen értéket fogad', () => {
    expect(parseError('print isThere 1').message).toContain('mentsd el');
    expect(parseError('print 1 + 2').message).toContain('egyetlen értéket');
  });

  it('a step és a turn kötelező kulcsszavai rögzítettek', () => {
    expect(parseError('step 1').message).toContain('forward');
    expect(parseError('turn 1').message).toContain('by');
    expect(parseError('mine').message).toContain('mine here');
  });

  it('a set szerkezete kötött', () => {
    expect(parseError('set x 1').message).toContain('to');
    expect(parseError('set 1 to 2').message).toContain('változónév');
    expect(parseError('set x to').message).toContain('helyes alak');
  });

  it('ismeretlen utasítás hibás', () => {
    expect(parseError('jump 1').message).toContain('Ismeretlen utasítás');
    expect(parseError('isThere 1').message).toContain('csak kifejezés');
  });
});

describe('parseProgram – kis- és nagybetűérzékenység', () => {
  it('a kulcsszavak alakja kötött', () => {
    expect(parseError('Step forward 1').message).toContain('kis- és nagybetűérzékenyek');
    expect(parseError('set x to isthere 1').message).toContain('kis- és nagybetűérzékenyek');
  });

  it('a kulcsszavak bármilyen betűzésű változata foglalt', () => {
    expect(parseError('set While to 1').message).toContain('kulcsszóra hasonlít');
    expect(parseError('set SET to 1').message).toContain('kulcsszóra hasonlít');
  });

  it('a változónevek megkülönböztetik a kis- és nagybetűt', () => {
    const program = parseOk(['set arany to 1', 'set Arany to 2', 'print arany'].join('\n'));
    expect(program.commands).toHaveLength(3);
  });
});
