// src/components/CartonesModal/CartonesModal.jsx
import React from 'react';
import './CartonesModal.css';

const CartonesModal = ({ isVisible, texto, onConfirm, onCancel }) => {
  if (!isVisible) return null;

  return (
    <div className="modal-cartones-overlay">
      <div className="modal-cartones-contenido">
        <p>{texto}</p>
        <div className="modal-buttons">
          <button className="btn-primary" onClick={onConfirm}>
            Sí, comprar más
          </button>
          <button className="btn-secondary" onClick={onCancel}>
            No, ir a la jugada
          </button>
        </div>
      </div>
    </div>
  );
};

export default CartonesModal;
