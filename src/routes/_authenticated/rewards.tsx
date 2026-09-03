import { useQuery } from "@tanstack/react-query";
import { Link, createFileRoute } from "@tanstack/react-router";
import { Award, Lock, Zap } from "lucide-react";

import { Reveal } from "@/components/Reveal";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { BADGES, levelProgress, xpToNextLevel } from "@/lib/collaxp";

export const Route = createFileRoute("/_authenticated/rewards")({
  head: () => ({
    meta: [
      { title: "Rewards & XP — COLLAXP" },
      {
        name: "description",
        content:
          "Track the XP, levels and badges you earn as a bonus for attending campus events on COLLAXP.",
      },
      { property: "og:title", content: "Rewards & XP — COLLAXP" },
      { property: "og:description", content: "Your XP, level and badge progress on COLLAXP." },
    ],
  }),
  component: Rewards,
});

function Rewards() {
  const { profile, user } = useAuth();

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

  const xp = profile?.xp ?? 0;

  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-10 sm:px-6">
      <Reveal>
        <h1 className="text-3xl sm:text-4xl">Rewards</h1>
        <p className="mt-2 max-w-xl text-sm text-muted-foreground">
          XP, levels and badges are a bonus for taking part — the campus experience stays the main
          event.
        </p>
      </Reveal>

      <Reveal delay={80} className="panel mt-8 p-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="font-display text-xs uppercase tracking-widest text-primary">
              Current level
            </p>
            <p className="font-display text-4xl">{profile?.level ?? 1}</p>
          </div>
          <div className="text-right">
            <p className="inline-flex items-center gap-2 font-display text-2xl">
              <Zap className="h-5 w-5 text-primary" /> {xp} XP
            </p>
            <p className="text-xs text-muted-foreground">
              {xpToNextLevel(xp)} XP to next level
            </p>
          </div>
        </div>
        <Progress value={levelProgress(xp)} className="mt-5" />
      </Reveal>

      <section className="mt-10">
        <Reveal>
          <h2 className="text-2xl">Badges</h2>
        </Reveal>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          {BADGES.map((badge, i) => {
            const unlocked = registrationCount >= badge.requirement;
            return (
              <Reveal key={badge.name} delay={i * 70}>
                <div
                  className={`panel flex items-start gap-4 p-5 ${
                    unlocked ? "border-primary/50" : "opacity-70"
                  }`}
                >
                  <span
                    className={`rounded-full p-3 ${
                      unlocked ? "bg-primary/20 text-primary" : "bg-surface-2 text-muted-foreground"
                    }`}
                  >
                    {unlocked ? <Award className="h-5 w-5" /> : <Lock className="h-5 w-5" />}
                  </span>
                  <div>
                    <p className="font-display text-base">{badge.name}</p>
                    <p className="mt-1 text-xs text-muted-foreground">{badge.description}</p>
                    <p className="mt-2 text-[11px] uppercase tracking-widest text-primary">
                      {unlocked
                        ? "Unlocked"
                        : `${registrationCount}/${badge.requirement} events`}
                    </p>
                  </div>
                </div>
              </Reveal>
            );
          })}
        </div>
      </section>

      <Reveal delay={120} className="panel mt-10 p-6 text-center">
        <p className="text-sm text-muted-foreground">
          Want more XP? Register for another campus event.
        </p>
        <Button className="mt-4" asChild>
          <Link to="/discover">Explore events</Link>
        </Button>
      </Reveal>
    </div>
  );
}
