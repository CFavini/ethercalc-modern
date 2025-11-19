import { supabase } from "../supabaseClient";

export async function getPermissions(sheetId: string) {
  return supabase
    .from("spreadsheet_permissions")
    .select("*")
    .eq("sheet_id", sheetId);
}

