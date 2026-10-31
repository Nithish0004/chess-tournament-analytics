import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

/**
 * Route guard component:
 * 1. Requires authenticated user; redirects to /login if unauthenticated.
 * 2. If allowedRoles list is provided, checks if user.role is in allowedRoles;
 *    if not allowed, redirects to /forbidden (friendly 403 page).
 */
export const ProtectedRoute = ({ children, allowedRoles }) => {
  const { isLoggedIn, user } = useAuth();
  const location = useLocation();

  if (!isLoggedIn) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (allowedRoles && allowedRoles.length > 0) {
    const userRole = user?.role?.toUpperCase();
    if (!userRole || !allowedRoles.includes(userRole)) {
      return <Navigate to="/forbidden" replace />;
    }
  }

  return children;
};

export default ProtectedRoute;
