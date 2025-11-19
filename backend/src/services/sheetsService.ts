import { supabase } from "../supabaseClient";

export async function listSheets(userId: string) {
  return supabase
    .from("sheets")
    .select("*")
    .eq("owner_id", userId)
    .order("created_at", { ascending: true });
}

export async function createSheet(userId: string, title: string) {
  return supabase
    .from("sheets")
    .insert({ owner_id: userId, title })
    .select()
    .single();
}

