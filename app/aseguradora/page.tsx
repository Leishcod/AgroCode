'use client';

import { useSimulationStore } from '@/store/simulation-store';
import { formatCurrency, formatNumber, formatPct } from '@/lib/format';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  BarChart3,
  TrendingUp,
  AlertTriangle,
  ShieldAlert,
  Coins,
  Scale,
  Building2,
  Users,
  CheckCircle2,
  ArrowRight
} from 'lucide-react';
import Link from 'next/link';

export default function AseguradoraV3() {
  const { input, result, setInput } = useSimulationStore();

  const policies = input.portfolio?.policies ?? 1000;
  const fixedCost = input.portfolio?.fixedCost ?? 60000;
  const variableCostPerPolicy = input.portfolio?.variableCost ?? 20;

  // Cálculos de cartera anual
  const totalPremiumCollected = result.premium * policies;
  const totalExpectedPayouts = result.expectedPayout * policies;
  const totalVariableCosts = variableCostPerPolicy * policies;
  const totalOperatingCosts = fixedCost + totalVariableCosts;
  const netExpectedResult = totalPremiumCollected - totalExpectedPayouts - totalOperatingCosts;

  // Estrés catastrófico (Niño extraordinario donde pagan todas las pólizas al 100%)
  const catastrophicPayouts = result.maxPayout * policies;
  const catastrophicDeficit = catastrophicPayouts - totalPremiumCollected;

  return (
    <div className="container mx-auto px-4 py-8 max-w-7xl">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Badge className="bg-indigo-100 text-indigo-800 border-indigo-200">Vista V3</Badge>
            <span className="text-xs text-muted-foreground">Perfil Aseguradora / Cooperativa / Finanzas</span>
          </div>
          <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">Dashboard de la Aseguradora</h1>
          <p className="text-sm text-slate-600">
            Viabilidad comercial, punto de equilibrio operativo y pruebas de estrés financiero catastrófico.
          </p>
        </div>

        <Link
          href="/metodologia"
          className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-slate-900 hover:bg-slate-800 text-white text-sm font-semibold transition-colors shadow-xs"
        >
          <span>Metodología actuarial (V4)</span>
          <ArrowRight className="w-4 h-4" />
        </Link>
      </div>

      {/* KPI Cards de Cartera */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <Card className="border-slate-200 shadow-xs">
          <CardHeader className="p-4 pb-2">
            <span className="text-xs font-semibold text-muted-foreground uppercase">Primas Totales Recaudadas</span>
            <div className="text-2xl font-black text-slate-900 mt-1">{formatCurrency(totalPremiumCollected)}</div>
          </CardHeader>
          <CardContent className="p-4 pt-0 text-xs text-slate-500">
            {formatNumber(policies)} pólizas a {formatCurrency(result.premium)}
          </CardContent>
        </Card>

        <Card className="border-slate-200 shadow-xs">
          <CardHeader className="p-4 pb-2">
            <span className="text-xs font-semibold text-muted-foreground uppercase">Siniestros Esperados</span>
            <div className="text-2xl font-black text-slate-900 mt-1">{formatCurrency(totalExpectedPayouts)}</div>
          </CardHeader>
          <CardContent className="p-4 pt-0 text-xs text-slate-500">
            Loss Ratio esperado: <strong>{formatPct((totalExpectedPayouts / totalPremiumCollected) * 100)}</strong>
          </CardContent>
        </Card>

        <Card className="border-slate-200 shadow-xs">
          <CardHeader className="p-4 pb-2">
            <span className="text-xs font-semibold text-muted-foreground uppercase">Resultado Técnico Anual</span>
            <div className={`text-2xl font-black mt-1 ${netExpectedResult >= 0 ? 'text-emerald-700' : 'text-rose-600'}`}>
              {formatCurrency(netExpectedResult)}
            </div>
          </CardHeader>
          <CardContent className="p-4 pt-0 text-xs text-slate-500">
            Margen operativo antes de reservas
          </CardContent>
        </Card>

        <Card className="border-slate-200 shadow-xs">
          <CardHeader className="p-4 pb-2">
            <span className="text-xs font-semibold text-muted-foreground uppercase">Punto de Equilibrio</span>
            <div className="text-2xl font-black text-indigo-700 mt-1">
              {formatNumber(result.breakEvenPolicies)} pólizas
            </div>
          </CardHeader>
          <CardContent className="p-4 pt-0 text-xs text-slate-500">
            Mínimo para cubrir costos fijos ({formatCurrency(fixedCost)})
          </CardContent>
        </Card>
      </div>

      <div className="grid lg:grid-cols-12 gap-8">
        {/* Panel Izquierdo: Inputs de Negocio (lg:col-span-4) */}
        <div className="lg:col-span-4 space-y-6">
          <Card className="border-slate-200 shadow-xs">
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-bold flex items-center gap-2">
                <Users className="w-5 h-5 text-indigo-600" />
                Variables de Negocio y Cartera
              </CardTitle>
              <CardDescription>Ajusta el volumen comercial y estructura de costos</CardDescription>
            </CardHeader>
            <CardContent className="space-y-5">
              <div>
                <div className="flex justify-between items-center text-sm mb-1">
                  <span className="font-medium text-slate-700">Número de pólizas vendidas</span>
                  <span className="font-bold text-indigo-700">{formatNumber(policies)}</span>
                </div>
                <input
                  type="range"
                  min={100}
                  max={5000}
                  step={50}
                  value={policies}
                  onChange={(e) =>
                    setInput({
                      portfolio: {
                        ...(input.portfolio ?? { fixedCost, variableCost: variableCostPerPolicy, adoption: 0 }),
                        policies: Number(e.target.value)
                      }
                    })
                  }
                  className="w-full accent-indigo-600"
                />
                <div className="flex justify-between text-[11px] text-muted-foreground mt-0.5">
                  <span>100</span>
                  <span>5,000</span>
                </div>
              </div>

              <div>
                <div className="flex justify-between items-center text-sm mb-1">
                  <span className="font-medium text-slate-700">Costos fijos anuales (F)</span>
                  <span className="font-bold text-slate-900">{formatCurrency(fixedCost)}</span>
                </div>
                <input
                  type="range"
                  min={20000}
                  max={120000}
                  step={5000}
                  value={fixedCost}
                  onChange={(e) =>
                    setInput({
                      portfolio: {
                        ...(input.portfolio ?? { policies, variableCost: variableCostPerPolicy, adoption: 0 }),
                        fixedCost: Number(e.target.value)
                      }
                    })
                  }
                  className="w-full accent-indigo-600"
                />
                <p className="text-[11px] text-muted-foreground mt-0.5">Plataforma tecnológica, nube, equipo y trámites</p>
              </div>

              <div>
                <div className="flex justify-between items-center text-sm mb-1">
                  <span className="font-medium text-slate-700">Costo variable por póliza (c_v)</span>
                  <span className="font-bold text-slate-900">{formatCurrency(variableCostPerPolicy)}</span>
                </div>
                <input
                  type="range"
                  min={5}
                  max={50}
                  step={5}
                  value={variableCostPerPolicy}
                  onChange={(e) =>
                    setInput({
                      portfolio: {
                        ...(input.portfolio ?? { policies, fixedCost, adoption: 0 }),
                        variableCost: Number(e.target.value)
                      }
                    })
                  }
                  className="w-full accent-indigo-600"
                />
                <p className="text-[11px] text-muted-foreground mt-0.5">Comisiones de cobranza, SMS de alerta y pasarela</p>
              </div>
            </CardContent>
          </Card>

          {/* Desglose de la Prima Unitaria */}
          <Card className="border-slate-200 shadow-xs">
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-bold flex items-center gap-2">
                <Coins className="w-5 h-5 text-indigo-600" />
                Desglose de la Prima Unitaria
              </CardTitle>
              <CardDescription>Cómo se compone la prima de {formatCurrency(result.premium)}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {result.premiumBreakdown.map((item, idx) => (
                <div key={idx} className="flex justify-between items-center text-xs border-b pb-2">
                  <span className="text-slate-600">{item.label}</span>
                  <span className="font-bold text-slate-900">{formatCurrency(item.value)}</span>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>

        {/* Panel Derecho: Estrés Catastrófico y Punto de Equilibrio (lg:col-span-8) */}
        <div className="lg:col-span-8 space-y-6">
          {/* Card de Estrés Catastrófico */}
          <Card className="border-rose-200 bg-rose-50/40 shadow-xs">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg font-bold text-rose-950 flex items-center gap-2">
                  <ShieldAlert className="w-5 h-5 text-rose-600" />
                  Prueba de Estrés: El Año Catastrófico (El Niño 2017)
                </CardTitle>
                <Badge className="bg-rose-600 text-white">Requiere Reaseguro</Badge>
              </div>
              <CardDescription className="text-rose-900 text-xs">
                Simulación del peor escenario: exceso pluvial generalizado en toda la cuenca simultáneamente.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid sm:grid-cols-3 gap-4 p-4 bg-white rounded-xl border border-rose-100">
                <div>
                  <span className="text-xs text-muted-foreground block">Primas Recaudadas</span>
                  <span className="text-lg font-bold text-slate-900">{formatCurrency(totalPremiumCollected)}</span>
                </div>
                <div>
                  <span className="text-xs text-muted-foreground block">Pagos al 100% de la Cartera</span>
                  <span className="text-lg font-bold text-rose-700">{formatCurrency(catastrophicPayouts)}</span>
                </div>
                <div>
                  <span className="text-xs text-muted-foreground block">Déficit Financiero</span>
                  <span className="text-lg font-bold text-rose-600">-{formatCurrency(catastrophicDeficit)}</span>
                </div>
              </div>

              {/* Estrategia de defensa (3 defensas del documento de propuesta) */}
              <div className="p-4 bg-white rounded-xl border border-rose-100 text-xs space-y-2">
                <span className="font-bold text-slate-900 block text-sm">
                  ¿Cómo sobrevive la aseguradora a este año? (Las 3 Defensas Técnicas)
                </span>
                <ul className="space-y-1.5 text-slate-700">
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                    <span>
                      <strong>1. Contrato de Reaseguro (Stop-Loss):</strong> Una reaseguradora internacional absorbe los pagos que
                      excedan el 120% de las primas cobradas.
                    </span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                    <span>
                      <strong>2. Reserva de Estabilización:</strong> Parte del margen de los años normales se acumula en un fondo de contingencia.
                    </span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                    <span>
                      <strong>3. Diversificación Geográfica:</strong> Emisión de pólizas en valles no correlacionados del norte y sur.
                    </span>
                  </li>
                </ul>
              </div>
            </CardContent>
          </Card>

          {/* Análisis del Punto de Equilibrio Operativo */}
          <Card className="border-slate-200 shadow-xs">
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-bold flex items-center gap-2">
                <Scale className="w-5 h-5 text-indigo-600" />
                Economía Unitaria y Punto de Equilibrio
              </CardTitle>
              <CardDescription>Relación entre margen de contribución unitario y cobertura de costos fijos</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid sm:grid-cols-2 gap-4 text-sm">
                <div className="p-4 rounded-xl bg-slate-50 border">
                  <span className="text-xs text-slate-500 font-semibold uppercase block">Margen Unitario por Póliza</span>
                  <div className="text-xl font-bold text-slate-900 mt-1">
                    {formatCurrency(result.premium - result.expectedPayout - variableCostPerPolicy)}
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    {formatCurrency(result.premium)} (prima) - {formatCurrency(result.expectedPayout)} (pago esp.) - {formatCurrency(variableCostPerPolicy)} (costo var.)
                  </p>
                </div>

                <div className="p-4 rounded-xl bg-indigo-50/70 border border-indigo-100">
                  <span className="text-xs text-indigo-900 font-semibold uppercase block">Estado Actual vs Meta</span>
                  <div className="text-xl font-bold text-indigo-950 mt-1">
                    {policies >= result.breakEvenPolicies ? 'Rentable (Superávit)' : 'Bajo el punto de equilibrio'}
                  </div>
                  <p className="text-xs text-indigo-700 mt-1">
                    {policies} pólizas operando frente al umbral mínimo de {result.breakEvenPolicies} pólizas.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
