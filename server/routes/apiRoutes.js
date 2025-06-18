// routes/apiRoutes.js
const express = require("express");

const usuariosRoutes = require("./usuarios");
const partidasRoutes = require("./partidas");
const historialRoutes = require("./historial");
const cartonesRoutes = require("./cartones");

const db = require("../models/db");

function registrarRutas(app) {
  app.use("/api/usuarios", usuariosRoutes);
  app.use("/api/partidas", partidasRoutes);
  app.use("/api/historial", historialRoutes);
  app.use("/api/cartones", cartonesRoutes);

  app.get("/api/partida-visible", (req, res) => {
    const partidaActual =
      require("../services/gameManager").obtenerPartidaActual();
    if (partidaActual) {
      return res.json({
        valorCarton: partidaActual.valor_carton,
        premioLinea: partidaActual.premio_linea,
        premioBingo: partidaActual.premio_bingo,
        premioAcumulado: partidaActual.premio_acumulado,
        fechaSorteo: partidaActual.fecha_hora_jugada,
        estado: "activa",
      });
    }

    db.get(
      `SELECT * FROM Partidas WHERE estado = 'pendiente' ORDER BY fecha_hora_jugada ASC LIMIT 1`,
      [],
      (err, partida) => {
        if (err)
          return res.status(500).json({ error: "Error en la base de datos" });
        if (!partida) return res.json(null);

        res.json({
          valorCarton: partida.valor_carton,
          premioLinea: partida.premio_linea,
          premioBingo: partida.premio_bingo,
          premioAcumulado: partida.premio_acumulado,
          fechaSorteo: partida.fecha_hora_jugada,
          estado: "pendiente",
        });
      }
    );
  });

  app.get("/api/uso", (req, res) => {
    db.all(
      "SELECT * FROM Uso ORDER BY fecha_hora_momento DESC",
      [],
      (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(rows);
      }
    );
  });
}

module.exports = registrarRutas;
