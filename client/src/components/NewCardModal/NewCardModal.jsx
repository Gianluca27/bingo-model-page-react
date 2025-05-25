import React, { useState } from 'react';
import './NewCardModal.css';
import axios from 'axios';

const NewCardModal = ({ visible, onClose, onSuccess }) => {
  const [usuario, setUsuario] = useState('');
  const [idPartida, setIdPartida] = useState('');
  const [numeroCarton, setNumeroCarton] = useState('');
  const [error, setError] = useState('');

  const handleCrear = async () => {
    if (!usuario || !idPartida || !numeroCarton) {
      setError('Todos los campos son obligatorios.');
      return;
    }

    try {
      const response = await axios.post('http://localhost:3001/admin/cartones', {
        usuario,
        id_partida: idPartida,
        numero_carton: numeroCarton,
      });

      if (response.data.success) {
        onSuccess();
        onClose();
      }
    } catch (err) {
      setError('Error al crear cartón.');
    }
  };

  if (!visible) return null;

  return (
    <div className="modal-overlay">
      <div className="modal-box">
        <h3>Crear Nuevo Cartón</h3>
        <input
          placeholder="Usuario"
          value={usuario}
          onChange={(e) => setUsuario(e.target.value)}
        />
        <input
          type="number"
          placeholder="ID Partida"
          value={idPartida}
          onChange={(e) => setIdPartida(e.target.value)}
        />
        <input
          type="number"
          placeholder="N° Cartón"
          value={numeroCarton}
          onChange={(e) => setNumeroCarton(e.target.value)}
        />
        {error && <div className="modal-error">{error}</div>}
        <div className="modal-buttons">
          <button onClick={handleCrear} className="btn-success">Crear</button>
          <button onClick={onClose} className="btn-danger">Cancelar</button>
        </div>
      </div>
    </div>
  );
};

export default NewCardModal;
