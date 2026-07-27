import { useContext } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { AuthContext } from '../context/authContextValue';
import { useOps } from '../context/opsContextValue';

const LINKS = [
  { to: '/', label: 'Ops Centre' },
  { to: '/assess', label: 'Assess Flight' },
  { to: '/incidents', label: 'Incidents' },
  { to: '/history', label: 'Assessment Log' },
  { to: '/settings', label: 'Alert Routing' },
];

export default function Navbar() {
  const { user, logout } = useContext(AuthContext);
  const { openIncidents } = useOps();
  const navigate = useNavigate();
  const location = useLocation();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const linkClass = (path) =>
    `text-sm font-semibold transition-all ${
      location.pathname === path
        ? 'border-b-2 border-indigo-500 pb-1 text-white'
        : 'text-slate-400 hover:text-white'
    }`;

  return (
    <nav className="sticky top-0 z-50 w-full border-b border-slate-800 bg-[#0B0F19]/85 backdrop-blur-md">
      <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-4 px-4 py-4 md:px-6">
        <Link to="/" className="group flex items-center gap-2">
          <svg
            className="h-7 w-7 text-indigo-500 drop-shadow-[0_0_10px_rgba(99,102,241,0.8)] transition-transform group-hover:-translate-y-0.5"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden
          >
            <path d="M17.8 19.2 16 11l3.5-3.5C21 6 21.5 4 21.5 4c0 0-2 .5-3.5 2L14.5 9.5l-8.2-1.8c-1.2-.3-2.3 0-2.8.8l-.5.5c-.3.4-.1 1 .4 1.2l6.1 2.4-3.5 3.5-2.8-.7c-.4-.1-.9 0-1.2.4l-.4.4c-.3.4-.1 1 .4 1.2l4.6 2.1 2.1 4.6c.2.5.8.7 1.2.4l.4-.4c.4-.3.5-.8.4-1.2l-.7-2.8 3.5-3.5 2.4 6.1c.2.5.8.7 1.2.4l.5-.5c.8-.5 1.1-1.6.8-2.8Z" />
          </svg>
          <span className="bg-gradient-to-r from-white to-slate-400 bg-clip-text text-xl font-extrabold tracking-tight text-transparent">
            Aero<span className="text-indigo-500">Safe</span>
          </span>
          <span className="ml-1 hidden rounded border border-slate-700 px-1.5 py-0.5 text-[10px] font-semibold tracking-wider text-slate-500 uppercase sm:inline">
            OCC
          </span>
        </Link>

        <div className="flex flex-wrap items-center gap-5">
          {user ? (
            <>
              {LINKS.map((link) => (
                <Link key={link.to} to={link.to} className={linkClass(link.to)}>
                  {link.label}
                  {link.to === '/incidents' && openIncidents > 0 && (
                    <span className="ml-1.5 rounded-full bg-red-500/20 px-1.5 py-0.5 text-[10px] font-bold text-red-300">
                      {openIncidents}
                    </span>
                  )}
                </Link>
              ))}

              <span className="hidden h-6 w-px bg-slate-700 md:block" />

              <div className="flex items-center gap-3">
                <span className="hidden text-sm text-slate-500 lg:block">{user.email || user.username}</span>
                <button
                  onClick={handleLogout}
                  className="rounded-lg border border-red-500/30 px-3 py-1.5 text-sm font-bold text-red-400 transition-all hover:border-red-500/50 hover:bg-red-500/10"
                >
                  Sign out
                </button>
              </div>
            </>
          ) : (
            <>
              <Link to="/login" className="text-sm font-semibold text-slate-300 hover:text-white">
                Sign In
              </Link>
              <Link
                to="/register"
                className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-bold text-white shadow-[0_0_15px_rgba(79,70,229,0.3)] transition-all hover:bg-indigo-500"
              >
                Create account
              </Link>
            </>
          )}
        </div>
      </div>
    </nav>
  );
}
