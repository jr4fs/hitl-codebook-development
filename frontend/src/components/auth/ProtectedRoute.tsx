import { Navigate, Outlet } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { IRootState } from '../../store/store';

export const ProtectedRoute = () => {
  const { user, accessToken } = useSelector((state: IRootState) => state.user);

  // If no user or token, redirect to login
  if (!user && !accessToken) {
    return <Navigate to="/login" replace />;
  }

  return <Outlet />;
};