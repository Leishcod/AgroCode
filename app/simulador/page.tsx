'use client';

import { useSimulationStore } from '@/store/simulation-store';
import { useShallow } from 'zustand/react/shallow';
import { Slider } from '@/components/ui/slider';
import { Label } from '@/components/ui/label';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { DailyRainChart } from '@/components/simulation-charts';
import { formatCurrency, formatMm, formatNumber } from '@/lib/format';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  CloudRain,
  Play,
  CheckCircle,
  ArrowRight,
  Sliders
} from 'lucide-react';
import { useState } from 'react';
import Link from 'next/link';

const scenarios = [
  { id: 'normal', name: 'Normal', rainMm: 89.47, desc: 'Media estacional CHIRPS de 45 temporadas' },
  { id: 'nino_debil', name: 'Niño Débil', rainMm: 205.733543, desc: 'Temporada histórica 2022–2023' },
  { id: 'nino_fuerte', name: 'Niño Fuerte', rainMm: 281.435181, desc: 'Temporada histórica 2016–2017' },
  { id: 'extraordinario', name: 'Extraordinario (1997–98)', rainMm: 487.609364, desc: 'Temporada histórica CHIRPS' },
  { id: 'custom', name: 'Personalizado', rainMm: 500, desc: 'Ajuste manual del jurado' },
] as const;

