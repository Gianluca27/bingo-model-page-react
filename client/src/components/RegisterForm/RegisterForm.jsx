import React, { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import "./RegisterForm.css";
import { useAuth } from "../../context/AuthContext";
import bingoLogo from "../../assets/images/bingomaniamia-logo.png";

const RegisterForm = () => {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    nombre: "",
    apellido: "",
    documento: "",
    usuario: "",
    email: "",
    contraseña: "",
    confirmar: "",
  });

  const [error, setError] = useState("");

  const handleChange = (e) => {
    setFormData((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    const { nombre, apellido, dni, usuario, email, contraseña, confirmar } =
      formData;

    if (contraseña !== confirmar) {
      setError("Las contraseñas no coinciden");
      return;
    }

    try {
      const res = await fetch("http://localhost:3001/api/usuarios/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          nombre,
          apellido,
          documento,
          usuario,
          email,
          contraseña,
        }),
      });

      const data = await res.json();

      if (res.ok) {
        const loginRes = await fetch(
          "http://localhost:3001/api/usuarios/login",
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              usuario,
              contraseña,
            }),
          }
        );

        const loginData = await loginRes.json();

        if (loginRes.ok && loginData.success) {
          login({
            username: loginData.username,
            creditos: loginData.creditos,
            admin: loginData.admin,
          });
          navigate("/welcome");
        } else {
          setError(
            loginData.error || "Error al iniciar sesión después del registro"
          );
        }
      } else {
        setError(data.error || "Error al registrar usuario");
      }
    } catch (err) {
      console.error("Error en el registro:", err);
      setError("No se pudo conectar con el servidor");
    }
  };

  return (
    <div className="register-container">
      <img src={bingoLogo} alt="Bingo Logo" className="register-logo" />
      <form className="register-form" onSubmit={handleSubmit}>
        <h2>Crear cuenta</h2>
        <input
          name="nombre"
          placeholder="Nombre"
          value={formData.nombre}
          onChange={handleChange}
          required
        />
        <input
          name="apellido"
          placeholder="Apellido"
          value={formData.apellido}
          onChange={handleChange}
          required
        />
        <input
          name="documento"
          placeholder="DNI"
          value={formData.documento}
          onChange={handleChange}
          required
        />
        <input
          name="usuario"
          placeholder="Usuario"
          value={formData.usuario}
          onChange={handleChange}
          required
        />
        <input
          type="email"
          name="email"
          placeholder="Correo electrónico"
          value={formData.email}
          onChange={handleChange}
          required
        />
        <input
          type="password"
          name="contraseña"
          placeholder="Contraseña"
          value={formData.contraseña}
          onChange={handleChange}
          required
        />
        <input
          type="password"
          name="confirmar"
          placeholder="Confirmar contraseña"
          value={formData.confirmar}
          onChange={handleChange}
          required
          id="last-input"
        />
        {error && <p className="error">{error}</p>}
        <button type="submit">Registrarse</button>
        <p>
          ¿Ya tenés cuenta? <Link to="/login">Iniciá sesión</Link>
        </p>
      </form>
    </div>
  );
};

export default RegisterForm;
