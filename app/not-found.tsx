import Link from "next/link";

export default function NotFound() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background bg-gradient-mesh">
      <div className="text-center space-y-6 max-w-sm px-4 animate-fade-in">
        <div className="w-24 h-24 rounded-3xl bg-gradient-primary/10 flex items-center justify-center mx-auto">
          <span className="text-5xl font-bold text-gradient">404</span>
        </div>
        <div>
          <h1 className="text-2xl font-bold text-foreground tracking-tight">
            Page not found
          </h1>
          <p className="text-muted mt-2 text-sm">
            The page you&apos;re looking for doesn&apos;t exist or has been
            moved.
          </p>
        </div>
        <Link
          href="/dashboard"
          className="inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-primary px-6 py-3 text-sm font-medium text-cream hover:brightness-110 transition-all duration-150 shadow-sm active:scale-[0.97]"
        >
          <svg
            className="w-4 h-4"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            strokeWidth={2}
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
          </svg>
          Go to Dashboard
        </Link>
      </div>
    </div>
  );
}
