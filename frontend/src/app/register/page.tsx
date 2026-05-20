"use client";

import { useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Card, Input, Label } from "@/components/ui/primitives";

function toSlug(value: string) {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)+/g, "")
    .slice(0, 64);
}

export default function RegisterOrganizationPage() {
  const { login } = useAuth();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [slugTouched, setSlugTouched] = useState(false);
  const [form, setForm] = useState({
    name: "",
    slug: "",
    domain: "",
    manager_name: "",
    manager_email: "",
    manager_password: "",
  });

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setBusy(true);
    let created = false;
    try {
      await api.post("/organizations/public", {
        name: form.name,
        slug: form.slug,
        domain: form.domain || null,
        manager_name: form.manager_name,
        manager_email: form.manager_email,
        manager_password: form.manager_password,
      });
      created = true;
      await login(form.manager_email, form.manager_password);
    } catch (err: any) {
      if (created) {
        setError("Organization created, but sign-in failed. Please log in.");
      } else {
        setError(err?.message || "Failed to create organization");
      }
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="w-full max-w-lg"
      >
        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 flex h-11 w-11 items-center justify-center rounded-xl bg-primary text-lg font-bold text-primary-foreground">
            S
          </div>
          <h1 className="text-xl font-semibold tracking-tight">
            Create your organization
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Provision your tenant and first manager account.
          </p>
        </div>

        <Card className="p-6">
          <form onSubmit={submit} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="org-name">Organization name</Label>
              <Input
                id="org-name"
                required
                value={form.name}
                onChange={(e) => {
                  const name = e.target.value;
                  setForm((prev) => ({
                    ...prev,
                    name,
                    slug: slugTouched ? prev.slug : toSlug(name),
                  }));
                }}
                placeholder="Northfield University"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="org-slug">Slug</Label>
              <Input
                id="org-slug"
                required
                value={form.slug}
                onChange={(e) => {
                  setSlugTouched(true);
                  setForm((prev) => ({ ...prev, slug: e.target.value }));
                }}
                placeholder="northfield"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="org-domain">Domain (optional)</Label>
              <Input
                id="org-domain"
                value={form.domain}
                onChange={(e) => setForm((prev) => ({ ...prev, domain: e.target.value }))}
                placeholder="northfield.edu"
              />
            </div>

            <div className="rounded-md border border-border p-4">
              <p className="mb-3 text-xs text-muted-foreground">
                Manager account (used to sign in after setup).
              </p>
              <div className="space-y-3">
                <div className="space-y-1.5">
                  <Label htmlFor="manager-name">Manager name</Label>
                  <Input
                    id="manager-name"
                    required
                    value={form.manager_name}
                    onChange={(e) =>
                      setForm((prev) => ({ ...prev, manager_name: e.target.value }))
                    }
                    placeholder="Alex Morgan"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="manager-email">Manager email</Label>
                  <Input
                    id="manager-email"
                    type="email"
                    required
                    value={form.manager_email}
                    onChange={(e) =>
                      setForm((prev) => ({ ...prev, manager_email: e.target.value }))
                    }
                    placeholder="admin@northfield.edu"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="manager-password">Manager password</Label>
                  <Input
                    id="manager-password"
                    type="password"
                    required
                    minLength={8}
                    value={form.manager_password}
                    onChange={(e) =>
                      setForm((prev) => ({ ...prev, manager_password: e.target.value }))
                    }
                    placeholder="Minimum 8 characters"
                  />
                </div>
              </div>
            </div>

            {error && (
              <p className="rounded-md bg-destructive/10 px-3 py-2 text-xs text-destructive">
                {error}
              </p>
            )}

            <Button type="submit" className="w-full" disabled={busy}>
              {busy ? "Creating organization..." : "Create organization"}
            </Button>
          </form>
        </Card>

        <p className="mt-6 text-center text-xs text-muted-foreground">
          Already have an account?{" "}
          <Link href="/login" className="text-foreground underline">
            Sign in
          </Link>
        </p>
      </motion.div>
    </div>
  );
}
