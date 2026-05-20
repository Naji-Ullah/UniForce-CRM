"use client";

import { useEffect, useMemo, useState } from "react";
import { Plus, ClipboardList, Save } from "lucide-react";
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
interface Quiz {
  id: number;
  class_id: number;
  title: string;
  topic: string | null;
  total_marks: number;
  quiz_date: string | null;
}
interface Enrollment {
  id: number;
  student_id: number;
  student_name: string;
  enrollment_number: string;
}
interface QuizMark {
  student_id: number;
  marks_obtained: number;
  remarks: string | null;
}

export default function QuizzesPage() {
  const [classes, setClasses] = useState<Klass[]>([]);
  const [classId, setClassId] = useState<string>("");
  const [quizzes, setQuizzes] = useState<Quiz[]>([]);
  const [loading, setLoading] = useState(false);

  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState({ title: "", topic: "", total_marks: "20", quiz_date: "" });
  const [formError, setFormError] = useState("");

  const [grading, setGrading] = useState<Quiz | null>(null);
  const [roster, setRoster] = useState<Enrollment[]>([]);
  const [marks, setMarks] = useState<Record<number, string>>({});
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
      .get<Quiz[]>("/quizzes")
      .then((qs) => setQuizzes(qs.filter((q) => String(q.class_id) === classId)))
      .finally(() => setLoading(false));
  }, [classId]);

  async function createQuiz(e: React.FormEvent) {
    e.preventDefault();
    setFormError("");
    try {
      await api.post("/quizzes", {
        class_id: Number(classId),
        title: form.title,
        topic: form.topic || null,
        total_marks: Number(form.total_marks),
        quiz_date: form.quiz_date || null,
      });
      setCreating(false);
      setForm({ title: "", topic: "", total_marks: "20", quiz_date: "" });
      const qs = await api.get<Quiz[]>("/quizzes");
      setQuizzes(qs.filter((q) => String(q.class_id) === classId));
    } catch (err: any) {
      setFormError(err?.message || "Failed to create quiz");
    }
  }

  async function openGrading(q: Quiz) {
    setGrading(q);
    setGradeError("");
    setMarks({});
    const [enrolls, existing] = await Promise.all([
      api.get<Enrollment[]>(`/enrollments?class_id=${q.class_id}`),
      api.get<QuizMark[]>(`/quizzes/${q.id}/marks`),
    ]);
    setRoster(enrolls);
    const seed: Record<number, string> = {};
    existing.forEach((m) => {
      seed[m.student_id] = String(m.marks_obtained);
    });
    setMarks(seed);
  }

  async function saveMarks() {
    if (!grading) return;
    setGradeBusy(true);
    setGradeError("");
    try {
      const entries = roster
        .filter((r) => marks[r.student_id] !== undefined && marks[r.student_id] !== "")
        .map((r) => ({
          student_id: r.student_id,
          marks_obtained: Number(marks[r.student_id]),
        }));
      await api.post("/quizzes/marks", { quiz_id: grading.id, entries });
      setGrading(null);
    } catch (err: any) {
      setGradeError(err?.message || "Failed to save");
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
        title="Quizzes"
        subtitle="Create quizzes and record marks per student."
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
              <Plus className="h-4 w-4" /> New quiz
            </Button>
          </div>
        }
      />

      {loading ? (
        <p className="text-sm text-muted-foreground">Loading…</p>
      ) : quizzes.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-sm text-muted-foreground">
            No quizzes yet for {classLabel}.
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {quizzes.map((q) => (
            <Card key={q.id}>
              <CardContent className="space-y-3 pt-6">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-accent/15 text-accent">
                  <ClipboardList className="h-5 w-5" />
                </div>
                <div>
                  <p className="font-medium">{q.title}</p>
                  <p className="text-xs text-muted-foreground">
                    {q.topic ?? "—"} · {q.quiz_date ?? "no date"}
                  </p>
                </div>
                <Badge tone="blue">Total: {q.total_marks}</Badge>
                <Button variant="outline" className="w-full" onClick={() => openGrading(q)}>
                  Enter / edit marks
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <SlideOver open={creating} onClose={() => setCreating(false)} title="New quiz">
        <form onSubmit={createQuiz} className="space-y-4">
          <div className="space-y-1.5">
            <Label>Title</Label>
            <Input required value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })} />
          </div>
          <div className="space-y-1.5">
            <Label>Topic</Label>
            <Input value={form.topic}
              onChange={(e) => setForm({ ...form, topic: e.target.value })} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Total marks</Label>
              <Input type="number" min={1} required value={form.total_marks}
                onChange={(e) => setForm({ ...form, total_marks: e.target.value })} />
            </div>
            <div className="space-y-1.5">
              <Label>Quiz date</Label>
              <Input type="date" value={form.quiz_date}
                onChange={(e) => setForm({ ...form, quiz_date: e.target.value })} />
            </div>
          </div>
          {formError && <p className="text-xs text-destructive">{formError}</p>}
          <Button type="submit" className="w-full">Create quiz</Button>
        </form>
      </SlideOver>

      <SlideOver
        open={!!grading}
        onClose={() => setGrading(null)}
        title={grading ? `Marks · ${grading.title}` : "Marks"}
      >
        {grading && (
          <div className="space-y-3">
            <p className="text-xs text-muted-foreground">
              Total: {grading.total_marks} · Enter each student&apos;s marks below. Leave blank to skip.
            </p>
            <div className="max-h-[60vh] space-y-2 overflow-auto pr-1">
              {roster.map((r) => (
                <div key={r.student_id} className="flex items-center gap-2">
                  <div className="flex-1">
                    <p className="text-sm font-medium">{r.student_name}</p>
                    <p className="text-xs text-muted-foreground">{r.enrollment_number}</p>
                  </div>
                  <Input
                    type="number"
                    min={0}
                    max={grading.total_marks}
                    step={0.5}
                    className="w-24"
                    value={marks[r.student_id] ?? ""}
                    onChange={(e) =>
                      setMarks({ ...marks, [r.student_id]: e.target.value })
                    }
                  />
                </div>
              ))}
              {roster.length === 0 && (
                <p className="text-sm text-muted-foreground">No students enrolled in this class.</p>
              )}
            </div>
            {gradeError && <p className="text-xs text-destructive">{gradeError}</p>}
            <Button className="w-full" onClick={saveMarks} disabled={gradeBusy}>
              <Save className="h-4 w-4" /> {gradeBusy ? "Saving…" : "Save marks"}
            </Button>
          </div>
        )}
      </SlideOver>
    </>
  );
}
