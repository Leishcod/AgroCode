'use client';

import { Button } from '@/components/ui/button';

type ErrorPageProps = {
  error: Error & { digest?: string };
  reset: () => void;
};

export default function ErrorPage({ reset }: ErrorPageProps) {
  return (
    <section className="flex min-h-[50vh] flex-col items-center justify-center gap-4 px-6 text-center">
      <div className="space-y-2">
        <h1 className="text-2xl font-bold text-foreground">No se pudo cargar esta vista</h1>
        <p className="max-w-md text-sm text-muted-foreground">
          Ocurrió un problema al mostrar la simulación. Puedes volver a intentarlo.
        </p>
      </div>
      <Button onClick={reset}>Reintentar</Button>
    </section>
  );
}
