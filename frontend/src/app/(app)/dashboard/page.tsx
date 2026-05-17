"use client";

import { useEffect, useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  Users,
  GraduationCap,
  BookOpen,
  ClipboardList,
  Building2,
} from "lucide-react";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { Card, CardContent, Skeleton } from "@/components/ui/primitives";
import { PageHeader } from "@/components/page";

interface Stats {
  teachers: number;
  students: number;
  courses: number;
  classes: number;
  enrollments: number;
  assignments: number;
  quizzes: number;
}

const META = [
  { key: "teachers", label: "Teachers", icon: Users },
  { key: "students", label: "Students", icon: GraduationCap },
  { key: "courses", label: "Courses", icon: BookOpen },
  { key: "classes", label: "Classes", icon: ClipboardList },
] as const;

export default function DashboardPage() {
  const { user } = useAuth();
  const isHead = user?.role === "HEAD_ADMIN";
  const [stats, setStats] = useState<Stats | null>(null);
  const [orgCount, setOrgCount] = useState<number | null>(null);

  useEffect(() => {
    if (isHead) {
      api.get<any[]>("/organizations").then((o) => setOrgCount(o.length)).catch(() => {});
    } else {
      api.get<Stats>("/dashboard").then(setStats).catch(() => {});
    }
  }, [isHead]);

  if (isHead) {
    return (
      <>
        <PageHeader
          title={`Welcome back, ${user?.full_name}`}
          subtitle="Platform overview across all tenant organizations."
        />
        <Card>
          <CardContent className="flex items-center gap-4 pt-5">
            <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-accent/15 text-accent">
              <Building2 className="h-6 w-6" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Organizations</p>
              <p className="text-2xl font-semibold">
                {orgCount ?? <Skeleton className="h-7 w-10" />}
              </p>
            </div>
          </CardContent>
        </Card>
      </>
    );
  }

  const chartData = stats
    ? [
        { name: "Students", value: stats.students },
        { name: "Teachers", value: stats.teachers },
        { name: "Classes", value: stats.classes },
        { name: "Enrollments", value: stats.enrollments },
        { name: "Assignments", value: stats.assignments },
        { name: "Quizzes", value: stats.quizzes },
      ]
    : [];

  return (
    <>
      <PageHeader
        title={`Welcome back, ${user?.full_name?.split(" ")[0] ?? ""}`}
        subtitle={`${user?.organization_name} — academic overview`}
      />

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {META.map((m) => (
          <Card key={m.key}>
            <CardContent className="flex items-center gap-4 pt-5">
              <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-accent/15 text-accent">
                <m.icon className="h-5 w-5" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">{m.label}</p>
                <p className="text-2xl font-semibold">
                  {stats ? (stats as any)[m.key] : <Skeleton className="h-7 w-8" />}
                </p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card className="mt-6">
        <CardContent className="pt-6">
          <p className="mb-4 text-sm font-medium">Academic activity</p>
          <div className="h-72">
            {stats ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                  <XAxis dataKey="name" stroke="hsl(var(--muted-foreground))" fontSize={12} tickLine={false} axisLine={false} />
                  <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} tickLine={false} axisLine={false} allowDecimals={false} />
                  <Tooltip
                    contentStyle={{
                      background: "hsl(var(--card))",
                      border: "1px solid hsl(var(--border))",
                      borderRadius: 8,
                      fontSize: 12,
                    }}
                  />
                  <Bar dataKey="value" fill="hsl(var(--accent))" radius={[6, 6, 0, 0]} maxBarSize={56} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <Skeleton className="h-full w-full" />
            )}
          </div>
        </CardContent>
      </Card>
    </>
  );
}
