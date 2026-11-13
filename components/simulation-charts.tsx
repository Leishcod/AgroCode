'use client';

import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Line,
  LineChart,
  ReferenceLine,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import type { SimulationResult } from '@/lib/api/contract';
import { formatCurrency, formatMm, formatNumber } from '@/lib/format';
import { ChartContainer } from '@/components/ui/chart';

type PayoutCurveChartProps = {
  data: SimulationResult['payoutCurve'];
  strikeMm: number;
  exitMm: number;
};

export function PayoutCurveChart({ data, strikeMm, exitMm }: PayoutCurveChartProps) {
  return (
    <ChartContainer aria-label="Curva de pago según la precipitación acumulada" height={280}>
      <LineChart data={data} margin={{ top: 12, right: 16, bottom: 8, left: 12 }}>
        <CartesianGrid stroke="var(--border)" strokeDasharray="3 3" vertical={false} />
        <XAxis
          type="number"
          dataKey="rainMm"
          domain={[0, 900]}
          tickFormatter={(value) => String(value)}
          tick={{ fill: 'var(--muted-foreground)' }}
          tickLine={false}
          axisLine={false}
          label={{ value: 'Precipitación acumulada (mm)', position: 'insideBottom', offset: -4, fill: 'var(--muted-foreground)' }}
        />
        <YAxis
          width={76}
          tickFormatter={(value) => formatCurrency(Number(value))}
          tick={{ fill: 'var(--muted-foreground)' }}
          tickLine={false}
          axisLine={false}
        />
        <Tooltip
          contentStyle={{ borderRadius: 12, borderColor: 'var(--border)', backgroundColor: 'var(--popover)', color: 'var(--popover-foreground)' }}
          labelFormatter={(value) => `Lluvia: ${formatMm(Number(value))}`}
          formatter={(value) => [formatCurrency(Number(value)), 'Indemnización']}
        />
        <ReferenceLine x={strikeMm} stroke="var(--chart-3)" strokeDasharray="4 4" />
        <ReferenceLine x={exitMm} stroke="var(--chart-5)" strokeDasharray="4 4" />
        <Line
          type="monotone"
          dataKey="payout"
          name="Pago"
          stroke="var(--chart-1)"
          strokeWidth={2.5}
          dot={false}
          activeDot={{ r: 5 }}
        />
      </LineChart>
    </ChartContainer>
  );
}

type DailyRainChartProps = {
  data: SimulationResult['dailyRain'];
  strikeMm: number;
  exitMm: number;
};

export function DailyRainChart({ data, strikeMm, exitMm }: DailyRainChartProps) {
  return (
    <ChartContainer aria-label="Serie de precipitación acumulada durante la temporada" height={280}>
      <AreaChart data={data} margin={{ top: 12, right: 16, bottom: 8, left: 12 }}>
        <CartesianGrid stroke="var(--border)" strokeDasharray="3 3" vertical={false} />
        <XAxis dataKey="date" tick={{ fill: 'var(--muted-foreground)' }} tickLine={false} axisLine={false} />
        <YAxis
          width={64}
          domain={[0, 900]}
          tickFormatter={(value) => `${value} mm`}
          tick={{ fill: 'var(--muted-foreground)' }}
          tickLine={false}
          axisLine={false}
        />
        <Tooltip
          contentStyle={{ borderRadius: 12, borderColor: 'var(--border)', backgroundColor: 'var(--popover)', color: 'var(--popover-foreground)' }}
          labelFormatter={(value) => `Fecha: ${String(value)}`}
          formatter={(value) => [formatMm(Number(value)), 'Lluvia acumulada']}
        />
        <ReferenceLine y={strikeMm} stroke="var(--chart-3)" strokeDasharray="4 4" />
        <ReferenceLine y={exitMm} stroke="var(--chart-5)" strokeDasharray="4 4" />
        <Area
          type="monotone"
          dataKey="cumMm"
          name="Lluvia acumulada"
          stroke="var(--chart-2)"
          strokeWidth={2.5}
          fill="var(--chart-2)"
          fillOpacity={0.2}
          activeDot={{ r: 5 }}
        />
      </AreaChart>
    </ChartContainer>
  );
}

type PayoutHistogramChartProps = {
  data: SimulationResult['payoutHistogram'];
};

export function PayoutHistogramChart({ data }: PayoutHistogramChartProps) {
  return (
    <ChartContainer aria-label="Histograma de pagos por póliza en la cartera" height={280}>
      <BarChart data={data} margin={{ top: 12, right: 16, bottom: 8, left: 12 }}>
        <CartesianGrid stroke="var(--border)" strokeDasharray="3 3" vertical={false} />
        <XAxis
          dataKey="bin"
          tickFormatter={(value) => formatCurrency(Number(value))}
          tick={{ fill: 'var(--muted-foreground)' }}
          tickLine={false}
          axisLine={false}
        />
        <YAxis
          allowDecimals={false}
          tickFormatter={(value) => formatNumber(Number(value))}
          tick={{ fill: 'var(--muted-foreground)' }}
          tickLine={false}
          axisLine={false}
        />
        <Tooltip
          contentStyle={{ borderRadius: 12, borderColor: 'var(--border)', backgroundColor: 'var(--popover)', color: 'var(--popover-foreground)' }}
          labelFormatter={(value) => `Pago: ${formatCurrency(Number(value))}`}
          formatter={(value) => [formatNumber(Number(value)), 'Pólizas']}
        />
        <Bar dataKey="count" name="Pólizas" fill="var(--chart-5)" radius={[6, 6, 0, 0]} />
      </BarChart>
    </ChartContainer>
  );
}
