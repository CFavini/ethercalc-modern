import { Router } from "express";
import { requireUser } from "../middleware/auth.ts.old";
import {
  getSpreadsheet,
  updateSpreadsheet,
} from "../services/spreadsheetService";

export const spreadsheetRouter = Router();

spreadsheetRouter.get("/:id", requireUser, async (req, res) => {
  const { id } = req.params;
  const { data, error } = await getSpreadsheet(id);

  if (error) return res.status(404).json({ error });
  return res.json(data);
});

spreadsheetRouter.put("/:id", requireUser, async (req, res) => {
  const { id } = req.params;
  const updates = req.body;

  const { data, error } = await updateSpreadsheet(id, updates);
  if (error) return res.status(400).json({ error });

  return res.json(data);
});

