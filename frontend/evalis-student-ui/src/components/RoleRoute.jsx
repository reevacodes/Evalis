import { Navigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export default function RoleRoute({ children, role }) {
  const { user, loading } = useAuth();

  if (loading) {
    return <div className="text-center mt-10 text-gray-400">Loading...</div>;
  }

  if (!user) return <Navigate to="/" />;

  if (user.role !== role) return <Navigate to="/" />;

  return children;
}
