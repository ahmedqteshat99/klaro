import { Card } from "@/components/ui/card";

const Shimmer = ({ className }: { className?: string }) => (
  <div className={`animate-pulse rounded bg-muted ${className ?? ""}`} />
);

const JobCardSkeleton = () => (
  <Card className="overflow-hidden p-5 sm:p-6">
    {/* Top row: badge placeholders + date */}
    <div className="flex items-center justify-between mb-3">
      <Shimmer className="h-5 w-12 rounded-full" />
      <Shimmer className="h-3 w-16" />
    </div>

    {/* Title */}
    <Shimmer className="h-5 w-3/4 mb-2" />

    {/* Hospital name */}
    <Shimmer className="h-4 w-1/2 mb-2" />

    {/* Location + department */}
    <Shimmer className="h-4 w-2/5 mb-3" />

    {/* Tags */}
    <div className="flex gap-1.5 mb-1">
      <Shimmer className="h-5 w-16 rounded-full" />
      <Shimmer className="h-5 w-20 rounded-full" />
    </div>

    {/* Bottom border */}
    <div className="mt-3 pt-3 border-t border-border/40">
      <Shimmer className="h-4 w-24 ml-auto" />
    </div>
  </Card>
);

/** Renders a grid of skeleton cards matching the jobs grid layout */
const JobCardSkeletonGrid = ({ count = 6 }: { count?: number }) => (
  <div className="grid gap-4 lg:grid-cols-2 xl:grid-cols-3">
    {Array.from({ length: count }, (_, i) => (
      <div
        key={i}
        className="animate-in fade-in-0"
        style={{ animationDelay: `${i * 75}ms`, animationFillMode: "both" }}
      >
        <JobCardSkeleton />
      </div>
    ))}
  </div>
);

export { JobCardSkeleton, JobCardSkeletonGrid };
export default JobCardSkeleton;
