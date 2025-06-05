import React, { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import "./LoginForm.css";
import SocketContext from "../../services/SocketContext";
import { useContext } from "react";
import bingoLogo from "../../assets/images/bingomaniamia-logo.png";

const LoginForm = () => {
  const { login } = useAuth();
  const socket = useContext(SocketContext);
  const navigate = useNavigate();

  const [credentials, setCredentials] = useState({
    username: "",
    password: "",
  });
  const [error, setError] = useState("");

  const handleChange = (e) => {
    setCredentials({ ...credentials, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    try {
      const res = await fetch("http://localhost:3001/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(credentials),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        login({
          username: data.username,
          creditos: data.creditos,
          admin: data.admin,
        });
        socket.emit("login", data.username);
        navigate("/welcome");
      } else {
        setError(data.error || "Credenciales incorrectas");
      }
    } catch (err) {
      console.error("Error de red:", err);
      setError("Error al conectar con el servidor");
    }
  };

  return (
    <div className="login-container">
      <img src={bingoLogo} alt="Bingo Logo" className="login-logo" />
      <form className="auth-form" onSubmit={handleSubmit}>
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
        <p>
          ¿No tenés cuenta? <Link to="/register">Registrate</Link>
        </p>
      </form>
    </div>
  );
};

export default LoginForm;
