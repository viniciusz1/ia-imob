import { Skeleton } from "@/components/ui/skeleton";

export default function NewPropertiesLoading() {
  return (
    <div className="space-y-6">
      <div className="space-y-3">
        <Skeleton className="h-9 w-72" />
        <Skeleton className="h-5 w-full max-w-2xl" />
      </div>
      <Skeleton className="h-10 w-full max-w-xl" />
      <Skeleton className="h-80 w-full rounded-xl" />
    </div>
  );
}
