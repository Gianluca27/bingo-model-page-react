import React, { useContext, useEffect, useState } from "react";
import SocketContext from "../../services/SocketContext";
import { useAuth } from "../../context/AuthContext";
import PremioModal from "../PremioModal/PremioModal";
import "./GamePlay.css";

const GamePlay = () => {
  const socket = useContext(SocketContext);
  const { user } = useAuth();

  const [bolillaActual, setBolillaActual] = useState(null);
  const [contador, setContador] = useState(0);
  const [cartones, setCartones] = useState([]);
  const [creditos, setCreditos] = useState(0);
  const [horaSorteo, setHoraSorteo] = useState("");
  const [modalGanador, setModalGanador] = useState(null);

  const reproducirAudio = (bolilla) => {
    const audio = new Audio(`/assets/audio/bolillas/${bolilla}.mp3`);
    audio.play().catch((err) => {
      console.warn(
        "🎵 No se pudo reproducir el audio de bolilla:",
        bolilla,
        err
      );
    });
  };

  const marcarBolilla = (bolilla) => {
    const celdas = document.querySelectorAll(`[data-valor='${bolilla}']`);
    celdas.forEach((celda) => celda.classList.add("marcada"));
  };

  const mostrarModalGanador = (tipo, ganadores, monto) => {
    setModalGanador({
      tipo,
      ganadores,
      monto,
    });
  };

  const cerrarModal = () => setModalGanador(null);

  useEffect(() => {
    const nuevaBolillaHandler = (bolilla) => {
      setBolillaActual(bolilla);
      setContador((prev) => prev + 1);
      marcarBolilla(bolilla);
      reproducirAudio(bolilla);
    };

    const recibirCartonesHandler = (nuevosCartones) => {
      setCartones(nuevosCartones);
    };

    const infoUsuarioHandler = ({ creditos, hora }) => {
      setCreditos(creditos);
      setHoraSorteo(hora);
    };

    const audioEventoHandler = (nombre) => {
      const audio = new Audio(`/assets/audio/eventos/${nombre}.mp3`);
      audio.play().catch((err) => {
        console.warn(
          "🎵 No se pudo reproducir el audio del evento:",
          nombre,
          err
        );
      });
    };

    const ganadoresLineaHandler = (ganadores) => {
      mostrarModalGanador("Línea", ganadores, "Premio Línea");
    };

    const ganadoresBingoHandler = (ganadores) => {
      mostrarModalGanador("Bingo", ganadores, "Premio Bingo");
    };

    const ganadoresAcumuladoHandler = (ganadores) => {
      mostrarModalGanador("Bingo Acumulado", ganadores, "Premio Acumulado");
    };

    socket.emit("obtenerCartonesDisponibles");

    socket.on("nuevaBolilla", nuevaBolillaHandler);
    socket.on("recibirCartones", recibirCartonesHandler);
    socket.on("infoUsuario", infoUsuarioHandler);
    socket.on("audio-evento", audioEventoHandler);
    socket.on("ganadoresLinea", ganadoresLineaHandler);
    socket.on("ganadoresBingo", ganadoresBingoHandler);
    socket.on("ganadoresAcumulado", ganadoresAcumuladoHandler);

    return () => {
      socket.off("nuevaBolilla", nuevaBolillaHandler);
      socket.off("recibirCartones", recibirCartonesHandler);
      socket.off("infoUsuario", infoUsuarioHandler);
      socket.off("audio-evento", audioEventoHandler);
      socket.off("ganadoresLinea", ganadoresLineaHandler);
      socket.off("ganadoresBingo", ganadoresBingoHandler);
      socket.off("ganadoresAcumulado", ganadoresAcumuladoHandler);
    };
  }, [socket]);

  return (
    <div className="gameplay-container">
      <div className="header">
        <h2>¡Bienvenido {user.username}!</h2>
        <p>Créditos: {creditos}</p>
        <p>Hora del sorteo: {horaSorteo}</p>
        <p>Bolas sorteadas: {contador}</p>
      </div>

      {bolillaActual && (
        <div className="bolilla-actual">
          <img
            src={`/assets/images/bolillas/${bolillaActual}.png`}
            alt={`Bolilla ${bolillaActual}`}
          />
        </div>
      )}

      <div className="cartones-container">
        {cartones.map((carton, index) => (
          <div key={index} className="carton">
            {carton.map((numero, i) => (
              <div
                key={i}
                className={`celda ${numero === 0 ? "vacio" : ""}`}
                data-valor={numero}
              >
                {numero !== 0 ? numero : ""}
              </div>
            ))}
          </div>
        ))}
      </div>

      {modalGanador && (
        <PremioModal onClose={cerrarModal}>
          <h2>¡Ganador de {modalGanador.tipo}!</h2>
          <p>Premio: {modalGanador.monto}</p>
          <ul>
            {modalGanador.ganadores.map((g, i) => (
              <li key={i}>
                🎉 {g.usuario} con cartón #{g.numeroCarton}
              </li>
            ))}
          </ul>
        </PremioModal>
      )}
    </div>
  );
};

export default GamePlay;
