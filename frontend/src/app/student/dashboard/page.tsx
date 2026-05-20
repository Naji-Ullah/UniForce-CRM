"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { CalendarCheck, ClipboardList, GraduationCap } from "lucide-react";
import { api } from "@/lib/api";
import { Badge, Card, CardContent } from "@/components/ui/primitives";
import { PageHeader } from "@/components/page";

interface Profile {
  full_name: string;
  enrollment_number: string;
  email: string;
  status: string;
}
interface ClassRow {
  class_id: number;
  course_code: string;
  course_title: string;
  section: string;
  term: string;
  teacher_name: string;
}
interface AttSummary {
  overall_percentage: number;
  total_sessions: number;
  attended: number;
  per_class: any[];
}

export default function StudentDashboard() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [klasses, setKlasses] = useState<ClassRow[]>([]);
  const [att, setAtt] = useState<AttSummary | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      api.get<Profile>("/students/me"),
      api.get<ClassRow[]>("/students/me/classes"),
      api.get<AttSummary>("/students/me/attendance"),
    ])
      .then(([p, c, a]) => {
        setProfile(p);
        setKlasses(c);
        setAtt(a);
      })
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <p className="text-sm text-muted-foreground">Loading…</p>;
  if (!profile) return <p className="text-sm text-destructive">Could not load profile.</p>;

  const tone = (p: number) => (p >= 75 ? "green" : p >= 50 ? "amber" : "red");

  return (
    <>
      <PageHeader
        title={`Hi, ${profile.full_name.split(" ")[0]}`}
        subtitle={`Enrollment ${profile.enrollment_number}`}
      />

      <div className="grid gap-4 sm:grid-cols-3">
        <Card>
          <CardContent className="space-y-2 pt-6">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-accent/15 text-accent">
              <CalendarCheck className="h-5 w-5" />
            </div>
            <p className="text-xs text-muted-foreground">Overall attendance</p>
            <p className="text-2xl font-semibold">
              {att?.overall_percentage ?? 0}%
            </p>
            <Badge tone={tone(att?.overall_percentage ?? 0)}>
              {att?.attended ?? 0} / {att?.total_sessions ?? 0} sessions
            </Badge>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="space-y-2 pt-6">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-accent/15 text-accent">
              <GraduationCap className="h-5 w-5" />
            </div>
            <p className="text-xs text-muted-foreground">Enrolled classes</p>
            <p className="text-2xl font-semibold">{klasses.length}</p>
            <Link className="text-xs underline text-muted-foreground" href="/student/attendance">
              View per-class breakdown →
            </Link>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="space-y-2 pt-6">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-accent/15 text-accent">
              <ClipboardList className="h-5 w-5" />
            </div>
            <p className="text-xs text-muted-foreground">Account</p>
            <p className="text-sm">{profile.email}</p>
            <Badge tone="blue">{profile.status}</Badge>
          </CardContent>
        </Card>
      </div>

      <h3 className="mt-8 mb-3 text-sm font-semibold">Your classes</h3>
      {klasses.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-sm text-muted-foreground">
            You aren&apos;t enrolled in any classes yet.
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {klasses.map((k) => (
            <Card key={k.class_id}>
              <CardContent className="space-y-1 pt-5">
                <p className="text-sm font-medium">{k.course_code} · {k.course_title}</p>
                <p className="text-xs text-muted-foreground">
                  Section {k.section} · {k.term} · {k.teacher_name}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </>
  );
}
