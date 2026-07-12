import { getSession } from "@/actions/auth";
import { redirect } from "next/navigation";
import { GoogleSignIn } from "@/components/auth/google-sign-in";

const ERROR_MESSAGES: Record<string, string> = {
  account_not_linked:
    "This Google account could not be linked. Your email may already be registered. Please try again or contact support.",
  access_denied:
    "Google sign-in was cancelled. You can try again when you're ready.",
};

export default async function LoginPage(props: {
  searchParams: Promise<{ error?: string }>;
}) {
  const session = await getSession();
  if (session) redirect("/dashboard");

  const { error } = await props.searchParams;
  const errorMessage = error
    ? ERROR_MESSAGES[error] ??
      "An unexpected error occurred. Please try again."
    : null;

  const googleConfigured = !!(
    process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET
  );

  return (
    <div className="flex min-h-screen">
      {/* Hero panel */}
      <div className="hidden lg:flex lg:w-1/2 relative overflow-hidden items-center justify-center">
        <div className="absolute inset-0 bg-gradient-hero" />
        <div className="absolute inset-0 bg-gradient-mesh opacity-60" />
        <div
          className="absolute inset-0 opacity-[0.03]"
          style={{
            backgroundImage:
              "url(\"data:image/svg+xml,%3Csvg width='40' height='40' viewBox='0 0 40 40' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='%23fff' fill-opacity='1'%3E%3Ccircle cx='2' cy='2' r='1'/%3E%3C/g%3E%3C/svg%3E\")",
          }}
        />
        <div className="relative z-10 text-center px-12 max-w-lg">
          <div className="w-16 h-16 rounded-2xl bg-white/15 backdrop-blur-md flex items-center justify-center mx-auto mb-8 shadow-lg border border-white/20 animate-float">
            <span className="text-3xl font-bold text-white">A</span>
          </div>
          <h1 className="text-4xl font-bold text-white mb-4 leading-tight tracking-tight">
            ATS Resume Checker
          </h1>
          <p className="text-lg text-white/75 leading-relaxed">
            AI-powered resume analysis and optimization to help you pass
            Applicant Tracking Systems and land more interviews.
          </p>
          <div className="mt-10 grid grid-cols-3 gap-4 text-left">
            {[
              { value: "98%", label: "Accuracy" },
              { value: "10k+", label: "Resumes Analyzed" },
              { value: "3x", label: "Interview Rate" },
            ].map((stat, i) => (
              <div
                key={stat.label}
                className={`rounded-2xl bg-white/10 backdrop-blur-sm border border-white/10 p-4 animate-slide-up stagger-${i + 1}`}
              >
                <div className="text-xl font-bold text-white">{stat.value}</div>
                <div className="text-xs text-white/60 mt-1">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Sign-in panel */}
      <div className="flex-1 flex items-center justify-center p-6 bg-background bg-gradient-mesh">
        <div className="w-full max-w-sm space-y-8 animate-fade-in">
          <div className="text-center lg:text-left">
            <div className="lg:hidden w-12 h-12 rounded-xl bg-gradient-primary flex items-center justify-center mx-auto mb-6 shadow-md">
              <span className="text-xl font-bold text-white">A</span>
            </div>
            <h1 className="text-2xl font-bold text-foreground tracking-tight">
              Welcome back
            </h1>
            <p className="text-muted mt-1.5 text-sm">
              Sign in to your account to continue
            </p>
          </div>

          {errorMessage && (
            <div className="rounded-xl border border-rose-200 dark:border-rose-800/60 bg-rose-50 dark:bg-rose-950/60 px-4 py-3 text-sm text-rose-700 dark:text-rose-300 animate-slide-down">
              {errorMessage}
            </div>
          )}

          {googleConfigured ? (
            <div className="space-y-4">
              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-border/60" />
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                  <span className="bg-background px-3 text-muted font-medium">
                    Continue with
                  </span>
                </div>
              </div>
              <GoogleSignIn />
              <p className="text-xs text-center text-muted/70">
                By signing in, you agree to our Terms of Service and Privacy
                Policy
              </p>
            </div>
          ) : (
            <div className="rounded-xl border border-amber-200 dark:border-amber-800/60 bg-amber-50 dark:bg-amber-950/60 px-4 py-3 text-sm text-amber-700 dark:text-amber-300">
              Google OAuth is not configured. Set{" "}
              <code className="font-mono text-xs bg-amber-100 dark:bg-amber-900/50 px-1.5 py-0.5 rounded-md">
                GOOGLE_CLIENT_ID
              </code>{" "}
              and{" "}
              <code className="font-mono text-xs bg-amber-100 dark:bg-amber-900/50 px-1.5 py-0.5 rounded-md">
                GOOGLE_CLIENT_SECRET
              </code>{" "}
              in your environment variables to enable sign-in.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
