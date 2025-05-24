// src/components/BingoCard.jsx
import React from 'react';
import './BingoCard.css';

const BingoCard = ({ card, markedNumbers, onNumberClick }) => {
  return (
    <div className="bingo-card">
      {card.map((row, rowIndex) => (
        <div key={rowIndex} className="bingo-row">
          {row.map((number, colIndex) => (
            <div
              key={colIndex}
              className={`bingo-cell ${markedNumbers.includes(number) ? 'marked' : ''}`}
              onClick={() => onNumberClick(number)}
            >
              {number}
            </div>
          ))}
        </div>
      ))}
    </div>
  );
};

export default BingoCard;
