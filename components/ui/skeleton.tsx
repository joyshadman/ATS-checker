type Props = {
  className?: string;
};

export function Skeleton({ className = "" }: Props) {
  return (
    <div className={`animate-pulse rounded-xl bg-surface ${className}`} />
  );
}

export function SkeletonCard() {
  return (
    <div className="rounded-2xl border bg-card p-6 space-y-4">
      <Skeleton className="h-4 w-24 rounded-lg" />
      <Skeleton className="h-8 w-16 rounded-lg" />
      <Skeleton className="h-3 w-32 rounded-lg" />
    </div>
  );
}

export function SkeletonLine({ width = "w-full" }: { width?: string }) {
  return <Skeleton className={`h-3 ${width} rounded-lg`} />;
}

export function SkeletonBlock() {
  return (
    <div className="space-y-3">
      {[1, 2, 3].map((i) => (
        <div key={i} className="flex items-center gap-3">
          <Skeleton className="h-10 w-10 rounded-xl shrink-0" />
          <div className="space-y-2 flex-1">
            <Skeleton className="h-3 w-3/5 rounded-lg" />
            <Skeleton className="h-2.5 w-2/5 rounded-lg" />
          </div>
        </div>
      ))}
    </div>
  );
}
