import React, { useEffect, useState, useContext } from 'react';
import axios from 'axios';
import SocketContext from '../../services/socket';
import './UsersPage.css';

const UsersPage = () => {
  const socket = useContext(SocketContext);
  const [usuarios, setUsuarios] = useState([]);
  const [formVisible, setFormVisible] = useState(false);
  const [editando, setEditando] = useState(null);
  const [formData, setFormData] = useState({
    nombre: '',
    apellido: '',
    documento: '',
    usuario: '',
    password: '',
    rol: 'usuario',
    creditos: 0
  });

  const fetchUsuarios = async () => {
    const { data } = await axios.get('http://localhost:3001/admin/usuarios');
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
      setFormData({ ...usuario });
    } else {
      setEditando(null);
      setFormData({
        nombre: '',
        apellido: '',
        documento: '',
        usuario: '',
        password: '',
        rol: 'usuario',
        creditos: 0
      });
    }
    setFormVisible(true);
  };

  const cerrarFormulario = () => {
    setFormVisible(false);
    setEditando(null);
  };

  const guardarUsuario = async () => {
    const url = 'http://localhost:3001/modificar-usuario';
    const body = { ...formData, id: editando };
    await axios.post(url, body);
    fetchUsuarios();
    cerrarFormulario();
  };

  const eliminarUsuario = async (id) => {
    await axios.post('http://localhost:3001/eliminar-usuario', { id });
    fetchUsuarios();
  };

  return (
    <div className="users-page">
      <h3>Gestión de Usuarios</h3>
      <button onClick={() => abrirFormulario()} className="btn-success">+ Agregar Usuario</button>

      <table>
        <thead>
          <tr>
            <th>Nombre</th><th>Apellido</th><th>DNI</th><th>Usuario</th><th>Rol</th><th>Créditos</th><th>Acciones</th>
          </tr>
        </thead>
        <tbody>
          {usuarios.map((u) => (
            <tr key={u.id}>
              <td>{u.nombre}</td>
              <td>{u.apellido}</td>
              <td>{u.documento}</td>
              <td>{u.usuario}</td>
              <td>{u.rol}</td>
              <td>{u.creditos}</td>
              <td>
                <button onClick={() => abrirFormulario(u)} className="btn-primary">✏️</button>
                <button onClick={() => eliminarUsuario(u.id)} className="btn-danger">🗑️</button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {formVisible && (
        <div className="form-container">
          <h3>{editando ? 'Editar Usuario' : 'Nuevo Usuario'}</h3>
          <input name="nombre" placeholder="Nombre" value={formData.nombre} onChange={handleInputChange} />
          <input name="apellido" placeholder="Apellido" value={formData.apellido} onChange={handleInputChange} />
          <input name="documento" placeholder="DNI" value={formData.documento} onChange={handleInputChange} />
          <input name="usuario" placeholder="Usuario" value={formData.usuario} onChange={handleInputChange} />
          <input name="password" type="password" placeholder="Contraseña" value={formData.password} onChange={handleInputChange} />
          <select name="rol" value={formData.rol} onChange={handleInputChange}>
            <option value="usuario">Usuario</option>
            <option value="admin">Administrador</option>
          </select>
          <input name="creditos" type="number" placeholder="Créditos" value={formData.creditos} onChange={handleInputChange} />

          <div className="form-buttons">
            <button onClick={guardarUsuario} className="btn-success">Guardar</button>
            <button onClick={cerrarFormulario} className="btn-danger">Cancelar</button>
          </div>
        </div>
      )}
    </div>
  );
};

export default UsersPage;
