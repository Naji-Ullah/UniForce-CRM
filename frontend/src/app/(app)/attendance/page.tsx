"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Save, CheckCircle2, XCircle, Clock, ShieldCheck, ChevronDown, ChevronRight } from "lucide-react";
import { api } from "@/lib/api";
import { Badge, Card, CardContent, Input, Label } from "@/components/ui/primitives";
import { Button } from "@/components/ui/button";
import { DataTable } from "@/components/data-table";
import { PageHeader } from "@/components/page";
import { Calendar } from "@/components/calendar";
import { cn } from "@/lib/utils";

type Status = "PRESENT" | "ABSENT" | "LATE" | "EXCUSED";

interface Klass {
  id: number;
  course_code: string | null;
  course_title: string | null;
  section: string;
  term: string;
}
interface MarkedDate {
  session_date: string;
  total: number;
  present: number;
  absent: number;
  late: number;
  excused: number;
}
interface RosterEntry {
  student_id: number;
  student_name: string;
  enrollment_number: string;
  status: Status | null;
  remarks: string | null;
}
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

const STATUSES: { value: Status; label: string; icon: any; tone: "green" | "red" | "amber" | "blue" }[] = [
  { value: "PRESENT", label: "Present", icon: CheckCircle2, tone: "green" },
  { value: "ABSENT", label: "Absent", icon: XCircle, tone: "red" },
  { value: "LATE", label: "Late", icon: Clock, tone: "amber" },
  { value: "EXCUSED", label: "Excused", icon: ShieldCheck, tone: "blue" },
];

