import { useContext } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { AuthContext } from '../context/authContextValue';

/**
 * Session state is resolved synchronously from the stored token, so there is no
 * loading gate here — an authenticated user never sees a flash of the login
 * screen, and an unauthenticated one is redirected immediately.
 */
export default function ProtectedRoute({ children }) {
  const { user } = useContext(AuthContext);
  const location = useLocation();

  if (!user) {
    // Remember where they were headed so the login page can send them back.
    return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  }

  return children;
}
