// src/pages/WelcomePage.jsx
import React, { useEffect, useState, useContext } from "react";
import "./WelcomePage.css";
import { useNavigate } from "react-router-dom";
import SocketContext from "../../services/SocketContext";
import { useAuth } from "../../context/AuthContext";
import bingoLogo from "../../assets/images/bingomaniamia-logo.png";
import { formatFecha } from "../../utils/formatDate";

const WelcomePage = () => {
  const socket = useContext(SocketContext);
  const { user, logout } = useAuth();
  const [texto, setTexto] = useState("");
  const [fecha, setFecha] = useState("");
  const [premios, setPremios] = useState({});
  const [mensajeGlobal, setMensajeGlobal] = useState("");
  const [cantidadCartones, setCantidadCartones] = useState(1);
  const [cartones, setCartones] = useState(0);
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    navigate("/login");
  };

  useEffect(() => {
    fetch("http://localhost:3001/api/partida-proxima")
      .then((res) => res.json())
      .then((data) => {
        if (!data) {
          setTexto("No hay jugadas programadas por ahora.");
          return;
        }

        setPremios({
          valorCarton: data.valorCarton,
          premioLinea: data.premioLinea,
          premioBingo: data.premioBingo,
          premioAcumulado: data.premioAcumulado,
        });
        setFecha(data.fechaSorteo);
      })
      .catch((err) => {
        console.error("❌ Error al cargar próxima partida:", err.message);
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

  useEffect(() => {
    const handleDatosUsuario = ({ creditos, cartones }) => {
      user.creditos = creditos;
      setCartones(cartones);
    };
    socket.on("datosUsuario", handleDatosUsuario);
    return () => socket.off("datosUsuario", handleDatosUsuario);
  }, [socket, user]);

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
          <h2>
            FECHA DEL PRÓXIMO SORTEO:{" "}
            <span className="values">{formatFecha(fecha)}HS</span>
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
        <div className="user-info">
          {user?.creditos !== undefined && (
            <h2>
              CRÉDITOS DISPONIBLES:{" "}
              <span className="values">${user.creditos}</span>
            </h2>
          )}
          {cartones !== undefined && (
            <h2>
              CARTONES DISPONIBLES:{" "}
              <span className="values">{cartones} / 12</span>
            </h2>
          )}
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
        </div>
        <h2>{texto}</h2>
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
