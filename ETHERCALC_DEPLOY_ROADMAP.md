# 🚀 ETHERCALC - GUIA DE DEPLOY E ROADMAP

## 📋 DEPLOY NAS PLATAFORMAS GRATUITAS

---

## 1️⃣ SETUP INICIAL (Antes de Qualquer Deploy)

### Criar Conta nos Serviços

1. **GitHub** - https://github.com
   - Crie repositório: `ethercalc-modern`
   - Faça push do código

2. **Supabase** - https://supabase.com
   - New Project → escolha região mais próxima (São Paulo)
   - Anote: `SUPABASE_URL` e `SUPABASE_ANON_KEY`

3. **Vercel** - https://vercel.com
   - Conecte com GitHub
   - Grátis ilimitado

4. **Railway.app** - https://railway.app
   - Login com GitHub
   - $5 crédito grátis/mês

5. **Redis Cloud** - https://redis.com/try-free
   - 30MB grátis
   - Anote: `REDIS_URL`

---

## 2️⃣ CONFIGURAR SUPABASE (Database)

### Passo 1: Criar Tabelas

Vá em **SQL Editor** no painel do Supabase e execute:

```sql
-- Ativar extensões necessárias
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Tabela de perfis de usuário
CREATE TABLE public.user_profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name VARCHAR(100),
  avatar_url TEXT,
  plan VARCHAR(20) DEFAULT 'free',
  storage_used BIGINT DEFAULT 0,
  storage_limit BIGINT DEFAULT 52428800, -- 50MB
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Trigger para criar perfil automaticamente ao criar usuário
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.user_profiles (id, display_name)
  VALUES (NEW.id, NEW.email);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Tabela de planilhas
CREATE TABLE public.spreadsheets (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title VARCHAR(255) NOT NULL,
  slug VARCHAR(100) UNIQUE NOT NULL,
  owner_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  visibility VARCHAR(20) DEFAULT 'private' CHECK (visibility IN ('private', 'link', 'public')),
  password_hash VARCHAR(255),
  data JSONB DEFAULT '{}'::jsonb,
  last_edited TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  view_count INTEGER DEFAULT 0
);

-- Índices para performance
CREATE INDEX idx_spreadsheets_owner ON spreadsheets(owner_id);
CREATE INDEX idx_spreadsheets_slug ON spreadsheets(slug);
CREATE INDEX idx_spreadsheets_visibility ON spreadsheets(visibility);
CREATE INDEX idx_spreadsheets_last_edited ON spreadsheets(last_edited DESC);

-- Tabela de permissões de compartilhamento
CREATE TABLE public.spreadsheet_permissions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  spreadsheet_id UUID REFERENCES spreadsheets(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  permission VARCHAR(20) NOT NULL CHECK (permission IN ('view', 'comment', 'edit', 'admin')),
  granted_by UUID REFERENCES auth.users(id),
  granted_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(spreadsheet_id, user_id)
);

CREATE INDEX idx_permissions_spreadsheet ON spreadsheet_permissions(spreadsheet_id);
CREATE INDEX idx_permissions_user ON spreadsheet_permissions(user_id);

-- Tabela de histórico (auditoria)
CREATE TABLE public.spreadsheet_history (
  id BIGSERIAL PRIMARY KEY,
  spreadsheet_id UUID REFERENCES spreadsheets(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES auth.users(id),
  action VARCHAR(50) NOT NULL,
  changes JSONB,
  ip_address INET,
  user_agent TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_history_spreadsheet ON spreadsheet_history(spreadsheet_id);
CREATE INDEX idx_history_user ON spreadsheet_history(user_id);
CREATE INDEX idx_history_created ON spreadsheet_history(created_at DESC);

-- Função para atualizar last_edited automaticamente
CREATE OR REPLACE FUNCTION update_last_edited()
RETURNS TRIGGER AS $$
BEGIN
  NEW.last_edited = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_last_edited
  BEFORE UPDATE ON spreadsheets
  FOR EACH ROW
  EXECUTE FUNCTION update_last_edited();
```

### Passo 2: Configurar Row Level Security (RLS)

