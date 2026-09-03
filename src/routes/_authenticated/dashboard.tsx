import { useQuery } from "@tanstack/react-query";
import { Link, createFileRoute } from "@tanstack/react-router";
import { Bell, CalendarCheck, Compass, Trophy, Zap } from "lucide-react";

import { EventCard, type EventRow } from "@/components/events/EventCard";
import { Reveal } from "@/components/Reveal";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { levelProgress, xpToNextLevel } from "@/lib/collaxp";

export const Route = createFileRoute("/_authenticated/dashboard")({
  head: () => ({
    meta: [
      { title: "Student Dashboard — COLLAXP" },
      {
        name: "description",
        content:
          "Your COLLAXP dashboard: upcoming registrations, unread notifications, XP progress and events happening on campus.",
      },
      { property: "og:title", content: "Student Dashboard — COLLAXP" },
      { property: "og:description", content: "Your registrations, XP progress and campus feed." },
    ],
  }),
  component: Dashboard,
});

function Dashboard() {
  const { profile, user, role } = useAuth();

  const { data: registrations = [] } = useQuery({
    queryKey: ["my-events", user?.id],
    enabled: Boolean(user?.id),
    queryFn: async () => {
      const { data, error } = await supabase
        .from("event_registrations")
        .select("id,ticket_no,event:events(*)")
        .eq("user_id", user!.id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });

  const { data: unread = 0 } = useQuery({
    queryKey: ["notifications", "unread", user?.id],
    enabled: Boolean(user?.id),
    queryFn: async () => {
      const { count, error } = await supabase
        .from("notifications")
        .select("id", { count: "exact", head: true })
        .eq("user_id", user!.id)
        .eq("is_read", false);
      if (error) throw error;
      return count ?? 0;
    },
  });

  const { data: upcoming = [] } = useQuery({
    queryKey: ["events", "upcoming"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("events")
        .select(
          "id,title,description,institution,location,category,poster_url,event_date,start_time,price,xp_reward",
        )
        .eq("is_published", true)
        .gte("event_date", new Date().toISOString().slice(0, 10))
        .order("event_date", { ascending: true })
        .limit(3);
      if (error) throw error;
      return (data ?? []) as EventRow[];
    },
  });

  const xp = profile?.xp ?? 0;

  const stats = [
    { label: "Registered events", value: registrations.length, icon: CalendarCheck },
    { label: "Total XP", value: xp, icon: Zap },
    { label: "Level", value: profile?.level ?? 1, icon: Trophy },
    { label: "Unread alerts", value: unread, icon: Bell },
  ];

  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-10 sm:px-6">
      <Reveal className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="font-display text-xs uppercase tracking-[0.2em] text-primary">
            {role === "organiser" ? "Organiser" : profile?.institution ?? "COLLAXP"}
          </p>
          <h1 className="mt-1 text-3xl sm:text-4xl">
            Welcome, {profile?.student_number ?? profile?.username ?? user?.email}
          </h1>
          {profile?.full_name && (
            <p className="mt-1 text-sm text-muted-foreground">{profile.full_name}</p>
          )}
        </div>
        <Button asChild variant="outline">
          <Link to="/discover">
            <Compass className="mr-2 h-4 w-4" /> Discover events
          </Link>
        </Button>
      </Reveal>

      <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((s, i) => (
          <Reveal key={s.label} delay={i * 70} className="panel hover-lift p-5">
            <s.icon className="h-5 w-5 text-primary" />
            <p className="mt-3 font-display text-3xl">{s.value}</p>
            <p className="text-xs uppercase tracking-widest text-muted-foreground">{s.label}</p>
          </Reveal>
        ))}
      </div>

      <Reveal delay={80} className="panel mt-6 p-6">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="font-display text-lg">Level {profile?.level ?? 1}</h2>
          <p className="text-xs text-muted-foreground">
            {xpToNextLevel(xp)} XP to level {(profile?.level ?? 1) + 1}
          </p>
        </div>
        <Progress value={levelProgress(xp)} className="mt-4" />
        <p className="mt-3 text-xs text-muted-foreground">
          XP is a bonus for taking part — the events come first.
        </p>
      </Reveal>

      <section className="mt-12">
        <Reveal className="mb-4 flex items-end justify-between">
          <h2 className="text-2xl">Your next events</h2>
          <Link
            to="/my-events"
            className="font-display text-xs uppercase tracking-widest text-primary"
          >
            My events →
          </Link>
        </Reveal>
        {registrations.length === 0 ? (
          <Reveal className="panel p-8 text-center">
            <p className="text-sm text-muted-foreground">
              You have not registered for anything yet.
            </p>
            <Button className="mt-4" asChild>
              <Link to="/discover">Find an event</Link>
            </Button>
          </Reveal>
        ) : (
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {registrations.slice(0, 3).map((r, i) => (
              <Reveal key={r.id} delay={i * 70}>
                <EventCard event={r.event as unknown as EventRow} />
              </Reveal>
            ))}
          </div>
        )}
      </section>

      {upcoming.length > 0 && (
        <section className="mt-12">
          <Reveal className="mb-4">
            <h2 className="text-2xl">Happening on campus</h2>
          </Reveal>
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {upcoming.map((e, i) => (
              <Reveal key={e.id} delay={i * 70}>
                <EventCard event={e} />
              </Reveal>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
