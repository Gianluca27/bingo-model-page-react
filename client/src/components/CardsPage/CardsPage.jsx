import React, { useEffect, useState } from "react";
import "./CardsPage.css";

const CardsPage = () => {
  const [cartones, setCartones] = useState([]);
  const [campoBusqueda, setCampoBusqueda] = useState("usuario");
  const [valorBusqueda, setValorBusqueda] = useState("");
  const [nuevoCarton, setNuevoCarton] = useState({
    usuario: "",
    id_partida: "",
    numero_carton: "",
  });
  const [modalAbierto, setModalAbierto] = useState(false);

  const cargarCartones = () => {
    fetch("http://localhost:3001/admin/cartones")
      .then((res) => res.json())
      .then(setCartones);
  };
  useEffect(() => {
    cargarCartones();
  }, []);

  const eliminarCarton = (id) => {
    fetch(`http://localhost:3001/admin/cartones/${id}`, {
      method: "DELETE",
    }).then(cargarCartones);
  };

  const agregarCarton = () => {
    fetch("http://localhost:3001/admin/cartones", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(nuevoCarton),
    }).then(() => {
      setNuevoCarton({ usuario: "", id_partida: "", numero_carton: "" });
      cargarCartones();
    });
  };

  const filtrados = cartones.filter((c) => {
    const valor = c[campoBusqueda];
    if (!valorBusqueda) return true;
    if (!valor) return false;

    return campoBusqueda === "fecha_asignacion"
      ? valor.startsWith(valorBusqueda)
      : valor.toString().includes(valorBusqueda);
  });

  const modal = modalAbierto && (
    <div className="nuevo-carton-modal">
      <div className="modal-content">
        <h3>Nuevo Cartón</h3>
        <input
          type="text"
          placeholder="Usuario"
          value={nuevoCarton.usuario}
          onChange={(e) =>
            setNuevoCarton({ ...nuevoCarton, usuario: e.target.value })
          }
        />
        <input
          type="number"
          placeholder="ID Partida"
          value={nuevoCarton.id_partida}
          onChange={(e) =>
            setNuevoCarton({ ...nuevoCarton, id_partida: e.target.value })
          }
        />
        <input
          type="number"
          placeholder="Número Cartón"
          value={nuevoCarton.numero_carton}
          onChange={(e) =>
            setNuevoCarton({ ...nuevoCarton, numero_carton: e.target.value })
          }
        />
        <div className="modal-buttons">
          <button onClick={agregarCarton}>Crear</button>
          <button onClick={() => setModalAbierto(false)}>Cancelar</button>
        </div>
      </div>
    </div>
  );

  return (
    <div className="cards-page">
      <h2>Gestión de Cartones</h2>
      <div className="cartones-busqueda">
        <button onClick={() => setModalAbierto(true)}>+ Nuevo</button>
        <select
          value={campoBusqueda}
          onChange={(e) => setCampoBusqueda(e.target.value)}
        >
          <option value="id">ID</option>
          <option value="id_partida">ID Partida</option>
          <option value="usuario">Usuario</option>
          <option value="fecha_asignacion">Fecha</option>
          <option value="numero_carton">Cartón</option>
        </select>

        <input
          type={campoBusqueda === "fecha_asignacion" ? "date" : "text"}
          placeholder={`Buscar por ${campoBusqueda}`}
          value={valorBusqueda}
          onChange={(e) => setValorBusqueda(e.target.value)}
        />
      </div>
      <div className="tabla-cartones-container">
        <table>
          <thead>
            <tr>
              <th>ID</th>
              <th>Usuario</th>
              <th>Partida</th>
              <th>Cartón</th>
              <th>Fecha</th>
              <th>🗑️</th>
            </tr>
          </thead>
          <tbody>
            {filtrados.map((c) => (
              <tr key={c.id}>
                <td>{c.id}</td>
                <td>{c.usuario}</td>
                <td>{c.id_partida}</td>
                <td>{c.numero_carton}</td>
                <td>{c.fecha_asignacion || "-"}</td>
                <td>
                  <button
                    onClick={() => eliminarCarton(c.id)}
                    className="btn-danger"
                  >
                    🗑️
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {modal}
    </div>
  );
};

export default CardsPage;
