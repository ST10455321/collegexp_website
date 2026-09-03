import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link, createFileRoute } from "@tanstack/react-router";
import { BellRing, CheckCheck, Ticket, Trash2, Zap } from "lucide-react";
import { toast } from "sonner";

import { Reveal } from "@/components/Reveal";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/_authenticated/notifications")({
  head: () => ({
    meta: [
      { title: "Notifications — COLLAXP" },
      {
        name: "description",
        content:
          "Event confirmations, ticket numbers, XP awards and organiser updates for your COLLAXP account.",
      },
      { property: "og:title", content: "Notifications — COLLAXP" },
      { property: "og:description", content: "Your COLLAXP event and XP notifications." },
    ],
  }),
  component: Notifications,
});

type Notification = {
  id: string;
  title: string;
  body: string;
  kind: string;
  event_id: string | null;
  is_read: boolean;
  created_at: string;
};

function iconFor(kind: string) {
  if (kind === "registration") return Ticket;
  if (kind === "welcome") return Zap;
  return BellRing;
}

function Notifications() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const { data: items = [], isLoading } = useQuery({
    queryKey: ["notifications", user?.id],
    enabled: Boolean(user?.id),
    queryFn: async () => {
      const { data, error } = await supabase
        .from("notifications")
        .select("*")
        .eq("user_id", user!.id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as Notification[];
    },
  });

  const invalidate = () => {
    void queryClient.invalidateQueries({ queryKey: ["notifications"] });
  };

  const markAll = useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from("notifications")
        .update({ is_read: true })
        .eq("user_id", user!.id)
        .eq("is_read", false);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("All notifications marked as read");
      invalidate();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const toggleRead = useMutation({
    mutationFn: async (n: Notification) => {
      const { error } = await supabase
        .from("notifications")
        .update({ is_read: !n.is_read })
        .eq("id", n.id);
      if (error) throw error;
    },
    onSuccess: invalidate,
    onError: (e: Error) => toast.error(e.message),
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("notifications").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Notification removed");
      invalidate();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const unread = items.filter((i) => !i.is_read).length;

  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-10 sm:px-6">
      <Reveal className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-3xl sm:text-4xl">Notifications</h1>
          <p className="mt-2 text-sm text-muted-foreground">{unread} unread</p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => markAll.mutate()}
          disabled={markAll.isPending || unread === 0}
        >
          <CheckCheck className="mr-2 h-4 w-4" /> Mark all read
        </Button>
      </Reveal>

      {isLoading ? (
        <div className="mt-8 space-y-3">
          {[0, 1, 2].map((i) => (
            <div key={i} className="panel h-20 animate-pulse" />
          ))}
        </div>
      ) : items.length === 0 ? (
        <Reveal className="panel mt-8 p-10 text-center text-sm text-muted-foreground">
          Nothing here yet.
        </Reveal>
      ) : (
        <ul className="mt-8 space-y-3">
          {items.map((n, i) => {
            const Icon = iconFor(n.kind);
            return (
              <Reveal as="li" key={n.id} delay={Math.min(i, 6) * 50}>
                <div
                  className={`panel flex items-start gap-4 p-4 transition-colors ${
                    n.is_read ? "opacity-70" : "border-primary/40"
                  }`}
                >
                  <span className="rounded-full bg-primary/15 p-2 text-primary">
                    <Icon className="h-4 w-4" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="font-display text-sm">{n.title}</p>
                    <p className="mt-1 text-xs text-muted-foreground">{n.body}</p>
                    <p className="mt-1 text-[11px] text-muted-foreground/70">
                      {new Date(n.created_at).toLocaleString("en-ZA")}
                    </p>
                    {n.event_id && (
                      <Link
                        to="/events/$eventId"
                        params={{ eventId: n.event_id }}
                        className="mt-2 inline-block font-display text-[11px] uppercase tracking-widest text-primary hover:underline"
                      >
                        View event →
                      </Link>
                    )}
                  </div>
                  <div className="flex shrink-0 flex-col gap-1">
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => toggleRead.mutate(n)}
                      className="text-[11px]"
                    >
                      {n.is_read ? "Unread" : "Read"}
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      aria-label="Delete notification"
                      onClick={() => remove.mutate(n.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </Reveal>
            );
          })}
        </ul>
      )}
    </div>
  );
}
