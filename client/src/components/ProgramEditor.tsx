import {
  useEffect,
  useRef,
  type KeyboardEvent,
  type ReactNode,
  type UIEvent,
} from 'react';

interface ProgramEditorProps {
  value: string;
  onChange?: (value: string) => void;
  readOnly?: boolean;
  currentLine?: number | null;
  errorLine?: number | null;
  ariaLabel?: string;
}

// A specifikációban meghatározott kulcsszavak listája.
const KEYWORDS = new Set([
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
]);

const OPERATORS = new Set(['+', '-', '*', '=', '<>', '<', '<=', '>', '>=', 'and', 'or']);

const TOKEN_PATTERN = /(\s+|[A-Za-z][A-Za-z0-9]*|\d+|<>|<=|>=|[+\-*=<>])/;

function tokenClass(token: string): string {
  if (KEYWORDS.has(token)) return 'tok-keyword';
  if (/^\d+$/.test(token)) return 'tok-number';
  if (OPERATORS.has(token)) return 'tok-operator';
  if (/^[A-Za-z][A-Za-z0-9]*$/.test(token)) return 'tok-ident';
  return '';
}

function highlightLine(line: string): ReactNode {
  if (!line) return '\u200b';

  // Megőrizzük az indentációt és a szóközöket is.
  return line
    .split(TOKEN_PATTERN)
    .filter((part) => part.length > 0)
    .map((part, index) => {
      if (/^\s+$/.test(part)) return <span key={index}>{part}</span>;

      const className = tokenClass(part);
      return className ? (
        <span key={index} className={className}>
          {part}
        </span>
      ) : (
        <span key={index}>{part}</span>
      );
    });
}

const INDENT = '  ';

export function ProgramEditor({
  value,
  onChange,
  readOnly = false,
  currentLine = null,
  errorLine = null,
  ariaLabel = 'MineScript szerkesztő',
}: ProgramEditorProps) {
  const gutterRef = useRef<HTMLDivElement>(null);
  const highlightRef = useRef<HTMLPreElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const pendingSelection = useRef<[number, number] | null>(null);

  const lines = value.split('\n');
  const lineCount = Math.max(lines.length, 1);

  function syncScroll(event?: UIEvent<HTMLElement>) {
    const textarea = textareaRef.current;
    const source = event?.currentTarget ?? textarea;
    if (!source) return;

    if (highlightRef.current) {
      highlightRef.current.scrollTop = source.scrollTop;
      highlightRef.current.scrollLeft = source.scrollLeft;
    }
    if (gutterRef.current) {
      gutterRef.current.scrollTop = source.scrollTop;
    }
  }

  useEffect(() => {
    syncScroll();
  }, [value]);

  useEffect(() => {
    const textarea = textareaRef.current;
    const selection = pendingSelection.current;
    if (!textarea || !selection) return;

    pendingSelection.current = null;
    textarea.focus();
    textarea.setSelectionRange(selection[0], selection[1]);
  }, [value]);

  function replaceRange(
    start: number,
    end: number,
    replacement: string,
    selectionStart: number,
    selectionEnd = selectionStart,
  ) {
    pendingSelection.current = [selectionStart, selectionEnd];
    onChange?.(value.slice(0, start) + replacement + value.slice(end));
  }

  function handleKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
    if (readOnly || !onChange) return;

    const textarea = event.currentTarget;
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;

    if (event.key === 'Tab') {
      event.preventDefault();

      const lineStart = value.lastIndexOf('\n', start - 1) + 1;

      if (start === end) {
        if (event.shiftKey) {
          const before = value.slice(lineStart, start);
          const removable = before.match(/( {1,2}|\t)$/)?.[0].length ?? 0;
          if (!removable) return;

          replaceRange(start - removable, start, '', start - removable);
          return;
        }

        replaceRange(start, end, INDENT, start + INDENT.length);
        return;
      }

      const blockEnd = value.indexOf('\n', end);
      const sliceEnd = blockEnd === -1 ? value.length : blockEnd;
      const block = value.slice(lineStart, sliceEnd);

      if (event.shiftKey) {
        const dedented = block.replace(/^( {1,2}|\t)/gm, '');
        const removed = block.length - dedented.length;
        if (!removed) return;

        replaceRange(
          lineStart,
          sliceEnd,
          dedented,
          Math.max(lineStart, start - Math.min(2, start - lineStart)),
          Math.max(lineStart, end - removed),
        );
        return;
      }

      const indented = block.replace(/^/gm, INDENT);
      replaceRange(
        lineStart,
        sliceEnd,
        indented,
        start + INDENT.length,
        end + INDENT.length * block.split('\n').length,
      );
      return;
    }

    if (event.key === 'Enter') {
      // A Ctrl/Cmd + Enter a játékoldal gyorsparancsa, ne szúrjon be sort.
      if (event.ctrlKey || event.metaKey) return;

      event.preventDefault();

      const lineStart = value.lastIndexOf('\n', start - 1) + 1;
      const currentLineText = value.slice(lineStart, start);
      const indent = currentLineText.match(/^[ \t]*/)?.[0] ?? '';
      const insertion = `\n${indent}`;

      replaceRange(start, end, insertion, start + insertion.length);
    }
  }

  function handleReadOnlyScroll(event: UIEvent<HTMLPreElement>) {
    if (gutterRef.current) {
      gutterRef.current.scrollTop = event.currentTarget.scrollTop;
    }
  }

  const renderedLines = lines.map((line, index) => {
    const lineNumber = index + 1;
    const className = [
      'code-line',
      lineNumber === currentLine ? 'is-active' : '',
      lineNumber === errorLine ? 'is-error' : '',
    ]
      .filter(Boolean)
      .join(' ');

    return (
      <div key={index} className={className}>
        {highlightLine(line)}
      </div>
    );
  });

  return (
    <div className={`code-editor${readOnly ? ' is-readonly' : ''}`}>
      <div className="code-gutter" ref={gutterRef} aria-hidden="true">
        {Array.from({ length: lineCount }, (_, index) => {
          const lineNumber = index + 1;
          const className = [
            'code-gutter-line',
            lineNumber === currentLine ? 'is-active' : '',
            lineNumber === errorLine ? 'is-error' : '',
          ]
            .filter(Boolean)
            .join(' ');

          return (
            <div key={index} className={className}>
              {lineNumber}
            </div>
          );
        })}
      </div>

      <div className="code-area">
        <pre
          className={`code-highlight${readOnly ? ' code-highlight-readonly' : ''}`}
          ref={highlightRef}
          onScroll={readOnly ? handleReadOnlyScroll : undefined}
          aria-hidden={!readOnly}
          aria-label={readOnly ? ariaLabel : undefined}
          tabIndex={readOnly ? 0 : undefined}
        >
          <code>{renderedLines}</code>
        </pre>

        {!readOnly && (
          <textarea
            ref={textareaRef}
            className="code-textarea"
            value={value}
            onChange={(event) => onChange?.(event.target.value)}
            onKeyDown={handleKeyDown}
            onScroll={syncScroll}
            spellCheck={false}
            autoCapitalize="off"
            autoCorrect="off"
            autoComplete="off"
            wrap="off"
            aria-label={ariaLabel}
            placeholder={'set count to 0\nstep forward 1\nmine here'}
          />
        )}
      </div>
    </div>
  );
}
