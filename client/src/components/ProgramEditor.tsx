import { useEffect, useRef, type ReactNode } from 'react';

interface ProgramEditorProps {
  value: string;
  onChange?: (value: string) => void;
  readOnly?: boolean;
  currentLine?: number | null;
  errorLine?: number | null;
  ariaLabel?: string;
}

// A specifikációban meghatározott kulcsszavak listája
const KEYWORDS = new Set([
  'and', 'by', 'else', 'false', 'forward', 'here', 'if', 'isThere',
  'mine', 'not', 'or', 'print', 'set', 'step', 'to', 'true', 'turn', 'while'
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
  // Megőrizzük az indentációt (behúzást) és a space-eket is.
  const parts = line.split(/(\s+)/);
  return parts.map((part, index) => {
    if (!part) return null;
    if (/^\s+$/.test(part)) return <span key={index}>{part}</span>;
    
    const className = tokenClass(part);
    return className ? (
      <span key={index} className={className}>{part}</span>
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
  ariaLabel = 'MineScript szerkesztő',
}: ProgramEditorProps) {
  const gutterRef = useRef<HTMLDivElement>(null);
  
  const lines = value.split('\n');
  // Biztosítjuk, hogy legalább 1 sor mindig látszódjon a gutterben
  const displayLines = lines.length === 0 ? 1 : lines.length;

  return (
    <div className="code-editor" style={{ height: '400px' }}>
      {/* Sorszámozás sáv */}
      <div className="code-gutter" ref={gutterRef} aria-hidden="true">
        {Array.from({ length: displayLines }).map((_, i) => (
          <div 
            key={i} 
            className={`code-gutter-line ${i + 1 === currentLine ? 'is-active' : ''} ${i + 1 === errorLine ? 'is-error' : ''}`}
            style={{ color: i + 1 === errorLine ? 'var(--danger)' : i + 1 === currentLine ? 'var(--accent)' : 'inherit' }}
          >
            {i + 1}
          </div>
        ))}
      </div>
      
      {/* Kódszöveg beviteli mező / Megjelenítő */}
      {readOnly ? (
        <div className="code-textarea" style={{ overflowY: 'auto' }}>
          {lines.map((line, i) => (
            <div 
               key={i} 
               style={{ 
                  backgroundColor: i + 1 === errorLine ? 'rgba(255, 123, 114, 0.1)' : 
                                   i + 1 === currentLine ? 'rgba(245, 179, 1, 0.1)' : 'transparent',
                  padding: '0 4px'
               }}
            >
              {highlightLine(line)}
            </div>
          ))}
        </div>
      ) : (
        <textarea
          className="code-textarea"
          value={value}
          onChange={(e) => onChange?.(e.target.value)}
          onScroll={(e) => {
            if (gutterRef.current) {
              gutterRef.current.scrollTop = e.currentTarget.scrollTop;
            }
          }}
          spellCheck={false}
          autoCapitalize="off"
          autoCorrect="off"
          autoComplete="off"
          wrap="off"
          aria-label={ariaLabel}
          placeholder="set count to 0&#10;step forward 1&#10;mine here"
        />
      )}
    </div>
  );
}