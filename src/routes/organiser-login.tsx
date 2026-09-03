import { Link, createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";

import { Logo } from "@/components/brand/Logo";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { INSTITUTIONS } from "@/lib/collaxp";

export const Route = createFileRoute("/organiser-login")({
  head: () => ({
    meta: [
      { title: "Organiser Access — COLLAXP" },
      {
        name: "description",
        content:
          "Separate organiser sign in and registration for institutions and venues to publish and manage campus events on COLLAXP.",
      },
      { property: "og:title", content: "Organiser Access — COLLAXP" },
      {
        property: "og:description",
        content: "Sign in as an organiser to create and manage campus events.",
      },
    ],
  }),
  component: OrganiserAuth,
});

function OrganiserAuth() {
  const navigate = useNavigate();
  const [mode, setMode] = useState<"login" | "register">("login");
  const [form, setForm] = useState({
    email: "",
    password: "",
    orgName: "",
    institution: INSTITUTIONS[0]!,
  });
  const [busy, setBusy] = useState(false);

  const set = (k: keyof typeof form, v: string) => setForm((p) => ({ ...p, [k]: v }));

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);

    if (mode === "login") {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: form.email.trim(),
        password: form.password,
      });
      if (error) {
        setBusy(false);
        toast.error(error.message);
        return;
      }
      const { data: roles } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", data.user.id);
      setBusy(false);
      if (!(roles ?? []).some((r) => r.role === "organiser")) {
        await supabase.auth.signOut();
        toast.error("This account is not an organiser account");
        return;
      }
      toast.success("Signed in as organiser");
      void navigate({ to: "/organiser", replace: true });
      return;
    }

    if (form.password.length < 8) {
      setBusy(false);
      toast.error("Password must be at least 8 characters");
      return;
    }

    const { data, error } = await supabase.auth.signUp({
      email: form.email.trim(),
      password: form.password,
      options: {
        emailRedirectTo: window.location.origin,
        data: {
          role: "organiser",
          full_name: form.orgName.trim(),
          username: form.orgName.trim(),
          institution: form.institution,
        },
      },
    });
    setBusy(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    if (!data.session) {
      toast.success("Organiser account created", {
        description: "Confirm your email, then sign in.",
      });
      setMode("login");
      return;
    }
    toast.success("Organiser account ready");
    void navigate({ to: "/organiser", replace: true });
  };

  return (
    <div className="mx-auto flex w-full max-w-md flex-col items-center px-4 py-14">
      <Logo className="animate-rise h-24 w-auto" />
      <h1 className="mt-4 text-center text-3xl">Organiser</h1>
      <p className="mt-1 text-center text-xs text-muted-foreground">
        Separate access for institutions, societies and venues
      </p>

      <div className="mt-6 flex w-full rounded-full border border-border bg-surface p-1">
        {(["login", "register"] as const).map((m) => (
          <button
            key={m}
            onClick={() => setMode(m)}
            className={`flex-1 rounded-full py-2 font-display text-[11px] uppercase tracking-widest transition-all duration-300 ${
              mode === m
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            {m === "login" ? "Login" : "Register"}
          </button>
        ))}
      </div>

      <form onSubmit={submit} className="panel mt-6 w-full space-y-5 p-6">
        {mode === "register" && (
          <>
            <div className="space-y-2">
              <Label htmlFor="orgName">Organisation name</Label>
              <Input
                id="orgName"
                required
                value={form.orgName}
                onChange={(e) => set("orgName", e.target.value)}
                placeholder="Rosebank College Events"
                className="bg-surface-2"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="institution">Institution / venue</Label>
              <Select value={form.institution} onValueChange={(v) => set("institution", v)}>
                <SelectTrigger id="institution" className="bg-surface-2">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {INSTITUTIONS.map((i) => (
                    <SelectItem key={i} value={i}>
                      {i}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </>
        )}

        <div className="space-y-2">
          <Label htmlFor="orgEmail">Work email</Label>
          <Input
            id="orgEmail"
            type="email"
            required
            value={form.email}
            onChange={(e) => set("email", e.target.value)}
            placeholder="events@institution.ac.za"
            className="bg-surface-2"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="orgPassword">Password</Label>
          <Input
            id="orgPassword"
            type="password"
            required
            autoComplete={mode === "login" ? "current-password" : "new-password"}
            value={form.password}
            onChange={(e) => set("password", e.target.value)}
            className="bg-surface-2"
          />
        </div>

        <Button type="submit" size="lg" className="w-full" disabled={busy}>
          {busy
            ? "Please wait…"
            : mode === "login"
              ? "Login as organiser"
              : "Create organiser account"}
        </Button>

        <p className="text-center text-xs text-muted-foreground">
          Student instead?{" "}
          <Link to="/student-login" className="text-primary hover:underline">
            Student login
          </Link>
        </p>
      </form>
    </div>
  );
}
