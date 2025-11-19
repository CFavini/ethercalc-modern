// Caminho: backend/src/middleware/auth.ts
import { Request, Response, NextFunction } from 'express';
import { createClient } from '@supabase/supabase-js';

// Importa o cliente Supabase (é o mesmo de src/config/supabase.ts, mas o path muda)
// Usamos a SERVICE_KEY no backend para evitar problemas de RLS na autenticação em si.
const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_KEY! // Assumimos que SUPABASE_KEY é a Service Key
);

// 📝 Documentação: Extende o tipo Request do Express para incluir o objeto 'user'
declare global {
  namespace Express {
    interface Request {
      user?: {
        id: string;
        email: string;
        role: string;
      };
    }
  }
}

/**
 * 🔐 Middleware de autenticação: Valida o JWT do header 'Authorization'.
 * Se válido, anexa as informações básicas do usuário (id, email, role) ao req.user.
 */
export async function authenticate(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    // 1. Extrai token do header 'Bearer <token>'
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Token não fornecido' });
    }

    const token = authHeader.substring(7);

    // 2. Verifica token com Supabase
    // O Supabase verifica a validade do JWT e retorna o objeto user
    const { data: { user }, error } = await supabase.auth.getUser(token);

    if (error || !user) {
      return res.status(401).json({ error: 'Token inválido ou expirado' });
    }

    // 3. Anexa usuário ao request
    // Usamos o role 'free' como padrão se não houver metadados (para futura expansão de planos)
    req.user = {
      id: user.id,
      email: user.email!,
      role: user.user_metadata?.role || 'free',
    };

    next();
  } catch (error) {
    console.error('Erro na autenticação:', error);
    return res.status(500).json({ error: 'Erro interno de autenticação' });
  }
}

/**
 * 🛡️ Middleware para verificar se o usuário é Administrador.
 */
export function requireAdmin(
  req: Request,
  res: Response,
  next: NextFunction
) {
  if (req.user?.role !== 'admin') {
    return res.status(403).json({ error: 'Acesso negado: Requer privilégios de Administrador' });
  }
  next();
}