import Link from 'next/link';

export default function NotFound() {
  return (
    <section className="flex min-h-[60vh] flex-col items-center justify-center gap-4 px-6 text-center">
      <p className="text-sm font-semibold uppercase tracking-wider text-primary">Error 404</p>
      <h1 className="text-3xl font-bold text-foreground">No encontramos esta página</h1>
      <p className="max-w-md text-sm text-muted-foreground">
        La dirección puede haber cambiado o no pertenece a AgroCode.
      </p>
      <Link
        href="/"
        className="inline-flex h-9 items-center justify-center rounded-lg bg-primary px-4 text-sm font-medium text-primary-foreground transition-colors hover:opacity-90"
      >
        Volver al inicio
      </Link>
    </section>
  );
}
