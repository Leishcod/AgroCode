'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useSimulationStore } from '@/store/simulation-store';
import { CloudRain, PlayCircle, BarChart3, BookOpen, LayoutDashboard, Presentation, RotateCcw } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

const navItems = [
  { href: '/', label: 'V0: Inicio', icon: LayoutDashboard },
  { href: '/calculadora', label: 'V1: Calculadora', icon: CloudRain },
  { href: '/simulador', label: 'V2: Simulador', icon: PlayCircle },
  { href: '/aseguradora', label: 'V3: Aseguradora', icon: BarChart3 },
  { href: '/metodologia', label: 'V4: Metodología', icon: BookOpen },
];

export function Navbar() {
  const pathname = usePathname();
  const { demoModeActive, toggleDemoMode, reset } = useSimulationStore();

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container mx-auto flex h-16 items-center justify-between px-4">
        {/* Logo / Brand */}
        <Link href="/" className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-600 to-teal-700 text-white font-bold text-lg shadow-sm">
            AC
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-bold tracking-tight text-foreground text-lg">AgroCode</span>
              <Badge variant="outline" className="text-[10px] text-emerald-600 border-emerald-300 bg-emerald-50">
                Paramétrico 2026-II
              </Badge>
            </div>
            <p className="text-xs text-muted-foreground hidden sm:block">FIIS · CC Núcleo · Piura</p>
          </div>
        </Link>

        {/* 5 Vistas Navigation */}
        <nav className="hidden lg:flex items-center gap-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                  isActive
                    ? 'bg-emerald-50 text-emerald-900 border border-emerald-200 shadow-xs'
                    : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                }`}
              >
                <Icon className={`w-4 h-4 ${isActive ? 'text-emerald-600' : 'text-muted-foreground'}`} />
                {item.label}
              </Link>
            );
          })}
        </nav>

        {/* Acciones: Demo & Reset */}
        <div className="flex items-center gap-2">
          <button
            onClick={reset}
            title="Restablecer valores"
            className="p-2 text-muted-foreground hover:text-foreground rounded-lg hover:bg-muted transition-colors"
          >
            <RotateCcw className="w-4 h-4" />
          </button>

          <button
            onClick={toggleDemoMode}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold border transition-all ${
              demoModeActive
                ? 'bg-amber-500 text-white border-amber-600 shadow-md ring-2 ring-amber-300'
                : 'border-input hover:bg-accent text-foreground'
            }`}
          >
            <Presentation className="w-3.5 h-3.5" />
            <span>{demoModeActive ? 'Modo Demo: ON' : 'Modo Demo (15 min)'}</span>
          </button>
        </div>
      </div>
    </header>
  );
}
