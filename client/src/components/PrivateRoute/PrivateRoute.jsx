import { Navigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";

const PrivateRoute = ({ children }) => {
  const { user, isLoading } = useAuth();

  if (isLoading) return null; // o podés renderizar un spinner ⏳

  return user ? children : <Navigate to="/login" replace />;
};

export default PrivateRoute;
