import { Skeleton } from "@/components/ui/skeleton";

export function CourseDetailsSkeleton() {
  return (
    <div className="p-4 max-w-3xl mx-auto space-y-4">
      <Skeleton className="w-full h-48 sm:h-64 rounded-lg" />
      <Skeleton className="h-7 w-2/3" />
      <Skeleton className="h-6 w-20" />
      <div className="space-y-2 mt-4">
        <Skeleton className="h-5 w-24" />
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-4 w-full" />
        ))}
      </div>
      <div className="mt-6 space-y-3">
        <Skeleton className="h-5 w-28" />
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {Array.from({ length: 2 }).map((_, i) => (
            <div key={i} className="flex items-center gap-3 p-3 bg-card rounded-lg border border-border">
              <Skeleton className="w-10 h-10 rounded-full" />
              <div className="space-y-1">
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-3 w-16" />
              </div>
            </div>
          ))}
        </div>
      </div>
      <Skeleton className="h-11 w-32 mt-6" />
    </div>
  );
}
