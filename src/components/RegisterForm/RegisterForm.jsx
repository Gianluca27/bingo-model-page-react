// src/components/RegisterForm.jsx
import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import './RegisterForm.css';

const RegisterForm = () => {
  const [username, setUsername] = useState('');
  const navigate = useNavigate();

  const handleSubmit = (e) => {
    e.preventDefault();
    if (username.trim()) {
      // Guardar registro simulado
      navigate('/login');
    }
  };

  return (
    <form className="auth-form" onSubmit={handleSubmit}>
      <h2>Registrarse</h2>
      <input
        type="text"
        placeholder="Elegí un nombre de usuario"
        value={username}
        onChange={(e) => setUsername(e.target.value)}
        required
      />
      <button type="submit">Registrarse</button>
      <p>¿Ya tenés cuenta? <Link to="/login">Iniciá sesión</Link></p>
    </form>
  );
};

export default RegisterForm;
