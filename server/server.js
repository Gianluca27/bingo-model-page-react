import express from "express";
import http from "http";
import cors from "cors";
import sqlite3 from "sqlite3";
import { Server } from "socket.io";
import partidasRoutes from "./routes/partidas.js";
import mercadoPagoRoutes from "./routes/mercadopago.js";
import registrarRutas from "./routes/apiRoutes.js";
import registrarSockets from "./socket/socketHandlers.js";
import iniciarTimerEspera from "./services/partidaScheduler.js";

sqlite3.verbose();

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
app.use("/api/mercadopago", mercadoPagoRoutes);

registrarRutas(app);
registrarSockets(io);
iniciarTimerEspera(io);

server.listen(3001, () => {
  console.log("🚀 Servidor escuchando en http://localhost:3001");
});
