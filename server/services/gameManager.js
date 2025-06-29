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
let bolillasEmitidasGlobal = [];

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
  return bolillasEmitidasGlobal;
}

function obtenerPartidaActual() {
  return partidaActual;
}

function obtenerBolillasEmitidas() {
  return bolillasEmitidasGlobal;
}

function iniciarSorteo(io, partida) {
  if (!partida || partidaEnJuego) return;

  console.log("🎯 Iniciando sorteo de partida:", partida);
  partidaEnJuego = true;
  sorteoActivo = true;
  partidaActual = {
    ...partida,
    estado: "activa",
    valor_carton: partida.valor_carton,
    premio_linea: partida.premio_linea,
    premio_bingo: partida.premio_bingo,
    premio_acumulado: partida.premio_acumulado,
  };
  const index = Math.floor(Math.random() * combinaciones.length);
  setCombinacion(combinaciones[index], index);

  if (!Array.isArray(combinacionGlobal)) {
    console.warn(
      "⚠️ No hay combinación de bolillas disponible:",
      combinacionGlobal
    );
    return;
  }

  db.all(
    `SELECT usuario, numero_carton, contenido FROM CartonesAsignados WHERE id_partida = ?`,
    [partida.id_partida],
    (err, rows) => {
      if (err) {
        console.error("❌ Error al cargar cartones:", err.message);
        return;
      }

      usuariosCartones = {};
      const todosLosCartones = [];

      rows.forEach((row) => {
        const contenidoPlano = JSON.parse(row.contenido).flat();
        const carton = {
          numeroCarton: row.numero_carton,
          contenido: contenidoPlano,
        };
        if (!usuariosCartones[row.usuario]) {
          usuariosCartones[row.usuario] = [];
        }
        usuariosCartones[row.usuario].push(carton);
        todosLosCartones.push(carton.contenido);
      });

      iniciarProcesoSorteo(io, partida, todosLosCartones);
    }
  );

  function iniciarProcesoSorteo(io, partida, cartonesJugadosPlano) {
    let bolillas = [...combinacionGlobal];
    let indice = 0;
    let lineaCantada = false;
    let ganadoresLinea = [];
    let ganadoresBingo = [];
    let ganadoresAcumulado = [];
    bolillasEmitidasGlobal = [];

    const intervalo = setInterval(() => {
      if (indice >= bolillas.length) {
        clearInterval(intervalo);
        finalizar();
        return;
      }

      const bolilla = bolillas[indice++];
      bolillasEmitidasGlobal.push(bolilla);
      io.emit("nuevaBolilla", bolilla);
      console.log("⚪ Bolilla emitida:", bolilla);

      if (!lineaCantada) {
        for (const [usuario, cartones] of Object.entries(usuariosCartones)) {
          for (const { contenido, numeroCarton } of cartones) {
            for (let f = 0; f < 3; f++) {
              const fila = contenido
                .slice(f * 9, (f + 1) * 9)
                .filter((n) => n !== 0);
              const aciertos = fila.filter((n) =>
                bolillasEmitidasGlobal.includes(n)
              );
              if (aciertos.length === 5) {
                lineaCantada = true;
                ganadoresLinea.push({ usuario, numeroCarton });
                io.emit("ganadoresLinea", ganadoresLinea);
                break;
              }
            }
          }
        }
      }

      for (const [usuario, cartones] of Object.entries(usuariosCartones)) {
        for (const { contenido, numeroCarton } of cartones) {
          const llenos = contenido.filter(
            (n) => n !== 0 && bolillasEmitidasGlobal.includes(n)
          );
          if (llenos.length === 15) {
            ganadoresBingo.push({ usuario, numeroCarton });
            if (
              bolillasEmitidasGlobal.length <= topeAcumulado &&
              acumuladoHabilitado
            ) {
              ganadoresAcumulado.push({ usuario, numeroCarton });
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

      db.run("DELETE FROM CartonesAsignados WHERE id_partida = ?", [
        partida.id_partida,
      ]);

      db.run(
        `INSERT INTO HistorialSorteos 
         (fecha_hora, hora_sorteo, bolillas, cartones_jugados, ganadores_linea, ganadores_bingo, ganadores_acumulado)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [
          new Date().toISOString(),
          new Date().toTimeString().slice(0, 5),
          JSON.stringify(bolillasEmitidasGlobal),
          JSON.stringify(cartonesJugadosPlano),
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
}

module.exports = {
  iniciarSorteo,
  permitirAcumulado,
  setUsuariosMap,
  setSocketsMap,
  setCombinacion,
  estaPartidaEnJuego,
  obtenerBolillasEmitidas,
  obtenerPartidaActual: async () => {
    return new Promise((resolve, reject) => {
      const ahora = Date.now();
      db.get(
        `SELECT * FROM Partidas WHERE estado = 'activa' ORDER BY fecha_hora_jugada ASC LIMIT 1`,
        [],
        (err, partidaActiva) => {
          if (err) return reject(err);
          if (partidaActiva) return resolve(partidaActiva);

          db.get(
            `SELECT * FROM Partidas WHERE estado = 'pendiente' ORDER BY fecha_hora_jugada ASC LIMIT 1`,
            [],
            (err2, partidaPendiente) => {
              if (err2 || !partidaPendiente) return resolve(null);

              const inicio = new Date(
                partidaPendiente.fecha_hora_jugada
              ).getTime();
              const faltanMenosDe5Min =
                inicio - ahora <= 5 * 60 * 1000 && inicio - ahora > 0;

              if (faltanMenosDe5Min) {
                resolve(partidaPendiente);
              } else {
                resolve(null);
              }
            }
          );
        }
      );
    });
  },
};
