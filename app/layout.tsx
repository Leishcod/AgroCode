import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import { Navbar } from '@/components/navbar';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'AgroCode - Seguro Paramétrico Agrícola ante El Niño',
  description:
    'Plataforma interactiva de seguro paramétrico contra exceso de lluvia e inundaciones en el norte del Perú (Piura). CC Núcleo - Feria FIIS 2026-II.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="es" className="h-full">
      <body className={`${inter.className} min-h-full flex flex-col bg-slate-50/50 text-slate-900`}>
        <Navbar />
        <main className="flex-1">{children}</main>
        <footer className="border-t bg-white py-4 text-center text-xs text-muted-foreground">
          <div className="container mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-2">
            <span>Proyecto: Seguro Paramétrico Agrícola · Feria FIIS 2026-II · CC Núcleo</span>
            <span className="text-amber-700 bg-amber-50 px-2.5 py-0.5 rounded-full border border-amber-200">
              Cifras ilustrativas del prototipo (Etapa 1)
            </span>
          </div>
        </footer>
      </body>
    </html>
  );
}
