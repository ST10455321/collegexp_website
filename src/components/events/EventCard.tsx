import { Link } from "@tanstack/react-router";
import { CalendarDays, MapPin, Zap } from "lucide-react";

import { formatDate, formatPrice } from "@/lib/collaxp";

export type EventRow = {
  id: string;
  title: string;
  description: string;
  institution: string;
  location: string;
  category: string;
  poster_url: string | null;
  event_date: string;
  start_time: string;
  price: number;
  xp_reward: number;
};

export function EventCard({ event }: { event: EventRow }) {
  return (
    <Link
      to="/events/$eventId"
      params={{ eventId: event.id }}
      className="panel hover-lift group block overflow-hidden"
    >
      <div className="relative aspect-[4/3] overflow-hidden bg-surface-2">
        {event.poster_url ? (
          <img
            src={event.poster_url}
            alt={event.title}
            loading="lazy"
            className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-105"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center bg-[var(--gradient-neon)]">
            <span className="font-display text-lg uppercase tracking-widest text-primary-foreground">
              {event.category}
            </span>
          </div>
        )}
        <span className="absolute left-3 top-3 rounded-full bg-primary px-3 py-1 font-display text-[10px] uppercase tracking-widest text-primary-foreground">
          {event.category}
        </span>
        <span className="absolute right-3 top-3 rounded-full bg-background/80 px-3 py-1 font-display text-[10px] uppercase tracking-widest text-foreground">
          {formatPrice(Number(event.price))}
        </span>
      </div>

      <div className="space-y-2 p-4">
        <p className="font-display text-xs uppercase tracking-widest text-primary">
          {event.institution || "COLLAXP"}
        </p>
        <h3 className="line-clamp-1 font-display text-lg text-foreground">{event.title}</h3>
        <p className="line-clamp-2 text-sm text-muted-foreground">{event.description}</p>
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 pt-1 text-xs text-muted-foreground">
          <span className="inline-flex items-center gap-1">
            <CalendarDays className="h-3.5 w-3.5" /> {formatDate(event.event_date)} ·{" "}
            {event.start_time}
          </span>
          {event.location && (
            <span className="inline-flex items-center gap-1">
              <MapPin className="h-3.5 w-3.5" /> {event.location}
            </span>
          )}
          <span className="inline-flex items-center gap-1 text-primary">
            <Zap className="h-3.5 w-3.5" /> +{event.xp_reward} XP
          </span>
        </div>
      </div>
    </Link>
  );
}
