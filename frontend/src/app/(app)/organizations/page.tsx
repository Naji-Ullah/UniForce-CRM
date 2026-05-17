"use client";

import { useEffect, useState } from "react";
import { Plus } from "lucide-react";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input, Label, Badge } from "@/components/ui/primitives";
import { DataTable } from "@/components/data-table";
import { PageHeader, SlideOver } from "@/components/page";
import { formatDate } from "@/lib/utils";

interface Org {
  id: number;
  name: string;
  slug: string;
  domain: string | null;
  plan: string;
  is_active: boolean;
  created_at: string;
}

export default function OrganizationsPage() {
  const [rows, setRows] = useState<Org[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({
    name: "",
    slug: "",
    domain: "",
    manager_name: "",
    manager_email: "",
    manager_password: "",
  });
  const [error, setError] = useState("");

  async function load() {
    setLoading(true);
    try {
      setRows(await api.get<Org[]>("/organizations"));
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
      await api.post("/organizations", {
        name: form.name,
        slug: form.slug,
        domain: form.domain || null,
        manager_name: form.manager_name || null,
        manager_email: form.manager_email || null,
        manager_password: form.manager_password || null,
      });
      setOpen(false);
      setForm({ name: "", slug: "", domain: "", manager_name: "", manager_email: "", manager_password: "" });
      load();
    } catch (err: any) {
      setError(err?.message || "Failed to create organization");
    }
  }

  return (
    <>
      <PageHeader
        title="Organizations"
        subtitle="Every university is a fully isolated tenant."
        action={
          <Button onClick={() => setOpen(true)}>
            <Plus className="h-4 w-4" /> New organization
          </Button>
        }
      />

      <DataTable<Org>
        loading={loading}
        rows={rows}
        searchKeys={["name", "slug", "domain"]}
        columns={[
          { key: "name", header: "Name", render: (r) => <span className="font-medium">{r.name}</span> },
          { key: "slug", header: "Slug" },
          { key: "domain", header: "Domain" },
          { key: "plan", header: "Plan", render: (r) => <Badge tone="blue">{r.plan}</Badge> },
          {
            key: "is_active",
            header: "Status",
            render: (r) => (
              <Badge tone={r.is_active ? "green" : "red"}>
                {r.is_active ? "Active" : "Disabled"}
              </Badge>
            ),
          },
          { key: "created_at", header: "Created", render: (r) => formatDate(r.created_at) },
        ]}
      />

      <SlideOver open={open} onClose={() => setOpen(false)} title="Create organization">
        <form onSubmit={create} className="space-y-4">
          {[
            { k: "name", label: "University name", ph: "Northfield University" },
            { k: "slug", label: "Slug", ph: "northfield" },
            { k: "domain", label: "Domain (optional)", ph: "northfield.edu" },
          ].map((f) => (
            <div key={f.k} className="space-y-1.5">
              <Label>{f.label}</Label>
              <Input
                required={f.k !== "domain"}
                placeholder={f.ph}
                value={(form as any)[f.k]}
                onChange={(e) => setForm({ ...form, [f.k]: e.target.value })}
              />
            </div>
          ))}
          <div className="rounded-md border border-border p-3">
            <p className="mb-3 text-xs text-muted-foreground">
              Optionally provision the first Manager (created atomically with the org).
            </p>
            {[
              { k: "manager_name", label: "Manager name" },
              { k: "manager_email", label: "Manager email" },
              { k: "manager_password", label: "Manager password" },
            ].map((f) => (
              <div key={f.k} className="mb-3 space-y-1.5">
                <Label>{f.label}</Label>
                <Input
                  type={f.k.includes("password") ? "password" : "text"}
                  value={(form as any)[f.k]}
                  onChange={(e) => setForm({ ...form, [f.k]: e.target.value })}
                />
              </div>
            ))}
          </div>
          {error && <p className="text-xs text-destructive">{error}</p>}
          <Button type="submit" className="w-full">
            Create organization
          </Button>
        </form>
      </SlideOver>
    </>
  );
}
