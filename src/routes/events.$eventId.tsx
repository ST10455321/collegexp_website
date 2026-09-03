import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link, createFileRoute, useNavigate } from "@tanstack/react-router";
import {
  ArrowLeft,
  CalendarDays,
  Clock,
  MapPin,
  ShieldAlert,
  ShoppingCart,
  Ticket,
  Zap,
} from "lucide-react";
import { toast } from "sonner";

import { Reveal } from "@/components/Reveal";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { useAddToCart } from "@/hooks/useCart";
import { supabase } from "@/integrations/supabase/client";
import { eventTypeLabel, formatDate, formatPrice, isRsvpType } from "@/lib/collaxp";

export const Route = createFileRoute("/events/$eventId")({
  head: () => ({
    meta: [
      { title: "Event Details — COLLAXP" },
      {
        name: "description",
        content:
          "Full details for this campus event on COLLAXP: date, time, venue, price, age restriction and the XP you earn for attending.",
      },
      { property: "og:title", content: "Event Details — COLLAXP" },
      {
        property: "og:description",
        content: "Date, venue, price and XP reward for this campus event on COLLAXP.",
      },
    ],
  }),
  component: EventDetails,
});

function EventDetails() {
  const { eventId } = Route.useParams();
  const { user, role } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const addToCart = useAddToCart();

  const { data: event, isLoading } = useQuery({
    queryKey: ["event", eventId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("events")
        .select("*")
        .eq("id", eventId)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  const { data: registration } = useQuery({
    queryKey: ["registration", eventId, user?.id],
    enabled: Boolean(user?.id),
    queryFn: async () => {
      const { data, error } = await supabase
        .from("event_registrations")
        .select("id,ticket_no")
        .eq("event_id", eventId)
        .eq("user_id", user!.id)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  const register = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase
        .from("event_registrations")
        .insert({ event_id: eventId, user_id: user!.id })
        .select("ticket_no")
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      toast.success(`You're in! Ticket ${data.ticket_no}`, {
        description: "Find it under My Events.",
      });
      void queryClient.invalidateQueries({ queryKey: ["registration", eventId] });
      void queryClient.invalidateQueries({ queryKey: ["my-events"] });
      void queryClient.invalidateQueries({ queryKey: ["notifications"] });
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const cancel = useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from("event_registrations")
        .delete()
        .eq("event_id", eventId)
        .eq("user_id", user!.id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Registration cancelled");
      void queryClient.invalidateQueries({ queryKey: ["registration", eventId] });
      void queryClient.invalidateQueries({ queryKey: ["my-events"] });
    },
    onError: (error: Error) => toast.error(error.message),
  });

  if (isLoading) {
    return (
      <div className="mx-auto w-full max-w-4xl px-4 py-16">
        <div className="panel h-96 animate-pulse" />
      </div>
    );
  }

  if (!event) {
    return (
      <div className="mx-auto w-full max-w-2xl px-4 py-24 text-center">
        <h1 className="text-2xl">Event not found</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          This event may have been removed by its organiser.
        </p>
        <Button className="mt-6" asChild>
          <Link to="/discover">Back to Explore</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-5xl px-4 py-10 sm:px-6">
      <Link
        to="/discover"
        className="inline-flex items-center gap-2 font-display text-xs uppercase tracking-widest text-muted-foreground transition-colors hover:text-primary"
      >
        <ArrowLeft className="h-4 w-4" /> Explore
      </Link>

      <div className="mt-6 grid gap-8 md:grid-cols-[1.1fr_0.9fr]">
        <Reveal className="panel overflow-hidden">
          <div className="aspect-[4/3] bg-surface-2">
            {event.poster_url ? (
              <img
                src={event.poster_url}
                alt={event.title}
                className="h-full w-full object-cover"
              />
            ) : (
              <div className="flex h-full items-center justify-center bg-[var(--gradient-neon)]">
                <span className="font-display text-2xl uppercase tracking-widest text-primary-foreground">
                  {event.category}
                </span>
              </div>
            )}
          </div>
        </Reveal>

        <Reveal delay={90} className="space-y-6">
          <div>
            <p className="font-display text-xs uppercase tracking-[0.2em] text-primary">
              {event.institution || "COLLAXP"} · {event.category} ·{" "}
              {eventTypeLabel(event.event_type)}
            </p>
            <h1 className="mt-2 text-3xl sm:text-4xl">{event.title}</h1>
            {event.speaker && (
              <p className="mt-2 text-sm text-muted-foreground">
                Speaker / host: <span className="text-foreground">{event.speaker}</span>
              </p>
            )}
          </div>

          <dl className="grid gap-3 text-sm">
            <div className="flex items-center gap-3 text-muted-foreground">
              <CalendarDays className="h-4 w-4 text-primary" />
              {formatDate(event.event_date)}
            </div>
            <div className="flex items-center gap-3 text-muted-foreground">
              <Clock className="h-4 w-4 text-primary" /> {event.start_time}
            </div>
            <div className="flex items-center gap-3 text-muted-foreground">
              <MapPin className="h-4 w-4 text-primary" /> {event.location || "To be announced"}
            </div>
            <div className="flex items-center gap-3 text-muted-foreground">
              <ShieldAlert className="h-4 w-4 text-primary" /> Age restriction:{" "}
              {event.age_restriction}
            </div>
            <div className="flex items-center gap-3 text-muted-foreground">
              <Ticket className="h-4 w-4 text-primary" /> {formatPrice(Number(event.price))}
            </div>
            <div className="flex items-center gap-3 text-primary">
              <Zap className="h-4 w-4" /> +{event.xp_reward} XP on registration
            </div>
          </dl>

          {registration ? (
            <div className="panel space-y-3 p-5">
              <p className="font-display text-sm uppercase tracking-widest text-primary">
                {isRsvpType(event.event_type)
                  ? "RSVP confirmed"
                  : "Registered"}{" "}
                · Ticket {registration.ticket_no}
              </p>
              <div className="flex flex-wrap gap-2">
                <Button variant="outline" asChild>
                  <Link to="/my-events">View My Events</Link>
                </Button>
                <Button
                  variant="ghost"
                  onClick={() => cancel.mutate()}
                  disabled={cancel.isPending}
                >
                  {cancel.isPending
                    ? "Cancelling…"
                    : isRsvpType(event.event_type)
                      ? "Cancel RSVP"
                      : "Cancel registration"}
                </Button>
              </div>
            </div>
          ) : user && role !== "organiser" ? (
            isRsvpType(event.event_type) || Number(event.price) <= 0 ? (
              <Button
                size="lg"
                className="w-full"
                onClick={() => register.mutate()}
                disabled={register.isPending}
              >
                {register.isPending
                  ? "Registering…"
                  : isRsvpType(event.event_type)
                    ? "RSVP — I'm attending"
                    : "Register for this event"}
              </Button>
            ) : (
              <div className="space-y-2">
                <Button
                  size="lg"
                  className="w-full"
                  onClick={() =>
                    addToCart.mutate({ eventId: event.id, quantity: 1 })
                  }
                  disabled={addToCart.isPending}
                >
                  <ShoppingCart className="mr-2 h-4 w-4" />
                  {addToCart.isPending
                    ? "Adding…"
                    : `Add ticket to cart — ${formatPrice(Number(event.price))}`}
                </Button>
                <Button
                  variant="outline"
                  className="w-full"
                  onClick={() => void navigate({ to: "/cart" })}
                >
                  Go to cart to check out
                </Button>
              </div>
            )
          ) : user && role === "organiser" ? (
            <p className="panel p-4 text-sm text-muted-foreground">
              Organiser accounts manage events; sign in with a student account to register.
            </p>
          ) : (
            <div className="space-y-3">
              <Button
                size="lg"
                className="w-full"
                onClick={() => void navigate({ to: "/student-login" })}
              >
                Sign in to register
              </Button>
              <p className="text-center text-xs text-muted-foreground">
                No account?{" "}
                <Link to="/student-signup" className="text-primary hover:underline">
                  Create one with your student email
                </Link>
              </p>
            </div>
          )}
        </Reveal>
      </div>

      <Reveal delay={140} className="panel mt-10 p-6">
        <h2 className="font-display text-lg">About this event</h2>
        <p className="mt-3 whitespace-pre-line text-sm leading-relaxed text-muted-foreground">
          {event.description || "The organiser has not added a description yet."}
        </p>
        {event.agenda && (
          <>
            <h3 className="mt-6 font-display text-sm uppercase tracking-widest text-primary">
              Agenda / event details
            </h3>
            <p className="mt-2 whitespace-pre-line text-sm leading-relaxed text-muted-foreground">
              {event.agenda}
            </p>
          </>
        )}
      </Reveal>
    </div>
  );
}
