import { useContext } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';

export default function Navbar() {
  const { user, logout } = useContext(AuthContext);
  const navigate = useNavigate();
  const location = useLocation(); // To highlight the active tab

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const navLinkStyle = (path) => 
    `text-sm font-semibold transition-all ${
      location.pathname === path 
        ? 'text-white border-b-2 border-indigo-500 pb-1' 
        : 'text-slate-400 hover:text-white'
    }`;

  return (
    <nav className="sticky top-0 z-50 w-full border-b bg-[#0B0F19]/80 backdrop-blur-md border-slate-800">
      <div className="container flex items-center justify-between px-6 py-4 mx-auto max-w-7xl">
        
        {/* Logo */}
        <Link to="/" className="flex items-center gap-2 group">
          {/* Glowing SVG Airplane Icon */}
          <svg 
            className="w-7 h-7 text-indigo-500 transition-transform transform group-hover:-translate-y-1 group-hover:translate-x-1 drop-shadow-[0_0_10px_rgba(99,102,241,0.8)]" 
            viewBox="0 0 24 24" 
            fill="none" 
            stroke="currentColor" 
            strokeWidth="2" 
            strokeLinecap="round" 
            strokeLinejoin="round"
          >
            <path d="M17.8 19.2 16 11l3.5-3.5C21 6 21.5 4 21.5 4c0 0-2 .5-3.5 2L14.5 9.5l-8.2-1.8c-1.2-.3-2.3 0-2.8.8l-.5.5c-.3.4-.1 1 .4 1.2l6.1 2.4-3.5 3.5-2.8-.7c-.4-.1-.9 0-1.2.4l-.4.4c-.3.4-.1 1 .4 1.2l4.6 2.1 2.1 4.6c.2.5.8.7 1.2.4l.4-.4c.4-.3.5-.8.4-1.2l-.7-2.8 3.5-3.5 2.4 6.1c.2.5.8.7 1.2.4l.5-.5c.8-.5 1.1-1.6.8-2.8Z"/>
          </svg>
          <span className="text-xl font-extrabold tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-white to-slate-400">
            FlightRisk<span className="text-indigo-500">.ai</span>
          </span>
        </Link>

        {/* Navigation Links */}
        <div className="flex items-center gap-6">
          {user ? (
            <>
              <Link to="/" className={navLinkStyle('/')}>Dashboard</Link>
              <Link to="/history" className={navLinkStyle('/history')}>Telemetry Log</Link>
              
              <div className="w-px h-6 bg-slate-700"></div> {/* Divider */}
              
              <div className="flex items-center gap-4">
                <span className="hidden text-sm text-slate-500 md:block">{user.email}</span>
                <button 
                  onClick={handleLogout} 
                  className="px-4 py-1.5 text-sm font-bold text-red-400 transition-all border border-red-500/30 rounded-lg hover:bg-red-500/10 hover:border-red-500/50"
                >
                  Disconnect
                </button>
              </div>
            </>
          ) : (
            <>
              <Link to="/login" className="text-sm font-semibold text-slate-300 hover:text-white">Sign In</Link>
              <Link to="/register" className="px-4 py-2 text-sm font-bold text-white transition-all bg-indigo-600 rounded-lg hover:bg-indigo-500 shadow-[0_0_15px_rgba(79,70,229,0.3)]">
                Initialize System
              </Link>
            </>
          )}
        </div>
      </div>
    </nav>
  );
}