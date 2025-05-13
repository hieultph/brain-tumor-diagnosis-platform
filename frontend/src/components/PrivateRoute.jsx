import { Navigate } from 'react-router-dom';
import { useAuthStore } from '../stores/authStore';

const ROLE_LEVELS = {
  'Visitor': 1,
  'Member': 2,
  'Researcher': 3,
  'Admin': 4
};

export default function PrivateRoute({ children, isAuthenticated, requiredRole }) {
  const user = useAuthStore(state => state.user);

  if (!isAuthenticated) {
    return <Navigate to="/login" />;
  }

  if (requiredRole) {
    const userRoleLevel = user?.role || 1;
    const requiredRoleLevel = ROLE_LEVELS[requiredRole];

    if (userRoleLevel < requiredRoleLevel) {
      return <Navigate to="/" />;
    }
  }

  return children;
}