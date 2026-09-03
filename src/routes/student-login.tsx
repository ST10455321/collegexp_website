import { Link, createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import { Logo } from "@/components/brand/Logo";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { isValidStudentEmail, useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/student-login")({
  head: () => ({
    meta: [
      { title: "Student Login — COLLAXP" },
      {
        name: "description",
        content:
          "Sign in to COLLAXP with your ST########@rcconnect.edu.za student email to register for campus events and track your XP.",
      },
      { property: "og:title", content: "Student Login — COLLAXP" },
      {
        property: "og:description",
        content: "Sign in with your student email to register for campus events.",
      },
    ],
  }),
  component: StudentLogin,
});

function StudentLogin() {
  const navigate = useNavigate();
  const { user, role, loading } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!loading && user && role !== "organiser") {
      void navigate({ to: "/dashboard", replace: true });
    }
  }, [loading, user, role, navigate]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isValidStudentEmail(email)) {
      toast.error("Use your student email in the format ST########@rcconnect.edu.za");
      return;
    }
    setBusy(true);
    const { error } = await supabase.auth.signInWithPassword({
      email: email.trim().toUpperCase(),
      password,
    });
    setBusy(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Signed in");
    void navigate({ to: "/dashboard", replace: true });
  };

  const reset = async () => {
    if (!isValidStudentEmail(email)) {
      toast.error("Enter your student email first");
      return;
    }
    const { error } = await supabase.auth.resetPasswordForEmail(email.trim().toUpperCase(), {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    if (error) toast.error(error.message);
    else toast.success("Password reset email sent");
  };

  return (
    <div className="mx-auto flex w-full max-w-md flex-col items-center px-4 py-14">
      <Logo className="animate-rise h-24 w-auto" />
      <h1 className="mt-4 text-3xl">Login</h1>

      <form onSubmit={submit} className="panel mt-8 w-full space-y-5 p-6">
        <div className="space-y-2">
          <Label htmlFor="email">Student email</Label>
          <Input
            id="email"
            type="email"
            autoComplete="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="ST10455321@rcconnect.edu.za"
            className="bg-surface-2"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="password">Password</Label>
          <Input
            id="password"
            type="password"
            autoComplete="current-password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="bg-surface-2"
          />
        </div>

        <button
          type="button"
          onClick={() => void reset()}
          className="font-display text-[11px] uppercase tracking-widest text-muted-foreground transition-colors hover:text-primary"
        >
          Forgot password
        </button>

        <Button type="submit" className="w-full" size="lg" disabled={busy}>
          {busy ? "Signing in…" : "Login"}
        </Button>

        <p className="text-center text-xs text-muted-foreground">
          New here?{" "}
          <Link to="/student-signup" className="text-primary hover:underline">
            Sign up
          </Link>
          {" · "}
          <Link to="/organiser-login" className="text-primary hover:underline">
            Organiser login
          </Link>
        </p>
      </form>
    </div>
  );
}
