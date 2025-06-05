// src/components/ConfigPage/ConfigPage.jsx
import React, { useEffect, useState } from "react";
import SocketContext from "../../services/SocketContext";
import { useContext } from "react";
import "./ConfigPage.css";

const ConfigPage = () => {
  const [texto, setTexto] = useState("");
  const [successMsg, setSuccessMsg] = useState("");
  const socket = useContext(SocketContext);

  useEffect(() => {
    socket.emit("obtenerTextoJugadores");
    socket.on("textoJugadores", (data) => setTexto(data));
    return () => socket.off("textoJugadores");
  }, []);

  const handleSave = () => {
    if (!texto.trim()) return alert("El texto no puede estar vacío.");
    socket.emit("guardarTextoJugadores", texto);
    socket.on("resultadoGuardarTexto", (res) => {
      if (res.exito) {
        setSuccessMsg("Texto guardado correctamente.");
        setTimeout(() => setSuccessMsg(""), 3000);
      }
    });
  };

  return (
    <div className="config-container">
      <h2>Configuración del Juego</h2>
      <label>
        Texto para los jugadores:
        <input
          type="text"
          value={texto}
          maxLength={60}
          onChange={(e) => setTexto(e.target.value)}
        />
      </label>
      <button onClick={handleSave} className="btn-success">
        Guardar Configuración
      </button>
      {successMsg && <p className="success-message">{successMsg}</p>}
    </div>
  );
};

export default ConfigPage;
