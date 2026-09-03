import { useQuery } from "@tanstack/react-query";
import { Link, createFileRoute } from "@tanstack/react-router";
import { ArrowRight, CalendarCheck, Sparkles, Trophy, Users } from "lucide-react";

import { Logo } from "@/components/brand/Logo";
import { EventCard, type EventRow } from "@/components/events/EventCard";
import { Reveal } from "@/components/Reveal";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "COLLAXP — Campus Events & Your Digital Year Book" },
      {
        name: "description",
        content:
          "COLLAXP is the student platform for discovering campus events, registering with your student number and earning XP for every experience.",
      },
      { property: "og:title", content: "COLLAXP — Campus Events & Your Digital Year Book" },
      {
        property: "og:description",
        content:
          "Discover campus events, register with your student number and earn XP for every experience.",
      },
    ],
  }),
  component: Home,
});

const highlights = [
  {
    icon: CalendarCheck,
    title: "Discover events",
    body: "Campus tours, sharing sessions, theatre and culture — across every institution.",
  },
  {
    icon: Users,
    title: "Register in seconds",
    body: "One tap registration with your student number. Your ticket lands in My Events.",
  },
  {
    icon: Trophy,
    title: "Earn XP",
    body: "XP, levels and badges are the bonus for showing up and living campus life.",
  },
];

function Home() {
  const { user, profile } = useAuth();

  const { data: events = [] } = useQuery({
    queryKey: ["events", "featured"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("events")
        .select(
          "id,title,description,institution,location,category,poster_url,event_date,start_time,price,xp_reward",
        )
        .eq("is_published", true)
        .order("event_date", { ascending: true })
        .limit(6);
      if (error) throw error;
      return (data ?? []) as EventRow[];
    },
  });

  return (
    <div>
      <section className="relative overflow-hidden">
        <div
          className="pointer-events-none absolute -top-40 left-1/2 h-[520px] w-[520px] -translate-x-1/2 rounded-full animate-pulse-glow"
          style={{
            background:
              "radial-gradient(circle, color-mix(in oklab, var(--primary) 45%, transparent) 0%, transparent 65%)",
          }}
        />
        <div className="relative mx-auto grid w-full max-w-6xl items-center gap-10 px-4 py-16 sm:px-6 md:grid-cols-2 md:py-24">
          <div className="animate-rise space-y-6">
            <span className="inline-flex items-center gap-2 rounded-full border border-primary/40 bg-primary/10 px-4 py-1.5 font-display text-[10px] uppercase tracking-[0.2em] text-primary">
              <Sparkles className="h-3 w-3" /> Digital year book
            </span>
            <h1 className="text-4xl leading-tight sm:text-5xl md:text-6xl">
              Your campus
              <br />
              experience,{" "}
              <span className="text-primary text-glow">collected</span>
            </h1>
            <p className="max-w-md text-base text-muted-foreground">
              {user
                ? `Welcome back, ${profile?.student_number ?? profile?.username ?? "student"}. Here is what is happening on campus.`
                : "COLLAXP is where students post their college experience, campus events and award ceremonies — even if you don't go to the same institution."}
            </p>
            <div className="flex flex-wrap gap-3">
              <Button size="lg" asChild>
                <Link to="/discover">
                  Discover events <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
              <Button size="lg" variant="outline" asChild>
                <Link to={user ? "/dashboard" : "/student-signup"}>
                  {user ? "My dashboard" : "Create student account"}
                </Link>
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              Students sign in with{" "}
              <span className="font-display text-primary">ST########@rcconnect.edu.za</span>
            </p>
          </div>

          <div className="relative flex justify-center">
            <Logo className="animate-float w-[86%] max-w-[440px] drop-shadow-[0_20px_80px_rgba(204,34,224,0.35)]" />
          </div>
        </div>
      </section>

      <section className="mx-auto w-full max-w-6xl px-4 sm:px-6">
        <div className="grid gap-4 md:grid-cols-3">
          {highlights.map((h, i) => (
            <Reveal key={h.title} delay={i * 90} className="panel hover-lift p-6">
              <h.icon className="h-6 w-6 text-primary" />
              <h3 className="mt-4 font-display text-lg">{h.title}</h3>
              <p className="mt-2 text-sm text-muted-foreground">{h.body}</p>
            </Reveal>
          ))}
        </div>
      </section>

      <section className="mx-auto w-full max-w-6xl px-4 pt-20 sm:px-6">
        <Reveal className="mb-6 flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 className="text-2xl sm:text-3xl">Happening soon</h2>
            <p className="text-sm text-muted-foreground">
              Live events published by campus organisers.
            </p>
          </div>
          <Link
            to="/discover"
            className="font-display text-xs uppercase tracking-widest text-primary transition-opacity hover:opacity-80"
          >
            View all →
          </Link>
        </Reveal>

        {events.length === 0 ? (
          <Reveal className="panel p-10 text-center">
            <p className="font-display text-lg">No events published yet</p>
            <p className="mx-auto mt-2 max-w-md text-sm text-muted-foreground">
              Organisers publish campus events from the organiser dashboard. Once an event goes
              live it appears here instantly.
            </p>
            <Button className="mt-6" variant="outline" asChild>
              <Link to="/organiser-login">Organiser access</Link>
            </Button>
          </Reveal>
        ) : (
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {events.map((event, i) => (
              <Reveal key={event.id} delay={i * 70}>
                <EventCard event={event} />
              </Reveal>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
