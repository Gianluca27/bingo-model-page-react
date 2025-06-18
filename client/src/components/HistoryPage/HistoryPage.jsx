import React, { useEffect, useState } from "react";
import "./HistoryPage.css";
import axios from "axios";

const HistoryPage = () => {
  const [historial, setHistorial] = useState([]);
  const [error, setError] = useState(null);

  function dividirEnFilas(cartonPlano) {
    if (!Array.isArray(cartonPlano) || cartonPlano.length !== 27) return [];
    const filas = [];
    for (let i = 0; i < 3; i++) {
      filas.push(cartonPlano.slice(i * 9, (i + 1) * 9));
    }
    return filas;
  }

  useEffect(() => {
    axios
      .get("http://localhost:3001/api/historial")
      .then((res) => {
        const data = Array.isArray(res.data)
          ? res.data
          : Array.isArray(res.data.rows)
          ? res.data.rows
          : [];
        setHistorial(data);
      })
      .catch((err) => {
        console.error("Error cargando histórico de sorteos:", err);
        setError("No se pudo cargar el historial de sorteos.");
      });
  }, []);

  const formatFechaHora = (isoString) => {
    if (!isoString) return "";
    const date = new Date(isoString);
    const dia = String(date.getDate()).padStart(2, "0");
    const mes = String(date.getMonth() + 1).padStart(2, "0");
    const anio = String(date.getFullYear()).slice(2);
    const horas = String(date.getHours()).padStart(2, "0");
    const minutos = String(date.getMinutes()).padStart(2, "0");
    return `${dia}/${mes}/${anio} ${horas}:${minutos}`;
  };

  return (
    <div className="history-page">
      <div className="admin-content">
        <h2>Historial de Sorteos</h2>
        {error && <p className="error">{error}</p>}

        <div className="table-container">
          <table>
            <thead>
              <tr>
                <th>Fecha y Hora</th>
                <th>Bolillas</th>
                <th>Cartones</th>
                <th>Ganadores Línea</th>
                <th>Ganadores Bingo</th>
                <th>Ganadores Acumulado</th>
              </tr>
            </thead>
            <tbody>
              {Array.isArray(historial) && historial.length > 0 ? (
                historial.map((registro) => {
                  let bolillas = [];
                  let cartones = [];
                  let ganadoresLinea = [];
                  let ganadoresBingo = [];
                  let ganadoresAcumulado = [];

                  try {
                    bolillas = JSON.parse(registro.bolillas);
                  } catch {}
                  try {
                    cartones = JSON.parse(registro.cartones_jugados);
                  } catch {}
                  try {
                    ganadoresLinea = JSON.parse(registro.ganadores_linea);
                  } catch {}
                  try {
                    ganadoresBingo = JSON.parse(registro.ganadores_bingo);
                  } catch {}
                  try {
                    ganadoresAcumulado = JSON.parse(
                      registro.ganadores_acumulado
                    );
                  } catch {}

                  return (
                    <tr key={registro.id}>
                      <td>{formatFechaHora(registro.fecha_hora)}</td>
                      <td>{bolillas.join(", ")}</td>
                      <td>
                        {`Cartones: ${cartones.length}. Números: ${cartones
                          .map((c) =>
                            typeof c === "object" && c.numero ? c.numero : ""
                          )
                          .filter((n) => n !== "")
                          .join(", ")}`}
                      </td>
                      <td>
                        {ganadoresBingo
                          .map((g) => `${g.usuario} (#${g.numeroCarton})`)
                          .join("; ")}
                      </td>
                      <td>
                        {ganadoresAcumulado
                          .map((g) => `${g.usuario} (#${g.numeroCarton})`)
                          .join("; ")}
                      </td>
                      <td></td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td
                    colSpan="7"
                    style={{ textAlign: "center", padding: "1em" }}
                  >
                    {error
                      ? error
                      : "No hay sorteos en el historial para mostrar."}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default HistoryPage;
