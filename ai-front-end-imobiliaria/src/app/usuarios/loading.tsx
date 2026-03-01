import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent } from "@/components/ui/card";

export default function Loading() {
    return (
        <div className="container mx-auto py-8 space-y-6">
            <div className="flex justify-between items-center mb-6">
                <Skeleton className="h-10 w-48" />
                <Skeleton className="h-10 w-32" />
            </div>

            <Card>
                <CardContent className="p-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    <Skeleton className="h-10 w-full" />
                    <Skeleton className="h-10 w-full" />
                    <Skeleton className="h-10 w-full" />
                    <Skeleton className="h-10 w-full" />
                </CardContent>
            </Card>

            <div className="space-y-4">
                <Skeleton className="h-12 w-full" />
                <Skeleton className="h-16 w-full" />
                <Skeleton className="h-16 w-full" />
                <Skeleton className="h-16 w-full" />
                <Skeleton className="h-16 w-full" />
            </div>
        </div>
    );
}
