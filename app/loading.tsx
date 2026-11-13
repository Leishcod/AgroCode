export default function Loading() {
  return (
    <div
      className="flex min-h-[50vh] flex-col items-center justify-center gap-3 text-muted-foreground"
      role="status"
      aria-live="polite"
    >
      <span className="size-9 animate-spin rounded-full border-4 border-muted border-t-primary" aria-hidden="true" />
      <span className="text-sm font-medium">Cargando simulación...</span>
    </div>
  );
}
