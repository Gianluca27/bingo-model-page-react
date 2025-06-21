// src/components/CartonPurchaseModal.jsx
import React, { useEffect, useState, useContext } from "react";
import "./CartonPurchaseModal.css";
import axios from "axios";
import SocketContext from "../../services/SocketContext";

const CartonPurchaseModal = ({ onClose, onConfirm, user }) => {
  const socket = useContext(SocketContext);
  const [partidas, setPartidas] = useState([]);
  const [partidaSeleccionada, setPartidaSeleccionada] = useState(null);
  const [cantidad, setCantidad] = useState(1);
  const [mensaje, setMensaje] = useState("");
  const [cartones, setCartones] = useState(0);

  const formatearMiles = (numero) => {
    return new Intl.NumberFormat("es-AR").format(numero);
  };

  const handleModal = () => {};

  useEffect(() => {
    axios.get("http://localhost:3001/api/partidas").then((res) => {
      const futuras = res.data
        .filter((p) => p.estado === "pendiente")
        .sort(
          (a, b) =>
            new Date(a.fecha_hora_jugada) - new Date(b.fecha_hora_jugada)
        );
      setPartidas(futuras);
    });
  }, []);

  useEffect(() => {
    const handleDatosUsuario = ({ creditos, cartones }) => {
      user.creditos = creditos;
      setCartones(cartones);
    };
    socket.on("datosUsuario", handleDatosUsuario);
    return () => socket.off("datosUsuario", handleDatosUsuario);
  }, [socket, user]);

  useEffect(() => {
    if (!partidaSeleccionada) return;

    socket.emit(
      "contarCartonesUsuarioPartida",
      partidaSeleccionada.id_partida,
      (cantidad) => {
        setCartones(cantidad || 0);
      }
    );
  }, [partidaSeleccionada]);

  const handleCompra = () => {
    if (!partidaSeleccionada) {
      setMensaje("Seleccioná una partida.");
      return;
    }

    const ahora = new Date();
    const inicio = new Date(partidaSeleccionada.fecha_hora_jugada);
    const diferenciaMs = inicio - ahora;

    if (diferenciaMs <= 0) {
      setMensaje("Esa partida ya empezó.");
      return;
    }

    if (diferenciaMs <= 5000) {
      setMensaje("Faltan menos de 5 segundos. No se puede comprar.");
      return;
    }

    onConfirm(partidaSeleccionada, cantidad);
    onClose();
  };

  return (
    <div className="modal-carton-overlay">
      <div className="modal-carton-content">
        <h2>Comprar cartones para una partida futura</h2>
        <select
          onChange={(e) =>
            setPartidaSeleccionada(
              partidas.find((p) => p.id_partida === parseInt(e.target.value))
            )
          }
        >
          <option value="">Elegí una partida</option>
          {partidas.map((p) => (
            <option key={p.id_partida} value={p.id_partida}>
              {new Date(p.fecha_hora_jugada).toLocaleString()} HS
            </option>
          ))}
        </select>

        <div className="input-group">
          <label>Cantidad:</label>
          <select
            id="cantidad-cartones"
            value={cantidad}
            onChange={(e) => setCantidad(parseInt(e.target.value))}
          >
            {Array.from({ length: 12 }, (_, i) => (
              <option key={i + 1} value={i + 1}>
                {i + 1}
              </option>
            ))}
          </select>
        </div>

        {cartones !== undefined && (
          <p>
            CARTONES DISPONIBLES PARA LA PARTIDA SELECCIONADA:{" "}
            <span className="values">{cartones} / 12</span>
          </p>
        )}

        {user?.creditos !== undefined && (
          <p>
            CRÉDITOS DISPONIBLES:{" "}
            <span className="values">${formatearMiles(user.creditos)}</span>
          </p>
        )}

        {mensaje && <p className="error">{mensaje}</p>}

        <div className="btn-group">
          <button className="btn-confirm" onClick={handleCompra}>
            COMPRAR
          </button>
          <button className="btn-cancel" onClick={onClose}>
            CANCELAR
          </button>
        </div>
      </div>
    </div>
  );
};

export default CartonPurchaseModal;
