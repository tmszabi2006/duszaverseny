/**
 * MineScript szintaktikai elemző.
 *
 * A nyelv sororientált és behúzásvezérelt. Egy sor = egy utasítás.
 * A tokeneket pontosan egy szóköz választja el, a behúzás csak szóköz lehet.
 * Beágyazott kifejezés nincs: egy calculatedval legfeljebb
 * `simpleval op simpleval`, `not simpleval` vagy `isThere simpleval` alakú.
 */

export interface SourceValue {
  kind: 'number' | 'bool' | 'ident';
  value: number | boolean | string;
}

export type SimpleValue = SourceValue;

export type BinOperator =
  | '+'
  | '-'
  | '*'
  | '='
  | '<>'
  | '<'
  | '<='
  | '>'
  | '>='
  | 'and'
  | 'or';

export type CalculatedValue =
  | { kind: 'simple'; value: SimpleValue }
  | { kind: 'isThere'; arg: SimpleValue }
  | { kind: 'not'; arg: SimpleValue }
  | { kind: 'binary'; left: SimpleValue; op: BinOperator; right: SimpleValue };

export type Command =
  | { kind: 'step'; line: number; amount: SimpleValue }
  | { kind: 'turn'; line: number; amount: SimpleValue }
  | { kind: 'mine'; line: number }
  | { kind: 'print'; line: number; value: SimpleValue }
  | { kind: 'set'; line: number; name: string; value: CalculatedValue }
  | {
      kind: 'if';
      line: number;
      condition: SimpleValue;
      then: Command[];
      else?: { line: number; body: Command[] };
    }
  | { kind: 'while'; line: number; condition: SimpleValue; body: Command[] };

export interface Program {
  commands: Command[];
}

export interface ProgramParseError {
  /** 1-alapú sor. */
  line: number;
  message: string;
}

export type ProgramParseResult =
  | { ok: true; program: Program }
  | { ok: false; error: ProgramParseError };

const KEYWORDS = [
  'and',
  'by',
  'else',
  'false',
  'forward',
  'here',
  'if',
  'isThere',
  'mine',
  'not',
  'or',
  'print',
  'set',
  'step',
  'to',
  'true',
  'turn',
  'while',
] as const;

type Keyword = (typeof KEYWORDS)[number];

const KEYWORD_SET = new Set<string>(KEYWORDS);
const KEYWORD_BY_LOWER = new Map<string, string>(
  KEYWORDS.map((keyword) => [keyword.toLowerCase(), keyword]),
);

const BIN_OPERATORS = new Set<string>([
  '+',
  '-',
  '*',
  '=',
  '<>',
  '<',
  '<=',
  '>',
  '>=',
  'and',
  'or',
]);

const IDENT_RE = /^[A-Za-z][A-Za-z0-9]*$/;
const NUMBER_RE = /^[0-9]+$/;
const MAX_LITERAL = 100;

interface SourceLine {
  line: number;
  indent: number;
  tokens: string[];
}

class ParserFailure extends Error {
  constructor(
    readonly line: number,
    message: string,
  ) {
    super(message);
    this.name = 'ParserFailure';
  }
}

function fail(line: number, message: string): never {
  throw new ParserFailure(line, message);
}

function isKeyword(token: string): token is Keyword {
  return KEYWORD_SET.has(token);
}

function reservedKeywordHint(token: string): string | null {
  const canonical = KEYWORD_BY_LOWER.get(token.toLowerCase());
  return canonical ?? null;
}

function parseSimpleValue(token: string, line: number, context: string): SimpleValue {
  if (token === 'true') return { kind: 'bool', value: true };
  if (token === 'false') return { kind: 'bool', value: false };

  if (NUMBER_RE.test(token)) {
    const parsed = Number(token);
    if (!Number.isInteger(parsed) || parsed < 0 || parsed > MAX_LITERAL) {
      fail(
        line,
        `${context}: a számnak 0 és ${MAX_LITERAL} közötti egész számnak kell lennie.`,
      );
    }
    return { kind: 'number', value: parsed };
  }

  if (isKeyword(token)) {
    fail(line, `${context}: a(z) „${token}” kulcsszó nem használható értékként.`);
  }

  if (!IDENT_RE.test(token)) {
    fail(line, `${context}: érvénytelen érték: „${token}”.`);
  }

  const reserved = reservedKeywordHint(token);
  if (reserved) {
    fail(
      line,
      `${context}: a(z) „${token}” szó a(z) „${reserved}” kulcsszóra hasonlít, ezért nem használható változónévként (a kulcsszavak kis- és nagybetűtől függetlenül foglaltak).`,
    );
  }

  return { kind: 'ident', value: token };
}

