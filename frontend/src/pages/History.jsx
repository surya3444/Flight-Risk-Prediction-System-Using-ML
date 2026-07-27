import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { predictApi, errorMessage } from '../services/api';
import { Page, Card, Banner, Spinner, EmptyState, SeverityBadge } from '../components/ui';
import { pct, riskColour, severityMeta } from '../lib/risk';

/**
 * The manual assessment log — every deliberate scoring a dispatcher ran.
 * Automated monitoring checks live on each flight's own timeline instead, so
 * this stays a record of human decisions rather than machine noise.
 */
export default function History() {
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    predictApi
      .history()
      .then((response) => setHistory(response.data))
      .catch((err) => setError(errorMessage(err, 'Failed to load the assessment log.')))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return <Page title="Assessment log"><Spinner label="Loading assessments" /></Page>;
  }

  return (
    <Page
      title="Assessment log"
      subtitle="Every single-flight assessment run from the dashboard, with the escalation decision that followed."
    >
      {error && <Banner tone="error">{error}</Banner>}

      {history.length === 0 && !error ? (
        <EmptyState title="No assessments yet">
          Run one from the <Link to="/assess" className="font-semibold text-indigo-400">assessment page</Link> and it
          will appear here.
        </EmptyState>
      ) : (
        <Card className="overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left whitespace-nowrap">
              <thead>
                <tr className="border-b border-slate-700 bg-slate-800/50 text-xs tracking-wider text-slate-400 uppercase">
                  <th className="p-4 font-semibold">When</th>
                  <th className="p-4 font-semibold">Operator</th>
                  <th className="p-4 font-semibold">Airframe</th>
                  <th className="p-4 font-semibold">Phase</th>
                  <th className="p-4 font-semibold">Weather</th>
                  <th className="p-4 font-semibold">Risk</th>
                  <th className="p-4 font-semibold">Escalation</th>
                  <th className="p-4 font-semibold">Top factor</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-700/40">
                {history.map((record) => {
                  const probability = record.predictionResult.risk_probability;
                  const topFactor = record.contributingFactors?.[0];

                  return (
                    <tr key={record._id} className="transition-colors hover:bg-slate-700/20">
                      <td className="p-4 text-sm font-medium text-slate-300">
                        {new Date(record.createdAt).toLocaleString()}
                      </td>
                      <td className="p-4 text-sm text-slate-400">{record.flightData.airline}</td>
                      <td className="p-4 text-sm text-slate-400">{record.flightData.aircraft_type}</td>
                      <td className="p-4 text-sm text-slate-400 capitalize">{record.flightData.flight_phase}</td>
                      <td className="p-4 text-sm text-slate-400 capitalize">{record.flightData.weather_condition}</td>
                      <td className="p-4 text-sm font-bold tabular-nums" style={{ color: riskColour(probability) }}>
                        {pct(probability)}
                      </td>
                      <td className="p-4">
                        {record.incident ? (
                          <Link to="/incidents" className="inline-flex items-center gap-2">
                            <SeverityBadge severity={record.severity} />
                            <span className="font-mono text-xs text-slate-500">{record.incident.reference}</span>
                          </Link>
                        ) : (
                          <span className="text-xs text-slate-500">
                            {severityMeta(record.severity || 'none').label}
                            {record.severity && record.severity !== 'none' ? ' · not paged' : ''}
                          </span>
                        )}
                      </td>
                      <td className="p-4 text-sm text-slate-400">
                        {topFactor ? (
                          <span>
                            {topFactor.label}
                            <span className="ml-2 text-xs text-slate-600">+{pct(topFactor.impact)}</span>
                          </span>
                        ) : (
                          <span className="text-slate-600">—</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </Page>
  );
}
