import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link, createFileRoute } from "@tanstack/react-router";
import { Flag, Heart, MessageCircle, Plus, Send, Trash2, Video } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { Reveal } from "@/components/Reveal";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
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
import { REPORT_REASONS } from "@/lib/collaxp";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/reels")({
  head: () => ({
    meta: [
      { title: "Campus Reels — COLLAXP" },
      {
        name: "description",
        content:
          "Watch short campus reels from event organisers on COLLAXP — like, comment, report and jump straight to the event behind the video.",
      },
      { property: "og:title", content: "Campus Reels — COLLAXP" },
      {
        property: "og:description",
        content: "Short campus event videos from organisers on COLLAXP.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: ReelsFeed,
});

type ReelRow = {
  id: string;
  organiser_id: string;
  event_id: string | null;
  title: string;
  caption: string;
  video_url: string;
  thumbnail_url: string | null;
  created_at: string;
  playbackUrl: string;
  organiserName: string;
  institution: string;
  eventTitle: string | null;
  likeCount: number;
  likedByMe: boolean;
};

export function useReelsFeed() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["reels-feed", user?.id ?? "anon"],
    queryFn: async (): Promise<ReelRow[]> => {
      const { data: reels, error } = await supabase
        .from("reels")
        .select("id,organiser_id,event_id,title,caption,video_url,thumbnail_url,created_at")
        .eq("is_published", true)
        .order("created_at", { ascending: false })
        .limit(50);
      if (error) throw error;
      if (!reels || reels.length === 0) return [];

      const organiserIds = [...new Set(reels.map((r) => r.organiser_id))];
      const eventIds = [...new Set(reels.map((r) => r.event_id).filter(Boolean))] as string[];
      const reelIds = reels.map((r) => r.id);

      const [{ data: profiles }, { data: events }, { data: likes }, signed] = await Promise.all([
        supabase.from("public_profiles").select("id,username,full_name,institution").in("id", organiserIds),
        eventIds.length
          ? supabase.from("events").select("id,title").in("id", eventIds)
          : Promise.resolve({ data: [] as { id: string; title: string }[] }),
        supabase.from("reel_likes").select("reel_id,user_id").in("reel_id", reelIds),
        supabase.storage
          .from("reels")
          .createSignedUrls(
            reels.map((r) => r.video_url),
            60 * 60 * 4,
          ),
      ]);

      const profileMap = new Map((profiles ?? []).map((p) => [p.id, p]));
      const eventMap = new Map((events ?? []).map((e) => [e.id, e.title]));
      const signedMap = new Map(
        (signed.data ?? []).map((s, i) => [reels[i]!.video_url, s.signedUrl]),
      );

      return reels.map((r) => {
        const reelLikes = (likes ?? []).filter((l) => l.reel_id === r.id);
        const profile = profileMap.get(r.organiser_id);
        return {
          ...r,
          playbackUrl: signedMap.get(r.video_url) ?? "",
          organiserName: profile?.full_name ?? profile?.username ?? "Organiser",
          institution: profile?.institution ?? "",
          eventTitle: r.event_id ? (eventMap.get(r.event_id) ?? null) : null,
          likeCount: reelLikes.length,
          likedByMe: Boolean(user?.id && reelLikes.some((l) => l.user_id === user.id)),
        };
      });
    },
  });
}

function ReelsFeed() {
  const { data: reels = [], isLoading } = useReelsFeed();
  const { user } = useAuth();

  return (
    <div className="mx-auto w-full max-w-2xl px-4 py-10 sm:px-6">
      <Reveal className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="font-display text-xs uppercase tracking-[0.2em] text-primary">
            Campus reels
          </p>
          <h1 className="mt-1 text-3xl sm:text-4xl">Reels</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Short clips from students and organisers — tap through to the event behind each one.
          </p>
        </div>
        {user && (
          <Button asChild>
            <Link to="/my-reels">
              <Plus className="mr-2 h-4 w-4" /> Post a reel
            </Link>
          </Button>
        )}
      </Reveal>

      {isLoading ? (
        <div className="mt-8 space-y-6">
          {[0, 1].map((i) => (
            <div key={i} className="panel h-[420px] animate-pulse" />
          ))}
        </div>
      ) : reels.length === 0 ? (
        <Reveal className="panel mt-8 p-10 text-center">
          <Video className="mx-auto h-6 w-6 text-primary" />
          <p className="mt-3 font-display text-lg">No reels yet</p>
          <p className="mt-2 text-sm text-muted-foreground">
            Organisers haven&apos;t posted any reels yet. Check back soon.
          </p>
        </Reveal>
      ) : (
        <div className="mt-8 space-y-8">
          {reels.map((reel, i) => (
            <Reveal key={reel.id} delay={Math.min(i, 4) * 70}>
              <ReelCard reel={reel} />
            </Reveal>
          ))}
        </div>
      )}
    </div>
  );
}

