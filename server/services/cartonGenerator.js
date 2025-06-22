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
  // Paso 1: Generar por columnas los grupos posibles
  const columnas = Array.from({ length: 9 }, (_, i) => {
    const min = i === 0 ? 1 : i * 10;
    const max = i === 8 ? 90 : i * 10 + 9;
    const nums = Array.from({ length: max - min + 1 }, (_, j) => min + j);
    return mezclar(nums).slice(0, 3); // máx 3 por columna
  });

  // Paso 2: Elegir una cantidad de números por columna que sumen 15
  let distribucion;
  while (true) {
    distribucion = Array(9)
      .fill(0)
      .map(() => 0);
    let total = 0;
    while (total < 15) {
      const i = Math.floor(Math.random() * 9);
      if (distribucion[i] < 3) {
        distribucion[i]++;
        total++;
      }
    }
    if (distribucion.every((x) => x > 0)) break; // al menos 1 por columna
  }

  // Paso 3: Seleccionar los números según la distribución
  const cartonPorColumna = columnas.map((nums, i) =>
    nums.slice(0, distribucion[i]).sort((a, b) => a - b)
  );

  // Paso 4: Armar matriz 3x9 con exactamente 5 números por fila
  const carton = Array.from({ length: 3 }, () => Array(9).fill(null));
  const cuentaFila = Array(3).fill(0);

  for (let col = 0; col < 9; col++) {
    const nums = cartonPorColumna[col];
    const posiblesFilas = [0, 1, 2];
    for (const n of nums) {
      // buscar fila disponible con menos de 5 números
      posiblesFilas.sort((a, b) => cuentaFila[a] - cuentaFila[b]);
      const fila = posiblesFilas.find(
        (f) => carton[f][col] === null && cuentaFila[f] < 5
      );
      if (fila !== undefined) {
        carton[fila][col] = n;
        cuentaFila[fila]++;
      }
    }
  }

  const filasValidas = cuentaFila.every((n) => n === 5);
  const totalValidos = carton.flat().filter((n) => n !== null).length === 15;
  const columnasValidas = carton[0]
    .map((_, col) => carton[0][col] || carton[1][col] || carton[2][col])
    .every(Boolean);

  if (filasValidas && totalValidos && columnasValidas) return carton;
  return generarCartonValido();
}

function mezclar(arr) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

module.exports = generarCartonesEnLote;
