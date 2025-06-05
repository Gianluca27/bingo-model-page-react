import React, { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import "./RegisterForm.css";
import { useAuth } from "../../context/AuthContext";

const RegisterForm = () => {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    nombre: "",
    apellido: "",
    dni: "",
    usuario: "",
    senia: "",
    confirmar: "",
  });
  const [error, setError] = useState("");

  const handleChange = (e) => {
    setFormData((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    if (formData.senia !== formData.confirmar) {
      setError("Las contraseñas no coinciden");
      return;
    }

    try {
      const res = await fetch("http://localhost:3001/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          nombre,
          apellido,
          documento,
          creditos,
          username: usuario,
          password,
          rol,
        }),
      });

      const data = await res.json();

      if (res.ok) {
        // 🔁 Realiza login automático después de registrarse
        const loginRes = await fetch("http://localhost:3001/login", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            username: usuario,
            password,
          }),
        });

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

    return (
      <div className="register-container">
        <img
          src="/assets/images/bingomaniamia-logo.png"
          alt="Bingo Logo"
          className="register-logo"
        />
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
            name="dni"
            placeholder="DNI"
            value={formData.dni}
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
            type="password"
            name="senia"
            placeholder="Contraseña"
            value={formData.senia}
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
};

export default RegisterForm;
