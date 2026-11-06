import { cellKindLabel, cloneMap, countGold, frontPosition, isInside, rotateLeft } from './map.js';
import type {
  BinOperator,
  CalculatedValue,
  Command,
  Program,
  SimpleValue,
} from './parser.js';
import type { CellKind, Direction, GameMap, Position, RobotState } from './types.js';

export const MAX_PROCESSED_LINES = 1000;

export type RuntimeErrorCode =
  | 'E_TYPE_MISMATCH'
  | 'E_UNINITIALIZED'
  | 'E_NON_BOOL_CONDITION'
  | 'E_BAD_OPERAND'
  | 'E_BEDROCK_HIT'
  | 'E_NO_GOLD'
  | 'E_BAD_ARG'
  | 'INSTRUCTION_COUNT_LIMIT_EXCEEDED';

export interface RuntimeErrorInfo {
  code: RuntimeErrorCode;
  message: string;
  /** 1-alapú programsor. */
  line: number;
}

export interface ConsoleEntry {
  line: number;
  text: string;
}

export type RunEvent =
  | { type: 'exec'; line: number; steps: number }
  | {
      type: 'move';
      line: number;
      from: Position;
      to: Position;
      direction: Direction;
      index: number;
      total: number;
    }
  | { type: 'turn'; line: number; from: Direction; to: Direction; position: Position }
  | {
      type: 'scan';
      line: number;
      target: Position;
      targetKind: CellKind | 'outside';
      query: number;
      result: boolean;
      discovered: boolean;
    }
  | { type: 'mine'; line: number; position: Position; gold: number }
  | { type: 'print'; line: number; value: string }
  | { type: 'error'; line: number; code: RuntimeErrorCode; message: string; steps: number }
  | {
      type: 'end';
      steps: number;
      gold: number;
      error: RuntimeErrorCode | null;
    };

export interface ExecutionResult {
  gold: number;
  initialGold: number;
  steps: number;
  error: RuntimeErrorInfo | null;
  robot: RobotState;
  cells: CellKind[][];
  discovered: boolean[][];
  console: ConsoleEntry[];
  events: RunEvent[];
}

type Value =
  | { type: 'int'; value: number }
  | { type: 'bool'; value: boolean };

class RuntimeFailure extends Error {
  constructor(
    readonly code: RuntimeErrorCode,
    readonly line: number,
    message: string,
  ) {
    super(message);
    this.name = 'RuntimeFailure';
  }
}

function typeLabel(value: Value): string {
  return value.type === 'int' ? 'egész' : 'logikai';
}

function displayCoord(pos: Position): string {
  return `${pos.row + 1}. sor ${pos.col + 1}. oszlop`;
}

function runtimeError(code: RuntimeErrorCode, line: number, message: string): never {
  throw new RuntimeFailure(code, line, message);
}

class Interpreter {
  private readonly cells: CellKind[][];
  private readonly robot: RobotState;
  private readonly initialGold: number;
  private readonly variables = new Map<string, Value>();
  private readonly discovered: boolean[][];
  private readonly events: RunEvent[] = [];
  private readonly consoleEntries: ConsoleEntry[] = [];
  private steps = 0;
  private gold = 0;

  constructor(map: GameMap, private readonly program: Program) {
    this.cells = map.cells.map((row) => [...row]);
    this.robot = { ...map.robot };
    this.initialGold = countGold(map);
    this.discovered = Array.from({ length: map.height }, () =>
      Array.from({ length: map.width }, () => false),
    );
    this.discover(this.robot.row, this.robot.col);
  }

  run(): ExecutionResult {
    let error: RuntimeErrorInfo | null = null;

    try {
      this.executeBlock(this.program.commands);
    } catch (cause) {
      if (cause instanceof RuntimeFailure) {
        error = {
          code: cause.code,
          line: cause.line,
          message: cause.message,
        };
        this.events.push({
          type: 'error',
          line: cause.line,
          code: cause.code,
          message: cause.message,
          steps: this.steps,
        });
      } else {
        throw cause;
      }
    }

    this.events.push({
      type: 'end',
      steps: this.steps,
      gold: this.gold,
      error: error ? error.code : null,
    });

    return {
      gold: this.gold,
      initialGold: this.initialGold,
      steps: this.steps,
      error,
      robot: { ...this.robot },
      cells: this.cells.map((row) => [...row]),
      discovered: this.discovered.map((row) => [...row]),
      console: [...this.consoleEntries],
      events: this.events,
    };
  }

  private executeBlock(commands: Command[]): void {
    for (const command of commands) {
      this.executeCommand(command);
    }
  }

