function generarCombinacionesUnicas(cantidad) {
  const combinaciones = new Set();

  while (combinaciones.size < cantidad) {
    const numeros = Array.from({ length: 90 }, (_, i) => i + 1);
    const mezcla = [];

    while (numeros.length > 0) {
      const idx = Math.floor(Math.random() * numeros.length);
      mezcla.push(numeros.splice(idx, 1)[0]);
    }

    const clave = mezcla.join(",");
    combinaciones.add(clave);
  }

  return Array.from(combinaciones).map((c) =>
    c.split(",").map((n) => parseInt(n, 10))
  );
}

const combinaciones = generarCombinacionesUnicas(100);

module.exports = {
  combinaciones,
};