function ReelCard({ reel }: { reel: ReelRow }) {
  const { user, profile } = useAuth();
  const queryClient = useQueryClient();
  const [showComments, setShowComments] = useState(false);
  const [comment, setComment] = useState("");
  const [reportOpen, setReportOpen] = useState(false);
  const [reason, setReason] = useState(REPORT_REASONS[0]!);
  const [details, setDetails] = useState("");

  const invalidate = () => {
    void queryClient.invalidateQueries({ queryKey: ["reels-feed"] });
  };

  const { data: comments = [] } = useQuery({
    queryKey: ["reel-comments", reel.id],
    enabled: showComments,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("reel_comments")
        .select("id,body,created_at,user_id")
        .eq("reel_id", reel.id)
        .order("created_at", { ascending: true });
      if (error) throw error;
      const ids = [...new Set((data ?? []).map((c) => c.user_id))];
      const { data: authors } = ids.length
        ? await supabase.from("public_profiles").select("id,username,full_name").in("id", ids)
        : { data: [] };
      const map = new Map((authors ?? []).map((a) => [a.id, a]));
      return (data ?? []).map((c) => ({
        ...c,
        author: map.get(c.user_id)?.username ?? map.get(c.user_id)?.full_name ?? "Student",
      }));
    },
  });

  const toggleLike = useMutation({
    mutationFn: async () => {
      if (!user) throw new Error("Sign in to like reels");
      if (reel.likedByMe) {
        const { error } = await supabase
          .from("reel_likes")
          .delete()
          .eq("reel_id", reel.id)
          .eq("user_id", user.id);
        if (error) throw error;
        return;
      }
      const { error } = await supabase
        .from("reel_likes")
        .insert({ reel_id: reel.id, user_id: user.id });
      if (error) throw error;
    },
    onSuccess: invalidate,
    onError: (e: Error) => toast.error(e.message),
  });

  const addComment = useMutation({
    mutationFn: async () => {
      if (!user) throw new Error("Sign in to comment");
      const body = comment.trim();
      if (!body) throw new Error("Write something first");
      const { error } = await supabase
        .from("reel_comments")
        .insert({ reel_id: reel.id, user_id: user.id, body });
      if (error) throw error;
    },
    onSuccess: () => {
      setComment("");
      void queryClient.invalidateQueries({ queryKey: ["reel-comments", reel.id] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const deleteComment = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("reel_comments").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Comment deleted");
      void queryClient.invalidateQueries({ queryKey: ["reel-comments", reel.id] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const report = useMutation({
    mutationFn: async () => {
      if (!user) throw new Error("Sign in to report content");
      const { error } = await supabase.from("content_reports").insert({
        reporter_id: user.id,
        reel_id: reel.id,
        reason,
        details: details.trim(),
      });
      if (error) throw error;
    },
    onSuccess: () => {
      setReportOpen(false);
      setDetails("");
      toast.success("Report submitted", { description: "Thanks — our team will review it." });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <article className="panel overflow-hidden">
      <div className="flex items-center gap-3 p-4">
        <div className="flex h-9 w-9 items-center justify-center rounded-full bg-[var(--gradient-neon)] font-display text-xs text-primary-foreground">
          {reel.organiserName.slice(0, 2).toUpperCase()}
        </div>
        <div className="min-w-0">
          <p className="truncate font-display text-sm">{reel.organiserName}</p>
          <p className="truncate text-[11px] uppercase tracking-widest text-muted-foreground">
            {reel.institution || "COLLAXP"}
          </p>
        </div>
      </div>

      <div className="relative aspect-[9/12] bg-black sm:aspect-video">
        <video
          src={reel.playbackUrl}
          poster={reel.thumbnail_url ?? undefined}
          controls
          playsInline
          preload="metadata"
          className="h-full w-full object-contain"
        />
      </div>

      <div className="space-y-3 p-4">
        <h2 className="font-display text-lg">{reel.title}</h2>
        {reel.caption && <p className="text-sm text-muted-foreground">{reel.caption}</p>}
        {reel.event_id && (
          <Link
            to="/events/$eventId"
            params={{ eventId: reel.event_id }}
            className="inline-flex font-display text-xs uppercase tracking-widest text-primary hover:underline"
          >
            View event: {reel.eventTitle ?? "details"}
          </Link>
        )}

        <div className="flex items-center gap-1 pt-1">
          <Button
            variant="ghost"
            size="sm"
            aria-label="Like reel"
            onClick={() => toggleLike.mutate()}
          >
            <Heart
              className={cn(
                "mr-2 h-4 w-4 transition-transform duration-300",
                reel.likedByMe && "scale-110 fill-current text-primary",
              )}
            />
            {reel.likeCount}
          </Button>
          <Button
            variant="ghost"
            size="sm"
            aria-label="Show comments"
            onClick={() => setShowComments((v) => !v)}
          >
            <MessageCircle className="mr-2 h-4 w-4" />
            {showComments ? "Hide" : "Comments"}
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="ml-auto text-muted-foreground"
            aria-label="Report reel"
            onClick={() => setReportOpen(true)}
          >
            <Flag className="h-4 w-4" />
          </Button>
        </div>

        {showComments && (
          <div className="space-y-3 border-t border-border/60 pt-3">
            {comments.length === 0 ? (
              <p className="text-sm text-muted-foreground">No comments yet.</p>
            ) : (
              <ul className="space-y-3">
                {comments.map((c) => (
                  <li key={c.id} className="flex items-start gap-2 text-sm">
                    <div className="min-w-0 flex-1">
                      <p className="font-display text-xs uppercase tracking-widest text-primary">
                        @{c.author}
                      </p>
                      <p className="text-muted-foreground">{c.body}</p>
                    </div>
                    {(c.user_id === user?.id || reel.organiser_id === user?.id) && (
                      <button
                        aria-label="Delete comment"
                        className="text-muted-foreground transition-colors hover:text-destructive"
                        onClick={() => deleteComment.mutate(c.id)}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    )}
                  </li>
                ))}
              </ul>
            )}

            {user ? (
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  addComment.mutate();
                }}
                className="flex gap-2"
              >
                <Input
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                  placeholder={`Comment as @${profile?.username ?? profile?.student_number ?? "you"}`}
                  aria-label="Write a comment"
                  className="bg-surface-2"
                />
                <Button type="submit" size="icon" disabled={addComment.isPending}>
                  <Send className="h-4 w-4" />
                </Button>
              </form>
            ) : (
              <p className="text-sm text-muted-foreground">
                <Link to="/student-login" className="text-primary hover:underline">
                  Sign in
                </Link>{" "}
                to like and comment.
              </p>
            )}
          </div>
        )}
      </div>

      <Dialog open={reportOpen} onOpenChange={setReportOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="font-display">Report this reel</DialogTitle>
          </DialogHeader>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              report.mutate();
            }}
            className="space-y-4"
          >
            <div className="space-y-2">
              <Label htmlFor={`reason-${reel.id}`}>Reason</Label>
              <Select value={reason} onValueChange={setReason}>
                <SelectTrigger id={`reason-${reel.id}`} className="bg-surface-2">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {REPORT_REASONS.map((r) => (
                    <SelectItem key={r} value={r}>
                      {r}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor={`details-${reel.id}`}>More detail (optional)</Label>
              <Textarea
                id={`details-${reel.id}`}
                rows={3}
                value={details}
                onChange={(e) => setDetails(e.target.value)}
                className="bg-surface-2"
              />
            </div>
            <Button type="submit" className="w-full" disabled={report.isPending}>
              {report.isPending ? "Sending…" : "Submit report"}
            </Button>
          </form>
        </DialogContent>
      </Dialog>
    </article>
  );
}
