"use client";

import { useEffect, useState } from "react";
import { CalendarCheck, FileText, ClipboardList, Download } from "lucide-react";
import { api } from "@/lib/api";
import { Card, CardContent } from "@/components/ui/primitives";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/page";

const REPORTS = [
  { type: "attendance", label: "Attendance Report", desc: "Per-student attendance percentages.", icon: CalendarCheck },
  { type: "quiz", label: "Quiz Marks Report", desc: "Marks for every quiz in the class.", icon: ClipboardList },
  { type: "class-summary", label: "Class Summary", desc: "Roster + attendance overview.", icon: FileText },
];

export default function ReportsPage() {
  const [classes, setClasses] = useState<any[]>([]);
  const [classId, setClassId] = useState("");
  const [busy, setBusy] = useState("");

  useEffect(() => {
    api.get<any[]>("/classes").then((c) => {
      setClasses(c);
      if (c[0]) setClassId(String(c[0].id));
    });
  }, []);

  async function download(type: string) {
    if (!classId) return;
    setBusy(type);
    try {
      const blob = await api.get<Blob>(`/reports/${type}/${classId}`);
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${type}_class_${classId}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
    } finally {
      setBusy("");
    }
  }

  return (
    <>
      <PageHeader
        title="Reports"
        subtitle="Backend-generated, branded PDF documents."
        action={
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
        }
      />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {REPORTS.map((r) => (
          <Card key={r.type}>
            <CardContent className="space-y-4 pt-6">
              <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-accent/15 text-accent">
                <r.icon className="h-5 w-5" />
              </div>
              <div>
                <p className="font-medium">{r.label}</p>
                <p className="mt-1 text-sm text-muted-foreground">{r.desc}</p>
              </div>
              <Button
                variant="outline"
                className="w-full"
                disabled={!classId || busy === r.type}
                onClick={() => download(r.type)}
              >
                <Download className="h-4 w-4" />
                {busy === r.type ? "Generating…" : "Download PDF"}
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>
    </>
  );
}
