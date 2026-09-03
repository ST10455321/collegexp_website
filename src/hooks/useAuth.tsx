import { useQueryClient } from "@tanstack/react-query";
import type { Session, User } from "@supabase/supabase-js";
import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

import { supabase } from "@/integrations/supabase/client";

export type Profile = {
  id: string;
  student_number: string | null;
  email: string | null;
  full_name: string | null;
  username: string | null;
  institution: string | null;
  bio: string | null;
  avatar_url: string | null;
  course: string | null;
  graduation_date: string | null;
  xp: number;
  level: number;
};

type AuthValue = {
  loading: boolean;
  user: User | null;
  session: Session | null;
  profile: Profile | null;
  role: "student" | "organiser" | "admin" | null;
  refreshProfile: () => Promise<void>;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient();
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [role, setRole] = useState<AuthValue["role"]>(null);
  const [loading, setLoading] = useState(true);

  const loadDetails = async (userId: string | undefined) => {
    if (!userId) {
      setProfile(null);
      setRole(null);
      return;
    }
    const [{ data: prof }, { data: roles }] = await Promise.all([
      supabase.from("profiles").select("*").eq("id", userId).maybeSingle(),
      supabase.from("user_roles").select("role").eq("user_id", userId),
    ]);
    setProfile((prof as Profile) ?? null);
    const list = (roles ?? []).map((r) => r.role as string);
    setRole(
      list.includes("admin")
        ? "admin"
        : list.includes("organiser")
          ? "organiser"
          : list.includes("student")
            ? "student"
            : null,
    );
  };

  useEffect(() => {
    let active = true;

    const { data: sub } = supabase.auth.onAuthStateChange((event, next) => {
      if (!active) return;
      setSession(next);
      if (event === "SIGNED_OUT") {
        setProfile(null);
        setRole(null);
        return;
      }
      if (
        event === "SIGNED_IN" ||
        event === "USER_UPDATED" ||
        event === "INITIAL_SESSION"
      ) {
        void loadDetails(next?.user?.id);
      }
    });

    void (async () => {
      const { data } = await supabase.auth.getSession();
      if (!active) return;
      setSession(data.session);
      await loadDetails(data.session?.user?.id);
      setLoading(false);
    })();

    return () => {
      active = false;
      sub.subscription.unsubscribe();
    };
  }, []);

  const value = useMemo<AuthValue>(
    () => ({
      loading,
      session,
      user: session?.user ?? null,
      profile,
      role,
      refreshProfile: async () => {
        await loadDetails(session?.user?.id);
      },
      signOut: async () => {
        await queryClient.cancelQueries();
        queryClient.clear();
        await supabase.auth.signOut();
      },
    }),
    [loading, session, profile, role, queryClient],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside AuthProvider");
  return ctx;
}

export const STUDENT_EMAIL_PATTERN = /^ST\d{8}@rcconnect\.edu\.za$/i;

export function isValidStudentEmail(email: string) {
  return STUDENT_EMAIL_PATTERN.test(email.trim());
}
