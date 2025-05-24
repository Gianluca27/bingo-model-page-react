// src/components/NumberCaller.jsx
import React, { useState } from 'react';
import './NumberCaller.css';

const NumberCaller = ({ onNumberCalled }) => {
  const [calledNumbers, setCalledNumbers] = useState([]);

  const callNumber = () => {
    const availableNumbers = Array.from({ length: 75 }, (_, i) => i + 1).filter(
      (num) => !calledNumbers.includes(num)
    );
    if (availableNumbers.length === 0) return;

    const randomIndex = Math.floor(Math.random() * availableNumbers.length);
    const number = availableNumbers[randomIndex];
    setCalledNumbers([...calledNumbers, number]);
    onNumberCalled(number);
  };

  return (
    <div className="number-caller">
      <button onClick={callNumber}>Llamar Número</button>
      <div className="called-numbers">
        {calledNumbers.map((num, index) => (
          <span key={index}>{num}</span>
        ))}
      </div>
    </div>
  );
};

export default NumberCaller;
