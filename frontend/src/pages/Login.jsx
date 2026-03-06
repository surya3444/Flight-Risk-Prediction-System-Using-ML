import { useState, useContext } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';

export default function Login() {
  const [formData, setFormData] = useState({ email: '', password: '' });
  const [error, setError] = useState('');
  const { login } = useContext(AuthContext);
  const navigate = useNavigate();

  const handleChange = (e) => setFormData({ ...formData, [e.target.name]: e.target.value });

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await login(formData.email, formData.password);
      navigate('/'); 
    } catch (err) {
      setError(err.response?.data?.msg || 'Authentication failed. Verify credentials.');
    }
  };

  const inputStyle = "w-full p-3 mt-1 bg-slate-900/50 border border-slate-700 rounded-lg text-slate-200 placeholder-slate-500 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all";

  return (
    <div className="flex items-center justify-center min-h-screen bg-[#0B0F19] p-4 relative overflow-hidden">
      
      {/* Background Glow */}
      <div className="absolute top-0 left-0 w-[40%] h-[40%] bg-indigo-600/20 blur-[120px] rounded-full pointer-events-none"></div>
      <div className="absolute bottom-0 right-0 w-[40%] h-[40%] bg-blue-600/20 blur-[120px] rounded-full pointer-events-none"></div>

      <div className="relative z-10 w-full max-w-md p-8 border shadow-2xl bg-slate-800/40 backdrop-blur-xl border-slate-700/50 rounded-2xl">
        <div className="mb-8 text-center">
          <h2 className="text-3xl font-extrabold tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-white to-slate-400">
            System Access
          </h2>
          <p className="mt-2 text-sm text-slate-400">Authenticate to view flight telemetry.</p>
        </div>

        {error && (
          <div className="p-3 mb-6 text-sm border rounded-lg bg-red-900/20 border-red-500/50 text-red-400">
            ⚠️ {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="block text-xs font-medium tracking-wider uppercase text-slate-400">Network ID (Email)</label>
            <input type="email" name="email" required placeholder="operator@flightrisk.ai" onChange={handleChange} className={inputStyle} />
          </div>
          <div>
            <label className="block text-xs font-medium tracking-wider uppercase text-slate-400">Passphrase</label>
            <input type="password" name="password" required placeholder="••••••••" onChange={handleChange} className={inputStyle} />
          </div>
          <button 
            type="submit" 
            className="w-full py-3 mt-6 font-bold tracking-wide text-white transition-all rounded-lg shadow-lg bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-500 hover:to-blue-500 hover:shadow-[0_0_20px_rgba(79,70,229,0.4)]"
          >
            Establish Connection
          </button>
        </form>
        
        <p className="mt-6 text-sm text-center text-slate-500">
          No active clearance? <Link to="/register" className="font-semibold text-indigo-400 transition-colors hover:text-indigo-300">Request Access</Link>
        </p>
      </div>
    </div>
  );
}