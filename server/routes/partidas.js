const express = require("express");
const db = require("../models/db");
const router = express.Router();

// Obtener todas las partidas
router.get("/", (req, res) => {
  db.all(
    "SELECT * FROM Partidas ORDER BY fecha_hora_jugada ASC",
    (err, rows) => {
      if (err)
        return res.status(500).json({ error: "Error al obtener partidas." });
      res.json(rows);
    }
  );
});

// Obtener partida por ID
router.get("/:id", (req, res) => {
  const id = req.params.id;
  db.get("SELECT * FROM Partidas WHERE id_partida = ?", [id], (err, row) => {
    if (err)
      return res.status(500).json({ error: "Error al obtener partida." });
    res.json(row);
  });
});

// Obtener la próxima partida pendiente

// Crear nueva partida
router.post("/", (req, res) => {
  const {
    fecha_hora_jugada,
    valor_carton,
    premio_linea,
    premio_bingo,
    premio_acumulado,
  } = req.body;

  db.run(
    `INSERT INTO Partidas 
     (fecha_hora_jugada, valor_carton, premio_linea, premio_bingo, premio_acumulado, estado, intervalo)
     VALUES (?, ?, ?, ?, ?, 'pendiente', 10)`,
    [
      fecha_hora_jugada,
      valor_carton,
      premio_linea,
      premio_bingo,
      premio_acumulado,
    ],
    function (err) {
      if (err)
        return res.status(500).json({ error: "Error al agregar partida." });
      res.json({ success: true, id: this.lastID });
    }
  );
});

// Finalizar partidas por array de IDs
router.post("/finalizar", (req, res) => {
  const { ids } = req.body;
  const placeholders = ids.map(() => "?").join(",");

  db.run(
    `UPDATE Partidas SET estado = 'finalizada' WHERE id_partida IN (${placeholders})`,
    ids,
    (err) => {
      if (err)
        return res.status(500).json({ error: "Error al finalizar partidas." });
      res.json({ success: true });
    }
  );
});

router.post("/iniciar", (req, res) => {
  const { ids } = req.body;

  db.all(
    `SELECT id_partida, fecha_hora_jugada FROM Partidas WHERE id_partida IN (${ids
      .map(() => "?")
      .join(",")})`,
    ids,
    (err, partidas) => {
      if (err)
        return res.status(500).json({ error: "Error al buscar partidas." });

      const ahora = new Date();
      const idsValidos = partidas
        .filter((p) => new Date(p.fecha_hora_jugada) <= ahora)
        .map((p) => p.id_partida);

      if (idsValidos.length === 0)
        return res
          .status(400)
          .json({ error: "Ninguna partida puede iniciarse todavía." });

      const placeholders = idsValidos.map(() => "?").join(",");
      db.run(
        `UPDATE Partidas SET estado = 'activa' WHERE id_partida IN (${placeholders})`,
        idsValidos,
        (err2) => {
          if (err2)
            return res
              .status(500)
              .json({ error: "Error al iniciar partidas." });
          res.json({ success: true, iniciadas: idsValidos });
        }
      );
    }
  );
});

router.put("/:id", (req, res) => {
  const id = req.params.id;
  const {
    fecha_hora_jugada,
    valor_carton,
    premio_linea,
    premio_bingo,
    premio_acumulado,
    estado,
    intervalo,
  } = req.body;

  db.run(
    `UPDATE Partidas
     SET fecha_hora_jugada = ?, valor_carton = ?, premio_linea = ?, premio_bingo = ?, premio_acumulado = ?, estado = ?, intervalo = ?
     WHERE id_partida = ?`,
    [
      fecha_hora_jugada,
      valor_carton,
      premio_linea,
      premio_bingo,
      premio_acumulado,
      estado || "pendiente",
      intervalo || 10,
      id,
    ],
    function (err) {
      if (err) {
        console.error("❌ Error al actualizar partida:", err.message);
        return res.status(500).json({ error: "Error al actualizar partida." });
      }
      res.json({ success: true });
    }
  );
});

module.exports = router;
