import { supabase } from "../supabaseClient";

export function subscribeRealtime(sheetId: string, callback: Function) {
  return supabase
    .channel(`sheet:${sheetId}`)
    .on("postgres_changes", { event: "*", schema: "public" }, payload => {
      callback(payload);
    })
    .subscribe();
}
