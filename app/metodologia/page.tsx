import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { HelpCircle, Database, ShieldAlert, Cpu } from 'lucide-react';

const glossary = [
  { term: 'Seguro Paramétrico', desc: 'Contrato donde la indemnización se activa automáticamente cuando un índice objetivo e independiente (ej. lluvia acumulada) cruza un umbral prefijado, sin requerir peritajes de campo ni evaluación de daños individuales.' },
  { term: 'Póliza', desc: 'Documento legal del contrato del seguro que estipula las hectáreas cubiertas, el índice de referencia, los umbrales de activación y los montos a indemnizar.' },
  { term: 'Prima Comercial', desc: 'El precio total que abona el productor o la entidad financiadora por contar con la cobertura durante la campaña agrícola.' },
  { term: 'Suma Asegurada (L)', desc: 'Monto máximo en soles por hectárea que la póliza puede llegar a desembolsar ante un evento climático extremo.' },
  { term: 'Índice Paramétrico', desc: 'Variable meteorológica objetiva y verificable por terceros; en este proyecto, la lluvia acumulada en milímetros (mm) registrada por satélite/estaciones durante la ventana diciembre-abril.' },
  { term: 'Umbral K (Gatillo / Strike)', desc: 'Nivel mínimo de lluvia acumulada a partir del cual el seguro empieza a realizar desembolsos proporcionales.' },
  { term: 'Límite S (Exit)', desc: 'Nivel de lluvia acumulada a partir del cual se indemniza el 100% de la suma asegurada.' },
  { term: 'Pago Esperado (Pure Risk Premium)', desc: 'El promedio matemático de los desembolsos indemnizatorios calculados a través de miles de años simulados mediante el método Monte Carlo.' },
  { term: 'Simulación Monte Carlo', desc: 'Método algorítmico que genera miles de temporadas sintéticas respetando las propiedades estadísticas históricas para estimar pérdidas de eventos de baja frecuencia y alta severidad.' },
  { term: 'Riesgo de Base', desc: 'Diferencia potencial entre el índice medido en la estación satelital y el daño real en la parcela de un agricultor individual.' },
  { term: 'Reaseguro', desc: 'Mecanismo de transferencia de riesgo mediante el cual una reaseguradora absorbe las pérdidas que excedan las reservas de la aseguradora en años catastróficos.' },
  { term: 'Punto de Equilibrio (Break-Even)', desc: 'Cantidad mínima de pólizas que la entidad aseguradora debe colocar en el mercado para cubrir la totalidad de sus costos operativos fijos y variables.' },
];

