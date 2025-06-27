import React, {
  useContext,
  useEffect,
  useRef,
  useState,
  useLayoutEffect,
  useCallback,
} from "react";
import SocketContext from "../../services/SocketContext";
import { useAuth } from "../../context/AuthContext";
import { useNavigate } from "react-router-dom";
import "./GamePlay.css";
import bingoLogo from "../../assets/images/bingomaniamia-logo.png";
import defaultImage from "../../assets/images/bolillas/default.png";
import { formatFecha } from "../../utils/formatDate";

function parseFechaComoLocal(fechaStr) {
  const partes = fechaStr.split("T");
  if (!partes || partes.length < 2) return new Date(fechaStr);
  return new Date(`${partes[0]} ${partes[1]}`);
}

const bolillaAudio = {};
function importBolillaAudio() {
  const context = require.context(
    "../../assets/audio/bolillasHo",
    false,
    /\.mp3$/
  );
  context.keys().forEach((key) => {
    const fileName = key.replace("./", "");
    bolillaAudio[fileName] = context(key);
  });
}
importBolillaAudio();

const bolillaImages = {};
function importBolillaImages() {
  const context = require.context(
    "../../assets/images/bolillas",
    false,
    /\.(png|jpe?g)$/
  );
  context.keys().forEach((key) => {
    const fileName = key.replace("./", "");
    bolillaImages[fileName] = context(key);
  });
}
importBolillaImages();

