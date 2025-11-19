import { Request, Response, NextFunction } from "express";

export function requireUser(req: Request, res: Response, next: NextFunction) {
  const userId = req.header("x-user-id");

  if (!userId) {
    return res.status(401).json({ error: "Usuário não autenticado" });
  }

  (req as any).userId = userId;
  next();
}

