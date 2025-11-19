import { Router } from "express";
import { requireUser } from "../middleware/auth.ts.old";
import { getPermissions } from "../services/permissionsService";

export const permissionsRouter = Router();

permissionsRouter.get("/:sheetId", requireUser, async (req, res) => {
  const { sheetId } = req.params;

  const { data, error } = await getPermissions(sheetId);
  if (error) return res.status(500).json({ error });

  return res.json(data);
});