export default function SimuladorV2() {
  const { input, result, setInput, setScenario } = useSimulationStore(useShallow((state) => ({
    input: state.input,
    result: state.result,
    setInput: state.setInput,
    setScenario: state.setScenario,
  })));
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentStepIndex, setCurrentStepIndex] = useState(result.dailyRain.length - 1);

  const isTriggered = result.scenarioPayout > 0;
  const isFullPayout = result.scenarioPayout >= result.maxPayout;
  const payoutForScenario = (rainMm: number) => input.sumInsured
    * Math.max(0, Math.min(1, (rainMm - input.strikeMm) / (input.exitMm - input.strikeMm)));
  const statusForScenario = (rainMm: number) => rainMm <= input.strikeMm
    ? 'Sin activación'
    : rainMm >= input.exitMm
      ? 'Pago total'
      : 'Pago parcial';
  const statusClassForScenario = (rainMm: number) => rainMm <= input.strikeMm
    ? 'text-slate-500'
    : rainMm >= input.exitMm
      ? 'text-rose-600 font-bold'
      : 'text-emerald-600 font-semibold';

  const handlePlay = () => {
    setIsPlaying(true);
    setCurrentStepIndex(0);
    let step = 0;
    const interval = setInterval(() => {
      step++;
      if (step < result.dailyRain.length) {
        setCurrentStepIndex(step);
      } else {
        clearInterval(interval);
        setIsPlaying(false);
      }
    }, 700);
  };

  const currentCumMm = result.dailyRain[currentStepIndex]?.cumMm ?? input.strikeMm;
  const currentDailyDate = result.dailyRain[currentStepIndex]?.date ?? '30 Abr';

  return (
    <div className="container mx-auto px-4 py-8 max-w-7xl">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Badge className="bg-blue-100 text-blue-800 border-blue-200">Vista V2</Badge>
            <span className="text-xs text-muted-foreground">Perfil Jurado / Simulación Climática</span>
          </div>
          <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">Simulador de Evento Climático</h1>
          <p className="text-sm text-slate-600">
            Pon a prueba el contrato activando escenarios históricos y evalúa la respuesta automática de pago.
          </p>
        </div>

        <Link
          href="/aseguradora"
          className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold transition-colors shadow-xs"
        >
          <span>Ver impacto en aseguradora (V3)</span>
          <ArrowRight className="w-4 h-4" />
        </Link>
      </div>

      {/* Selector de Escenarios Segmentado */}
      <div className="mb-8">
        <Label id="scenario-tabs-label" className="text-xs font-bold text-slate-700 uppercase tracking-wider block mb-2">
          Selecciona un Escenario de Temporada (Dic - Abr)
        </Label>
        <Tabs
          value={input.scenario}
          aria-labelledby="scenario-tabs-label"
          onValueChange={(value) => {
            const selectedScenario = scenarios.find((scenario) => scenario.id === value);
            if (selectedScenario) setScenario(selectedScenario.id);
          }}
        >
          <TabsList className="grid h-auto w-full grid-cols-2 gap-3 bg-transparent p-0 md:grid-cols-5">
            {scenarios.map((sc) => (
              <TabsTrigger
                key={sc.id}
                value={sc.id}
                className="group h-auto min-h-16 flex-col items-stretch rounded-xl border bg-white p-3 text-left whitespace-normal text-foreground data-active:border-blue-600 data-active:bg-blue-50/80 data-active:ring-2 data-active:ring-blue-500 data-active:shadow-xs"
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm font-bold">{sc.name}</span>
                  <span className="h-2 w-2 rounded-full bg-blue-600 opacity-0 group-data-active:opacity-100" />
                </div>
                <p className="text-xs text-muted-foreground line-clamp-1">{sc.desc}</p>
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>

        {/* Modo Personalizado: Slider de lluvia manual */}
        {input.scenario === 'custom' && (
          <div className="mt-4 p-4 rounded-xl bg-white border border-blue-200 shadow-xs flex flex-col md:flex-row items-center gap-6">
            <div className="flex items-center gap-2 text-blue-900 font-semibold text-sm whitespace-nowrap">
              <Sliders className="w-4 h-4 text-blue-600" />
              Lluvia Personalizada:
            </div>
            <div className="flex-1 w-full flex items-center gap-4">
              <Slider
                min={0}
                max={900}
                step={10}
                value={input.customRainMm ?? 450}
                aria-label="Lluvia personalizada"
                onValueChange={(value) => setInput({ customRainMm: Array.isArray(value) ? value[0] : value })}
                className="w-full [&_[data-slot=slider-range]]:bg-blue-600 [&_[data-slot=slider-thumb]]:border-blue-600"
              />
              <span className="font-bold text-lg text-blue-700 min-w-[70px]">
                {formatMm(input.customRainMm ?? 450)}
              </span>
            </div>
          </div>
        )}
      </div>

      <div className="grid lg:grid-cols-12 gap-8">
        {/* Centro: Línea de tiempo y animación (lg:col-span-8) */}
        <div className="lg:col-span-8 space-y-6">
          <Card className="border-slate-200 shadow-xs">
            <CardHeader className="flex flex-row items-center justify-between pb-3">
              <div>
                <CardTitle className="text-base font-bold flex items-center gap-2">
                  <CloudRain className="w-5 h-5 text-blue-600" />
                  Evolución Temporal de Precipitación Acumulada
                </CardTitle>
                <CardDescription>
                  Umbral K: <strong className="text-emerald-700">{formatMm(input.strikeMm)}</strong> | Límite S:{' '}
                  <strong>{formatMm(input.exitMm)}</strong>
                </CardDescription>
              </div>

              <Button
                onClick={handlePlay}
                disabled={isPlaying}
                size="sm"
                className="bg-blue-600 hover:bg-blue-700 text-white gap-2"
              >
                <Play className="w-3.5 h-3.5 fill-current" />
                {isPlaying ? 'Simulando día a día...' : 'Reproducir Temporada'}
              </Button>
            </CardHeader>
            <CardContent>
              {/* Barra de progreso de lluvia acumulada vs umbral */}
              <div className="space-y-4 my-4">
                <div className="flex justify-between items-center text-sm font-semibold">
                  <span className="text-slate-600">Fecha del registro: {currentDailyDate}</span>
                  <span className="text-lg font-bold text-slate-900">{formatMm(Math.round(currentCumMm))}</span>
                </div>

                <div className="relative h-6 bg-slate-100 rounded-full overflow-hidden border">
                  {/* Umbral K marker */}
                  <div
                    className="absolute top-0 bottom-0 w-0.5 bg-amber-500 z-20"
                    style={{ left: `${(input.strikeMm / 900) * 100}%` }}
                    title={`Umbral K: ${input.strikeMm} mm`}
                  />
                  {/* Límite S marker */}
                  <div
                    className="absolute top-0 bottom-0 w-0.5 bg-rose-600 z-20"
                    style={{ left: `${(input.exitMm / 900) * 100}%` }}
                    title={`Límite S: ${input.exitMm} mm`}
                  />

                  {/* Barra de progreso */}
                  <div
                    className={`h-full transition-all duration-500 rounded-full ${
                      currentCumMm >= input.exitMm
                        ? 'bg-rose-500'
                        : currentCumMm >= input.strikeMm
                        ? 'bg-emerald-500'
                        : 'bg-blue-500'
                    }`}
                    style={{ width: `${Math.min(100, (currentCumMm / 900) * 100)}%` }}
                  />
                </div>

                <div className="flex justify-between text-xs text-muted-foreground px-1">
                  <span>0 mm (Dic)</span>
                  <span className="text-amber-700 font-bold">K = {input.strikeMm} mm</span>
                  <span className="text-rose-700 font-bold">S = {input.exitMm} mm</span>
                  <span>900 mm (Abr)</span>
                </div>
              </div>

              {/* Indicador de estado del día */}
              <div className="mt-6 p-4 rounded-xl border bg-slate-50 flex items-center justify-between">
                <div>
                  <span className="text-xs uppercase font-bold text-slate-500">Estado al corte actual</span>
                  <p className="text-sm font-semibold text-slate-800">
                    {currentCumMm >= input.exitMm
                      ? '⚠️ Límite catastrófico alcanzado. Pago del 100% activado.'
                      : currentCumMm >= input.strikeMm
                      ? '✓ Umbral superado. Indemnización proporcional activada.'
                      : 'Condición normal. Aún por debajo del umbral de indemnización.'}
                  </p>
                </div>
                <Badge
                  className={
                    currentCumMm >= input.strikeMm
                      ? 'bg-emerald-600 text-white'
                      : 'bg-slate-200 text-slate-700 hover:bg-slate-200'
                  }
                >
                  {currentCumMm >= input.strikeMm ? 'PAGO ACTIVADO' : 'SIN PAGO'}
                </Badge>
              </div>
              <div className="mt-6 border-t pt-5">
                <h3 className="mb-3 text-sm font-semibold text-slate-800">Precipitación acumulada por fecha</h3>
                <DailyRainChart
                  data={result.dailyRain}
                  strikeMm={input.strikeMm}
                  exitMm={input.exitMm}
                />
              </div>
            </CardContent>
          </Card>

          {/* Tabla de Escenarios Comparativa */}
          <Card className="border-slate-200 shadow-xs">
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-bold">Matriz de Escenarios Climáticos</CardTitle>
              <CardDescription>Resumen de indemnización según el contrato establecido</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full text-sm text-left">
                  <thead className="bg-slate-100 text-slate-700 text-xs uppercase font-bold">
                    <tr>
                      <th className="py-2.5 px-3">Escenario</th>
                      <th className="py-2.5 px-3">Lluvia</th>
                      <th className="py-2.5 px-3">Pago / ha</th>
                      <th className="py-2.5 px-3">Total Cartera ({formatNumber(input.portfolio?.policies ?? 1000)} pólizas)</th>
                      <th className="py-2.5 px-3">Estado</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y text-slate-700">
                    <tr className={input.scenario === 'normal' ? 'bg-blue-50/60 font-semibold' : ''}>
                      <td className="py-2.5 px-3">Normal</td>
                      <td className="py-2.5 px-3">{formatMm(scenarios[0].rainMm)}</td>
                      <td className="py-2.5 px-3">{formatCurrency(payoutForScenario(scenarios[0].rainMm))}</td>
                      <td className="py-2.5 px-3">{formatCurrency(payoutForScenario(scenarios[0].rainMm) * (input.portfolio?.policies ?? 1000))}</td>
                      <td className={`py-2.5 px-3 ${statusClassForScenario(scenarios[0].rainMm)}`}>{statusForScenario(scenarios[0].rainMm)}</td>
                    </tr>
                    <tr className={input.scenario === 'nino_debil' ? 'bg-blue-50/60 font-semibold' : ''}>
                      <td className="py-2.5 px-3">Niño Débil</td>
                      <td className="py-2.5 px-3">{formatMm(scenarios[1].rainMm)}</td>
                      <td className="py-2.5 px-3">
                        {formatCurrency(payoutForScenario(scenarios[1].rainMm))}
                      </td>
                      <td className="py-2.5 px-3">{formatCurrency(payoutForScenario(scenarios[1].rainMm) * (input.portfolio?.policies ?? 1000))}</td>
                      <td className={`py-2.5 px-3 ${statusClassForScenario(scenarios[1].rainMm)}`}>{statusForScenario(scenarios[1].rainMm)}</td>
                    </tr>
                    <tr className={input.scenario === 'nino_fuerte' ? 'bg-blue-50/60 font-semibold' : ''}>
                      <td className="py-2.5 px-3">Niño Fuerte</td>
                      <td className="py-2.5 px-3">{formatMm(scenarios[2].rainMm)}</td>
                      <td className="py-2.5 px-3">
                        {formatCurrency(payoutForScenario(scenarios[2].rainMm))}
                      </td>
                      <td className="py-2.5 px-3">{formatCurrency(payoutForScenario(scenarios[2].rainMm) * (input.portfolio?.policies ?? 1000))}</td>
                      <td className={`py-2.5 px-3 ${statusClassForScenario(scenarios[2].rainMm)}`}>{statusForScenario(scenarios[2].rainMm)}</td>
                    </tr>
                    <tr className={input.scenario === 'extraordinario' ? 'bg-blue-50/60 font-semibold' : ''}>
                      <td className="py-2.5 px-3">{scenarios[3].name}</td>
                      <td className="py-2.5 px-3">{formatMm(scenarios[3].rainMm)}</td>
                      <td className="py-2.5 px-3">{formatCurrency(payoutForScenario(scenarios[3].rainMm))}</td>
                      <td className="py-2.5 px-3 text-rose-700 font-bold">{formatCurrency(payoutForScenario(scenarios[3].rainMm) * (input.portfolio?.policies ?? 1000))}</td>
                      <td className={`py-2.5 px-3 ${statusClassForScenario(scenarios[3].rainMm)}`}>{statusForScenario(scenarios[3].rainMm)}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Panel lateral derecho: Resultado y Alerta Dinámica (lg:col-span-4) */}
        <div className="lg:col-span-4 space-y-6">
          {/* Card de Alerta Condicional */}
          {isTriggered ? (
            <div className="p-6 rounded-2xl bg-emerald-600 text-white shadow-md">
              <div className="flex items-center gap-2 mb-2">
                <CheckCircle className="w-6 h-6 text-emerald-200" />
                <span className="font-bold text-sm tracking-wide uppercase text-emerald-100">
                  ¡Indemnización Activada!
                </span>
              </div>
              <div className="text-4xl font-extrabold my-2">{formatCurrency(result.scenarioPayout)}</div>
              <p className="text-xs text-emerald-100">
                La precipitación del escenario superó el umbral acordado de {formatMm(input.strikeMm)}.
              </p>
              <div className="mt-4 pt-3 border-t border-emerald-500 text-xs space-y-1">
                <div className="flex justify-between">
                  <span>Hectáreas amparadas:</span>
                  <span className="font-bold">{input.hectares} ha</span>
                </div>
                <div className="flex justify-between">
                  <span>Trámite requerido:</span>
                  <span className="font-bold">Ninguno (Automático)</span>
                </div>
              </div>
            </div>
          ) : (
            <div className="p-6 rounded-2xl bg-slate-800 text-white shadow-md">
              <div className="flex items-center gap-2 mb-2">
                <CloudRain className="w-6 h-6 text-slate-400" />
                <span className="font-bold text-sm tracking-wide uppercase text-slate-300">Sin Siniestro</span>
              </div>
              <div className="text-3xl font-extrabold my-2">S/ 0.00</div>
              <p className="text-xs text-slate-400">
                La lluvia acumulada no superó los {formatMm(input.strikeMm)}. Esta temporada la cosecha no sufrió exceso hídrico severo.
              </p>
            </div>
          )}

          {/* Comparación de Cartera */}
          <Card className="border-slate-200 shadow-xs">
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-bold">Impacto de la Cartera</CardTitle>
              <CardDescription>Escenario aplicado a 1,000 productores</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <span className="text-xs text-muted-foreground block">Desembolso total estimado</span>
                <span className="text-2xl font-bold text-slate-900">
                  {formatCurrency(result.scenarioPayout * (input.portfolio?.policies ?? 1000))}
                </span>
              </div>
              <div className="pt-2 border-t text-xs text-slate-600">
                {isFullPayout ? (
                  <p className="text-rose-600 font-semibold">
                    ⚠️ Año catastrófico. Las indemnizaciones superan las primas recaudadas. Se activaría la capa de reaseguro.
                  </p>
                ) : (
                  <p>
                    El fondo de primas y reservas cubre adecuadamente la siniestralidad de este evento.
                  </p>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
