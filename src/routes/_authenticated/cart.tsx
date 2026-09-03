import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Link, createFileRoute, useNavigate } from "@tanstack/react-router";
import { Minus, Plus, ShoppingBag, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { Reveal } from "@/components/Reveal";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { useCartItems } from "@/hooks/useCart";
import { supabase } from "@/integrations/supabase/client";
import { formatDate, formatPrice } from "@/lib/collaxp";

export const Route = createFileRoute("/_authenticated/cart")({
  head: () => ({
    meta: [
      { title: "Ticket Cart — COLLAXP" },
      {
        name: "description",
        content:
          "Review the campus event tickets in your COLLAXP cart, adjust quantities and check out to get your ticket numbers instantly.",
      },
      { property: "og:title", content: "Ticket Cart — COLLAXP" },
      {
        property: "og:description",
        content: "Review and check out your COLLAXP campus event tickets.",
      },
    ],
  }),
  component: CartPage,
});

function CartPage() {
  const { user } = useAuth();
  const { data: items = [], isLoading } = useCartItems();
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  const total = items.reduce((sum, row) => sum + row.quantity * Number(row.event?.price ?? 0), 0);
  const totalXp = items.reduce(
    (sum, row) => sum + row.quantity * Number(row.event?.xp_reward ?? 0),
    0,
  );

  const invalidate = () => {
    void queryClient.invalidateQueries({ queryKey: ["cart"] });
  };

  const setQuantity = useMutation({
    mutationFn: async ({ id, quantity }: { id: string; quantity: number }) => {
      if (quantity < 1) {
        const { error } = await supabase.from("cart_items").delete().eq("id", id);
        if (error) throw error;
        return;
      }
      const { error } = await supabase
        .from("cart_items")
        .update({ quantity: Math.min(10, quantity) })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: invalidate,
    onError: (e: Error) => toast.error(e.message),
  });

  const removeItem = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("cart_items").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Removed from cart");
      invalidate();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const checkout = useMutation({
    mutationFn: async () => {
      const { data: order, error: orderError } = await supabase
        .from("orders")
        .insert({ user_id: user!.id, total, status: "paid" })
        .select("id")
        .single();
      if (orderError) throw orderError;

      const { error: itemsError } = await supabase.from("order_items").insert(
        items.map((row) => ({
          order_id: order.id,
          event_id: row.event_id,
          quantity: row.quantity,
          unit_price: Number(row.event?.price ?? 0),
        })),
      );
      if (itemsError) throw itemsError;

      const registrations = items.flatMap((row) =>
        Array.from({ length: row.quantity }, () => ({
          event_id: row.event_id,
          user_id: user!.id,
        })),
      );
      const { error: regError } = await supabase
        .from("event_registrations")
        .insert(registrations);
      if (regError) throw regError;

      const { error: clearError } = await supabase
        .from("cart_items")
        .delete()
        .eq("user_id", user!.id);
      if (clearError) throw clearError;
    },
    onSuccess: () => {
      toast.success("Order complete", { description: "Your tickets are in My Events." });
      invalidate();
      void queryClient.invalidateQueries({ queryKey: ["my-events"] });
      void queryClient.invalidateQueries({ queryKey: ["notifications"] });
      void navigate({ to: "/my-events" });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div className="mx-auto w-full max-w-4xl px-4 py-10 sm:px-6">
      <Reveal>
        <p className="font-display text-xs uppercase tracking-[0.2em] text-primary">Checkout</p>
        <h1 className="mt-1 text-3xl sm:text-4xl">Ticket cart</h1>
      </Reveal>

      {isLoading ? (
        <div className="mt-8 space-y-3">
          {[0, 1].map((i) => (
            <div key={i} className="panel h-24 animate-pulse" />
          ))}
        </div>
      ) : items.length === 0 ? (
        <Reveal className="panel mt-8 p-10 text-center">
          <ShoppingBag className="mx-auto h-6 w-6 text-primary" />
          <p className="mt-3 font-display text-lg">Your cart is empty</p>
          <p className="mt-2 text-sm text-muted-foreground">
            Add tickets from any event page to check out here.
          </p>
          <Button className="mt-6" asChild>
            <Link to="/discover">Browse events</Link>
          </Button>
        </Reveal>
      ) : (
        <>
          <ul className="mt-8 space-y-3">
            {items.map((row, i) => (
              <Reveal as="li" key={row.id} delay={Math.min(i, 6) * 60}>
                <div className="panel flex flex-col gap-4 p-4 sm:flex-row sm:items-center">
                  <div className="h-20 w-24 shrink-0 overflow-hidden rounded-xl bg-surface-2">
                    {row.event?.poster_url ? (
                      <img
                        src={row.event.poster_url}
                        alt={row.event.title}
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center bg-[var(--gradient-neon)] font-display text-[10px] uppercase tracking-widest text-primary-foreground">
                        {row.event?.category}
                      </div>
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <Link
                      to="/events/$eventId"
                      params={{ eventId: row.event_id }}
                      className="truncate font-display text-lg hover:text-primary"
                    >
                      {row.event?.title ?? "Event"}
                    </Link>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {row.event ? formatDate(row.event.event_date) : ""} ·{" "}
                      {row.event?.start_time} · {row.event?.location}
                    </p>
                    <p className="mt-1 font-display text-sm text-primary">
                      {formatPrice(Number(row.event?.price ?? 0))} each
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      size="icon"
                      variant="outline"
                      aria-label="Decrease quantity"
                      onClick={() =>
                        setQuantity.mutate({ id: row.id, quantity: row.quantity - 1 })
                      }
                    >
                      <Minus className="h-4 w-4" />
                    </Button>
                    <span className="w-8 text-center font-display">{row.quantity}</span>
                    <Button
                      size="icon"
                      variant="outline"
                      aria-label="Increase quantity"
                      disabled={row.quantity >= 10}
                      onClick={() =>
                        setQuantity.mutate({ id: row.id, quantity: row.quantity + 1 })
                      }
                    >
                      <Plus className="h-4 w-4" />
                    </Button>
                    <Button
                      size="icon"
                      variant="ghost"
                      aria-label="Remove from cart"
                      onClick={() => removeItem.mutate(row.id)}
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                </div>
              </Reveal>
            ))}
          </ul>

          <Reveal delay={120} className="panel mt-6 space-y-4 p-6">
            <div className="flex items-center justify-between text-sm text-muted-foreground">
              <span>Tickets</span>
              <span>{items.reduce((s, r) => s + r.quantity, 0)}</span>
            </div>
            <div className="flex items-center justify-between text-sm text-muted-foreground">
              <span>XP you&apos;ll earn</span>
              <span className="text-primary">+{totalXp} XP</span>
            </div>
            <div className="flex items-center justify-between border-t border-border/60 pt-4 font-display text-xl">
              <span>Total</span>
              <span>{formatPrice(total)}</span>
            </div>
            <Button
              size="lg"
              className="w-full"
              disabled={checkout.isPending}
              onClick={() => checkout.mutate()}
            >
              {checkout.isPending ? "Processing…" : "Complete order"}
            </Button>
            <p className="text-center text-xs text-muted-foreground">
              Card payments are not enabled yet — orders are confirmed instantly and your ticket
              numbers appear in My Events.
            </p>
          </Reveal>
        </>
      )}
    </div>
  );
}
