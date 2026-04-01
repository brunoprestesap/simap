interface ListSkeletonProps {
  count?: number;
  height?: string;
}

export function ListSkeleton({ count = 3, height = "h-20" }: ListSkeletonProps) {
  return (
    <div className="space-y-3">
      {Array.from({ length: count }, (_, i) => (
        <div
          key={i}
          className={`${height} animate-pulse rounded-lg border border-border bg-card`}
        />
      ))}
    </div>
  );
}
