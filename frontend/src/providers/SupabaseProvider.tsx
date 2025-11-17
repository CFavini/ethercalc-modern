"use client";

import { createContext, useContext, useMemo } from "react";
import { createClient, SupabaseClient } from "@supabase/supabase-js";

type SupabaseContextType = {
  supabase: SupabaseClient;
};

const SupabaseContext = createContext<SupabaseContextType | null>(null);

export default function SupabaseProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = useMemo(() => {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    if (!url) {
      console.error("❌ NEXT_PUBLIC_SUPABASE_URL faltando!");
    }

    if (!key) {
      console.error("❌ NEXT_PUBLIC_SUPABASE_ANON_KEY faltando!");
    }

    return createClient(url!, key!, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
      },
    });
  }, []);

  return (
    <SupabaseContext.Provider value={{ supabase }}>
      {children}
    </SupabaseContext.Provider>
  );
}

export function useSupabase() {
  const ctx = useContext(SupabaseContext);
  if (!ctx) throw new Error("useSupabase deve ser usado dentro do SupabaseProvider");
  return ctx;
}

