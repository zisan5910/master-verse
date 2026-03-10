import { Skeleton } from "@/components/ui/skeleton";
import { VideoListItemSkeleton } from "./VideoCardSkeleton";

export function VideoPlayerSkeleton() {
  return (
    <div className="lg:flex lg:gap-4 lg:p-4 h-[calc(100vh-3.5rem)]">
      <div className="lg:flex-1 flex flex-col h-full">
        <div className="shrink-0">
          <Skeleton className="w-full aspect-video" />
          <div className="p-4 space-y-3">
            <Skeleton className="h-5 w-3/4" />
            <div className="flex gap-2">
              <Skeleton className="h-9 w-24" />
              <Skeleton className="h-9 w-20" />
              <Skeleton className="h-9 w-16" />
            </div>
          </div>
        </div>
        <div className="flex-1 p-4 lg:hidden space-y-2">
          <Skeleton className="h-5 w-28 mb-3" />
          {Array.from({ length: 4 }).map((_, i) => (
            <VideoListItemSkeleton key={i} />
          ))}
        </div>
      </div>
      <div className="hidden lg:block lg:w-80 space-y-2">
        <Skeleton className="h-5 w-28 mb-3" />
        {Array.from({ length: 5 }).map((_, i) => (
          <VideoListItemSkeleton key={i} />
        ))}
      </div>
    </div>
  );
}
