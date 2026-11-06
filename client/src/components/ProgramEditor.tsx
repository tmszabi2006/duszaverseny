import { useEffect, useRef, type ReactNode } from 'react';

interface ProgramEditorProps {
  value: string;
  onChange?: (value: string) => void;
  readOnly?: boolean;
  currentLine?: number | null;
  errorLine?: number | null;
  ariaLabel?: string;
}

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

function tokenClass(token: string): string {
  if (KEYWORDS.has(token)) return 'tok-keyword';
  if (/^[0-9]+$/.test(token)) return 'tok-number';
  if (OPERATORS.has(token)) return 'tok-operator';
  if (/^[A-Za-z][A-Za-z0-9]*$/.test(token)) return 'tok-ident';
  return '';
}

function highlightLine(line: string): ReactNode {
  const parts = line.split(/(\s+)/);
  return parts.map((part, index) => {
    if (part === '') return null;
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

export function ProgramEditor({
  value,
  onChange,
  readOnly = false,
  currentLine = null,
  errorLine = null,
  ariaLabel = 'MineScript program',
}: ProgramEditorProps) {
  const gutterRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const activeLineRef = useRef<HTMLDivElement>(null);

  const lines = value.split('\n');
  const activeIndex = currentLine && currentLine > 0 ? currentLine - 1 : -1;
  const editorHeight = Math.min(430, Math.max(190, lines.length * 22 + 26));

  useEffect(() => {
    if (readOnly && activeLineRef.current) {
      activeLineRef.current.scrollIntoView({ block: 'nearest' });
    }
  }, [readOnly, activeIndex]);

  if (readOnly) {
    return (
      <div className="code-editor code-editor-readonly" style={{ height: editorHeight }}>
        <div className="code-scroll">
          {lines.map((line, index) => {
            const lineNumber = index + 1;
            const isActive = index === activeIndex;
            const isError = lineNumber === errorLine;
            return (
              <div
                key={lineNumber}
                ref={isActive ? activeLineRef : undefined}
                className={`code-line${isActive ? ' code-line-active' : ''}${
                  isError ? ' code-line-error' : ''
                }`}
              >
                <span className="code-line-number" aria-hidden="true">
                  {lineNumber}
                </span>
                <span className="code-line-content">{highlightLine(line)}</span>
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  return (
    <div className="code-editor" style={{ height: editorHeight }}>
      <div className="code-gutter" ref={gutterRef} aria-hidden="true">
        {lines.map((_, index) => (
          <div
            key={index}
            className={`code-gutter-line${index === activeIndex ? ' is-active' : ''}${
              index + 1 === errorLine ? ' is-error' : ''
            }`}
          >
            {index + 1}
          </div>
        ))}
      </div>
      <textarea
        ref={textareaRef}
        className="code-textarea"
        value={value}
        onChange={(event) => onChange?.(event.target.value)}
        onScroll={(event) => {
          if (gutterRef.current) {
            gutterRef.current.scrollTop = event.currentTarget.scrollTop;
          }
        }}
        spellCheck={false}
        autoCapitalize="off"
        autoCorrect="off"
        autoComplete="off"
        wrap="off"
        aria-label={ariaLabel}
        placeholder={'step forward 1\nmine here'}
      />
    </div>
  );
}
