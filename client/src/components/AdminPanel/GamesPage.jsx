import React, { useEffect, useState } from "react";
import axios from "axios";
import "./GamesPage.css";

const GamesPage = () => {
  const [partidas, setPartidas] = useState([]);
  const [seleccionadas, setSeleccionadas] = useState([]);
  const [formVisible, setFormVisible] = useState(false);
  const [editando, setEditando] = useState(null);
  const [formData, setFormData] = useState({
    hora_jugada: "21:00",
    valor_carton: "",
    premio_linea: "",
    premio_bingo: "",
    premio_acumulado: "",
  });

  const fetchPartidas = async () => {
    try {
      const res = await axios.get("http://localhost:3001/admin/partidas");
      const data = res.data
        .map((p) => ({ ...p, id: p.id_partida }))
        .sort((a, b) => b.id - a.id); // Orden descendente por ID
      setPartidas(data);
    } catch (err) {
      console.error("❌ Error al cargar partidas:", err);
    }
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
        hora_jugada: p.hora_jugada,
        valor_carton: p.valor_carton,
        premio_linea: p.premio_linea,
        premio_bingo: p.premio_bingo,
        premio_acumulado: p.premio_acumulado,
      });
    } else {
      setEditando(null);
      setFormData({
        hora_jugada: "21:00",
        valor_carton: "",
        premio_linea: "",
        premio_bingo: "",
        premio_acumulado: "",
      });
    }
  };

  const guardarPartida = async () => {
    try {
      const response = await axios.post(
        "http://localhost:3001/admin/partidas",
        formData
      );
      console.log("🆔 Nueva partida creada con ID:", response.data.id);
      setFormVisible(false);
      fetchPartidas();
    } catch (error) {
      console.error("❌ Error al guardar partida:", error);
    }
  };

  const finalizarPartidas = async () => {
    await axios.post("http://localhost:3001/admin/partidas/finalizar", {
      ids: seleccionadas,
    });
    setSeleccionadas([]);
    fetchPartidas();
  };

  const iniciarPartidas = async () => {
    await axios.post("http://localhost:3001/admin/partidas/iniciar", {
      ids: seleccionadas,
    });
    setSeleccionadas([]);
    fetchPartidas();
  };

  return (
    <div className="games-page">
      <h3>Gestión de Partidas</h3>
      <div className="game-buttons">
        <button onClick={() => abrirForm()} className="btn-success">
          ➕ Nueva Partida
        </button>
        <button onClick={iniciarPartidas} className="btn-primary">
          🔄 Iniciar Seleccionadas
        </button>
        <button onClick={finalizarPartidas} className="btn-danger">
          ✔️ Finalizar Seleccionadas
        </button>
      </div>
      <div className="tabla-juegos-container">
        <table>
          <thead>
            <tr>
              <th>
                <input
                  type="checkbox"
                  onChange={toggleTodos}
                  checked={seleccionadas.length === partidas.length}
                />
              </th>
              <th>ID</th>
              <th>Hora</th>
              <th>Valor</th>
              <th>Premio Línea</th>
              <th>Premio Bingo</th>
              <th>Acumulado</th>
              <th>Estado</th>
              <th>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {partidas.map((p) => (
              <tr key={p.id}>
                <td>
                  <input
                    type="checkbox"
                    checked={seleccionadas.includes(p.id)}
                    onChange={() => toggleSeleccion(p.id)}
                  />
                </td>
                <td>{p.id}</td>
                <td>{p.hora_jugada}</td>
                <td>{p.valor_carton}</td>
                <td>{p.premio_linea}</td>
                <td>{p.premio_bingo}</td>
                <td>{p.premio_acumulado}</td>
                <td>{p.finalizado === 1 ? "Finalizado" : "Pendiente"}</td>
                <td>
                  <button onClick={() => abrirForm(p)} className="btn-primary">
                    ✏️
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {formVisible && (
        <div className="modal-overlay">
          <div className="modal">
            <h3>{editando ? "Editar Partida" : "Nueva Partida"}</h3>
            <input
              type="time"
              value={formData.hora_jugada}
              onChange={(e) =>
                setFormData({ ...formData, hora_jugada: e.target.value })
              }
            />
            <input
              type="number"
              placeholder="Valor Cartón"
              value={formData.valor_carton}
              onChange={(e) =>
                setFormData({ ...formData, valor_carton: e.target.value })
              }
            />
            <input
              type="number"
              placeholder="Premio Línea"
              value={formData.premio_linea}
              onChange={(e) =>
                setFormData({ ...formData, premio_linea: e.target.value })
              }
            />
            <input
              type="number"
              placeholder="Premio Bingo"
              value={formData.premio_bingo}
              onChange={(e) =>
                setFormData({ ...formData, premio_bingo: e.target.value })
              }
            />
            <input
              type="number"
              placeholder="Premio Acumulado"
              value={formData.premio_acumulado}
              onChange={(e) =>
                setFormData({ ...formData, premio_acumulado: e.target.value })
              }
            />
            <div className="form-buttons">
              <button onClick={guardarPartida} className="btn-success">
                Guardar
              </button>
              <button
                onClick={() => setFormVisible(false)}
                className="btn-danger"
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default GamesPage;
