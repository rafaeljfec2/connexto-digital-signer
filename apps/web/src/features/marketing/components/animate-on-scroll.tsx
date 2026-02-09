'use client';

import { useEffect, useRef, type ReactNode } from 'react';

type AnimationVariant = 'fade-up' | 'scale' | 'slide-left';

type AnimateOnScrollProps = Readonly<{
  children: ReactNode;
  className?: string;
  variant?: AnimationVariant;
  stagger?: number;
  threshold?: number;
}>;

const VARIANT_CLASS: Record<AnimationVariant, string> = {
  'fade-up': 'animate-on-scroll',
  'scale': 'animate-scale-on-scroll',
  'slide-left': 'animate-slide-left',
};

export function AnimateOnScroll({
  children,
  className = '',
  variant = 'fade-up',
  stagger,
  threshold = 0.15,
}: AnimateOnScrollProps) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry?.isIntersecting) {
          el.classList.add('is-visible');
          observer.unobserve(el);
        }
      },
      { threshold, rootMargin: '0px 0px -40px 0px' },
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, [threshold]);

  const staggerClass = stagger ? `stagger-${String(stagger)}` : '';

  return (
    <div ref={ref} className={`${VARIANT_CLASS[variant]} ${staggerClass} ${className}`}>
      {children}
    </div>
  );
}
