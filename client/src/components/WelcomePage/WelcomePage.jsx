import React, { useEffect, useState, useContext } from 'react';
import './WelcomePage.css';
import SocketContext from '../../services/socket';

const WelcomePage = () => {
  const socket = useContext(SocketContext);
  const [texto, setTexto] = useState('');
  const [hora, setHora] = useState('');
  const [premios, setPremios] = useState({});
  const [mensajeGlobal, setMensajeGlobal] = useState('');

  useEffect(() => {
    fetch('http://localhost:3001/admin/config')
      .then(res => res.json())
      .then(data => {
        setPremios({
          valorCarton: data.valorCarton,
          premioLinea: data.premioLinea,
          premioBingo: data.premioBingo,
          premioAcumulado: data.premioAcumulado,
        });
        setHora(data.horaSorteo);
        setTexto(data.texto);
      });
  }, []);

  useEffect(() => {
    socket.on('mensaje-tiempo', setMensajeGlobal);
    return () => socket.off('mensaje-tiempo');
  }, [socket]);

  return (
    <section className="welco">
      <div className="mensaje-global">{mensajeGlobal}</div>
      <div className="info-recuadro">
        <h1>Bienvenido a BINGOMANIA</h1>
        <h1>VALOR DEL CARTON: ${premios.valorCarton}</h1>
        <h1>HORA DEL SORTEO: {hora}</h1>
        <h1>PREMIO LÍNEA: ${premios.premioLinea}</h1>
        <h1>PREMIO BINGO: ${premios.premioBingo}</h1>
        <h1>PREMIO ACUMULADO: ${premios.premioAcumulado}</h1>
      </div>
      <h2>{texto}</h2>
      <input type="number" id="cantidad-cartones" min="1" max="12" />
      <div className="btn-group">
        <button>A JUGAR</button>
        <button>CRÉDITOS</button>
        <button>COBRAR</button>
        <button>REGLAS</button>
        <button>SALIDA</button>
      </div>
    </section>
  );
};

export default WelcomePage;
