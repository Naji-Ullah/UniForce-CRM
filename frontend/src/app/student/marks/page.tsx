"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { Badge, Card, CardContent } from "@/components/ui/primitives";
import { PageHeader } from "@/components/page";

interface QuizMark {
  quiz_id: number;
  title: string;
  topic: string | null;
  quiz_date: string | null;
  course_code: string;
  section: string;
  term: string;
  marks_obtained: number;
  total_marks: number;
  percentage: number;
  remarks: string | null;
}
interface AssignmentMark {
  assignment_id: number;
  title: string;
  due_date: string | null;
  course_code: string;
  section: string;
  term: string;
  submission_status: string;
  marks_obtained: number | null;
  total_marks: number;
  percentage: number | null;
  feedback: string | null;
}
interface Resp {
  quizzes: QuizMark[];
  assignments: AssignmentMark[];
}

export default function StudentMarksPage() {
  const [data, setData] = useState<Resp | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api
      .get<Resp>("/students/me/marks")
      .then(setData)
      .finally(() => setLoading(false));
  }, []);

  const tone = (p: number | null) =>
    p == null ? "default" : p >= 80 ? "green" : p >= 60 ? "amber" : "red";

  if (loading) return <p className="text-sm text-muted-foreground">Loading…</p>;

  return (
    <>
      <PageHeader title="My marks" subtitle="Quiz and assignment results across your classes." />

      <h3 className="mb-3 text-sm font-semibold">Quizzes</h3>
      {data?.quizzes.length ? (
        <div className="grid gap-3 sm:grid-cols-2 mb-8">
          {data.quizzes.map((q) => (
            <Card key={q.quiz_id}>
              <CardContent className="space-y-2 pt-5">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-medium">{q.title}</p>
                    <p className="text-xs text-muted-foreground">
                      {q.course_code} · {q.section} · {q.topic ?? "—"}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {q.quiz_date ?? "no date"}
                    </p>
                  </div>
                  <Badge tone={tone(q.percentage)}>{q.percentage}%</Badge>
                </div>
                <p className="text-sm">
                  {q.marks_obtained} / {q.total_marks}
                  {q.remarks ? ` — ${q.remarks}` : ""}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <Card className="mb-8">
          <CardContent className="py-8 text-center text-sm text-muted-foreground">
            No quiz marks yet.
          </CardContent>
        </Card>
      )}

      <h3 className="mb-3 text-sm font-semibold">Assignments</h3>
      {data?.assignments.length ? (
        <div className="grid gap-3 sm:grid-cols-2">
          {data.assignments.map((a) => (
            <Card key={a.assignment_id}>
              <CardContent className="space-y-2 pt-5">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-medium">{a.title}</p>
                    <p className="text-xs text-muted-foreground">
                      {a.course_code} · {a.section}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Due {a.due_date ? new Date(a.due_date).toLocaleDateString() : "—"}
                    </p>
                  </div>
                  {a.percentage != null ? (
                    <Badge tone={tone(a.percentage)}>{a.percentage}%</Badge>
                  ) : (
                    <Badge tone="amber">{a.submission_status}</Badge>
                  )}
                </div>
                {a.marks_obtained != null && (
                  <p className="text-sm">
                    {a.marks_obtained} / {a.total_marks}
                    {a.feedback ? ` — ${a.feedback}` : ""}
                  </p>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <Card>
          <CardContent className="py-8 text-center text-sm text-muted-foreground">
            No assignment submissions yet.
          </CardContent>
        </Card>
      )}
    </>
  );
}
