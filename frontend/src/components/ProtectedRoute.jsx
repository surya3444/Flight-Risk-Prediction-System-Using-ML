import { useContext } from 'react';
import { Navigate } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';

export default function ProtectedRoute({ children }) {
  const { user, loading } = useContext(AuthContext);

  // While checking the token in local storage, show a loading state
  // to prevent the app from instantly flashing to the login screen
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <p className="text-xl font-semibold text-gray-600">Verifying session...</p>
      </div>
    );
  }

  // If the loading is finished and there is no user, bounce them to login
  if (!user) {
    return <Navigate to="/login" replace />;
  }

  // If a user exists, render the component they requested
  return children;
}