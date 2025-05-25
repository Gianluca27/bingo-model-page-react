// src/components/LogsPage/LogsPage.jsx
import React, { useEffect, useState } from 'react';
import './LogsPage.css';

const LogsPage = () => {
  const [logs, setLogs] = useState([]);
  const [filtros, setFiltros] = useState({ fecha: '', usuario: '', hora: '' });

  useEffect(() => {
    fetch('http://localhost:3000/admin/uso')
      .then(res => res.json())
      .then(data => setLogs(data))
      .catch(err => console.error('Error cargando registros:', err));
  }, []);

  const aplicarFiltros = () => {
    const filtrado = logs.filter(log => {
      const fechaOk = filtros.fecha ? log.fecha_hora_momento.startsWith(filtros.fecha) : true;
      const usuarioOk = filtros.usuario ? log.usuario.toLowerCase().includes(filtros.usuario.toLowerCase()) : true;
      const horaOk = filtros.hora ? log.hora_sorteo === filtros.hora : true;
      return fechaOk && usuarioOk && horaOk;
    });
    return filtrado;
  };

  const limpiarFiltros = () => setFiltros({ fecha: '', usuario: '', hora: '' });

  const filtrados = aplicarFiltros();

  return (
    <div className="logs-container">
      <h2>Registros de Uso</h2>
      <div className="filtros">
        <input type="date" value={filtros.fecha} onChange={e => setFiltros({ ...filtros, fecha: e.target.value })} />
        <input type="text" placeholder="Usuario" value={filtros.usuario} onChange={e => setFiltros({ ...filtros, usuario: e.target.value })} />
        <input type="time" value={filtros.hora} onChange={e => setFiltros({ ...filtros, hora: e.target.value })} />
        <button onClick={aplicarFiltros}>Buscar</button>
        <button onClick={limpiarFiltros}>Limpiar</button>
      </div>

      <table>
        <thead>
          <tr>
            <th>ID</th><th>Fecha y Hora</th><th>Hora Sorteo</th><th>Usuario</th><th>Código</th><th>Valor</th>
          </tr>
        </thead>
        <tbody>
          {filtrados.map(row => (
            <tr key={row.id}>
              <td>{row.id}</td>
              <td>{row.fecha_hora_momento}</td>
              <td>{row.hora_sorteo}</td>
              <td>{row.usuario}</td>
              <td>{row.codigo}</td>
              <td>{row.valor}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default LogsPage;
