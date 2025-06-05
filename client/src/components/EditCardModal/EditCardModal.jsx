// src/components/EditCardModal/EditCardModal.jsx
import React, { useState, useEffect } from "react";
import "./EditCardModal.css";
import axios from "axios";

const EditCardModal = ({ isOpen, onClose, onSave, cardData }) => {
  const [usuario, setUsuario] = useState("");
  const [numeroCarton, setNumeroCarton] = useState("");

  useEffect(() => {
    if (cardData) {
      setUsuario(cardData.usuario);
      setNumeroCarton(cardData.numero_carton);
    }
  }, [cardData]);

  const handleGuardar = async () => {
    try {
      await axios.put(`http://localhost:3001/admin/cartones/${cardData.id}`, {
        usuario,
        numero_carton: numeroCarton,
      });
      onSave();
    } catch (err) {
      alert("Error al editar cartón");
      console.error(err);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="modal-overlay">
      <div className="modal">
        <h3>Editar Cartón</h3>
        <input
          type="text"
          placeholder="Usuario"
          value={usuario}
          onChange={(e) => setUsuario(e.target.value)}
        />
        <input
          type="number"
          placeholder="N° Cartón"
          value={numeroCarton}
          onChange={(e) => setNumeroCarton(e.target.value)}
        />
        <div className="modal-buttons">
          <button className="btn-success" onClick={handleGuardar}>
            Guardar
          </button>
          <button className="btn-danger" onClick={onClose}>
            Cancelar
          </button>
        </div>
      </div>
    </div>
  );
};

export default EditCardModal;
