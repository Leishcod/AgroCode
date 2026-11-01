'use client';

import Link from 'next/link';
import { useSimulationStore } from '@/store/simulation-store';
import { formatCurrency, formatMm, formatPct } from '@/lib/format';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  CloudRain,
  ShieldCheck,
  Sprout,
  MapPin,
  TrendingUp,
  AlertCircle,
  ArrowRight,
  Info,
  Check,
  ChevronDown
} from 'lucide-react';
import { useState } from 'react';

export default function CalculadoraV1() {
  const { input, result, setInput, toggleAdaptation } = useSimulationStore();
  const [showAdvanced, setShowAdvanced] = useState(false);

  return (
    <div className="container mx-auto px-4 py-8 max-w-7xl">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Badge className="bg-emerald-100 text-emerald-800 border-emerald-200">Vista V1</Badge>
            <span className="text-xs text-muted-foreground">Perfil Agricultor / Productor</span>
          </div>
          <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">Calculadora del Agricultor</h1>
          <p className="text-sm text-slate-600">
            Cotiza tu prima anual y conoce exactamente cuánto recibirías según la lluvia acumulada en tu zona.
          </p>
        </div>

        <Link
          href="/simulador"
          className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold transition-colors shadow-xs"
        >
          <span>Simular un evento</span>
          <ArrowRight className="w-4 h-4" />
        </Link>
      </div>

      <div className="grid lg:grid-cols-12 gap-8">
        {/* Panel izquierdo: Controles (350-380px aprox, lg:col-span-5) */}
        <div className="lg:col-span-5 space-y-6">
          <Card className="border-slate-200 shadow-xs">
            <CardHeader className="pb-4">
              <CardTitle className="text-lg font-bold flex items-center gap-2">
                <MapPin className="w-5 h-5 text-emerald-600" />
                1. Ubicación y Cultivo
              </CardTitle>
              <CardDescription>Zona piloto en el norte del Perú</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="text-xs font-semibold text-slate-700 uppercase tracking-wide block mb-1">
                  Zona / Distrito Piloto
                </label>
                <select
                  value={input.zoneId}
                  onChange={(e) => setInput({ zoneId: e.target.value })}
                  className="w-full px-3 py-2 text-sm border rounded-lg bg-background focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                >
                  <option value="piura_medio">Piura - Valle Medio (Chulucanas / Tambogrande)</option>
                  <option value="tumbes_zarumilla">Tumbes - Zarumilla</option>
                  <option value="lambayeque_olmos">Lambayeque - Olmos / Motupe</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-slate-700 uppercase tracking-wide block mb-1">
                    Cultivo
                  </label>
                  <select
                    value={input.cropId}
                    onChange={(e) => setInput({ cropId: e.target.value })}
                    className="w-full px-3 py-2 text-sm border rounded-lg bg-background focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                  >
                    <option value="mango">Mango Criollo/Kent</option>
                    <option value="banano">Banano Orgánico</option>
                    <option value="limon">Limón Sutil</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-700 uppercase tracking-wide block mb-1">
                    Hectáreas (ha)
                  </label>
                  <input
                    type="number"
                    min={1}
                    max={50}
                    value={input.hectares}
                    onChange={(e) => setInput({ hectares: Math.max(1, Number(e.target.value)) })}
                    className="w-full px-3 py-2 text-sm border rounded-lg bg-background focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* 2. Cobertura y Umbrales */}
          <Card className="border-slate-200 shadow-xs">
            <CardHeader className="pb-4">
              <CardTitle className="text-lg font-bold flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-emerald-600" />
                2. Parámetros de Cobertura
              </CardTitle>
              <CardDescription>Suma asegurada y umbrales paramétricos</CardDescription>
            </CardHeader>
            <CardContent className="space-y-5">
              <div>
                <div className="flex justify-between items-center text-sm mb-1">
                  <span className="font-medium text-slate-700">Suma asegurada (L)</span>
                  <span className="font-bold text-slate-900">{formatCurrency(input.sumInsured)} / ha</span>
                </div>
                <input
                  type="range"
                  min={500}
                  max={5000}
                  step={100}
                  value={input.sumInsured}
                  onChange={(e) => setInput({ sumInsured: Number(e.target.value) })}
                  className="w-full accent-emerald-600"
                />
                <div className="flex justify-between text-[11px] text-muted-foreground mt-0.5">
                  <span>S/ 500</span>
                  <span>S/ 5,000</span>
                </div>
              </div>

              <div>
                <div className="flex justify-between items-center text-sm mb-1">
                  <span className="font-medium text-slate-700">Umbral de activación K (Gatillo)</span>
                  <span className="font-bold text-emerald-700">{formatMm(input.strikeMm)}</span>
                </div>
                <input
                  type="range"
                  min={300}
                  max={700}
                  step={10}
                  value={input.strikeMm}
                  onChange={(e) => setInput({ strikeMm: Number(e.target.value) })}
                  className="w-full accent-emerald-600"
                />
                <p className="text-[11px] text-muted-foreground mt-0.5">
                  El seguro empieza a indemnizar a partir de {formatMm(input.strikeMm)} acumulados.
                </p>
              </div>

              <div>
                <div className="flex justify-between items-center text-sm mb-1">
                  <span className="font-medium text-slate-700">Límite de pago total S</span>
                  <span className="font-bold text-slate-900">{formatMm(input.exitMm)}</span>
                </div>
                <input
                  type="range"
                  min={Math.max(400, input.strikeMm + 10)}
                  max={900}
                  step={10}
                  value={input.exitMm}
                  onChange={(e) => setInput({ exitMm: Number(e.target.value) })}
                  className="w-full accent-emerald-600"
                />
                <p className="text-[11px] text-muted-foreground mt-0.5">
                  A partir de {formatMm(input.exitMm)} se paga el 100% de la suma asegurada.
                </p>
              </div>
            </CardContent>
          </Card>

          {/* 3. Prácticas de Adaptación Ambiental */}
          <Card className="border-emerald-200 bg-emerald-50/40 shadow-xs">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base font-bold text-emerald-950 flex items-center gap-2">
                  <Sprout className="w-5 h-5 text-emerald-700" />
                  3. Prácticas de Adaptación
                </CardTitle>
                <Badge className="bg-emerald-600 text-white text-[10px]">Descuento Activo</Badge>
              </div>
              <CardDescription className="text-emerald-800 text-xs">
                Incentivo ambiental: reduce el riesgo de daño y abarata tu prima.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <label className="flex items-start gap-3 p-3 bg-white rounded-lg border border-emerald-100 cursor-pointer hover:border-emerald-300 transition-colors">
                <input
                  type="checkbox"
                  checked={input.adaptation.drainage}
                  onChange={() => toggleAdaptation('drainage')}
                  className="mt-1 h-4 w-4 rounded text-emerald-600 focus:ring-emerald-500 accent-emerald-600"
                />
                <div>
                  <span className="text-sm font-semibold text-slate-900 block">Drenaje parcelario habilitado</span>
                  <span className="text-xs text-muted-foreground">Canaletas y zanjas de evacuación de agua pluvial.</span>
                </div>
              </label>

              <label className="flex items-start gap-3 p-3 bg-white rounded-lg border border-emerald-100 cursor-pointer hover:border-emerald-300 transition-colors">
                <input
                  type="checkbox"
                  checked={input.adaptation.cover}
                  onChange={() => toggleAdaptation('cover')}
                  className="mt-1 h-4 w-4 rounded text-emerald-600 focus:ring-emerald-500 accent-emerald-600"
                />
                <div>
                  <span className="text-sm font-semibold text-slate-900 block">Cobertura vegetal o acolchado</span>
                  <span className="text-xs text-muted-foreground">Protege contra la erosión y la sedimentación del suelo.</span>
                </div>
              </label>
            </CardContent>
          </Card>

          {/* Panel Avanzado Plegable */}
          <div className="border rounded-xl p-4 bg-white">
            <button
              onClick={() => setShowAdvanced(!showAdvanced)}
              className="flex items-center justify-between w-full text-xs font-semibold text-slate-600 uppercase tracking-wider"
            >
              <span>Parámetros Técnicos Avanzados</span>
              <ChevronDown className={`w-4 h-4 transition-transform ${showAdvanced ? 'rotate-180' : ''}`} />
            </button>
            {showAdvanced && (
              <div className="mt-4 pt-3 border-t space-y-4 text-sm">
                <div>
                  <div className="flex justify-between text-xs mb-1">
                    <span>Recargo de seguridad (λ)</span>
                    <span className="font-bold">{input.safetyLoading.toFixed(2)}</span>
                  </div>
                  <input
                    type="range"
                    min={0}
                    max={1}
                    step={0.05}
                    value={input.safetyLoading}
                    onChange={(e) => setInput({ safetyLoading: Number(e.target.value) })}
                    className="w-full"
                  />
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Panel derecho: Resultados en tiempo real (lg:col-span-7) */}
        <div className="lg:col-span-7 space-y-6">
          {/* Tarjeta Principal de Prima */}
          <div className="p-6 rounded-2xl bg-gradient-to-br from-emerald-900 via-emerald-800 to-teal-900 text-white shadow-md relative overflow-hidden">
            <div className="relative z-10">
              <div className="flex items-center justify-between">
                <span className="text-xs uppercase tracking-wider font-semibold text-emerald-300">
                  Prima Comercial Anual
                </span>
                {result.adaptationDiscount.pct > 0 && (
                  <Badge className="bg-emerald-500 text-white font-bold border-none text-xs">
                    ¡Ahorras {formatPct(result.adaptationDiscount.pct)}!
                  </Badge>
                )}
              </div>

              <div className="flex items-baseline gap-3 mt-3">
                <span className="text-5xl font-black tracking-tight">{formatCurrency(result.premium)}</span>
                <span className="text-emerald-200 text-sm">/ temporada</span>
              </div>

              {result.adaptationDiscount.amount > 0 && (
                <p className="text-xs text-emerald-200 mt-1">
                  Incluye un descuento de {formatCurrency(result.adaptationDiscount.amount)} por prácticas de adaptación.
                </p>
              )}

              <div className="mt-6 pt-5 border-t border-emerald-700/60 grid grid-cols-2 sm:grid-cols-3 gap-4 text-left">
                <div>
                  <span className="text-xs text-emerald-300 block">Pago Máximo</span>
                  <span className="text-lg font-bold">{formatCurrency(result.maxPayout)}</span>
                </div>
                <div>
                  <span className="text-xs text-emerald-300 block">Pago Esperado</span>
                  <span className="text-lg font-bold">{formatCurrency(result.expectedPayout)}</span>
                </div>
                <div>
                  <span className="text-xs text-emerald-300 block">Prob. Activación</span>
                  <span className="text-lg font-bold">{formatPct(result.activationProb)}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Frase en lenguaje simple (Requisito del documento) */}
          <div className="p-4 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 flex items-start gap-3">
            <Info className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
            <div className="text-sm">
              <span className="font-bold">Regla clara del seguro: </span>
              Si la lluvia acumulada entre diciembre y abril supera los {formatMm(input.strikeMm)}, recibirás indemnización
              directa. Por ejemplo, con 500 mm recibirías{' '}
              <span className="font-bold underline decoration-amber-500">
                {formatCurrency(
                  result.maxPayout *
                    Math.max(0, Math.min(1, (500 - input.strikeMm) / (input.exitMm - input.strikeMm)))
                )}
              </span>
              , sin peritajes de campo.
            </div>
          </div>

          {/* Resumen del Contrato "Lo que firmaría el agricultor" */}
          <Card className="border-slate-200 shadow-xs">
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-bold">Resumen del Contrato Paramétrico</CardTitle>
              <CardDescription>Parámetros formales de la póliza para {input.hectares} ha</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="divide-y text-sm">
                <div className="py-2.5 flex justify-between">
                  <span className="text-muted-foreground">Índice objetivo</span>
                  <span className="font-medium text-slate-900">Precipitación acumulada (CHIRPS / SENAMHI)</span>
                </div>
                <div className="py-2.5 flex justify-between">
                  <span className="text-muted-foreground">Ventana de cobertura</span>
                  <span className="font-medium text-slate-900">01 de Diciembre al 30 de Abril</span>
                </div>
                <div className="py-2.5 flex justify-between">
                  <span className="text-muted-foreground">Gatillo de activación (K)</span>
                  <span className="font-semibold text-emerald-700">{formatMm(input.strikeMm)}</span>
                </div>
                <div className="py-2.5 flex justify-between">
                  <span className="text-muted-foreground">Límite de indemnización total (S)</span>
                  <span className="font-semibold text-slate-900">{formatMm(input.exitMm)}</span>
                </div>
                <div className="py-2.5 flex justify-between">
                  <span className="text-muted-foreground">Modalidad de cobro</span>
                  <span className="font-medium text-slate-900">Abono automático a billetera móvil / cuenta bancaria</span>
                </div>
              </div>

              {/* Aviso de Riesgo de Base */}
              <div className="mt-4 p-3 rounded-lg bg-slate-100 text-xs text-slate-600 flex items-start gap-2">
                <AlertCircle className="w-4 h-4 text-slate-500 shrink-0 mt-0.5" />
                <span>
                  <strong>Nota sobre riesgo de base:</strong> La medición corresponde al polígono de la zona piloto. Si en tu
                  parcela particular llueve más o menos que el promedio de la estación satelital, la indemnización responde al índice acordado.
                </span>
              </div>
            </CardContent>
          </Card>

          {/* Enlaces de continuación */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-2">
            <Link href="/metodologia" className="text-xs text-emerald-700 hover:underline font-semibold flex items-center gap-1">
              ¿Cómo se calcula actuarialmente la prima? <ArrowRight className="w-3.5 h-3.5" />
            </Link>

            <Link
              href="/simulador"
              className="w-full sm:w-auto px-5 py-2.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-white text-sm font-semibold transition-colors flex items-center justify-center gap-2"
            >
              <span>Ver cómo pagaría en El Niño (V2)</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
