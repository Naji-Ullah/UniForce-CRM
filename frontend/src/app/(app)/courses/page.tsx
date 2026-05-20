"use client";

import { useEffect, useState } from "react";
import { Plus } from "lucide-react";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/primitives";
import { DataTable } from "@/components/data-table";
import { PageHeader, SlideOver } from "@/components/page";

interface Course {
  id: number;
  code: string;
  title: string;
  description: string | null;
  credit_hours: number;
}

const BLANK = { code: "", title: "", description: "", credit_hours: 3 };

export default function CoursesPage() {
  const { user } = useAuth();
  const canEdit = user?.role === "MANAGER" || user?.role === "HEAD_ADMIN";
  const [rows, setRows] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(BLANK);
  const [error, setError] = useState("");

  async function load() {
    setLoading(true);
    try {
      setRows(await api.get<Course[]>("/courses"));
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => {
    load();
  }, []);

  async function create(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    try {
      await api.post("/courses", {
        ...form,
        credit_hours: Number(form.credit_hours),
        description: form.description || null,
      });
      setOpen(false);
      setForm(BLANK);
      load();
    } catch (err: any) {
      setError(err?.message || "Failed");
    }
  }

  return (
    <>
      <PageHeader
        title="Courses"
        subtitle="Catalogue courses. Offerings live under Classes."
        action={
          <Button onClick={() => setOpen(true)} disabled={!canEdit}
            title={canEdit ? "" : "Only managers can add courses"}>
            <Plus className="h-4 w-4" /> Add course
          </Button>
        }
      />
      <DataTable<Course>
        loading={loading}
        rows={rows}
        searchKeys={["code", "title"]}
        columns={[
          { key: "code", header: "Code", render: (r) => <span className="font-medium">{r.code}</span> },
          { key: "title", header: "Title" },
          { key: "credit_hours", header: "Credits" },
          { key: "description", header: "Description", render: (r) => r.description ?? "—" },
        ]}
      />
      <SlideOver open={open} onClose={() => setOpen(false)} title="Add course">
        <form onSubmit={create} className="space-y-4">
          <div className="space-y-1.5">
            <Label>Course code</Label>
            <Input required value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value })} placeholder="CS-101" />
          </div>
          <div className="space-y-1.5">
            <Label>Title</Label>
            <Input required value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
          </div>
          <div className="space-y-1.5">
            <Label>Credit hours</Label>
            <Input type="number" min={1} max={12} value={form.credit_hours} onChange={(e) => setForm({ ...form, credit_hours: Number(e.target.value) })} />
          </div>
          <div className="space-y-1.5">
            <Label>Description</Label>
            <Input value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
          </div>
          {error && <p className="text-xs text-destructive">{error}</p>}
          <Button type="submit" className="w-full">Create course</Button>
        </form>
      </SlideOver>
    </>
  );
}
