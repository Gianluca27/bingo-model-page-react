// src/utils/checkWin.js
export const checkWin = (card, markedNumbers) => {
  // Verificar filas
  for (let row of card) {
    if (row.every((num) => num === 'FREE' || markedNumbers.includes(num))) {
      return true;
    }
  }

  // Verificar columnas
  for (let col = 0; col < 5; col++) {
    let win = true;
    for (let row = 0; row < 5; row++) {
      const num = card[row][col];
      if (num !== 'FREE' && !markedNumbers.includes(num)) {
        win = false;
        break;
      }
    }
    if (win) return true;
  }

  // Verificar diagonales
  let diag1 = true;
  let diag2 = true;
  for (let i = 0; i < 5; i++) {
    if (card[i][i] !== 'FREE' && !markedNumbers.includes(card[i][i])) {
      diag1 = false;
    }
    if (card[i][4 - i] !== 'FREE' && !markedNumbers.includes(card[i][4 - i])) {
      diag2 = false;
    }
  }

  return diag1 || diag2;
};
