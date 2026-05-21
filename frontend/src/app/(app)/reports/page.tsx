"use client";

import { useEffect, useMemo, useState } from "react";
import {
  CalendarCheck,
  FileText,
  ClipboardList,
  Download,
  GraduationCap,
} from "lucide-react";
import { api } from "@/lib/api";
import { Card, CardContent, Input, Label, Badge } from "@/components/ui/primitives";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/page";

interface Klass {
  id: number;
  course_code: string | null;
  course_title: string | null;
  section: string;
  term: string;
  teacher_name: string | null;
}
interface Quiz {
  id: number;
  class_id: number;
  title: string;
  quiz_date: string | null;
}
interface Assignment {
  id: number;
  class_id: number;
  title: string;
  due_date: string | null;
}

type Comparator = "all" | "above" | "below";

const ALL = "ALL";

export default function ReportsPage() {
  const [classes, setClasses] = useState<Klass[]>([]);
  const [quizzes, setQuizzes] = useState<Quiz[]>([]);
  const [assignments, setAssignments] = useState<Assignment[]>([]);

  const [classId, setClassId] = useState<string>("");
  const [quizId, setQuizId] = useState<string>(ALL);
  const [assignmentId, setAssignmentId] = useState<string>(ALL);

  const [comparator, setComparator] = useState<Comparator>("all");
  const [threshold, setThreshold] = useState<string>("80");

  const [busy, setBusy] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      api.get<Klass[]>("/classes"),
      api.get<Quiz[]>("/quizzes"),
      api.get<Assignment[]>("/assignments"),
    ])
      .then(([cs, qs, as_]) => {
        setClasses(cs);
        setQuizzes(qs);
        setAssignments(as_);
      })
      .finally(() => setLoading(false));
  }, []);

  const visibleClasses = useMemo(
    () =>
      [...classes].sort((a, b) =>
        (a.course_code || "").localeCompare(b.course_code || "")
      ),
    [classes]
  );

  // Keep the selected class valid as filters change.
  useEffect(() => {
    if (loading) return;
    if (visibleClasses.length === 0) {
      setClassId("");
      return;
    }
    if (!visibleClasses.some((c) => String(c.id) === classId)) {
      setClassId(String(visibleClasses[0].id));
    }
  }, [visibleClasses, classId, loading]);

  // Reset sub-selectors when class changes.
  useEffect(() => {
    setQuizId(ALL);
    setAssignmentId(ALL);
  }, [classId]);

  const classQuizzes = useMemo(
    () => quizzes.filter((q) => String(q.class_id) === classId),
    [quizzes, classId]
  );
  const classAssignments = useMemo(
    () => assignments.filter((a) => String(a.class_id) === classId),
    [assignments, classId]
  );

  function filterQs(extra: Record<string, string | undefined> = {}) {
    const qs = new URLSearchParams();
    if (comparator !== "all" && threshold) {
      qs.set("comparator", comparator);
      qs.set("threshold", threshold);
    }
    for (const [k, v] of Object.entries(extra)) {
      if (v && v !== ALL) qs.set(k, v);
    }
    return qs.toString() ? `?${qs.toString()}` : "";
  }

  async function download(type: string, extra: Record<string, string | undefined> = {}) {
    if (!classId) return;
    const key = `${type}:${JSON.stringify(extra)}`;
    setBusy(key);
    try {
      const url = `/reports/${type}/${classId}${filterQs(extra)}`;
      const blob = await api.get<Blob>(url);
      const objectUrl = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = objectUrl;
      const tag = [
        comparator !== "all" ? `${comparator}_${threshold}` : "",
        extra.quiz_id ? `quiz${extra.quiz_id}` : "",
        extra.assignment_id ? `asg${extra.assignment_id}` : "",
      ].filter(Boolean).join("_");
      a.download = `${type}_class_${classId}${tag ? `_${tag}` : ""}.pdf`;
      a.click();
      URL.revokeObjectURL(objectUrl);
    } finally {
      setBusy("");
    }
  }

  const selectedClass = classes.find((c) => String(c.id) === classId);

  return (
    <>
      <PageHeader
        title="Reports"
        subtitle="Backend-generated, branded PDF documents."
      />

      <Card className="mb-6">
        <CardContent className="pt-6">
          <div className="space-y-1.5">
            <Label>Class</Label>
            <select
              className="h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm"
              value={classId}
              onChange={(e) => setClassId(e.target.value)}
              disabled={visibleClasses.length === 0}
            >
              {visibleClasses.length === 0 ? (
                <option>— no classes yet —</option>
              ) : (
                visibleClasses.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.course_code} — {c.course_title} · {c.section} · {c.term}
                  </option>
                ))
              )}
            </select>
            {selectedClass && (
              <p className="text-xs text-muted-foreground">
                Teacher: {selectedClass.teacher_name ?? "—"}
              </p>
            )}
          </div>
        </CardContent>
      </Card>

      <Card className="mb-6">
        <CardContent className="space-y-4 pt-6">
          <div>
            <p className="text-sm font-medium">Filter</p>
            <p className="text-xs text-muted-foreground">
              Optional cutoff applied to the relevant metric (attendance % or marks %).
              Use &quot;All students&quot; to include everyone.
            </p>
          </div>
          <div className="grid gap-3 sm:grid-cols-3">
            <div className="space-y-1.5">
              <Label>Comparator</Label>
              <select
                className="h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm"
                value={comparator}
                onChange={(e) => setComparator(e.target.value as Comparator)}
              >
                <option value="all">All students</option>
                <option value="above">At or above threshold</option>
                <option value="below">Below threshold (needs improvement)</option>
              </select>
            </div>
            <div className="space-y-1.5">
              <Label>Threshold (%)</Label>
              <Input
                type="number"
                min={0}
                max={100}
                value={threshold}
                disabled={comparator === "all"}
                onChange={(e) => setThreshold(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Quick presets</Label>
              <div className="flex flex-wrap gap-2">
                <Button type="button" size="sm" variant="outline"
                  onClick={() => { setComparator("above"); setThreshold("90"); }}>
                  Top (≥90)
                </Button>
                <Button type="button" size="sm" variant="outline"
                  onClick={() => { setComparator("below"); setThreshold("80"); }}>
                  &lt;80
                </Button>
                <Button type="button" size="sm" variant="ghost"
                  onClick={() => setComparator("all")}>
                  Reset
                </Button>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-4 lg:grid-cols-2">
        {/* Attendance — always available */}
        <Card>
          <CardContent className="space-y-3 pt-6">
            <Header icon={CalendarCheck} title="Attendance Report"
              desc="Per-student attendance percentages. Filter applies to attendance %." />
            <Button variant="outline" className="w-full"
              disabled={!classId || busy.startsWith("attendance:")}
              onClick={() => download("attendance")}>
              <Download className="h-4 w-4" />
              {busy.startsWith("attendance:") ? "Generating…" : "Download attendance PDF"}
            </Button>
          </CardContent>
        </Card>

        {/* Class Summary — always available */}
        <Card>
          <CardContent className="space-y-3 pt-6">
            <Header icon={FileText} title="Class Summary"
              desc="Roster + attendance overview. Filter applies to attendance %." />
            <Button variant="outline" className="w-full"
              disabled={!classId || busy.startsWith("class-summary:")}
              onClick={() => download("class-summary")}>
              <Download className="h-4 w-4" />
              {busy.startsWith("class-summary:") ? "Generating…" : "Download summary PDF"}
            </Button>
          </CardContent>
        </Card>

        {/* Quiz — show only if there are quizzes */}
        <Card className={classQuizzes.length === 0 ? "opacity-60" : ""}>
          <CardContent className="space-y-3 pt-6">
            <Header icon={ClipboardList} title="Quiz Marks Report"
              desc="One quiz or every quiz in the class. Filter applies to score %." />
            <div className="space-y-1.5">
              <Label>Quiz</Label>
              <select
                className="h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm"
                value={quizId}
                onChange={(e) => setQuizId(e.target.value)}
                disabled={classQuizzes.length === 0}
              >
                <option value={ALL}>All quizzes ({classQuizzes.length})</option>
                {classQuizzes.map((q) => (
                  <option key={q.id} value={q.id}>
                    {q.title}{q.quiz_date ? ` · ${q.quiz_date}` : ""}
                  </option>
                ))}
              </select>
            </div>
            {classQuizzes.length === 0 ? (
              <Badge tone="amber">No quizzes created for this class yet</Badge>
            ) : (
              <Button variant="outline" className="w-full"
                disabled={!classId || busy.startsWith("quiz:")}
                onClick={() => download("quiz", { quiz_id: quizId })}>
                <Download className="h-4 w-4" />
                {busy.startsWith("quiz:") ? "Generating…"
                  : quizId === ALL ? "Download all quizzes PDF" : "Download this quiz PDF"}
              </Button>
            )}
          </CardContent>
        </Card>

        {/* Assignment — show only if there are assignments */}
        <Card className={classAssignments.length === 0 ? "opacity-60" : ""}>
          <CardContent className="space-y-3 pt-6">
            <Header icon={GraduationCap} title="Assignment Report"
              desc="One assignment or every assignment in the class. Filter applies to score %." />
            <div className="space-y-1.5">
              <Label>Assignment</Label>
              <select
                className="h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm"
                value={assignmentId}
                onChange={(e) => setAssignmentId(e.target.value)}
                disabled={classAssignments.length === 0}
              >
                <option value={ALL}>All assignments ({classAssignments.length})</option>
                {classAssignments.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.title}{a.due_date ? ` · due ${new Date(a.due_date).toLocaleDateString()}` : ""}
                  </option>
                ))}
              </select>
            </div>
            {classAssignments.length === 0 ? (
              <Badge tone="amber">No assignments created for this class yet</Badge>
            ) : (
              <Button variant="outline" className="w-full"
                disabled={!classId || busy.startsWith("assignment:")}
                onClick={() => download("assignment", { assignment_id: assignmentId })}>
                <Download className="h-4 w-4" />
                {busy.startsWith("assignment:") ? "Generating…"
                  : assignmentId === ALL ? "Download all assignments PDF" : "Download this assignment PDF"}
              </Button>
            )}
          </CardContent>
        </Card>
      </div>
    </>
  );
}

function Header({
  icon: Icon, title, desc,
}: { icon: React.ElementType; title: string; desc: string }) {
  return (
    <>
      <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-accent/15 text-accent">
        <Icon className="h-5 w-5" />
      </div>
      <div>
        <p className="font-medium">{title}</p>
        <p className="text-xs text-muted-foreground">{desc}</p>
      </div>
    </>
  );
}
