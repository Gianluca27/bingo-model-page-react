import React, { useState } from "react";
import "./ComprarCreditos.css";
import { useAuth } from "../../context/AuthContext";

const ComprarCreditos = () => {
  const { user } = useAuth(); // asumimos que tenés el email del usuario
  const [monto, setMonto] = useState("");
  const [mensaje, setMensaje] = useState("");
  const [loading, setLoading] = useState(false);

  const handleCompra = async () => {
    if (!monto || isNaN(monto) || monto <= 0) {
      setMensaje("Ingresá un monto válido.");
      return;
    }

    setLoading(true);
    setMensaje("");

    try {
      const res = await fetch(
        "http://localhost:3001/api/mercadopago/crear-preferencia",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            email: user.email,
            monto: parseFloat(monto),
          }),
        }
      );

      const data = await res.json();
      if (data.init_point) {
        window.location.href = data.init_point;
      } else {
        setMensaje("Error al generar el link de pago.");
      }
    } catch (err) {
      console.error(err);
      setMensaje("Hubo un error al procesar la compra.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="comprar-creditos-container">
      <h1>Comprar Créditos</h1>

      <label>
        Ingresá la cantidad de créditos que querés comprar:
        <input
          type="number"
          value={monto}
          onChange={(e) => setMonto(e.target.value)}
          min="1"
          placeholder="Ej: 500"
        />
      </label>

      <button onClick={handleCompra} disabled={loading}>
        {loading ? "Redirigiendo..." : "Realizar compra"}
      </button>

      <p className="mensaje-info">
        Una vez realizado el pago, los créditos pueden demorar algunos minutos
        en acreditarse.
      </p>

      {mensaje && <p className="mensaje-error">{mensaje}</p>}
    </div>
  );
};

export default ComprarCreditos;
