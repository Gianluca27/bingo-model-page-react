// routes/historial.routes.js
const express = require("express");
const db = require("../models/db");
const router = express.Router();

// Obtener historial de sorteos
router.get("/", (req, res) => {
  db.all(
    "SELECT * FROM HistorialSorteos ORDER BY fecha_hora DESC",
    [],
    (err, rows) => {
      if (err)
        return res.status(500).json({ error: "Error al obtener historial." });
      res.json(rows);
    }
  );
});

// Eliminar entrada del historial por ID
router.delete("/:id", (req, res) => {
  const id = req.params.id;
  db.run("DELETE FROM HistorialSorteos WHERE id = ?", [id], function (err) {
    if (err)
      return res.status(500).json({ error: "Error al eliminar historial." });
    res.json({ success: true });
  });
});

module.exports = router;
