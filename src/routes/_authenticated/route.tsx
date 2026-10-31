import { createFileRoute, Link, Outlet, redirect, useNavigate } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { BookOpen, FileText, LayoutDashboard, LogOut, Mail, Network, Search, Users } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { setWantsRealAccount, signInAsDemo, wantsRealAccount } from "@/frontend/lib/demo-client";
import { DEMO_EMAIL } from "@/backend/demo.functions";

export const Route = createFileRoute("/_authenticated")({
  ssr: false,
  beforeLoad: async () => {
    const { data } = await supabase.auth.getUser();
    if (data.user) return { user: data.user };
    if (wantsRealAccount()) throw redirect({ to: "/auth" });
    // Prototype: no login needed — visitors are signed into the shared demo account.
    try {
      const user = await signInAsDemo();
      if (user) return { user };
    } catch (e) {
      console.error("Demo sign-in failed", e);
    }
    throw redirect({ to: "/auth" });
  },
  component: AppShell,
});

const nav = [
  { to: "/dashboard", label: "Overview", icon: LayoutDashboard },
  { to: "/documents", label: "Documents", icon: FileText },
  { to: "/search", label: "Search & Ask", icon: Search },
  { to: "/inbox", label: "Outlook & Teams", icon: Mail },
  { to: "/people", label: "Who to ask", icon: Network },
  { to: "/team", label: "Team", icon: Users },
] as const;

function AppShell() {
  const { user } = Route.useRouteContext();
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  async function signOut() {
    setWantsRealAccount(true);
    await queryClient.cancelQueries();
    queryClient.clear();
    await supabase.auth.signOut();
    navigate({ to: "/auth", replace: true });
  }

  return (
    <div className="flex min-h-screen flex-col">
      <header className="sticky top-0 z-40 border-b bg-sidebar backdrop-blur-md">
        <div className="mx-auto flex w-full max-w-6xl items-center gap-4 px-6 py-3">
          <Link to="/dashboard" className="flex shrink-0 items-center gap-2">
            <BookOpen className="size-5 text-primary" />
            <span className="font-serif text-xl font-semibold">CheckIT</span>
          </Link>
          <nav className="flex min-w-0 flex-1 gap-1 overflow-x-auto">
            {nav.map((n) => (
              <Link
                key={n.to}
                to={n.to}
                className="flex items-center gap-2 whitespace-nowrap rounded-md px-3 py-1.5 text-sm text-sidebar-foreground/80 hover:bg-sidebar-accent"
                activeProps={{ className: "bg-sidebar-accent text-sidebar-accent-foreground font-medium" }}
              >
                <n.icon className="size-4" />
                <span className="hidden sm:inline">{n.label}</span>
              </Link>
            ))}
          </nav>
          <div className="flex shrink-0 items-center gap-2">
            <span className="hidden max-w-40 truncate text-xs text-muted-foreground lg:inline">
              {user.email === DEMO_EMAIL ? "Demo user (no login)" : user.email}
            </span>
            <button
              onClick={signOut}
              className="flex items-center gap-2 whitespace-nowrap rounded-md px-3 py-1.5 text-sm hover:bg-sidebar-accent"
            >
              <LogOut className="size-4" />
              <span className="hidden md:inline">{user.email === DEMO_EMAIL ? "Use a real account" : "Sign out"}</span>
            </button>
          </div>
        </div>
      </header>
      <main className="mx-auto w-full max-w-6xl flex-1 px-6 py-10">
        <Outlet />
      </main>
    </div>
  );
}
