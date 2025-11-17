import { supabase } from "../config/supabase";

export class RealtimeService {
  
  // Registrar edição
  static async registerEdit(spreadsheetId: string, userId: string, cell: string, newValue: string) {
    const { data, error } = await supabase
      .from("realtime_edits")
      .insert({
        spreadsheet_id: spreadsheetId,
        user_id: userId,
        cell,
        new_value: newValue,
      })
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  // Listar histórico de edições
  static async getEdits(spreadsheetId: string) {
    const { data, error } = await supabase
      .from("realtime_edits")
      .select("*")
      .eq("spreadsheet_id", spreadsheetId)
      .order("timestamp", { ascending: false });

    if (error) throw error;
    return data;
  }
}