function parseIdentifier(token: string, line: number, context: string): string {
  if (isKeyword(token)) {
    fail(line, `${context}: a(z) „${token}” kulcsszó nem lehet változónév.`);
  }
  if (!IDENT_RE.test(token)) {
    fail(
      line,
      `${context}: érvénytelen változónév: „${token}”. A név betűvel kezdődhet, és csak betűket és számjegyeket tartalmazhat.`,
    );
  }
  const reserved = reservedKeywordHint(token);
  if (reserved) {
    fail(
      line,
      `${context}: a(z) „${token}” szó a(z) „${reserved}” kulcsszóra hasonlít, ezért nem lehet változónév.`,
    );
  }
  return token;
}

function parseBinOperator(token: string, line: number): BinOperator {
  if (!BIN_OPERATORS.has(token)) {
    const canonical = reservedKeywordHint(token);
    if (canonical) {
      fail(
        line,
        `A kulcsszavak kis- és nagybetűérzékenyek; a helyes alak: „${canonical}”.`,
      );
    }
    fail(line, `Érvénytelen művelet: „${token}”.`);
  }
  return token as BinOperator;
}

function parseCalculatedValue(tokens: string[], line: number): CalculatedValue {
  if (tokens.length === 0) {
    fail(line, 'Hiányzik a kifejezés a „to” után.');
  }

  if (tokens.length === 1) {
    return {
      kind: 'simple',
      value: parseSimpleValue(tokens[0], line, 'A kifejezésben'),
    };
  }

  if (tokens.length === 2) {
    const [head, argument] = tokens;
    if (head === 'isThere') {
      return {
        kind: 'isThere',
        arg: parseSimpleValue(argument, line, 'Az isThere paramétere'),
      };
    }
    if (head === 'not') {
      return {
        kind: 'not',
        arg: parseSimpleValue(argument, line, 'A not operandusa'),
      };
    }
    const canonical = reservedKeywordHint(head);
    if (canonical) {
      fail(
        line,
        `A kulcsszavak kis- és nagybetűérzékenyek; a helyes alak: „${canonical}”.`,
      );
    }
    fail(
      line,
      `Érvénytelen kifejezés: „${tokens.join(' ')}”. Két tokenből csak „isThere <érték>” vagy „not <érték>” állhat.`,
    );
  }

  if (tokens.length === 3) {
    if (tokens[0] === 'not' || tokens[0] === 'isThere') {
      fail(
        line,
        `Érvénytelen kifejezés: „${tokens.join(' ')}”. A „${tokens[0]}” után csak egyetlen érték állhat.`,
      );
    }
    const op = parseBinOperator(tokens[1], line);
    return {
      kind: 'binary',
      left: parseSimpleValue(tokens[0], line, 'A művelet bal oldalán'),
      op,
      right: parseSimpleValue(tokens[2], line, 'A művelet jobb oldalán'),
    };
  }

  fail(
    line,
    'Túl hosszú kifejezés: a MineScriptben nincs beágyazott művelet, egy sorban legfeljebb két operandus és egy művelet szerepelhet.',
  );
}

function parseCondition(tokens: string[], line: number, instruction: 'if' | 'while'): SimpleValue {
  if (tokens.length < 2) {
    fail(line, `A(z) „${instruction}” után hiányzik a feltétel.`);
  }
  if (tokens.length > 2) {
    if (tokens[1] === 'isThere') {
      fail(
        line,
        `A(z) „${instruction}” feltétele csak egyetlen érték lehet. Az isThere eredményét előbb mentsd el egy változóba, és azt vizsgáld.`,
      );
    }
    fail(
      line,
      `A(z) „${instruction}” feltétele csak egyetlen érték lehet; összetett kifejezést előbb ments el egy változóba.`,
    );
  }
  return parseSimpleValue(tokens[1], line, `A(z) „${instruction}” feltétele`);
}

