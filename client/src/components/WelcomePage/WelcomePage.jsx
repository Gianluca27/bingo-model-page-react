// src/pages/WelcomePage.jsx
import React, { useEffect, useState, useContext } from "react";
import "./WelcomePage.css";
import { useNavigate } from "react-router-dom";
import SocketContext from "../../services/SocketContext";
import { useAuth } from "../../context/AuthContext";
import bingoLogo from "../../assets/images/bingomaniamia-logo.png";
import { formatFecha } from "../../utils/formatDate";
import CartonPurchaseModal from "../CartonPurchaseModal/CartonPurchaseModal";
import axios from "axios";

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
  const [partidaVisible, setPartidaVisible] = useState(null);
  const [modalAbierto, setModalAbierto] = useState(false);

  const handleLogout = async () => {
    await logout();
    navigate("/login");
  };

  const formatearMiles = (numero) => {
    return new Intl.NumberFormat("es-AR").format(numero);
  };

  useEffect(() => {
    const handleConnect = () => {
      if (user?.username) {
        socket.emit("login", user.username);
      }
    };

    if (socket?.connected && user?.username) {
      socket.emit("login", user.username);
    }

    socket.on("connect", handleConnect);
    return () => socket.off("connect", handleConnect);
  }, [socket, user]);

  useEffect(() => {
    const handleReconexion = () => {
      if (user?.username) {
        socket.emit("login", user.username);

        if (partidaVisible?.id_partida) {
          socket.emit(
            "obtenerCartonesDisponibles",
            partidaVisible.id_partida,
            (cartones) => {
              if (Array.isArray(cartones)) {
                setCartones(cartones.length);
              }
            }
          );
        }
      }
    };

    socket.on("connect", handleReconexion);
    return () => socket.off("connect", handleReconexion);
  }, [socket, user, partidaVisible]);

  useEffect(() => {
    const obtenerPartidas = async () => {
      const res = await axios.get("http://localhost:3001/api/partidas");
      const data = res.data;

      const activa = data.find((p) => p.estado === "activa");
      if (activa) {
        setPartidaVisible(activa);
        return;
      }

      const pendientes = data
        .filter((p) => p.estado === "pendiente")
        .sort(
          (a, b) =>
            new Date(a.fecha_hora_jugada) - new Date(b.fecha_hora_jugada)
        );

      if (pendientes.length > 0) {
        setPartidaVisible(pendientes[0]);
      }
    };

    obtenerPartidas();
  }, []);

  useEffect(() => {
    const actualizarPartida = (datosActualizados) => {
      if (
        partidaVisible &&
        datosActualizados.id_partida === partidaVisible.id_partida
      ) {
        setPartidaVisible(datosActualizados);
      }
    };

    const actualizarPartidaVisible = async () => {
      try {
        const res = await axios.get("http://localhost:3001/api/partidas");
        const data = res.data;

        const activa = data.find((p) => p.estado === "activa");
        if (activa) {
          setPartidaVisible(activa);
        } else {
          const futura = data
            .filter((p) => p.estado === "pendiente")
            .sort(
              (a, b) =>
                new Date(a.fecha_hora_jugada) - new Date(b.fecha_hora_jugada)
            )[0];
          setPartidaVisible(futura || null);
        }
      } catch (err) {
        console.error("Error al actualizar partida visible:", err);
      }
    };

    socket.on("actualizarPartida", actualizarPartida);
    socket.on("finSorteo", actualizarPartidaVisible);

    return () => {
      socket.off("actualizarPartida", actualizarPartida);
      socket.off("finSorteo", actualizarPartidaVisible);
    };
  }, [socket, partidaVisible]);

  useEffect(() => {
    if (!socket?.connected || !user?.username || !partidaVisible?.id_partida)
      return;

    // Solo si el servidor admite una respuesta (callback) tras login
    socket.emit("login", user.username, () => {
      socket.emit(
        "obtenerCartonesDisponibles",
        partidaVisible.id_partida,
        (cartones) => {
          if (Array.isArray(cartones)) {
            setCartones(cartones.length);
          } else {
            setCartones(0);
          }
        }
      );
    });
  }, [socket, user, partidaVisible]);

  useEffect(() => {
    const handler = (mensaje) => setMensajeGlobal(mensaje);
    socket.on("mensaje-tiempo", handler);
    return () => socket.off("mensaje-tiempo", handler);
  }, [socket]);

  useEffect(() => {
    const handleDatosUsuario = ({ creditos }) => {
      user.creditos = creditos;
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
          {partidaVisible?.estado === "activa" && (
            <>
              <p className="blinking">🎯 ¡Partida en juego!</p>
            </>
          )}
          {partidaVisible && (
            <>
              <h2>
                FECHA DEL PRÓXIMO SORTEO:{" "}
                <span className="values">
                  {formatFecha(partidaVisible.fecha_hora_jugada)}HS
                </span>
              </h2>
              <h2>
                VALOR DEL CARTÓN:{" "}
                <span className="values">
                  ${formatearMiles(partidaVisible.valor_carton)}
                </span>
              </h2>
              <h2>
                PREMIO DE LÍNEA:{" "}
                <span className="values">
                  ${formatearMiles(partidaVisible.premio_linea)}
                </span>
              </h2>
              <h2>
                PREMIO DE BINGO:{" "}
                <span className="values">
                  ${formatearMiles(partidaVisible.premio_bingo)}
                </span>
              </h2>
              <h2>
                PREMIO ACUMULADO:{" "}
                <span className="values">
                  ${formatearMiles(partidaVisible.premio_acumulado)}
                </span>
              </h2>
            </>
          )}
        </div>
        <div className="user-info">
          {cartones !== undefined && (
            <h2>
              CARTONES PARA ESTA PARTIDA:{" "}
              <span className="values">{cartones} / 12</span>
            </h2>
          )}
        </div>
        <h2>{texto}</h2>
        <div className="welco-btn-group">
          <button className="btn">COMO JUGAR</button>
          <button className="btn">COMPRAR CRÉDITOS</button>
          <button className="btn" onClick={() => setModalAbierto(true)}>
            COMPRAR CARTONES
          </button>
          <button
            className="btn-play"
            onClick={() => {
              socket.emit("solicitarInfoPartida", (partida) => {
                if (!partida || partida.error) {
                  if (partida?.error === "FALTAN_MAS_DE_5_MINUTOS") {
                    alert(
                      `⏳ Aún no se puede ingresar. Esperá a que falten menos de 5 minutos para entrar al próximo sorteo.`
                    );
                  } else {
                    alert("❌ No hay ninguna partida próxima por comenzar.");
                  }
                  return;
                }

                const ahora = new Date();
                const inicio = new Date(partida.fecha_hora_jugada);
                const diferenciaMs = inicio - ahora;

                const yaEmpezo = diferenciaMs <= 0;
                const faltanMenosDe5Min = diferenciaMs <= 5 * 60 * 1000;

                if (
                  partida.estado === "activa" ||
                  yaEmpezo ||
                  faltanMenosDe5Min
                ) {
                  socket.emit("obtenerCartonesDisponibles");
                  navigate("/gameplay");
                } else {
                  alert(
                    `⏳ Aún no se puede ingresar. La partida comienza a las ${formatFecha(
                      partida.fecha_hora_jugada
                    )} HS. Intentelo de nuevo cuando falten 5 minutos.`
                  );
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
      {modalAbierto && (
        <CartonPurchaseModal
          user={user}
          onClose={() => setModalAbierto(false)}
          onConfirm={(partida, cantidad) => {
            socket.emit(
              "comprarCartonesParaPartida",
              { cantidad, id_partida: partida.id_partida },
              (respuesta) => {
                if (respuesta.ok) {
                  alert(
                    `🎟️ Compraste ${cantidad} cartones para la partida del ${new Date(
                      partida.fecha_hora_jugada
                    ).toLocaleString()}`
                  );
                  socket.emit("solicitarDatosUsuario", (datos) => {
                    if (datos) {
                      user.creditos = datos.creditos;
                      setCartones(datos.cartones);
                    }
                  });
                } else {
                  alert("❌ Error: " + respuesta.error);
                }
              }
            );
          }}
        />
      )}
    </section>
  );
};

export default WelcomePage;
