import Link from 'next/link';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  CloudRain,
  ShieldCheck,
  PlayCircle,
  BarChart3,
  BookOpen,
  ArrowRight,
  TrendingDown,
  CheckCircle2,
  Droplets,
  AlertTriangle
} from 'lucide-react';

export default function HomeV0() {
  return (
    <div className="container mx-auto px-4 py-10 max-w-6xl">
      {/* Hero Section */}
      <div className="text-center max-w-3xl mx-auto mb-12">
        <Badge className="mb-4 bg-emerald-100 text-emerald-800 hover:bg-emerald-100 border-emerald-200 px-3 py-1">
          Feria de Proyectos FIIS 2026-II · CC Núcleo
        </Badge>
        <h1 className="text-4xl sm:text-5xl font-extrabold tracking-tight text-slate-900 leading-tight">
          Seguro Paramétrico Agrícola <br />
          <span className="text-emerald-600 bg-clip-text">ante El Niño Costero</span>
        </h1>
        <p className="mt-4 text-lg text-slate-600">
          Protección financiera automática para pequeños agricultores del norte del Perú (Piura).
          Pago objetivo por índice de precipitación satelital con incentivos económicos por adaptación ambiental.
        </p>

        {/* Storyline en 4 pasos */}
        <div className="mt-8 grid grid-cols-2 md:grid-cols-4 gap-3 text-left">
          <div className="p-3 bg-white border rounded-xl shadow-xs">
            <span className="text-xs font-bold text-emerald-600">1. Problema</span>
            <p className="text-sm font-semibold text-slate-800 flex items-center gap-1.5 mt-1">
              <Droplets className="w-4 h-4 text-blue-500" /> Lluvia extrema
            </p>
          </div>
          <div className="p-3 bg-white border rounded-xl shadow-xs">
            <span className="text-xs font-bold text-emerald-600">2. Regla</span>
            <p className="text-sm font-semibold text-slate-800 flex items-center gap-1.5 mt-1">
              <AlertTriangle className="w-4 h-4 text-amber-500" /> Umbral K (mm)
            </p>
          </div>
          <div className="p-3 bg-white border rounded-xl shadow-xs">
            <span className="text-xs font-bold text-emerald-600">3. Resultado</span>
            <p className="text-sm font-semibold text-slate-800 flex items-center gap-1.5 mt-1">
              <CheckCircle2 className="w-4 h-4 text-emerald-500" /> Pago sin peritajes
            </p>
          </div>
          <div className="p-3 bg-white border rounded-xl shadow-xs">
            <span className="text-xs font-bold text-emerald-600">4. Negocio</span>
            <p className="text-sm font-semibold text-slate-800 flex items-center gap-1.5 mt-1">
              <TrendingDown className="w-4 h-4 text-indigo-500" /> Prima y equilibrio
            </p>
          </div>
        </div>
      </div>

      {/* Selector de Perfiles / Vistas */}
      <div className="mb-8">
        <h2 className="text-xl font-bold text-slate-900 mb-1">Selecciona cómo deseas explorar la plataforma</h2>
        <p className="text-sm text-slate-500">Sin login: navega según el perfil de demostración para el jurado o los evaluadores.</p>
      </div>

      <div className="grid md:grid-cols-3 gap-6">
        {/* V1: Agricultor */}
        <Card className="flex flex-col justify-between hover:shadow-lg transition-all border-slate-200 hover:border-emerald-500 group">
          <CardHeader>
            <div className="w-12 h-12 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center mb-3 group-hover:scale-105 transition-transform">
              <CloudRain className="w-6 h-6" />
            </div>
            <Badge variant="outline" className="w-fit text-xs text-emerald-700 border-emerald-300 bg-emerald-50 mb-1">
              Vista V1 · Perfil Productor
            </Badge>
            <CardTitle className="text-xl font-bold text-slate-900">Calculadora del Agricultor</CardTitle>
            <CardDescription className="text-slate-600">
              ¿Cuánto pago y cuánto recibiría? Configura hectáreas, suma asegurada y prácticas de drenaje para cotizar la prima con descuento.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Link
              href="/calculadora"
              className="inline-flex w-full items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-emerald-600 text-white font-medium hover:bg-emerald-700 transition-colors shadow-xs"
            >
              Abrir Calculadora <ArrowRight className="w-4 h-4" />
            </Link>
          </CardContent>
        </Card>

        {/* V2: Simulador de Evento */}
        <Card className="flex flex-col justify-between hover:shadow-lg transition-all border-slate-200 hover:border-blue-500 group">
          <CardHeader>
            <div className="w-12 h-12 rounded-xl bg-blue-100 text-blue-700 flex items-center justify-center mb-3 group-hover:scale-105 transition-transform">
              <PlayCircle className="w-6 h-6" />
            </div>
            <Badge variant="outline" className="w-fit text-xs text-blue-700 border-blue-300 bg-blue-50 mb-1">
              Vista V2 · Perfil Jurado / Simulación
            </Badge>
            <CardTitle className="text-xl font-bold text-slate-900">Simulador de Evento</CardTitle>
            <CardDescription className="text-slate-600">
              ¿Cuándo y cuánto paga el seguro? Selecciona escenarios históricos de El Niño (débil, fuerte, extraordinario 2017) o personalizado.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Link
              href="/simulador"
              className="inline-flex w-full items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-blue-600 text-white font-medium hover:bg-blue-700 transition-colors shadow-xs"
            >
              Iniciar Simulación <ArrowRight className="w-4 h-4" />
            </Link>
          </CardContent>
        </Card>

        {/* V3: Aseguradora */}
        <Card className="flex flex-col justify-between hover:shadow-lg transition-all border-slate-200 hover:border-indigo-500 group">
          <CardHeader>
            <div className="w-12 h-12 rounded-xl bg-indigo-100 text-indigo-700 flex items-center justify-center mb-3 group-hover:scale-105 transition-transform">
              <BarChart3 className="w-6 h-6" />
            </div>
            <Badge variant="outline" className="w-fit text-xs text-indigo-700 border-indigo-300 bg-indigo-50 mb-1">
              Vista V3 · Perfil Aseguradora
            </Badge>
            <CardTitle className="text-xl font-bold text-slate-900">Dashboard Aseguradora</CardTitle>
            <CardDescription className="text-slate-600">
              ¿Gana o pierde el negocio? Analiza la cartera de 1,000 pólizas, punto de equilibrio, distribución de pagos y estrés catastrófico.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Link
              href="/aseguradora"
              className="inline-flex w-full items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-indigo-600 text-white font-medium hover:bg-indigo-700 transition-colors shadow-xs"
            >
              Ver Cartera y Riesgo <ArrowRight className="w-4 h-4" />
            </Link>
          </CardContent>
        </Card>
      </div>

      {/* Banner de Metodología V4 */}
      <div className="mt-10 p-6 rounded-2xl bg-gradient-to-r from-slate-900 to-slate-800 text-white flex flex-col md:flex-row items-center justify-between gap-6 shadow-md">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <BookOpen className="w-5 h-5 text-emerald-400" />
            <span className="font-semibold text-emerald-400 text-sm">Vista V4: Transparencia Técnica</span>
          </div>
          <h3 className="text-xl font-bold">Metodología, Supuestos y Riesgo de Base</h3>
          <p className="text-sm text-slate-300 max-w-2xl">
            Detalle de fórmulas actuariales de la prima, fuentes de precipitación satelital (SENAMHI / CHIRPS), y límites del seguro paramétrico.
          </p>
        </div>
        <Link
          href="/metodologia"
          className="whitespace-nowrap px-5 py-2.5 rounded-lg bg-slate-700 hover:bg-slate-600 text-white text-sm font-semibold transition-colors border border-slate-600 flex items-center gap-2"
        >
          Consultar Metodología <ArrowRight className="w-4 h-4" />
        </Link>
      </div>
    </div>
  );
}
