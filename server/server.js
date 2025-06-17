const express = require("express");
const http = require("http");
const cors = require("cors");
const sqlite3 = require("sqlite3").verbose();
const { Server } = require("socket.io");
const partidasRoutes = require("./routes/partidas");

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: "http://localhost:3000",
    methods: ["GET", "POST"],
    credentials: true,
  },
});

app.use(cors({ origin: "http://localhost:3000", credentials: true }));
app.use(express.json());
app.use("/api/partidas", partidasRoutes);

const registrarRutas = require("./routes/apiRoutes");
const registrarSockets = require("./socket/socketHandlers");
const iniciarTimerEspera = require("./services/partidaScheduler");
registrarRutas(app);
registrarSockets(io);
iniciarTimerEspera(io);

server.listen(3001, () => {
  console.log("🚀 Servidor escuchando en http://localhost:3001");
});