export default function MetodologiaV4() {
  return (
    <div className="container mx-auto px-4 py-8 max-w-5xl">
      {/* Header */}
      <div className="mb-10 text-center sm:text-left">
        <div className="flex items-center gap-2 mb-1 justify-center sm:justify-start">
          <Badge className="bg-slate-900 text-white">Vista V4</Badge>
          <span className="text-xs text-muted-foreground">Documentación Técnica y Fundamento para el Jurado</span>
        </div>
        <h1 className="text-3xl sm:text-4xl font-extrabold text-slate-900 tracking-tight">
          Metodología, Fórmulas y Supuestos
        </h1>
        <p className="mt-2 text-slate-600 max-w-3xl">
          Transparencia integral del modelo actuarial, arquitectura matemática de la prima paramétrica y análisis del riesgo de base.
        </p>
      </div>

      <div className="space-y-8">
        {/* 1. Fórmulas Matemáticas */}
        <Card className="border-slate-200 shadow-xs">
          <CardHeader>
            <CardTitle className="text-xl font-bold flex items-center gap-2">
              <Cpu className="w-5 h-5 text-emerald-600" />
              1. Función de Pago y Estructura Actuarial de la Prima
            </CardTitle>
            <CardDescription>Modelo matemático implementado en lib/engine</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6 text-sm text-slate-700">
            <div>
              <h3 className="font-bold text-slate-900 text-base mb-1">A. Función de Pago Paramétrico P(R)</h3>
              <p className="mb-3 text-slate-600">
                La indemnización se calcula mediante una función lineal por tramos en función de la lluvia acumulada $R$:
              </p>
              <div className="p-4 bg-slate-900 text-slate-100 rounded-xl font-mono text-sm overflow-x-auto">
                {`P(R) = 0                       si R <= K
P(R) = L * ((R - K) / (S - K)) si K < R < S
P(R) = L                       si R >= S`}
              </div>
              <p className="text-xs text-slate-500 mt-2">
                Donde <strong>L</strong> es la suma asegurada por ha, <strong>K</strong> es el umbral de activación (strike) y <strong>S</strong> es el límite de indemnización total (exit).
              </p>
            </div>

            <div className="border-t pt-4">
              <h3 className="font-bold text-slate-900 text-base mb-1">B. Tarificación de la Prima Comercial</h3>
              <p className="mb-3 text-slate-600">
                La prima comercial incorpora el costo de riesgo, el margen de solvencia ante incertidumbre y los costos de operación:
              </p>
              <div className="p-4 bg-slate-900 text-slate-100 rounded-xl font-mono text-sm overflow-x-auto">
                {`Prima Comercial = (E[P] * (1 + λ) + c_v + F/N) * (1 - δ_adaptación)

Donde:
  E[P]           : Pago esperado obtenido por Monte Carlo
  λ (lambda)     : Recargo de seguridad (safety loading)
  c_v            : Costo variable operativo por póliza emitida
  F / N          : Prorrateo de costos fijos entre N pólizas
  δ_adaptación   : Bonificación porcentual por drenaje y cobertura`}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* 2. Fuentes de Datos y Sensores */}
        <Card className="border-slate-200 shadow-xs">
          <CardHeader>
            <CardTitle className="text-xl font-bold flex items-center gap-2">
              <Database className="w-5 h-5 text-blue-600" />
              2. Fuentes de Datos Meteorológicos y Satelitales
            </CardTitle>
            <CardDescription>Procedencia y validación del índice climático</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4 text-sm text-slate-700">
            <div className="grid md:grid-cols-2 gap-4">
              <div className="p-4 bg-slate-50 rounded-xl border">
                <span className="font-bold text-slate-900 block mb-1">CHIRPS (UC Santa Barbara)</span>
                <p className="text-xs text-slate-600">
                  Conjunto de datos satelitales cuasi-globales de precipitación diaria con resolución espacial de 0.05° (~5.3 km), ideal para calibración histórica y series continuas de 1981 al presente.
                </p>
              </div>
              <div className="p-4 bg-slate-50 rounded-xl border">
                <span className="font-bold text-slate-900 block mb-1">Red de Estaciones SENAMHI</span>
                <p className="text-xs text-slate-600">
                  Datos de pluviómetros de superficie en Piura (estaciones Miraflores, Chulucanas, Partidor, Huancabamba) utilizados para el contraste de sesgo y ajuste de distribución estadística.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* 3. Riesgo de Base y Limitaciones */}
        <Card className="border-slate-200 shadow-xs">
          <CardHeader>
            <CardTitle className="text-xl font-bold flex items-center gap-2">
              <ShieldAlert className="w-5 h-5 text-amber-600" />
              3. Gestión del Riesgo de Base y Limitaciones
            </CardTitle>
            <CardDescription>Punto clave para la defensa ante el jurado técnico</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 text-sm text-slate-700">
            <p>
              El seguro paramétrico no indemniza pérdidas individuales peritadas, sino que responde a una métrica ambiental colectiva. Esto introduce dos tipos de riesgo de base:
            </p>
            <ul className="list-disc pl-5 space-y-2 text-xs text-slate-600">
              <li>
                <strong>Falso negativo:</strong> El agricultor sufrió escorrentía o saturación hídrica severa, pero la malla satelital registró un valor milimétrico por debajo del umbral K.
              </li>
              <li>
                <strong>Falso positivo:</strong> La estación satelital superó el umbral pero la parcela contó con drenaje natural favorable y no reportó pérdidas de cosecha.
              </li>
            </ul>
            <p className="text-xs text-slate-700 bg-amber-50 p-3 rounded-lg border border-amber-200 mt-2">
              <strong>Estrategia de mitigación:</strong> Mallas espaciales de alta resolución (0.05°), definición de ventanas fenológicas críticas (diciembre a abril) e incentivos explícitos para que los agricultores adopten infraestructura de drenaje parcelario.
            </p>
          </CardContent>
        </Card>

        {/* 4. Glosario en Lenguaje Simple */}
        <Card className="border-slate-200 shadow-xs">
          <CardHeader>
            <CardTitle className="text-xl font-bold flex items-center gap-2">
              <HelpCircle className="w-5 h-5 text-indigo-600" />
              4. Glosario Oficial del Proyecto
            </CardTitle>
            <CardDescription>Definiciones sin tecnicismos para agricultores y evaluadores</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid md:grid-cols-2 gap-4">
              {glossary.map((item, idx) => (
                <div key={idx} className="p-3.5 bg-slate-50/70 border rounded-xl">
                  <span className="font-bold text-slate-900 text-sm block mb-1">{item.term}</span>
                  <p className="text-xs text-slate-600 leading-relaxed">{item.desc}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
