// services/gameManager.js

const db = require("../models/db");
const { Server } = require("socket.io");
const { combinaciones } = require("./combinacionesBolillas");

let partidaEnJuego = false;
let partidaActual = null;
let combinacionGlobal = null;
let combinacionIndexGlobal = null;
let usuariosCartones = {};
let usuarios = {};
let usuariosConectados = {};
let sorteoActivo = false;
let partidaActualGlobal = null;

let acumuladoHabilitado = false;
const topeAcumulado = 39;

function setUsuariosMap(usuariosMap) {
  usuarios = usuariosMap;
}

function aplanarCarton(carton) {
  if (!Array.isArray(carton)) return [];
  return carton.flat();
}

function setSocketsMap(conectadosMap) {
  usuariosConectados = conectadosMap;
}

function setCombinacion(combinacion, index) {
  combinacionGlobal = combinacion;
  combinacionIndexGlobal = index;
}

function permitirAcumulado(valor) {
  acumuladoHabilitado = false;
}

function estaPartidaEnJuego() {
  return partidaEnJuego;
}

function obtenerBolillasEmitidas() {
  return emitidas;
}

function obtenerPartidaActual() {
  return partidaActualGlobal;
}

function iniciarSorteo(io, partida) {
  if (!partida || partidaEnJuego) return;

  console.log("🎯 Iniciando sorteo de partida:", partida);
  partidaEnJuego = true;
  partidaActual = partida;
  partidaActualGlobal = partida;
  sorteoActivo = true;

  const index = Math.floor(Math.random() * combinaciones.length);
  setCombinacion(combinaciones[index], index);

  if (!combinacionGlobal || !Array.isArray(combinacionGlobal)) {
    console.warn("⚠️ No hay combinación de bolillas disponible");
    return;
  }

  let bolillas = [...combinacionGlobal];
  let emitidas = [];
  let indice = 0;
  let lineaCantada = false;
  let ganadoresLinea = [];
  let ganadoresBingo = [];
  let ganadoresAcumulado = [];

  const intervalo = setInterval(() => {
    if (indice >= bolillas.length) {
      clearInterval(intervalo);
      finalizar();
      return;
    }

    const bolilla = bolillas[indice++];
    emitidas.push(bolilla);
    io.emit("nuevaBolilla", bolilla);
    console.log("⚪ Bolilla emitida:", bolilla);

    if (!lineaCantada) {
      for (const [usuario, cartones] of Object.entries(usuariosCartones)) {
        for (const carton of cartones) {
          for (let f = 0; f < 3; f++) {
            const fila = carton.slice(f * 9, f * 9 + 9).filter((n) => n !== 0);
            const aciertos = fila.filter((n) => emitidas.includes(n));
            if (aciertos.length === 5) {
              lineaCantada = true;
              ganadoresLinea.push({ usuario });
              io.emit("ganadoresLinea", ganadoresLinea);
              break;
            }
          }
        }
      }
    }

    for (const [usuario, cartones] of Object.entries(usuariosCartones)) {
      for (const carton of cartones) {
        const llenos = carton.filter((n) => n !== 0 && emitidas.includes(n));
        if (llenos.length === 15) {
          ganadoresBingo.push({ usuario });

          if (emitidas.length <= topeAcumulado && acumuladoHabilitado) {
            ganadoresAcumulado.push({ usuario });
            io.emit("ganadoresAcumulado", ganadoresAcumulado);
          }

          io.emit("ganadoresBingo", ganadoresBingo);
          clearInterval(intervalo);
          setTimeout(finalizar, 3000);
          return;
        }
      }
    }
  }, 4000);

  function finalizar() {
    console.log("✅ Sorteo finalizado.");
    partidaEnJuego = false;
    sorteoActivo = false;

    io.emit("finSorteo");

    db.run("UPDATE Partidas SET estado = 'finalizada' WHERE id_partida = ?", [
      partida.id_partida,
    ]);

    db.run(`DELETE FROM CartonesAsignados WHERE id_partida = ?`, [
      partida.id_partida,
    ]);

    db.run(
      `INSERT INTO HistorialSorteos 
       (fecha_hora, bolillas, cartones_jugados, ganadores_linea, ganadores_bingo, ganadores_acumulado)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [
        new Date().toISOString(),
        JSON.stringify(emitidas),
        JSON.stringify(
          Object.values(usuariosCartones)
            .flat()
            .map((c) => aplanarCarton(c))
        ),
        JSON.stringify(ganadoresLinea),
        JSON.stringify(ganadoresBingo),
        JSON.stringify(ganadoresAcumulado),
      ],
      (err) => {
        if (err) {
          console.error("❌ Error al registrar historial:", err.message);
        } else {
          console.log("📝 Historial registrado correctamente.");
        }
      }
    );
  }
}

module.exports = {
  iniciarSorteo,
  permitirAcumulado,
  setUsuariosMap,
  setSocketsMap,
  setCombinacion,
  estaPartidaEnJuego,
  obtenerBolillasEmitidas,
  obtenerPartidaActual,
};
