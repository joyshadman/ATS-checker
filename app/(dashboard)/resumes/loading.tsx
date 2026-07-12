export default function Loading() {
  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="space-y-2 animate-fade-in">
        <div className="h-8 w-36 rounded-xl bg-surface" />
        <div className="h-4 w-56 rounded-lg bg-surface" />
      </div>
      <div className="flex gap-3 animate-fade-in" style={{ animationDelay: "50ms" }}>
        <div className="flex-1 h-11 rounded-xl bg-surface" />
        <div className="w-44 h-11 rounded-xl bg-surface" />
      </div>
      {[1, 2, 3].map((i) => (
        <div
          key={i}
          className="h-20 rounded-2xl border bg-card animate-pulse"
          style={{ animationDelay: `${i * 60 + 100}ms` }}
        />
      ))}
    </div>
  );
}
