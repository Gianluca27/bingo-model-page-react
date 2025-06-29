const express = require("express");
const router = express.Router();
const db = require("../models/db");
const bcrypt = require("bcrypt");

router.post("/register", async (req, res) => {
  const { nombre, apellido, documento, usuario, email, contraseña } = req.body;

  const hash = await bcrypt.hash(contraseña, 10); // 👈 hasheo fuerte

  db.get("SELECT * FROM Usuarios WHERE usuario = ?", [usuario], (err, user) => {
    if (user) {
      return res.status(400).json({ error: "Usuario ya registrado" });
    }

    db.run(
      `INSERT INTO Usuarios (nombre, apellido, documento, usuario, email, contraseña, creditos, rol)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [nombre, apellido, documento, usuario, email, hash, 0, "jugador"],
      function (err) {
        if (err) {
          return res.status(500).json({ error: "Error al registrar" });
        }
        return res.status(200).json({ success: true });
      }
    );
  });
});

router.post("/login", (req, res) => {
  const { usuario, contraseña } = req.body;

  if (usuario === "admin" && contraseña === "admin")
    return res.json({ usuario: "admin", admin: true });

  db.get(
    "SELECT * FROM Usuarios WHERE usuario = ?",
    [usuario],
    async (err, row) => {
      if (err) return res.status(500).json({ error: err.message });
      if (!row) return res.status(401).json({ error: "Usuario no encontrado" });

      const match = await bcrypt.compare(contraseña, row.contraseña);
      if (!match)
        return res.status(401).json({ error: "Contraseña incorrecta" });

      res.json({
        success: true,
        username: row.usuario,
        creditos: row.creditos,
        admin: row.rol === "admin",
      });
    }
  );
});

router.get("/", (req, res) => {
  db.all("SELECT * FROM Usuarios", [], (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows);
  });
});

router.post("/", async (req, res) => {
  const {
    nombre,
    apellido,
    documento,
    usuario,
    password,
    creditos = 0,
  } = req.body;

  if (!usuario || !password) {
    return res.status(400).json({ error: "Faltan datos obligatorios" });
  }

  try {
    const hash = await bcrypt.hash(password, 10);
    db.run(
      `INSERT INTO Usuarios (nombre, apellido, documento, usuario, contraseña, creditos)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [nombre, apellido, documento, usuario, hash, creditos],
      function (err) {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ success: true, id: this.lastID });
      }
    );
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.put("/:id", (req, res) => {
  const { usuario, contraseña, creditos } = req.body;
  db.run(
    "UPDATE Usuarios SET usuario = ?, contraseña = ?, creditos = ? WHERE id_usuario = ?",
    [usuario, contraseña, creditos, req.params.id],
    (err) => {
      if (err) return res.status(500).json({ error: err.message });
      res.json({ ok: true });
    }
  );
});

router.delete("/:id", (req, res) => {
  db.run(
    "DELETE FROM Usuarios WHERE id_usuario = ?",
    [req.params.id],
    (err) => {
      if (err) return res.status(500).json({ error: err.message });
      res.json({ ok: true });
    }
  );
});

module.exports = router;
