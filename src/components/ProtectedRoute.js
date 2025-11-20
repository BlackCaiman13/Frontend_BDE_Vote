import { Navigate } from 'react-router-dom';
import { useAdmin } from '@/contexts/AdminContext';

const ProtectedRoute = ({ children }) => {
  const { isAuthenticated } = useAdmin();

  if (!isAuthenticated) {
    return <Navigate to="/admin/login" replace />;
  }

  return children;
};

export default ProtectedRoute;
