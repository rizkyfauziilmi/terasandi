import { FILE_CATEGORIES } from "@terasandi/contracts";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

/** Placeholder for the streamed file dashboard. */
export function DashboardSkeleton() {
  return (
    <div className="flex flex-col gap-6" aria-hidden="true">
      <div className="flex items-center justify-between gap-4">
        <Skeleton className="h-4 w-40" />
        <Skeleton className="h-8 w-28" />
      </div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
        {FILE_CATEGORIES.map((category) => (
          <Card key={category} size="sm">
            <CardHeader>
              <Skeleton className="h-4 w-20" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-7 w-12" />
            </CardContent>
          </Card>
        ))}
      </div>
      <div className="flex flex-col gap-2">
        {Array.from({ length: 5 }, (_, index) => (
          <Skeleton key={index} className="h-14 w-full rounded-lg" />
        ))}
      </div>
    </div>
  );
}
