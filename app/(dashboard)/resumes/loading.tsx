export default function Loading() {
  return (
    <div className="max-w-4xl mx-auto space-y-6 animate-pulse">
      <div className="space-y-2">
        <div className="h-8 w-36 rounded-xl bg-surface border" />
        <div className="h-4 w-56 rounded-lg bg-surface border" />
      </div>
      <div className="flex gap-3">
        <div className="flex-1 h-11 rounded-xl bg-surface border" />
        <div className="w-44 h-11 rounded-xl bg-surface border" />
      </div>
      {[1, 2, 3].map((i) => (
        <div key={i} className="h-20 rounded-2xl border bg-card" />
      ))}
    </div>
  );
}
