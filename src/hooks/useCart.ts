import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";

export type CartRow = {
  id: string;
  quantity: number;
  event_id: string;
  event: {
    id: string;
    title: string;
    price: number;
    event_date: string;
    start_time: string;
    location: string;
    category: string;
    poster_url: string | null;
    xp_reward: number;
  } | null;
};

export function useCartItems() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["cart", user?.id],
    enabled: Boolean(user?.id),
    queryFn: async () => {
      const { data, error } = await supabase
        .from("cart_items")
        .select(
          "id,quantity,event_id,event:events(id,title,price,event_date,start_time,location,category,poster_url,xp_reward)",
        )
        .eq("user_id", user!.id)
        .order("created_at", { ascending: true });
      if (error) throw error;
      return (data ?? []) as unknown as CartRow[];
    },
  });
}

export function useCartCount() {
  const { data = [] } = useCartItems();
  return data.reduce((sum, row) => sum + row.quantity, 0);
}

export function useAddToCart() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ eventId, quantity }: { eventId: string; quantity: number }) => {
      const { data: existing } = await supabase
        .from("cart_items")
        .select("id,quantity")
        .eq("user_id", user!.id)
        .eq("event_id", eventId)
        .maybeSingle();

      if (existing) {
        const next = Math.min(10, existing.quantity + quantity);
        const { error } = await supabase
          .from("cart_items")
          .update({ quantity: next })
          .eq("id", existing.id);
        if (error) throw error;
        return;
      }
      const { error } = await supabase
        .from("cart_items")
        .insert({ user_id: user!.id, event_id: eventId, quantity });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Added to cart", { description: "Open your cart to check out." });
      void queryClient.invalidateQueries({ queryKey: ["cart"] });
    },
    onError: (error: Error) => toast.error(error.message),
  });
}
