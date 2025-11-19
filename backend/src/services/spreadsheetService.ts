import { supabase } from "../supabaseClient";

export async function getSpreadsheet(id: string) {
  return supabase.from("sheets").select("*").eq("id", id).single();
}

export async function updateSpreadsheet(id: string, updates: any) {
  return supabase.from("sheets").update(updates).eq("id", id).select().single();
}
