export default function DashboardLoading() {
  return (
    <div className="max-w-5xl mx-auto space-y-8">
      <div className="space-y-2 animate-fade-in">
        <div className="h-8 w-48 rounded-xl bg-surface" />
        <div className="h-4 w-64 rounded-lg bg-surface" />
      </div>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[1, 2, 3, 4].map((i) => (
          <div
            key={i}
            className="h-32 rounded-2xl border bg-card animate-pulse"
            style={{ animationDelay: `${i * 60}ms` }}
          />
        ))}
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="h-64 rounded-2xl border bg-card animate-pulse" />
        <div className="h-64 rounded-2xl border bg-card animate-pulse" />
      </div>
      <div className="h-48 rounded-2xl border bg-card animate-pulse" />
    </div>
  );
}
