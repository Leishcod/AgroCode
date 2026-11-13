'use client';

import type { ReactNode } from 'react';
import { ResponsiveContainer } from 'recharts';
import { cn } from '@/lib/utils';

type ChartContainerProps = {
  children: ReactNode;
  className?: string;
  height?: number;
  'aria-label': string;
};

export function ChartContainer({
  children,
  className,
  height = 260,
  'aria-label': ariaLabel,
}: ChartContainerProps) {
  return (
    <div className={cn('w-full min-w-0', className)} style={{ height }} role="img" aria-label={ariaLabel}>
      <ResponsiveContainer width="100%" height="100%">
        {children}
      </ResponsiveContainer>
    </div>
  );
}
