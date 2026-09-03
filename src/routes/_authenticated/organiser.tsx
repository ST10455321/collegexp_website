import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { CalendarPlus, Clapperboard, Pencil, QrCode, Trash2, Users, Zap } from "lucide-react";
import { Link } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";

import { Reveal } from "@/components/Reveal";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
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
import {
  CATEGORIES,
  EVENT_TYPES,
  INSTITUTIONS,
  eventTypeLabel,
  formatDate,
  formatPrice,
} from "@/lib/collaxp";

export const Route = createFileRoute("/_authenticated/organiser")({
  head: () => ({
    meta: [
      { title: "Organiser Dashboard — COLLAXP" },
      {
        name: "description",
        content:
          "Create, edit and delete campus events, publish them to students and view every registered attendee.",
      },
      { property: "og:title", content: "Organiser Dashboard — COLLAXP" },
      {
        property: "og:description",
        content: "Manage your COLLAXP events and registered students.",
      },
    ],
  }),
  component: OrganiserDashboard,
});

type EventRecord = {
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
  capacity: number;
  xp_reward: number;
  is_published: boolean;
  event_type: string;
  speaker: string | null;
  agenda: string | null;
};

const emptyForm = {
  title: "",
  description: "",
  institution: INSTITUTIONS[0]!,
  location: "",
  category: CATEGORIES[0]!,
  poster_url: "",
  event_date: "",
  start_time: "18:00",
  price: "0",
  capacity: "100",
  xp_reward: "50",
  is_published: true,
  event_type: "ticketed",
  speaker: "",
  agenda: "",
};

