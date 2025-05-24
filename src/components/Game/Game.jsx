// src/components/Game.jsx
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import BingoCard from '../BingoCard/BingoCard';
import NumberCaller from '../NumberCaller/NumberCaller';
import { generateBingoCard } from '../../utils/generateBingoCard';
import { checkWin } from '../../utils/checkWin';
import { useAuth } from '../../context/AuthContext';
import './Game.css';

const Game = () => {
  const [card, setCard] = useState(generateBingoCard());
  const [markedNumbers, setMarkedNumbers] = useState([]);
  const [calledNumbers, setCalledNumbers] = useState([]);
  const [hasWon, setHasWon] = useState(false);

  const { logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const handleNumberClick = (number) => {
    if (!markedNumbers.includes(number)) {
      setMarkedNumbers([...markedNumbers, number]);
    }
  };

  const handleNumberCalled = (number) => {
    setCalledNumbers([...calledNumbers, number]);
  };

  useEffect(() => {
    if (checkWin(card, markedNumbers)) {
      setHasWon(true);
    }
  }, [markedNumbers, card]);

  return (
    <div className="game">
      <div className="game-header">
        <h1>Juego de Bingo</h1>
        <button className="logout-button" onClick={handleLogout}>Cerrar sesión</button>
      </div>
      <BingoCard card={card} markedNumbers={markedNumbers} onNumberClick={handleNumberClick} />
      <NumberCaller onNumberCalled={handleNumberCalled} />
      {hasWon && <div className="winner-message">¡Has ganado!</div>}
    </div>
  );
};

export default Game;