function splitSource(source: string): SourceLine[] {
  const normalized = source.replace(/^\uFEFF/, '').replace(/\r\n?/g, '\n');

  // Egy teljesen üres (vagy csak szóközöket tartalmazó) program megengedett.
  if (normalized.trim() === '') {
    if (normalized.includes('\t')) {
      const line = normalized.slice(0, normalized.indexOf('\t')).split('\n').length;
      fail(line, 'Tabulátor nem használható a behúzáshoz; csak szóközök használhatók.');
    }
    return [];
  }

  const lines = normalized.split('\n');
  if (lines[lines.length - 1] === '') {
    lines.pop();
  }

  const records: SourceLine[] = [];

  for (let index = 0; index < lines.length; index++) {
    const raw = lines[index];
    const line = index + 1;

    if (raw.includes('\t')) {
      fail(line, 'Tabulátor nem használható a programban; a behúzás csak szóköz lehet.');
    }
    if (raw.trim() === '') {
      fail(line, 'Üres sor nem lehet a programban.');
    }
    if (raw.endsWith(' ')) {
      fail(line, 'A sor végén nem lehet szóköz.');
    }

    const leadingMatch = /^ */.exec(raw);
    const indent = leadingMatch ? leadingMatch[0].length : 0;
    const content = raw.slice(indent);

    if (content.includes('  ')) {
      fail(line, 'A tokenek között pontosan egy szóköz lehet.');
    }

    const tokens = content.split(' ');
    if (tokens.some((token) => token === '')) {
      fail(line, 'A tokenek között pontosan egy szóköz lehet.');
    }

    records.push({ line, indent, tokens });
  }

  return records;
}

class Parser {
  private index = 0;

  constructor(private readonly lines: SourceLine[]) {}

  parse(): Program {
    if (this.lines.length === 0) return { commands: [] };

    if (this.lines[0].indent !== 0) {
      fail(this.lines[0].line, 'A program első utasítása nem lehet behúzva.');
    }

    const commands = this.parseBlock(0);
    if (this.index < this.lines.length) {
      const extra = this.lines[this.index];
      fail(extra.line, 'Váratlan behúzás a sorban.');
    }
    return { commands };
  }

  private parseBlock(expectedIndent: number): Command[] {
    const commands: Command[] = [];

    while (this.index < this.lines.length) {
      const current = this.lines[this.index];
      if (current.indent < expectedIndent) break;
      if (current.indent > expectedIndent) {
        fail(
          current.line,
          `Váratlan behúzás: ezen a szinten ${expectedIndent} szóközös behúzás várható, de ${current.indent} szerepel.`,
        );
      }
      commands.push(this.parseCommand());
    }

    return commands;
  }

  private parseNestedBlock(parentIndent: number): Command[] {
    if (this.index >= this.lines.length) return [];
    const next = this.lines[this.index];
    if (next.indent <= parentIndent) return [];
    return this.parseBlock(next.indent);
  }

