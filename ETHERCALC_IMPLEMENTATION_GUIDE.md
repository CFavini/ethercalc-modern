# 💻 ETHERCALC - GUIA PRÁTICO DE IMPLEMENTAÇÃO

## 📋 EXEMPLOS DE CÓDIGO PRONTOS PARA USAR

---

## 1️⃣ ESTRUTURA DO PROJETO

```
ethercalc-modern/
├── frontend/                    # Next.js App
│   ├── app/
│   │   ├── (auth)/
│   │   │   ├── login/
│   │   │   │   └── page.tsx
│   │   │   ├── register/
│   │   │   │   └── page.tsx
│   │   │   └── layout.tsx
│   │   ├── (dashboard)/
│   │   │   ├── spreadsheets/
│   │   │   │   ├── page.tsx      # Lista de planilhas
│   │   │   │   └── [id]/
│   │   │   │       ├── page.tsx  # Editor
│   │   │   │       └── share/
│   │   │   │           └── page.tsx
│   │   │   └── layout.tsx
│   │   ├── api/                  # API Routes do Next.js
│   │   │   └── auth/
│   │   │       └── [...nextauth]/
│   │   │           └── route.ts
│   │   └── layout.tsx
│   ├── components/
│   │   ├── auth/
│   │   ├── spreadsheet/
│   │   └── ui/
│   ├── lib/
│   │   ├── supabase.ts
│   │   ├── api-client.ts
│   │   └── utils.ts
│   └── package.json
│
├── backend/                     # Express API
│   ├── src/
│   │   ├── config/
│   │   │   ├── database.ts
│   │   │   ├── redis.ts
│   │   │   └── env.ts
│   │   ├── middleware/
│   │   │   ├── auth.ts
│   │   │   ├── validate.ts
│   │   │   ├── rateLimit.ts
│   │   │   └── errorHandler.ts
│   │   ├── routes/
│   │   │   ├── auth.routes.ts
│   │   │   ├── spreadsheet.routes.ts
│   │   │   └── user.routes.ts
│   │   ├── controllers/
│   │   │   ├── auth.controller.ts
│   │   │   └── spreadsheet.controller.ts
│   │   ├── services/
│   │   │   ├── auth.service.ts
│   │   │   └── spreadsheet.service.ts
│   │   ├── models/
│   │   │   └── prisma/
│   │   │       └── schema.prisma
│   │   ├── websocket/
│   │   │   └── socket.handler.ts
│   │   └── server.ts
│   ├── tests/
│   └── package.json
│
├── docker-compose.yml          # Dev environment
├── .github/
│   └── workflows/
│       └── deploy.yml          # CI/CD
└── README.md
```

---

## 2️⃣ BACKEND - EXPRESS + TYPESCRIPT

### 📁 `backend/src/server.ts` (Entry Point)

```typescript
import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import { createServer } from 'http';
import { Server } from 'socket.io';
import { setupWebSocket } from './websocket/socket.handler';
import { errorHandler } from './middleware/errorHandler';
import authRoutes from './routes/auth.routes';
import spreadsheetRoutes from './routes/spreadsheet.routes';

const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: {
    origin: process.env.FRONTEND_URL,
    credentials: true,
  },
});

// Security middleware
app.use(helmet());
app.use(cors({
  origin: process.env.FRONTEND_URL,
  credentials: true,
}));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/spreadsheets', spreadsheetRoutes);

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// WebSocket setup
setupWebSocket(io);

// Error handling
app.use(errorHandler);

const PORT = process.env.PORT || 3001;
httpServer.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});
```

### 📁 `backend/src/middleware/auth.ts`

