import { useState, useContext } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import api from '../services/api';

export default function Register() {
  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState({ username: '', email: '', password: '', otp: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  
  const { register } = useContext(AuthContext);
  const navigate = useNavigate();

  const handleChange = (e) => setFormData({ ...formData, [e.target.name]: e.target.value });

  const handleSendOtp = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      await api.post('/auth/send-otp', { email: formData.email });
      setStep(2);
    } catch (err) {
      setError(err.response?.data?.msg || err.response?.data?.error || 'Failed to dispatch verification code.');
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      await register(formData.username, formData.email, formData.password, formData.otp);
      navigate('/'); 
    } catch (err) {
      setError(err.response?.data?.msg || 'Verification failed. Invalid or expired token.');
    } finally {
      setLoading(false);
    }
  };

  const inputStyle = "w-full p-3 mt-1 bg-slate-900/50 border border-slate-700 rounded-lg text-slate-200 placeholder-slate-500 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all";
  const labelStyle = "block text-xs font-medium tracking-wider uppercase text-slate-400";

  return (
    <div className="flex items-center justify-center min-h-screen bg-[#0B0F19] p-4 relative overflow-hidden">
      
      {/* Background Glow */}
      <div className="absolute top-0 right-0 w-[40%] h-[40%] bg-blue-600/20 blur-[120px] rounded-full pointer-events-none"></div>
      <div className="absolute bottom-0 left-0 w-[40%] h-[40%] bg-indigo-600/20 blur-[120px] rounded-full pointer-events-none"></div>

      <div className="relative z-10 w-full max-w-md p-8 border shadow-2xl bg-slate-800/40 backdrop-blur-xl border-slate-700/50 rounded-2xl">
        <div className="mb-8 text-center">
          <h2 className="text-3xl font-extrabold tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-white to-slate-400">
            {step === 1 ? 'Initialize Profile' : 'Verify Identity'}
          </h2>
          <p className="mt-2 text-sm text-slate-400">
            {step === 1 ? 'Create a secure operator account.' : 'Enter the secure token sent to your comms.'}
          </p>
        </div>
        
        {error && (
          <div className="p-3 mb-6 text-sm border rounded-lg bg-red-900/20 border-red-500/50 text-red-400">
            ⚠️ {error}
          </div>
        )}

        {/* STEP 1: Details */}
        {step === 1 && (
          <form onSubmit={handleSendOtp} className="space-y-5">
            <div>
              <label className={labelStyle}>Operator Alias</label>
              <input type="text" name="username" required placeholder="e.g., Maverick" value={formData.username} onChange={handleChange} className={inputStyle} />
            </div>
            <div>
              <label className={labelStyle}>Network ID (Email)</label>
              <input type="email" name="email" required placeholder="operator@flightrisk.ai" value={formData.email} onChange={handleChange} className={inputStyle} />
            </div>
            <div>
              <label className={labelStyle}>Passphrase</label>
              <input type="password" name="password" required placeholder="••••••••" value={formData.password} onChange={handleChange} className={inputStyle} />
            </div>
            <button 
              type="submit" 
              disabled={loading}
              className={`w-full py-3 mt-6 font-bold tracking-wide text-white transition-all rounded-lg shadow-lg ${loading ? 'bg-indigo-800/50 border border-indigo-500/30' : 'bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-500 hover:to-blue-500 hover:shadow-[0_0_20px_rgba(79,70,229,0.4)]'}`}
            >
              {loading ? 'Dispatching Token...' : 'Request Verification Token'}
            </button>
            <p className="mt-6 text-sm text-center text-slate-500">
              Active clearance? <Link to="/login" className="font-semibold text-indigo-400 transition-colors hover:text-indigo-300">Login Here</Link>
            </p>
          </form>
        )}

        {/* STEP 2: OTP */}
        {step === 2 && (
          <form onSubmit={handleRegister} className="space-y-5">
            <div className="p-4 border rounded-lg bg-indigo-900/20 border-indigo-500/30">
              <p className="text-sm text-center text-indigo-200">
                Secure token dispatched to <span className="font-bold text-white">{formData.email}</span>.
              </p>
            </div>
            <div>
              <label className={labelStyle}>6-Digit Security Token</label>
              <input 
                type="text" 
                name="otp" 
                required 
                placeholder="000000" 
                value={formData.otp}
                onChange={handleChange} 
                className={`${inputStyle} text-center text-2xl tracking-[0.5em] font-mono`}
                maxLength="6"
              />
            </div>
            <button 
              type="submit" 
              disabled={loading}
              className={`w-full py-3 mt-6 font-bold tracking-wide text-white transition-all rounded-lg shadow-lg ${loading ? 'bg-emerald-800/50 border border-emerald-500/30' : 'bg-gradient-to-r from-emerald-600 to-teal-500 hover:from-emerald-500 hover:to-teal-400 hover:shadow-[0_0_20px_rgba(16,185,129,0.4)]'}`}
            >
              {loading ? 'Authenticating...' : 'Confirm & Initialize'}
            </button>
            <button 
              type="button" 
              onClick={() => setStep(1)}
              className="w-full mt-4 text-sm transition-colors text-slate-500 hover:text-slate-300"
            >
              « Abort and change email
            </button>
          </form>
        )}
      </div>
    </div>
  );
}