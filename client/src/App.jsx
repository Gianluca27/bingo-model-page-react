import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
} from "react-router-dom";
import LoginForm from "./components/LoginForm/LoginForm";
import RegisterForm from "./components/RegisterForm/RegisterForm";
import WelcomePage from "./components/WelcomePage/WelcomePage";
import GamesPage from "./components/AdminPanel/GamesPage";
import UsersPage from "./components/AdminPanel/UsersPage";
import ConfigPage from "./components/ConfigPage/ConfigPage";
import LogsPage from "./components/LogsPage/LogsPage";
import CardsPage from "./components/CardsPage/CardsPage";
import HistoryPage from "./components/HistoryPage/HistoryPage";
import PrivateRoute from "./components/PrivateRoute/PrivateRoute";
import { AuthProvider } from "./context/AuthContext";
import AdminPanel from "./components/AdminPanel/AdminPanel";
import GamePlay from "./components/GamePlay/GamePlay";

const App = () => {
  return (
    <AuthProvider>
      <Router>
        <Routes>
          <Route path="/" element={<Navigate to="/login" replace />} />
          <Route path="/login" element={<LoginForm />} />
          <Route path="/register" element={<RegisterForm />} />
          <Route
            path="/welcome"
            element={
              <PrivateRoute>
                <WelcomePage />
              </PrivateRoute>
            }
          />
          <Route
            path="/gameplay"
            element={
              <PrivateRoute>
                <GamePlay />
              </PrivateRoute>
            }
          />
          <Route
            path="/admin/panel"
            element={
              <PrivateRoute>
                <AdminPanel />
              </PrivateRoute>
            }
          />
          <Route
            path="/admin/users"
            element={
              <PrivateRoute>
                <UsersPage />
              </PrivateRoute>
            }
          />
          <Route
            path="/admin/games"
            element={
              <PrivateRoute>
                <GamesPage />
              </PrivateRoute>
            }
          />
          <Route
            path="/admin/config"
            element={
              <PrivateRoute>
                <ConfigPage />
              </PrivateRoute>
            }
          />
          <Route
            path="/admin/logs"
            element={
              <PrivateRoute>
                <LogsPage />
              </PrivateRoute>
            }
          />
          <Route
            path="/admin/cards"
            element={
              <PrivateRoute>
                <CardsPage />
              </PrivateRoute>
            }
          />
          <Route
            path="/admin/history"
            element={
              <PrivateRoute>
                <HistoryPage />
              </PrivateRoute>
            }
          />
        </Routes>
      </Router>
    </AuthProvider>
  );
};

export default App;
