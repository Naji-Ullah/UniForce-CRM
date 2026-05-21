"use client";

import { useEffect, useState } from "react";
import { Plus, Users, Trash2 } from "lucide-react";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth";
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

interface Student {
  id: number;
  enrollment_number: string;
  full_name: string;
}

interface Enrollment {
  id: number;
  student_id: number;
  student_name: string | null;
  enrollment_number: string | null;
  status: string;
}

export default function ClassesPage() {
  const { user } = useAuth();
  const canEdit = user?.role === "MANAGER" || user?.role === "HEAD_ADMIN";
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

  // Roster management state
  const [rosterClass, setRosterClass] = useState<Klass | null>(null);
  const [students, setStudents] = useState<Student[]>([]);
  const [enrollments, setEnrollments] = useState<Enrollment[]>([]);
  const [rosterLoading, setRosterLoading] = useState(false);
  const [rosterPick, setRosterPick] = useState("");
  const [rosterError, setRosterError] = useState("");
  const [rosterBusy, setRosterBusy] = useState(false);

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

  async function openRoster(k: Klass) {
    setRosterClass(k);
    setRosterError("");
    setRosterPick("");
    setRosterLoading(true);
    try {
      const [en, st] = await Promise.all([
        api.get<Enrollment[]>(`/enrollments?class_id=${k.id}`),
        api.get<Student[]>("/students"),
      ]);
      setEnrollments(en);
      setStudents(st);
    } finally {
      setRosterLoading(false);
    }
  }

  async function addEnrollment(e: React.FormEvent) {
    e.preventDefault();
    if (!rosterClass || !rosterPick) return;
    setRosterError("");
    setRosterBusy(true);
    try {
      const created = await api.post<Enrollment>("/enrollments", {
        student_id: Number(rosterPick),
        class_id: rosterClass.id,
      });
      // Backend may omit student_name on create payload — fill it from the picker so the
      // newly-added row renders right away without another roundtrip.
      const stu = students.find((s) => s.id === Number(rosterPick));
      setEnrollments((es) => [
        ...es,
        {
          ...created,
          student_name: created.student_name ?? stu?.full_name ?? null,
          enrollment_number: created.enrollment_number ?? stu?.enrollment_number ?? null,
        },
      ]);
      setRosterPick("");
      setRows((rs) =>
        rs.map((r) =>
          r.id === rosterClass.id ? { ...r, enrolled_count: r.enrolled_count + 1 } : r
        )
      );
    } catch (err: any) {
      setRosterError(err?.message || "Failed to enroll");
    } finally {
      setRosterBusy(false);
    }
  }

  async function removeEnrollment(en: Enrollment) {
    if (!rosterClass) return;
    if (!confirm(`Remove ${en.student_name ?? "this student"} from the class?`)) return;
    setRosterError("");
    try {
      await api.del(`/enrollments/${en.id}`);
      setEnrollments((es) => es.filter((x) => x.id !== en.id));
      setRows((rs) =>
        rs.map((r) =>
          r.id === rosterClass.id
            ? { ...r, enrolled_count: Math.max(0, r.enrolled_count - 1) }
            : r
        )
      );
    } catch (err: any) {
      setRosterError(err?.message || "Failed to remove");
    }
  }

  const enrolledIds = new Set(enrollments.map((e) => e.student_id));
  const availableStudents = students.filter((s) => !enrolledIds.has(s.id));

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
        subtitle="Assign a course to a teacher for a term. One class = one course × one teacher × one section."
        action={
          <Button onClick={() => setOpen(true)} disabled={!canEdit}
            title={canEdit ? "" : "Only managers can add classes"}>
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
          ...(canEdit
            ? [
                {
                  key: "roster",
                  header: "",
                  className: "w-32 text-right",
                  render: (r: Klass) => (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => openRoster(r)}
                      title="Add or remove enrolled students"
                    >
                      <Users className="h-4 w-4" /> Roster
                    </Button>
                  ),
                },
              ]
            : []),
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

      <SlideOver
        open={!!rosterClass}
        onClose={() => setRosterClass(null)}
        title={
          rosterClass
            ? `Roster · ${rosterClass.course_code} · ${rosterClass.section}`
            : "Roster"
        }
      >
        {rosterClass && (
          <div className="space-y-4">
            <p className="text-xs text-muted-foreground">
              {enrollments.length}/{rosterClass.capacity} enrolled · {rosterClass.term}
            </p>

            <form onSubmit={addEnrollment} className="space-y-2">
              <Label>Add student</Label>
              <div className="flex gap-2">
                <select
                  required
                  className="flex h-9 flex-1 rounded-md border border-input bg-transparent px-3 text-sm"
                  value={rosterPick}
                  onChange={(e) => setRosterPick(e.target.value)}
                  disabled={
                    rosterLoading || availableStudents.length === 0 ||
                    enrollments.length >= rosterClass.capacity
                  }
                >
                  <option value="">
                    {students.length === 0
                      ? "— no students in this organization —"
                      : availableStudents.length === 0
                      ? "— all students already enrolled —"
                      : "Select a student…"}
                  </option>
                  {availableStudents.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.enrollment_number} · {s.full_name}
                    </option>
                  ))}
                </select>
                <Button
                  type="submit"
                  disabled={!rosterPick || rosterBusy ||
                    enrollments.length >= rosterClass.capacity}
                >
                  <Plus className="h-4 w-4" /> Enroll
                </Button>
              </div>
              {enrollments.length >= rosterClass.capacity && (
                <p className="text-xs text-amber-600">
                  Class is at capacity. Increase capacity or remove a student first.
                </p>
              )}
            </form>

            {rosterError && <p className="text-xs text-destructive">{rosterError}</p>}

            <div>
              <p className="mb-2 text-sm font-medium">Enrolled students</p>
              {rosterLoading ? (
                <p className="text-sm text-muted-foreground">Loading…</p>
              ) : enrollments.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  No students enrolled yet.
                </p>
              ) : (
                <ul className="max-h-[55vh] space-y-2 overflow-auto pr-1">
                  {enrollments.map((en) => (
                    <li
                      key={en.id}
                      className="flex items-center justify-between rounded-md border border-border px-3 py-2"
                    >
                      <div>
                        <p className="text-sm font-medium">
                          {en.student_name ?? `Student #${en.student_id}`}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {en.enrollment_number ?? "—"} · {en.status}
                        </p>
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => removeEnrollment(en)}
                        title="Remove from class"
                        aria-label={`Remove ${en.student_name ?? "student"}`}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        )}
      </SlideOver>
    </>
  );
}