  private executeCommand(command: Command): void {
    switch (command.kind) {
      case 'step': {
        this.tick(command.line);
        const amount = this.evaluateSimple(command.amount, command.line);
        if (amount.type !== 'int' || amount.value < 0) {
          runtimeError(
            'E_BAD_ARG',
            command.line,
            `A step forward paramétere nemnegatív egész szám kell legyen, de ${typeLabel(amount)} értéket kapott.`,
          );
        }

        for (let index = 0; index < amount.value; index++) {
          const from: Position = { row: this.robot.row, col: this.robot.col };
          const to = frontPosition(this.robot);
          const inside = isInside({ width: this.cells[0].length, height: this.cells.length }, to);
          if (!inside) {
            runtimeError(
              'E_BEDROCK_HIT',
              command.line,
              `A robot lelépne a térképről (${displayCoord(to)}).`,
            );
          }
          if (this.cells[to.row][to.col] === 'wall') {
            runtimeError(
              'E_BEDROCK_HIT',
              command.line,
              `A robot falnak ütközne: ${displayCoord(to)}.`,
            );
          }

          this.robot.row = to.row;
          this.robot.col = to.col;
          this.discover(to.row, to.col);
          this.events.push({
            type: 'move',
            line: command.line,
            from,
            to: { ...to },
            direction: this.robot.direction,
            index: index + 1,
            total: amount.value,
          });
        }
        return;
      }

      case 'turn': {
        this.tick(command.line);
        const amount = this.evaluateSimple(command.amount, command.line);
        if (amount.type !== 'int' || amount.value < 0) {
          runtimeError(
            'E_BAD_ARG',
            command.line,
            `A turn by paramétere nemnegatív egész szám kell legyen, de ${typeLabel(amount)} értéket kapott.`,
          );
        }
        const from = this.robot.direction;
        const to = rotateLeft(from, amount.value);
        this.robot.direction = to;
        this.events.push({
          type: 'turn',
          line: command.line,
          from,
          to,
          position: { row: this.robot.row, col: this.robot.col },
        });
        return;
      }

      case 'mine': {
        this.tick(command.line);
        const current = this.cells[this.robot.row][this.robot.col];
        if (current !== 'gold') {
          runtimeError(
            'E_NO_GOLD',
            command.line,
            `A robot olyan mezőn próbált bányászni, ahol nincs aranyrög (${displayCoord(this.robot)}).`,
          );
        }
        this.cells[this.robot.row][this.robot.col] = 'empty';
        this.gold++;
        this.events.push({
          type: 'mine',
          line: command.line,
          position: { row: this.robot.row, col: this.robot.col },
          gold: this.gold,
        });
        return;
      }

      case 'print': {
        this.tick(command.line);
        const value = this.evaluateSimple(command.value, command.line);
        const text = value.type === 'int' ? String(value.value) : String(value.value);
        this.consoleEntries.push({ line: command.line, text });
        this.events.push({ type: 'print', line: command.line, value: text });
        return;
      }

      case 'set': {
        this.tick(command.line);
        const value = this.evaluateCalculated(command.value, command.line);
        const existing = this.variables.get(command.name);
        if (existing && existing.type !== value.type) {
          runtimeError(
            'E_TYPE_MISMATCH',
            command.line,
            `A(z) „${command.name}” változó típusa ${typeLabel(existing)}, ezért nem kaphat ${typeLabel(value)} értéket.`,
          );
        }
        this.variables.set(command.name, value);
        return;
      }

      case 'if': {
        this.tick(command.line);
        const condition = this.evaluateSimple(command.condition, command.line);
        if (condition.type !== 'bool') {
          runtimeError(
            'E_NON_BOOL_CONDITION',
            command.line,
            `Az if feltétele logikai érték kell legyen, de ${typeLabel(condition)} értéket kapott.`,
          );
        }
        if (condition.value) {
          this.executeBlock(command.then);
        } else if (command.else) {
          this.tick(command.else.line);
          this.executeBlock(command.else.body);
        }
        return;
      }

      case 'while': {
        for (;;) {
          this.tick(command.line);
          const condition = this.evaluateSimple(command.condition, command.line);
          if (condition.type !== 'bool') {
            runtimeError(
              'E_NON_BOOL_CONDITION',
              command.line,
              `A while feltétele logikai érték kell legyen, de ${typeLabel(condition)} értéket kapott.`,
            );
          }
          if (!condition.value) break;
          this.executeBlock(command.body);
        }
        return;
      }
    }
  }

  private tick(line: number): void {
    if (this.steps >= MAX_PROCESSED_LINES) {
      runtimeError(
        'INSTRUCTION_COUNT_LIMIT_EXCEEDED',
        line,
        `A program elérte a(z) ${MAX_PROCESSED_LINES} feldolgozott programsor limitjét.`,
      );
    }
    this.steps++;
    this.events.push({ type: 'exec', line, steps: this.steps });
  }

  private evaluateSimple(value: SimpleValue, line: number): Value {
    if (value.kind === 'number') {
      return { type: 'int', value: Number(value.value) };
    }
    if (value.kind === 'bool') {
      return { type: 'bool', value: Boolean(value.value) };
    }

    const name = String(value.value);
    const variable = this.variables.get(name);
    if (!variable) {
      runtimeError(
        'E_UNINITIALIZED',
        line,
        `A(z) „${name}” változó még nem kapott értéket.`,
      );
    }
    return variable;
  }

