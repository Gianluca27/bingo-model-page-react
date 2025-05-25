import React, { useEffect, useState } from 'react';
import './CardsPage.css';
import NewCardModal from '../NewCardModal/NewCardModal';
import EditCardModal from '../EditCardModal/EditCardModal';

const CardsPage = () => {
  const [cartones, setCartones] = useState([]);
  const [usuarioFiltro, setUsuarioFiltro] = useState('');
  const [partidaFiltro, setPartidaFiltro] = useState('');
  const [nuevoCarton, setNuevoCarton] = useState({ usuario: '', id_partida: '', numero_carton: '' });

  const [modalAbierto, setModalAbierto] = useState(false);
  const [modalEditarVisible, setModalEditarVisible] = useState(false);
  const [cartonSeleccionado, setCartonSeleccionado] = useState(null);

  const cargarCartones = () => {
    fetch('http://localhost:3000/admin/cartones')
      .then(res => res.json())
      .then(setCartones);
  };

  useEffect(() => {
    cargarCartones();
  }, []);

  const eliminarCarton = (id) => {
    fetch(`http://localhost:3000/admin/cartones/${id}`, { method: 'DELETE' })
      .then(cargarCartones);
  };

  const agregarCarton = () => {
    fetch('http://localhost:3000/admin/cartones', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(nuevoCarton),
    }).then(() => {
      setNuevoCarton({ usuario: '', id_partida: '', numero_carton: '' });
      cargarCartones();
    });
  };

  const filtrados = cartones.filter(c =>
    (usuarioFiltro ? c.usuario.includes(usuarioFiltro) : true) &&
    (partidaFiltro ? c.id_partida.toString() === partidaFiltro : true)
  );

  return (
    <div className="cards-page">
      <h2>Gestión de Cartones</h2>

      <div className="filters">
        <input
          type="text"
          placeholder="Usuario"
          value={usuarioFiltro}
          onChange={e => setUsuarioFiltro(e.target.value)}
        />
        <input
          type="number"
          placeholder="ID Partida"
          value={partidaFiltro}
          onChange={e => setPartidaFiltro(e.target.value)}
        />
        <button onClick={cargarCartones}>Ver Todos</button>
      </div>

      <div className="add-form">
        <input
          type="text"
          placeholder="Usuario"
          value={nuevoCarton.usuario}
          onChange={e => setNuevoCarton({ ...nuevoCarton, usuario: e.target.value })}
        />
        <input
          type="number"
          placeholder="ID Partida"
          value={nuevoCarton.id_partida}
          onChange={e => setNuevoCarton({ ...nuevoCarton, id_partida: e.target.value })}
        />
        <input
          type="number"
          placeholder="Número Cartón"
          value={nuevoCarton.numero_carton}
          onChange={e => setNuevoCarton({ ...nuevoCarton, numero_carton: e.target.value })}
        />
        <button onClick={agregarCarton}>+ Nuevo</button>

        <button onClick={() => setModalAbierto(true)} className="btn-success">
          + Nuevo Cartón (modal)
        </button>
      </div>

      <table>
        <thead>
          <tr>
            <th>ID</th><th>Usuario</th><th>Partida</th><th>Cartón</th><th>Fecha</th><th>✏️</th><th>🗑️</th>
          </tr>
        </thead>
        <tbody>
          {filtrados.map(c => (
            <tr key={c.id}>
              <td>{c.id}</td>
              <td>{c.usuario}</td>
              <td>{c.id_partida}</td>
              <td>{c.numero_carton}</td>
              <td>{c.fecha_asignacion || '-'}</td>
              <td>
                <button
                  onClick={() => {
                    setCartonSeleccionado(c);
                    setModalEditarVisible(true);
                  }}
                >
                  ✏️
                </button>
              </td>
              <td>
                <button onClick={() => eliminarCarton(c.id)}>🗑️</button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* Modales */}
      <NewCardModal
        visible={modalAbierto}
        onClose={() => setModalAbierto(false)}
        onSuccess={() => {
          cargarCartones();
          setModalAbierto(false);
        }}
      />

      <EditCardModal
        isOpen={modalEditarVisible}
        onClose={() => setModalEditarVisible(false)}
        onSave={() => {
          cargarCartones();
          setModalEditarVisible(false);
        }}
        cardData={cartonSeleccionado}
      />
    </div>
  );
};

export default CardsPage;
