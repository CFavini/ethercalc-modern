# 📊 EtherCalc Modern - Planilha Colaborativa Open Source

<div align="center">

![Version](https://img.shields.io/badge/version-1.0.0--beta-blue)
![License](https://img.shields.io/badge/license-MIT-green)
![Node](https://img.shields.io/badge/node-20%2B-brightgreen)
![TypeScript](https://img.shields.io/badge/typescript-5.0%2B-blue)

**Reescrita moderna do EtherCalc com foco em segurança, performance e escalabilidade**

[Demo](https://ethercalc-demo.vercel.app) • [Documentação](./docs) • [Roadmap](#roadmap) • [Contribuir](#contribuindo)

</div>

---

## 🎯 Sobre o Projeto

Este é um fork moderno e seguro do [EtherCalc original](https://github.com/audreyt/ethercalc), reescrito do zero com tecnologias atuais para resolver os problemas críticos da versão original.

### Problemas Resolvidos
- ❌ LiveScript → ✅ TypeScript moderno
- ❌ Node.js 4.x → ✅ Node.js 20+ LTS
- ❌ 72 vulnerabilidades → ✅ Zero vulnerabilidades críticas
- ❌ Sem autenticação → ✅ Auth robusta (JWT + OAuth)
- ❌ Stack obsoleta → ✅ Stack atualizada e mantida

---

## ✨ Features

### Implementadas (v1.0-beta)
- ✅ **Autenticação Segura**: Email/senha, OAuth (Google/GitHub)
- ✅ **Colaboração Real-Time**: WebSocket com Socket.io
- ✅ **Permissões Granulares**: View, Comment, Edit, Admin
- ✅ **Compartilhamento Seguro**: Links com senha opcional
- ✅ **Auditoria Completa**: Histórico de mudanças
- ✅ **Performance**: Cache Redis, queries otimizadas
- ✅ **Segurança OWASP**: Rate limiting, RLS, input sanitization

---

## 🏗️ Arquitetura

**Stack Tecnológica:**
- **Frontend**: Next.js 15 + React 18 + TypeScript + TailwindCSS
- **Backend**: Node.js 20 + Express + Socket.io + TypeScript
- **Database**: PostgreSQL 15 (Supabase) + Redis 7
- **Auth**: Supabase Auth + JWT + OAuth 2.0
- **Deploy**: 100% gratuito (Vercel + Railway + Supabase)

---

## 🚀 Quick Start

```bash
# 1. Clone
git clone https://github.com/seu-usuario/ethercalc-modern.git
cd ethercalc-modern

# 2. Configure .env
cp backend/.env.example backend/.env
cp frontend/.env.example frontend/.env.local

# 3. Rode com Docker
docker-compose up -d

# 4. Acesse
# Frontend: http://localhost:3000
# Backend: http://localhost:3001
```

---

## 📖 Documentação Completa

- 📘 [Arquitetura de Segurança](./ETHERCALC_SECURITY_ARCHITECTURE.md)
- 💻 [Guia de Implementação](./ETHERCALC_IMPLEMENTATION_GUIDE.md)
- 🚀 [Deploy e Roadmap](./ETHERCALC_DEPLOY_ROADMAP.md)

---

## 🛡️ Segurança

✅ Conformidade com **OWASP Top 10 2021**
✅ Rate limiting e DDoS protection
✅ Row Level Security (RLS)
✅ Input sanitization e XSS protection
✅ Auditoria completa de ações

**Reportar vulnerabilidade**: security@ethercalc.dev

---

## 📋 Roadmap

- ✅ v1.0-beta: CRUD + Auth + Real-time
- 🔄 v1.1: Import/Export + Templates
- 📋 v2.0: Fórmulas avançadas + Charts

---

## 🤝 Contribuindo

Contribuições são bem-vindas! Veja [CONTRIBUTING.md](./CONTRIBUTING.md)

---

## 📜 Licença

MIT License - veja [LICENSE](./LICENSE)

---

<div align="center">

**Feito com ❤️ pela comunidade open source**

⭐️ Se este projeto te ajudou, considere dar uma estrela!

</div>
