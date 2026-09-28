import { useEffect, useState } from "react";
import type { Session } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

export function useSession() {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    let active = true;
    const load = async (next: Session | null) => {
      if (!active) return;
      setSession(next);
      if (next) {
        const { data } = await supabase.from("user_roles").select("role").eq("user_id", next.user.id);
        if (active) setIsAdmin(!!data?.some((r) => r.role === "admin"));
      } else setIsAdmin(false);
      if (active) setLoading(false);
    };
    supabase.auth.getSession().then(({ data }) => load(data.session));
    const { data: sub } = supabase.auth.onAuthStateChange((_e, next) => {
      setTimeout(() => load(next), 0);
    });
    return () => {
      active = false;
      sub.subscription.unsubscribe();
    };
  }, []);

  return { session, loading, isAdmin, user: session?.user ?? null };
}
