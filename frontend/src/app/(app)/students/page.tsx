"use client";

import { useEffect, useState } from "react";
import { Plus } from "lucide-react";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input, Label, Badge } from "@/components/ui/primitives";
import { DataTable } from "@/components/data-table";
import { PageHeader, SlideOver } from "@/components/page";
import { formatDate } from "@/lib/utils";

interface Student {
  id: number;
  enrollment_number: string;
  full_name: string;
  email: string;
  phone: string | null;
  status: string;
  admission_date: string | null;
}

const BLANK = {
  enrollment_number: "",
  full_name: "",
  email: "",
  phone: "",
  admission_date: "",
};

export default function StudentsPage() {
  const [rows, setRows] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(BLANK);
  const [error, setError] = useState("");

  async function load() {
    setLoading(true);
    try {
      setRows(await api.get<Student[]>("/students"));
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
      await api.post("/students", {
        ...form,
        phone: form.phone || null,
        admission_date: form.admission_date || null,
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
        title="Students"
        subtitle="Learner records scoped to your organization."
        action={
          <Button onClick={() => setOpen(true)}>
            <Plus className="h-4 w-4" /> Add student
          </Button>
        }
      />
      <DataTable<Student>
        loading={loading}
        rows={rows}
        searchKeys={["full_name", "email", "enrollment_number"]}
        columns={[
          { key: "enrollment_number", header: "Enrollment #" },
          { key: "full_name", header: "Name", render: (r) => <span className="font-medium">{r.full_name}</span> },
          { key: "email", header: "Email" },
          { key: "phone", header: "Phone" },
          {
            key: "status",
            header: "Status",
            render: (r) => (
              <Badge tone={r.status === "ACTIVE" ? "green" : "amber"}>{r.status}</Badge>
            ),
          },
          { key: "admission_date", header: "Admitted", render: (r) => formatDate(r.admission_date) },
        ]}
      />
      <SlideOver open={open} onClose={() => setOpen(false)} title="Add student">
        <form onSubmit={create} className="space-y-4">
          {[
            { k: "enrollment_number", label: "Enrollment number", t: "text", req: true },
            { k: "full_name", label: "Full name", t: "text", req: true },
            { k: "email", label: "Email", t: "email", req: true },
            { k: "phone", label: "Phone", t: "text", req: false },
            { k: "admission_date", label: "Admission date", t: "date", req: false },
          ].map((f) => (
            <div key={f.k} className="space-y-1.5">
              <Label>{f.label}</Label>
              <Input
                type={f.t}
                required={f.req}
                value={(form as any)[f.k]}
                onChange={(e) => setForm({ ...form, [f.k]: e.target.value })}
              />
            </div>
          ))}
          {error && <p className="text-xs text-destructive">{error}</p>}
          <Button type="submit" className="w-full">
            Create student
          </Button>
        </form>
      </SlideOver>
    </>
  );
}
