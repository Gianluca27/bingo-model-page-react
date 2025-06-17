// services/cartonGenerator.js
const db = require("../models/db");

function obtenerUltimoNumeroCarton(callback) {
  db.get(
    "SELECT MAX(numero_carton) AS max FROM CartonesAsignados",
    (err, row) => {
      if (err) return callback(0);
      callback(row?.max || 0);
    }
  );
}

function generarCartonesEnLote(cantidad, callback) {
  obtenerUltimoNumeroCarton((ultimoNumero) => {
    const nuevosCartones = [];
    for (let i = 0; i < cantidad; i++) {
      nuevosCartones.push({
        numero: ultimoNumero + i + 1,
        contenido: generarCartonValido(),
      });
    }
    callback(nuevosCartones);
  });
}

function generarCartonValido() {
  const carton = Array.from({ length: 3 }, () => Array(9).fill(null));
  const columnas = Array.from({ length: 9 }, () => []);
  const usadosPorColumna = Array(9).fill(0);

  const numerosDisponibles = mezclar(
    Array.from({ length: 90 }, (_, i) => i + 1)
  );
  const seleccionados = [];

  for (
    let i = 0;
    i < numerosDisponibles.length && seleccionados.length < 15;
    i++
  ) {
    const n = numerosDisponibles[i];
    const col = Math.floor((n - 1) / 10);
    if (usadosPorColumna[col] < 3) {
      seleccionados.push({ n, col });
      usadosPorColumna[col]++;
    }
  }

  for (let col = 0; col < 9; col++) {
    if (usadosPorColumna[col] === 0) return generarCartonValido();
  }

  const filas = [[], [], []];
  for (let i = 0; i < seleccionados.length; i++) {
    const { n, col } = seleccionados[i];
    let filaAsignada = filas.findIndex((f) => f.length < 5 && !f.includes(col));
    if (filaAsignada === -1)
      filaAsignada = filas.findIndex((f) => f.length < 5);
    if (filaAsignada !== -1) filas[filaAsignada].push({ col, n });
  }

  for (let fila = 0; fila < 3; fila++) {
    for (const { col, n } of filas[fila]) {
      carton[fila][col] = n;
    }
  }

  return carton;
}

function mezclar(arr) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

module.exports = generarCartonesEnLote;
