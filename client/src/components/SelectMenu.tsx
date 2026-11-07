import { useEffect, useId, useRef, useState } from 'react';

interface Option { value: string; label: string; description?: string }

/** Keyboard-accessible themed listbox. Re-selecting an item also activates it. */
export function SelectMenu({ value, options, onChange, label, disabled = false, placeholder = 'Válassz…', showChevron = true }: {
  value: string; options: Option[]; onChange: (value: string) => void;
  label: string; disabled?: boolean; placeholder?: string; showChevron?: boolean;
}) {
  const id = useId();
  const root = useRef<HTMLDivElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const list = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const selected = options.find(option => option.value === value);
  useEffect(() => {
    if (!open) return;
    list.current?.focus({ preventScroll: true });
    function outside(event: PointerEvent) {
      if (!root.current?.contains(event.target as Node)) setOpen(false);
    }
    document.addEventListener('pointerdown', outside);
    return () => document.removeEventListener('pointerdown', outside);
  }, [open]);
  useEffect(() => { if (disabled) setOpen(false); }, [disabled]);
  useEffect(() => {
    const container = list.current;
    const option = document.getElementById(`${id}-${active}`);
    if (open && container && option) {
      // Scroll only the menu, never the page behind its sticky header.
      if (option.offsetTop < container.scrollTop) container.scrollTop = option.offsetTop;
      else if (option.offsetTop + option.offsetHeight > container.scrollTop + container.clientHeight)
        container.scrollTop = option.offsetTop + option.offsetHeight - container.clientHeight;
    }
  }, [active, open, id]);
  function show() { setActive(Math.max(0, options.findIndex(option => option.value === value))); setOpen(true); }
  function choose(index: number) {
    if (!options[index]) return;
    onChange(options[index].value); setOpen(false); trigger.current?.focus({ preventScroll: true });
  }
  return <div className="select-menu" ref={root} onBlur={event => {
    if (!event.currentTarget.contains(event.relatedTarget as Node)) setOpen(false);
  }}>
    <button ref={trigger} type="button" className="select-trigger" disabled={disabled}
      aria-label={label} aria-haspopup="listbox" aria-expanded={open} aria-controls={open ? id : undefined}
      onPointerDown={event => { event.preventDefault(); trigger.current?.focus({ preventScroll: true }); }}
      onClick={() => open ? setOpen(false) : show()}
      onKeyDown={event => { if (event.key === 'ArrowDown' || event.key === 'ArrowUp') { event.preventDefault(); show(); } }}>
      <span>{selected?.label ?? placeholder}</span>{showChevron && <span className="select-chevron" aria-hidden="true">⌄</span>}
    </button>
    {open && <div ref={list} id={id} className="select-options" role="listbox" tabIndex={-1}
      aria-label={label} aria-activedescendant={`${id}-${active}`}
      onKeyDown={event => {
        if (event.key === 'Escape') { event.preventDefault(); event.stopPropagation(); setOpen(false); trigger.current?.focus({ preventScroll: true }); }
        else if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); choose(active); }
        else if (['ArrowDown','ArrowUp','Home','End'].includes(event.key)) {
          event.preventDefault(); setActive(index => event.key === 'Home' ? 0 : event.key === 'End' ? options.length - 1 : (index + (event.key === 'ArrowDown' ? 1 : -1) + options.length) % options.length);
        } else if (event.key === 'Tab') { setOpen(false); trigger.current?.focus({ preventScroll: true }); }
      }}>
      {options.map((option, index) => <div key={option.value} id={`${id}-${index}`} role="option"
        aria-selected={option.value === value} className={`select-option${active === index ? ' is-active' : ''}`}
        onPointerMove={() => setActive(index)} onPointerDown={event => event.preventDefault()} onClick={() => choose(index)}>
        <span><strong>{option.label}</strong>{option.description && <small>{option.description}</small>}</span>
        <span aria-hidden="true">{option.value === value ? '✓' : ''}</span>
      </div>)}
    </div>}
  </div>;
}
