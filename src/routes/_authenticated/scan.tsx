import { useQueryClient } from "@tanstack/react-query";
import { Link, createFileRoute } from "@tanstack/react-router";
import { CheckCircle2, Camera, CameraOff, QrCode, XCircle } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";

import { Reveal } from "@/components/Reveal";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { formatDate } from "@/lib/collaxp";

export const Route = createFileRoute("/_authenticated/scan")({
  head: () => ({
    meta: [
      { title: "Scan Tickets — COLLAXP" },
      {
        name: "description",
        content:
          "Organiser ticket scanner: check students in at the door by scanning their COLLAXP QR ticket.",
      },
      { property: "og:title", content: "Scan Tickets — COLLAXP" },
      {
        property: "og:description",
        content: "Check students in at the door with the COLLAXP QR ticket scanner.",
      },
    ],
  }),
  component: ScanPage,
});

type ScanResult = {
  ok: boolean;
  title: string;
  detail: string;
};

function parsePayload(text: string) {
  const parts = text.trim().split("|");
  if (parts[0] === "COLLAXP" && parts[1]) {
    return { registrationId: parts[1], ticketNo: parts[2] ?? "" };
  }
  return null;
}

function ScanPage() {
  const { role } = useAuth();
  const queryClient = useQueryClient();
  const [result, setResult] = useState<ScanResult | null>(null);
  const [scanning, setScanning] = useState(false);
  const [manual, setManual] = useState("");
  const [busy, setBusy] = useState(false);
  const scannerRef = useRef<{ stop: () => Promise<void>; clear: () => void } | null>(null);
  const lastRef = useRef<string>("");

  const checkIn = async (opts: { registrationId?: string; ticketNo?: string }) => {
    setBusy(true);
    try {
      let query = supabase
        .from("event_registrations")
        .select(
          "id,ticket_no,attended,scanned_at,event:events(id,title,event_date,start_time,organiser_id),profile:profiles(student_number,username,full_name)",
        );
      query = opts.registrationId
        ? query.eq("id", opts.registrationId)
        : query.eq("ticket_no", opts.ticketNo!);

      const { data, error } = await query.limit(1).maybeSingle();
      if (error) throw error;
      if (!data) {
        setResult({
          ok: false,
          title: "Ticket not recognised",
          detail: "This ticket does not belong to any of your events.",
        });
        return;
      }

      const reg = data as unknown as {
        id: string;
        ticket_no: string;
        attended: boolean;
        scanned_at: string | null;
        event: { title: string; event_date: string; start_time: string } | null;
        profile: {
          student_number: string | null;
          username: string | null;
          full_name: string | null;
        } | null;
      };

      const who =
        reg.profile?.student_number ?? reg.profile?.full_name ?? reg.profile?.username ?? "Student";
      const when = reg.event
        ? `${formatDate(reg.event.event_date)} · ${reg.event.start_time?.slice(0, 5)}`
        : "";

      if (reg.attended) {
        setResult({
          ok: false,
          title: `Already checked in — ${reg.ticket_no}`,
          detail: `${who} was scanned${
            reg.scanned_at ? ` at ${new Date(reg.scanned_at).toLocaleTimeString("en-ZA")}` : ""
          }.`,
        });
        return;
      }

      const { error: updateError } = await supabase
        .from("event_registrations")
        .update({ attended: true, scanned_at: new Date().toISOString() })
        .eq("id", reg.id);
      if (updateError) throw updateError;

      setResult({
        ok: true,
        title: `Checked in — ${reg.ticket_no}`,
        detail: `${who} · ${reg.event?.title ?? ""}${when ? ` · ${when}` : ""}`,
      });
      void queryClient.invalidateQueries({ queryKey: ["organiser-attendees"] });
    } catch (e) {
      setResult({ ok: false, title: "Scan failed", detail: (e as Error).message });
    } finally {
      setBusy(false);
    }
  };

  const stopScanner = async () => {
    const scanner = scannerRef.current;
    scannerRef.current = null;
    setScanning(false);
    if (scanner) {
      try {
        await scanner.stop();
        scanner.clear();
      } catch {
        /* already stopped */
      }
    }
  };

  const startScanner = async () => {
    try {
      const { Html5Qrcode } = await import("html5-qrcode");
      const scanner = new Html5Qrcode("collaxp-scanner");
      scannerRef.current = scanner as unknown as { stop: () => Promise<void>; clear: () => void };
      setScanning(true);
      await scanner.start(
        { facingMode: "environment" },
        { fps: 10, qrbox: { width: 240, height: 240 } },
        (text) => {
          if (text === lastRef.current) return;
          lastRef.current = text;
          const parsed = parsePayload(text);
          if (!parsed) {
            setResult({
              ok: false,
              title: "Not a COLLAXP ticket",
              detail: "Ask the student to open their ticket QR from My Events.",
            });
            return;
          }
          void checkIn({ registrationId: parsed.registrationId });
        },
        () => {
          /* per-frame decode misses are expected */
        },
      );
    } catch (e) {
      setScanning(false);
      scannerRef.current = null;
      toast.error("Camera unavailable", {
        description: (e as Error).message || "Use manual ticket entry instead.",
      });
    }
  };

  useEffect(() => {
    return () => {
      void stopScanner();
    };
  }, []);

  if (role && role !== "organiser") {
    return (
      <div className="mx-auto w-full max-w-xl px-4 py-24 text-center">
        <h1 className="text-2xl">Organisers only</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Ticket scanning is available on organiser accounts. Your own ticket QR codes live under My
          Events.
        </p>
        <Button className="mt-6" asChild>
          <Link to="/my-events">Go to My Events</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-10 sm:px-6">
      <Reveal>
        <h1 className="text-3xl sm:text-4xl">Scan tickets</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Point the camera at a student&apos;s ticket QR code to check them in, or type the ticket
          number.
        </p>
      </Reveal>

      <Reveal delay={80} className="panel mt-8 p-5">
        <div
          id="collaxp-scanner"
          className="mx-auto w-full max-w-sm overflow-hidden rounded-2xl bg-surface-2"
          style={{ minHeight: scanning ? 280 : 0 }}
        />
        <div className="mt-4 flex flex-wrap gap-2">
          {scanning ? (
            <Button variant="outline" onClick={() => void stopScanner()}>
              <CameraOff className="mr-2 h-4 w-4" /> Stop camera
            </Button>
          ) : (
            <Button onClick={() => void startScanner()}>
              <Camera className="mr-2 h-4 w-4" /> Start camera scan
            </Button>
          )}
          <Button variant="ghost" asChild>
            <Link to="/organiser">Back to dashboard</Link>
          </Button>
        </div>
      </Reveal>

      <Reveal delay={140} className="panel mt-6 p-5">
        <Label htmlFor="ticket">Manual ticket number</Label>
        <form
          className="mt-2 flex flex-col gap-2 sm:flex-row"
          onSubmit={(e) => {
            e.preventDefault();
            const value = manual.trim();
            if (!value) return;
            void checkIn({ ticketNo: value.startsWith("#") ? value : `#${value}` });
            setManual("");
          }}
        >
          <Input
            id="ticket"
            value={manual}
            onChange={(e) => setManual(e.target.value)}
            placeholder="#1234"
          />
          <Button type="submit" disabled={busy || !manual.trim()}>
            <QrCode className="mr-2 h-4 w-4" /> Check in
          </Button>
        </form>
      </Reveal>

      {result && (
        <div
          className={`panel mt-6 flex items-start gap-3 p-5 ${
            result.ok ? "border-primary/50" : "border-destructive/50"
          }`}
        >
          {result.ok ? (
            <CheckCircle2 className="mt-0.5 h-5 w-5 text-primary" />
          ) : (
            <XCircle className="mt-0.5 h-5 w-5 text-destructive" />
          )}
          <div>
            <p className="font-display text-lg">{result.title}</p>
            <p className="mt-1 text-sm text-muted-foreground">{result.detail}</p>
          </div>
        </div>
      )}
    </div>
  );
}
