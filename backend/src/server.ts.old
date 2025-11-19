import Express from "express";
import Helmet from "helmet";
import Cors from "cors";
import dotenv from "dotenv";
import { createServer } from "http";
import { Server as SocketIOServer } from "socket.io";

// Rotas
import { spreadsheetRouter } from "./routes/spreadsheet.routes";
import { permissionsRouter } from "./routes/permissions.routes";
import { realtimeRouter } from "./routes/realtime.routes";

dotenv.config();

// -----------------------------------------------------------------------------
// Configurações básicas
// -----------------------------------------------------------------------------

const app = Express();
app.use(Express.json());

const httpServer = createServer(app);

const FRONTEND_URL = process.env.FRONTEND_URL || "http://localhost:3000";
const PORT = Number(process.env.PORT || 3001);

// -----------------------------------------------------------------------------
// Middlewares globais
// -----------------------------------------------------------------------------

app.use(
  Helmet({
    contentSecurityPolicy: false, // Evita problemas com Next.js + WebSockets
  })
);

app.use(
  Cors({
    origin: FRONTEND_URL,
    methods: ["GET", "POST", "PUT", "DELETE"],
  })
);

// -----------------------------------------------------------------------------
// Rotas REST
// -----------------------------------------------------------------------------

app.use("/spreadsheet", spreadsheetRouter);
app.use("/permissions", permissionsRouter);
app.use("/realtime", realtimeRouter);

// Rota de teste
app.get("/health", (req, res) => {
  return res.json({
    status: "ok",
    uptime: process.uptime(),
  });
});

// -----------------------------------------------------------------------------
// WebSocket (Edição em tempo real)
// -----------------------------------------------------------------------------

const io = new SocketIOServer(httpServer, {
  cors: {
    origin: FRONTEND_URL,
    methods: ["GET", "POST"],
  },
});

io.on("connection", (socket) => {
  console.log("🔌 Novo cliente conectado:", socket.id);

  // Cliente entra em uma planilha
  socket.on("join_sheet", (sheetId) => {
    socket.join(sheetId);
    console.log(`📄 Cliente ${socket.id} entrou na planilha: ${sheetId}`);
  });

  // Cliente envia uma edição de célula
  socket.on("cell_edit", (data) => {
    const { sheetId, cell, value, userId } = data;

    // Repassa para todos os outros clientes da planilha
    socket.to(sheetId).emit("cell_update", {
      cell,
      value,
      userId,
    });
  });

  socket.on("disconnect", () => {
    console.log("❌ cliente desconectado:", socket.id);
  });
});

// -----------------------------------------------------------------------------
// Inicialização do servidor
// -----------------------------------------------------------------------------

httpServer.listen(PORT, () => {
  console.log("\n=====================================");
  console.log("🚀 Backend rodando:");
  console.log(`➡️  http://localhost:${PORT}`);
  console.log(`🌐 Aceitando conexões de: ${FRONTEND_URL}`);
  console.log("=====================================\n");
});