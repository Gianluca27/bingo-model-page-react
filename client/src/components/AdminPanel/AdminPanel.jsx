import React, { useState } from 'react';
import UsersPage from './UsersPage';
import GamesPage from './GamesPage';
import ConfigPage from '../ConfigPage/ConfigPage';
import LogsPage from '../LogsPage/LogsPage';
import CardsPage from './CardsPage';
import HistoryPage from '../HistoryPage/HistoryPage';
import EditCardModal from '../EditCardModal/EditCardModal';
import NewCardModal from '../NewCardModal/NewCardModal';
import CartonesModal from '../CartonesModal/CartonesModal';
import './AdminPanel.css';

const AdminPanel = () => {
  const [activeTab, setActiveTab] = useState('usuarios');

  const renderTab = () => {
    switch (activeTab) {
      case 'usuarios': return <UsersPage />;
      case 'partidas': return <GamesPage />;
      case 'config': return <ConfigPage />;
      case 'registros': return <LogsPage />;
      case 'cartones': return <CardsPage />;
      case 'historial': return <HistoryPage />;
      default: return null;
    }
  };

  return (
    <div className="admin-panel">
      <div className="admin-header">
        <button onClick={() => setActiveTab('usuarios')} className="btn-primary">Usuarios</button>
        <button onClick={() => setActiveTab('partidas')} className="btn-primary">Partidas</button>
        <button onClick={() => setActiveTab('config')} className="btn-primary">Configuración</button>
        <button onClick={() => setActiveTab('registros')} className="btn-primary">Registros</button>
        <button onClick={() => setActiveTab('cartones')} className="btn-primary">Cartones</button>
        <button onClick={() => setActiveTab('historial')} className="btn-primary">Historial</button>
        <button className="btn-danger" onClick={() => console.log('logout')}>Salir</button>
      </div>
      <div className="admin-content">
        {renderTab()}
        <EditCardModal />
        <NewCardModal />
        <CartonesModal />
      </div>
    </div>
  );
};

export default AdminPanel;