```typescript
import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!
);

// Estende o tipo Request do Express para incluir user
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

export async function authenticate(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    // 1. Extrai token do header
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Token não fornecido' });
    }

    const token = authHeader.substring(7);

    // 2. Verifica token com Supabase
    const { data: { user }, error } = await supabase.auth.getUser(token);

    if (error || !user) {
      return res.status(401).json({ error: 'Token inválido' });
    }

    // 3. Anexa usuário ao request
    req.user = {
      id: user.id,
      email: user.email!,
      role: user.user_metadata?.role || 'free',
    };

    next();
  } catch (error) {
    return res.status(401).json({ error: 'Erro na autenticação' });
  }
}

// Middleware para verificar se usuário é admin
export function requireAdmin(
  req: Request,
  res: Response,
  next: NextFunction
) {
  if (req.user?.role !== 'admin') {
    return res.status(403).json({ error: 'Acesso negado' });
  }
  next();
}
```

### 📁 `backend/src/middleware/rateLimit.ts`

```typescript
import rateLimit from 'express-rate-limit';
import RedisStore from 'rate-limit-redis';
import { createClient } from 'redis';

const redisClient = createClient({
  url: process.env.REDIS_URL,
});
redisClient.connect();

// Rate limiter para login (5 tentativas a cada 15 minutos)
export const loginLimiter = rateLimit({
  store: new RedisStore({
    client: redisClient,
    prefix: 'rl:login:',
  }),
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: 5,
  message: 'Muitas tentativas de login. Tente novamente em 15 minutos.',
  standardHeaders: true,
  legacyHeaders: false,
});

// Rate limiter geral da API (100 req/min)
export const apiLimiter = rateLimit({
  store: new RedisStore({
    client: redisClient,
    prefix: 'rl:api:',
  }),
  windowMs: 60 * 1000, // 1 minuto
  max: 100,
  message: 'Muitas requisições. Tente novamente em 1 minuto.',
});

// Rate limiter para criação de planilhas (10/hora)
export const createSpreadsheetLimiter = rateLimit({
  store: new RedisStore({
    client: redisClient,
    prefix: 'rl:create:',
  }),
  windowMs: 60 * 60 * 1000, // 1 hora
  max: 10,
  message: 'Limite de criação atingido. Tente novamente em 1 hora.',
  keyGenerator: (req) => req.user?.id || req.ip, // Por usuário
});
```

### 📁 `backend/src/middleware/validate.ts`

```typescript
import { body, param, ValidationChain, validationResult } from 'express-validator';
import { Request, Response, NextFunction } from 'express';

// Middleware para processar validações
export function validate(validations: ValidationChain[]) {
  return async (req: Request, res: Response, next: NextFunction) => {
    // Executa todas as validações
    await Promise.all(validations.map((validation) => validation.run(req)));

    const errors = validationResult(req);
    if (errors.isEmpty()) {
      return next();
    }

    return res.status(400).json({
      error: 'Dados inválidos',
      details: errors.array(),
    });
  };
}

// Validações específicas
export const authValidators = {
  register: [
    body('email')
      .isEmail()
      .normalizeEmail()
      .withMessage('Email inválido'),
    body('password')
      .isLength({ min: 8 })
      .withMessage('Senha deve ter no mínimo 8 caracteres')
      .matches(/[A-Z]/)
      .withMessage('Senha deve ter pelo menos uma letra maiúscula')
      .matches(/[a-z]/)
      .withMessage('Senha deve ter pelo menos uma letra minúscula')
      .matches(/[0-9]/)
      .withMessage('Senha deve ter pelo menos um número'),
    body('displayName')
      .optional()
      .trim()
      .escape()
      .isLength({ min: 2, max: 100 })
      .withMessage('Nome deve ter entre 2 e 100 caracteres'),
  ],
  login: [
    body('email').isEmail().normalizeEmail(),
    body('password').notEmpty(),
  ],
};

export const spreadsheetValidators = {
  create: [
    body('title')
      .trim()
      .escape()
      .isLength({ min: 1, max: 255 })
      .withMessage('Título deve ter entre 1 e 255 caracteres'),
    body('data')
      .optional()
      .isObject()
      .withMessage('Dados devem ser um objeto JSON'),
    body('visibility')
      .optional()
      .isIn(['private', 'link', 'public'])
      .withMessage('Visibilidade inválida'),
  ],
  update: [
    param('id').isUUID().withMessage('ID inválido'),
    body('title')
      .optional()
      .trim()
      .escape()
      .isLength({ min: 1, max: 255 }),
    body('data').optional().isObject(),
  ],
};
```

