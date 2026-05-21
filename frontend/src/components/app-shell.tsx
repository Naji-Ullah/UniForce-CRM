"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { motion } from "framer-motion";
import {
  Building2,
  GraduationCap,
  LayoutDashboard,
  LogOut,
  Users,
  BookOpen,
  CalendarCheck,
  ClipboardList,
  FileBarChart,
  PanelLeftClose,
  PanelLeft,
} from "lucide-react";
import { api } from "@/lib/api";
import { useAuth, type Role } from "@/lib/auth";
import { ThemeToggle } from "@/components/theme-toggle";
import { cn } from "@/lib/utils";

interface OrgOption {
  id: number;
  slug: string;
  name: string;
}

interface NavItem {
  href: string;
  label: string;
  icon: React.ElementType;
  roles: Role[];
}

// HEAD_ADMIN is a platform-level role: their job is org provisioning, not
// running a single tenant's day-to-day. So they see Dashboard, Organizations,
// and read-only Teachers/Students — everything else is hidden.
const NAV: NavItem[] = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard, roles: ["HEAD_ADMIN", "MANAGER", "TEACHER"] },
  { href: "/organizations", label: "Organizations", icon: Building2, roles: ["HEAD_ADMIN"] },
  { href: "/teachers", label: "Teachers", icon: Users, roles: ["MANAGER", "HEAD_ADMIN"] },
  { href: "/students", label: "Students", icon: GraduationCap, roles: ["TEACHER", "MANAGER", "HEAD_ADMIN"] },
  { href: "/courses", label: "Courses", icon: BookOpen, roles: ["TEACHER", "MANAGER"] },
  { href: "/classes", label: "Classes", icon: ClipboardList, roles: ["TEACHER", "MANAGER"] },
  { href: "/attendance", label: "Attendance", icon: CalendarCheck, roles: ["TEACHER", "MANAGER"] },
  { href: "/assignments", label: "Assignments", icon: ClipboardList, roles: ["TEACHER", "MANAGER"] },
  { href: "/quizzes", label: "Quizzes", icon: ClipboardList, roles: ["TEACHER", "MANAGER"] },
  { href: "/reports", label: "Reports", icon: FileBarChart, roles: ["TEACHER", "MANAGER"] },
];

export function AppShell({ children }: { children: React.ReactNode }) {
  const { user, loading, logout, activeOrgId, setActiveOrg } = useAuth();
  const pathname = usePathname();
  const router = useRouter();
  const [collapsed, setCollapsed] = useState(false);
  const [orgs, setOrgs] = useState<OrgOption[]>([]);

  useEffect(() => {
    if (user?.role !== "HEAD_ADMIN") return;
    api.get<OrgOption[]>("/organizations").then((list) => {
      setOrgs(list);
      if (activeOrgId == null && list[0]) setActiveOrg(list[0].id);
    });
  }, [user, activeOrgId, setActiveOrg]);

  useEffect(() => {
    if (loading) return;
    if (!user) router.replace("/login");
    else if (user.role === "STUDENT") router.replace("/student/dashboard");
  }, [loading, user, router]);

  if (loading || !user || user.role === "STUDENT") {
    return (
      <div className="flex h-screen items-center justify-center text-muted-foreground">
        Loading workspace…
      </div>
    );
  }

  const items = NAV.filter((n) => n.roles.includes(user.role));

  return (
    <div className="flex h-screen overflow-hidden">
      <motion.aside
        animate={{ width: collapsed ? 72 : 248 }}
        transition={{ duration: 0.2 }}
        className="flex flex-col border-r border-border bg-card"
      >
        <div className="flex h-16 items-center gap-2 px-5">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-primary text-primary-foreground font-bold">
            CF
          </div>
          {!collapsed && (
            <span className="truncate text-sm font-semibold">CampusFlow</span>
          )}
        </div>

        <nav className="flex-1 space-y-1 px-3 py-2">
          {items.map((item) => {
            const active = pathname.startsWith(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors",
                  active
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground"
                )}
              >
                <item.icon className="h-4 w-4 shrink-0" />
                {!collapsed && <span className="truncate">{item.label}</span>}
              </Link>
            );
          })}
        </nav>

        <button
          onClick={() => setCollapsed((c) => !c)}
          className="m-3 flex items-center gap-2 rounded-md px-3 py-2 text-sm text-muted-foreground hover:bg-muted"
        >
          {collapsed ? (
            <PanelLeft className="h-4 w-4" />
          ) : (
            <>
              <PanelLeftClose className="h-4 w-4" /> Collapse
            </>
          )}
        </button>
      </motion.aside>

      <div className="flex flex-1 flex-col overflow-hidden">
        <header className="flex h-16 items-center justify-between border-b border-border px-6">
          <div>
            <p className="text-xs text-muted-foreground">
              {user.role === "HEAD_ADMIN"
                ? orgs.find((o) => o.id === activeOrgId)?.name ?? "Platform"
                : user.organization_name ?? "Platform"}
            </p>
            <h1 className="text-sm font-semibold capitalize">
              {pathname.split("/")[1] || "dashboard"}
            </h1>
          </div>
          <div className="flex items-center gap-3">
            {user.role === "HEAD_ADMIN" && (
              <div className="flex items-center gap-2">
                <span className="text-xs text-muted-foreground">Viewing</span>
                <select
                  className="h-9 rounded-md border border-input bg-transparent px-3 text-sm"
                  value={activeOrgId ?? ""}
                  onChange={(e) => {
                    setActiveOrg(e.target.value ? Number(e.target.value) : null);
                    // Pages cache data in useEffect on mount — reload so every
                    // tenant-scoped view re-fetches with the new org context.
                    if (typeof window !== "undefined") window.location.reload();
                  }}
                >
                  {orgs.length === 0 ? (
                    <option value="">— no orgs —</option>
                  ) : (
                    orgs.map((o) => (
                      <option key={o.id} value={o.id}>
                        {o.name}
                      </option>
                    ))
                  )}
                </select>
              </div>
            )}
            <ThemeToggle />
            <div className="text-right">
              <p className="text-sm font-medium">{user.full_name}</p>
              <p className="text-xs text-muted-foreground">
                {user.role.replace("_", " ")}
              </p>
            </div>
            <button
              onClick={logout}
              className="rounded-md p-2 text-muted-foreground hover:bg-muted"
              aria-label="Log out"
            >
              <LogOut className="h-4 w-4" />
            </button>
          </div>
        </header>

        <main className="flex-1 overflow-auto p-6">
          <div className="mx-auto max-w-6xl animate-fade-in">{children}</div>
        </main>
      </div>
    </div>
  );
}
