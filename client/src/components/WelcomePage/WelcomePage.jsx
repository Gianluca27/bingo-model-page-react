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

  const formatearMiles = (numero) => {
    return new Intl.NumberFormat("es-AR").format(numero);
  };

  const cargarDatosPartida = (data, estaActiva) => {
    setPremios({
      valorCarton: data.valorCarton ?? data.valor_carton,
      premioLinea: data.premioLinea ?? data.premio_linea,
      premioBingo: data.premioBingo ?? data.premio_bingo,
      premioAcumulado: data.premioAcumulado ?? data.premio_acumulado,
    });

    setFecha(data.fechaSorteo ?? data.fecha_hora_jugada);
    setTexto(estaActiva ? "🎯 ¡La partida está en juego!" : "");
  };

  useEffect(() => {
    if (!socket) return;

    const handlerEstadoActual = (data) => {
      cargarDatosPartida(data, true);
    };

    const handlerProximaPartida = (data) => {
      cargarDatosPartida(data, false);
    };

    const handlerFinSorteo = (data) => {
      cargarDatosPartida(data, false);
    };

    socket.on("estadoActual", handlerEstadoActual);
    socket.on("proximaPartida", handlerProximaPartida);
    socket.on("finSorteo", handlerFinSorteo);

    return () => {
      socket.off("estadoActual", handlerEstadoActual);
      socket.off("proximaPartida", handlerProximaPartida);
      socket.off("finSorteo", handlerFinSorteo);
    };
  }, [socket]);

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
          <h3>{texto}</h3>
          <h2>
            FECHA DEL PRÓXIMO SORTEO:{" "}
            <span className="values">{formatFecha(fecha)}HS</span>
          </h2>
          <h2>
            VALOR DEL CARTÓN:{" "}
            <span className="values">
              ${formatearMiles(premios.valorCarton)}
            </span>
          </h2>
          <h2>
            PREMIO DE LÍNEA:{" "}
            <span className="values">
              ${formatearMiles(premios.premioLinea)}
            </span>
          </h2>
          <h2>
            PREMIO DE BINGO:{" "}
            <span className="values">
              ${formatearMiles(premios.premioBingo)}
            </span>
          </h2>
          <h2>
            PREMIO ACUMULADO:{" "}
            <span className="values">
              ${formatearMiles(premios.premioAcumulado)}
            </span>
          </h2>
        </div>
        <div className="user-info">
          {user?.creditos !== undefined && (
            <h2>
              CRÉDITOS DISPONIBLES:{" "}
              <span className="values">${formatearMiles(user.creditos)}</span>
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
        <div className="welco-btn-group">
          <button className="btn">COMO JUGAR</button>
          <button className="btn">COMPRAR CRÉDITOS</button>
          <button
            className="btn"
            onClick={() => {
              socket.emit("comprarCartones", cantidadCartones, (respuesta) => {
                if (respuesta.ok) {
                  alert(
                    `🎟️ Compraste ${cantidadCartones} cartones correctamente`
                  );
                  setTimeout(() => {
                    socket.emit("solicitarDatosUsuario", (datos) => {
                      if (datos) {
                        user.creditos = datos.creditos;
                        setCartones(datos.cartones);
                      }
                    });
                  }, 300);
                } else {
                  alert("Error al comprar cartones: " + respuesta.error);
                }
              });
            }}
          >
            COMPRAR CARTONES
          </button>
          <button
            className="btn-play"
            onClick={() => {
              socket.emit("solicitarInfoPartida", (partida) => {
                if (!partida) {
                  alert("❌ No hay ninguna partida próxima por comenzar.");
                  return;
                }
                const ahora = new Date();
                const inicio = new Date(partida.fecha_hora_jugada);
                const diferencia = (inicio - ahora) / 1000 / 60;
                if (diferencia > 5) {
                  alert(
                    "⏳ Aún no se puede jugar. Faltan más de 5 minutos para la próxima partida."
                  );
                  return;
                }
                socket.emit("obtenerCartonesDisponibles");

                navigate("/gameplay");
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
