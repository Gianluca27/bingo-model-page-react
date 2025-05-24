// src/utils/generateBingoCard.js
export const generateBingoCard = () => {
  const card = [];
  const columns = [
    { start: 1, end: 15 },
    { start: 16, end: 30 },
    { start: 31, end: 45 },
    { start: 46, end: 60 },
    { start: 61, end: 75 },
  ];

  for (let col = 0; col < 5; col++) {
    const numbers = [];
    while (numbers.length < 5) {
      const num = Math.floor(Math.random() * (columns[col].end - columns[col].start + 1)) + columns[col].start;
      if (!numbers.includes(num)) {
        numbers.push(num);
      }
    }
    card.push(numbers);
  }

  // Transponer la matriz para obtener filas
  const transposedCard = card[0].map((_, rowIndex) => card.map((col) => col[rowIndex]));

  // Establecer la casilla central como "FREE"
  transposedCard[2][2] = 'FREE';

  return transposedCard;
};
