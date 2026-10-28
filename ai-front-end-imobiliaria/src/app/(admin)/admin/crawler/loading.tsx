export default function CrawlerModuleLoading() {
  return (
    <div aria-busy="true" className="space-y-4" role="status">
      <p className="text-sm text-muted-foreground">Carregando dados do crawler...</p>
      <div className="h-28 animate-pulse rounded-xl border bg-muted/40" />
      <div className="h-72 animate-pulse rounded-xl border bg-muted/40" />
    </div>
  );
}
