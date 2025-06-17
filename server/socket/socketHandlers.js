// socket/socketHandlers.js

const db = require("../models/db");
const generarCartonesEnLote = require("../services/cartonGenerator");
const gameManager = require("../services/gameManager");

function convertirACartonPlano(carton) {
  if (!carton || !carton.contenido) return [];
  return carton.contenido.flat();
}

function registrarSockets(io) {
  const usuarios = {};
  const usuariosConectados = {};

  gameManager.setUsuariosMap(usuarios);
  gameManager.setSocketsMap(usuariosConectados);

  io.on("connection", (socket) => {
    console.log("🧲 Nuevo socket conectado:", socket.id);

    if (gameManager.estaPartidaEnJuego()) {
      socket.emit("estadoActual", {
        bolillasEmitidas: gameManager.obtenerBolillasEmitidas(),
        partidaId: gameManager.obtenerPartidaActual()?.id_partida || null,
      });
    }

    socket.on("login", (nombre) => {
      db.get(
        "SELECT creditos FROM Usuarios WHERE usuario = ?",
        [nombre],
        (err, row) => {
          if (err || !row) return socket.emit("error", "Usuario no encontrado");

          socket.usuario = nombre;
          usuarios[nombre] = { creditos: row.creditos };
          usuariosConectados[nombre] = socket.id;

          db.get(
            `SELECT id_partida FROM Partidas WHERE estado = 'pendiente' ORDER BY fecha_hora_jugada ASC LIMIT 1`,
            [],
            (err2, partida) => {
              if (err2 || !partida) {
                socket.emit("datosUsuario", {
                  creditos: row.creditos,
                  cartones: 0,
                });
              } else {
                db.get(
                  `SELECT COUNT(*) as total FROM CartonesAsignados WHERE usuario = ? AND id_partida = ?`,
                  [nombre, partida.id_partida],
                  (err3, countRow) => {
                    const total = countRow?.total || 0;
                    socket.emit("datosUsuario", {
                      creditos: row.creditos,
                      cartones: total,
                    });
                  }
                );
              }
            }
          );
        }
      );
    });

    socket.on("logoutUsuario", () => {
      if (socket.usuario) {
        delete usuarios[socket.usuario];
        delete usuariosConectados[socket.usuario];
      }
    });

    socket.on("crearUsuario", (datos) => {
      const { nombre, apellido, documento, usuario, contraseña, creditos } =
        datos;
      db.run(
        `INSERT INTO Usuarios (nombre, apellido, documento, usuario, contraseña, creditos) VALUES (?, ?, ?, ?, ?, ?)`,
        [nombre, apellido, documento, usuario, contraseña, creditos || 0]
      );
    });

    socket.on("modificarUsuario", ({ creditos, usuario }) => {
      db.run("UPDATE Usuarios SET creditos = ? WHERE usuario = ?", [
        creditos,
        usuario,
      ]);
    });

    socket.on("eliminarUsuario", (usuario) => {
      db.run("DELETE FROM Usuarios WHERE usuario = ?", [usuario]);
    });

    socket.on("pedirUsuarios", () => {
      db.all(
        "SELECT * FROM Usuarios ORDER BY id_usuario DESC",
        [],
        (err, rows) => {
          if (!err) socket.emit("usuariosCargados", rows);
        }
      );
    });

    socket.on("comprarCartones", (cantidad, callback) => {
      const nombre = socket.usuario;
      if (!usuarios[nombre])
        return callback({ ok: false, error: "No autenticado" });

      db.get(
        `SELECT id_partida, valor_carton, fecha_hora_jugada FROM Partidas WHERE estado = 'pendiente' ORDER BY fecha_hora_jugada ASC LIMIT 1`,
        [],
        (err, partida) => {
          if (err || !partida)
            return callback({ ok: false, error: "No hay partida disponible" });

          const horaActual = new Date();
          const fechaPartida = new Date(partida.fecha_hora_jugada);
          const diffMs = fechaPartida - horaActual;

          if (diffMs <= 5000) {
            return callback({
              ok: false,
              error:
                "Faltan menos de 5 segundos para iniciar, no se pueden comprar cartones.",
            });
          }

          db.get(
            `SELECT COUNT(*) as total FROM CartonesAsignados WHERE usuario = ? AND id_partida = ?`,
            [nombre, partida.id_partida],
            (err2, row) => {
              const actuales = row?.total || 0;
              const disponibles = 12 - actuales;
              if (disponibles <= 0)
                return callback({
                  ok: false,
                  error: "Ya tienes 12 cartones para esta partida",
                });

              if (cantidad > disponibles)
                return callback({
                  ok: false,
                  error: `Solo puedes comprar ${disponibles} cartones más para esta partida`,
                });

              const costo = cantidad * partida.valor_carton;
              if (usuarios[nombre].creditos < costo)
                return callback({ ok: false, error: "Créditos insuficientes" });

              usuarios[nombre].creditos -= costo;
              db.run("UPDATE Usuarios SET creditos = ? WHERE usuario = ?", [
                usuarios[nombre].creditos,
                nombre,
              ]);

              generarCartonesEnLote(cantidad, (nuevosCartones) => {
                const ahora = new Date().toISOString();

                nuevosCartones.forEach(({ numero, contenido }) => {
                  db.run(
                    `INSERT INTO CartonesAsignados (usuario, id_partida, numero_carton, fecha_asignacion, contenido) VALUES (?, ?, ?, ?, ?)`,
                    [
                      nombre,
                      partida.id_partida,
                      numero,
                      ahora,
                      JSON.stringify(contenido),
                    ]
                  );
                });

                db.run(
                  `INSERT INTO Uso (hora_sorteo, usuario, codigo, valor) VALUES (?, ?, ?, ?)`,
                  [ahora.slice(11, 16), nombre, `${cantidad} cartones`, costo]
                );

                const planos = nuevosCartones.map((c) =>
                  convertirACartonPlano(c)
                );
                callback({ ok: true });
                socket.emit("recibirCartones", planos);
              });
            }
          );
        }
      );
    });

    socket.on("solicitarCartones", () => {
      const nombre = socket.usuario;
      db.all(
        "SELECT numero_carton, contenido FROM CartonesAsignados WHERE usuario = ? ORDER BY numero_carton",
        [nombre],
        (err, rows) => {
          if (!err) {
            const cartones = rows.map((r) =>
              convertirACartonPlano({ contenido: JSON.parse(r.contenido) })
            );
            socket.emit("recibirCartones", cartones);
          }
        }
      );
    });

    socket.on("reemitirCartonesPrevios", (usuario) => {
      db.all(
        "SELECT numero_carton, contenido FROM CartonesAsignados WHERE usuario = ? ORDER BY numero_carton",
        [usuario],
        (err, rows) => {
          if (!err && usuariosConectados[usuario]) {
            const cartones = rows.map((r) =>
              convertirACartonPlano({ contenido: JSON.parse(r.contenido) })
            );
            io.to(usuariosConectados[usuario]).emit(
              "recibirCartones",
              cartones
            );
          }
        }
      );
    });

    socket.on("verificarCompraPrevia", (callback) => {
      const nombre = socket.usuario;
      db.get(
        "SELECT COUNT(*) as total FROM CartonesAsignados WHERE usuario = ?",
        [nombre],
        (err, row) => {
          callback(row?.total > 0);
        }
      );
    });

    socket.on("obtenerCartonesDisponibles", (callback) => {
      const nombre = socket.usuario;
      db.all(
        "SELECT numero_carton, contenido FROM CartonesAsignados WHERE usuario = ?",
        [nombre],
        (err, rows) => {
          if (!err && typeof callback === "function") {
            const disponibles = rows.map((r) =>
              convertirACartonPlano({ contenido: JSON.parse(r.contenido) })
            );
            callback(disponibles);
          }
        }
      );
    });

    socket.on("iniciarPartida", (id) => {
      db.get(
        "SELECT * FROM Partidas WHERE id_partida = ?",
        [id],
        (err, partida) => {
          if (err || !partida) return;
          db.run("UPDATE Partidas SET estado = 'activa' WHERE id_partida = ?", [
            id,
          ]);
          gameManager.iniciarSorteo(io, partida);
        }
      );
    });

    socket.on("permitirAcumulado", (estado) => {
      gameManager.permitirAcumulado(estado === true);
    });

    socket.on("iniciarMultiplesPartidas", (ids) => {
      const placeholders = ids.map(() => "?").join(",");
      db.run(
        `UPDATE Partidas SET estado = 'activa' WHERE id_partida IN (${placeholders})`,
        ids
      );
    });

    socket.on("finalizarPartidasMultiples", (ids) => {
      const placeholders = ids.map(() => "?").join(",");
      db.run(
        `UPDATE Partidas SET estado = 'finalizada' WHERE id_partida IN (${placeholders})`,
        ids
      );
      db.run(
        `DELETE FROM CartonesAsignados WHERE id_partida IN (${placeholders})`,
        ids
      );
    });

    socket.on("guardarTextoJugadores", (texto) => {
      db.run(
        `INSERT OR REPLACE INTO configuracion (id, texto_jugadores) VALUES (1, ?)`,
        [texto]
      );
    });

    socket.on("obtenerTextoJugadores", (callback) => {
      db.get(
        "SELECT texto_jugadores FROM configuracion WHERE id = 1",
        (err, row) => {
          if (typeof callback === "function") {
            callback(row?.texto_jugadores || "");
          }
        }
      );
    });

    socket.on("acreditarCreditos", ({ usuario, creditos }) => {
      db.run("UPDATE Usuarios SET creditos = creditos + ? WHERE usuario = ?", [
        creditos,
        usuario,
      ]);
    });

    socket.on("disconnect", () => {
      if (socket.usuario && usuariosConectados[socket.usuario] === socket.id) {
        delete usuariosConectados[socket.usuario];
        delete usuarios[socket.usuario];
      }
    });
  });
}

module.exports = registrarSockets;
