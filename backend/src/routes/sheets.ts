import { Router } from "express";
import { requireUser } from "../middleware/auth";
import { listSheets, createSheet } from "../services/sheetsService";

export const sheetsRouter = Router();

sheetsRouter.get("/", requireUser, async (req, res) => {
  const userId = (req as any).userId;

  const { data, error } = await listSheets(userId);
  if (error) return res.status(500).json({ error });

  return res.json(data);
});

sheetsRouter.post("/", requireUser, async (req, res) => {
  const userId = (req as any).userId;
  const { title } = req.body;

  if (!title) return res.status(400).json({ error: "Título é obrigatório" });

  const { data, error } = await createSheet(userId, title);
  if (error) return res.status(500).json({ error });

  return res.json(data);
});

