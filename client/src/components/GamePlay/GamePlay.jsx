import React, { useContext, useEffect, useRef, useState } from "react";
import SocketContext from "../../services/SocketContext";
import { useAuth } from "../../context/AuthContext";
import "./GamePlay.css";
import { useNavigate } from "react-router-dom";
import bingoLogo from "../../assets/images/bingomaniamia-logo.png";
import defaultImage from "../../assets/images/bolillas/default.png";

const GamePlay = () => {
  const { user } = useAuth();
  const socket = useContext(SocketContext);
  const navigate = useNavigate();
  const [creditos, setCreditos] = useState(user?.creditos || 0);
  const [cartones, setCartones] = useState([]);
  const [bolillaActual, setBolillaActual] = useState(null);
  const [contador, setContador] = useState(0);
  const [modalPremio, setModalPremio] = useState(null);
  const [mensajeGlobal, setMensajeGlobal] = useState("");
  const [horaSorteo, setHoraSorteo] = useState("");
  const bolillasMarcadasRef = useRef([]);
  const [soundOn, setSoundOn] = useState(true);
  const toggleSound = () => setSoundOn((prev) => !prev);

  const handleBack = () => {
    navigate("/welcome");
  };

  useEffect(() => {
    if (!socket || !user?.username) return;

    socket.emit("obtenerCartonesDisponibles");

    const onRecibirCartones = (cartones) => {
      setCartones(cartones);
    };

    const infoUsuarioHandler = ({ creditos, hora }) => {
      setCreditos(creditos);
      setHoraSorteo(hora);
    };

    const onNuevaBolilla = (bolilla) => {
      setBolillaActual(bolilla);
      setContador((prev) => prev + 1);
      marcarBolilla(bolilla);
    };

    const marcarBolilla = (bolilla) => {
      bolillasMarcadasRef.current.push(bolilla);
      // ⚠️ SUGERENCIA: Mejor manejar esto con estado en cada cartón y recalcular, en vez de usar DOM manual
      const celdas = document.querySelectorAll(".celda-carton");
      celdas.forEach((celda) => {
        if (parseInt(celda.textContent) === bolilla) {
          celda.classList.add("marcada");
        }
      });
    };

    const mostrarModalGanador = (tipo, ganadores, monto) => {
      setModalPremio({ tipo, ganadores, monto });
    };

    const onGanadorLinea = ({ jugador, monto }) => {
      mostrarModalGanador("Línea", [jugador], monto);
    };

    const onGanadorBingo = ({ jugador, monto }) => {
      mostrarModalGanador("Bingo", [jugador], monto);
    };

    const onGanadorAcumulado = ({ jugador, monto }) => {
      mostrarModalGanador("Acumulado", [jugador], monto);
    };

    const audioEventoHandler = (nombre) => {
      if (soundOn) {
        const audio = new Audio(`/assets/audio/eventos/${nombre}.mp3`);
        audio.play().catch((err) => {
          console.warn(
            "🎵 No se pudo reproducir el audio del evento:",
            nombre,
            err
          );
        });
      }
    };

    socket.on("infoUsuario", infoUsuarioHandler);
    socket.on("recibirCartones", onRecibirCartones);
    socket.on("nuevaBolilla", onNuevaBolilla);
    socket.on("ganadorLinea", onGanadorLinea);
    socket.on("ganadorBingo", onGanadorBingo);
    socket.on("ganadorAcumulado", onGanadorAcumulado);
    socket.on("audio-evento", audioEventoHandler);
    socket.on("mensaje-tiempo", setMensajeGlobal);

    return () => {
      socket.off("infoUsuario", infoUsuarioHandler);
      socket.off("recibirCartones", onRecibirCartones);
      socket.off("nuevaBolilla", onNuevaBolilla);
      socket.off("ganadorLinea", onGanadorLinea);
      socket.off("ganadorBingo", onGanadorBingo);
      socket.off("ganadorAcumulado", onGanadorAcumulado);
      socket.off("audio-evento", audioEventoHandler);
      socket.off("mensaje-tiempo", setMensajeGlobal);
    };
  }, [socket, user, soundOn]);

  return (
    <div className="gameplay-wrapper">
      <img src={bingoLogo} alt="Bingo Logo" className="logo" />
      <div className="gameplay-container">
        <div className="zona-principal">
          <div className="zona-izquierda texto-item">
            <p>
              <strong>Tope de bolas:</strong> 39
            </p>
            <p>
              <strong>Bolas sorteadas:</strong> {contador}
            </p>
            <p>
              <strong>Acumulado:</strong> ----
            </p>
            <p>
              <strong>Línea:</strong> ----
            </p>
            <p>
              <strong>Bingo:</strong> ----
            </p>
          </div>
          <div className="zona-centro">
            <div className="bolilla-container">
              <img
                src={
                  bolillaActual
                    ? `../../assets/images/bolillas/${String(
                        bolillaActual
                      ).padStart(2, "0")}.jpg`
                    : defaultImage
                }
                alt={`Bolilla ${bolillaActual}`}
                className="bolilla-imagen"
              />
            </div>
            <div className="mensaje-global">{mensajeGlobal}</div>
          </div>

          <div className="zona-derecha texto-item">
            <p>
              <strong>USTED TIENE CRÉDITOS:</strong> {creditos}
            </p>
            <p>
              <strong>SORTEO DE LAS:</strong> {horaSorteo}
            </p>
            <p>
              <strong>JUEGA CON CARTONES ANTERIORES</strong>
            </p>
            <div className="btn-group">
              <button onClick={toggleSound}>
                SONIDO: {soundOn ? "SI" : "NO"}
              </button>
              <button onClick={handleBack}>VOLVER</button>
            </div>
          </div>
        </div>
        <h2 className="aviso">YA COMIENZA</h2>

        {modalPremio && (
          <div className="modal-premio">
            <div className="modal-contenido">
              <h2>¡{modalPremio.tipo}!</h2>
              <p>Ganadores: {modalPremio.ganadores.join(", ")}</p>
              <p>Premio: ${modalPremio.monto}</p>
              <button onClick={() => setModalPremio(null)}>Cerrar</button>
            </div>
          </div>
        )}
      </div>

      <div className="zona-cartones">
        {cartones.map((carton, idx) => (
          <div key={idx} className="carton">
            {carton.map((celda, i) => (
              <div
                key={i}
                className={`celda-carton ${
                  bolillasMarcadasRef.current.includes(celda) ? "marcada" : ""
                }`}
              >
                {celda !== 0 ? celda : ""}
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
};

export default GamePlay;
