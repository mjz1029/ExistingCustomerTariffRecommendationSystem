export function Skeleton({ className = '' }: { className?: string }) {
  return (
    <div
      className={`bg-slate-200 rounded animate-pulse ${className}`}
    />
  )
}

export function CardSkeleton() {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-6 space-y-4">
      <div className="flex items-center gap-3">
        <Skeleton className="w-10 h-10 rounded-full" />
        <div className="flex-1 space-y-2">
          <Skeleton className="h-4 w-1/3" />
          <Skeleton className="h-3 w-1/2" />
        </div>
      </div>
      <div className="space-y-2">
        <Skeleton className="h-3 w-full" />
        <Skeleton className="h-3 w-5/6" />
        <Skeleton className="h-3 w-2/3" />
      </div>
    </div>
  )
}

export function TableSkeleton() {
  return (
    <div className="rounded-xl border border-slate-200 bg-white overflow-hidden">
      <div className="flex gap-4 px-6 py-3 bg-slate-50 border-b border-slate-200">
        <Skeleton className="h-4 w-1/4" />
        <Skeleton className="h-4 w-1/4" />
        <Skeleton className="h-4 w-1/4" />
        <Skeleton className="h-4 w-1/4" />
      </div>
      {Array.from({ length: 5 }).map((_, i) => (
        <div
          key={i}
          className={`flex gap-4 px-6 py-4 ${i < 4 ? 'border-b border-slate-100' : ''}`}
        >
          <Skeleton className="h-4 w-1/4" />
          <Skeleton className="h-4 w-1/4" />
          <Skeleton className="h-4 w-1/4" />
          <Skeleton className="h-4 w-1/4" />
        </div>
      ))}
    </div>
  )
}

export function StatsSkeleton() {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
      {Array.from({ length: 3 }).map((_, i) => (
        <div
          key={i}
          className="rounded-xl border border-slate-200 bg-white p-6 space-y-3"
        >
          <Skeleton className="h-3 w-1/2" />
          <Skeleton className="h-8 w-2/3" />
          <Skeleton className="h-3 w-1/3" />
        </div>
      ))}
    </div>
  )
}
