import { supabase } from "../config/supabase";

export class PermissionsService {
  
  // Conceder permissão a outro usuário
  static async grantPermission(spreadsheetId: string, userId: string, role: string) {
    const { data, error } = await supabase
      .from("spreadsheet_permissions")
      .insert({ spreadsheet_id: spreadsheetId, user_id: userId, role })
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  // Atualizar permissão existente
  static async updatePermission(permissionId: string, role: string) {
    const { data, error } = await supabase
      .from("spreadsheet_permissions")
      .update({ role })
      .eq("id", permissionId)
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  // Remover permissão
  static async revokePermission(permissionId: string) {
    const { error } = await supabase
      .from("spreadsheet_permissions")
      .delete()
      .eq("id", permissionId);

    if (error) throw error;
    return { success: true };
  }

  // Listar permissões de uma planilha
  static async listPermissions(spreadsheetId: string) {
    const { data, error } = await supabase
      .from("spreadsheet_permissions")
      .select("id, user_id, role, created_at")
      .eq("spreadsheet_id", spreadsheetId);

    if (error) throw error;
    return data;
  }
}
