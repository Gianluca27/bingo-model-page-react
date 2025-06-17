const sqlite3 = require("sqlite3").verbose();
const path = require("path");

const db = new sqlite3.Database(
  path.resolve(__dirname, "../bingo.db"),
  (err) => {
    if (err)
      return console.error("❌ Error al abrir la base de datos:", err.message);
    console.log("✅ Base de datos conectada.");
  }
);

// Configuraciones de rendimiento y concurrencia
const configurarBase = () => {
  db.serialize(() => {
    db.run("PRAGMA busy_timeout = 3000");
    db.run("PRAGMA journal_mode = WAL");

    db.run(`CREATE TABLE IF NOT EXISTS Usuarios (
      id_usuario INTEGER PRIMARY KEY AUTOINCREMENT,
      nombre TEXT NOT NULL,
      apellido TEXT NOT NULL,
      documento TEXT NOT NULL UNIQUE,
      creditos INTEGER NOT NULL DEFAULT 0,
      usuario TEXT NOT NULL UNIQUE,
      contraseña TEXT NOT NULL,
      fecha_ultimo_movimiento TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      rol TEXT DEFAULT 'usuario'
    )`);

    db.run(`CREATE TABLE IF NOT EXISTS Partidas (
      id_partida INTEGER PRIMARY KEY AUTOINCREMENT,
      fecha_hora_jugada TEXT NOT NULL,
      intervalo INTEGER NOT NULL DEFAULT 10,
      valor_carton INTEGER NOT NULL,
      premio_linea INTEGER NOT NULL,
      premio_bingo INTEGER NOT NULL,
      premio_acumulado INTEGER NOT NULL,
      estado TEXT DEFAULT 'pendiente'
    )`);

    db.run(`CREATE TABLE IF NOT EXISTS CartonesAsignados (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      usuario TEXT NOT NULL,
      id_partida INTEGER NOT NULL,
      numero_carton INTEGER NOT NULL,
      fecha_asignacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )`);

    db.run(`CREATE TABLE IF NOT EXISTS Uso (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      fecha_hora_momento TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      hora_sorteo TEXT NOT NULL,
      usuario TEXT NOT NULL,
      codigo TEXT NOT NULL,
      valor REAL NOT NULL,
      campo_futuro TEXT
    )`);

    db.run(`CREATE TABLE IF NOT EXISTS HistorialSorteos (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      fecha_hora_jugada TEXT NOT NULL,
      bolillas TEXT NOT NULL,
      cartones_jugados TEXT NOT NULL,
      ganadores_linea TEXT,
      ganadores_bingo TEXT,
      ganadores_acumulado TEXT
    )`);

    db.run(`CREATE TABLE IF NOT EXISTS configuracion (
      id INTEGER PRIMARY KEY CHECK (id = 1),
      texto_jugadores TEXT DEFAULT 'BUENA SUERTE !!!'
    )`);
  });
};

configurarBase();

module.exports = db;
