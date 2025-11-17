import { supabase } from "../config/supabase";

export class SpreadsheetService {
  // Criar uma nova planilha
  static async createSpreadsheet(title: string, userId: string) {
    const { data, error } = await supabase
      .from("spreadsheets")
      .insert({ title, owner_id: userId })
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  // Listar planilhas de um usuário (owner ou com permissão)
  static async listUserSpreadsheets(userId: string) {
    const { data, error } = await supabase.rpc("get_user_spreadsheets", {
      input_user_id: userId,
    });

    if (error) throw error;
    return data;
  }

  // Obter uma planilha por ID
  static async getSpreadsheet(id: string, userId: string) {
    const { data, error } = await supabase
      .from("spreadsheets")
      .select("*")
      .eq("id", id)
      .single();

    if (error) throw error;

    // A verificação de permissão já é feita pelas policies
    return data;
  }

  // Renomear uma planilha
  static async renameSpreadsheet(id: string, title: string) {
    const { data, error } = await supabase
      .from("spreadsheets")
      .update({ title })
      .eq("id", id)
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  // Deletar planilha
  static async deleteSpreadsheet(id: string) {
    const { error } = await supabase
      .from("spreadsheets")
      .delete()
      .eq("id", id);

    if (error) throw error;
    return { success: true };
  }
}
