import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import Navbar from './components/Navbar';
import Login from './pages/Login';
import Register from './pages/Register';

import ProtectedRoute from './components/ProtectedRoute';

//Dashboard Import
import Dashboard from './pages/Dashboard';
import History from './pages/History'; 

function App() {
  // ... inside App component return:
  return (
    <AuthProvider>
      <Router>
        <Navbar />
        {/* Removed the background div here so the pages control their own styling */}
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
          <Route path="/history" element={<ProtectedRoute><History /></ProtectedRoute>} />
        </Routes>
      </Router>
    </AuthProvider>
  );
}

export default App;