import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

interface UseIsAdminResult {
  isAdmin: boolean;
  isLoading: boolean;
  userId: string | null;
  role: string | null;
}

export const useIsAdmin = (): UseIsAdminResult => {
  const [isAdmin, setIsAdmin] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);
  const [role, setRole] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    const loadRole = async (uid?: string | null) => {
      const resolvedId = uid ?? (await supabase.auth.getUser()).data.user?.id ?? null;
      if (!isMounted) return;

      setUserId(resolvedId);
      if (!resolvedId) {
        setRole(null);
        setIsAdmin(false);
        setIsLoading(false);
        return;
      }

      const { data, error } = await supabase
        .from("profiles")
        .select("role")
        .eq("user_id", resolvedId)
        .maybeSingle();

      if (!isMounted) return;

      if (error) {
        setRole(null);
        setIsAdmin(false);
        setIsLoading(false);
        return;
      }

      const roleValue = data?.role ?? null;
      setRole(roleValue);
      setIsAdmin(roleValue === "ADMIN");
      setIsLoading(false);
    };

    void loadRole();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      void loadRole(session?.user?.id ?? null);
    });

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, []);

  return { isAdmin, isLoading, userId, role };
};
