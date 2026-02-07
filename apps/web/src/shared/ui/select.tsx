"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  Children,
  isValidElement,
} from 'react';
import type { ReactNode, KeyboardEvent } from 'react';
import { ChevronDown, Check } from 'lucide-react';

type SelectOption = {
  readonly value: string;
  readonly label: string;
};

export type SelectProps = {
  readonly value?: string;
  readonly onChange?: (event: { target: { value: string } }) => void;
  readonly className?: string;
  readonly children?: ReactNode;
  readonly disabled?: boolean;
};

function getTextContent(node: ReactNode): string {
  if (typeof node === 'string') return node;
  if (typeof node === 'number') return String(node);
  if (Array.isArray(node)) return node.map(getTextContent).join('');
  if (isValidElement<{ children?: ReactNode }>(node)) {
    return getTextContent(node.props.children);
  }
  return '';
}

function extractOptions(children: ReactNode): readonly SelectOption[] {
  const options: SelectOption[] = [];
  Children.forEach(children, (child) => {
    if (isValidElement<{ value?: string; children?: ReactNode }>(child) && child.type === 'option') {
      options.push({
        value: String(child.props.value ?? ''),
        label: getTextContent(child.props.children),
      });
    }
  });
  return options;
}

export function Select({ value, onChange, className = '', children, disabled }: SelectProps) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  const options = extractOptions(children);
  const selectedOption = options.find((opt) => opt.value === value);

  const handleSelect = useCallback(
    (optionValue: string) => {
      onChange?.({ target: { value: optionValue } });
      setOpen(false);
    },
    [onChange],
  );

  useEffect(() => {
    if (!open) return;
    const handleClickOutside = (event: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      ) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [open]);

  useEffect(() => {
    if (!open || !listRef.current) return;
    const selected = listRef.current.querySelector('[data-selected="true"]');
    if (selected) {
      selected.scrollIntoView({ block: 'nearest' });
    }
  }, [open]);

  const handleKeyDown = useCallback(
    (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setOpen(false);
      } else if (event.key === 'Enter' || event.key === ' ') {
        if (!open) {
          event.preventDefault();
          setOpen(true);
        }
      } else if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
        event.preventDefault();
        if (!open) {
          setOpen(true);
          return;
        }
        const currentIndex = options.findIndex((opt) => opt.value === value);
        const nextIndex =
          event.key === 'ArrowDown'
            ? Math.min(currentIndex + 1, options.length - 1)
            : Math.max(currentIndex - 1, 0);
        handleSelect(options[nextIndex].value);
      }
    },
    [open, options, value, handleSelect],
  );

  return (
    <div ref={containerRef} className={`relative ${className}`}>
      <button
        type="button"
        disabled={disabled}
        onClick={() => setOpen((prev) => !prev)}
        onKeyDown={handleKeyDown}
        className="flex w-full items-center justify-between rounded-lg border border-white/20 bg-white/10 px-3 py-2 text-left text-sm text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/70 disabled:opacity-50"
      >
        <span className="truncate">{selectedOption?.label ?? '\u00A0'}</span>
        <ChevronDown
          className={`ml-2 h-4 w-4 shrink-0 text-white/60 transition-transform ${open ? 'rotate-180' : ''}`}
        />
      </button>

      {open ? (
        <div
          ref={listRef}
          style={{ backgroundColor: '#0b1f3b' }}
          className="absolute left-0 right-0 z-50 mt-1 max-h-60 overflow-auto rounded-lg border border-white/30 py-1 shadow-2xl"
        >
          {options.map((option) => (
            <button
              key={option.value}
              type="button"
              data-selected={option.value === value}
              onClick={() => handleSelect(option.value)}
              style={option.value === value ? { backgroundColor: '#123a6f' } : undefined}
              className={`flex w-full items-center gap-2 px-3 py-2.5 text-left text-sm transition-colors ${
                option.value === value
                  ? 'text-accent-400'
                  : 'text-white hover:text-white'
              }`}
              onMouseEnter={(e) => {
                if (option.value !== value) e.currentTarget.style.backgroundColor = '#123a6f';
              }}
              onMouseLeave={(e) => {
                if (option.value !== value) e.currentTarget.style.backgroundColor = 'transparent';
              }}
            >
              {option.value === value ? (
                <Check className="h-3.5 w-3.5 shrink-0" />
              ) : (
                <span className="w-3.5 shrink-0" />
              )}
              {option.label}
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}
