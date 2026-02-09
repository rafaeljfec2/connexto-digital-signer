'use client';

import { useEffect, useRef, useState } from 'react';

type AnimatedCounterProps = Readonly<{
  value: string;
  className?: string;
}>;

function parseNumericPart(value: string): { prefix: string; number: number; suffix: string } {
  const match = /^([^\d]*)(\d+(?:\.\d+)?)(.*)/.exec(value);
  if (!match) return { prefix: '', number: 0, suffix: value };
  return {
    prefix: match[1] ?? '',
    number: Number.parseFloat(match[2] ?? '0'),
    suffix: match[3] ?? '',
  };
}

export function AnimatedCounter({ value, className = '' }: AnimatedCounterProps) {
  const ref = useRef<HTMLSpanElement>(null);
  const [displayValue, setDisplayValue] = useState('0');
  const [hasAnimated, setHasAnimated] = useState(false);

  const { prefix, number: targetNumber, suffix } = parseNumericPart(value);

  useEffect(() => {
    const el = ref.current;
    if (!el || hasAnimated) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry?.isIntersecting) {
          setHasAnimated(true);
          observer.unobserve(el);

          const duration = 1600;
          const startTime = performance.now();
          const isDecimal = value.includes('.');

          const animate = (currentTime: number) => {
            const elapsed = currentTime - startTime;
            const progress = Math.min(elapsed / duration, 1);
            const eased = 1 - Math.pow(1 - progress, 3);
            const currentValue = eased * targetNumber;

            if (isDecimal) {
              setDisplayValue(currentValue.toFixed(1));
            } else {
              setDisplayValue(String(Math.floor(currentValue)));
            }

            if (progress < 1) {
              requestAnimationFrame(animate);
            }
          };

          requestAnimationFrame(animate);
        }
      },
      { threshold: 0.3 },
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, [hasAnimated, targetNumber, value]);

  return (
    <span ref={ref} className={className}>
      {prefix}{displayValue}{suffix}
    </span>
  );
}
