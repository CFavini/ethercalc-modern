import express from "express";
import cors from "cors";
import dotenv from "dotenv";

import { sheetsRouter } from "./routes/sheets";
import { spreadsheetRouter } from "./routes/spreadsheet";
import { permissionsRouter } from "./routes/permissions";
import { realtimeRouter } from "./routes/realtime";

dotenv.config();

const app = express();

app.use(express.json());
app.use(cors({
  origin: process.env.FRONTEND_URL || "http://localhost:3000",
  credentials: true
}));

// Rotas REST
app.use("/sheets", sheetsRouter);
app.use("/spreadsheet", spreadsheetRouter);
app.use("/permissions", permissionsRouter);
app.use("/realtime", realtimeRouter);

// Health check
app.get("/health", (_req, res) =>
  res.json({ status: "ok", uptime: process.uptime() })
);

const PORT = process.env.PORT || 3001;
app.listen(PORT, () =>
  console.log(`Backend rodando em http://localhost:${PORT}`)
);

