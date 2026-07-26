'use client';

import type { ReactNode } from 'react';
import { useMagnetic } from '@/hooks/useMagnetic';

/**
 * Wraps a single interactive child in a magnetic hover field.
 * The wrapper is `display: contents`-free on purpose — it needs a box for the
 * transform to apply to.
 */
export function Magnetic({
  children,
  className,
  strength = 0.32,
}: {
  children: ReactNode;
  className?: string;
  strength?: number;
}) {
  const ref = useMagnetic<HTMLSpanElement>(strength);
  return (
    <span ref={ref} className={`magnetic ${className ?? ''}`.trim()}>
      {children}
    </span>
  );
}
