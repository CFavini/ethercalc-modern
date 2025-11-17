import { supabase } from "@/lib/supabaseClient";

export async function listSheets() {
  const { data, error } = await supabase
    .from("sheets")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) throw error;
  return data;
}

export async function createSheet(title: string) {
  const { data: userData } = await supabase.auth.getUser();
  const user = userData?.user;

  if (!user) throw new Error("Usuário não autenticado");

  const { data, error } = await supabase
    .from("sheets")
    .insert([
      {
        owner: user.id,
        title,
      },
    ])
    .select()
    .single();

  if (error) throw error;
  return data;
}
