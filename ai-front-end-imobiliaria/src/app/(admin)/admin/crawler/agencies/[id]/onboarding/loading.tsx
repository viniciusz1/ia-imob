import { Skeleton } from "@/components/ui/skeleton";

export default function CrawlAgencyOnboardingLoading() {
  return (
    <section aria-busy="true" className="space-y-6" role="status">
      <span className="sr-only">Carregando Onboarding…</span>
      <div className="space-y-2">
        <Skeleton className="h-4 w-48" />
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-4 w-80 max-w-full" />
      </div>
      <Skeleton className="h-10 w-full max-w-2xl" />
      <Skeleton className="h-32 rounded-xl" />
      <Skeleton className="h-64 rounded-xl" />
    </section>
  );
}
