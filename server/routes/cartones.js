const express = require("express");
const db = require("../models/db");
const router = express.Router();

router.get("/", (req, res) => {
  db.all(
    "SELECT * FROM CartonesAsignados ORDER BY fecha_asignacion DESC",
    (err, rows) => {
      if (err)
        return res.status(500).json({ error: "Error al obtener cartones." });
      res.json(rows);
    }
  );
});

router.post("/", (req, res) => {
  const { usuario, id_partida, numero_carton } = req.body;
  if (!usuario || !id_partida || !numero_carton) {
    return res.status(400).json({ error: "Datos incompletos." });
  }
  db.run(
    `INSERT INTO CartonesAsignados (usuario, id_partida, numero_carton)
     VALUES (?, ?, ?)`,
    [usuario, id_partida, numero_carton],
    (err) => {
      if (err) return res.status(500).json({ error: "Error al crear cartón." });
      res.json({ success: true });
    }
  );
});

module.exports = router;