  private evaluateCalculated(value: CalculatedValue, line: number): Value {
    switch (value.kind) {
      case 'simple':
        return this.evaluateSimple(value.value, line);

      case 'isThere': {
        const argument = this.evaluateSimple(value.arg, line);
        if (
          argument.type !== 'int' ||
          ![0, 1, 2].includes(argument.value)
        ) {
          runtimeError(
            'E_BAD_ARG',
            line,
            `Az isThere paramétere csak 0 (üres), 1 (fal) vagy 2 (arany) lehet, de ${typeLabel(argument)} értéket kapott.`,
          );
        }

        const target = frontPosition(this.robot);
        const inside = isInside(
          { width: this.cells[0].length, height: this.cells.length },
          target,
        );
        const targetKind: CellKind | 'outside' = inside
          ? this.cells[target.row][target.col]
          : 'outside';
        const query = argument.value;
        const result =
          query === 0
            ? targetKind === 'empty'
            : query === 1
              ? targetKind === 'wall' || targetKind === 'outside'
              : targetKind === 'gold';

        if (inside) {
          this.discover(target.row, target.col);
        }

        this.events.push({
          type: 'scan',
          line,
          target,
          targetKind,
          query,
          result,
          discovered: inside,
        });

        return { type: 'bool', value: result };
      }

      case 'not': {
        const argument = this.evaluateSimple(value.arg, line);
        if (argument.type !== 'bool') {
          runtimeError(
            'E_BAD_OPERAND',
            line,
            `A not operátora csak logikai értéket fogadhat, de ${typeLabel(argument)} értéket kapott.`,
          );
        }
        return { type: 'bool', value: !argument.value };
      }

      case 'binary':
        return this.evaluateBinary(value.left, value.op, value.right, line);
    }
  }

  private evaluateBinary(
    leftNode: SimpleValue,
    op: BinOperator,
    rightNode: SimpleValue,
    line: number,
  ): Value {
    const left = this.evaluateSimple(leftNode, line);

    if (op !== '=' && op !== '<>') {
      this.assertOperandType(left, op, 'bal', line);
    }

    const right = this.evaluateSimple(rightNode, line);

    if (op === '=' || op === '<>') {
      if (left.type !== right.type) {
        runtimeError(
          'E_BAD_OPERAND',
          line,
          `A(z) „${op}” két oldalán azonos típusú értékeknek kell állniuk, de ${typeLabel(left)} és ${typeLabel(right)} szerepel.`,
        );
      }
      const equal =
        left.type === 'int'
          ? left.value === (right as { type: 'int'; value: number }).value
          : left.value === (right as { type: 'bool'; value: boolean }).value;
      return { type: 'bool', value: op === '=' ? equal : !equal };
    }

    this.assertOperandType(right, op, 'jobb', line);

    if (op === 'and' || op === 'or') {
      const leftBool = (left as { type: 'bool'; value: boolean }).value;
      const rightBool = (right as { type: 'bool'; value: boolean }).value;
      return { type: 'bool', value: op === 'and' ? leftBool && rightBool : leftBool || rightBool };
    }

    const leftInt = (left as { type: 'int'; value: number }).value;
    const rightInt = (right as { type: 'int'; value: number }).value;

    switch (op) {
      case '+':
        return { type: 'int', value: leftInt + rightInt };
      case '-':
        return { type: 'int', value: leftInt - rightInt };
      case '*':
        return { type: 'int', value: leftInt * rightInt };
      case '<':
        return { type: 'bool', value: leftInt < rightInt };
      case '<=':
        return { type: 'bool', value: leftInt <= rightInt };
      case '>':
        return { type: 'bool', value: leftInt > rightInt };
      case '>=':
        return { type: 'bool', value: leftInt >= rightInt };
      default:
        runtimeError('E_BAD_OPERAND', line, `Ismeretlen művelet: ${String(op)}.`);
    }
  }

  private assertOperandType(value: Value, op: BinOperator, side: 'bal' | 'jobb', line: number): void {
    const numeric = op === '+' || op === '-' || op === '*' || op === '<' || op === '<=' || op === '>' || op === '>=';
    const logical = op === 'and' || op === 'or';
    const expected = numeric ? 'egész' : logical ? 'logikai' : null;
    if (!expected) return;
    if (value.type !== (numeric ? 'int' : 'bool')) {
      runtimeError(
        'E_BAD_OPERAND',
        line,
        `A(z) „${op}” művelet csak ${expected} operandusokkal használható; a ${side} oldalon ${typeLabel(value)} érték áll.`,
      );
    }
  }

  private discover(row: number, col: number): void {
    if (row >= 0 && row < this.discovered.length && col >= 0 && col < this.discovered[row].length) {
      this.discovered[row][col] = true;
    }
  }
}

/**
 * Program végrehajtása egy térképen.
 *
 * A függvény szinkron, determinisztikus és nem módosítja a bemeneti térképet.
 * A kliens az eseménylistából animálja a futást, a szerver ugyanezt a
 * függvényt használja az eredmény hitelesítéséhez.
 */
export function runProgram(map: GameMap, program: Program): ExecutionResult {
  return new Interpreter(cloneMap(map), program).run();
}

export function describeCellKind(kind: CellKind | 'outside'): string {
  return kind === 'outside' ? 'térkép széle' : cellKindLabel(kind);
}
