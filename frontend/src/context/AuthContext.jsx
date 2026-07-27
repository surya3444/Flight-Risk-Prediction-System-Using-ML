import { useState, useCallback } from 'react';
import { jwtDecode } from 'jwt-decode';
import api from '../services/api';
import { AuthContext } from './authContextValue';

/** Returns the user claim from a token, or null if it is missing or expired. */
function userFromToken(token) {
  if (!token) return null;
  try {
    const decoded = jwtDecode(token);
    if (decoded.exp * 1000 < Date.now()) return null;
    return decoded.user;
  } catch {
    return null;
  }
}

export const AuthProvider = ({ children }) => {
  // Resolved from storage during the first render rather than in an effect, so
  // there is no frame where an authenticated user is treated as a guest — and
  // no "verifying session" flash on every page load.
  const [user, setUser] = useState(() => {
    const token = localStorage.getItem('token');
    const claim = userFromToken(token);
    // A token that is present but unusable is dropped so the next reload does
    // not retry it.
    if (token && !claim) localStorage.removeItem('token');
    return claim;
  });

  const logout = useCallback(() => {
    localStorage.removeItem('token');
    setUser(null);
  }, []);

  const login = async (email, password) => {
    const res = await api.post('/auth/login', { email, password });
    localStorage.setItem('token', res.data.token);
    setUser(jwtDecode(res.data.token).user);
  };

  const register = async (username, email, password, otp) => {
    const res = await api.post('/auth/register', { username, email, password, otp });
    localStorage.setItem('token', res.data.token);
    setUser(jwtDecode(res.data.token).user);
  };

  return (
    <AuthContext.Provider value={{ user, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
};
