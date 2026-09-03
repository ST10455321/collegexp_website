import { useQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { Search } from "lucide-react";
import { useMemo, useState } from "react";

import { EventCard, type EventRow } from "@/components/events/EventCard";
import { Reveal } from "@/components/Reveal";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { CATEGORIES } from "@/lib/collaxp";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/discover")({
  head: () => ({
    meta: [
      { title: "Discover Campus Events — COLLAXP" },
      {
        name: "description",
        content:
          "Browse every published campus event on COLLAXP by category, institution or search — then register with your student number.",
      },
      { property: "og:title", content: "Discover Campus Events — COLLAXP" },
      {
        property: "og:description",
        content: "Browse campus events by category, institution or search on COLLAXP.",
      },
    ],
  }),
  component: Discover,
});

function Discover() {
  const [q, setQ] = useState("");
  const [category, setCategory] = useState<string>("All");

  const { data: events = [], isLoading } = useQuery({
    queryKey: ["events", "all"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("events")
        .select(
          "id,title,description,institution,location,category,poster_url,event_date,start_time,price,xp_reward",
        )
        .eq("is_published", true)
        .order("event_date", { ascending: true });
      if (error) throw error;
      return (data ?? []) as EventRow[];
    },
  });

  const filtered = useMemo(() => {
    const term = q.trim().toLowerCase();
    return events.filter((e) => {
      const matchesCat = category === "All" || e.category === category;
      const matchesTerm =
        !term ||
        [e.title, e.description, e.institution, e.location].some((v) =>
          (v ?? "").toLowerCase().includes(term),
        );
      return matchesCat && matchesTerm;
    });
  }, [events, q, category]);

  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-12 sm:px-6">
      <Reveal>
        <h1 className="text-3xl sm:text-4xl">Explore</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Every live campus event across institutions.
        </p>
      </Reveal>

      <Reveal delay={80} className="mt-8 space-y-4">
        <div className="relative">
          <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search events, institutions, locations"
            aria-label="Search events"
            className="h-12 rounded-full border-border bg-surface pl-11"
          />
        </div>
        <div className="flex flex-wrap gap-2">
          {["All", ...CATEGORIES].map((c) => (
            <button
              key={c}
              onClick={() => setCategory(c)}
              className={cn(
                "rounded-full border px-4 py-2 font-display text-[11px] uppercase tracking-widest transition-all duration-300",
                category === c
                  ? "border-primary bg-primary text-primary-foreground"
                  : "border-border bg-surface text-muted-foreground hover:border-primary hover:text-foreground",
              )}
            >
              {c}
            </button>
          ))}
        </div>
      </Reveal>

      <div className="mt-10">
        {isLoading ? (
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {[0, 1, 2].map((i) => (
              <div key={i} className="panel h-72 animate-pulse" />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="panel p-10 text-center">
            <p className="font-display text-lg">Nothing here yet</p>
            <p className="mt-2 text-sm text-muted-foreground">
              {events.length === 0
                ? "No organiser has published an event yet."
                : "No event matches your search or filter."}
            </p>
          </div>
        ) : (
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {filtered.map((event, i) => (
              <Reveal key={event.id} delay={Math.min(i, 6) * 60}>
                <EventCard event={event} />
              </Reveal>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
