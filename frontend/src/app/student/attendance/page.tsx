"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { Badge } from "@/components/ui/primitives";
import { DataTable } from "@/components/data-table";
import { PageHeader } from "@/components/page";

interface ClassAtt {
  class_id: number;
  course_code: string;
  course_title: string;
  section: string;
  term: string;
  total_sessions: number;
  present: number;
  absent: number;
  late: number;
  excused: number;
  attendance_percentage: number;
}

interface Resp {
  per_class: ClassAtt[];
  overall_percentage: number;
  total_sessions: number;
  attended: number;
}

export default function StudentAttendancePage() {
  const [data, setData] = useState<Resp | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api
      .get<Resp>("/students/me/attendance")
      .then(setData)
      .finally(() => setLoading(false));
  }, []);

  const overall = data?.overall_percentage ?? 0;
  const tone = (p: number) => (p >= 75 ? "green" : p >= 50 ? "amber" : "red");

  return (
    <>
      <PageHeader
        title="My attendance"
        subtitle="Per-class breakdown of your attendance record."
        action={
          <Badge tone={tone(overall)}>
            Overall: {overall}% ({data?.attended ?? 0}/{data?.total_sessions ?? 0})
          </Badge>
        }
      />
      <DataTable<ClassAtt>
        loading={loading}
        rows={data?.per_class ?? []}
        searchKeys={["course_code", "course_title"]}
        empty="No attendance recorded yet."
        columns={[
          {
            key: "course_code",
            header: "Class",
            render: (r) => (
              <div>
                <p className="font-medium">{r.course_code}</p>
                <p className="text-xs text-muted-foreground">
                  {r.course_title} · {r.section} · {r.term}
                </p>
              </div>
            ),
          },
          { key: "total_sessions", header: "Sessions" },
          { key: "present", header: "Present" },
          { key: "absent", header: "Absent" },
          { key: "late", header: "Late" },
          {
            key: "attendance_percentage",
            header: "Attendance",
            render: (r) => (
              <Badge tone={tone(r.attendance_percentage)}>
                {r.attendance_percentage}%
              </Badge>
            ),
          },
        ]}
      />
    </>
  );
}