```sql
-- Ativar RLS em todas as tabelas
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE spreadsheets ENABLE ROW LEVEL SECURITY;
ALTER TABLE spreadsheet_permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE spreadsheet_history ENABLE ROW LEVEL SECURITY;

-- Políticas para user_profiles
CREATE POLICY "Usuários podem ver próprio perfil"
  ON user_profiles FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Usuários podem atualizar próprio perfil"
  ON user_profiles FOR UPDATE
  USING (auth.uid() = id);

-- Políticas para spreadsheets
CREATE POLICY "Usuários podem ver planilhas públicas"
  ON spreadsheets FOR SELECT
  USING (
    visibility = 'public'
    OR owner_id = auth.uid()
    OR id IN (
      SELECT spreadsheet_id FROM spreadsheet_permissions 
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Usuários podem criar planilhas"
  ON spreadsheets FOR INSERT
  WITH CHECK (owner_id = auth.uid());

CREATE POLICY "Owners e editores podem atualizar"
  ON spreadsheets FOR UPDATE
  USING (
    owner_id = auth.uid()
    OR id IN (
      SELECT spreadsheet_id FROM spreadsheet_permissions 
      WHERE user_id = auth.uid() 
      AND permission IN ('edit', 'admin')
    )
  );

CREATE POLICY "Apenas owners podem deletar"
  ON spreadsheets FOR DELETE
  USING (owner_id = auth.uid());

-- Políticas para permissions
CREATE POLICY "Usuários podem ver suas permissões"
  ON spreadsheet_permissions FOR SELECT
  USING (
    user_id = auth.uid()
    OR spreadsheet_id IN (
      SELECT id FROM spreadsheets WHERE owner_id = auth.uid()
    )
  );

CREATE POLICY "Owners podem gerenciar permissões"
  ON spreadsheet_permissions FOR ALL
  USING (
    spreadsheet_id IN (
      SELECT id FROM spreadsheets WHERE owner_id = auth.uid()
    )
  );

-- Políticas para history
CREATE POLICY "Usuários podem ver histórico de suas planilhas"
  ON spreadsheet_history FOR SELECT
  USING (
    spreadsheet_id IN (
      SELECT id FROM spreadsheets 
      WHERE owner_id = auth.uid()
      OR id IN (
        SELECT spreadsheet_id FROM spreadsheet_permissions 
        WHERE user_id = auth.uid()
      )
    )
  );
```

### Passo 3: Configurar Autenticação

No painel Supabase → **Authentication** → **Providers**:

1. ✅ Ativar **Email**
2. ✅ Desativar **"Confirm email"** (para beta)
3. ✅ Ativar **Google OAuth** (opcional)
4. ✅ Ativar **GitHub OAuth** (opcional)

---

## 3️⃣ DEPLOY DO FRONTEND (VERCEL)

### Via Interface Web (Mais Fácil)

1. Acesse https://vercel.com
2. **New Project**
3. **Import Git Repository** → Selecione seu repo
4. Configure:
   - **Framework Preset**: Next.js
   - **Root Directory**: `frontend`
   - **Build Command**: `npm run build`
   - **Output Directory**: `.next`

5. **Environment Variables** (adicione):
   ```
   NEXT_PUBLIC_SUPABASE_URL=sua-url-do-supabase
   NEXT_PUBLIC_SUPABASE_ANON_KEY=sua-chave-anon
   NEXT_PUBLIC_API_URL=https://seu-backend.railway.app
   ```

6. Clique em **Deploy**

### Via CLI (Alternativa)

```bash
# Instalar Vercel CLI
npm i -g vercel

# Na pasta do frontend
cd frontend

# Login
vercel login

# Deploy
vercel

# Em produção
vercel --prod
```

**Resultado**: Seu frontend estará em `https://ethercalc-beta.vercel.app`

---

## 4️⃣ DEPLOY DO BACKEND (RAILWAY.APP)

### Passo 1: Criar Projeto

1. Acesse https://railway.app
2. **New Project**
3. **Deploy from GitHub repo**
4. Selecione seu repositório

### Passo 2: Configurar Serviços

```bash
# Adicionar PostgreSQL (opcional, estamos usando Supabase)
# Adicionar Redis

# Na interface Railway:
1. Clique em "New" → "Database" → "Add Redis"
2. Anote a URL do Redis
```

### Passo 3: Configurar Backend Service

1. Na interface Railway, clique no seu repositório
2. **Settings** → **Root Directory**: `backend`
3. **Variables** → Adicione:

```bash
NODE_ENV=production
PORT=3001
FRONTEND_URL=https://ethercalc-beta.vercel.app

# Supabase
SUPABASE_URL=sua-url
SUPABASE_ANON_KEY=sua-chave-anon
SUPABASE_SERVICE_KEY=sua-chave-service

# Redis (copie do Redis service no Railway)
REDIS_URL=${{Redis.REDIS_URL}}

# JWT
JWT_SECRET=gere-uma-chave-super-secreta-aqui-use-openssl-rand-base64-32
JWT_EXPIRES_IN=15m
JWT_REFRESH_EXPIRES_IN=7d
```

