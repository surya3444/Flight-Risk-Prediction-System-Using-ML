import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { OpsProvider } from './context/OpsContext';
import Navbar from './components/Navbar';
import ProtectedRoute from './components/ProtectedRoute';

import Login from './pages/Login';
import Register from './pages/Register';
import OpsCenter from './pages/OpsCenter';
import FlightMonitor from './pages/FlightMonitor';
import Incidents from './pages/Incidents';
import AlertSettings from './pages/AlertSettings';
import Report from './pages/Report';
import Dashboard from './pages/Dashboard';
import History from './pages/History';

/**
 * Route map.
 *
 * "/" is the Operations Centre, not the prediction form — the standing view of
 * an operations tool is the live board; scoring a single flight is a task you
 * go and do.
 */
function App() {
  return (
    <AuthProvider>
      <OpsProvider>
        <Router>
          <Navbar />
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />

            <Route path="/" element={<ProtectedRoute><OpsCenter /></ProtectedRoute>} />
            <Route path="/assess" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
            <Route path="/flights/:id" element={<ProtectedRoute><FlightMonitor /></ProtectedRoute>} />
            <Route path="/incidents" element={<ProtectedRoute><Incidents /></ProtectedRoute>} />
            <Route path="/reports/incident/:incidentId" element={<ProtectedRoute><Report /></ProtectedRoute>} />
            <Route path="/reports/flight/:flightId" element={<ProtectedRoute><Report /></ProtectedRoute>} />
            <Route path="/history" element={<ProtectedRoute><History /></ProtectedRoute>} />
            <Route path="/settings" element={<ProtectedRoute><AlertSettings /></ProtectedRoute>} />

            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </Router>
      </OpsProvider>
    </AuthProvider>
  );
}

export default App;
