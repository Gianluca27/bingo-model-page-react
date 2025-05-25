import React, { useEffect, useState } from 'react';
import axios from 'axios';
import './GamesPage.css';

const GamesPage = () => {
  const [partidas, setPartidas] = useState([]);
  const [seleccionadas, setSeleccionadas] = useState([]);
  const [formVisible, setFormVisible] = useState(false);
  const [editando, setEditando] = useState(null);
  const [formData, setFormData] = useState({
    hora: '21:00',
    valor: '',
    linea: '',
    bingo: '',
    acumulado: '',
    finalizado: false
  });

  const fetchPartidas = async () => {
    const res = await axios.get('http://localhost:3001/admin/partidas');
    setPartidas(res.data);
  };

  useEffect(() => {
    fetchPartidas();
  }, []);

  const toggleSeleccion = (id) => {
    setSeleccionadas((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  const toggleTodos = () => {
    if (seleccionadas.length === partidas.length) {
      setSeleccionadas([]);
    } else {
      setSeleccionadas(partidas.map((p) => p.id));
    }
  };

  const abrirForm = (p = null) => {
    setFormVisible(true);
    if (p) {
      setEditando(p.id);
      setFormData({
        hora: p.hora,
        valor: p.valor,
        linea: p.linea,
        bingo: p.bingo,
        acumulado: p.acumulado,
        finalizado: p.finalizado === 1
      });
    } else {
      setEditando(null);
      setFormData({
        hora: '21:00',
        valor: '',
        linea: '',
        bingo: '',
        acumulado: '',
        finalizado: false
      });
    }
  };

  const guardarPartida = async () => {
    await axios.post('http://localhost:3001/modificar-partida', {
      ...formData,
      id: editando
    });
    setFormVisible(false);
    fetchPartidas();
  };

  const finalizarPartidas = async () => {
    await axios.post('http://localhost:3001/finalizar-partidas', { ids: seleccionadas });
    setSeleccionadas([]);
    fetchPartidas();
  };

  const iniciarPartidas = async () => {
    await axios.post('http://localhost:3001/iniciar-partidas', { ids: seleccionadas });
    setSeleccionadas([]);
    fetchPartidas();
  };

  return (
    <div className="games-page">
      <h3>Gestión de Partidas</h3>
      <div className="game-buttons">
        <button onClick={() => abrirForm()} className="btn-success">➕ Nueva Partida</button>
        <button onClick={finalizarPartidas} className="btn-primary">✔️ Finalizar Seleccionadas</button>
        <button onClick={iniciarPartidas} className="btn-success">🔄 Iniciar Seleccionadas</button>
      </div>

      <table>
        <thead>
          <tr>
            <th><input type="checkbox" onChange={toggleTodos} checked={seleccionadas.length === partidas.length} /></th>
            <th>ID</th><th>Hora</th><th>Valor</th><th>Premio Línea</th><th>Premio Bingo</th><th>Acumulado</th><th>Estado</th><th>Acciones</th>
          </tr>
        </thead>
        <tbody>
          {partidas.map(p => (
            <tr key={p.id}>
              <td><input type="checkbox" checked={seleccionadas.includes(p.id)} onChange={() => toggleSeleccion(p.id)} /></td>
              <td>{p.id}</td>
              <td>{p.hora}</td>
              <td>{p.valor}</td>
              <td>{p.linea}</td>
              <td>{p.bingo}</td>
              <td>{p.acumulado}</td>
              <td>{p.finalizado === 1 ? 'Finalizado' : 'Pendiente'}</td>
              <td><button onClick={() => abrirForm(p)} className="btn-primary">✏️</button></td>
            </tr>
          ))}
        </tbody>
      </table>

      {formVisible && (
        <div className="form-container">
          <h3>{editando ? 'Editar Partida' : 'Nueva Partida'}</h3>
          <input type="time" value={formData.hora} onChange={e => setFormData({ ...formData, hora: e.target.value })} />
          <input type="number" placeholder="Valor Cartón" value={formData.valor} onChange={e => setFormData({ ...formData, valor: e.target.value })} />
          <input type="number" placeholder="Premio Línea" value={formData.linea} onChange={e => setFormData({ ...formData, linea: e.target.value })} />
          <input type="number" placeholder="Premio Bingo" value={formData.bingo} onChange={e => setFormData({ ...formData, bingo: e.target.value })} />
          <input type="number" placeholder="Premio Acumulado" value={formData.acumulado} onChange={e => setFormData({ ...formData, acumulado: e.target.value })} />
          <label>
            <input type="checkbox" checked={formData.finalizado} onChange={e => setFormData({ ...formData, finalizado: e.target.checked })} />
            Finalizado
          </label>

          <div className="form-buttons">
            <button onClick={guardarPartida} className="btn-success">Guardar</button>
            <button onClick={() => setFormVisible(false)} className="btn-danger">Cancelar</button>
          </div>
        </div>
      )}
    </div>
  );
};

export default GamesPage;
