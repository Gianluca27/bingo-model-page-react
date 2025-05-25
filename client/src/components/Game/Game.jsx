import React, { useEffect, useState, useContext } from 'react';
import './Game.css';
import socket from '../../services/socket';
import { useAuth } from '../../context/AuthContext';

const Game = () => {
    const { user } = useAuth();
    const [cartones, setCartones] = useState([]);
    const [infoPartida, setInfoPartida] = useState({});
    const [creditos, setCreditos] = useState(null);
    const [cantidad, setCantidad] = useState(1);

    useEffect(() => {
    socket.emit('loginUsuario', user.username);

    socket.on('recibirCartones', setCartones);
    socket.on('info-partida', setInfoPartida);
    socket.on('info-creditos', (data) => setCreditos(data.creditosUsuario));

    return () => {
      socket.off('recibirCartones');
      socket.off('info-partida');
      socket.off('info-creditos');
    };
  }, [user]);

  const solicitarCartones = () => {
    socket.emit('solicitarCartones', parseInt(cantidad));
  };

  return (
    <div className="game-container">
      <h1>Bienvenido {user.username} 🎉</h1>
      <div className="partida-info">
        <p>Hora Sorteo: {infoPartida.hora}</p>
        <p>Valor Cartón: ${infoPartida.valorCarton}</p>
        <p>Premio Línea: ${infoPartida.premioLinea}</p>
        <p>Premio Bingo: ${infoPartida.premioBingo}</p>
        <p>Premio Acumulado: ${infoPartida.premioAcumulado}</p>
        <p>Créditos: {creditos !== null ? creditos : 'Cargando...'}</p>
      </div>

      <div className="acciones-cartones">
        <label>¿Cuántos cartones? </label>
        <input
          type="number"
          min="1"
          max="12"
          value={cantidad}
          onChange={(e) => setCantidad(e.target.value)}
        />
        <button onClick={solicitarCartones}>A JUGAR</button>
      </div>

      <div className="cartones-lista">
        <h2>Tus Cartones</h2>
        <ul>
          {cartones.map((c, i) => (
            <li key={i}>Cartón #{c}</li>
          ))}
        </ul>
      </div>
    </div>
  );
};

export default Game;