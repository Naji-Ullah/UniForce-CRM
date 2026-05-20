"use client";

import { useEffect } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { LayoutDashboard, CalendarCheck, ClipboardList, LogOut } from "lucide-react";
import { useAuth } from "@/lib/auth";
import { ThemeToggle } from "@/components/theme-toggle";
import { cn } from "@/lib/utils";

const NAV = [
  { href: "/student/dashboard", label: "Overview", icon: LayoutDashboard },
  { href: "/student/attendance", label: "Attendance", icon: CalendarCheck },
  { href: "/student/marks", label: "Marks", icon: ClipboardList },
];

export function StudentShell({ children }: { children: React.ReactNode }) {
  const { user, loading, logout } = useAuth();
  const pathname = usePathname();
  const router = useRouter();

  useEffect(() => {
    if (loading) return;
    if (!user) router.replace("/login");
    else if (user.role !== "STUDENT") router.replace("/dashboard");
  }, [loading, user, router]);

  if (loading || !user || user.role !== "STUDENT") {
    return (
      <div className="flex h-screen items-center justify-center text-muted-foreground">
        Loading…
      </div>
    );
  }

  return (
    <div className="flex h-screen overflow-hidden">
      <aside className="flex w-60 flex-col border-r border-border bg-card">
        <div className="flex h-16 items-center gap-2 px-5">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-primary text-primary-foreground font-bold">
            S
          </div>
          <span className="truncate text-sm font-semibold">Student Portal</span>
        </div>
        <nav className="flex-1 space-y-1 px-3 py-2">
          {NAV.map((item) => {
            const active = pathname.startsWith(item.href);
            return (
              <Link key={item.href} href={item.href}
                className={cn(
                  "flex items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors",
                  active
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground"
                )}
              >
                <item.icon className="h-4 w-4 shrink-0" />
                <span className="truncate">{item.label}</span>
              </Link>
            );
          })}
        </nav>
      </aside>

      <div className="flex flex-1 flex-col overflow-hidden">
        <header className="flex h-16 items-center justify-between border-b border-border px-6">
          <div>
            <p className="text-xs text-muted-foreground">{user.organization_name ?? ""}</p>
            <h1 className="text-sm font-semibold capitalize">
              {pathname.split("/").pop() || "overview"}
            </h1>
          </div>
          <div className="flex items-center gap-3">
            <ThemeToggle />
            <div className="text-right">
              <p className="text-sm font-medium">{user.full_name}</p>
              <p className="text-xs text-muted-foreground">Student</p>
            </div>
            <button onClick={logout}
              className="rounded-md p-2 text-muted-foreground hover:bg-muted"
              aria-label="Log out">
              <LogOut className="h-4 w-4" />
            </button>
          </div>
        </header>
        <main className="flex-1 overflow-auto p-6">
          <div className="mx-auto max-w-5xl animate-fade-in">{children}</div>
        </main>
      </div>
    </div>
  );
}
