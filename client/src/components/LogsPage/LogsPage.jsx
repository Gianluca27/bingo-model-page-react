// src/components/LogsPage/LogsPage.jsx
import React, { useEffect, useState } from "react";
import "./LogsPage.css";

const LogsPage = () => {
  const [logs, setLogs] = useState([]);
  const [filtros, setFiltros] = useState({ fecha: "", usuario: "", hora: "" });

  useEffect(() => {
    fetch("http://localhost:3001/api/uso")
      .then((res) => res.json())
      .then((data) => {
        if (Array.isArray(data)) {
          setLogs(data);
        } else {
          console.error("⚠️ Respuesta inesperada del servidor:", data);
          setLogs([]);
        }
      })
      .catch((err) => {
        console.error("❌ Error cargando registros:", err);
        setLogs([]);
      });
  }, []);

  const aplicarFiltros = () => {
    if (!Array.isArray(logs)) return [];

    return logs.filter((log) => {
      const fechaOk = filtros.fecha
        ? log.fecha_hora_momento.startsWith(filtros.fecha)
        : true;
      const usuarioOk = filtros.usuario
        ? log.usuario.toLowerCase().includes(filtros.usuario.toLowerCase())
        : true;
      const horaOk = filtros.hora ? log.hora_sorteo === filtros.hora : true;
      return fechaOk && usuarioOk && horaOk;
    });
  };

  const limpiarFiltros = () => setFiltros({ fecha: "", usuario: "", hora: "" });

  const filtrados = aplicarFiltros();

  const formatFechaHora = (raw) => {
    if (!raw) return "";
    const date = new Date(raw.replace(" ", "T"));
    const dia = String(date.getDate()).padStart(2, "0");
    const mes = String(date.getMonth() + 1).padStart(2, "0");
    const anio = String(date.getFullYear()).slice(2);
    const horas = String(date.getHours()).padStart(2, "0");
    const minutos = String(date.getMinutes()).padStart(2, "0");

    return `${dia}/${mes}/${anio} ${horas}:${minutos}`;
  };

  return (
    <div className="logs-page">
      <div className="logs-container">
        <h2>Registros de Uso</h2>
        <div className="busqueda-container">
          <div className="filtros-container">
            <input
              type="date"
              className="input-busqueda"
              value={filtros.fecha}
              onChange={(e) =>
                setFiltros({ ...filtros, fecha: e.target.value })
              }
            />
            <input
              type="text"
              placeholder="Buscar usuario..."
              className="input-busqueda"
              value={filtros.usuario}
              onChange={(e) =>
                setFiltros({ ...filtros, usuario: e.target.value })
              }
            />
            <input
              type="time"
              className="input-busqueda"
              value={filtros.hora}
              onChange={(e) => setFiltros({ ...filtros, hora: e.target.value })}
            />
          </div>
          <div className="filtros-btn">
            {" "}
            <button className="btn-primary" onClick={aplicarFiltros}>
              Buscar
            </button>
            <button className="btn-danger" onClick={limpiarFiltros}>
              Limpiar
            </button>
          </div>
        </div>

        <div className="tabla-scroll">
          <table>
            <thead>
              <tr>
                <th>ID</th>
                <th>Fecha y Hora</th>
                <th>Usuario</th>
                <th>Código</th>
                <th>Valor</th>
              </tr>
            </thead>
            <tbody>
              {filtrados.map((row) => (
                <tr key={row.id}>
                  <td>{row.id}</td>
                  <td>{formatFechaHora(row.fecha_hora_momento)}</td>
                  <td>{row.usuario}</td>
                  <td>{row.codigo}</td>
                  <td>{row.valor}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default LogsPage;
