import { useEffect, useState } from "react";
import QRCode from "qrcode";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

export function ticketPayload(registrationId: string, ticketNo: string) {
  return `COLLAXP|${registrationId}|${ticketNo}`;
}

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  registrationId: string;
  ticketNo: string;
  eventTitle: string;
  eventMeta?: string | undefined;
};

export function TicketQrDialog({
  open,
  onOpenChange,
  registrationId,
  ticketNo,
  eventTitle,
  eventMeta,
}: Props) {
  const [src, setSrc] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    let active = true;
    void QRCode.toDataURL(ticketPayload(registrationId, ticketNo), {
      width: 640,
      margin: 1,
      color: { dark: "#0b0510", light: "#ffffff" },
    }).then((url) => {
      if (active) setSrc(url);
    });
    return () => {
      active = false;
    };
  }, [open, registrationId, ticketNo]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle className="font-display">{eventTitle}</DialogTitle>
          <DialogDescription>
            Show this QR code at the door — the organiser scans it to check you in.
          </DialogDescription>
        </DialogHeader>
        <div className="flex flex-col items-center gap-4">
          <div className="rounded-2xl bg-white p-3">
            {src ? (
              <img src={src} alt={`QR code for ticket ${ticketNo}`} className="h-56 w-56" />
            ) : (
              <div className="h-56 w-56 animate-pulse rounded-xl bg-surface-2" />
            )}
          </div>
          <p className="rounded-full bg-primary/15 px-4 py-1 font-display text-sm uppercase tracking-widest text-primary">
            Ticket {ticketNo}
          </p>
          {eventMeta && <p className="text-center text-xs text-muted-foreground">{eventMeta}</p>}
        </div>
      </DialogContent>
    </Dialog>
  );
}
