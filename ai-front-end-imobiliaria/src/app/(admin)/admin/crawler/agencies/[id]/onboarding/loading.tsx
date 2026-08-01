export default function CrawlAgencyOnboardingLoading() {
  return (
    <section aria-busy="true" className="space-y-4" role="status">
      <p className="text-sm text-muted-foreground">Carregando Onboarding…</p>
      <div className="h-32 animate-pulse rounded-xl border bg-muted/40" />
      <div className="h-64 animate-pulse rounded-xl border bg-muted/40" />
    </section>
  );
}