### 📁 `backend/src/controllers/auth.controller.ts`

```typescript
import { Request, Response } from 'express';
import { AuthService } from '../services/auth.service';

const authService = new AuthService();

export class AuthController {
  async register(req: Request, res: Response) {
    try {
      const { email, password, displayName } = req.body;

      const result = await authService.register({
        email,
        password,
        displayName,
      });

      res.status(201).json({
        message: 'Usuário criado com sucesso',
        user: result.user,
        session: result.session,
      });
    } catch (error: any) {
      if (error.message === 'Email já cadastrado') {
        return res.status(409).json({ error: error.message });
      }
      console.error('Register error:', error);
      res.status(500).json({ error: 'Erro ao criar usuário' });
    }
  }

  async login(req: Request, res: Response) {
    try {
      const { email, password } = req.body;

      const result = await authService.login(email, password);

      // Define refresh token como httpOnly cookie
      res.cookie('refresh_token', result.session.refresh_token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        maxAge: 7 * 24 * 60 * 60 * 1000, // 7 dias
      });

      res.json({
        message: 'Login realizado com sucesso',
        access_token: result.session.access_token,
        user: result.user,
      });
    } catch (error: any) {
      if (error.message === 'Credenciais inválidas') {
        return res.status(401).json({ error: error.message });
      }
      console.error('Login error:', error);
      res.status(500).json({ error: 'Erro no login' });
    }
  }

  async logout(req: Request, res: Response) {
    try {
      const token = req.headers.authorization?.substring(7);
      if (token) {
        await authService.logout(token);
      }

      res.clearCookie('refresh_token');
      res.json({ message: 'Logout realizado com sucesso' });
    } catch (error) {
      console.error('Logout error:', error);
      res.status(500).json({ error: 'Erro no logout' });
    }
  }

  async refreshToken(req: Request, res: Response) {
    try {
      const refreshToken = req.cookies.refresh_token;
      if (!refreshToken) {
        return res.status(401).json({ error: 'Refresh token não fornecido' });
      }

      const result = await authService.refreshToken(refreshToken);

      res.json({
        access_token: result.access_token,
      });
    } catch (error) {
      console.error('Refresh token error:', error);
      res.status(401).json({ error: 'Refresh token inválido' });
    }
  }

  async getProfile(req: Request, res: Response) {
    try {
      const userId = req.user!.id;
      const profile = await authService.getProfile(userId);

      res.json(profile);
    } catch (error) {
      console.error('Get profile error:', error);
      res.status(500).json({ error: 'Erro ao buscar perfil' });
    }
  }
}
```

### 📁 `backend/src/routes/auth.routes.ts`

```typescript
import { Router } from 'express';
import { AuthController } from '../controllers/auth.controller';
import { loginLimiter } from '../middleware/rateLimit';
import { authValidators, validate } from '../middleware/validate';
import { authenticate } from '../middleware/auth';

const router = Router();
const authController = new AuthController();

// Rotas públicas
router.post(
  '/register',
  validate(authValidators.register),
  authController.register.bind(authController)
);

router.post(
  '/login',
  loginLimiter,
  validate(authValidators.login),
  authController.login.bind(authController)
);

router.post(
  '/refresh',
  authController.refreshToken.bind(authController)
);

// Rotas protegidas
router.post(
  '/logout',
  authenticate,
  authController.logout.bind(authController)
);

router.get(
  '/profile',
  authenticate,
  authController.getProfile.bind(authController)
);

export default router;
```

### 📁 `backend/src/controllers/spreadsheet.controller.ts`

