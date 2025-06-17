import React, { useState } from "react";
import UsersPage from "./UsersPage";
import GamesPage from "./GamesPage";
import ConfigPage from "../ConfigPage/ConfigPage";
import LogsPage from "../LogsPage/LogsPage";
import CardsPage from "../CardsPage/CardsPage";
import HistoryPage from "../HistoryPage/HistoryPage";
import EditCardModal from "../EditCardModal/EditCardModal";
import NewCardModal from "../NewCardModal/NewCardModal";
import CartonesModal from "../CartonesModal/CartonesModal";
import "./AdminPanel.css";
import { useNavigate } from "react-router-dom";

const AdminPanel = () => {
  const [activeTab, setActiveTab] = useState("usuarios");
  const navigate = useNavigate();
  const renderTab = () => {
    switch (activeTab) {
      case "usuarios":
        return <UsersPage />;
      case "partidas":
        return <GamesPage />;
      case "config":
        return <ConfigPage />;
      case "registros":
        return <LogsPage />;
      case "cartones":
        return <CardsPage />;
      case "historial":
        return <HistoryPage />;
      default:
        return null;
    }
  };

  const handleBack = () => {
    navigate("/welcome");
  };

  return (
    <div className="admin-panel">
      <div className="admin-box">
        <div className="admin-header">
          <button
            onClick={() => setActiveTab("usuarios")}
            className="btn-primary"
          >
            Usuarios
          </button>
          <button
            onClick={() => setActiveTab("partidas")}
            className="btn-primary"
          >
            Partidas
          </button>
          <button
            onClick={() => setActiveTab("config")}
            className="btn-primary"
          >
            Configuración
          </button>
          <button
            onClick={() => setActiveTab("registros")}
            className="btn-primary"
          >
            Registros
          </button>
          <button
            onClick={() => setActiveTab("cartones")}
            className="btn-primary"
          >
            Cartones
          </button>
          <button
            onClick={() => setActiveTab("historial")}
            className="btn-primary"
          >
            Historial
          </button>
          <button className="btn-danger" onClick={handleBack}>
            Salir
          </button>
        </div>
        {renderTab()}
        <EditCardModal />
        <NewCardModal />
        <CartonesModal />
      </div>
    </div>
  );
};

export default AdminPanel;
