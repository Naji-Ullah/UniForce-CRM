"use client";

import { useEffect, useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Input, Label, Badge } from "@/components/ui/primitives";
import { DataTable } from "@/components/data-table";
import { PageHeader, SlideOver } from "@/components/page";

interface Teacher {
  id: number;
  full_name: string;
  email: string;
  employee_code: string;
  is_active: boolean;
}

const BLANK = {
  full_name: "",
  email: "",
  password: "",
  employee_code: "",
};

export default function TeachersPage() {
  const { user } = useAuth();
  // Only the org's own Manager creates teachers — platform admins observe.
  const canEdit = user?.role === "MANAGER";
  // Platform admins (HEAD_ADMIN) can also remove records from any tenant.
  const canDelete = user?.role === "MANAGER" || user?.role === "HEAD_ADMIN";
  const [rows, setRows] = useState<Teacher[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(BLANK);
  const [error, setError] = useState("");
  const [deletingId, setDeletingId] = useState<number | null>(null);

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

  async function remove(t: Teacher) {
    if (!confirm(`Delete teacher "${t.full_name}" (${t.employee_code})? This also removes their login. This cannot be undone.`)) return;
    setDeletingId(t.id);
    try {
      await api.del(`/teachers/${t.id}`);
      setRows((rs) => rs.filter((r) => r.id !== t.id));
    } catch (err: any) {
      alert(err?.message || "Failed to delete teacher");
    } finally {
      setDeletingId(null);
    }
  }

  async function create(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    try {
      await api.post("/teachers", form);
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
          <Button onClick={() => setOpen(true)} disabled={!canEdit}
            title={canEdit ? "" : "Only managers can add teachers"}>
            <Plus className="h-4 w-4" /> Add teacher
          </Button>
        }
      />
      <DataTable<Teacher>
        loading={loading}
        rows={rows}
        searchKeys={["full_name", "email", "employee_code"]}
        columns={[
          { key: "full_name", header: "Name", render: (r) => <span className="font-medium">{r.full_name}</span> },
          { key: "email", header: "Email" },
          { key: "employee_code", header: "Employee #" },
          {
            key: "is_active",
            header: "Status",
            render: (r) => (
              <Badge tone={r.is_active ? "green" : "red"}>
                {r.is_active ? "Active" : "Disabled"}
              </Badge>
            ),
          },
          ...(canDelete
            ? [
                {
                  key: "actions",
                  header: "",
                  className: "w-12 text-right",
                  render: (r: Teacher) => (
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => remove(r)}
                      disabled={deletingId === r.id}
                      title="Delete teacher"
                      aria-label={`Delete ${r.full_name}`}
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  ),
                },
              ]
            : []),
        ]}
      />
      <SlideOver open={open} onClose={() => setOpen(false)} title="Add teacher">
        <form onSubmit={create} className="space-y-4">
          <div className="space-y-1.5">
            <Label>Full name</Label>
            <Input required value={form.full_name}
              onChange={(e) => setForm({ ...form, full_name: e.target.value })} />
          </div>
          <div className="space-y-1.5">
            <Label>Email</Label>
            <Input type="email" required value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })} />
          </div>
          <div className="space-y-1.5">
            <Label>Temp password</Label>
            <Input type="password" required minLength={8} value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })} />
          </div>
          <div className="space-y-1.5">
            <Label>Employee code</Label>
            <Input required value={form.employee_code}
              onChange={(e) => setForm({ ...form, employee_code: e.target.value })} />
          </div>
          {error && <p className="text-xs text-destructive">{error}</p>}
          <Button type="submit" className="w-full">Create teacher</Button>
        </form>
      </SlideOver>
    </>
  );
}
