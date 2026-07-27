import { useCallback, useEffect, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { monitorApi, incidentApi, errorMessage } from '../services/api';
import { useOps } from '../context/opsContextValue';
import RiskTimeline from '../components/RiskTimeline';
import {
  Page,
  Card,
  CardHeader,
  Button,
  Banner,
  Spinner,
  SeverityBadge,
  RiskGauge,
  FactorList,
  RuleList,
  StatusDot,
} from '../components/ui';
import { pct, relativeTime, clockTime, riskColour, FLIGHT_STATUS, severityMeta } from '../lib/risk';

const REFRESH_MS = 20000;

/**
 * One flight, over time.
 *
 * The trend is the point of this screen. A single number cannot tell a
 * dispatcher whether a flight is deteriorating or recovering, and that
 * direction is usually the more actionable fact.
 */
export default function FlightMonitor() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { thresholds, refresh: refreshOps } = useOps();

  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [notice, setNotice] = useState(null);
  const [checking, setChecking] = useState(false);

  const load = useCallback(async () => {
    try {
      const response = await monitorApi.get(id);
      setData(response.data);
      setError(null);
    } catch (err) {
      setError(errorMessage(err, 'Could not load this flight.'));
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    load();
    const timer = setInterval(load, REFRESH_MS);
    return () => clearInterval(timer);
  }, [load]);

  const checkNow = async () => {
    setChecking(true);
    setNotice(null);
    try {
      const response = await monitorApi.checkNow(id);
      const severity = response.data.severity;
      setNotice({
        tone: severity === 'none' ? 'success' : 'warning',
        text:
          severity === 'none'
            ? `Re-scored: ${pct(response.data.snapshot.riskProbability)}, no escalation conditions met.`
            : `Re-scored: ${pct(response.data.snapshot.riskProbability)} — ${severityMeta(severity).label} conditions.`,
      });
      await load();
      refreshOps();
    } catch (err) {
      setNotice({ tone: 'error', text: errorMessage(err) });
    } finally {
      setChecking(false);
    }
  };

  const setStatus = async (status) => {
    try {
      await monitorApi.update(id, { status });
      await load();
      refreshOps();
    } catch (err) {
      setNotice({ tone: 'error', text: errorMessage(err) });
    }
  };

  const remove = async () => {
    if (!window.confirm('Stop monitoring this flight and delete its risk history? Incidents are kept.')) return;
    try {
      await monitorApi.remove(id);
      refreshOps();
      navigate('/');
    } catch (err) {
      setNotice({ tone: 'error', text: errorMessage(err) });
    }
  };

  const acknowledge = async (incidentId) => {
    try {
      await incidentApi.acknowledge(incidentId);
      await load();
      refreshOps();
    } catch (err) {
      setNotice({ tone: 'error', text: errorMessage(err) });
    }
  };

  if (loading) {
    return <Page title="Flight monitor"><Spinner label="Loading flight" /></Page>;
  }

  if (error && !data) {
    return (
      <Page title="Flight monitor">
        <Banner tone="error">{error}</Banner>
        <Link to="/" className="text-sm font-semibold text-indigo-400">← Back to the Operations Centre</Link>
      </Page>
    );
  }

  const { flight, snapshots, incidents } = data;
  const latest = snapshots[snapshots.length - 1];
  const status = FLIGHT_STATUS[flight.status] || FLIGHT_STATUS.scheduled;
  const running = flight.status === 'active' || flight.status === 'scheduled';

  return (
    <Page
      title={flight.flightNumber}
      subtitle={`${flight.departureCity} → ${flight.arrivalCity} · departs ${new Date(flight.scheduledDeparture).toLocaleString()} · block ${flight.blockMinutes} min`}
      actions={
        <>
          <Button onClick={checkNow} disabled={checking || flight.status === 'completed'}>
            {checking ? 'Re-scoring…' : 'Check now'}
          </Button>
          {running ? (
            <Button onClick={() => setStatus('stopped')}>Pause monitoring</Button>
          ) : (
            flight.status !== 'completed' && (
              <Button variant="primary" onClick={() => setStatus('active')}>Resume monitoring</Button>
            )
          )}
          <Button variant="danger" onClick={remove}>Delete</Button>
        </>
      }
    >
      {notice && <Banner tone={notice.tone} onDismiss={() => setNotice(null)}>{notice.text}</Banner>}
      {flight.lastError && <Banner tone="warning"><strong>Last check failed:</strong> {flight.lastError}</Banner>}

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <Card className="px-6 py-5">
          <RiskGauge probability={flight.latestProbability} thresholds={thresholds} />
          <dl className="mt-6 space-y-2 border-t border-slate-700/50 pt-4 text-sm">
            {[
              ['Phase', <span className="capitalize">{flight.currentPhase}</span>],
              ['Peak risk', pct(flight.peakProbability)],
              ['Evaluations', flight.checkCount],
              ['Interval', `${flight.intervalMinutes} min`],
              ['Last check', relativeTime(flight.lastCheckedAt)],
              ['Next check', flight.nextCheckAt ? relativeTime(flight.nextCheckAt) : '—'],
            ].map(([label, value]) => (
              <div key={label} className="flex justify-between gap-4">
                <dt className="text-slate-500">{label}</dt>
                <dd className="font-medium text-slate-200">{value}</dd>
              </div>
            ))}
            <div className="flex justify-between gap-4">
              <dt className="text-slate-500">Status</dt>
              <dd><StatusDot colour={status.colour} label={status.label} /></dd>
            </div>
          </dl>
        </Card>

        <Card className="lg:col-span-2">
          <RiskTimeline
            snapshots={snapshots}
            thresholds={thresholds}
            title={`Risk trend — ${flight.flightNumber}`}
          />
        </Card>
      </div>

      <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader
            title="Why the model scored it this way"
            hint="Each factor is measured by re-scoring the flight with that one input set to nominal."
          />
          <div className="px-6 py-5">
            <FactorList factors={latest?.contributingFactors} />
          </div>
        </Card>

        <Card>
          <CardHeader title="Escalation rules on the last check" hint={`Evaluated ${relativeTime(latest?.createdAt)}.`} />
          <div className="px-6 py-5">
            <RuleList rules={latest?.triggeredRules} />
          </div>
        </Card>
      </div>

      {latest?.weather && (
        <Card className="mt-6">
          <CardHeader
            title={`Conditions used — ${latest.weather.station || latest.weather.city} (${latest.weather.field} field)`}
            hint={
              latest.weatherSource === 'stale'
                ? 'Weather feed unavailable — this evaluation reused the last known observation.'
                : `Observed ${relativeTime(latest.weather.observedAt)} · ${latest.weatherSource}`
            }
          />
          <div className="grid grid-cols-2 gap-px bg-slate-700/40 sm:grid-cols-4 lg:grid-cols-7">
            {[
              ['Condition', latest.weather.weather_condition],
              ['Visibility', `${latest.weather.visibility_km} km`],
              ['Wind', `${latest.weather.wind_speed_knots} kt / ${latest.weather.wind_direction}°`],
              ['Temp', `${latest.weather.temperature_c} °C`],
              ['Precip', `${latest.weather.precipitation_mm} mm`],
              ['Turbulence*', latest.weather.turbulence_severity],
              ['Season', latest.weather.season],
            ].map(([label, value]) => (
              <div key={label} className="bg-[#0F1523] px-4 py-3">
                <div className="text-[10px] tracking-wider text-slate-500 uppercase">{label}</div>
                <div className="mt-1 text-sm font-semibold text-slate-200 capitalize">{value}</div>
              </div>
            ))}
          </div>
          <p className="px-6 py-3 text-xs text-slate-600">
            * Turbulence is estimated from surface wind, gusts and convective activity — it is not a
            reported observation.
          </p>
        </Card>
      )}

      <Card className="mt-6">
        <CardHeader title="Incidents raised for this flight" />
        {incidents.length === 0 ? (
          <div className="px-6 py-8 text-center text-sm text-slate-500">
            No escalations for this flight.
          </div>
        ) : (
          <ul className="divide-y divide-slate-700/40">
            {incidents.map((incident) => (
              <li key={incident._id} className="flex flex-wrap items-center justify-between gap-4 px-6 py-4">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-3">
                    <SeverityBadge severity={incident.severity} />
                    <span className="font-mono text-xs text-slate-500">{incident.reference}</span>
                    <span className="text-xs text-slate-500">{clockTime(incident.createdAt)}</span>
                    <span className="rounded-full border border-slate-600 px-2 py-0.5 text-[10px] font-bold tracking-wider text-slate-400 uppercase">
                      {incident.status}
                    </span>
                  </div>
                  <p className="mt-1.5 text-sm text-slate-400">{incident.summary}</p>
                </div>
                <div className="flex items-center gap-3">
                  <span className="font-bold tabular-nums" style={{ color: riskColour(incident.riskProbability) }}>
                    {pct(incident.riskProbability)}
                  </span>
                  {incident.status === 'open' && (
                    <Button onClick={() => acknowledge(incident._id)}>Acknowledge</Button>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
      </Card>

      <Link to="/" className="mt-8 inline-block text-sm font-semibold text-indigo-400 hover:text-indigo-300">
        ← Back to the Operations Centre
      </Link>
    </Page>
  );
}
