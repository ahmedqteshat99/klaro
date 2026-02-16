import { Card, CardContent } from "@/components/ui/card";

const Shimmer = ({ className }: { className?: string }) => (
  <div className={`animate-pulse rounded bg-muted ${className ?? ""}`} />
);

const JobDetailSkeleton = () => (
  <div className="container mx-auto px-4 sm:px-6 pt-20 sm:pt-24 pb-8">
    {/* Breadcrumb skeleton */}
    <Shimmer className="h-4 w-48 mb-4" />

    <div className="lg:grid lg:grid-cols-3 lg:gap-6">
      {/* Left column */}
      <div className="lg:col-span-2 space-y-4">
        {/* Header card skeleton */}
        <Card>
          <CardContent className="p-5 sm:p-6 space-y-4">
            <Shimmer className="h-5 w-16 rounded-full" />
            <Shimmer className="h-8 w-3/4" />
            <Shimmer className="h-5 w-1/2" />
            <div className="space-y-2">
              <Shimmer className="h-4 w-2/5" />
              <Shimmer className="h-4 w-1/3" />
            </div>
            <div className="flex gap-2">
              <Shimmer className="h-5 w-20 rounded-full" />
              <Shimmer className="h-5 w-24 rounded-full" />
            </div>
            <div className="flex gap-2 pt-2 border-t border-border/50">
              <Shimmer className="h-9 w-36 rounded-md" />
              <Shimmer className="h-9 w-32 rounded-md" />
            </div>
          </CardContent>
        </Card>

        {/* Description skeleton */}
        <Card>
          <CardContent className="p-5 sm:p-6 space-y-3">
            <Shimmer className="h-5 w-40" />
            <Shimmer className="h-4 w-full" />
            <Shimmer className="h-4 w-full" />
            <Shimmer className="h-4 w-4/5" />
            <Shimmer className="h-4 w-full" />
            <Shimmer className="h-4 w-3/4" />
            <Shimmer className="h-4 w-full" />
            <Shimmer className="h-4 w-2/3" />
          </CardContent>
        </Card>
      </div>

      {/* Right column skeleton */}
      <div className="mt-4 lg:mt-0 space-y-4">
        <Card>
          <CardContent className="p-5 space-y-3">
            <Shimmer className="h-5 w-32" />
            <Shimmer className="h-4 w-full" />
            <Shimmer className="h-10 w-full rounded-md" />
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5 space-y-3">
            <Shimmer className="h-5 w-40" />
            <Shimmer className="h-4 w-full" />
            <Shimmer className="h-10 w-full rounded-md" />
          </CardContent>
        </Card>
      </div>
    </div>
  </div>
);

export default JobDetailSkeleton;
