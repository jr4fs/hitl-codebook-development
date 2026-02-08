import { useEffect, useRef } from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { IRootState } from '../../store/store';
import { clearUser } from '../../store/userSlice';
import { isTokenExpired } from '../../lib/auth';
import { toast } from '../../lib/toast';

export const ProtectedRoute = () => {
  const { user, accessToken } = useSelector((state: IRootState) => state.user);
  const dispatch = useDispatch();
  const notifiedRef = useRef(false);
  const isExpired = Boolean(accessToken && isTokenExpired(accessToken));

  useEffect(() => {
    if (isExpired && !notifiedRef.current) {
      notifiedRef.current = true;
      toast.info("Session expired. Please log in again.");
      dispatch(clearUser());
    }
  }, [dispatch, isExpired]);

  if (isExpired) {
    return <Navigate to="/login" replace />;
  }

  // If no user or token, redirect to login
  if (!user && !accessToken) {
    return <Navigate to="/login" replace />;
  }

  return <Outlet />;
};