// src/pages/WelcomePage.jsx
import React, { useEffect, useState, useContext } from "react";
import "./WelcomePage.css";
import { useNavigate } from "react-router-dom";
import SocketContext from "../../services/SocketContext";
import { useAuth } from "../../context/AuthContext";
import bingoLogo from "../../assets/images/bingomaniamia-logo.png";

const WelcomePage = () => {
  const socket = useContext(SocketContext);
  const { user, logout } = useAuth();
  const [texto, setTexto] = useState("");
  const [hora, setHora] = useState("");
  const [premios, setPremios] = useState({});
  const [mensajeGlobal, setMensajeGlobal] = useState("");
  const [cantidadCartones, setCantidadCartones] = useState(1);
  const navigate = useNavigate();

  useEffect(() => {
    fetch("http://localhost:3001/admin/config")
      .then(async (res) => {
        if (!res.ok) {
          const error = await res
            .json()
            .catch(() => ({ error: "Error inesperado del servidor" }));
          throw new Error(error.error || "Error al obtener configuración");
        }
        return res.json();
      })
      .then((data) => {
        setPremios({
          valorCarton: data.valorCarton,
          premioLinea: data.premioLinea,
          premioBingo: data.premioBingo,
          premioAcumulado: data.premioAcumulado,
        });
        setHora(data.horaSorteo);
        setTexto(data.texto);
      })
      .catch((err) => {
        console.error("❌ Error al cargar configuración:", err.message);
        setTexto("No hay jugadas programadas por ahora.");
      });
  }, []);

  useEffect(() => {
    const handler = (mensaje) => setMensajeGlobal(mensaje);
    socket.on("mensaje-tiempo", handler);
    return () => socket.off("mensaje-tiempo", handler);
  }, [socket]);

  useEffect(() => {
    const handleConnect = () => {
      if (user?.username) socket.emit("login", user.username);
    };
    socket.on("connect", handleConnect);
    return () => socket.off("connect", handleConnect);
  }, [socket, user]);

  useEffect(() => {
    if (user?.username && socket?.connected) {
      socket.emit("login", user.username);
    }
  }, [user, socket]);

  const handleLogout = async () => {
    await logout();
    navigate("/login");
  };

  return (
    <section className="welcome-page">
      <img src={bingoLogo} alt="Bingo Logo" className="form-logo" />
      <div className="welcome-container">
        <div className="mensaje-global">{mensajeGlobal}</div>
        <div className="info-recuadro">
          <h1>
            Bienvenido{" "}
            <span className="username">
              {user?.username ? `${user.username} ` : ""}
            </span>
            a BINGOManiaMia!
          </h1>
          {user?.creditos !== undefined && (
            <h2>
              CRÉDITOS DISPONIBLES:{" "}
              <span className="values">${user.creditos}</span>
            </h2>
          )}
          <h2>
            FECHA DEL PRÓXIMO SORTEO: <span className="values">{hora}HS</span>
          </h2>
          <h2>
            VALOR DEL CARTÓN:{" "}
            <span className="values">${premios.valorCarton}</span>
          </h2>
          <h2>
            PREMIO DE LÍNEA:{" "}
            <span className="values">${premios.premioLinea}</span>
          </h2>
          <h2>
            PREMIO DE BINGO:{" "}
            <span className="values">${premios.premioBingo}</span>
          </h2>
          <h2>
            PREMIO ACUMULADO:{" "}
            <span className="values">${premios.premioAcumulado}</span>
          </h2>
        </div>
        <h2>{texto}</h2>
        <h3>ELEGÍ LA CANTIDAD DE CARTONES:</h3>
        <select
          id="cantidad-cartones"
          value={cantidadCartones}
          onChange={(e) => setCantidadCartones(parseInt(e.target.value))}
        >
          {Array.from({ length: 12 }, (_, i) => (
            <option key={i + 1} value={i + 1}>
              {i + 1}
            </option>
          ))}
        </select>
        <div className="welco-btn-group">
          <button className="btn">REGLAS</button>
          <button className="btn">CRÉDITOS</button>
          <button className="btn">COBRAR</button>
          <button
            className="btn-play"
            onClick={() => {
              socket.emit("comprarCartones", cantidadCartones, (respuesta) => {
                if (respuesta.ok) {
                  navigate("/gameplay");
                } else {
                  alert("Error al comprar cartones: " + respuesta.error);
                }
              });
            }}
          >
            A JUGAR!
          </button>
          <button className="btn-exit" onClick={handleLogout}>
            SALIR
          </button>
        </div>
      </div>
    </section>
  );
};

export default WelcomePage;
