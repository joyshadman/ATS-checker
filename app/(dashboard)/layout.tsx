import { getSession } from "@/actions/auth";
import { redirect } from "next/navigation";
import { Sidebar } from "@/components/ui/sidebar";
import { ToastProvider } from "@/components/ui/toast";
import { ThemeToggle } from "@/components/ui/theme-toggle";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getSession();
  if (!session) redirect("/auth/login");

  return (
    <div className="flex min-h-screen bg-background">
      <Sidebar email={session.user?.email ?? ""} />
      <div className="flex-1 flex flex-col min-w-0">
        <header className="sticky top-0 z-20 border-b border-border bg-background/80 backdrop-blur-md">
          <div className="flex items-center justify-end gap-3 px-4 md:px-8 h-14">
            <ThemeToggle />
          </div>
        </header>
        <main className="flex-1 p-4 md:p-8 lg:p-10">
          <ToastProvider>{children}</ToastProvider>
        </main>
      </div>
    </div>
  );
}
