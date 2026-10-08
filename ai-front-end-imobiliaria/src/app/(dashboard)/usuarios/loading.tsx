import { Skeleton } from "@/components/ui/skeleton";

export default function Loading() {
    return (
        <section aria-busy="true" className="space-y-6" role="status">
            <span className="sr-only">Carregando usuários…</span>
            <div className="flex flex-wrap items-end justify-between gap-3">
                <div className="space-y-2">
                    <Skeleton className="h-8 w-48" />
                    <Skeleton className="h-4 w-72 max-w-full" />
                </div>
                <Skeleton className="h-10 w-36 rounded-lg" />
            </div>

            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <Skeleton className="h-28 rounded-xl" />
                <Skeleton className="h-28 rounded-xl" />
                <Skeleton className="h-28 rounded-xl" />
                <Skeleton className="h-28 rounded-xl" />
            </div>

            <div className="flex flex-wrap gap-3">
                <Skeleton className="h-9 min-w-48 flex-1 rounded-lg" />
                <Skeleton className="h-9 w-40 rounded-lg" />
                <Skeleton className="h-9 w-40 rounded-lg" />
                <Skeleton className="h-9 w-40 rounded-lg" />
            </div>

            <Skeleton className="h-96 rounded-xl" />
        </section>
    );
}