4. **Deploy** → Railway vai buildar e deployar automaticamente

### Passo 4: Obter URL do Backend

Railway vai gerar uma URL tipo: `https://ethercalc-backend.railway.app`

Copie essa URL e **atualize** a variável `NEXT_PUBLIC_API_URL` no Vercel.

---

## 5️⃣ CONFIGURAR REDIS CLOUD

1. Acesse https://redis.com/try-free
2. **Create database**
3. Selecione região próxima (São Paulo ou Virginia)
4. **Free tier** (30MB)
5. Copie a **Connection URL**
6. Cole no Railway como `REDIS_URL`

---

## 6️⃣ CONFIGURAR DOMÍNIO PERSONALIZADO (OPCIONAL)

### No Vercel (Frontend)

1. **Project Settings** → **Domains**
2. Adicione seu domínio: `ethercalc.seudomain.com`
3. Configure DNS conforme instruções

### No Railway (Backend)

1. **Settings** → **Domains**
2. **Generate Domain** ou adicione personalizado
3. Use: `api.ethercalc.seudomain.com`

---

## 7️⃣ CONFIGURAR CI/CD (GITHUB ACTIONS)

### 📁 `.github/workflows/deploy.yml`

```yaml
name: Deploy

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

jobs:
  test-backend:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      
      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '20'
          
      - name: Install dependencies
        run: |
          cd backend
          npm ci
          
      - name: Run tests
        run: |
          cd backend
          npm test
          
      - name: Run lint
        run: |
          cd backend
          npm run lint

  test-frontend:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      
      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '20'
          
      - name: Install dependencies
        run: |
          cd frontend
          npm ci
          
      - name: Run tests
        run: |
          cd frontend
          npm test
          
      - name: Build
        run: |
          cd frontend
          npm run build
        env:
          NEXT_PUBLIC_SUPABASE_URL: ${{ secrets.SUPABASE_URL }}
          NEXT_PUBLIC_SUPABASE_ANON_KEY: ${{ secrets.SUPABASE_ANON_KEY }}

  security-scan:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      
      - name: Run Snyk security scan
        uses: snyk/actions/node@master
        env:
          SNYK_TOKEN: ${{ secrets.SNYK_TOKEN }}
        with:
          args: --severity-threshold=high

  deploy:
    needs: [test-backend, test-frontend]
    runs-on: ubuntu-latest
    if: github.ref == 'refs/heads/main'
    steps:
      - name: Deploy to Railway
        run: echo "Railway deploys automatically from main branch"
      
      - name: Deploy to Vercel
        run: echo "Vercel deploys automatically from main branch"
```

---

## 📅 ROADMAP DE DESENVOLVIMENTO - 8 SEMANAS

### 🗓️ SEMANA 1: FUNDAÇÃO

**Objetivos:**
- ✅ Setup do projeto (repos, estrutura)
- ✅ Configurar Supabase (DB + Auth)
- ✅ Autenticação básica (email/senha)
- ✅ Página de login/registro

**Entregas:**
- Usuários podem se cadastrar e fazer login
- Frontend funcional com tela básica
- Backend com API de autenticação

**Tarefas:**
```bash
□ Criar repositório GitHub
□ Setup Next.js (frontend)
□ Setup Express (backend)
□ Configurar Supabase
□ Implementar login/registro
□ Primeira versão no ar (Vercel + Railway)
```

---

### 🗓️ SEMANA 2: CRUD DE PLANILHAS

**Objetivos:**
- ✅ Criar planilha simples
- ✅ Listar planilhas do usuário
- ✅ Editar título
- ✅ Deletar planilha
- ✅ Row Level Security funcionando

**Entregas:**
- Dashboard com lista de planilhas
- Formulário de criação
- CRUD completo

**Tarefas:**
```bash
□ API de spreadsheets (CRUD)
□ Tela de lista de planilhas
□ Modal de criação
□ Tela de edição básica
□ Implementar RLS no Supabase
□ Testes unitários básicos
```

---

### 🗓️ SEMANA 3: EDITOR DE PLANILHA

**Objetivos:**
- ✅ Grid de células funcional
- ✅ Edição de células
- ✅ Navegação por teclado
- ✅ Salvar automaticamente

