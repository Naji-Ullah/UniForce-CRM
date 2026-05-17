"use client";

import { useEffect, useState } from "react";
import { Plus } from "lucide-react";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input, Label, Badge } from "@/components/ui/primitives";
import { DataTable } from "@/components/data-table";
import { PageHeader, SlideOver } from "@/components/page";

interface Teacher {
  id: number;
  full_name: string;
  email: string;
  employee_code: string;
  department: string | null;
  is_active: boolean;
}

const BLANK = {
  full_name: "",
  email: "",
  password: "",
  employee_code: "",
  department: "",
};

export default function TeachersPage() {
  const [rows, setRows] = useState<Teacher[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(BLANK);
  const [error, setError] = useState("");

  async function load() {
    setLoading(true);
    try {
      setRows(await api.get<Teacher[]>("/teachers"));
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
      await api.post("/teachers", { ...form, department: form.department || null });
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
        title="Teachers"
        subtitle="Faculty accounts in your organization."
        action={
          <Button onClick={() => setOpen(true)}>
            <Plus className="h-4 w-4" /> Add teacher
          </Button>
        }
      />
      <DataTable<Teacher>
        loading={loading}
        rows={rows}
        searchKeys={["full_name", "email", "employee_code", "department"]}
        columns={[
          { key: "full_name", header: "Name", render: (r) => <span className="font-medium">{r.full_name}</span> },
          { key: "email", header: "Email" },
          { key: "employee_code", header: "Employee #" },
          { key: "department", header: "Department" },
          {
            key: "is_active",
            header: "Status",
            render: (r) => (
              <Badge tone={r.is_active ? "green" : "red"}>
                {r.is_active ? "Active" : "Disabled"}
              </Badge>
            ),
          },
        ]}
      />
      <SlideOver open={open} onClose={() => setOpen(false)} title="Add teacher">
        <form onSubmit={create} className="space-y-4">
          {[
            { k: "full_name", label: "Full name", t: "text" },
            { k: "email", label: "Email", t: "email" },
            { k: "password", label: "Temp password", t: "password" },
            { k: "employee_code", label: "Employee code", t: "text" },
            { k: "department", label: "Department", t: "text" },
          ].map((f) => (
            <div key={f.k} className="space-y-1.5">
              <Label>{f.label}</Label>
              <Input
                type={f.t}
                required={f.k !== "department"}
                value={(form as any)[f.k]}
                onChange={(e) => setForm({ ...form, [f.k]: e.target.value })}
              />
            </div>
          ))}
          {error && <p className="text-xs text-destructive">{error}</p>}
          <Button type="submit" className="w-full">
            Create teacher
          </Button>
        </form>
      </SlideOver>
    </>
  );
}
