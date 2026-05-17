"use client";

import { useEffect, useState } from "react";
import { Plus } from "lucide-react";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input, Label, Badge } from "@/components/ui/primitives";
import { DataTable } from "@/components/data-table";
import { PageHeader, SlideOver } from "@/components/page";

interface Klass {
  id: number;
  course_code: string | null;
  course_title: string | null;
  teacher_name: string | null;
  section: string;
  term: string;
  room: string | null;
  schedule: string | null;
  enrolled_count: number;
  capacity: number;
}

export default function ClassesPage() {
  const [rows, setRows] = useState<Klass[]>([]);
  const [courses, setCourses] = useState<any[]>([]);
  const [teachers, setTeachers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [error, setError] = useState("");
  const [form, setForm] = useState({
    course_id: "",
    teacher_id: "",
    section: "A",
    term: "Fall 2026",
    room: "",
    schedule: "",
    capacity: 40,
  });

  async function load() {
    setLoading(true);
    try {
      const [c, co, te] = await Promise.all([
        api.get<Klass[]>("/classes"),
        api.get<any[]>("/courses"),
        api.get<any[]>("/teachers"),
      ]);
      setRows(c);
      setCourses(co);
      setTeachers(te);
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => {
    load();
  }, []);

  async function create(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    try {
      await api.post("/classes", {
        course_id: Number(form.course_id),
        teacher_id: Number(form.teacher_id),
        section: form.section,
        term: form.term,
        room: form.room || null,
        schedule: form.schedule || null,
        capacity: Number(form.capacity),
      });
      setOpen(false);
      load();
    } catch (err: any) {
      setError(err?.message || "Failed");
    }
  }

  return (
    <>
      <PageHeader
        title="Classes"
        subtitle="Term offerings of a course, taught by one teacher."
        action={
          <Button onClick={() => setOpen(true)}>
            <Plus className="h-4 w-4" /> New class
          </Button>
        }
      />
      <DataTable<Klass>
        loading={loading}
        rows={rows}
        searchKeys={["course_code", "course_title", "teacher_name", "term"]}
        columns={[
          {
            key: "course_code",
            header: "Course",
            render: (r) => (
              <div>
                <p className="font-medium">{r.course_code}</p>
                <p className="text-xs text-muted-foreground">{r.course_title}</p>
              </div>
            ),
          },
          { key: "section", header: "Section" },
          { key: "term", header: "Term" },
          { key: "teacher_name", header: "Teacher" },
          { key: "schedule", header: "Schedule", render: (r) => r.schedule ?? "—" },
          {
            key: "enrolled_count",
            header: "Enrolled",
            render: (r) => (
              <Badge tone={r.enrolled_count >= r.capacity ? "red" : "blue"}>
                {r.enrolled_count}/{r.capacity}
              </Badge>
            ),
          },
        ]}
      />
      <SlideOver open={open} onClose={() => setOpen(false)} title="New class">
        <form onSubmit={create} className="space-y-4">
          <div className="space-y-1.5">
            <Label>Course</Label>
            <select
              required
              className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm"
              value={form.course_id}
              onChange={(e) => setForm({ ...form, course_id: e.target.value })}
            >
              <option value="">Select course…</option>
              {courses.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.code} — {c.title}
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-1.5">
            <Label>Teacher</Label>
            <select
              required
              className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm"
              value={form.teacher_id}
              onChange={(e) => setForm({ ...form, teacher_id: e.target.value })}
            >
              <option value="">Select teacher…</option>
              {teachers.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.full_name} ({t.employee_code})
                </option>
              ))}
            </select>
          </div>
          {[
            { k: "section", label: "Section" },
            { k: "term", label: "Term" },
            { k: "room", label: "Room" },
            { k: "schedule", label: "Schedule (e.g. Mon/Wed 10:00)" },
          ].map((f) => (
            <div key={f.k} className="space-y-1.5">
              <Label>{f.label}</Label>
              <Input
                value={(form as any)[f.k]}
                onChange={(e) => setForm({ ...form, [f.k]: e.target.value })}
              />
            </div>
          ))}
          <div className="space-y-1.5">
            <Label>Capacity</Label>
            <Input
              type="number"
              value={form.capacity}
              onChange={(e) => setForm({ ...form, capacity: Number(e.target.value) })}
            />
          </div>
          {error && <p className="text-xs text-destructive">{error}</p>}
          <Button type="submit" className="w-full">
            Create class
          </Button>
        </form>
      </SlideOver>
    </>
  );
}