**Entregas:**
- Editor básico funcional
- Salvar mudanças no banco

**Tarefas:**
```bash
□ Componente de Grid (React)
□ Lógica de células e fórmulas básicas
□ Auto-save (debounced)
□ Undo/Redo básico
□ Loading states
```

---

### 🗓️ SEMANA 4: COLABORAÇÃO TEMPO REAL

**Objetivos:**
- ✅ WebSocket com Socket.io
- ✅ Múltiplos usuários editando
- ✅ Ver cursores de outros usuários
- ✅ Sincronização de mudanças

**Entregas:**
- Colaboração tempo real funcional
- Indicadores de presença

**Tarefas:**
```bash
□ Configurar Socket.io (backend)
□ Client WebSocket (frontend)
□ Broadcast de mudanças
□ Mostrar usuários online
□ Conflict resolution básico
□ Testes de stress (10 usuários simultâneos)
```

---

### 🗓️ SEMANA 5: SEGURANÇA

**Objetivos:**
- ✅ Rate limiting
- ✅ Input sanitization
- ✅ XSS protection
- ✅ CSRF tokens
- ✅ Auditoria OWASP

**Entregas:**
- Sistema completamente seguro
- Checklist OWASP completo

**Tarefas:**
```bash
□ Implementar rate limiting (Redis)
□ Sanitizar todos inputs
□ Headers de segurança (Helmet)
□ Testes de penetração básicos
□ Configurar Sentry (error tracking)
□ Logs estruturados
```

---

### 🗓️ SEMANA 6: PERFORMANCE E CACHE

**Objetivos:**
- ✅ Redis caching
- ✅ Database indexes
- ✅ Code splitting frontend
- ✅ Lazy loading
- ✅ Otimização de queries

**Entregas:**
- Sistema 3x mais rápido
- Tempo de carregamento < 2s

**Tarefas:**
```bash
□ Implementar cache de planilhas (Redis)
□ Criar índices no PostgreSQL
□ Code splitting no Next.js
□ Lazy load componentes pesados
□ Pagination em listas
□ Lighthouse score > 90
```

---

### 🗓️ SEMANA 7: PERMISSÕES E COMPARTILHAMENTO

**Objetivos:**
- ✅ Sistema de permissões (view/edit/admin)
- ✅ Compartilhar via link
- ✅ Compartilhar com usuários específicos
- ✅ Links com senha (opcional)

**Entregas:**
- Compartilhamento completo
- Gestão de permissões

**Tarefas:**
```bash
□ API de compartilhamento
□ Middleware de autorização
□ UI de compartilhamento
□ Links temporários
□ Proteção por senha
□ Histórico de compartilhamentos
```

---

### 🗓️ SEMANA 8: FEATURES EXTRAS + POLISH

**Objetivos:**
- ✅ OAuth (Google/GitHub)
- ✅ Import/Export (XLSX, CSV)
- ✅ Templates de planilhas
- ✅ Comentários
- ✅ UI/UX polish

**Entregas:**
- Produto completo e polido
- Pronto para lançamento beta

**Tarefas:**
```bash
□ Implementar OAuth providers
□ Import/Export com SheetJS
□ 5-10 templates prontos
□ Sistema de comentários
□ Animações e transições
□ Onboarding para novos usuários
□ Documentação completa
```

---

## 🎯 CRITÉRIOS DE SUCESSO (BETA)

### Performance
- ⚡ First Contentful Paint < 1.5s
- ⚡ Time to Interactive < 3s
- ⚡ API response time < 200ms (p95)
- ⚡ WebSocket latency < 50ms

### Segurança
- 🔒 Score OWASP A+ (todas as categorias)
- 🔒 Zero vulnerabilidades críticas (npm audit)
- 🔒 Rate limiting funcionando
- 🔒 Logs de auditoria completos

### Escalabilidade
- 📈 Suportar 100 usuários simultâneos
- 📈 Database queries otimizadas (< 50ms)
- 📈 Cache hit ratio > 80%
- 📈 Horizontal scaling ready

### UX
- 🎨 Design responsivo (mobile/desktop)
- 🎨 Acessibilidade WCAG 2.1 AA
- 🎨 Suporte a teclado completo
- 🎨 Loading states em todas operações

---

## 📊 MONITORAMENTO PÓS-DEPLOY

### Ferramentas Gratuitas

1. **Sentry** (Error Tracking)
   - 10k eventos/mês grátis
   - https://sentry.io