function OrganiserDashboard() {
  const { user, profile, role } = useAuth();
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<EventRecord | null>(null);
  const [form, setForm] = useState({ ...emptyForm });
  const [selectedEvent, setSelectedEvent] = useState<string | null>(null);

  const set = (k: keyof typeof form, v: string | boolean) =>
    setForm((p) => ({ ...p, [k]: v }) as typeof form);

  const { data: events = [], isLoading } = useQuery({
    queryKey: ["organiser-events", user?.id],
    enabled: Boolean(user?.id),
    queryFn: async () => {
      const { data, error } = await supabase
        .from("events")
        .select("*")
        .eq("organiser_id", user!.id)
        .order("event_date", { ascending: true });
      if (error) throw error;
      return (data ?? []) as EventRecord[];
    },
  });

  const { data: attendees = [] } = useQuery({
    queryKey: ["organiser-attendees", selectedEvent],
    enabled: Boolean(selectedEvent),
    queryFn: async () => {
      const { data, error } = await supabase
        .from("event_registrations")
        .select(
          "id,ticket_no,created_at,attended,profile:profiles(student_number,username,institution)",
        )
        .eq("event_id", selectedEvent!)
        .order("created_at", { ascending: true });
      if (error) throw error;
      return (data ?? []) as unknown as {
        id: string;
        ticket_no: string;
        created_at: string;
        attended: boolean;
        profile: {
          student_number: string | null;
          username: string | null;
          institution: string | null;
        } | null;
      }[];
    },
  });

  const { data: counts = {} } = useQuery({
    queryKey: ["organiser-counts", user?.id, events.length],
    enabled: events.length > 0,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("event_registrations")
        .select("event_id")
        .in(
          "event_id",
          events.map((e) => e.id),
        );
      if (error) throw error;
      const map: Record<string, number> = {};
      for (const row of data ?? []) map[row.event_id] = (map[row.event_id] ?? 0) + 1;
      return map;
    },
  });

  const invalidate = () => {
    void queryClient.invalidateQueries({ queryKey: ["organiser-events"] });
    void queryClient.invalidateQueries({ queryKey: ["organiser-counts"] });
    void queryClient.invalidateQueries({ queryKey: ["events"] });
  };

  const upsert = useMutation({
    mutationFn: async () => {
      const payload = {
        title: form.title.trim(),
        description: form.description.trim(),
        institution: form.institution,
        location: form.location.trim(),
        category: form.category,
        poster_url: form.poster_url.trim() || null,
        event_date: form.event_date,
        start_time: form.start_time,
        price: form.event_type === "ticketed" ? Number(form.price) || 0 : 0,
        capacity: Number(form.capacity) || 100,
        xp_reward: Number(form.xp_reward) || 0,
        is_published: form.is_published,
        event_type: form.event_type,
        speaker: form.speaker.trim() || null,
        agenda: form.agenda.trim() || null,
        organiser_id: user!.id,
      };
      if (editing) {
        const { error } = await supabase.from("events").update(payload).eq("id", editing.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("events").insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      toast.success(editing ? "Event updated" : "Event published");
      setOpen(false);
      setEditing(null);
      setForm({ ...emptyForm });
      invalidate();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("events").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Event deleted");
      setSelectedEvent(null);
      invalidate();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const startEdit = (event: EventRecord) => {
    setEditing(event);
    setForm({
      title: event.title,
      description: event.description ?? "",
      institution: event.institution,
      location: event.location,
      category: event.category,
      poster_url: event.poster_url ?? "",
      event_date: event.event_date,
      start_time: event.start_time?.slice(0, 5) ?? "18:00",
      price: String(event.price ?? 0),
      capacity: String(event.capacity ?? 100),
      xp_reward: String(event.xp_reward ?? 50),
      is_published: event.is_published,
      event_type: event.event_type ?? "ticketed",
      speaker: event.speaker ?? "",
      agenda: event.agenda ?? "",
    });
    setOpen(true);
  };

  const totalRegistrations = Object.values(counts).reduce((a, b) => a + b, 0);

  if (role !== "organiser") {
    return (
      <div className="mx-auto max-w-md px-4 py-24 text-center">
        <h1 className="text-2xl">Organiser access only</h1>
        <p className="mt-3 text-sm text-muted-foreground">
          This dashboard is for organiser accounts. Sign in with an organiser account to manage
          events.
        </p>
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-10 sm:px-6">
      <Reveal className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="font-display text-xs uppercase tracking-[0.2em] text-primary">
            Organiser dashboard
          </p>
          <h1 className="mt-1 text-3xl sm:text-4xl">
            {profile?.full_name ?? profile?.username ?? "Organiser"}
          </h1>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" asChild>
            <Link to="/scan">
              <QrCode className="mr-2 h-4 w-4" /> Scan tickets
            </Link>
          </Button>
          <Button variant="outline" asChild>
            <Link to="/my-reels">
              <Clapperboard className="mr-2 h-4 w-4" /> Manage reels
            </Link>
          </Button>
          <Dialog
            open={open}
            onOpenChange={(v) => {
              setOpen(v);
              if (!v) {
                setEditing(null);
                setForm({ ...emptyForm });
              }
            }}
          >
          <DialogTrigger asChild>
            <Button>
              <CalendarPlus className="mr-2 h-4 w-4" /> Create event
            </Button>
          </DialogTrigger>
          <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-lg">
            <DialogHeader>
              <DialogTitle className="font-display">
                {editing ? "Edit event" : "Create event"}
              </DialogTitle>
            </DialogHeader>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                upsert.mutate();
              }}
              className="space-y-4"
            >
              <div className="space-y-2">
                <Label htmlFor="title">Event title</Label>
                <Input
                  id="title"
                  required
                  value={form.title}
                  onChange={(e) => set("title", e.target.value)}
                  className="bg-surface-2"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  rows={3}
                  value={form.description}
                  onChange={(e) => set("description", e.target.value)}
                  className="bg-surface-2"
                />
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="ev-type">Event type</Label>
                  <Select value={form.event_type} onValueChange={(v) => set("event_type", v)}>
                    <SelectTrigger id="ev-type" className="bg-surface-2">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {EVENT_TYPES.map((t) => (
                        <SelectItem key={t.value} value={t.value}>
                          {t.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="speaker">Speaker / host (optional)</Label>
                  <Input
                    id="speaker"
                    value={form.speaker}
                    onChange={(e) => set("speaker", e.target.value)}
                    placeholder="e.g. Prof. Dlamini"
                    className="bg-surface-2"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="agenda">Agenda / event details (optional)</Label>
                <Textarea
                  id="agenda"
                  rows={3}
                  value={form.agenda}
                  onChange={(e) => set("agenda", e.target.value)}
                  placeholder="Line-up, agenda items or rally programme"
                  className="bg-surface-2"
                />
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="event_date">Date</Label>
                  <Input
                    id="event_date"
                    type="date"
                    required
                    value={form.event_date}
                    onChange={(e) => set("event_date", e.target.value)}
                    className="bg-surface-2"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="start_time">Start time</Label>
                  <Input
                    id="start_time"
                    type="time"
                    required
                    value={form.start_time}
                    onChange={(e) => set("start_time", e.target.value)}
                    className="bg-surface-2"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="location">Venue</Label>
                <Input
                  id="location"
                  required
                  value={form.location}
                  onChange={(e) => set("location", e.target.value)}
                  className="bg-surface-2"
                />
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="ev-institution">Institution</Label>
                  <Select value={form.institution} onValueChange={(v) => set("institution", v)}>
                    <SelectTrigger id="ev-institution" className="bg-surface-2">
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
                  <Label htmlFor="ev-category">Category</Label>
                  <Select value={form.category} onValueChange={(v) => set("category", v)}>
                    <SelectTrigger id="ev-category" className="bg-surface-2">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {CATEGORIES.map((c) => (
                        <SelectItem key={c} value={c}>
                          {c}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid gap-4 sm:grid-cols-3">
                {form.event_type === "ticketed" ? (
                  <div className="space-y-2">
                    <Label htmlFor="price">Price (R)</Label>
                    <Input
                      id="price"
                      type="number"
                      min="0"
                      step="1"
                      value={form.price}
                      onChange={(e) => set("price", e.target.value)}
                      className="bg-surface-2"
                    />
                  </div>
                ) : (
                  <div className="flex items-end space-y-2 pb-1 text-xs text-muted-foreground">
                    Seminars and rallies are free — students RSVP instead of buying a ticket.
                  </div>
                )}
                <div className="space-y-2">
                  <Label htmlFor="capacity">Capacity</Label>
                  <Input
                    id="capacity"
                    type="number"
                    min="1"
                    value={form.capacity}
                    onChange={(e) => set("capacity", e.target.value)}
                    className="bg-surface-2"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="xp_reward">XP reward</Label>
                  <Input
                    id="xp_reward"
                    type="number"
                    min="0"
                    value={form.xp_reward}
                    onChange={(e) => set("xp_reward", e.target.value)}
                    className="bg-surface-2"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="poster_url">Poster image URL</Label>
                <Input
                  id="poster_url"
                  value={form.poster_url}
                  onChange={(e) => set("poster_url", e.target.value)}
                  placeholder="https://…"
                  className="bg-surface-2"
                />
              </div>
              <label className="flex items-center gap-3 text-sm">
                <input
                  type="checkbox"
                  checked={form.is_published}
                  onChange={(e) => set("is_published", e.target.checked)}
                  className="h-4 w-4 accent-[var(--color-primary)]"
                />
                Visible to students
              </label>
              <Button type="submit" className="w-full" disabled={upsert.isPending}>
                {upsert.isPending ? "Saving…" : editing ? "Save changes" : "Publish event"}
              </Button>
            </form>
          </DialogContent>
          </Dialog>
        </div>
      </Reveal>

      <div className="mt-8 grid gap-4 sm:grid-cols-3">
        {[
          { label: "Your events", value: events.length, icon: CalendarPlus },
          { label: "Registrations", value: totalRegistrations, icon: Users },
          {
            label: "XP issued",
            value: events.reduce((sum, e) => sum + (counts[e.id] ?? 0) * (e.xp_reward ?? 0), 0),
            icon: Zap,
          },
        ].map((s, i) => (
          <Reveal key={s.label} delay={i * 70} className="panel p-5">
            <s.icon className="h-5 w-5 text-primary" />
            <p className="mt-3 font-display text-3xl">{s.value}</p>
            <p className="text-xs uppercase tracking-widest text-muted-foreground">{s.label}</p>
          </Reveal>
        ))}
      </div>

      <section className="mt-12">
        <Reveal>
          <h2 className="text-2xl">Your events</h2>
        </Reveal>
        {isLoading ? (
          <div className="mt-4 space-y-3">
            {[0, 1].map((i) => (
              <div key={i} className="panel h-24 animate-pulse" />
            ))}
          </div>
        ) : events.length === 0 ? (
          <Reveal className="panel mt-4 p-10 text-center text-sm text-muted-foreground">
            No events yet — create your first one.
          </Reveal>
        ) : (
          <ul className="mt-4 space-y-3">
            {events.map((e, i) => (
              <Reveal as="li" key={e.id} delay={Math.min(i, 6) * 50}>
                <div className="panel p-4">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div className="min-w-0">
                      <p className="font-display text-xs uppercase tracking-widest text-primary">
                        {eventTypeLabel(e.event_type)} · {e.category} · {e.institution}
                        {!e.is_published && " · hidden"}
                      </p>
                      <p className="truncate font-display text-lg">{e.title}</p>
                      <p className="mt-1 text-xs text-muted-foreground">
                        {formatDate(e.event_date)} · {e.start_time?.slice(0, 5)} · {e.location} ·{" "}
                        {formatPrice(Number(e.price))} · {counts[e.id] ?? 0}/{e.capacity} registered
                      </p>
                    </div>
                    <div className="flex shrink-0 gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setSelectedEvent(selectedEvent === e.id ? null : e.id)}
                      >
                        <Users className="mr-2 h-4 w-4" />
                        {selectedEvent === e.id ? "Hide" : "Attendees"}
                      </Button>
                      <Button size="sm" variant="outline" onClick={() => startEdit(e)}>
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        aria-label="Delete event"
                        onClick={() => remove.mutate(e.id)}
                        disabled={remove.isPending}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>

                  {selectedEvent === e.id && (
                    <div className="mt-4 overflow-x-auto rounded-xl border border-border">
                      <table className="w-full text-left text-sm">
                        <thead className="bg-surface-2 font-display text-[11px] uppercase tracking-widest text-muted-foreground">
                          <tr>
                            <th className="px-3 py-2">Student</th>
                            <th className="px-3 py-2">Institution</th>
                            <th className="px-3 py-2">Ticket</th>
                             <th className="px-3 py-2">Registered</th>
                             <th className="px-3 py-2">Check-in</th>
                           </tr>
                         </thead>
                         <tbody>
                           {attendees.length === 0 ? (
                             <tr>
                               <td
                                 colSpan={5}
                                 className="px-3 py-4 text-center text-muted-foreground"
                               >
                                 No registrations yet.
                               </td>
                             </tr>
                           ) : (
                             attendees.map((a) => (
                               <tr key={a.id} className="border-t border-border">
                                 <td className="px-3 py-2">
                                   {a.profile?.student_number ?? a.profile?.username ?? "—"}
                                 </td>
                                 <td className="px-3 py-2 text-muted-foreground">
                                   {a.profile?.institution ?? "—"}
                                 </td>
                                 <td className="px-3 py-2 text-primary">{a.ticket_no}</td>
                                 <td className="px-3 py-2 text-muted-foreground">
                                   {new Date(a.created_at).toLocaleDateString("en-ZA")}
                                 </td>
                                 <td className="px-3 py-2">
                                   {a.attended ? (
                                     <span className="font-display text-[11px] uppercase tracking-widest text-primary">
                                       Scanned
                                     </span>
                                   ) : (
                                     <span className="text-xs text-muted-foreground">Pending</span>
                                   )}
                                 </td>
                               </tr>
                             ))
                          )}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              </Reveal>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
