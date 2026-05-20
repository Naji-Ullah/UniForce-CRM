"use client";

import { useEffect, useMemo, useState } from "react";
import { Plus, FileText, Save } from "lucide-react";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Badge, Card, CardContent, Input, Label } from "@/components/ui/primitives";
import { PageHeader, SlideOver } from "@/components/page";

interface Klass {
  id: number;
  course_code: string | null;
  section: string;
  term: string;
}
interface Assignment {
  id: number;
  class_id: number;
  title: string;
  description: string | null;
  max_marks: number;
  due_date: string | null;
}
interface Enrollment {
  id: number;
  student_id: number;
  student_name: string;
  enrollment_number: string;
}
interface Submission {
  id: number;
  assignment_id: number;
  student_id: number;
  student_name: string;
  status: string;
  marks_obtained: number | null;
  feedback: string | null;
}

export default function AssignmentsPage() {
  const [classes, setClasses] = useState<Klass[]>([]);
  const [classId, setClassId] = useState<string>("");
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [loading, setLoading] = useState(false);

  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState({ title: "", description: "", max_marks: "100", due_date: "" });
  const [formError, setFormError] = useState("");

  const [grading, setGrading] = useState<Assignment | null>(null);
  const [roster, setRoster] = useState<Enrollment[]>([]);
  const [subs, setSubs] = useState<Submission[]>([]);
  const [marks, setMarks] = useState<Record<number, string>>({});
  const [feedback, setFeedback] = useState<Record<number, string>>({});
  const [gradeBusy, setGradeBusy] = useState(false);
  const [gradeError, setGradeError] = useState("");

  useEffect(() => {
    api.get<Klass[]>("/classes").then((c) => {
      setClasses(c);
      if (c[0]) setClassId(String(c[0].id));
    });
  }, []);

  useEffect(() => {
    if (!classId) return;
    setLoading(true);
    api
      .get<Assignment[]>("/assignments")
      .then((all) => setAssignments(all.filter((a) => String(a.class_id) === classId)))
      .finally(() => setLoading(false));
  }, [classId]);

  async function createAssignment(e: React.FormEvent) {
    e.preventDefault();
    setFormError("");
    try {
      await api.post("/assignments", {
        class_id: Number(classId),
        title: form.title,
        description: form.description || null,
        max_marks: Number(form.max_marks),
        due_date: form.due_date ? new Date(form.due_date).toISOString() : null,
      });
      setCreating(false);
      setForm({ title: "", description: "", max_marks: "100", due_date: "" });
      const all = await api.get<Assignment[]>("/assignments");
      setAssignments(all.filter((a) => String(a.class_id) === classId));
    } catch (err: any) {
      setFormError(err?.message || "Failed");
    }
  }

  async function openGrading(a: Assignment) {
    setGrading(a);
    setGradeError("");
    setMarks({});
    setFeedback({});
    const [enrolls, existingSubs] = await Promise.all([
      api.get<Enrollment[]>(`/enrollments?class_id=${a.class_id}`),
      api.get<Submission[]>(`/assignments/${a.id}/submissions`),
    ]);
    setRoster(enrolls);
    setSubs(existingSubs);
    const m: Record<number, string> = {};
    const f: Record<number, string> = {};
    existingSubs.forEach((s) => {
      if (s.marks_obtained != null) m[s.student_id] = String(s.marks_obtained);
      if (s.feedback) f[s.student_id] = s.feedback;
    });
    setMarks(m);
    setFeedback(f);
  }

  async function saveOne(studentId: number) {
    if (!grading) return;
    const mark = marks[studentId];
    if (mark === undefined || mark === "") return;
    setGradeBusy(true);
    setGradeError("");
    try {
      let sub = subs.find((s) => s.student_id === studentId);
      if (!sub) {
        sub = await api.post<Submission>("/assignments/submissions", {
          assignment_id: grading.id,
          student_id: studentId,
          content: "(graded directly by teacher)",
        });
        setSubs((prev) => [...prev, sub!]);
      }
      if (sub.marks_obtained == null) {
        await api.post("/assignments/marks", {
          submission_id: sub.id,
          marks_obtained: Number(mark),
          feedback: feedback[studentId] || null,
        });
      }
    } catch (err: any) {
      setGradeError(err?.message || `Failed for student ${studentId}`);
    } finally {
      setGradeBusy(false);
    }
  }

  async function saveAll() {
    if (!grading) return;
    setGradeBusy(true);
    setGradeError("");
    try {
      for (const r of roster) {
        if (marks[r.student_id] !== undefined && marks[r.student_id] !== "") {
          await saveOne(r.student_id);
        }
      }
      setGrading(null);
    } finally {
      setGradeBusy(false);
    }
  }

  const classLabel = useMemo(() => {
    const k = classes.find((c) => String(c.id) === classId);
    return k ? `${k.course_code} · ${k.section} · ${k.term}` : "";
  }, [classes, classId]);

  return (
    <>
      <PageHeader
        title="Assignments"
        subtitle="Create assignments and grade student submissions."
        action={
          <div className="flex gap-2">
            <select
              className="h-9 rounded-md border border-input bg-transparent px-3 text-sm"
              value={classId}
              onChange={(e) => setClassId(e.target.value)}
            >
              {classes.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.course_code} · {c.section} · {c.term}
                </option>
              ))}
            </select>
            <Button onClick={() => setCreating(true)} disabled={!classId}>
              <Plus className="h-4 w-4" /> New assignment
            </Button>
          </div>
        }
      />

      {loading ? (
        <p className="text-sm text-muted-foreground">Loading…</p>
      ) : assignments.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-sm text-muted-foreground">
            No assignments yet for {classLabel}.
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {assignments.map((a) => (
            <Card key={a.id}>
              <CardContent className="space-y-3 pt-6">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-accent/15 text-accent">
                  <FileText className="h-5 w-5" />
                </div>
                <div>
                  <p className="font-medium">{a.title}</p>
                  <p className="text-xs text-muted-foreground">
                    Due: {a.due_date ? new Date(a.due_date).toLocaleDateString() : "—"}
                  </p>
                </div>
                <Badge tone="blue">Max: {a.max_marks}</Badge>
                <Button variant="outline" className="w-full" onClick={() => openGrading(a)}>
                  Grade submissions
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <SlideOver open={creating} onClose={() => setCreating(false)} title="New assignment">
        <form onSubmit={createAssignment} className="space-y-4">
          <div className="space-y-1.5">
            <Label>Title</Label>
            <Input required value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })} />
          </div>
          <div className="space-y-1.5">
            <Label>Description</Label>
            <Input value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Max marks</Label>
              <Input type="number" min={1} required value={form.max_marks}
                onChange={(e) => setForm({ ...form, max_marks: e.target.value })} />
            </div>
            <div className="space-y-1.5">
              <Label>Due date</Label>
              <Input type="date" value={form.due_date}
                onChange={(e) => setForm({ ...form, due_date: e.target.value })} />
            </div>
          </div>
          {formError && <p className="text-xs text-destructive">{formError}</p>}
          <Button type="submit" className="w-full">Create assignment</Button>
        </form>
      </SlideOver>

      <SlideOver
        open={!!grading}
        onClose={() => setGrading(null)}
        title={grading ? `Grade · ${grading.title}` : "Grade"}
      >
        {grading && (
          <div className="space-y-3">
            <p className="text-xs text-muted-foreground">
              Max: {grading.max_marks}. Already-graded entries are locked.
            </p>
            <div className="max-h-[60vh] space-y-3 overflow-auto pr-1">
              {roster.map((r) => {
                const sub = subs.find((s) => s.student_id === r.student_id);
                const graded = sub && sub.marks_obtained != null;
                return (
                  <div key={r.student_id} className="rounded-md border border-border p-3">
                    <div className="flex items-center justify-between gap-2">
                      <div>
                        <p className="text-sm font-medium">{r.student_name}</p>
                        <p className="text-xs text-muted-foreground">{r.enrollment_number}</p>
                      </div>
                      {graded ? (
                        <Badge tone="green">
                          {sub?.marks_obtained}/{grading.max_marks}
                        </Badge>
                      ) : (
                        <Badge tone="amber">Pending</Badge>
                      )}
                    </div>
                    {!graded && (
                      <div className="mt-2 grid grid-cols-2 gap-2">
                        <Input
                          placeholder="Marks"
                          type="number"
                          min={0}
                          max={grading.max_marks}
                          value={marks[r.student_id] ?? ""}
                          onChange={(e) =>
                            setMarks({ ...marks, [r.student_id]: e.target.value })
                          }
                        />
                        <Input
                          placeholder="Feedback (optional)"
                          value={feedback[r.student_id] ?? ""}
                          onChange={(e) =>
                            setFeedback({ ...feedback, [r.student_id]: e.target.value })
                          }
                        />
                      </div>
                    )}
                  </div>
                );
              })}
              {roster.length === 0 && (
                <p className="text-sm text-muted-foreground">No students enrolled.</p>
              )}
            </div>
            {gradeError && <p className="text-xs text-destructive">{gradeError}</p>}
            <Button className="w-full" onClick={saveAll} disabled={gradeBusy}>
              <Save className="h-4 w-4" /> {gradeBusy ? "Saving…" : "Save all marks"}
            </Button>
          </div>
        )}
      </SlideOver>
    </>
  );
}
