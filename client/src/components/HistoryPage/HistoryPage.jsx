import React, { useEffect, useState } from 'react';
import './HistoryPage.css';
import axios from 'axios';

const HistoryPage = () => {
  const [historial, setHistorial] = useState([]);

  const cargarHistorial = async () => {
    try {
      const response = await axios.get('http://localhost:3001/admin/historial');
      setHistorial(response.data);
    } catch (err) {
      console.error('❌ Error al cargar historial:', err);
    }
  };

  const eliminarHistorial = async (id) => {
    try {
      await axios.delete(`http://localhost:3001/admin/historial/${id}`);
      setHistorial(historial.filter((h) => h.id !== id));
    } catch (err) {
      console.error('❌ Error al eliminar historial:', err);
    }
  };

  useEffect(() => {
    cargarHistorial();
  }, []);

  return (
    <div className="history-page">
      <h3>Historial de Sorteos</h3>
      <table>
        <thead>
          <tr>
            <th>Fecha</th><th>Hora</th><th>Bolillas</th><th>Cartones</th><th>Línea</th><th>Bingo</th><th>Acumulado</th><th>🗑️</th>
          </tr>
        </thead>
        <tbody>
          {historial.map((registro) => (
            <tr key={registro.id}>
              <td>{registro.fecha_hora}</td>
              <td>{registro.hora_sorteo}</td>
              <td>{registro.bolillas}</td>
              <td>{registro.cartones_jugados}</td>
              <td>{registro.ganadores_linea}</td>
              <td>{registro.ganadores_bingo}</td>
              <td>{registro.ganadores_acumulado}</td>
              <td><button onClick={() => eliminarHistorial(registro.id)}>🗑️</button></td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default HistoryPage;