```typescript
import { Request, Response } from 'express';
import { SpreadsheetService } from '../services/spreadsheet.service';

const spreadsheetService = new SpreadsheetService();

export class SpreadsheetController {
  async create(req: Request, res: Response) {
    try {
      const { title, data, visibility } = req.body;
      const userId = req.user!.id;

      const spreadsheet = await spreadsheetService.create({
        title,
        data,
        visibility: visibility || 'private',
        owner_id: userId,
      });

      res.status(201).json(spreadsheet);
    } catch (error: any) {
      if (error.message === 'Limite de planilhas atingido') {
        return res.status(403).json({ error: error.message });
      }
      console.error('Create spreadsheet error:', error);
      res.status(500).json({ error: 'Erro ao criar planilha' });
    }
  }

  async list(req: Request, res: Response) {
    try {
      const userId = req.user!.id;
      const { page = 1, limit = 20 } = req.query;

      const result = await spreadsheetService.listByUser(
        userId,
        Number(page),
        Number(limit)
      );

      res.json(result);
    } catch (error) {
      console.error('List spreadsheets error:', error);
      res.status(500).json({ error: 'Erro ao listar planilhas' });
    }
  }

  async getById(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const userId = req.user!.id;

      const spreadsheet = await spreadsheetService.getById(id, userId);

      res.json(spreadsheet);
    } catch (error: any) {
      if (error.message === 'Planilha não encontrada') {
        return res.status(404).json({ error: error.message });
      }
      if (error.message === 'Sem permissão') {
        return res.status(403).json({ error: error.message });
      }
      console.error('Get spreadsheet error:', error);
      res.status(500).json({ error: 'Erro ao buscar planilha' });
    }
  }

  async update(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const userId = req.user!.id;
      const updates = req.body;

      const spreadsheet = await spreadsheetService.update(id, userId, updates);

      res.json(spreadsheet);
    } catch (error: any) {
      if (error.message === 'Sem permissão') {
        return res.status(403).json({ error: error.message });
      }
      console.error('Update spreadsheet error:', error);
      res.status(500).json({ error: 'Erro ao atualizar planilha' });
    }
  }

  async delete(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const userId = req.user!.id;

      await spreadsheetService.delete(id, userId);

      res.json({ message: 'Planilha excluída com sucesso' });
    } catch (error: any) {
      if (error.message === 'Apenas o owner pode deletar') {
        return res.status(403).json({ error: error.message });
      }
      console.error('Delete spreadsheet error:', error);
      res.status(500).json({ error: 'Erro ao excluir planilha' });
    }
  }

  async share(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const { userEmail, permission } = req.body;
      const userId = req.user!.id;

      const result = await spreadsheetService.share(
        id,
        userId,
        userEmail,
        permission
      );

      res.json(result);
    } catch (error: any) {
      if (error.message === 'Usuário não encontrado') {
        return res.status(404).json({ error: error.message });
      }
      console.error('Share spreadsheet error:', error);
      res.status(500).json({ error: 'Erro ao compartilhar planilha' });
    }
  }
}
```

### 📁 `backend/src/websocket/socket.handler.ts`

