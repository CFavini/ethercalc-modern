import { Router } from "express";
import { RealtimeService } from "../services/realtime.service";

export const realtimeRouter = Router();

// Registrar edição
realtimeRouter.post("/edit", async (req, res) => {
  try {
    const { spreadsheetId, userId, cell, newValue } = req.body;

    const result = await RealtimeService.registerEdit(
      spreadsheetId,
      userId,
      cell,
      newValue
    );

    return res.json(result);
  } catch (err: any) {
    return res.status(400).json({ error: err.message });
  }
});

// Obter histórico de edições
realtimeRouter.get("/history/:id", async (req, res) => {
  try {
    const spreadsheetId = req.params.id;

    const result = await RealtimeService.getEdits(spreadsheetId);

    return res.json(result);
  } catch (err: any) {
    return res.status(400).json({ error: err.message });
  }
});
