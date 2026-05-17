"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { Badge } from "@/components/ui/primitives";
import { DataTable } from "@/components/data-table";
import { PageHeader } from "@/components/page";

interface Summary {
  student_id: number;
  student_name: string;
  total_sessions: number;
  present: number;
  absent: number;
  late: number;
  excused: number;
  attendance_percentage: number;
}

export default function AttendancePage() {
  const [classes, setClasses] = useState<any[]>([]);
  const [classId, setClassId] = useState<string>("");
  const [rows, setRows] = useState<Summary[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    api.get<any[]>("/classes").then((c) => {
      setClasses(c);
      if (c[0]) setClassId(String(c[0].id));
    });
  }, []);

  useEffect(() => {
    if (!classId) return;
    setLoading(true);
    api
      .get<Summary[]>(`/attendance/summary?class_id=${classId}`)
      .then(setRows)
      .finally(() => setLoading(false));
  }, [classId]);

  return (
    <>
      <PageHeader
        title="Attendance"
        subtitle="Per-student attendance percentages, aggregated in SQL."
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
      <DataTable<Summary>
        loading={loading}
        rows={rows}
        searchKeys={["student_name"]}
        empty="No attendance recorded for this class yet."
        columns={[
          { key: "student_name", header: "Student", render: (r) => <span className="font-medium">{r.student_name}</span> },
          { key: "total_sessions", header: "Sessions" },
          { key: "present", header: "Present" },
          { key: "absent", header: "Absent" },
          { key: "late", header: "Late" },
          {
            key: "attendance_percentage",
            header: "Attendance",
            render: (r) => (
              <Badge
                tone={
                  r.attendance_percentage >= 75
                    ? "green"
                    : r.attendance_percentage >= 50
                    ? "amber"
                    : "red"
                }
              >
                {r.attendance_percentage}%
              </Badge>
            ),
          },
        ]}
      />
    </>
  );
}