```typescript
import { Server, Socket } from 'socket.io';
import jwt from 'jsonwebtoken';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!
);

interface AuthenticatedSocket extends Socket {
  userId?: string;
}

export function setupWebSocket(io: Server) {
  // Middleware de autenticação WebSocket
  io.use(async (socket: AuthenticatedSocket, next) => {
    try {
      const token = socket.handshake.auth.token;
      if (!token) {
        return next(new Error('Token não fornecido'));
      }

      const { data: { user }, error } = await supabase.auth.getUser(token);
      if (error || !user) {
        return next(new Error('Token inválido'));
      }

      socket.userId = user.id;
      next();
    } catch (error) {
      next(new Error('Erro na autenticação'));
    }
  });

  io.on('connection', (socket: AuthenticatedSocket) => {
    console.log(`User connected: ${socket.userId}`);

    // Usuário entra em uma "sala" de planilha específica
    socket.on('join-spreadsheet', async (spreadsheetId: string) => {
      // Verifica permissão (simplificado, você deve validar no DB)
      socket.join(`sheet:${spreadsheetId}`);
      
      // Notifica outros usuários
      socket.to(`sheet:${spreadsheetId}`).emit('user-joined', {
        userId: socket.userId,
        timestamp: new Date(),
      });

      console.log(`User ${socket.userId} joined sheet ${spreadsheetId}`);
    });

    // Usuário edita célula
    socket.on('cell-update', async (data: {
      spreadsheetId: string;
      cell: string;
      value: any;
    }) => {
      // Propaga mudança para outros usuários na mesma planilha
      socket.to(`sheet:${data.spreadsheetId}`).emit('cell-updated', {
        userId: socket.userId,
        cell: data.cell,
        value: data.value,
        timestamp: new Date(),
      });

      // Salva no banco (debounced)
      // TODO: implementar debounce e batch updates
    });

    // Usuário sai da planilha
    socket.on('leave-spreadsheet', (spreadsheetId: string) => {
      socket.leave(`sheet:${spreadsheetId}`);
      socket.to(`sheet:${spreadsheetId}`).emit('user-left', {
        userId: socket.userId,
        timestamp: new Date(),
      });
    });

    socket.on('disconnect', () => {
      console.log(`User disconnected: ${socket.userId}`);
    });
  });
}
```

---

## 3️⃣ FRONTEND - NEXT.JS + REACT

### 📁 `frontend/lib/supabase.ts`

```typescript
import { createClient } from '@supabase/supabase-js';

export const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

// Helper para login
export async function signIn(email: string, password: string) {
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) throw error;
  return data;
}

// Helper para registro
export async function signUp(email: string, password: string) {
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
  });

  if (error) throw error;
  return data;
}

// Helper para logout
export async function signOut() {
  const { error } = await supabase.auth.signOut();
  if (error) throw error;
}

// Helper para pegar sessão atual
export async function getSession() {
  const { data: { session }, error } = await supabase.auth.getSession();
  if (error) throw error;
  return session;
}
```

### 📁 `frontend/app/(auth)/login/page.tsx`

```typescript
'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { signIn } from '@/lib/supabase';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      await signIn(email, password);
      router.push('/spreadsheets');
    } catch (err: any) {
      setError(err.message || 'Erro ao fazer login');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="max-w-md w-full space-y-8 p-8 bg-white rounded-lg shadow">
        <div>
          <h2 className="text-3xl font-bold text-center">
            EtherCalc
          </h2>
          <p className="mt-2 text-center text-gray-600">
            Entre na sua conta
          </p>
        </div>

        <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
          {error && (
            <div className="bg-red-50 text-red-500 p-3 rounded">
              {error}
            </div>
          )}

          <div>
            <label htmlFor="email" className="block text-sm font-medium">
              Email
            </label>
            <input
              id="email"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md"
            />
          </div>

          <div>
            <label htmlFor="password" className="block text-sm font-medium">
              Senha
            </label>
            <input
              id="password"
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-2 px-4 bg-blue-600 hover:bg-blue-700 text-white rounded-md disabled:opacity-50"
          >
            {loading ? 'Entrando...' : 'Entrar'}
          </button>
        </form>

        <p className="text-center text-sm text-gray-600">
          Não tem conta?{' '}
          <a href="/register" className="text-blue-600 hover:underline">
            Cadastre-se
          </a>
        </p>
      </div>
    </div>
  );
}
```

### 📁 `frontend/app/(dashboard)/spreadsheets/page.tsx`