function todayISO() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export default function AttendancePage() {
  const [classes, setClasses] = useState<Klass[]>([]);
  const [classId, setClassId] = useState<string>("");

  const [marked, setMarked] = useState<MarkedDate[]>([]);
  const [selectedDate, setSelectedDate] = useState<string>(todayISO());
  const [roster, setRoster] = useState<RosterEntry[]>([]);
  const [remarks, setRemarks] = useState<Record<number, string>>({});
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [savedAt, setSavedAt] = useState<string>("");

  const [summary, setSummary] = useState<Summary[]>([]);
  const [summaryLoading, setSummaryLoading] = useState(false);
  const [showSummary, setShowSummary] = useState(false);

  useEffect(() => {
    api.get<Klass[]>("/classes").then((cs) => {
      const sorted = [...cs].sort((a, b) =>
        (a.course_code || "").localeCompare(b.course_code || "")
      );
      setClasses(sorted);
      if (sorted[0]) setClassId(String(sorted[0].id));
    });
  }, []);

  const loadDates = useCallback(async () => {
    if (!classId) return;
    const d = await api.get<MarkedDate[]>(`/attendance/dates?class_id=${classId}`);
    setMarked(d);
  }, [classId]);

  const loadSession = useCallback(async () => {
    if (!classId || !selectedDate) return;
    setError("");
    const r = await api.get<RosterEntry[]>(
      `/attendance/session?class_id=${classId}&session_date=${selectedDate}`
    );
    setRoster(r);
    setRemarks(
      Object.fromEntries(r.filter((x) => x.remarks).map((x) => [x.student_id, x.remarks || ""]))
    );
  }, [classId, selectedDate]);

  const loadSummary = useCallback(async () => {
    if (!classId) return;
    setSummaryLoading(true);
    try {
      const s = await api.get<Summary[]>(`/attendance/summary?class_id=${classId}`);
      setSummary(s);
    } finally {
      setSummaryLoading(false);
    }
  }, [classId]);

  useEffect(() => {
    if (!classId) return;
    loadDates();
    loadSession();
  }, [classId, loadDates, loadSession]);

  // Only fetch the aggregate summary when the user actually opens it.
  useEffect(() => {
    if (showSummary) loadSummary();
  }, [showSummary, classId, loadSummary]);

  useEffect(() => {
    loadSession();
  }, [selectedDate, loadSession]);

  function setStatus(studentId: number, status: Status) {
    setRoster((prev) =>
      prev.map((r) => (r.student_id === studentId ? { ...r, status } : r))
    );
  }

  function bulkMark(status: Status) {
    setRoster((prev) => prev.map((r) => ({ ...r, status })));
  }

  async function submit() {
    if (!classId || !selectedDate) return;
    const entries = roster
      .filter((r) => r.status)
      .map((r) => ({
        student_id: r.student_id,
        status: r.status as Status,
        remarks: remarks[r.student_id] || null,
      }));
    if (entries.length === 0) {
      setError("Mark at least one student before submitting.");
      return;
    }
    setBusy(true);
    setError("");
    try {
      await api.post("/attendance/mark", {
        class_id: Number(classId),
        session_date: selectedDate,
        entries,
      });
      setSavedAt(new Date().toLocaleTimeString());
      // Refresh calendar markers; refresh summary only if it's currently shown.
      loadDates();
      if (showSummary) loadSummary();
    } catch (err: any) {
      setError(err?.message || "Failed to save");
    } finally {
      setBusy(false);
    }
  }

  const markedISO = useMemo(() => marked.map((m) => m.session_date), [marked]);
  const selectedMeta = marked.find((m) => m.session_date === selectedDate);
  const markedCount = roster.filter((r) => r.status).length;
  const classLabel = useMemo(() => {
    const k = classes.find((c) => String(c.id) === classId);
    return k ? `${k.course_code} — ${k.course_title}` : "";
  }, [classes, classId]);

  return (
    <>
      <PageHeader
        title="Attendance"
        subtitle="Pick a date on the calendar to mark or update attendance."
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

      <div className="grid gap-6 lg:grid-cols-[320px_1fr]">
        <div className="space-y-4">
          <Calendar
            value={selectedDate}
            onChange={setSelectedDate}
            markedDates={markedISO}
          />
          <Card>
            <CardContent className="space-y-2 pt-5 text-xs">
              <div className="flex items-center gap-2">
                <span className="h-1.5 w-1.5 rounded-full bg-accent" />
                <span className="text-muted-foreground">Day with marked attendance</span>
              </div>
              <p className="text-muted-foreground">
                {marked.length} sessions recorded for this class.
              </p>
              {selectedMeta && (
                <div className="mt-2 space-y-1">
                  <p className="font-medium text-foreground">{selectedDate}</p>
                  <div className="flex flex-wrap gap-1.5">
                    <Badge tone="green">{selectedMeta.present} present</Badge>
                    <Badge tone="red">{selectedMeta.absent} absent</Badge>
                    <Badge tone="amber">{selectedMeta.late} late</Badge>
                    <Badge tone="blue">{selectedMeta.excused} excused</Badge>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        <div className="space-y-4">
          <Card>
            <CardContent className="pt-5">
              <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-medium">
                    {classLabel} · {selectedDate}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {markedCount} of {roster.length} marked
                    {savedAt && <span> · saved at {savedAt}</span>}
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  {STATUSES.map((s) => (
                    <Button
                      key={s.value}
                      size="sm"
                      variant="outline"
                      onClick={() => bulkMark(s.value)}
                    >
                      All {s.label.toLowerCase()}
                    </Button>
                  ))}
                </div>
              </div>

              {roster.length === 0 ? (
                <p className="py-12 text-center text-sm text-muted-foreground">
                  No students enrolled in this class.
                </p>
              ) : (
                <div className="divide-y divide-border">
                  {roster.map((r) => (
                    <div
                      key={r.student_id}
                      className="grid gap-3 py-3 md:grid-cols-[1fr_auto_220px] md:items-center"
                    >
                      <div>
                        <p className="text-sm font-medium">{r.student_name}</p>
                        <p className="text-xs text-muted-foreground">
                          {r.enrollment_number}
                        </p>
                      </div>
                      <div className="flex flex-wrap gap-1">
                        {STATUSES.map((s) => {
                          const active = r.status === s.value;
                          return (
                            <button
                              key={s.value}
                              type="button"
                              onClick={() => setStatus(r.student_id, s.value)}
                              className={cn(
                                "inline-flex items-center gap-1 rounded-md border px-2 py-1 text-xs transition-colors",
                                active
                                  ? "border-transparent bg-primary text-primary-foreground"
                                  : "border-border bg-transparent text-muted-foreground hover:bg-muted"
                              )}
                              aria-pressed={active}
                            >
                              <s.icon className="h-3 w-3" />
                              {s.label}
                            </button>
                          );
                        })}
                      </div>
                      <Input
                        placeholder="Remark (optional)"
                        value={remarks[r.student_id] ?? ""}
                        onChange={(e) =>
                          setRemarks({ ...remarks, [r.student_id]: e.target.value })
                        }
                      />
                    </div>
                  ))}
                </div>
              )}

              {error && <p className="mt-3 text-xs text-destructive">{error}</p>}

              <div className="mt-4 flex justify-end gap-2">
                <Button variant="ghost" onClick={loadSession}>
                  Reload
                </Button>
                <Button onClick={submit} disabled={busy || roster.length === 0}>
                  <Save className="h-4 w-4" />
                  {busy ? "Saving…" : "Submit attendance"}
                </Button>
              </div>
            </CardContent>
          </Card>

          <div>
            <button
              type="button"
              onClick={() => setShowSummary((s) => !s)}
              className="mb-2 inline-flex items-center gap-2 text-sm font-semibold text-foreground hover:text-primary"
            >
              {showSummary ? (
                <ChevronDown className="h-4 w-4" />
              ) : (
                <ChevronRight className="h-4 w-4" />
              )}
              {showSummary ? "Hide" : "Show"} class summary
              <span className="text-xs font-normal text-muted-foreground">
                (aggregated across all marked sessions)
              </span>
            </button>
            {showSummary && (
              <DataTable<Summary>
                loading={summaryLoading}
                rows={summary}
                searchKeys={["student_name"]}
                empty="No attendance recorded for this class yet."
                columns={[
                  {
                    key: "student_name",
                    header: "Student",
                    render: (r) => <span className="font-medium">{r.student_name}</span>,
                  },
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
            )}
          </div>
        </div>
      </div>
    </>
  );
}
