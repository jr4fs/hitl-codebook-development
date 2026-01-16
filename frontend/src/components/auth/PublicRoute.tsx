import { Navigate, Outlet } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { IRootState } from '../../store/store';

export const PublicRoute = () => {
  const { user, accessToken } = useSelector((state: IRootState) => state.user);

  // If already logged in, redirect to landing page
  if (user && accessToken) {
    return <Navigate to="/" replace />;
  }

  return <Outlet />;
};