  private parseCommand(): Command {
    const sourceLine = this.lines[this.index];
    this.index++;
    const { line, tokens } = sourceLine;
    const head = tokens[0];

    switch (head) {
      case 'step': {
        if (tokens.length !== 3) {
          fail(line, 'A helyes alak: „step forward <érték>”.');
        }
        if (tokens[1] !== 'forward') {
          fail(line, 'A step után a „forward” kulcsszónak kell állnia.');
        }
        return {
          kind: 'step',
          line,
          amount: parseSimpleValue(tokens[2], line, 'A step forward paramétere'),
        };
      }

      case 'turn': {
        if (tokens.length !== 3) {
          fail(line, 'A helyes alak: „turn by <érték>”.');
        }
        if (tokens[1] !== 'by') {
          fail(line, 'A turn után a „by” kulcsszónak kell állnia.');
        }
        return {
          kind: 'turn',
          line,
          amount: parseSimpleValue(tokens[2], line, 'A turn by paramétere'),
        };
      }

      case 'mine': {
        if (tokens.length !== 2 || tokens[1] !== 'here') {
          fail(line, 'A helyes alak: „mine here”.');
        }
        return { kind: 'mine', line };
      }

      case 'print': {
        if (tokens.length < 2) {
          fail(line, 'A print után hiányzik a kiírandó érték.');
        }
        if (tokens.length > 2) {
          if (tokens[1] === 'isThere') {
            fail(
              line,
              'A print csak egyetlen értéket fogad. Az isThere eredményét előbb mentsd el egy változóba.',
            );
          }
          fail(line, 'A print csak egyetlen értéket fogad.');
        }
        return {
          kind: 'print',
          line,
          value: parseSimpleValue(tokens[1], line, 'A print paramétere'),
        };
      }

      case 'set': {
        if (tokens.length < 2) {
          fail(line, 'A set után hiányzik a változónév.');
        }
        if (tokens.length < 4) {
          fail(line, 'A helyes alak: „set <változó> to <kifejezés>”.');
        }
        if (tokens[2] !== 'to') {
          fail(line, 'A set utasításban a változónév után a „to” kulcsszónak kell állnia.');
        }
        const name = parseIdentifier(tokens[1], line, 'A set utasításban');
        const value = parseCalculatedValue(tokens.slice(3), line);
        return { kind: 'set', line, name, value };
      }

      case 'if': {
        const condition = parseCondition(tokens, line, 'if');
        const thenBlock = this.parseNestedBlock(sourceLine.indent);
        let elseBranch: { line: number; body: Command[] } | undefined;

        if (this.index < this.lines.length) {
          const next = this.lines[this.index];
          if (next.indent === sourceLine.indent && next.tokens[0] === 'else') {
            const elseLine = next;
            this.index++;
            if (elseLine.tokens.length !== 1) {
              fail(elseLine.line, 'Az „else” után nem állhat több token.');
            }
            elseBranch = {
              line: elseLine.line,
              body: this.parseNestedBlock(sourceLine.indent),
            };
          }
        }

        return { kind: 'if', line, condition, then: thenBlock, else: elseBranch };
      }

      case 'while': {
        const condition = parseCondition(tokens, line, 'while');
        const body = this.parseNestedBlock(sourceLine.indent);
        return { kind: 'while', line, condition, body };
      }

      case 'else':
        fail(line, 'Az „else” csak egy if után, azzal azonos behúzással állhat.');

      case 'isThere':
        fail(line, 'Az isThere csak kifejezés része lehet, például: „set x to isThere 2”.');

      default: {
        if (isKeyword(head)) {
          fail(line, `A(z) „${head}” kulcsszó ebben a helyzetben nem utasítás.`);
        }
        const reserved = reservedKeywordHint(head);
        if (reserved) {
          fail(
            line,
            `Ismeretlen utasítás: „${head}”. A kulcsszavak kis- és nagybetűérzékenyek; a helyes alak: „${reserved}”.`,
          );
        }
        fail(line, `Ismeretlen utasítás: „${head}”.`);
      }
    }
  }
}

export function parseProgram(source: string): ProgramParseResult {
  try {
    const lines = splitSource(source);
    const program = new Parser(lines).parse();
    return { ok: true, program };
  } catch (error) {
    if (error instanceof ParserFailure) {
      return { ok: false, error: { line: error.line, message: error.message } };
    }
    throw error;
  }
}

/** Az utasítás emberi neve (diagnosztikához, szerkesztőhöz). */
export function commandLabel(command: Command): string {
  switch (command.kind) {
    case 'step':
      return 'step';
    case 'turn':
      return 'turn';
    case 'mine':
      return 'mine';
    case 'print':
      return 'print';
    case 'set':
      return 'set';
    case 'if':
      return 'if';
    case 'while':
      return 'while';
  }
}

export function formatSourceValue(value: SimpleValue): string {
  if (value.kind === 'ident') return String(value.value);
  return String(value.value);
}
