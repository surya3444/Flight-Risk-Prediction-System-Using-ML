import { useState, useEffect } from 'react';
import api from '../services/api';

export default function History() {
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchHistory = async () => {
      try {
        const response = await api.get('/predict/history');
        setHistory(response.data.data);
      } catch (err) {
        setError(err.response?.data?.error || 'Failed to fetch telemetry logs.');
      } finally {
        setLoading(false);
      }
    };

    fetchHistory();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-[#0B0F19]">
        <div className="w-8 h-8 border-t-2 border-b-2 border-indigo-500 rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0B0F19] text-slate-200 p-4 md:p-8 relative overflow-hidden">
      
      {/* Background Glow Effects */}
      <div className="absolute top-[-10%] right-[-10%] w-[40%] h-[40%] bg-blue-600/10 blur-[120px] rounded-full pointer-events-none"></div>

      <div className="relative z-10 max-w-6xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-extrabold tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-white to-slate-400">
            Telemetry Log
          </h1>
          <p className="mt-2 text-slate-400">Historical database of processed flight risk predictions.</p>
        </div>

        {error && (
          <div className="p-4 mb-8 border rounded-lg bg-red-900/20 border-red-500/50 text-red-400 backdrop-blur-md">
            ⚠️ {error}
          </div>
        )}

        {history.length === 0 && !error ? (
          <div className="p-12 text-center border rounded-2xl bg-slate-800/40 border-slate-700/50 backdrop-blur-xl">
            <p className="text-lg text-slate-400">No telemetry data found in the database.</p>
            <p className="text-sm text-slate-500">Run a prediction on the dashboard to populate this log.</p>
          </div>
        ) : (
          <div className="overflow-x-auto border shadow-2xl rounded-xl bg-slate-800/40 backdrop-blur-xl border-slate-700/50">
            <table className="w-full text-left border-collapse whitespace-nowrap">
              <thead>
                <tr className="border-b bg-slate-800/50 border-slate-700">
                  <th className="p-4 text-xs font-semibold tracking-wider uppercase text-slate-400">Timestamp</th>
                  <th className="p-4 text-xs font-semibold tracking-wider uppercase text-slate-400">Carrier</th>
                  <th className="p-4 text-xs font-semibold tracking-wider uppercase text-slate-400">Airframe</th>
                  <th className="p-4 text-xs font-semibold tracking-wider uppercase text-slate-400">Phase</th>
                  <th className="p-4 text-xs font-semibold tracking-wider uppercase text-slate-400">Confidence</th>
                  <th className="p-4 text-xs font-semibold tracking-wider uppercase text-slate-400">System Output</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-700/50">
                {history.map((record) => (
                  <tr key={record._id} className="transition-colors hover:bg-slate-700/20">
                    <td className="p-4 text-sm font-medium text-slate-300">
                      {new Date(record.createdAt).toLocaleString()}
                    </td>
                    <td className="p-4 text-sm text-slate-400">{record.flightData.airline}</td>
                    <td className="p-4 text-sm text-slate-400">{record.flightData.aircraft_type}</td>
                    <td className="p-4 text-sm capitalize text-slate-400">{record.flightData.flight_phase}</td>
                    <td className="p-4 text-sm font-black text-white">
                      {(record.predictionResult.risk_probability * 100).toFixed(1)}%
                    </td>
                    <td className="p-4">
                      <span 
                        className={`px-3 py-1 text-xs font-bold rounded-full border ${
                          record.predictionResult.risk_prediction === 1 
                            ? 'bg-red-500/10 text-red-400 border-red-500/20 shadow-[0_0_10px_rgba(239,68,68,0.2)]' 
                            : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20 shadow-[0_0_10px_rgba(16,185,129,0.2)]'
                        }`}
                      >
                        {record.predictionResult.risk_prediction === 1 ? 'CRITICAL' : 'NOMINAL'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}