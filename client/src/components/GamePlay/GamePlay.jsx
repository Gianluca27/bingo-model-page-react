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
  const [tiempoHastaInicio, setTiempoHastaInicio] = useState(null);

  const cartonesRef = useRef([]);
  const marcadasCartonesRef = useRef([]);

  const handleNewBolilla = useCallback(
    (num) => {
      setBolillaActual(num);
      setContador((prev) => prev + 1);
      setDrawnNumbers((prev) => [...prev, num]);
      cartonesRef.current.forEach((carton) => {
        if (Array.isArray(carton)) {
          carton.forEach((fila) => {
            if (Array.isArray(fila)) {
              fila.forEach((celda) => {
                if (celda === num) {
                  marcadasCartonesRef.current.push(celda);
                }
              });
            } else if (fila === num) {
              marcadasCartonesRef.current.push(fila);
            }
          });
        }
      });
      if (soundOn) {
        const padded = String(num).padStart(2, "0");
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
      }

      if (
        partidaId &&
        typeof valorCarton === "number" &&
        typeof premioLinea === "number" &&
        typeof premioBingo === "number" &&
        typeof premioAcumulado === "number" &&
        fechaSorteo
      ) {
        const nuevaPartida = {
          id_partida: partidaId,
          valor_carton: valorCarton,
          premio_linea: premioLinea,
          premio_bingo: premioBingo,
          premio_acumulado: premioAcumulado,
          fecha_hora_jugada: fechaSorteo,
          estado: "activa",
        };
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
    socket.on("finSorteo", () => setDrawnNumbers([]));
    return () => {
      socket.off("nuevaBolilla", handleNewBolilla);
      socket.off("finSorteo");
    };
  }, [handleNewBolilla, socket]);

  useEffect(() => {
    if (!socket || !user?.username) return;

    socket.emit("login", user.username);

    socket.emit("unirseAPartidaActual", (data) => {
      if (!data?.partida) {
        setModoEspectador(true);
        return;
      }

      const inicio = new Date(data.partida.fecha_hora_jugada).getTime();
      const ahora = new Date().getTime();
      const diferenciaMs = inicio - ahora;

      if (diferenciaMs > 5 * 60 * 1000) {
        alert("Solo podés ingresar a la partida 5 minutos antes del inicio.");
        navigate("/welcome", { replace: true });
        return;
      }

      setPartida(data.partida);

      const planos = (data.cartones || []).map((c) =>
        Array.isArray(c) ? c.flat() : c
      );

      setCartones(planos);
      cartonesRef.current = planos;
      marcadasCartonesRef.current = [];
      setModoEspectador(planos.length === 0);

      if (Array.isArray(data.bolillas)) {
        setDrawnNumbers(data.bolillas);
        setContador(data.bolillas.length);
        setBolillaActual(data.bolillas.at(-1) ?? null);

        const marcadas = [];
        planos.forEach((carton) => {
          carton.forEach((celda) => {
            if (data.bolillas.includes(celda)) {
              marcadas.push(celda);
            }
          });
        });
        marcadasCartonesRef.current = marcadas;
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
        }, 11000);
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [partida?.fecha_hora_jugada]);

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
              Hs
            </p>
            <p>
              <strong>BOLA TOPE:</strong> 39
            </p>
            <p>
              <strong>BOLILLAS SORTEADAS:</strong> {contador}
            </p>
            <p className="prize">
              <strong>ACUMULADO:</strong> $
              {partida?.premio_acumulado?.toLocaleString("es-AR") || 0}
            </p>
            <p className="prize">
              <strong>LÍNEA:</strong> $
              {partida?.premio_linea?.toLocaleString("es-AR") || 0}
            </p>
            <p className="prize">
              <strong>BINGO:</strong> $
              {partida?.premio_bingo?.toLocaleString("es-AR") || 0}
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
      </div>
      {mostrarAviso && <h2 className="aviso">{mensajeInicio}</h2>}
      <div
        className="zona-cartones"
        style={{ maxHeight: "400px", overflowY: "auto" }}
      >
        {modoEspectador && (
          <div className="modo-espectador">
            🔍 Estás viendo la partida como espectador. No recibirás premios.
          </div>
        )}
        {!modoEspectador && cartones.length > 0 && <h3>Tus cartones:</h3>}
        {cartones.map((carton, idxCarton) => {
          if (!Array.isArray(carton) || carton.length !== 27) return null;

          const filas = [
            carton.slice(0, 9),
            carton.slice(9, 18),
            carton.slice(18, 27),
          ];

          return (
            <div key={idxCarton} className="carton">
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
    </div>
  );
};

export default GamePlay;
