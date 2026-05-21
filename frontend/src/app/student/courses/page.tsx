"use client";

import { useEffect, useMemo, useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Badge, Card, CardContent } from "@/components/ui/primitives";
import { DataTable } from "@/components/data-table";
import { PageHeader } from "@/components/page";

interface AvailableClass {
  class_id: number;
  course_code: string;
  course_title: string;
  credit_hours: number;
  section: string;
  term: string;
  room: string | null;
  schedule: string | null;
  teacher_name: string;
  capacity: number;
  enrolled_count: number;
}

interface EnrolledClass {
  class_id: number;
  course_code: string;
  course_title: string;
  section: string;
  term: string;
  room: string | null;
  schedule: string | null;
  teacher_name: string;
  status: string;
  final_grade: string | null;
}

interface RegSummary {
  credit_hours_used: number;
  credit_hours_max: number;
  credit_hours_remaining: number;
}

export default function StudentCoursesPage() {
  const [available, setAvailable] = useState<AvailableClass[]>([]);
  const [enrolled, setEnrolled] = useState<EnrolledClass[]>([]);
  const [summary, setSummary] = useState<RegSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<number | null>(null);
  const [error, setError] = useState("");

  async function load() {
    setLoading(true);
    setError("");
    // Load each independently — a single failed call shouldn't blank the
    // whole page. Surface any errors so the user knows the backend is down
    // or the new routes aren't live yet.
    const results = await Promise.allSettled([
      api.get<AvailableClass[]>("/students/me/available-classes"),
      api.get<EnrolledClass[]>("/students/me/classes"),
      api.get<RegSummary>("/students/me/registration"),
    ]);
    const [a, e, s] = results;
    if (a.status === "fulfilled") setAvailable(a.value);
    if (e.status === "fulfilled") setEnrolled(e.value);
    if (s.status === "fulfilled") setSummary(s.value);
    const failures = results
      .filter((r) => r.status === "rejected")
      .map((r) => (r as PromiseRejectedResult).reason?.message)
      .filter(Boolean);
    if (failures.length) setError(failures.join(" · "));
    setLoading(false);
  }
  useEffect(() => {
    load();
  }, []);

  const max = summary?.credit_hours_max ?? 21;
  const used = summary?.credit_hours_used ?? 0;
  // Compute `remaining` ourselves so a missing summary doesn't disable every
  // Register button (server also returns `credit_hours_remaining`, but we
  // shouldn't trust a field that may not exist on older builds).
  const remaining = Math.max(max - used, 0);
  const usedTone = useMemo<"green" | "amber" | "red">(() => {
    const pct = used / max;
    return pct >= 1 ? "red" : pct >= 0.75 ? "amber" : "green";
  }, [used, max]);

  async function register(c: AvailableClass) {
    setError("");
    setBusyId(c.class_id);
    try {
      await api.post(`/students/me/register/${c.class_id}`);
      await load();
    } catch (err: any) {
      setError(err?.message || "Failed to register");
    } finally {
      setBusyId(null);
    }
  }

  async function drop(c: EnrolledClass) {
    if (!confirm(`Drop ${c.course_code} (${c.section}, ${c.term})?`)) return;
    setError("");
    setBusyId(c.class_id);
    try {
      await api.del(`/students/me/register/${c.class_id}`);
      await load();
    } catch (err: any) {
      setError(err?.message || "Failed to drop");
    } finally {
      setBusyId(null);
    }
  }

  return (
    <>
      <PageHeader
        title="Course registration"
        subtitle="Enroll yourself in classes. The 21 credit-hour cap is enforced per semester."
      />

      <div className="grid gap-4 sm:grid-cols-3">
        <Card>
          <CardContent className="space-y-1 pt-6">
            <p className="text-xs text-muted-foreground">Credit hours used</p>
            <p className="text-2xl font-semibold">
              {used}
              <span className="text-base font-normal text-muted-foreground">
                {" / "}
                {max}
              </span>
            </p>
            <Badge tone={usedTone}>{remaining} remaining</Badge>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="space-y-1 pt-6">
            <p className="text-xs text-muted-foreground">Registered classes</p>
            <p className="text-2xl font-semibold">{enrolled.length}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="space-y-1 pt-6">
            <p className="text-xs text-muted-foreground">Available to add</p>
            <p className="text-2xl font-semibold">{available.length}</p>
          </CardContent>
        </Card>
      </div>

      {error && (
        <p className="mt-4 rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {error}
        </p>
      )}

      <h3 className="mt-8 mb-3 text-sm font-semibold">My registered classes</h3>
      <DataTable<EnrolledClass>
        loading={loading}
        rows={enrolled}
        empty="You haven't registered for any classes yet."
        columns={[
          { key: "course_code", header: "Code",
            render: (r) => <span className="font-medium">{r.course_code}</span> },
          { key: "course_title", header: "Title" },
          { key: "section", header: "Section" },
          { key: "term", header: "Term" },
          { key: "teacher_name", header: "Teacher" },
          { key: "schedule", header: "Schedule", render: (r) => r.schedule ?? "—" },
          {
            key: "status",
            header: "Status",
            render: (r) => (
              <Badge tone={r.status === "ENROLLED" ? "green" : "amber"}>
                {r.status}
              </Badge>
            ),
          },
        ]}
      />

      <h3 className="mt-8 mb-3 text-sm font-semibold">Available classes</h3>
      <DataTable<AvailableClass>
        loading={loading}
        rows={available}
        searchKeys={["course_code", "course_title", "teacher_name", "term"]}
        empty="No classes are open for registration in your organization."
        columns={[
          { key: "course_code", header: "Code",
            render: (r) => <span className="font-medium">{r.course_code}</span> },
          { key: "course_title", header: "Title" },
          {
            key: "credit_hours",
            header: "Credits",
            render: (r) => (
              <Badge tone={r.credit_hours > remaining ? "red" : "blue"}>
                {r.credit_hours}
              </Badge>
            ),
          },
          { key: "section", header: "Section" },
          { key: "term", header: "Term" },
          { key: "teacher_name", header: "Teacher" },
          {
            key: "seats",
            header: "Seats",
            render: (r) => `${r.enrolled_count}/${r.capacity}`,
          },
          {
            key: "actions",
            header: "Action",
            className: "w-28 text-right",
            render: (r) => {
              const wouldExceed = r.credit_hours > remaining;
              const full = r.enrolled_count >= r.capacity;
              return (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => register(r)}
                  disabled={busyId === r.class_id || wouldExceed || full}
                  title={
                    wouldExceed
                      ? `Adds ${r.credit_hours} cr; only ${remaining} left`
                      : full
                      ? "Class is full"
                      : "Register"
                  }
                >
                  <Plus className="h-4 w-4" /> Register
                </Button>
              );
            },
          },
        ]}
      />
    </>
  );
}
