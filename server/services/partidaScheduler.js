const db = require("../models/db");
const { iniciarSorteo } = require("./gameManager");
const { estaPartidaEnJuego } = require("./gameManager");

let timerEsperaActivo = null;

function iniciarTimerEspera(io) {
  timerEsperaActivo = setInterval(() => {
    console.log("🕒 Revisando partidas pendientes...");

    if (estaPartidaEnJuego()) return;

    const ahora = new Date();

    db.all(
      `SELECT id_partida, fecha_hora_jugada
       FROM Partidas
       WHERE estado = 'pendiente'`,
      [],
      (err, partidas) => {
        if (err) {
          console.error("❌ Error al buscar partidas pendientes:", err.message);
          return;
        }

        if (partidas.length === 0) {
          console.log("📭 No hay partidas pendientes.");
          return;
        }

        const partidasAIniciar = partidas.filter(
          (p) => new Date(p.fecha_hora_jugada) <= ahora
        );

        console.log(
          `🔎 Encontradas ${partidas.length} pendientes, ${partidasAIniciar.length} para iniciar`
        );

        if (partidasAIniciar.length === 0) return;

        partidasAIniciar.forEach((partida) => {
          db.run(
            `UPDATE Partidas SET estado = 'activa' WHERE id_partida = ?`,
            [partida.id_partida],
            (err2) => {
              if (err2) {
                console.error("❌ Error al activar partida:", err2.message);
                return;
              }

              console.log(
                `✅ Partida ${partida.id_partida} activada automáticamente.`
              );
              io.emit("partidaIniciada", partida.id_partida);
              iniciarSorteo(io, partida);
            }
          );
        });
      }
    );
  }, 10000);
}

module.exports = iniciarTimerEspera;
