import React, { useEffect, useState, useContext } from "react";
import axios from "axios";
import SocketContext from "../../services/socket";
import "./UsersPage.css";

const UsersPage = () => {
  const socket = useContext(SocketContext);
  const [usuarios, setUsuarios] = useState([]);
  const [formVisible, setFormVisible] = useState(false);
  const [editando, setEditando] = useState(null);
  const [formData, setFormData] = useState({
    nombre: "",
    apellido: "",
    documento: "",
    usuario: "",
    password: "",
    rol: "usuario",
    creditos: 0,
  });

  const [busqueda, setBusqueda] = useState("");
  const [campoBusqueda, setCampoBusqueda] = useState("usuario"); // valor por defecto

  const fetchUsuarios = async () => {
    const { data } = await axios.get("http://localhost:3001/admin/usuarios");
    setUsuarios(data);
  };

  useEffect(() => {
    fetchUsuarios();
  }, []);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const abrirFormulario = (usuario = null) => {
    if (usuario) {
      setEditando(usuario.id);
      const { password, ...rest } = usuario;
      setFormData({ ...rest, password: "" });
    } else {
      setEditando(null);
      setFormData({
        nombre: "",
        apellido: "",
        documento: "",
        usuario: "",
        password: "",
        rol: "usuario",
        creditos: 0,
      });
    }
    setFormVisible(true);
  };

  const cerrarFormulario = () => {
    setFormVisible(false);
    setEditando(null);
  };

  const guardarUsuario = async () => {
    const url = "http://localhost:3001/modificar-usuario";
    const body = { ...formData, id: editando };
    await axios.post(url, body);
    fetchUsuarios();
    cerrarFormulario();
  };

  const eliminarUsuario = async (id) => {
    await axios.post("http://localhost:3001/eliminar-usuario", { id });
    fetchUsuarios();
  };

  const usuariosFiltrados = usuarios.filter((u) => {
    const valorCampo = u[campoBusqueda] ?? "";
    return valorCampo.includes(busqueda); // ahora distingue mayúsculas/minúsculas
  });

  return (
    <div className="users-page">
      <h3 className="titulo-usuarios">Gestión de Usuarios</h3>
      <div className="busqueda-box">
        <button onClick={() => abrirFormulario()} className="btn-success">
          Agregar Usuario
        </button>
        <select
          value={campoBusqueda}
          onChange={(e) => setCampoBusqueda(e.target.value)}
          className="select-filtro"
        >
          <option value="nombre">Nombre</option>
          <option value="apellido">Apellido</option>
          <option value="usuario">Usuario</option>
          <option value="documento">DNI</option>
        </select>

        <input
          type="text"
          placeholder={`Buscar por ${campoBusqueda}...`}
          className="input-busqueda"
          value={busqueda}
          onChange={(e) => setBusqueda(e.target.value)}
        />
      </div>
      <div className="tabla-usuarios-container">
        <table>
          <thead>
            <tr>
              <th>Nombre</th>
              <th>Apellido</th>
              <th>DNI</th>
              <th>Usuario</th>
              <th>Créditos</th>
              <th>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {usuariosFiltrados.map((u) => (
              <tr key={u.id}>
                <td>{u.nombre}</td>
                <td>{u.apellido}</td>
                <td>{u.documento}</td>
                <td>{u.usuario}</td>
                <td>{u.creditos}</td>
                <td>
                  <button
                    onClick={() => abrirFormulario(u)}
                    className="btn-primary"
                  >
                    ✏️
                  </button>
                  <button
                    onClick={() => eliminarUsuario(u.id)}
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
      {formVisible && (
        <div className="modal-overlay">
          <div className="modal-content">
            <h3>{editando !== null ? "Editar Usuario" : "Nuevo Usuario"}</h3>
            <label>Nombre</label>
            <input
              name="nombre"
              placeholder="Nombre"
              value={formData.nombre}
              onChange={handleInputChange}
            />
            <label>Apellido</label>
            <input
              name="apellido"
              placeholder="Apellido"
              value={formData.apellido}
              onChange={handleInputChange}
            />
            <label>Documento</label>
            <input
              name="documento"
              placeholder="DNI"
              value={formData.documento}
              onChange={handleInputChange}
            />
            <label>Usuario</label>
            <input
              name="usuario"
              placeholder="Usuario"
              value={formData.usuario}
              onChange={handleInputChange}
            />
            {editando === null && (
              <>
                <label>Contraseña</label>
                <input
                  name="password"
                  type="password"
                  placeholder="Contraseña"
                  value={formData.password}
                  onChange={handleInputChange}
                />
              </>
            )}
            <label>Creditos</label>
            <input
              name="creditos"
              type="number"
              placeholder="Créditos"
              value={formData.creditos}
              onChange={handleInputChange}
            />
            <div className="form-buttons">
              <button onClick={cerrarFormulario} className="btn-danger">
                Cancelar
              </button>
              <button onClick={guardarUsuario} className="btn-success">
                Guardar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default UsersPage;
