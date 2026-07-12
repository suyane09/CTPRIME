require("dotenv").config();
const path = require("path");
const express = require("express");
const cors = require("cors");
const http = require("http");
const { Server } = require("socket.io");

require("./db"); // garante que o banco e o seed inicial existam antes de tudo

const app = express();
const servidorHttp = http.createServer(app);
const io = new Server(servidorHttp, { cors: { origin: "*" } });

app.set("io", io);
app.use(cors());
app.use(express.json());

// -------- Rotas da API --------
app.use("/api/auth", require("./routes/auth"));
app.use("/api/produtos", require("./routes/produtos"));
app.use("/api/estoque", require("./routes/estoque"));
app.use("/api/pedidos", require("./routes/pedidos"));
app.use("/api/usuarios", require("./routes/usuarios"));
app.use("/api/relatorios", require("./routes/relatorios"));
app.use("/api/configuracoes", require("./routes/configuracoes"));

app.get("/api/health", (req, res) => res.json({ status: "ok", horario: new Date().toISOString() }));

// -------- Frontend estático (index.html do painel + cardapio.html) --------
app.use(express.static(path.join(__dirname, "public")));
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});
// Tratamento de erros central
app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ erro: "Erro interno no servidor." });
});

io.on("connection", (socket) => {
  console.log("🔌 Cliente conectado via WebSocket:", socket.id);
  socket.on("disconnect", () => console.log("🔌 Cliente desconectado:", socket.id));
});

const PORTA = process.env.PORT || 3000;
servidorHttp.listen(PORTA, () => {
  console.log(`✅ CT Prime API rodando em http://localhost:${PORTA}`);
  console.log(`   Painel administrativo: http://localhost:${PORTA}/index.html`);
  console.log(`   Cardápio do cliente:   http://localhost:${PORTA}/cardapio.html`);
});
