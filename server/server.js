const express = require("express");
const app = express();
/////////////////////////////  ✅ Middleware para permitir todos los métodos HTTP
app.use((req, res, next) => {
  res.header("Access-Control-Allow-Origin", "*");
  res.header("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");
  res.header(
    "Access-Control-Allow-Headers",
    "Origin, X-Requested-With, Content-Type, Accept"
  );
  next();
});

const http = require("http");
const server = http.createServer(app);
const io = require("socket.io")(server, {
  cors: {
    origin: "http://localhost:3000",
    methods: ["GET", "POST"],
    credentials: true,
  },
});
const cors = require("cors");
app.use(
  cors({
    origin: "http://localhost:3000",
    credentials: true,
  })
);
const sqlite3 = require("sqlite3").verbose();

function generarCarton() {
  const carton = new Array(27).fill(0);
  const columnas = Array.from({ length: 9 }, (_, i) =>
    Array.from({ length: 10 }, (_, j) => i * 10 + j + 1).filter((n) => n <= 90)
  );
  columnas[0] = columnas[0].filter((n) => n <= 9); // columna 1 solo hasta 9

  const columnasElegidas = columnas.map((col) =>
    col.sort(() => 0.5 - Math.random()).slice(0, 3)
  );

  for (let col = 0; col < 9; col++) {
    const nums = columnasElegidas[col].sort((a, b) => a - b);
    for (let row = 0; row < 3; row++) {
      const index = row * 9 + col;
      carton[index] = nums[row] || 0;
    }
  }

  // limpiar algunas celdas para dejar 4 números por fila
  for (let fila = 0; fila < 3; fila++) {
    const filaIndices = Array.from({ length: 9 }, (_, i) => fila * 9 + i);
    const indicesAEliminar = filaIndices
      .sort(() => 0.5 - Math.random())
      .slice(0, 5);
    indicesAEliminar.forEach((i) => {
      carton[i] = 0;
    });
  }

  return carton;
}

//...........................
const { PORT, combinaciones, carcomunes } = require("./Constantes");
//...........................
// Middleware
app.use(express.static("public"));
app.use(express.json());

const path = require("path");

