import { Router } from "express";

export const realtimeRouter = Router();

realtimeRouter.get("/", (_req, res) => {
  res.json({ status: "Realtime disponível via Supabase Realtime" });
});