const GamePlay = () => {
  const { user } = useAuth();
  const socket = useContext(SocketContext);
  const navigate = useNavigate();
  const [soundOn, setSoundOn] = useState(true);
  const [cartones, setCartones] = useState([]);
  const [bolillaActual, setBolillaActual] = useState(null);
  const [contador, setContador] = useState(0);
  const [modalPremio, setModalPremio] = useState(null);
  const [mensajeGlobal, setMensajeGlobal] = useState("");
  const [drawnNumbers, setDrawnNumbers] = useState([]);
  const [modoEspectador, setModoEspectador] = useState(false);
  const [partida, setPartida] = useState(null);
  const [fechaSorteo, setFechaSorteo] = useState("");
  const [mensajeInicio, setMensajeInicio] = useState("");
  const [mostrarAviso, setMostrarAviso] = useState(false);
  const [bloqueado, setBloqueado] = useState(false);

  const cartonesRef = useRef([]);
  useEffect(() => {
    cartonesRef.current = cartones;
  }, [cartones]);

  const marcadasCartonesRef = useRef([]);

  const handleNewBolilla = useCallback(
    (num) => {
      const nuevaBolilla = num;
      setBolillaActual(nuevaBolilla);
      setContador((prev) => prev + 1);

      setDrawnNumbers((prev) => {
        const nuevasBolillas = [...prev, nuevaBolilla];

        const ordenados = ordenarCartonesPorLineas(
          cartonesRef.current,
          nuevasBolillas
        );
        setCartones(ordenados);

        const nuevasMarcadas = [];
        cartonesRef.current.forEach((carton) => {
          carton.contenido.forEach((celda) => {
            if (nuevasBolillas.includes(celda)) {
              nuevasMarcadas.push(celda);
            }
          });
        });
        marcadasCartonesRef.current = nuevasMarcadas;

        return nuevasBolillas;
      });

      if (soundOn) {
        const padded = String(nuevaBolilla).padStart(2, "0");
        const audioFileName = `${padded}.mp3`;
        if (bolillaAudio[audioFileName]) {
          const audio = new Audio(bolillaAudio[audioFileName]);
          audio
            .play()
            .catch((err) =>
              console.warn("No se pudo reproducir audio de bolilla:", err)
            );
        }
      }
    },
    [soundOn]
  );

  const ordenarCartonesPorLineas = (cartones, bolillas) => {
    return cartones
      .map((cartonObj) => {
        const filas = [
          cartonObj.contenido.slice(0, 9),
          cartonObj.contenido.slice(9, 18),
          cartonObj.contenido.slice(18, 27),
        ];

        const lineas = filas.map(
          (fila) =>
            fila.filter((n) => n !== null && bolillas.includes(n)).length
        );

        const lineasCompletas = lineas.filter((cant) => cant === 5).length;
        const progresoSiguienteLinea = Math.max(
          ...lineas.filter((cant) => cant < 5),
          0
        );

        return {
          ...cartonObj,
          progresoOrden: {
            lineasCompletas,
            progresoSiguienteLinea,
          },
        };
      })
      .sort((a, b) => {
        if (
          b.progresoOrden.lineasCompletas !== a.progresoOrden.lineasCompletas
        ) {
          return (
            b.progresoOrden.lineasCompletas - a.progresoOrden.lineasCompletas
          );
        }
        return (
          b.progresoOrden.progresoSiguienteLinea -
          a.progresoOrden.progresoSiguienteLinea
        );
      });
  };

  useEffect(() => {
    const handleEstadoActual = ({
      bolillasEmitidas,
      partidaId,
      valorCarton,
      premioLinea,
      premioBingo,
      premioAcumulado,
      fechaSorteo,
    }) => {
      if (Array.isArray(bolillasEmitidas)) {
        setDrawnNumbers(bolillasEmitidas);
        setContador(bolillasEmitidas.length);
        setBolillaActual(bolillasEmitidas.at(-1) ?? null);

        // Restaurar marcas y ordenar cartones si ya hay cargados
        if (cartonesRef.current.length > 0) {
          const ordenados = ordenarCartonesPorLineas(
            cartonesRef.current,
            bolillasEmitidas
          );
          setCartones(ordenados);

          const nuevasMarcadas = [];
          cartonesRef.current.forEach((carton) => {
            carton.contenido.forEach((celda) => {
              if (bolillasEmitidas.includes(celda)) {
                nuevasMarcadas.push(celda);
              }
            });
          });
          marcadasCartonesRef.current = nuevasMarcadas;
        }
      }

      if (
        partidaId &&
        typeof valorCarton === "number" &&
        typeof premioLinea === "number" &&
        typeof premioBingo === "number" &&
        typeof premioAcumulado === "number" &&
        fechaSorteo
      ) {
        setPartida((prev) => ({
          ...prev,
          id_partida: partidaId ?? prev?.id_partida,
          valor_carton:
            typeof valorCarton === "number" ? valorCarton : prev?.valor_carton,
          premio_linea:
            typeof premioLinea === "number" ? premioLinea : prev?.premio_linea,
          premio_bingo:
            typeof premioBingo === "number" ? premioBingo : prev?.premio_bingo,
          premio_acumulado:
            typeof premioAcumulado === "number"
              ? premioAcumulado
              : prev?.premio_acumulado,
          fecha_hora_jugada: fechaSorteo ?? prev?.fecha_hora_jugada,
          estado: "activa",
        }));
      }
    };

    socket.on("estadoActual", handleEstadoActual);
    return () => socket.off("estadoActual", handleEstadoActual);
  }, [socket]);

  useEffect(() => {
    socket.on("nuevaBolilla", handleNewBolilla);
    return () => {
      socket.off("nuevaBolilla", handleNewBolilla);
    };
  }, [handleNewBolilla, socket]);

  useEffect(() => {
    if (!socket || !user?.username) return;

    socket.emit("login", user.username);

    socket.emit("unirseAPartidaActual", (data) => {
      if (!data?.partida) {
        setModoEspectador(true);
        setBloqueado(true);
        return;
      }

      setPartida(data.partida);
      setFechaSorteo(data.partida.fecha_hora_jugada);

      const ahora = new Date();
      const inicio = parseFechaComoLocal(data.partida.fecha_hora_jugada);
      const diferenciaMilisegundos = inicio.getTime() - ahora.getTime();

      const esPartidaActiva = data.partida.estado === "activa";
      const faltanMenosDe5Min =
        diferenciaMilisegundos > 0 && diferenciaMilisegundos <= 5 * 60 * 1000;
      if (!esPartidaActiva && !faltanMenosDe5Min) {
        setBloqueado(true);
        return;
      }

      if (Array.isArray(data.bolillas)) {
        setDrawnNumbers(data.bolillas);
        setContador(data.bolillas.length);
        setBolillaActual(data.bolillas.at(-1) ?? null);
      }

      const cartonesValidos = (data.cartones || []).filter(
        (c) => Array.isArray(c?.contenido) && c.contenido.length === 27
      );

      // 🟢 Mostrar cartones si la partida está activa o faltan 5 minutos o menos
      if (esPartidaActiva || faltanMenosDe5Min) {
        cargarCartones({ ...data, cartones: cartonesValidos });
      } else {
        setDrawnNumbers([]);
        setContador(0);
        setBolillaActual(null);
        setCartones([]);
        marcadasCartonesRef.current = [];
        setModoEspectador(true);
      }
    });

    socket.emit("solicitarInfoPartida", (nuevaPartida) => {
      if (!nuevaPartida) return;
      setPartida((prev) => ({
        id_partida: nuevaPartida.id_partida ?? prev?.id_partida,
        fecha_hora_jugada:
          nuevaPartida.fecha_hora_jugada ?? prev?.fecha_hora_jugada,
        valor_carton:
          typeof nuevaPartida.valor_carton === "number"
            ? nuevaPartida.valor_carton
            : prev?.valor_carton,
        premio_linea:
          typeof nuevaPartida.premio_linea === "number"
            ? nuevaPartida.premio_linea
            : prev?.premio_linea,
        premio_bingo:
          typeof nuevaPartida.premio_bingo === "number"
            ? nuevaPartida.premio_bingo
            : prev?.premio_bingo,
        premio_acumulado:
          typeof nuevaPartida.premio_acumulado === "number"
            ? nuevaPartida.premio_acumulado
            : prev?.premio_acumulado,
        estado: nuevaPartida.estado ?? prev?.estado ?? "activa",
      }));
    });
  }, [socket, user?.username]);

  useEffect(() => {
    if (!partida?.fecha_hora_jugada) return;

    const inicio = new Date(partida.fecha_hora_jugada).getTime();
    const ahora = new Date().getTime();

    if (ahora >= inicio) {
      setMostrarAviso(false);
      setMensajeInicio("");
      return;
    }

    // 🧹 Limpiar estado anterior al entrar a una nueva partida
    setDrawnNumbers([]);
    setBolillaActual(null);
    setContador(0);
    setCartones([]);
    cartonesRef.current = [];
    marcadasCartonesRef.current = [];

    setMostrarAviso(true);

    const interval = setInterval(() => {
      const ahoraActualizado = new Date().getTime();
      const diff = inicio - ahoraActualizado;

      if (diff > 0) {
        const minutos = Math.floor(diff / 60000);
        const segundos = Math.floor((diff % 60000) / 1000);
        setMensajeInicio(
          `COMIENZA EN ${minutos}:${segundos.toString().padStart(2, "0")}`
        );
      } else {
        setMensajeInicio("YA COMIENZA ¡BUENA SUERTE!");
        clearInterval(interval);

        setTimeout(() => {
          setMostrarAviso(false);
          setMensajeInicio("");
        }, 8000);
      }
    }, 0);

    return () => clearInterval(interval);
  }, [partida?.fecha_hora_jugada]);

  const cargarCartones = (data) => {
    const cartonesValidos = (data.cartones || []).filter(
      (c) => Array.isArray(c?.contenido) && c.contenido.length === 27
    );

    cartonesRef.current = cartonesValidos;
    setModoEspectador(cartonesValidos.length === 0);

    const bolillas = Array.isArray(data.bolillas) ? data.bolillas : [];
    setDrawnNumbers(bolillas);
    setContador(bolillas.length);
    setBolillaActual(bolillas.at(-1) ?? null);

    const ordenados = ordenarCartonesPorLineas(cartonesValidos, bolillas);
    setCartones(ordenados);

    const marcadas = [];
    cartonesValidos.forEach((carton) => {
      carton.contenido.forEach((celda) => {
        if (bolillas.includes(celda)) {
          marcadas.push(celda);
        }
      });
    });
    marcadasCartonesRef.current = marcadas;
  };

  useEffect(() => {
    if (!socket) return;

    const handleInfoPartida = ({
      fecha,
      acumulado: a,
      premioLinea: pl,
      premioBingo: pb,
    }) => {
      setFechaSorteo(fecha);
      setAcumulado(a ?? 0);
      setPremioLinea(pl ?? 0);
      setPremioBingo(pb ?? 0);
    };

    const mostrarModalGanador = (tipo, jugador, monto) => {
      setModalPremio({ tipo, ganadores: [jugador], monto });
    };

    const onGanadorLinea = ({ jugador, monto }) => {
      mostrarModalGanador("Línea", jugador, monto);
      if (soundOn) audioEventoHandler("ganador-linea");
    };

    const onGanadorBingo = ({ jugador, monto }) => {
      mostrarModalGanador("Bingo", jugador, monto);
      if (soundOn) audioEventoHandler("ganador-bingo");
    };

    const onGanadorAcumulado = ({ jugador, monto }) => {
      mostrarModalGanador("Acumulado", jugador, monto);
      if (soundOn) audioEventoHandler("ganador-acumulado");
    };

    const audioEventoHandler = (nombreArchivo) => {
      if (!soundOn) return;
      const audio = new Audio(`/assets/audio/eventos/${nombreArchivo}.mp3`);
      audio
        .play()
        .catch((err) =>
          console.warn("No se pudo reproducir el audio del evento:", err)
        );
    };

    const mensajeTiempoHandler = (texto) => {
      setMensajeGlobal(texto);
    };

    socket.on("infoPartida", handleInfoPartida);
    socket.on("ganadorLinea", onGanadorLinea);
    socket.on("ganadorBingo", onGanadorBingo);
    socket.on("ganadorAcumulado", onGanadorAcumulado);
    socket.on("audio-evento", audioEventoHandler);
    socket.on("mensaje-tiempo", mensajeTiempoHandler);

    return () => {
      socket.off("infoPartida", handleInfoPartida);
      socket.off("ganadorLinea", onGanadorLinea);
      socket.off("ganadorBingo", onGanadorBingo);
      socket.off("ganadorAcumulado", onGanadorAcumulado);
      socket.off("audio-evento", audioEventoHandler);
      socket.off("mensaje-tiempo", mensajeTiempoHandler);
    };
  }, [socket, soundOn]);

  const handleBack = () => navigate("/welcome");

  return (
    <div className="gameplay-wrapper">
      <img src={bingoLogo} alt="Bingo Logo" className="logo" />
      <div className="gameplay-container">
        <div className="zona-principal">
          <div className="zona-izquierda texto-item">
            <p>
              <strong>SORTEO DEL:</strong>{" "}
              {formatFecha(partida?.fecha_hora_jugada) || "–"}
              HS
            </p>
            <p>
              <strong>BOLA TOPE:</strong> 39
            </p>
            <p>
              <strong>BOLILLAS SORTEADAS:</strong> {contador}
            </p>
            <p className="prize">
              <strong>LÍNEA:</strong> $
              {partida?.premio_linea?.toLocaleString("es-AR") || 0}
            </p>
            <p className="prize">
              <strong>BINGO:</strong> $
              {partida?.premio_bingo?.toLocaleString("es-AR") || 0}
            </p>
            <p className="prize">
              <strong>ACUMULADO:</strong> $
              {partida?.premio_acumulado?.toLocaleString("es-AR") || 0}
            </p>
          </div>
          <div className="zona-centro">
            <div className="bolilla-container">
              {bolillaActual ? (
                (() => {
                  const padded = String(bolillaActual).padStart(2, "0");
                  const srcImg = bolillaImages[`${padded}.png`] || defaultImage;
                  return (
                    <img
                      src={srcImg}
                      alt={`Bolilla ${bolillaActual}`}
                      className="bolilla-imagen"
                    />
                  );
                })()
              ) : (
                <img
                  src={defaultImage}
                  alt="Bolilla por defecto"
                  className="bolilla-imagen"
                />
              )}
            </div>
          </div>
          <div className="zona-derecha texto-item">
            <div className="bolilla-grid-wrapper">
              <div className="bolilla-grid">
                {Array.from({ length: 90 }, (_, i) => i + 1).map((num) => (
                  <div
                    key={num}
                    className={`celda-bolilla ${
                      drawnNumbers.includes(num) ? "marcada" : ""
                    }`}
                  >
                    {num}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
      {mostrarAviso && <h2 className="aviso">{mensajeInicio}</h2>}
      {modalPremio && (
        <div className="modal-premio">
          <div className="modal-contenido">
            <h2>¡{modalPremio.tipo}!</h2>
            <p>
              <strong>Ganador:</strong> {modalPremio.ganadores.join(", ")}
            </p>
            <p>
              <strong>Premio:</strong> $
              {modalPremio.monto.toLocaleString("es-AR")}
            </p>
            <button onClick={() => setModalPremio(null)}>Cerrar</button>
          </div>
        </div>
      )}
      {!modoEspectador && cartones.length > 0 && (
        <h3 className="titulo-cartones">Tus cartones:</h3>
      )}
      <div className="zona-cartones">
        {modoEspectador && (
          <div className="modo-espectador">
            🔍 Estás viendo la partida como espectador. No recibirás premios.
          </div>
        )}
        {cartones
          .filter(
            (c) => Array.isArray(c?.contenido) && c.contenido.length === 27
          )
          .map((carton, idx) => {
            const marcadas = carton.contenido.filter((n) =>
              drawnNumbers.includes(n)
            ).length;

            const filas = [
              carton.contenido.slice(0, 9),
              carton.contenido.slice(9, 18),
              carton.contenido.slice(18, 27),
            ];

            const lineaCompleta = filas.map(
              (fila) =>
                fila.filter((n) => n !== 0 && drawnNumbers.includes(n)).length
            );
            const mejorLinea = Math.max(...lineaCompleta);

            return { carton, marcadas, mejorLinea, index: idx };
          })
          .map(({ carton, index }) => {
            const filas = [
              carton.contenido.slice(0, 9),
              carton.contenido.slice(9, 18),
              carton.contenido.slice(18, 27),
            ];

            return (
              <div key={index} className="carton">
                <div className="numero-carton">Cartón N°{carton.numero}</div>
                {filas.map((fila, idxFila) =>
                  fila.map((celda, idxCelda) => (
                    <div
                      key={`${idxFila}-${idxCelda}`}
                      className={`celda-carton ${
                        marcadasCartonesRef.current.includes(celda)
                          ? "marcada"
                          : ""
                      }`}
                    >
                      {celda !== 0 ? celda : ""}
                    </div>
                  ))
                )}
              </div>
            );
          })}
      </div>

      <div className="btn-group">
        <button onClick={() => setSoundOn((prev) => !prev)}>
          SONIDO: {soundOn ? "SI" : "NO"}
        </button>
        <button onClick={handleBack}>VOLVER</button>
      </div>
      {bloqueado && (
        <div className="modal-overlay">
          <div className="modal-content">
            <p>
              No podés ingresar todavía. Volvé cuando falten 5 minutos o menos
              para que inicie la partida.
            </p>
            <button onClick={() => navigate("/welcome")}>Aceptar</button>
          </div>
        </div>
      )}
    </div>
  );
};

export default GamePlay;