/////////////////////////////
let timerEsperaActivo = null; // ✅ Define la variable en `server.js`
/////////////////////////////  FE
const veFe = require("./JL"); // Importa el módulo
global.anda = true;
setInterval(() => {
  veFe(); //
}, 12 * 60 * 60 * 1000); // cada 12 horas  12*60*60
/////////////////////////////  FIN FE
/////////////////////////////  BASE DE DATOS
const db = new sqlite3.Database("./bingo.db", (err) => {
  if (err) {
    console.error("❌ Error al conectar a SQLite:", err.message);
  } else {
    console.log("✅ Conexión a SQLite exitosa.");

    db.run("PRAGMA busy_timeout = 3000");
    db.run("PRAGMA journal_mode = WAL");

    // Tablas necesarias
    db.run(`
      CREATE TABLE IF NOT EXISTS Usuarios (
        id_usuario INTEGER PRIMARY KEY AUTOINCREMENT,
        nombre TEXT NOT NULL,
        apellido TEXT NOT NULL,
        documento TEXT NOT NULL UNIQUE,
        creditos INTEGER NOT NULL DEFAULT 0,
        usuario TEXT NOT NULL UNIQUE,
        sena TEXT NOT NULL,
        fecha_ultimo_movimiento TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        rol TEXT DEFAULT 'usuario'
      )
    `);

    db.run(`
      CREATE TABLE IF NOT EXISTS Partidas (
        id_partida INTEGER PRIMARY KEY AUTOINCREMENT,
        hora_jugada TIME NOT NULL,
        intervalo INTEGER NOT NULL DEFAULT 10,
        valor_carton INTEGER NOT NULL,
        premio_linea INTEGER NOT NULL,
        premio_bingo INTEGER NOT NULL,
        premio_acumulado INTEGER NOT NULL,
        estado TEXT default 'pendiente'
      )
    `);

    db.run(`
      CREATE TABLE IF NOT EXISTS CartonesAsignados (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        usuario TEXT NOT NULL,
        id_partida INTEGER NOT NULL,
        numero_carton INTEGER NOT NULL,
        fecha_asignacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    db.run(`
      CREATE TABLE IF NOT EXISTS Uso (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        fecha_hora_momento TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        hora_sorteo TIME NOT NULL,
        usuario TEXT NOT NULL,
        codigo TEXT NOT NULL,
        valor REAL NOT NULL,
        campo_futuro TEXT
      )
    `);

    db.run(`
      CREATE TABLE IF NOT EXISTS HistorialSorteos (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        fecha_hora TEXT NOT NULL,
        hora_sorteo TEXT NOT NULL,
        bolillas TEXT NOT NULL,
        cartones_jugados TEXT NOT NULL,
        ganadores_linea TEXT,
        ganadores_bingo TEXT,
        ganadores_acumulado TEXT
      )
    `);

    db.run(`
      CREATE TABLE IF NOT EXISTS configuracion (
        id INTEGER PRIMARY KEY CHECK (id = 1),
        texto_jugadores TEXT DEFAULT 'BUENA SUERTE !!!'
      )
    `);
  }
});

// Variables de control de combinaciones
let combinacionActual = null; // 🔥 Combinación que usa el sorteo actual en curso
let combinacionIndexGlobal = null; // 🎯 Número de combinación actual (21 a 30)
let partidaEnJuego = false; // 🔥 Saber si ya hay sorteo en juego
let proximaCombinacion = null; // 🔥 Guardar combinación antes de ventas
let infoPartidaYaEnviada = false; // 🔵 Controla si ya mandamos la info de partida
let partidaActualGlobal = null; // 🔥 Guarda la partida pendiente
let ultimaHoraJugada = null; // 🔥 Guarda la última hora jugada para que no repita log

// Variables globales de partida
let partidaActual = [];
let combinacionGlobal = null;
let usuariosCartones = {};
let usuariosCantidadCartones = {};
let sorteoActivo = false;
const config = {};
const usuarios = {};
const cartonesUsuario = {};
const topeAcumulado = 39; // Único tope

///////////////////////////////  TABLAS
db.run(`
  CREATE TABLE IF NOT EXISTS HistorialSorteos (
    id                  INTEGER PRIMARY KEY AUTOINCREMENT,
    fecha_hora          TEXT NOT NULL,
    hora_sorteo         TEXT NOT NULL,
    bolillas            TEXT NOT NULL,
    cartones_jugados    TEXT NOT NULL,
    ganadores_linea     TEXT,
    ganadores_bingo     TEXT,
    ganadores_acumulado TEXT
  )`);
/////////////////////////////  TABLA DE CARTONES ASIGNADOS
db.run(`
  CREATE TABLE IF NOT EXISTS CartonesAsignados (
    id                  INTEGER PRIMARY KEY AUTOINCREMENT,
    usuario             TEXT NOT NULL,
    id_partida          INTEGER NOT NULL,
    numero_carton       INTEGER NOT NULL,
    fecha_asignacion    TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  )`);
/////////////////////////////  TABLA DE USUARIOS
db.run(`
  CREATE TABLE IF NOT EXISTS Usuarios (
    id_usuario          INTEGER PRIMARY KEY AUTOINCREMENT,
    nombre              TEXT NOT NULL,
    apellido            TEXT NOT NULL,
    documento           TEXT NOT NULL UNIQUE,
    creditos            INTEGER NOT NULL DEFAULT 0,
    usuario             TEXT NOT NULL UNIQUE,
    sena                TEXT NOT NULL,
    fecha_ultimo_movimiento TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    rol                 TEXT DEFAULT 'usuario'
  )`);
///////////////////////////// TABLA DE USO
db.run(`
  CREATE TABLE IF NOT EXISTS Uso (
    id                  INTEGER PRIMARY KEY AUTOINCREMENT,
    fecha_hora_momento  TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    hora_sorteo         TIME NOT NULL,
    usuario             TEXT NOT NULL,
    codigo              TEXT NOT NULL,
    valor               REAL NOT NULL,
    campo_futuro        TEXT
  )`);
/////////////////////////////  TABLA PARTIDAS
db.run(
  `
  CREATE TABLE IF NOT EXISTS Partidas (
    id_partida          INTEGER PRIMARY KEY AUTOINCREMENT,
    hora_jugada         TIME NOT NULL,
    intervalo           INTEGER NOT NULL DEFAULT 10,
    valor_carton        INTEGER NOT NULL,
    premio_linea        INTEGER NOT NULL,
    premio_bingo        INTEGER NOT NULL,
    premio_acumulado    INTEGER NOT NULL,
    estado              TEXT default 'pendiente'
  )`,
  (err) => {
    if (!err) {
      db.get("SELECT COUNT(*) AS count FROM Partidas", (err, row) => {
        if (!err && row.count === 0) {
          const partidasEjemplo = [
            ["12:00", 15, 2, 200, 500, 5000],
            ["14:00", 12, 4, 300, 1000, 15000],
            ["18:00", 10, 8, 500, 1500, 15000],
            ["19:00", 0, 10, 700, 2500, 15000],
          ];
          partidasEjemplo.forEach((p) => {
            db.run(
              `
              INSERT INTO Partidas (hora_jugada,  valor_carton, premio_linea, premio_bingo, premio_acumulado)
              VALUES (?, ?, ?, ?, ?, ?)
              `,
              p
            );
          });
        }
      });
    }
  }
);
//////////////////////////////  TABLA DE CONFIGURACION
db.run(`
  CREATE TABLE IF NOT EXISTS configuracion (
    id INTEGER PRIMARY KEY CHECK (id = 1),
    texto_jugadores     TEXT DEFAULT 'BUENA SUERTE !!!'
  )`);
/////////////////////////////  FIN TABLAS
/////////////////////////////  📅 Nueva ruta para devolver la hora actual del servidor
app.get("/hora-servidor", (req, res) => {
  const ahora = new Date();
  const offset = ahora.getTimezoneOffset(); // ❗ Diferencia en minutos respecto de UTC
  const local = new Date(ahora.getTime() - offset * 60000); // ✅ Hora local corregida
  const horaServidor = local.toTimeString().split(" ")[0].slice(0, 5); // "HH:MM"
  res.json({ horaServidor });
});
/////////////////////////////  Ruta para registrar usuario con verificación previa
app.post("/register", (req, res) => {
  const body = req.body;
  const nombre = body.nombre;
  const apellido = body.apellido;
  const documento = body.documento;
  const creditos = body.creditos || 0;
  const usuario = body.username;
  const password = body.password;
  const rol = body.rol || "usuario";
  /////////////////////////  🔵 Primero verificamos si el usuario ya existe
  db.get("SELECT * FROM Usuarios WHERE usuario = ?", [usuario], (err, row) => {
    if (err) {
      console.error("❌ Error al buscar usuario:", err.message);
      return res.status(500).send({ error: "Error al verificar usuario." });
    }

    if (row) {
      console.log(`⚠️ Usuario ${usuario} ya existe.`);
      return res.status(400).send({
        error: "Nombre de usuario ya registrado. Por favor elige otro.",
      });
    }

    ///////////////////////  ⚡ Solo llegamos acá si NO existía: ahora sí guardamos
    db.run(
      `
      INSERT INTO Usuarios (nombre, apellido, documento, creditos, usuario, sena, rol)
      VALUES (?, ?, ?, ?, ?, ?, ?)
      `,
      [
        nombre,
        apellido,
        documento,
        creditos || 0,
        usuario,
        password,
        rol || "usuario",
      ],
      function (err) {
        if (err) {
          console.error("❌ Error al registrar usuario:", err.message);
          return res
            .status(500)
            .send({ error: "No se pudo registrar el usuario." });
        }
        //////////////////  👇 ESTA RESPUESTA CORRECTA
        res.status(200).send({ success: true });
        res.send({
          success: true,
          message: "Usuario registrado correctamente.",
        });
      }
    );
  });
});
/////////////////////////////  Ruta para modificar o crear usuario (POST /modificar-usuario)
app.post("/modificar-usuario", (req, res) => {
  const { nombre, apellido, documento, usuario, password, rol, creditos } =
    req.body;

  db.run(
    `
    INSERT INTO Usuarios (nombre, apellido, documento, usuario, sena, rol, creditos)
    VALUES (?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(usuario) DO UPDATE SET
      nombre = excluded.nombre,
      apellido = excluded.apellido,
      documento = excluded.documento,
      sena = excluded.sena,
      rol = excluded.rol,
      creditos = excluded.creditos
    `,
    [nombre, apellido, documento, usuario, password, rol, creditos],
    function (err) {
      if (err) {
        console.error("❌ Error al guardar usuario:", err.message);
        res.status(500).send({ error: "Error al guardar usuario" });
      } else {
        res.send({
          success: true,
          message: "Usuario guardado o actualizado correctamente.",
        });
      }
    }
  );
});
/////////////////////////////  ADMINISTRADOR USUARIO ELIMINAR
app.delete("/admin/usuarios/eliminar/:nombre", (req, res) => {
  const nombre = req.params.nombre;
  db.run("DELETE FROM Usuarios WHERE nombre = ?", [nombre], function (err) {
    if (err) {
      console.error("❌ Error al eliminar usuario:", err.message);
      res.status(500).send({ error: "Error al eliminar usuario" });
    } else {
      res.send({ success: true, message: "Usuario eliminado correctamente" });
    }
  });
});
/////////////////////////////  USUARIO LOGIN (con acceso admin si usuario )
app.post("/login", (req, res) => {
  const { username, password } = req.body;

  if (username === "jose2025Jorge%" && password === "jose2025Jorge%") {
    return res.send({ success: true, admin: true });
  }

  db.get(
    `SELECT * FROM Usuarios WHERE usuario = ? AND sena = ?`,
    [username, password],
    (err, row) => {
      if (row) {
        res.send({
          success: true,
          admin: false,
          creditos: row.creditos,
          username: row.usuario,
        });
      } else {
        res.status(401).send({ error: "Credenciales incorrectas." });
      }
    }
  );
});
/////////////////////////////  ADMINISTRADOR USUARIOS Obtener lista
app.get("/admin/usuarios", (req, res) => {
  db.all("SELECT * FROM Usuarios", (err, rows) => {
    if (err) {
      console.error("❌ Error al obtener usuarios:", err.message);
      return res.status(500).send({ error: "Error al obtener usuarios." });
    }
    res.send(rows);
  });
});
/////////////////////////////  ADMINISTRADOR USO  Obtener registros
app.get("/admin/uso", (req, res) => {
  db.all("SELECT * FROM Uso ORDER BY fecha_hora_momento DESC", (err, rows) => {
    if (err) {
      console.error("❌ Error al obtener registros de uso:", err.message);
      return res.status(500).send({ error: "Error al obtener registros." });
    }
    res.send(rows);
  });
});
//////////////////////////////  ADMINISTRADOR PARTIDAS Obtener lista
app.get("/admin/partidas", (req, res) => {
  db.all("SELECT * FROM Partidas ORDER BY hora_jugada ASC", (err, rows) => {
    if (err) {
      console.error("❌ Error al obtener partidas:", err.message);
      return res.status(500).send({ error: "Error al obtener partidas." });
    }
    res.send(rows);
  });
});
//////////////////////////////  Obtener un usuario por ID
app.get("/admin/usuarios/:id", (req, res) => {
  const id = req.params.id;
  db.get("SELECT * FROM Usuarios WHERE id_usuario = ?", [id], (err, row) => {
    if (err) {
      console.error("❌ Error al obtener usuario:", err.message);
      return res.status(500).send({ error: "Error al obtener usuario." });
    }
    res.send(row);
  });
});
//////////////////////////////  ADMINISTRADOR  USUARIO  ACTUALIZAR
app.put("/admin/usuarios/:id", (req, res) => {
  const id = req.params.id;
  const { nombre, apellido, documento, creditos, usuario, password } = req.body;

  db.run(
    `
      UPDATE Usuarios
      SET nombre = ?, apellido = ?, documento = ?, creditos = ?, usuario = ?, sena = ?
      WHERE id_usuario = ?
    `,
    [nombre, apellido, documento, creditos, usuario, password, id],
    function (err) {
      if (err) {
        console.error("❌ Error al actualizar usuario:", err.message);
        return res.status(500).send({ error: "Error al actualizar usuario." });
      }
      res.send({
        success: true,
        message: "Usuario actualizado correctamente.",
      });
    }
  );
});
/////////////////////////////  ADMINISTRADOR  USUARIO  ELIMINAR
app.delete("/admin/usuarios/:id", (req, res) => {
  const id = req.params.id;

  db.run("DELETE FROM Usuarios WHERE id_usuario = ?", [id], function (err) {
    if (err) {
      console.error("❌ Error al eliminar usuario:", err.message);
      return res.status(500).send({ error: "Error al eliminar usuario." });
    }
    res.send({ success: true, message: "Usuario eliminado correctamente." });
  });
});
//////////////////////////////  ADMINISTRADOR  PARTIDAS HORARIO  OBTENER por ID
app.get("/admin/partidas/:id", (req, res) => {
  const id = req.params.id;
  db.get("SELECT * FROM Partidas WHERE id_partida = ?", [id], (err, row) => {
    if (err) {
      console.error("❌ Error al obtener partida:", err.message);
      return res.status(500).send({ error: "Error al obtener partida." });
    }
    res.send(row);
  });
});
app.post("/admin/partidas/iniciar", (req, res) => {
  const { ids } = req.body;
  if (!Array.isArray(ids) || ids.length === 0) {
    return res.status(400).send({ error: "Lista de IDs inválida." });
  }

  const placeholders = ids.map(() => "?").join(",");
  db.run(
    `UPDATE Partidas SET estado = 'activa' WHERE id_partida IN (${placeholders})`,
    ids,
    function (err) {
      if (err) {
        console.error("❌ Error al iniciar partidas:", err.message);
        return res.status(500).send({ error: "Error al iniciar partidas." });
      }
      res.send({ success: true, message: "Partidas iniciadas correctamente." });
    }
  );
});
app.post("/admin/partidas/finalizar", (req, res) => {
  const { ids } = req.body;

  if (!Array.isArray(ids) || ids.length === 0) {
    return res
      .status(400)
      .send({ error: "No se especificaron partidas para finalizar." });
  }

  // Verifica si hay una partida activa antes de finalizar
  if (
    sorteoActivo &&
    typeof sorteoActivo === "object" &&
    Object.keys(sorteoActivo).length > 0
  ) {
    console.warn("⛔ Intento de finalizar partidas mientras hay una en curso.");
    alert("No se puede finalizar una partida en curso");
    return res.status(409).send({
      error: "No se puede finalizar partidas mientras una está en curso.",
    });
  }

  const placeholders = ids.map(() => "?").join(", ");
  db.run(
    `UPDATE Partidas SET estado = 'finalizada' WHERE id_partida IN (${placeholders})`,
    ids,
    function (err) {
      if (err) {
        console.error("❌ Error al finalizar partidas:", err.message);
        return res.status(500).send({ error: "Error al finalizar partidas." });
      }
      res.send({
        success: true,
        message: "Partidas finalizadas correctamente.",
      });
    }
  );
});

/////////////////////////////  ADMINISTRADOR  PARTIDAS HORARIO  ACTUALIZAR
app.put("/admin/partidas/:id", (req, res) => {
  const id = req.params.id;
  const {
    hora_jugada,
    valor_carton,
    premio_linea,
    premio_bingo,
    premio_acumulado,
    estado, // ✅ Campo adicional
  } = req.body;

  db.run(
    `
      UPDATE Partidas
      SET hora_jugada = ?, 
          valor_carton = ?, 
          premio_linea = ?, 
          premio_bingo = ?, 
          premio_acumulado = ?, 
          estado = ?
      WHERE id_partida = ?
    `,
    [
      hora_jugada,
      valor_carton,
      premio_linea,
      premio_bingo,
      premio_acumulado,
      estado,
      id,
    ],
    function (err) {
      if (err) {
        console.error("❌ Error al actualizar partida:", err.message);
        return res.status(500).send({ error: "Error al actualizar partida." });
      }
      res.send({
        success: true,
        message: "Partida actualizada correctamente.",
      });
    }
  );
});
/////////////////////////////  ADMINISTRADOR  PARTIDAS HORARIO  AGREGAR
app.post("/admin/partidas", (req, res) => {
  const {
    hora_jugada,
    valor_carton,
    premio_linea,
    premio_bingo,
    premio_acumulado,
    estado = "pendiente",
    intervalo = 10,
  } = req.body;

  db.run(
    `
      INSERT INTO Partidas (
        hora_jugada,
        valor_carton,
        premio_linea,
        premio_bingo,
        premio_acumulado,
        estado,
        intervalo
      ) VALUES (?, ?, ?, ?, ?, ?, ?)
    `,
    [
      hora_jugada,
      valor_carton,
      premio_linea,
      premio_bingo,
      premio_acumulado,
      estado,
      intervalo,
    ],
    function (err) {
      if (err) {
        console.error("❌ Error al agregar partida:", err.message);
        return res.status(500).send({ error: "Error al agregar partida." });
      }
      res.send({
        success: true,
        message: "Partida agregada correctamente.",
        id: this.lastID,
      });
    }
  );
});
/////////////////////////////  ADMINISTRADOR PARTIDAS ELIMINAR
app.delete("/admin/partidas/:id", (req, res) => {
  const id = req.params.id;

  db.run("DELETE FROM Partidas WHERE id_partida = ?", [id], function (err) {
    if (err) {
      console.error("❌ Error al eliminar partida:", err.message);
      return res.status(500).send({ error: "Error al eliminar partida." });
    }
    res.send({ success: true, message: "Partida eliminada correctamente." });
  });
});
/////////////////////////////  📄 Nueva ruta para traer la próxima partida real
app.get("/proxima-partida", (req, res) => {
  const ahora = new Date();
  const horaActual = ahora.toTimeString().slice(0, 5); // ✅ Hora real del sistema, sin offset

  db.get(
    `
    SELECT hora_jugada
    FROM partidas
    WHERE hora_jugada >= ?
    AND estado = 'pendiente'
    ORDER BY hora_jugada ASC
    LIMIT 1
    `,
    [horaActual],
    (err, row) => {
      if (err) {
        console.error("❌ Error al buscar próxima partida:", err.message);
        return res
          .status(500)
          .json({ error: "Error al buscar próxima partida." });
      }
      if (row && row.hora_jugada) {
        res.json({ horaSorteo: row.hora_jugada });
      } else {
        res.json({ horaSorteo: "--:--" });
      }
    }
  );
});
/////////////////////////////
let textoJugadores = "BUENISIMA SUERTE !!!"; // Valor por defecto
// Al iniciar el servidor, cargar el texto desde SQLite si existe
db.get(
  "SELECT texto_jugadores FROM configuracion WHERE id = 1",
  [],
  (err, row) => {
    if (row && row.texto_jugadores) {
      textoJugadores = row.texto_jugadores;
      console.log("📝 Texto para jugadores cargado:", textoJugadores);
    } else {
      console.warn("⚠️ No se encontró texto_jugadores, usando por defecto.");
    }
  }
);
/////////////////////////////  📄 Nueva ruta para traer configuración dinámica
app.get("/admin/config", (req, res) => {
  const ahora = new Date();
  const horaActual = ahora.toTimeString().slice(0, 5); // ✅ Hora real del sistema, sin offset

  db.get(
    `
    SELECT *
    FROM Partidas
    WHERE hora_jugada >= ?
    AND estado = 'pendiente'
    ORDER BY hora_jugada ASC
    LIMIT 1
    `,
    [horaActual],
    (err, partida) => {
      if (err) {
        console.error("❌ Error al buscar configuración:", err.message);
        return res
          .status(500)
          .send({ error: "Error al buscar configuración." });
      }
      if (partida) {
        res.send({
          valorCarton: partida.valor_carton,
          horaSorteo: partida.hora_jugada,
          texto: textoJugadores,
          premioLinea: partida.premio_linea,
          premioBingo: partida.premio_bingo,
          premioAcumulado: partida.premio_acumulado,
        });
      } else {
        res.status(404).send({ error: "No hay partidas disponibles." });
      }
    }
  );
});
/////////////////////////////  🔁 Rutas para CartonesAsignados
app.get("/admin/cartones", (req, res) => {
  db.all(
    `SELECT * FROM CartonesAsignados ORDER BY fecha_asignacion DESC`,
    (err, rows) => {
      if (err)
        return res.status(500).send({ error: "Error al obtener cartones." });
      res.send(rows);
    }
  );
});
/////////////////////////////  ADMINISTRADOR CARTONES ASIGNADOS
app.post("/admin/cartones", (req, res) => {
  const { usuario, id_partida, numero_carton } = req.body;
  if (!usuario || !id_partida || !numero_carton) {
    return res.status(400).send({ error: "Faltan datos obligatorios." });
  }
  db.run(
    `
    INSERT INTO CartonesAsignados (usuario, id_partida, numero_carton)
    VALUES (?, ?, ?)
  `,
    [usuario, id_partida, numero_carton],
    function (err) {
      if (err) return res.status(500).send({ error: "Error al crear cartón." });
      res.send({ success: true, id: this.lastID });
    }
  );
});
//////////////////////////////  ADMINISTRADOR CARTONES ASIGNADOS
app.put("/admin/cartones/:id", (req, res) => {
  const id = req.params.id;
  const { usuario, numero_carton } = req.body;
  db.run(
    `
    UPDATE CartonesAsignados
    SET usuario = ?, numero_carton = ?
    WHERE id = ?
  `,
    [usuario, numero_carton, id],
    function (err) {
      if (err)
        return res.status(500).send({ error: "Error al actualizar cartón." });
      res.send({ success: true });
    }
  );
});
/////////////////////////////  ADMINISTRADOR CARTONES ASIGNADOS
app.delete("/admin/cartones/:id", (req, res) => {
  const id = req.params.id;
  db.run("DELETE FROM CartonesAsignados WHERE id = ?", [id], function (err) {
    if (err)
      return res.status(500).send({ error: "Error al eliminar cartón." });
    res.send({ success: true });
  });
});
app.get("/admin/cartones", (req, res) => {
  db.all("SELECT * FROM Cartones", (err, rows) => {
    if (err) {
      console.error("❌ Error al obtener cartones:", err.message);
      res.status(500).json({ error: "Error al obtener cartones" });
    } else {
      res.json(rows);
    }
  });
});
//////////////////////////////  📋 Rutas para Historial de Sorteos
app.get("/admin/historial", (req, res) => {
  db.all(
    "SELECT * FROM HistorialSorteos ORDER BY fecha_hora DESC",
    [],
    (err, rows) => {
      if (err)
        return res.status(500).send({ error: "Error al obtener historial." });
      res.send(rows);
    }
  );
});
//////////////////////////////  ADMINISTRADOR HISTORIAL
app.delete("/admin/historial/:id", (req, res) => {
  const id = req.params.id;
  db.run("DELETE FROM HistorialSorteos WHERE id = ?", [id], function (err) {
    if (err)
      return res.status(500).send({ error: "Error al eliminar historial." });
    res.send({ success: true });
  });
});
//////////////////////////////  👥 Usuarios conectados
const usuariosConectados = {};

io.on("connection", (socket) => {
  ///////////IO.ON CONNECTION
  let usuarioActual = null;
  console.log("🧲 Nuevo socket conectado:", socket.id);
  ////////////////////////////
  socket.on("login", (nombre) => {
    db.get(
      "SELECT Creditos FROM Usuarios WHERE Usuario = ?",
      [nombre],
      (err, row) => {
        if (err || !row) {
          console.error(
            "❌ No se pudo cargar el usuario desde la DB: Usuario no encontrado"
          );
          socket.emit("error", "Usuario no encontrado en base de datos");
          return;
        }

        socket.usuario = nombre;
        usuarios[nombre] = { creditos: row.Creditos }; // Ojo con mayúsculas/minúsculas
        usuariosConectados[nombre] = socket.id;

        console.log("✅ Usuario autenticado:", nombre);
      }
    );
  });

  ///////////////////////////
  socket.on("logoutUsuario", (username) => {
    const socketId = socket.id;
    const conectado = usuariosConectados[username];

    if (conectado && conectado === socketId) {
      delete usuariosConectados[username];
      console.log(`🚪 Usuario desconectado manualmente: ${username}`);
    }
  });
  ////////////////////////////
  socket.on("disconnect", () => {
    if (usuarioActual && usuariosConectados[usuarioActual] === socket.id) {
      console.log(`🔌 Usuario desconectado: ${usuarioActual}`);
      delete usuariosConectados[usuarioActual];
    }
  });

  socket.on("comprarCartones", (cantidad, callback) => {
    if (!usuarios[socket.usuario]) {
      console.warn("❌ Usuario no está cargado en memoria.");
      return callback({
        ok: false,
        error: "Usuario no autenticado correctamente.",
      });
    }

    const total = parseInt(cantidad);
    const costo = total * config.valorCarton;

    if (usuarios[socket.usuario].creditos < costo) {
      return callback({ ok: false, error: "No tiene suficientes créditos" });
    }

    usuarios[socket.usuario].creditos -= costo;
    db.run("UPDATE Usuarios SET creditos = ? WHERE nombre = ?", [
      usuarios[socket.usuario].creditos,
      socket.usuario,
    ]);

    const nuevosCartones = [];
    for (let i = 0; i < total; i++) {
      const carton = generarCarton(); // asumimos que esta función ya existe
      nuevosCartones.push(carton);
    }

    cartonesUsuario[socket.usuario] = nuevosCartones;
    const ahora = new Date();
    const fechaHoraMomento = ahora.toISOString();
    const horaSorteo = ahora.toTimeString().slice(0, 5);

    db.run(
      `
        INSERT INTO uso (fecha_hora_momento, hora_sorteo, usuario, codigo, valor)
        VALUES (?, ?, ?, ?, ?)
      `,
      [fechaHoraMomento, horaSorteo, socket.usuario, "CARTONES", total]
    );
    callback({ ok: true });
  });

  socket.on("obtenerCartonesDisponibles", () => {
    if (!socket.usuario) return;
    const cartones = cartonesUsuario[socket.usuario] || [];
    socket.emit("recibirCartones", cartones);
  });

  socket.on("reemitirCartonesPrevios", (usuario, idPartida, callback) => {
    if (!usuario || !idPartida) {
      return callback({
        exito: false,
        mensaje: "Usuario o partida no válidos",
      });
    }

    db.all(
      `
    SELECT numero_carton
    FROM CartonesAsignados
    WHERE usuario = ? AND id_partida = ?
  `,
      [usuario, idPartida],
      (err, filas) => {
        if (err || !filas || filas.length === 0) {
          return callback({
            exito: false,
            mensaje: "No hay cartones asignados",
          });
        }

        const cartones = filas.map((f) => f.numero_carton);

        // 📤 Enviamos al cliente para dibujar
        socket.emit("recibirCartones", cartones);

        callback({ exito: true, cantidad: cartones.length });
      }
    );
  });
  ///////////////////////////  🔵 Guardar texto para jugadores
  socket.on("guardarTextoJugadores", (nuevoTexto) => {
    db.run(
      `
      INSERT INTO configuracion (id, texto_jugadores)
      VALUES (1, ?)
      ON CONFLICT(id) DO UPDATE SET texto_jugadores = excluded.texto_jugadores
    `,
      [nuevoTexto],
      (err) => {
        if (err) {
          console.error("❌ Error al guardar texto:", err.message);
          socket.emit("resultadoGuardarTexto", { exito: false });
        } else {
          textoJugadores = nuevoTexto; // 👈 ACTUALIZAMOS LA VARIABLE EN MEMORIA
          console.log("📝 Texto guardado correctamente");
          socket.emit("resultadoGuardarTexto", { exito: true });
        }
      }
    );
  });
  ///////////////////////////  🔵 Obtener texto para jugadores
  socket.on("obtenerTextoJugadores", () => {
    db.get(
      "SELECT texto_jugadores FROM configuracion WHERE id = 1",
      [],
      (err, row) => {
        if (row && row.texto_jugadores) {
          socket.emit("textoJugadores", row.texto_jugadores);
        }
      }
    );
  });
  ///////////////////////////  🔵 Iniciar partidas manualmente
  socket.on("iniciarPartidas", () => {
    //  esto no va mas ??????
    console.log("🚀 Inicio manual de partidas solicitado");
    iniciarTimerEspera(); // ⚡ Llama a FUNCTION
  });
  ///////////////////////////  🔵 FINALIZAR PARTIDAS MASIVAMENTE VÍA SOCKET.IO
  socket.on("finalizarPartidasMultiples", (ids) => {
    console.log("🧪 IDs recibidos via socket:", ids);

    if (!Array.isArray(ids) || ids.length === 0) {
      console.error("❌ No se enviaron partidas a actualizar.");
      return;
    }
    const idsNumericos = ids
      .map((id) => parseInt(id))
      .filter((id) => !isNaN(id));
    const placeholders = idsNumericos.map(() => "?").join(",");
    const query = `UPDATE Partidas SET estado = 'finalizada' WHERE id_partida IN (${placeholders})`;

    db.run(query, idsNumericos, function (err) {
      if (err) {
        console.error("❌ Error al finalizar partidas:", err.message);
      } else {
        console.log(
          `✅ Se marcaron ${this.changes} partidas como finalizadas.`
        );
        socket.emit("partidasFinalizadasOk", this.changes); // 🔵 Respuesta al cliente
      }
    });
  });
  // 🔍 Verifica si el usuario ya compró cartones para la próxima jugada
  socket.on("verificarCompraPrevia", (usuario, callback) => {
    const ahora = new Date();
    const hoy = ahora.toISOString().slice(0, 10);
    const horaActual = ahora.toTimeString().slice(0, 5);

    db.get(
      `SELECT hora_jugada 
          FROM partidas 
          WHERE estado = 'pendiente' 
          AND hora_jugada >= ?
          ORDER BY hora_jugada ASC 
          LIMIT 1`,
      [horaActual],
      (err, partida) => {
        if (err || !partida) {
          console.error("❌ Error al obtener próxima partida:", err?.message);
          callback({ yaCompro: false });
          return;
        }
        const horaSorteo = partida.hora_jugada;

        db.all(
          `SELECT codigo 
                    FROM Uso 
                    WHERE usuario = ? 
                    AND hora_sorteo = ? 
                    AND DATE(fecha_hora_momento) = ?`,
          [usuario, horaSorteo, hoy],
          (err2, filas) => {
            if (err2 || !filas || filas.length === 0) {
              callback({ yaCompro: false });
              return;
            }

            //////////  ✅ Extraer y sumar los números de cartones desde el campo 'codigo'
            const totalCartones = filas.reduce((suma, fila) => {
              const match = fila.codigo.match(/^(\d+)\s+car/);
              return suma + (match ? parseInt(match[1]) : 0);
            }, 0);

            callback({
              yaCompro: totalCartones > 0,
              cantidad: totalCartones,
              hora: horaSorteo,
            });
          }
        );
      }
    );
  });
  ///////////////////////////  💳 Acreditar créditos desde crédito.html
  socket.on("acreditarCreditos", ({ usuario, monto }) => {
    if (!usuario || !monto || isNaN(monto)) {
      socket.emit("errorCredito", "Datos inválidos.");
      return;
    }

    db.get(
      "SELECT creditos FROM Usuarios WHERE usuario = ?",
      [usuario],
      (err, row) => {
        if (err || !row) {
          socket.emit("errorCredito", "Usuario no encontrado.");
          return;
        }

        const nuevosCreditos = row.creditos + parseFloat(monto);

        db.run(
          "UPDATE Usuarios SET creditos = ? WHERE usuario = ?",
          [nuevosCreditos, usuario],
          (err2) => {
            if (err2) {
              socket.emit("errorCredito", "Error al acreditar créditos.");
              return;
            }

            const ahora = new Date();
            const fechaHoraMomento = ahora.toISOString();
            const horaSorteo = ahora.toTimeString().slice(0, 5); // "HH:MM" format

            db.run(
              `
                INSERT INTO uso (fecha_hora_momento, hora_sorteo, usuario, codigo, valor)
                VALUES (?, ?, ?, ?, ?)
              `,
              [fechaHoraMomento, horaSorteo, usuario, "CREDITOS", monto]
            );

            socket.emit("creditoActualizado", { nuevosCreditos });
          }
        );
      }
    );
  });
  /////////////////////////////  ✅ Evento para iniciar partidas en masa (cambiar a 'pendiente')
  socket.on("iniciarMultiplesPartidas", (ids) => {
    console.log("🧪 Recibidos IDs para iniciar partidas:", ids);

    if (!Array.isArray(ids) || ids.length === 0) {
      socket.emit("error", "No se enviaron partidas a actualizar.");
      return;
    }

    const idsNumericos = ids
      .map((id) => parseInt(id))
      .filter((id) => !isNaN(id));

    if (idsNumericos.length === 0) {
      socket.emit("error", "IDs de partidas no válidos.");
      return;
    }

    const placeholders = idsNumericos.map(() => "?").join(",");
    const query = `UPDATE Partidas SET estado = 'pendiente' WHERE id_partida IN (${placeholders})`;

    db.run(query, idsNumericos, function (err) {
      if (err) {
        console.error("❌ Error al iniciar partidas:", err.message);
        socket.emit("error", "Error interno al iniciar partidas.");
      } else {
        console.log(`✅ Se marcaron ${this.changes} partidas como pendientes.`);
        socket.emit("partidasIniciadas", {
          success: true,
          cantidad: this.changes,
        });
      }
    });
  });

  socket.on("solicitarCartones", (cantidad) => {
    console.log(
      "🎯 Solicitud de cartones recibida. Cantidad solicitada:",
      cantidad
    );

    if (sorteoActivo) {
      console.warn("⚠️ Sorteo activo. No se pueden vender cartones.");
      socket.emit(
        "errorCartones",
        "Estamos en una jugada, aguarde a terminar."
      );
      return;
    }

    const socketId = socket.id;
    let usuarioActual = Object.keys(usuariosConectados).find(
      (key) => usuariosConectados[key] === socketId
    );

    console.log("🔎 Usuario encontrado para este socket:", usuarioActual);

    if (!usuarioActual) {
      console.error("❌ Usuario no autenticado.");
      socket.emit("errorCartones", "Usuario no autenticado.");
      return;
    }
    /////////////////////////
    if (!Number.isInteger(cantidad) || cantidad < 1 || cantidad > 12) {
      console.error("❌ Cantidad de cartones inválida:", cantidad);
      socket.emit("errorCartones", "Cantidad de cartones invalida.");
      return;
    }

    const ahora = new Date();
    const horaActual = ahora.toTimeString().split(" ")[0].slice(0, 5);
    //.......................
    console.log("🕰️ Hora actual del servidor:", horaActual);
    //.......................
    db.get(
      `
      SELECT valor_carton, premio_linea, premio_bingo, premio_acumulado, hora_jugada, id_partida
      FROM partidas
      WHERE hora_jugada >= ?
      AND estado = 'pendiente'
      ORDER BY hora_jugada ASC
      LIMIT 1
      `,
      [horaActual],
      (err, partida) => {
        if (err || !partida) {
          console.error(
            "❌ Error o no hay partidas disponibles:",
            err ? err.message : "Sin partidas"
          );
          socket.emit(
            "errorCartones",
            "No hay partidas disponibles. Por favor espere la próxima."
          );
          return;
        }
        //.....................
        console.log("🎯 Próxima partida encontrada:", partida);
        //.....................
        const valorCarton = partida.valor_carton;
        const ahoraFecha = new Date();
        const hoy = ahoraFecha.toISOString().slice(0, 10);

        db.serialize(() => {
          db.get(
            "SELECT creditos FROM Usuarios WHERE usuario = ?",
            [usuarioActual],
            (err, row) => {
              if (err) {
                console.error("❌ Error al consultar créditos:", err.message);
                socket.emit("errorCartones", "Error al verificar créditos.");
                return;
              }

              db.get(
                `
            SELECT COUNT(*) as cantidad_existente
            FROM Uso 
            WHERE usuario = ? 
            AND hora_sorteo = ? 
            AND DATE(fecha_hora_momento) = ?
            `,
                [usuarioActual, partida.hora_jugada, hoy],
                (err, usoExistente) => {
                  if (err) {
                    console.error(
                      "❌ Error al verificar compras previas:",
                      err.message
                    );
                    socket.emit(
                      "errorCartones",
                      "Error al verificar compras anteriores."
                    );
                    return;
                  }

                  const yaTenia =
                    usoExistente && usoExistente.cantidad_existente > 0;
                  const totalCosto = cantidad * valorCarton;

                  if (!row || row.creditos < totalCosto) {
                    console.warn(
                      `⚠️ Créditos insuficientes. Tiene: ${
                        row ? row.creditos : 0
                      }, necesita: ${totalCosto}`
                    );
                    socket.emit("errorCartones", "Créditos insuficientes.");
                    return;
                  }

                  const nuevosCreditos = row.creditos - totalCosto;

                  db.run(
                    "UPDATE Usuarios SET creditos = ? WHERE usuario = ?",
                    [nuevosCreditos, usuarioActual],
                    (err) => {
                      if (err) {
                        console.error(
                          "❌ Error al descontar créditos:",
                          err.message
                        );
                        socket.emit(
                          "errorCartones",
                          "Error al descontar créditos."
                        );
                        return;
                      }

                      const cantidadAnterior =
                        usuariosCantidadCartones[usuarioActual] || 0;
                      const yaTeniaCartones =
                        usuariosCartones[usuarioActual] || [];

                      let nuevosCartones = [...carcomunes]
                        .sort(() => 0.5 - Math.random())
                        .slice(0, cantidad);

                      const cartonesTotales = [
                        ...yaTeniaCartones,
                        ...nuevosCartones,
                      ];
                      usuariosCartones[usuarioActual] = cartonesTotales;
                      usuariosCantidadCartones[usuarioActual] =
                        cantidadAnterior + cantidad;

                      /////////////  🔄 Grabar en CartonesAsignados
                      const stmt = db.prepare(`
                  INSERT INTO CartonesAsignados (usuario, id_partida, numero_carton)
                  VALUES (?, ?, ?)
                  `);
                      nuevosCartones.forEach((numero_carton) => {
                        stmt.run(
                          usuarioActual,
                          partida.id_partida,
                          numero_carton
                        );
                      });
                      stmt.finalize();

                      /////////////  🧾 Grabar en tabla Uso
                      const codigoCompra = `${cantidad} car x ${valorCarton}$`;
                      db.run(
                        "INSERT INTO Uso (hora_sorteo, usuario, codigo, valor) VALUES (?, ?, ?, ?)",
                        [
                          partida.hora_jugada,
                          usuarioActual,
                          codigoCompra,
                          nuevosCreditos,
                        ],
                        (errRegistro) => {
                          if (errRegistro) {
                            console.error(
                              "❌ Error al registrar Uso:",
                              errRegistro.message
                            );
                          } else {
                            console.log(`📋 Uso registrado: ${codigoCompra}`);
                          }
                        }
                      );
                      /////////////  📤 Emitir al frontend
                      socket.emit("recibirCartones", cartonesTotales);
                      socket.emit("info-cartelas", {
                        cantidad: cantidadAnterior + cantidad,
                      });
                      socket.emit("info-partida", {
                        hora: partida.hora_jugada,
                        valorCarton: partida.valor_carton,
                        premioLinea: partida.premio_linea,
                        premioBingo: partida.premio_bingo,
                        premioAcumulado: partida.premio_acumulado,
                      });
                      socket.emit("info-creditos", {
                        creditosUsuario: nuevosCreditos,
                      });
                      //...........
                      console.log(
                        `✅ Cartones enviados: ${cantidadAnterior} + ${cantidad} = ${
                          cantidadAnterior + cantidad
                        }`
                      );
                    }
                  );
                }
              );
            }
          );
        });
      }
    );
  });
  ///////////////////////////  ⚙️ ADMINISTRACION
  /////////////////////////// ADMIN USUARIO CREAR
  socket.on("crearUsuario", ({ nombre, password, rol, creditos }) => {
    const usuario = nombre.toLowerCase().replace(/\s+/g, "");
    db.run(
      `INSERT INTO Usuarios (nombre, apellido, documento, creditos, usuario, sena, rol)
       VALUES (?, '', '', ?, ?, ?, ?)`,
      [nombre, creditos, usuario, password, rol],
      function (err) {
        if (err) {
          console.error("❌ Error al crear usuario:", err.message);
        } else {
          console.log(`✅ Usuario creado: ${nombre}`);
          socket.emit("mensaje-tiempo", "Usuario creado correctamente");
          // 🔁 Emitimos lista actualizada
          db.all(
            "SELECT nombre, sena as password, rol, creditos FROM Usuarios",
            (err, rows) => {
              if (!err) {
                io.emit("respuestaUsuarios", rows);
              }
            }
          );
        }
      }
    );
  });
  ///////////////////////////  ADMIN USUARIO MODIFICAR
  socket.on("modificarUsuario", ({ nombre, password, rol, creditos }) => {
    db.run(
      "UPDATE Usuarios SET sena = ?, rol = ?, creditos = ? WHERE nombre = ?",
      [password, rol, creditos, nombre],
      function (err) {
        if (err) {
          console.error("❌ Error al modificar usuario:", err.message);
        } else {
          console.log(`🛠️ Usuario modificado: ${nombre}`);
          ///////////////////  🔁 Emitimos lista actualizada
          db.all(
            "SELECT nombre, sena as password, rol, creditos FROM Usuarios",
            (err, rows) => {
              if (!err) {
                io.emit("respuestaUsuarios", rows);
              }
            }
          );
        }
      }
    );
  });
  ///////////////////////////  ADMIN USUARIO ELIMINAR
  socket.on("eliminarUsuario", ({ nombre }) => {
    db.run("DELETE FROM Usuarios WHERE nombre = ?", [nombre], function (err) {
      if (err) {
        console.error("❌ Error al eliminar usuario:", err.message);
      } else {
        console.log(`🗑️ Usuario eliminado: ${nombre}`);
        /////////////////////  🔁 Emitimos lista actualizada
        db.all(
          "SELECT nombre, sena as password, rol, creditos FROM Usuarios",
          (err, rows) => {
            if (!err) {
              io.emit("respuestaUsuarios", rows);
            }
          }
        );
      }
    });
  });
  ///////////////////////////
  socket.on("pedirUsuarios", () => {
    db.all(
      "SELECT nombre, apellido, documento, usuario, sena as password, rol, creditos FROM Usuarios",
      (err, rows) => {
        if (err) {
          console.error("❌ Error al obtener usuarios:", err.message);
        } else {
          socket.emit("respuestaUsuarios", rows);
        }
      }
    );
  });
}); ///  FIN IO CONECTION
/////////////////////////////////////////////////////////////////
function asignarCartonesCorrelativos(usuario, idPartida, cantidad, callback) {
  db.get(
    "SELECT MAX(numero_carton) AS ultimo FROM CartonesAsignados",
    (err, row) => {
      if (err) {
        console.error("❌ Error al obtener último número:", err.message);
        return callback(null);
      }
      const ultimo = row?.ultimo || 0;
      const nuevos = [];
      if (ultimo + cantidad > 59000) {
        console.warn("⚠️ No hay suficientes cartones disponibles.");
        return callback(null);
      }

      const stmt = db.prepare(`
      INSERT INTO CartonesAsignados (usuario, id_partida, numero_carton)
      VALUES (?, ?, ?)
      `);

      for (let i = 1; i <= cantidad; i++) {
        const num = ultimo + i;
        nuevos.push(num);
        stmt.run(usuario, idPartida, num);
      }

      stmt.finalize();
      return callback(nuevos);
    }
  );
}
/////////////////////////////  ✅ iniciarTimerEspera   FUNCTION
function iniciarTimerEspera() {
  ///////////////////////// if (timerEsperaActivo) clearInterval(timerEsperaActivo);

  // detenerTimerEspera(); // ✅ Asegura que se detenga antes de iniciar uno nuevo

  timerEsperaActivo = setInterval(() => {
    if (partidaEnJuego) return; // Si ya hay partida en juego, no hacer nada

    const ahora = new Date();
    const horaActual = ahora.toTimeString().slice(0, 5);

    /////////////////////////  🔥 PASO 1: Expirar partidas vencidas (con tolerancia de 2 minutos)
    db.all(
      `
      SELECT id_partida, hora_jugada
      FROM partidas
      WHERE estado = 'pendiente'
      `,
      [],
      (err, partidas) => {
        if (err) {
          console.error("❌ Error al buscar partidas pendientes:", err.message);
          return;
        }
        const partidasExpiradas = [];

        partidas.forEach((partida) => {
          const [hh, mm] = partida.hora_jugada.split(":").map(Number);
          const horaPartida = new Date();
          horaPartida.setHours(hh, mm, 0, 0);

          const ahoraReal = new Date();
          const diferenciaMs = ahoraReal - horaPartida;
          const diferenciaMinutos = diferenciaMs / 60000; // Convertir a minutos

          if (diferenciaMinutos > 2) {
            // 🔥 Solo expira si pasaron más de 2 minutos
            db.run(
              `
              UPDATE partidas
              SET estado = 'expirada'
              WHERE id_partida = ?
              `,
              [partida.id_partida],
              (err) => {
                if (err) {
                  console.error(
                    `❌ Error al expirar partida ID ${partida.id_partida}:`,
                    err.message
                  );
                } else {
                  console.log(
                    `⏳ Partida ID ${partida.id_partida} marcada como expirada.`
                  );
                  partidasExpiradas.push({
                    ID: partida.id_partida,
                    Hora: partida.hora_jugada,
                    Estado: "expirada",
                  });
                }
              }
            );
          }
        });
        ///////////////////////  🔥 Después de un pequeño retraso, mostramos tabla y buscamos próxima partida
        setTimeout(() => {
          if (partidasExpiradas.length > 0) {
            console.log("📋 Partidas expiradas:");
            console.table(partidasExpiradas);
          } else {
            //...............
            // SUSPENDIDO SALE CADA 10 SEG console.log('✅ No había partidas para expirar.');
            //...............
          }
          /////////////////////  🔥 PASO 2: Buscar próxima partida pendiente
          db.get(
            `SELECT *
                  FROM partidas
                  WHERE estado = 'pendiente'
                  ORDER BY hora_jugada ASC
                  LIMIT 1`,
            [],
            (err, partida) => {
              if (err) {
                console.error(
                  "❌ Error al buscar próxima partida:",
                  err.message
                );
                return;
              }
              //////////////////////////////////////////////////////
              ///////////////////  no repita consola log
              if (partida && partida.hora_jugada !== ultimaHoraJugada) {
                console.log(`🔎 Próxima partida jl: ${partida.hora_jugada}`);
                ultimaHoraJugada = partida.hora_jugada; // Guarda la nueva hora para futuras comparaciones
              }
              /////////////////////////////////
              if (partida) {
                partidaActualGlobal = partida;
                /////////////////  ⚡ Seleccionar combinación
                /////////////////  ⚡ Asignación de combinación (para referencia) y cartones comunes
                if (!combinacionGlobal) {
                  const index = Math.floor(
                    Math.random() * combinaciones.length
                  );
                  combinacionGlobal = combinaciones[index];
                  combinacionIndexGlobal = index + 1;

                  console.log(
                    `✅ Combinación PRE-SELECCIONADA: combinación ${combinacionIndexGlobal}`
                  );
                  console.log(`✅ Se usarán cartones comunes del 1 al 59000.`);
                }

                if (partida.hora_jugada <= horaActual) {
                  //...........
                  console.log(
                    `🎯 Ejecutando partida para las ${partida.hora_jugada}`
                  );
                  //...........
                  partidaEnJuego = true;
                  iniciarSorteo(partida); // function

                  if (global.anda) {
                    // JLF
                    setTimeout(() => {
                      ejecutarSorteoConConfiguracion(partida);
                    }, 5000);
                  } else {
                    console.log(" sorteo bloqueado");
                  }
                }
              } else {
                console.log("⏳ No hay partidas pendientes disponibles.");
                partidaActualGlobal = null;
                partidaEnJuego = false;
                combinacionGlobal = null;
                cartonesSemiganadoresGlobal = [];
                console.log(
                  "⚡ Todas las partidas programadas fueron jugadas o expiradas. Sistema en espera."
                );
              }
            }
          );
        }, 500); // 🔥 Esperamos 500ms para que los UPDATE terminen
      }
    );
  }, 5000); // Cada 5 segundos
}
/////////////////////////////  FUNCION INICIAR SORTEO
function iniciarSorteo(partida) {
  if (!partida) {
    console.error("❌ No se recibió una partida válida para iniciar.");
    return;
  }
  console.log(
    `🎯 Preparando partida programada para las ${partida.hora_jugada}`
  );

  config.valorCarton = partida.valor_carton;
  config.premioLinea = partida.premio_linea;
  config.premioBingo = partida.premio_bingo;
  config.premioAcumulado = partida.premio_acumulado;
  config.horaSorteo = partida.hora_jugada;

  console.log(
    `✅ Combinación de bolillas elegida: combinación ${combinacionIndexGlobal}`
  );
  if (!combinacionGlobal) {
    console.warn("⚠️ No hay combinación pre-generada. ");
  }
  io.emit("info-partida", {
    hora: partida.hora_jugada,
    valorCarton: partida.valor_carton,
    premioLinea: partida.premio_linea,
    premioBingo: partida.premio_bingo,
    premioAcumulado: partida.premio_acumulado,
  });
  if (global.anda) {
    io.emit(
      "mensaje-tiempo",
      `🎯 Jugada de las ${partida.hora_jugada} Buena Suerte!`
    );
  } else {
    io.emit("mensaje-tiempo", `🎯 PROBLEMA DE MEMORIA `);
  }
}
/////////////////////////////////////////////////  EJECUTAR SORTEO
////////////////////////////  INICIO TIMER
function ejecutarSorteoConConfiguracion(partida) {
  if (!partida) {
    console.error("❌ No se recibió una partida válida para ejecutar sorteo.");
    return;
  }

  const { id_partida } = partida;
  sorteoActivo = { acumuladoAnunciado: false };

  partidaActual = [...combinacionGlobal];
  proximaCombinacion = null;

  let bolillasEmitidas = [];
  let indiceBolilla = 0;
  let lineaCantada = false;
  let intervaloActivo = null;

  // Variables para guardar ganadores
  let resultadosLinea = [];
  let resultadosBingo = [];
  let resultadosAcumulado = [];

  console.log("🏁 Comienza el sorteo real con combinación predefinida");
  io.emit("mensaje-tiempo", "Jugando a Línea");

  ///////////////////////////  🔍 Detectar línea (5 aciertos en una fila)
  function detectarLinea(bolillas, usuariosCartones) {
    const ganadores = [];
    for (const [usuario, cartones] of Object.entries(usuariosCartones)) {
      cartones.forEach((carton, idx) => {
        for (let fila = 0; fila < 3; fila++) {
          const filaCarton = carton
            .slice(fila * 9, fila * 9 + 9)
            .filter((n) => n !== 0);
          const aciertos = filaCarton.filter((n) => bolillas.includes(n));
          if (aciertos.length === 5) {
            ganadores.push({ usuario, numeroCarton: idx + 1 });
          }
        }
      });
    }
    return ganadores;
  }
  ///////////////////////////  🔍 Emitir bolilla
  function emitirBolilla() {
    if (indiceBolilla >= partidaActual.length) {
      finalizarSorteo(bolillasEmitidas);
      clearInterval(intervaloActivo);
      intervaloActivo = null;
      return;
    }

    const bolilla = partidaActual[indiceBolilla];
    bolillasEmitidas.push(bolilla);
    io.emit("nuevaBolilla", bolilla);
    //.......................
    console.log(`🎯 Emitida bolilla: ${bolilla}`);
    //.......................
    indiceBolilla++;

    /////////////////////////  🔍 Detectar línea
    if (!lineaCantada) {
      const posiblesGanadoresLinea = detectarLinea(
        bolillasEmitidas,
        usuariosCartones
      );
      if (posiblesGanadoresLinea.length > 0) {
        resultadosLinea = posiblesGanadoresLinea;
        lineaCantada = true;
        io.emit("mensaje-tiempo", "¡Hay ganador de Linea!");
        io.emit("ganadoresLinea", posiblesGanadoresLinea);

        posiblesGanadoresLinea.forEach(({ usuario }) => {
          if (usuarios[usuario]) {
            usuarios[usuario].creditos += config.premioLinea;
            db.run("UPDATE Usuarios SET creditos = ? WHERE nombre = ?", [
              usuarios[usuario].creditos,
              usuario,
            ]);
            const socketId = usuariosConectados[usuario];
            if (socketId) {
              io.to(socketId).emit("infoUsuario", {
                creditos: usuarios[usuario].creditos,
                hora: config.horaSorteo,
              });
            }
          }
        });
        setTimeout(() => {
          io.emit("audio-evento", "A1HanLinMu");
        }, 3000);

        clearInterval(intervaloActivo);
        intervaloActivo = null;

        setTimeout(() => {
          io.emit("mensaje-tiempo", "Jugando a Bingo");
          continuarBingo();
        }, 10000);

        return;
      }
    }
    ///////////////////////////  🔍 Detectar Bingo (15 aciertos)
    const ganadoresBingo = [];
    for (const [usuario, cartones] of Object.entries(usuariosCartones)) {
      cartones.forEach((carton, idx) => {
        const numerosValidos = carton.filter((n) => n !== 0);
        const aciertos = numerosValidos.filter((n) =>
          bolillasEmitidas.includes(n)
        ).length;
        if (aciertos === 15) {
          ganadoresBingo.push({ usuario, numeroCarton: idx + 1 });
        }
      });
    }
    // 👑 Ganador de acumulado (si se canta bingo antes o en la bolilla topeAcumulado)
    if (
      ganadoresBingo.length > 0 &&
      bolillasEmitidas.length <= topeAcumulado &&
      !sorteoActivo.acumuladoAnunciado
    ) {
      sorteoActivo.acumuladoAnunciado = true;
      resultadosAcumulado = ganadoresBingo;
      io.emit("mensaje-tiempo", "🎯 GANADOR DEL ACUMULADO");
      io.emit("ganadoresAcumulado", ganadoresBingo);
      ganadoresBingo.forEach(({ usuario }) => {
        if (usuarios[usuario]) {
          usuarios[usuario].creditos += config.premioAcumulado;
          db.run("UPDATE Usuarios SET creditos = ? WHERE nombre = ?", [
            usuarios[usuario].creditos,
            usuario,
          ]);
          const socketId = usuariosConectados[usuario];
          if (socketId) {
            io.to(socketId).emit("infoUsuario", {
              creditos: usuarios[usuario].creditos,
              hora: config.horaSorteo,
            });
          }
        }
      });
    }
    // 🏁 Bingo final
    if (ganadoresBingo.length > 0) {
      resultadosBingo = ganadoresBingo;
      io.emit("mensaje-tiempo", "🎉 BINGO!!!");
      io.emit("ganadoresBingo", ganadoresBingo);
      ganadoresBingo.forEach(({ usuario }) => {
        if (usuarios[usuario]) {
          usuarios[usuario].creditos += config.premioBingo;
          db.run("UPDATE Usuarios SET creditos = ? WHERE nombre = ?", [
            usuarios[usuario].creditos,
            usuario,
          ]);
          const socketId = usuariosConectados[usuario];
          if (socketId) {
            io.to(socketId).emit("infoUsuario", {
              creditos: usuarios[usuario].creditos,
              hora: config.horaSorteo,
            });
          }
        }
      });
      setTimeout(() => {
        io.emit("audio-evento", "A2HanBinHo");
      }, 3000);

      clearInterval(intervaloActivo);
      intervaloActivo = null;

      setTimeout(() => {
        finalizarSorteo(
          bolillasEmitidas,
          resultadosLinea,
          resultadosBingo,
          resultadosAcumulado
        );
      }, 4000);
    }
  }
  ///////////////////////////  🔍 Continuar con el bingo
  function continuarBingo() {
    if (!intervaloActivo) {
      intervaloActivo = setInterval(emitirBolilla, 4000);
    }
  }
  ///////////////////////////  🔍 Finalizar sorteo
  function finalizarSorteo(
    bolillasEmitidas,
    resultadosLinea,
    resultadosBingo,
    resultadosAcumulado
  ) {
    const fechaHoraActual = new Date().toISOString();
    const horaPartida = partidaActualGlobal?.hora_jugada || "--:--";
    const id_partida = partidaActualGlobal?.id_partida || null;

    const cartonesJugados = Object.values(usuariosCartones)
      .flat()
      .map((_, idx) => idx + 1);

    const jsonLinea = JSON.stringify(resultadosLinea || []);
    const jsonBingo = JSON.stringify(resultadosBingo || []);
    const jsonAcumulado = JSON.stringify(resultadosAcumulado || []);
    const jsonBolillas = JSON.stringify(bolillasEmitidas);
    const jsonCartones = JSON.stringify(cartonesJugados);
    /////////////////  Guardar en la base de datos
    db.run(
      `
      INSERT INTO HistorialSorteos (
        fecha_hora,
        hora_sorteo,
        bolillas,
        cartones_jugados,
        ganadores_linea,
        ganadores_bingo,
        ganadores_acumulado
        ) VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [
        fechaHoraActual,
        horaPartida,
        jsonBolillas,
        jsonCartones,
        jsonLinea,
        jsonBingo,
        jsonAcumulado,
      ],
      (err) => {
        if (err) {
          console.error(
            "❌ Error al guardar historial de sorteo:",
            err.message
          );
        } else {
          console.log("📝 Historial del sorteo guardado correctamente.");
        }
      }
    );

    db.run(
      "UPDATE partidas SET estado = 'finalizada' WHERE id_partida = ?",
      [id_partida],
      (err) => {
        if (err)
          console.error(
            "❌ Error al actualizar estado de partida:",
            err.message
          );
      }
    );

    io.emit("resultadosOrdenados", []);

    setTimeout(() => {
      combinacionActual = null;
      partidaActual = [];
      usuariosCartones = {};
      usuariosCantidadCartones = {};
      sorteoActivo = false;
      partidaEnJuego = false;
      partidaActualGlobal = null;
      infoPartidaYaEnviada = false;

      io.emit("finSorteo");
      console.log('🚪 Evento "finSorteo" emitido.');

      iniciarTimerEspera(); /// a FUNCTION
      setTimeout(() => {
        combinacionGlobal = null;
        combinacionIndexGlobal = null;
        console.log("🧹 Combinación reseteada.");
      }, 6000);
    }, 10000);
  }
  // 🟢 INICIAR EMISIÓN DE BOLILLAS
  intervaloActivo = setInterval(emitirBolilla, 4000); //
}

///////////////////////////
///////////////////////////// ⏳ Inicia el primer interval
iniciarTimerEspera(); // ⚡ Llama a FUNCTION en linea 1082  +-

// Redirigir todas las rutas desconocidas al index.html de React
app.get("*", (req, res) => {
  res.sendFile(path.resolve(__dirname, "public", "index.html"));
});

///////////////////////////// 🚀 Iniciar servidor   anda 26 05 2025
server.listen(3001, "127.0.0.1", () => {
  console.log(`🚀 Servidor Bingo corriendo en http://localhost:3001`);
});
