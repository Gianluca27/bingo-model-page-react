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
  const [creditos, setCreditos] = useState(user?.creditos || 0);
  const [cartones, setCartones] = useState([]);
  const [bolillaActual, setBolillaActual] = useState(null);
  const [contador, setContador] = useState(0);
  const [modalPremio, setModalPremio] = useState(null);
  const [mensajeGlobal, setMensajeGlobal] = useState("");
  const [horaSorteo, setHoraSorteo] = useState("");
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
    if (!socket || !user?.username) return;
    socket.emit("obtenerCartonesDisponibles");
    socket.emit("solicitarInfoPartida");

    const onRecibirCartones = (cartonesServer) => {
      setCartones(cartonesServer);
      cartonesRef.current = cartonesServer;
      marcadasCartonesRef.current = [];
    };

    const infoUsuarioHandler = ({
      creditos: c,
      hora,
      acumulado: a,
      premioLinea: pl,
      premioBingo: pb,
    }) => {
      setCreditos(c);
      setHoraSorteo(hora);
      setAcumulado(a);
      setPremioLinea(pl);
      setPremioBingo(pb);
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

    socket.on("infoUsuario", infoUsuarioHandler);
    socket.on("recibirCartones", onRecibirCartones);
    socket.on("infoPartida", infoUsuarioHandler);
    socket.on("nuevaBolilla", handleNewBolilla);
    socket.on("ganadorLinea", onGanadorLinea);
    socket.on("ganadorBingo", onGanadorBingo);
    socket.on("ganadorAcumulado", onGanadorAcumulado);
    socket.on("audio-evento", audioEventoHandler);
    socket.on("mensaje-tiempo", mensajeTiempoHandler);

    return () => {
      socket.off("infoUsuario", infoUsuarioHandler);
      socket.off("recibirCartones", onRecibirCartones);
      socket.off("infoPartida", infoUsuarioHandler);
      socket.off("nuevaBolilla", handleNewBolilla);
      socket.off("ganadorLinea", onGanadorLinea);
      socket.off("ganadorBingo", onGanadorBingo);
      socket.off("ganadorAcumulado", onGanadorAcumulado);
      socket.off("audio-evento", audioEventoHandler);
      socket.off("mensaje-tiempo", mensajeTiempoHandler);
    };
  }, [socket, user, soundOn, handleNewBolilla]);

  const handleBack = () => navigate("/welcome");

  return (
    <div className="gameplay-wrapper">
      <img src={bingoLogo} alt="Bingo Logo" className="logo" />
      <div className="gameplay-container">
        <div className="zona-principal">
          <div className="zona-izquierda texto-item">
            <p>
              <strong>SORTEO DE LAS:</strong> {horaSorteo || "–"}
            </p>
            <p>
              <strong>TOPE:</strong> 39
            </p>
            <p>
              <strong>BOLA:</strong> {contador}
            </p>
            <p>
              <strong>ACUMULADO:</strong> ${acumulado.toLocaleString("es-AR")}
            </p>
            <p>
              <strong>LÍNEA:</strong> ${premioLinea.toLocaleString("es-AR")}
            </p>
            <p>
              <strong>BINGO:</strong> ${premioBingo.toLocaleString("es-AR")}
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
        {cartones.map((carton, idxCarton) => (
          <div key={idxCarton} className="carton">
            {carton.map((celda, idxCelda) => (
              <div
                key={idxCelda}
                className={`celda-carton ${
                  marcadasCartonesRef.current.includes(celda) ? "marcada" : ""
                }`}
              >
                {celda !== 0 ? celda : ""}
              </div>
            ))}
          </div>
        ))}
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