```typescript
'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import Link from 'next/link';

interface Spreadsheet {
  id: string;
  title: string;
  created_at: string;
  last_edited: string;
}

export default function SpreadsheetListPage() {
  const [spreadsheets, setSpreadsheets] = useState<Spreadsheet[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadSpreadsheets();
  }, []);

  async function loadSpreadsheets() {
    try {
      const { data, error } = await supabase
        .from('spreadsheets')
        .select('id, title, created_at, last_edited')
        .order('last_edited', { ascending: false });

      if (error) throw error;
      setSpreadsheets(data || []);
    } catch (error) {
      console.error('Error loading spreadsheets:', error);
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return <div>Carregando...</div>;
  }

  return (
    <div className="container mx-auto p-8">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold">Minhas Planilhas</h1>
        <Link
          href="/spreadsheets/new"
          className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
        >
          Nova Planilha
        </Link>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {spreadsheets.map((sheet) => (
          <Link
            key={sheet.id}
            href={`/spreadsheets/${sheet.id}`}
            className="block p-6 bg-white border rounded-lg hover:shadow-lg transition"
          >
            <h3 className="text-xl font-semibold mb-2">{sheet.title}</h3>
            <p className="text-gray-600 text-sm">
              Editado em {new Date(sheet.last_edited).toLocaleDateString()}
            </p>
          </Link>
        ))}
      </div>

      {spreadsheets.length === 0 && (
        <div className="text-center py-12 text-gray-500">
          Você ainda não tem planilhas. Crie sua primeira!
        </div>
      )}
    </div>
  );
}
```

---

## 4️⃣ VARIÁVEIS DE AMBIENTE

### 📁 `backend/.env`

```bash
# Server
NODE_ENV=development
PORT=3001
FRONTEND_URL=http://localhost:3000

# Supabase
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_KEY=your-service-key

# Redis
REDIS_URL=redis://localhost:6379

# JWT
JWT_SECRET=your-super-secret-key-change-this
JWT_EXPIRES_IN=15m
JWT_REFRESH_EXPIRES_IN=7d

# Rate Limiting
RATE_LIMIT_WINDOW=900000
RATE_LIMIT_MAX=100
```

### 📁 `frontend/.env.local`

```bash
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
NEXT_PUBLIC_API_URL=http://localhost:3001
```

---

## 5️⃣ DOCKER COMPOSE (DEV LOCAL)

### 📁 `docker-compose.yml`

```yaml
version: '3.8'

services:
  postgres:
    image: postgres:15
    environment:
      POSTGRES_DB: ethercalc_dev
      POSTGRES_USER: ethercalc
      POSTGRES_PASSWORD: ethercalc123
    ports:
      - "5432:5432"
    volumes:
      - postgres_data:/var/lib/postgresql/data

  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"
    volumes:
      - redis_data:/data

  backend:
    build: ./backend
    ports:
      - "3001:3001"
    environment:
      - NODE_ENV=development
      - DATABASE_URL=postgresql://ethercalc:ethercalc123@postgres:5432/ethercalc_dev
      - REDIS_URL=redis://redis:6379
    depends_on:
      - postgres
      - redis
    volumes:
      - ./backend:/app
      - /app/node_modules

  frontend:
    build: ./frontend
    ports:
      - "3000:3000"
    environment:
      - NEXT_PUBLIC_API_URL=http://localhost:3001
    volumes:
      - ./frontend:/app
      - /app/node_modules
    depends_on:
      - backend

volumes:
  postgres_data:
  redis_data:
```

---

## 🚀 COMANDOS PARA RODAR

```bash
# 1. Clonar o projeto
git clone https://github.com/seu-usuario/ethercalc-modern
cd ethercalc-modern

# 2. Setup do backend
cd backend
npm install
cp .env.example .env
# Edite .env com suas credenciais

# 3. Setup do frontend
cd ../frontend
npm install
cp .env.example .env.local
# Edite .env.local com suas credenciais

# 4. Rodar com Docker (mais fácil)
cd ..
docker-compose up -d

# Ou rodar manualmente:
# Terminal 1 - Backend
cd backend
npm run dev

# Terminal 2 - Frontend
cd frontend
npm run dev
```

---

**Pronto! Este é seu guia completo de implementação. Quer que eu crie os arquivos restantes ou tem alguma dúvida?** 🚀
