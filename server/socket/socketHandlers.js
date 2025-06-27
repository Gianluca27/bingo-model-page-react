// socket/socketHandlers.js

const db = require("../models/db");
const generarCartonesEnLote = require("../services/cartonGenerator");
const gameManager = require("../services/gameManager");
const { partidaEnJuego, partidaActual } = gameManager;

function convertirACartonPlano(carton) {
  if (!carton || !carton.contenido) return [];
  return carton.contenido.flat();
}

function registrarSockets(io) {
  const usuarios = {};
  const usuariosConectados = {};
  gameManager.setUsuariosMap(usuarios);
  gameManager.setSocketsMap(usuariosConectados);
  io.on("connection", async (socket) => {
    console.log("🧲 Nuevo socket conectado:", socket.id);

    const partidaActiva = await gameManager.obtenerPartidaActual();

    if (partidaActiva && partidaActiva.estado === "activa") {
      socket.emit("estadoActual", {
        bolillasEmitidas: gameManager.obtenerBolillasEmitidas(),
        partidaId: partidaActiva.id_partida,
        valorCarton: partidaActiva.valor_carton,
        premioLinea: partidaActiva.premio_linea,
        premioBingo: partidaActiva.premio_bingo,
        premioAcumulado: partidaActiva.premio_acumulado,
        fechaSorteo: partidaActiva.fecha_hora_jugada,
      });
    }

    socket.on("login", (nombre, callback) => {
      db.get(
        "SELECT creditos FROM Usuarios WHERE usuario = ?",
        [nombre],
        (err, row) => {
          if (err || !row) {
            socket.emit("error", "Usuario no encontrado");
            if (callback) callback({ ok: false });
            return;
          }

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

              if (callback) callback({ ok: true }); // ✅ confirmación al cliente
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

    socket.on("solicitarDatosUsuario", (callback) => {
      const nombre = socket.usuario;
      if (!usuarios[nombre]) return;

      db.get(
        `SELECT * FROM Partidas 
         WHERE estado = 'activa' OR estado = 'pendiente' 
         ORDER BY 
           CASE estado 
             WHEN 'activa' THEN 0 
             WHEN 'pendiente' THEN 1 
           END, 
           fecha_hora_jugada ASC 
         LIMIT 1`,
        [],
        (err, partida) => {
          if (err || !partida) {
            return socket.emit("datosUsuario", {
              creditos: usuarios[nombre].creditos,
              cartones: 0,
            });
          }

          db.get(
            `SELECT COUNT(*) as total FROM CartonesAsignados 
             WHERE usuario = ? AND id_partida = ?`,
            [nombre, partida.id_partida],
            (err2, row) => {
              const total = row?.total || 0;
              socket.emit("datosUsuario", {
                creditos: usuarios[nombre].creditos,
                cartones: total,
              });
            }
          );
        }
      );
    });

    socket.on("solicitarInfoPartida", async (callback) => {
      const partidaActual = await gameManager.obtenerPartidaActual();

      if (typeof callback !== "function") return;

      // ❌ Si está finalizada, no la devuelvas como activa
      if (partidaActual && partidaActual.estado === "finalizada") {
        return db.get(
          `SELECT * FROM Partidas 
           WHERE estado = 'pendiente' 
           ORDER BY fecha_hora_jugada ASC 
           LIMIT 1`,
          [],
          (err, partidaPendiente) => {
            if (err || !partidaPendiente) {
              return callback({ error: "NO_HAY_PARTIDA" });
            }

            const ahora = Date.now();
            const inicio = new Date(
              partidaPendiente.fecha_hora_jugada
            ).getTime();
            const faltanMenosDe5Min =
              inicio - ahora <= 5 * 60 * 1000 && inicio - ahora > 0;

            if (faltanMenosDe5Min) {
              return callback({
                id_partida: partidaPendiente.id_partida,
                fecha_hora_jugada: partidaPendiente.fecha_hora_jugada,
                valor_carton: partidaPendiente.valor_carton,
                premio_linea: partidaPendiente.premio_linea,
                premio_bingo: partidaPendiente.premio_bingo,
                premio_acumulado: partidaPendiente.premio_acumulado,
                estado: partidaPendiente.estado,
              });
            } else {
              return callback({ error: "FALTAN_MAS_DE_5_MINUTOS" });
            }
          }
        );
      }

      // ✅ Si hay una partida activa, devolvé esa
      if (partidaActual && partidaActual.estado === "activa") {
        db.get(
          `SELECT * FROM Partidas WHERE id_partida = ?`,
          [partidaActual.id_partida],
          (err, partidaCompleta) => {
            if (err || !partidaCompleta)
              return callback({ error: "NO_HAY_PARTIDA" });

            callback({
              id_partida: partidaCompleta.id_partida,
              fecha_hora_jugada: partidaCompleta.fecha_hora_jugada,
              valor_carton: partidaCompleta.valor_carton,
              premio_linea: partidaCompleta.premio_linea,
              premio_bingo: partidaCompleta.premio_bingo,
              premio_acumulado: partidaCompleta.premio_acumulado,
              estado: partidaCompleta.estado,
            });
          }
        );
        return;
      }
      db.get(
        `SELECT * FROM Partidas 
         WHERE estado = 'pendiente' 
         ORDER BY fecha_hora_jugada ASC 
         LIMIT 1`,
        [],
        (err, partidaPendiente) => {
          if (err || !partidaPendiente) {
            return callback({ error: "NO_HAY_PARTIDA" });
          }

          return callback({
            id_partida: partidaPendiente.id_partida,
            fecha_hora_jugada: partidaPendiente.fecha_hora_jugada,
            valor_carton: partidaPendiente.valor_carton,
            premio_linea: partidaPendiente.premio_linea,
            premio_bingo: partidaPendiente.premio_bingo,
            premio_acumulado: partidaPendiente.premio_acumulado,
            estado: partidaPendiente.estado,
          });
        }
      );
    });

    socket.on(
      "comprarCartonesParaPartida",
      ({ cantidad, id_partida }, callback) => {
        const nombre = socket.usuario;
        if (!usuarios[nombre]) {
          return callback({ ok: false, error: "No autenticado" });
        }

        db.get(
          `SELECT * FROM Partidas WHERE id_partida = ?`,
          [id_partida],
          (err, partida) => {
            if (err || !partida) {
              return callback({ ok: false, error: "Partida no encontrada" });
            }

            const ahora = new Date();
            const fechaInicio = new Date(partida.fecha_hora_jugada);
            const diferenciaMs = fechaInicio - ahora;

            if (partida.estado === "activa") {
              return callback({
                ok: false,
                error: "La partida ya comenzó. No se pueden comprar cartones.",
              });
            }

            if (diferenciaMs <= 5000) {
              return callback({
                ok: false,
                error:
                  "Faltan menos de 5 segundos para iniciar. Ya no se pueden comprar cartones.",
              });
            }

            db.get(
              `SELECT COUNT(*) as total FROM CartonesAsignados WHERE usuario = ? AND id_partida = ?`,
              [nombre, id_partida],
              (err2, row) => {
                if (err2) {
                  return callback({
                    ok: false,
                    error: "Error al verificar cartones existentes",
                  });
                }

                const actuales = row?.total || 0;
                const disponibles = 12 - actuales;

                if (disponibles <= 0) {
                  return callback({
                    ok: false,
                    error: "Ya tenés 12 cartones para esta partida",
                  });
                }

                if (cantidad > disponibles) {
                  return callback({
                    ok: false,
                    error: `Solo podés comprar ${disponibles} cartones más para esta partida`,
                  });
                }

                const costo = cantidad * partida.valor_carton;
                if (usuarios[nombre].creditos < costo) {
                  return callback({
                    ok: false,
                    error: "Créditos insuficientes",
                  });
                }

                usuarios[nombre].creditos -= costo;
                db.run("UPDATE Usuarios SET creditos = ? WHERE usuario = ?", [
                  usuarios[nombre].creditos,
                  nombre,
                ]);

                generarCartonesEnLote(cantidad, (nuevosCartones) => {
                  const ahoraISO = new Date().toISOString();

                  nuevosCartones.forEach(({ numero, contenido }) => {
                    db.run(
                      `INSERT INTO CartonesAsignados (usuario, id_partida, numero_carton, fecha_asignacion, contenido) VALUES (?, ?, ?, ?, ?)`,
                      [
                        nombre,
                        id_partida,
                        numero,
                        ahoraISO,
                        JSON.stringify(contenido),
                      ]
                    );
                  });

                  db.run(
                    `INSERT INTO Uso (hora_sorteo, usuario, codigo, valor) VALUES (?, ?, ?, ?)`,
                    [
                      ahoraISO.slice(11, 16),
                      nombre,
                      `${cantidad} cartones`,
                      costo,
                    ]
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
      }
    );

    socket.on("contarCartonesUsuarioPartida", (id_partida, callback) => {
      const nombre = socket.usuario;
      if (typeof callback !== "function") return;
      if (!nombre) return callback(0);

      db.get(
        `SELECT COUNT(*) as total
         FROM CartonesAsignados
         WHERE usuario = ? AND id_partida = ?`,
        [nombre, id_partida],
        (err, row) => {
          if (err) return callback(0);
          callback(row?.total || 0);
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

    socket.on("unirseAPartidaActual", async (callback) => {
      const partida = await gameManager.obtenerPartidaActual();

      if (!partida) {
        return callback({ partida: null });
      }

      const usuario = socket.usuario;
      if (!usuario) {
        return callback({
          partida,
          bolillas: gameManager.obtenerBolillasEmitidas(),
          cartones: [],
        });
      }

      db.all(
        `SELECT numero_carton, contenido FROM CartonesAsignados WHERE usuario = ? AND id_partida = ?`,
        [usuario, partida.id_partida],
        (err, rows) => {
          const cartones =
            !err && rows.length > 0
              ? rows.map((r) => ({
                  numero: r.numero_carton,
                  contenido: JSON.parse(r.contenido).flat(), // array plano de 27 elementos
                }))
              : [];

          const bolillas = gameManager.obtenerBolillasEmitidas();

          callback({
            partida,
            bolillas,
            cartones,
          });
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

    socket.on("obtenerCartonesDisponibles", (idPartida, callback) => {
      const nombre = socket.usuario;
      db.all(
        "SELECT numero_carton, contenido FROM CartonesAsignados WHERE usuario = ? AND id_partida = ?",
        [nombre, idPartida],
        (err, rows) => {
          if (!err && typeof callback === "function") {
            const disponibles = rows.map((r) => ({
              numero: r.numero_carton,
              contenido: JSON.parse(r.contenido),
            }));
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
