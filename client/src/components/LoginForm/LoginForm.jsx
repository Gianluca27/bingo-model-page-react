import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import './LoginForm.css';

const LoginForm = () => {
  const { login } = useAuth();
  const navigate = useNavigate();

  const [credentials, setCredentials] = useState({ username: '', password: '' });
  const [error, setError] = useState('');

  const handleChange = (e) => {
    setCredentials({ ...credentials, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    try {
      const res = await fetch('http://localhost:3000/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(credentials)
      });

      const data = await res.json();

      if (res.ok && data.success) {
        login({
          username: data.username,
          creditos: data.creditos,
          admin: data.admin
        });
        navigate('/welcome');
      } else {
        setError(data.error || 'Credenciales incorrectas');
      }
    } catch (err) {
      console.error('Error de red:', err);
      setError('Error al conectar con el servidor');
    }
  };

  return (
    <form className="auth-form" onSubmit={handleSubmit}>
      <img src="../../assets/images/bingomania-logo.png" alt="Bingo Logo" className="form-logo" />
      <h2>Iniciar Sesión</h2>
      <input
        type="text"
        name="username"
        placeholder="Usuario"
        value={credentials.username}
        onChange={handleChange}
        required
      />
      <input
        type="password"
        name="password"
        placeholder="Contraseña"
        value={credentials.password}
        onChange={handleChange}
        required
        id="last-input"
      />
      {error && <p className="error">{error}</p>}
      <button type="submit">Entrar</button>
      <p>¿No tenés cuenta? <Link to="/register">Registrate</Link></p>
    </form>
  );
};

export default LoginForm;
