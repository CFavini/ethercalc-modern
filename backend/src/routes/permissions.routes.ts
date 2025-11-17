import { Router } from "express";
import { PermissionsService } from "../services/permissions.service";

export const permissionsRouter = Router();

// Conceder permissão
permissionsRouter.post("/grant", async (req, res) => {
  try {
    const { spreadsheetId, userId, role } = req.body;

    const result = await PermissionsService.grantPermission(
      spreadsheetId,
      userId,
      role
    );

    return res.json(result);
  } catch (err: any) {
    return res.status(400).json({ error: err.message });
  }
});

// Atualizar permissão
permissionsRouter.put("/update", async (req, res) => {
  try {
    const { permissionId, role } = req.body;

    const result = await PermissionsService.updatePermission(
      permissionId,
      role
    );

    return res.json(result);
  } catch (err: any) {
    return res.status(400).json({ error: err.message });
  }
});

// Revogar permissão
permissionsRouter.delete("/revoke/:id", async (req, res) => {
  try {
    const permissionId = req.params.id;

    const result = await PermissionsService.revokePermission(permissionId);

    return res.json(result);
  } catch (err: any) {
    return res.status(400).json({ error: err.message });
  }
});

// Listar permissões da planilha
permissionsRouter.get("/list/:spreadsheetId", async (req, res) => {
  try {
    const spreadsheetId = req.params.spreadsheetId;

    const result = await PermissionsService.listPermissions(spreadsheetId);

    return res.json(result);
  } catch (err: any) {
    return res.status(400).json({ error: err.message });
  }
});