2. **LogRocket** (Session Replay)
   - 1k sessões/mês grátis
   - https://logrocket.com

3. **Google Analytics** (Usage Analytics)
   - Completamente grátis
   - https://analytics.google.com

4. **Uptime Robot** (Monitoring)
   - 50 monitores grátis
   - https://uptimerobot.com

### Métricas para Acompanhar

```
📊 Usuários
- Novos registros/dia
- Usuários ativos (DAU/MAU)
- Taxa de retenção

📊 Performance
- API latency (p50, p95, p99)
- Error rate
- WebSocket uptime

📊 Uso
- Planilhas criadas/dia
- Colaborações ativas
- Storage usado

📊 Segurança
- Tentativas de login falhadas
- Rate limit hits
- Suspicious activity
```

---

## 🚨 TROUBLESHOOTING COMUM

### Problema: Railway fica "dormindo"

**Solução**: Plano grátis tem cold start. Opções:
1. Upgrade para $5/mês (sempre ligado)
2. Use cron job para "pingar" a cada 10min
3. Migre para Fly.io (3 VMs grátis sempre ligadas)

### Problema: Vercel "Function Execution Timeout"

**Solução**: 
1. Otimize queries longas
2. Use ISR (Incremental Static Regeneration)
3. Mova processamento pesado para backend

### Problema: Supabase "too many connections"

**Solução**:
1. Use connection pooling (Supavisor)
2. Configure `max_connections` correto
3. Feche conexões após uso

### Problema: Redis "out of memory"

**Solução**:
1. Implemente LRU (least recently used)
2. Reduza TTL dos caches
3. Upgrade para 100MB ($5/mês)

---

## 📝 CHECKLIST PRÉ-LANÇAMENTO

### Backend
- [ ] Todas rotas têm autenticação
- [ ] Rate limiting configurado
- [ ] Logs estruturados funcionando
- [ ] Error handling global
- [ ] Testes unitários > 70% coverage
- [ ] Documentação API (Swagger)
- [ ] Health check endpoint
- [ ] Backups automáticos configurados

### Frontend
- [ ] SEO otimizado (meta tags)
- [ ] Acessibilidade verificada
- [ ] Loading states em todas ações
- [ ] Error boundaries implementados
- [ ] PWA configurado (opcional)
- [ ] Analytics instalado
- [ ] Favicon e assets otimizados
- [ ] Lighthouse score > 90

### Database
- [ ] RLS ativado em todas tabelas
- [ ] Índices criados
- [ ] Backups automáticos
- [ ] Migrations versionadas

### DevOps
- [ ] CI/CD funcionando
- [ ] Monitoring configurado
- [ ] Alertas críticos configurados
- [ ] Documentação de deploy
- [ ] Runbook de incidentes

### Segurança
- [ ] HTTPS obrigatório
- [ ] Headers de segurança (Helmet)
- [ ] Input sanitization
- [ ] SQL injection protegido
- [ ] XSS protegido
- [ ] CSRF protegido
- [ ] Dependências atualizadas
- [ ] Secrets não commitados

---

## 🎉 PRÓXIMOS PASSOS DEPOIS DO BETA

1. **Feedback Loop**
   - Criar canal de feedback (Discord/Slack)
   - Google Forms para sugestões
   - Analisar analytics

2. **Monetização** (Futuro)
   - Plano Pro ($9/mês)
   - Plano Enterprise (custom)
   - Features premium

3. **Escalar Infraestrutura**
   - Migrar para planos pagos quando necessário
   - Implementar CDN (Cloudflare)
   - Load balancer

4. **Community Building**
   - Open source bem documentado
   - Video tutorial no YouTube
   - Blog posts técnicos

---

**Pronto para começar? Este é seu guia completo de deploy! 🚀**

**Comandos rápidos para começar agora:**

```bash
# 1. Clone o template (quando eu criar)
git clone https://github.com/seu-user/ethercalc-modern
cd ethercalc-modern

# 2. Configure ambientes
cp backend/.env.example backend/.env
cp frontend/.env.example frontend/.env.local
# Edite os arquivos com suas credenciais

# 3. Rode localmente
docker-compose up -d

# 4. Deploy!
# Frontend: Push para main → Vercel deploya automaticamente
# Backend: Push para main → Railway deploya automaticamente

# 5. Monitore
# Acesse dashboards de Vercel, Railway e Supabase
```

**Alguma dúvida sobre deploy ou infraestrutura?**
