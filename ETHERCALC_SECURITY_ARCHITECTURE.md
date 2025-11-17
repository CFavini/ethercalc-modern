# 🔒 ETHERCALC MODERNO - ARQUITETURA DE SEGURANÇA E ESCALABILIDADE

## 📋 ÍNDICE
1. [Stack Gratuita Escolhida](#stack-gratuita)
2. [Sistema de Autenticação](#autenticação)
3. [Segurança em Camadas](#segurança)
4. [Autorização e Permissões](#autorização)
5. [Escalabilidade](#escalabilidade)
6. [Implementação Prática](#implementação)
7. [Checklist de Segurança OWASP](#owasp)

---

## 🎯 STACK GRATUITA ESCOLHIDA

### Frontend: Vercel
- **Next.js 15** (React + TypeScript)
- **100GB bandwidth/mês**
- **Deploy automático do GitHub**
- **CDN global incluído**
- **Domínio HTTPS grátis**

### Backend: Railway.app
- **Node.js 20+ com TypeScript**
- **500 horas/mês grátis** (~$5 crédito)
- **Socket.io para WebSockets**
- **Deploy do GitHub**
- **Logs e monitoring incluídos**

### Database: Supabase
- **PostgreSQL 500MB grátis**
- **Autenticação nativa incluída!**
- **Row Level Security (RLS)**
- **Storage 1GB grátis**
- **API REST automática**
- **Backups automáticos**

### Cache: Redis Cloud
- **30MB grátis** (suficiente para beta)
- **Sessions e rate limiting**
- **WebSocket rooms cache**

### Extras Grátis:
- **Cloudflare**: CDN + DDoS protection
- **GitHub Actions**: CI/CD gratuito
- **Sentry**: Error tracking (10k eventos/mês grátis)

---

## 🔐 SISTEMA DE AUTENTICAÇÃO COMPLETO

### 1. ESTRATÉGIA DE AUTENTICAÇÃO

```
┌─────────────────────────────────────────────────────┐
│  MÚLTIPLAS OPÇÕES DE LOGIN                          │
├─────────────────────────────────────────────────────┤
│  1. Email + Senha (tradicional)                     │
│  2. Google OAuth 2.0                                │
│  3. GitHub OAuth                                    │
│  4. Magic Link (link por email)                     │
│  5. [Futuro] Microsoft/SAML para empresas           │
└─────────────────────────────────────────────────────┘
```

**Por que múltiplas opções?**
- ✅ Email/Senha: controle total
- ✅ OAuth: conveniência e segurança
- ✅ Magic Link: sem senha (tendência moderna)

### 2. FLUXO DE AUTENTICAÇÃO (JWT)

```typescript
// TECNOLOGIA: JWT (JSON Web Tokens)
// Similar ao sistema de Claims do C# .NET

┌──────────────────────────────────────────┐
│  1. USUÁRIO FAZ LOGIN                    │
│     POST /api/auth/login                 │
│     { email, password }                  │
└──────────────────────────────────────────┘
                ↓
┌──────────────────────────────────────────┐
│  2. SERVIDOR VALIDA                      │
│     - Verifica credenciais no Supabase   │
│     - Hash bcrypt (como C# Identity)     │
│     - Rate limiting (5 tentativas/min)   │
└──────────────────────────────────────────┘
                ↓
┌──────────────────────────────────────────┐
│  3. SERVIDOR GERA TOKENS                 │
│                                          │
│  ACCESS TOKEN (curta duração - 15min)    │
│  {                                       │
│    "userId": "uuid",                     │
│    "email": "user@email.com",            │
│    "role": "user",                       │
│    "exp": 1234567890                     │
│  }                                       │
│                                          │
│  REFRESH TOKEN (longa duração - 7 dias)  │
│  {                                       │
│    "userId": "uuid",                     │
│    "tokenFamily": "abc123",              │
│    "exp": 1234567890                     │
│  }                                       │
└──────────────────────────────────────────┘
                ↓
┌──────────────────────────────────────────┐
│  4. CLIENTE ARMAZENA TOKENS              │
│     - Access Token: memoria (variável)   │
│     - Refresh Token: httpOnly cookie     │
│       (não acessível por JavaScript!)    │
└──────────────────────────────────────────┘
                ↓
┌──────────────────────────────────────────┐
│  5. REQUISIÇÕES SUBSEQUENTES             │
│     Authorization: Bearer {accessToken}  │
└──────────────────────────────────────────┘
```

### 3. ESTRUTURA DO BANCO DE DADOS (PostgreSQL)

```sql
-- TABELA: users (gerenciada pelo Supabase Auth)
CREATE TABLE auth.users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email VARCHAR(255) UNIQUE NOT NULL,
  encrypted_password VARCHAR(255), -- bcrypt hash
  email_confirmed_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- TABELA: user_profiles (dados adicionais)
CREATE TABLE public.user_profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name VARCHAR(100),
  avatar_url TEXT,
  plan VARCHAR(20) DEFAULT 'free', -- free, pro, enterprise
  storage_used BIGINT DEFAULT 0,
  storage_limit BIGINT DEFAULT 52428800, -- 50MB para plano free
  created_at TIMESTAMP DEFAULT NOW()
);

-- TABELA: spreadsheets
CREATE TABLE public.spreadsheets (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title VARCHAR(255) NOT NULL,
  slug VARCHAR(100) UNIQUE NOT NULL, -- URL amigável
  owner_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  visibility VARCHAR(20) DEFAULT 'private', -- private, link, public
  password_hash VARCHAR(255), -- opcional para sheets protegidas
  data JSONB, -- conteúdo da planilha (SocialCalc format)
  last_edited TIMESTAMP DEFAULT NOW(),
  created_at TIMESTAMP DEFAULT NOW(),
  view_count INTEGER DEFAULT 0,
  
  -- Índices para performance
  INDEX idx_owner (owner_id),
  INDEX idx_slug (slug),
  INDEX idx_visibility (visibility)
);

-- TABELA: spreadsheet_permissions (compartilhamento)
CREATE TABLE public.spreadsheet_permissions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  spreadsheet_id UUID REFERENCES spreadsheets(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  permission VARCHAR(20) NOT NULL, -- view, edit, admin
  granted_by UUID REFERENCES auth.users(id),
  granted_at TIMESTAMP DEFAULT NOW(),
  
  UNIQUE(spreadsheet_id, user_id)
);

-- TABELA: spreadsheet_history (auditoria)
CREATE TABLE public.spreadsheet_history (
  id BIGSERIAL PRIMARY KEY,
  spreadsheet_id UUID REFERENCES spreadsheets(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id),
  action VARCHAR(50), -- created, edited, shared, deleted
  changes JSONB, -- detalhes da mudança
  ip_address INET,
  user_agent TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  
  INDEX idx_spreadsheet (spreadsheet_id),
  INDEX idx_user (user_id),
  INDEX idx_created (created_at)
);

-- TABELA: active_sessions (controle de sessões)
CREATE TABLE public.active_sessions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  refresh_token_hash VARCHAR(255) UNIQUE NOT NULL,
  token_family VARCHAR(50) NOT NULL, -- para detectar roubo de token
  ip_address INET,
  user_agent TEXT,
  last_activity TIMESTAMP DEFAULT NOW(),
  expires_at TIMESTAMP NOT NULL,
  
  INDEX idx_user (user_id),
  INDEX idx_token_family (token_family)
);

-- TABELA: rate_limiting (controle de abuso)
CREATE TABLE public.rate_limits (
  id BIGSERIAL PRIMARY KEY,
  identifier VARCHAR(255) NOT NULL, -- IP ou user_id
  action VARCHAR(50) NOT NULL, -- login, api_call, create_sheet
  count INTEGER DEFAULT 1,
  window_start TIMESTAMP DEFAULT NOW(),
  
  UNIQUE(identifier, action, window_start)
);
```

---

## 🛡️ SEGURANÇA EM CAMADAS (Defense in Depth)

### CAMADA 1: NETWORK (Cloudflare)
```
✅ DDoS Protection automático
✅ Rate Limiting global (1000 req/min por IP)
✅ Bot Detection
✅ SSL/TLS obrigatório (HTTPS only)
✅ HSTS headers
```

### CAMADA 2: APPLICATION (Backend)

```typescript
// MIDDLEWARE DE SEGURANÇA (Express)
import helmet from 'helmet';
import cors from 'cors';
import rateLimit from 'express-rate-limit';

// 1. HELMET - Headers de segurança
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'"], // Apenas quando necessário
      styleSrc: ["'self'", "'unsafe-inline'"],
      imgSrc: ["'self'", "data:", "https:"],
      connectSrc: ["'self'", process.env.API_URL],
      frameSrc: ["'none'"], // Previne clickjacking
    },
  },
  hsts: {
    maxAge: 31536000,
    includeSubDomains: true,
    preload: true,
  },
}));

// 2. CORS - Controle de origem
app.use(cors({
  origin: process.env.FRONTEND_URL, // Apenas seu frontend
  credentials: true, // Permite cookies
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));

// 3. RATE LIMITING
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: 5, // 5 tentativas
  message: 'Muitas tentativas de login. Tente em 15 minutos.',
  standardHeaders: true,
  legacyHeaders: false,
});

app.use('/api/auth/login', authLimiter);

// 4. SANITIZAÇÃO DE INPUT
import { body, validationResult } from 'express-validator';

app.post('/api/spreadsheets',
  body('title').trim().escape().isLength({ min: 1, max: 255 }),
  body('data').isJSON(),
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }
    // ... continua
  }
);

// 5. SQL INJECTION PROTECTION
// Usando ORM (Prisma) ou Prepared Statements sempre!
const sheet = await prisma.spreadsheet.findUnique({
  where: { id: sheetId }, // Prisma sanitiza automaticamente
});

// ❌ NUNCA FAÇA ISSO:
const query = `SELECT * FROM spreadsheets WHERE id = '${sheetId}'`;

// 6. XSS PROTECTION
import DOMPurify from 'isomorphic-dompurify';

function sanitizeHTML(dirty: string): string {
  return DOMPurify.sanitize(dirty, {
    ALLOWED_TAGS: ['b', 'i', 'u', 'a', 'br'],
    ALLOWED_ATTR: ['href', 'target'],
  });
}
```

### CAMADA 3: DATABASE (Row Level Security)

```sql
-- SUPABASE RLS (Row Level Security)
-- Usuários só veem suas próprias planilhas ou compartilhadas

-- Política para SELECT
CREATE POLICY "Users can view own spreadsheets"
ON spreadsheets FOR SELECT
USING (
  owner_id = auth.uid() 
  OR visibility = 'public'
  OR id IN (
    SELECT spreadsheet_id 
    FROM spreadsheet_permissions 
    WHERE user_id = auth.uid()
  )
);

-- Política para INSERT
CREATE POLICY "Users can create spreadsheets"
ON spreadsheets FOR INSERT
WITH CHECK (owner_id = auth.uid());

-- Política para UPDATE
CREATE POLICY "Users can update own spreadsheets"
ON spreadsheets FOR UPDATE
USING (
  owner_id = auth.uid()
  OR id IN (
    SELECT spreadsheet_id 
    FROM spreadsheet_permissions 
    WHERE user_id = auth.uid() 
    AND permission IN ('edit', 'admin')
  )
);

-- Política para DELETE
CREATE POLICY "Only owners can delete spreadsheets"
ON spreadsheets FOR DELETE
USING (owner_id = auth.uid());

-- Ativar RLS
ALTER TABLE spreadsheets ENABLE ROW LEVEL SECURITY;
```

---

## 👥 SISTEMA DE AUTORIZAÇÃO E PERMISSÕES

### MODELO DE PERMISSÕES (RBAC + ACL)

```typescript
// ROLES (baseados em papel)
enum UserRole {
  FREE = 'free',        // Usuário gratuito
  PRO = 'pro',          // Usuário pago
  ENTERPRISE = 'enterprise', // Empresarial
  ADMIN = 'admin',      // Administrador do sistema
}

// PERMISSIONS (por planilha)
enum SpreadsheetPermission {
  VIEW = 'view',        // Apenas visualizar
  COMMENT = 'comment',  // Visualizar e comentar
  EDIT = 'edit',        // Editar conteúdo
  ADMIN = 'admin',      // Gerenciar permissões
}

// LIMITES POR PLANO
const PLAN_LIMITS = {
  free: {
    maxSpreadsheets: 10,
    maxStorageBytes: 50 * 1024 * 1024, // 50MB
    maxCollaborators: 5,
    maxHistoryDays: 30,
  },
  pro: {
    maxSpreadsheets: 100,
    maxStorageBytes: 1024 * 1024 * 1024, // 1GB
    maxCollaborators: 50,
    maxHistoryDays: 365,
  },
  enterprise: {
    maxSpreadsheets: -1, // ilimitado
    maxStorageBytes: -1,
    maxCollaborators: -1,
    maxHistoryDays: -1,
  },
};

// MIDDLEWARE DE AUTORIZAÇÃO
function requirePermission(permission: SpreadsheetPermission) {
  return async (req: Request, res: Response, next: NextFunction) => {
    const { spreadsheetId } = req.params;
    const userId = req.user.id; // do JWT

    // 1. Verifica se é owner
    const sheet = await prisma.spreadsheet.findUnique({
      where: { id: spreadsheetId },
    });

    if (sheet.owner_id === userId) {
      return next(); // Owner tem todas as permissões
    }

    // 2. Verifica permissões compartilhadas
    const userPermission = await prisma.spreadsheet_permissions.findUnique({
      where: {
        spreadsheet_id_user_id: {
          spreadsheet_id: spreadsheetId,
          user_id: userId,
        },
      },
    });

    if (!userPermission) {
      return res.status(403).json({ error: 'Sem permissão' });
    }

    // 3. Verifica se tem a permissão necessária
    const permissionHierarchy = ['view', 'comment', 'edit', 'admin'];
    const userLevel = permissionHierarchy.indexOf(userPermission.permission);
    const requiredLevel = permissionHierarchy.indexOf(permission);

    if (userLevel >= requiredLevel) {
      return next();
    }

    return res.status(403).json({ error: 'Permissão insuficiente' });
  };
}

// USO:
app.put('/api/spreadsheets/:spreadsheetId', 
  authenticate, // Valida JWT
  requirePermission('edit'), // Verifica permissão
  updateSpreadsheet
);
```

### COMPARTILHAMENTO SEGURO

```typescript
// GERAR LINK DE COMPARTILHAMENTO
async function generateShareLink(
  spreadsheetId: string,
  permission: SpreadsheetPermission,
  expiresIn?: number // segundos
) {
  // 1. Gera token único
  const shareToken = crypto.randomBytes(32).toString('base64url');
  
  // 2. Salva no banco
  await redis.setex(
    `share:${shareToken}`,
    expiresIn || 7 * 24 * 60 * 60, // 7 dias padrão
    JSON.stringify({
      spreadsheetId,
      permission,
      createdBy: req.user.id,
    })
  );

  // 3. Retorna link
  return `${FRONTEND_URL}/s/${shareToken}`;
}

// ACESSAR VIA LINK
app.get('/api/share/:token', async (req, res) => {
  const { token } = req.params;
  
  // 1. Busca no cache
  const shareData = await redis.get(`share:${token}`);
  if (!shareData) {
    return res.status(404).json({ error: 'Link expirado ou inválido' });
  }

  const { spreadsheetId, permission } = JSON.parse(shareData);

  // 2. Cria sessão temporária ou adiciona permissão permanente
  // ... lógica de acesso
});
```

---

## 📈 ESCALABILIDADE DESDE O INÍCIO

### 1. ARQUITETURA ESCALÁVEL

```
┌─────────────────────────────────────────────────────────┐
│  PRINCÍPIOS DE DESIGN                                   │
├─────────────────────────────────────────────────────────┤
│  ✅ Stateless Backend (sem estado no servidor)          │
│  ✅ Horizontal Scaling (adiciona mais instâncias)       │
│  ✅ Database Connection Pooling                         │
│  ✅ Caching agressivo (Redis)                           │
│  ✅ CDN para assets estáticos                           │
│  ✅ Lazy Loading no frontend                            │
│  ✅ Pagination em todas as listas                       │
└─────────────────────────────────────────────────────────┘
```

### 2. CACHING STRATEGY

```typescript
// REDIS CACHE LAYERS

// Layer 1: Session Cache (curta duração)
await redis.setex(`session:${userId}`, 900, sessionData); // 15min

// Layer 2: Data Cache (média duração)
await redis.setex(`sheet:${sheetId}`, 3600, sheetData); // 1h

// Layer 3: Computed Cache (longa duração)
await redis.setex(`stats:${userId}`, 86400, statsData); // 24h

// INVALIDAÇÃO INTELIGENTE
async function updateSpreadsheet(id: string, data: any) {
  // 1. Atualiza no banco
  await prisma.spreadsheet.update({ where: { id }, data });
  
  // 2. Invalida caches relacionados
  await redis.del(`sheet:${id}`);
  await redis.del(`sheet-list:${data.owner_id}`);
  
  // 3. Notifica clientes via WebSocket
  io.to(`sheet:${id}`).emit('sheet:updated', data);
}
```

### 3. DATABASE OPTIMIZATION

```sql
-- ÍNDICES ESTRATÉGICOS
CREATE INDEX CONCURRENTLY idx_spreadsheets_owner_created 
  ON spreadsheets(owner_id, created_at DESC);

CREATE INDEX CONCURRENTLY idx_permissions_user_sheet 
  ON spreadsheet_permissions(user_id, spreadsheet_id);

-- PARTICIONAMENTO (quando crescer)
CREATE TABLE spreadsheet_history_2025_01 
  PARTITION OF spreadsheet_history
  FOR VALUES FROM ('2025-01-01') TO ('2025-02-01');

-- VACUUM AUTOMÁTICO
ALTER TABLE spreadsheets SET (autovacuum_enabled = true);
```

### 4. WEBSOCKET SCALING

```typescript
// SOCKET.IO COM REDIS ADAPTER
import { createAdapter } from '@socket.io/redis-adapter';
import { createClient } from 'redis';

const pubClient = createClient({ url: process.env.REDIS_URL });
const subClient = pubClient.duplicate();

await Promise.all([pubClient.connect(), subClient.connect()]);

io.adapter(createAdapter(pubClient, subClient));

// Agora funciona com múltiplas instâncias do backend!
// Mensagens são compartilhadas via Redis
```

### 5. MONITORAMENTO E MÉTRICAS

```typescript
// PROMETHEUS METRICS (gratuito)
import { register, Counter, Histogram } from 'prom-client';

const httpRequestDuration = new Histogram({
  name: 'http_request_duration_seconds',
  help: 'Duration of HTTP requests in seconds',
  labelNames: ['method', 'route', 'status_code'],
});

const activeUsers = new Counter({
  name: 'active_users_total',
  help: 'Total number of active users',
});

// Endpoint de métricas
app.get('/metrics', async (req, res) => {
  res.set('Content-Type', register.contentType);
  res.end(await register.metrics());
});
```

---

## 🚀 IMPLEMENTAÇÃO PRÁTICA - ROADMAP

### FASE 1: FUNDAÇÃO (Semanas 1-2)
```
✅ Setup do projeto (Next.js + Express + Supabase)
✅ Autenticação básica (email/senha)
✅ CRUD de planilhas simples
✅ Row Level Security no Supabase
✅ Deploy no Vercel + Railway
```

### FASE 2: COLABORAÇÃO (Semanas 3-4)
```
✅ WebSocket com Socket.io
✅ Colaboração em tempo real
✅ Sistema de permissões
✅ Compartilhamento via link
✅ Histórico de mudanças
```

### FASE 3: SEGURANÇA (Semana 5)
```
✅ Rate limiting
✅ Input sanitization
✅ XSS/CSRF protection
✅ Auditoria completa
✅ OWASP compliance
```

### FASE 4: PERFORMANCE (Semana 6)
```
✅ Redis caching
✅ Database indexes
✅ CDN optimization
✅ Lazy loading
✅ Code splitting
```

### FASE 5: FEATURES (Semanas 7-8)
```
✅ OAuth (Google/GitHub)
✅ Import/Export (XLSX, CSV)
✅ Templates
✅ Comentários
✅ Notificações
```

---

## ✅ CHECKLIST DE SEGURANÇA OWASP TOP 10

### A01:2021 – Broken Access Control
- [x] Row Level Security no banco
- [x] Middleware de autorização
- [x] Validação de ownership em todas as operações
- [x] Testes de permissões

### A02:2021 – Cryptographic Failures
- [x] HTTPS obrigatório (Vercel/Railway já incluem)
- [x] Senhas com bcrypt (cost factor 12)
- [x] JWT com assinatura (HS256 ou RS256)
- [x] Tokens em httpOnly cookies

### A03:2021 – Injection
- [x] ORM/Query builder (Prisma)
- [x] Prepared statements sempre
- [x] Input validation (express-validator)
- [x] Output escaping

### A04:2021 – Insecure Design
- [x] Arquitetura revisada por pares
- [x] Threat modeling
- [x] Rate limiting por funcionalidade
- [x] Fail secure (nega por padrão)

### A05:2021 – Security Misconfiguration
- [x] Headers de segurança (Helmet)
- [x] Sem defaults inseguros
- [x] Logs sem dados sensíveis
- [x] Error handling genérico

### A06:2021 – Vulnerable Components
- [x] Dependências atualizadas
- [x] npm audit automatizado (CI/CD)
- [x] Snyk/Dependabot ativo
- [x] Versões fixadas (package-lock.json)

### A07:2021 – Authentication Failures
- [x] MFA opcional (futuro)
- [x] Senha forte obrigatória
- [x] Brute force protection
- [x] Session timeout configurável

### A08:2021 – Software and Data Integrity
- [x] CI/CD com verificação (GitHub Actions)
- [x] Code signing (releases)
- [x] Subresource Integrity (SRI)
- [x] Backups automáticos

### A09:2021 – Logging and Monitoring
- [x] Winston para logs estruturados
- [x] Sentry para erros
- [x] Audit log de ações críticas
- [x] Alertas automáticos

### A10:2021 – Server-Side Request Forgery
- [x] Whitelist de URLs externas
- [x] Sem user input em URLs
- [x] Network segmentation

---

## 📝 PRÓXIMOS PASSOS

1. **Você aprova essa arquitetura?**
   - Posso ajustar qualquer parte

2. **Vou criar o boilerplate completo:**
   - Frontend (Next.js + React)
   - Backend (Express + TypeScript)
   - Database schemas
   - Docker compose para dev local
   - GitHub Actions CI/CD

3. **Documentação para você:**
   - Como rodar localmente
   - Como fazer deploy
   - Como contribuir (open source)

**Pronto para começar? 🚀**
