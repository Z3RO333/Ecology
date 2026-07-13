export default function DashboardLoading() {
  return (
    <div className="space-y-6" aria-label="Carregando página">
      <div className="space-y-2">
        <div className="skeleton-shimmer h-4 w-24 rounded-full" />
        <div className="skeleton-shimmer h-9 w-72 max-w-full rounded-xl" />
        <div className="skeleton-shimmer h-4 w-96 max-w-full rounded-full" />
      </div>
      <div className="skeleton-shimmer h-16 rounded-2xl" />
      <div className="grid gap-4 sm:grid-cols-3">
        {[0, 1, 2].map((item) => <div key={item} className="skeleton-shimmer h-32 rounded-2xl" />)}
      </div>
      <div className="grid gap-5 xl:grid-cols-2">
        <div className="skeleton-shimmer h-80 rounded-2xl" />
        <div className="skeleton-shimmer h-80 rounded-2xl" />
      </div>
    </div>
  );
}
