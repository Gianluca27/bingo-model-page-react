const express = require("express");
const router = express.Router();
const db = require("../models/db");
const bcrypt = require("bcrypt");

router.post("/register", async (req, res) => {
  const { nombre, apellido, documento, usuario, email, contraseña } = req.body;

  const hash = await bcrypt.hash(contraseña, 10);

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
    email = "",
    rol = "usuario",
  } = req.body;

  if (!usuario || !password) {
    return res.status(400).json({ error: "Faltan datos obligatorios" });
  }

  try {
    const hash = await bcrypt.hash(password, 10);
    db.run(
      `INSERT INTO Usuarios (nombre, apellido, documento, usuario, email, contraseña, creditos, rol)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [nombre, apellido, documento, usuario, email, hash, creditos, rol],
      function (err) {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ success: true, id: this.lastID });
      }
    );
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.put("/:id", async (req, res) => {
  const {
    usuario,
    creditos,
    contraseña,
    nombre,
    apellido,
    documento,
    email,
    rol,
  } = req.body;

  let query = `
    UPDATE Usuarios 
    SET usuario = ?, creditos = ?, nombre = ?, apellido = ?, documento = ?, email = ?, rol = ?
  `;
  const params = [usuario, creditos, nombre, apellido, documento, email, rol];

  if (contraseña) {
    const hash = await bcrypt.hash(contraseña, 10);
    query += `, contraseña = ?`;
    params.push(hash);
  }

  query += ` WHERE id_usuario = ?`;
  params.push(req.params.id);

  db.run(query, params, (err) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ ok: true });
  });
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
