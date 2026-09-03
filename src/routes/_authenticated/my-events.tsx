import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link, createFileRoute } from "@tanstack/react-router";
import { CalendarDays, MapPin, QrCode, Ticket } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { Reveal } from "@/components/Reveal";
import { TicketQrDialog } from "@/components/tickets/TicketQrDialog";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { formatDate, formatPrice } from "@/lib/collaxp";

export const Route = createFileRoute("/_authenticated/my-events")({
  head: () => ({
    meta: [
      { title: "My Events & Tickets — COLLAXP" },
      {
        name: "description",
        content:
          "Every campus event you have registered for on COLLAXP, with your ticket number, venue and date.",
      },
      { property: "og:title", content: "My Events & Tickets — COLLAXP" },
      { property: "og:description", content: "Your COLLAXP registrations and ticket numbers." },
    ],
  }),
  component: MyEvents,
});

type Registration = {
  id: string;
  ticket_no: string;
  created_at: string;
  event: {
    id: string;
    title: string;
    institution: string;
    location: string;
    event_date: string;
    start_time: string;
    price: number;
    poster_url: string | null;
  } | null;
};

function MyEvents() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [qrTicket, setQrTicket] = useState<Registration | null>(null);

  const { data: registrations = [], isLoading } = useQuery({
    queryKey: ["my-events", user?.id],
    enabled: Boolean(user?.id),
    queryFn: async () => {
      const { data, error } = await supabase
        .from("event_registrations")
        .select(
          "id,ticket_no,created_at,event:events(id,title,institution,location,event_date,start_time,price,poster_url)",
        )
        .eq("user_id", user!.id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as unknown as Registration[];
    },
  });

  const cancel = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("event_registrations").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Registration cancelled");
      void queryClient.invalidateQueries({ queryKey: ["my-events"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div className="mx-auto w-full max-w-4xl px-4 py-10 sm:px-6">
      <Reveal>
        <h1 className="text-3xl sm:text-4xl">My Events</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Click an event to view the full details.
        </p>
      </Reveal>

      {isLoading ? (
        <div className="mt-8 space-y-4">
          {[0, 1].map((i) => (
            <div key={i} className="panel h-28 animate-pulse" />
          ))}
        </div>
      ) : registrations.length === 0 ? (
        <Reveal className="panel mt-8 p-10 text-center">
          <Ticket className="mx-auto h-6 w-6 text-primary" />
          <p className="mt-3 font-display text-lg">No tickets yet</p>
          <p className="mt-2 text-sm text-muted-foreground">
            Register for an event and it will show up here instantly.
          </p>
          <Button className="mt-6" asChild>
            <Link to="/discover">Explore events</Link>
          </Button>
        </Reveal>
      ) : (
        <ul className="mt-8 space-y-4">
          {registrations.map((r, i) => (
            <Reveal as="li" key={r.id} delay={i * 60}>
              <div className="panel hover-lift flex flex-col gap-4 p-4 sm:flex-row sm:items-center">
                <Link
                  to="/events/$eventId"
                  params={{ eventId: r.event?.id ?? "" }}
                  className="flex flex-1 items-center gap-4"
                >
                  <div className="h-20 w-20 shrink-0 overflow-hidden rounded-xl bg-surface-2">
                    {r.event?.poster_url ? (
                      <img
                        src={r.event.poster_url}
                        alt={r.event.title}
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <div className="h-full w-full bg-[var(--gradient-neon)]" />
                    )}
                  </div>
                  <div className="min-w-0">
                    <p className="font-display text-xs uppercase tracking-widest text-primary">
                      {r.event?.institution}
                    </p>
                    <p className="truncate font-display text-lg">{r.event?.title}</p>
                    <p className="mt-1 flex flex-wrap gap-x-3 text-xs text-muted-foreground">
                      <span className="inline-flex items-center gap-1">
                        <CalendarDays className="h-3.5 w-3.5" />
                        {r.event ? formatDate(r.event.event_date) : ""} · {r.event?.start_time}
                      </span>
                      <span className="inline-flex items-center gap-1">
                        <MapPin className="h-3.5 w-3.5" /> {r.event?.location}
                      </span>
                      <span>{r.event ? formatPrice(Number(r.event.price)) : ""}</span>
                    </p>
                  </div>
                </Link>
                <div className="flex items-center gap-3 sm:flex-col sm:items-end">
                  <span className="rounded-full bg-primary/15 px-3 py-1 font-display text-[11px] uppercase tracking-widest text-primary">
                    Ticket {r.ticket_no}
                  </span>
                  <Button size="sm" variant="outline" onClick={() => setQrTicket(r)}>
                    <QrCode className="mr-2 h-4 w-4" /> Show QR
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => cancel.mutate(r.id)}
                    disabled={cancel.isPending}
                  >
                    Cancel
                  </Button>
                </div>
              </div>
            </Reveal>
          ))}
        </ul>
      )}

      {qrTicket && (
        <TicketQrDialog
          open
          onOpenChange={(open) => !open && setQrTicket(null)}
          registrationId={qrTicket.id}
          ticketNo={qrTicket.ticket_no}
          eventTitle={qrTicket.event?.title ?? "Your ticket"}
          eventMeta={
            qrTicket.event
              ? `${formatDate(qrTicket.event.event_date)} · ${qrTicket.event.start_time} · ${qrTicket.event.location}`
              : undefined
          }
        />
      )}
    </div>
  );
}
