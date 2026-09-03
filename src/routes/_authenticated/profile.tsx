import { useQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import { Reveal } from "@/components/Reveal";
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
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { INSTITUTIONS, formatDate } from "@/lib/collaxp";

export const Route = createFileRoute("/_authenticated/profile")({
  head: () => ({
    meta: [
      { title: "My Profile — COLLAXP" },
      {
        name: "description",
        content:
          "Update your COLLAXP profile: username, bio, institution and avatar, tied to your verified student number.",
      },
      { property: "og:title", content: "My Profile — COLLAXP" },
      { property: "og:description", content: "Manage your COLLAXP student profile." },
    ],
  }),
  component: ProfilePage,
});

function ProfilePage() {
  const { profile, user, role, refreshProfile } = useAuth();
  const [form, setForm] = useState({
    username: "",
    full_name: "",
    bio: "",
    institution: INSTITUTIONS[0]!,
    avatar_url: "",
    course: "",
    graduation_date: "",
  });
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!profile) return;
    setForm({
      username: profile.username ?? "",
      full_name: profile.full_name ?? "",
      bio: profile.bio ?? "",
      institution: profile.institution ?? INSTITUTIONS[0]!,
      avatar_url: profile.avatar_url ?? "",
      course: profile.course ?? "",
      graduation_date: profile.graduation_date ?? "",
    });
  }, [profile]);

  const { data: registrationCount = 0 } = useQuery({
    queryKey: ["profile-registrations", user?.id],
    enabled: Boolean(user?.id),
    queryFn: async () => {
      const { count, error } = await supabase
        .from("event_registrations")
        .select("id", { count: "exact", head: true })
        .eq("user_id", user!.id);
      if (error) throw error;
      return count ?? 0;
    },
  });

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    const { error } = await supabase
      .from("profiles")
      .update({
        username: form.username.trim() || null,
        full_name: form.full_name.trim() || null,
        bio: form.bio.trim() || null,
        institution: form.institution,
        avatar_url: form.avatar_url.trim() || null,
        course: form.course.trim() || null,
        graduation_date: form.graduation_date || null,
      })
      .eq("id", user!.id);
    setBusy(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    await refreshProfile();
    toast.success("Profile saved");
  };

  return (
    <div className="mx-auto w-full max-w-2xl px-4 py-10 sm:px-6">
      <Reveal className="panel flex flex-col items-center p-8 text-center">
        <div className="h-24 w-24 overflow-hidden rounded-full border-2 border-primary neon-ring">
          {form.avatar_url ? (
            <img src={form.avatar_url} alt="" className="h-full w-full object-cover" />
          ) : (
            <div className="flex h-full w-full items-center justify-center bg-[var(--gradient-neon)] font-display text-2xl text-primary-foreground">
              {(profile?.username ?? profile?.student_number ?? "C").slice(0, 2).toUpperCase()}
            </div>
          )}
        </div>
        <h1 className="mt-4 text-2xl">@{profile?.username ?? "student"}</h1>
        <p className="font-display text-sm text-muted-foreground">{profile?.institution}</p>
        <p className="mt-1 font-display text-sm text-primary">
          {profile?.student_number ?? (role === "organiser" ? "Organiser account" : user?.email)}
        </p>
        {profile?.course && (
          <p className="mt-1 text-sm text-muted-foreground">{profile.course}</p>
        )}
        {profile?.graduation_date && (
          <p className="mt-1 font-display text-xs uppercase tracking-widest text-primary">
            Graduating {formatDate(profile.graduation_date)}
          </p>
        )}
        {profile?.bio && <p className="mt-2 text-sm text-muted-foreground">{profile.bio}</p>}

        <div className="mt-6 grid w-full grid-cols-3 gap-3">
          {[
            { label: "Events", value: registrationCount },
            { label: "XP", value: profile?.xp ?? 0 },
            { label: "Level", value: profile?.level ?? 1 },
          ].map((s) => (
            <div key={s.label} className="rounded-xl bg-surface-2 p-3">
              <p className="font-display text-xl">{s.value}</p>
              <p className="text-[11px] uppercase tracking-widest text-muted-foreground">
                {s.label}
              </p>
            </div>
          ))}
        </div>
      </Reveal>

      <Reveal delay={90}>
        <form onSubmit={save} className="panel mt-6 space-y-5 p-6">
          <h2 className="font-display text-lg">Personal information</h2>

          <div className="space-y-2">
            <Label htmlFor="username">Username</Label>
            <Input
              id="username"
              value={form.username}
              onChange={(e) => setForm((p) => ({ ...p, username: e.target.value }))}
              className="bg-surface-2"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="full_name">Full name</Label>
            <Input
              id="full_name"
              value={form.full_name}
              onChange={(e) => setForm((p) => ({ ...p, full_name: e.target.value }))}
              className="bg-surface-2"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="bio">Bio</Label>
            <Textarea
              id="bio"
              rows={3}
              value={form.bio}
              onChange={(e) => setForm((p) => ({ ...p, bio: e.target.value }))}
              placeholder="young, wild and free"
              className="bg-surface-2"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="institution">Institution</Label>
            <Select
              value={form.institution}
              onValueChange={(v) => setForm((p) => ({ ...p, institution: v }))}
            >
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
          <div className="space-y-2">
            <Label htmlFor="course">Course / qualification</Label>
            <Input
              id="course"
              value={form.course}
              onChange={(e) => setForm((p) => ({ ...p, course: e.target.value }))}
              placeholder="e.g. Diploma in Marketing Management"
              className="bg-surface-2"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="graduation_date">Graduation date</Label>
            <Input
              id="graduation_date"
              type="date"
              value={form.graduation_date}
              onChange={(e) => setForm((p) => ({ ...p, graduation_date: e.target.value }))}
              className="bg-surface-2"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="avatar_url">Avatar image URL</Label>
            <Input
              id="avatar_url"
              value={form.avatar_url}
              onChange={(e) => setForm((p) => ({ ...p, avatar_url: e.target.value }))}
              placeholder="https://…"
              className="bg-surface-2"
            />
          </div>

          <Button type="submit" className="w-full" disabled={busy}>
            {busy ? "Saving…" : "Save"}
          </Button>
        </form>
      </Reveal>
    </div>
  );
}
