import { Router } from "express";
import { SpreadsheetService } from "../services/spreadsheet.service";

export const spreadsheetRouter = Router();

// Criar nova planilha
spreadsheetRouter.post("/create", async (req, res) => {
  try {
    const { title, userId } = req.body;

    const result = await SpreadsheetService.createSpreadsheet(title, userId);

    return res.json(result);
  } catch (err: any) {
    console.error(err);
    return res.status(400).json({ error: err.message });
  }
});

// Listar planilhas do usuário
spreadsheetRouter.get("/list/:userId", async (req, res) => {
  try {
    const userId = req.params.userId;

    const result = await SpreadsheetService.listUserSpreadsheets(userId);

    return res.json(result);
  } catch (err: any) {
    console.error(err);
    return res.status(400).json({ error: err.message });
  }
});

// Renomear planilha
spreadsheetRouter.put("/rename", async (req, res) => {
  try {
    const { id, title } = req.body;

    const result = await SpreadsheetService.renameSpreadsheet(id, title);

    return res.json(result);
  } catch (err: any) {
    return res.status(400).json({ error: err.message });
  }
});

// Deletar planilha
spreadsheetRouter.delete("/delete/:id", async (req, res) => {
  try {
    const id = req.params.id;

    const result = await SpreadsheetService.deleteSpreadsheet(id);

    return res.json(result);
  } catch (err: any) {
    return res.status(400).json({ error: err.message });
  }
});
