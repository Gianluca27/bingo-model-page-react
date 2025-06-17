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
  const [fechaSorteo, setFechaSorteo] = useState("");
  const [acumulado, setAcumulado] = useState(0);
  const [premioLinea, setPremioLinea] = useState(0);
  const [premioBingo, setPremioBingo] = useState(0);
  const [drawnNumbers, setDrawnNumbers] = useState([]);

  const cartonesRef = useRef([]);
  const marcadasCartonesRef = useRef([]);

  useLayoutEffect(() => {
    window.scrollTo(0, 0);
  }, []);

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
    const bolillasGuardadas = JSON.parse(
      localStorage.getItem("bolillasEmitidas")
    );
    if (Array.isArray(bolillasGuardadas)) {
      setBolillas(bolillasGuardadas);
    }

    socket.on("estadoActual", ({ bolillasEmitidas }) => {
      setBolillas(bolillasEmitidas);
      localStorage.setItem(
        "bolillasEmitidas",
        JSON.stringify(bolillasEmitidas)
      );
    });

    socket.on("nuevaBolilla", (bolilla) => {
      setBolillas((prev) => {
        const actualizadas = [...prev, bolilla];
        localStorage.setItem("bolillasEmitidas", JSON.stringify(actualizadas));
        return actualizadas;
      });
    });

    socket.on("finSorteo", () => {
      setBolillas([]);
      localStorage.removeItem("bolillasEmitidas");
    });

    return () => {
      socket.off("estadoActual");
      socket.off("nuevaBolilla");
      socket.off("finSorteo");
    };
  }, []);

  useEffect(() => {
    if (!socket || !user?.username) return;

    // Restaurar cartones desde localStorage si existen
    const guardados = localStorage.getItem("cartonesUsuario");
    if (guardados) {
      try {
        const parsed = JSON.parse(guardados);
        if (Array.isArray(parsed)) {
          setCartones(parsed);
          cartonesRef.current = parsed;
          marcadasCartonesRef.current = [];
        }
      } catch (e) {
        console.warn("⚠️ Error al parsear cartones guardados:", e);
      }
    }

    // Solicitar cartones actualizados al servidor
    socket.emit("obtenerCartonesAsignados");
    socket.emit("solicitarInfoPartida");

    const onRecibirCartones = (cartonesServer) => {
      console.log("📦 Cartones del servidor:", cartonesServer);
      setCartones(cartonesServer);
      cartonesRef.current = cartonesServer;
      marcadasCartonesRef.current = [];
      localStorage.setItem("cartonesUsuario", JSON.stringify(cartonesServer));
    };

    socket.on("recibirCartones", onRecibirCartones);

    return () => {
      socket.off("recibirCartones", onRecibirCartones);
    };
  }, [socket, user?.username]);

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
              <strong>SORTEO DE LAS:</strong> {fechaSorteo || "–"}
            </p>
            <p>
              <strong>TOPE:</strong> 39
            </p>
            <p>
              <strong>BOLA:</strong> {contador}
            </p>
            <p>
              <strong>ACUMULADO:</strong>{" "}
              {typeof acumulado === "number"
                ? acumulado.toLocaleString("es-AR")
                : "-"}
            </p>
            <p>
              <strong>LÍNEA:</strong>{" "}
              {typeof acumulado === "number"
                ? premioLinea.toLocaleString("es-AR")
                : "-"}
            </p>
            <p>
              <strong>BINGO:</strong>{" "}
              {typeof acumulado === "number"
                ? premioBingo.toLocaleString("es-AR")
                : "-"}
            </p>
          </div>
          <div className="zona-centro">
            <div className="bolilla-container">
              {bolillaActual ? (
                (() => {
                  const padded = String(bolillaActual).padStart(2, "0");
                  let srcImg = defaultImage;
                  if (bolillaImages[`${padded}.png`]) {
                    srcImg = bolillaImages[`${padded}.png`];
                  } else if (bolillaImages[`${padded}.jpg`]) {
                    srcImg = bolillaImages[`${padded}.jpg`];
                  }
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
            <div className="mensaje-global">{mensajeGlobal}</div>
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
      <h2 className="aviso">YA COMIENZA</h2>
      <div className="zona-cartones">
        {cartones.map((carton, idxCarton) => {
          let plano = [];

          if (Array.isArray(carton)) {
            plano = carton;
          } else if (typeof carton === "string") {
            try {
              const parsed = JSON.parse(carton);
              if (Array.isArray(parsed)) plano = parsed;
            } catch (err) {
              console.warn("⚠️ Cartón inválido:", carton);
            }
          } else {
            console.warn("⚠️ Cartón no procesable:", carton);
          }

          if (plano.length !== 27) {
            console.warn("⚠️ Cartón con longitud incorrecta:", plano);
            return null;
          }

          const filas = Array.from({ length: 3 }, (_, i) =>
            plano.slice(i * 9, (i + 1) * 9)
          );

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
