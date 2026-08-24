import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useOps } from '../context/opsContextValue';
import { incidentApi, errorMessage } from '../services/api';
import StartMonitoringDialog from '../components/StartMonitoringDialog';
import { useVoiceAlerts } from '../hooks/useVoiceAlerts';
import {
  Page,
  Card,
  CardHeader,
  Button,
  SeverityBadge,
  StatTile,
  StatusDot,
  Banner,
  EmptyState,
  Spinner,
} from '../components/ui';
import {
  pct,
  signedPct,
  riskColour,
  severityMeta,
  relativeTime,
  FLIGHT_STATUS,
  CRITICAL_PHASES,
} from '../lib/risk';

/**
 * The Operations Control Centre board.
 *
 * Answers the only three questions that matter at a glance: what is being
 * watched, what is going wrong, and is the system itself actually working.
 * That last one is not decoration — a monitoring tool that has silently stopped
 * monitoring is more dangerous than no tool at all, so scheduler and model
 * health sit on the same screen as the flights.
 */
export default function OpsCenter() {
  const { summary, loading, error, lastUpdated, refresh, thresholds, pollSeconds } = useOps();
  const [dialogOpen, setDialogOpen] = useState(false);

  // Spoken escalations. Audio is a second channel for a room that is not
  // watching the board — everything announced is already on screen.
  const speech = useVoiceAlerts(summary?.incidents);
  const [notice, setNotice] = useState(null);
  const [busyId, setBusyId] = useState(null);

  const acknowledge = async (incident) => {
    setBusyId(incident._id);
    try {
      await incidentApi.acknowledge(incident._id);
      setNotice({ tone: 'success', text: `${incident.reference} acknowledged.` });
      await refresh();
    } catch (err) {
      setNotice({ tone: 'error', text: errorMessage(err) });
    } finally {
      setBusyId(null);
    }
  };

  if (loading && !summary) {
    return (
      <Page title="Operations Centre">
        <Spinner label="Connecting to the operations feed" />
      </Page>
    );
  }

  const counters = summary?.counters || {};
  const flights = summary?.flights || [];
  const incidents = summary?.incidents || [];
  const scheduler = summary?.scheduler;
  const mlService = summary?.mlService;

  const schedulerHealthy = scheduler?.running;
  const mlHealthy = mlService?.reachable;

  return (
    <Page
      title="Operations Centre"
      subtitle="Continuous flight-risk monitoring. Every tracked flight is re-scored on its interval against fresh weather, and anything that crosses the escalation thresholds is routed to the people who can act on it."
      actions={
        <>
          <span className="text-xs text-slate-500">
            {lastUpdated ? `Updated ${relativeTime(lastUpdated)}` : 'Awaiting first update'} · polls every {pollSeconds}s
          </span>
          {speech.supported && (
            <button
              onClick={speech.toggle}
              aria-pressed={speech.enabled}
              title={
                speech.enabled
                  ? 'Emergencies and alerts are announced aloud'
                  : 'Announce emergencies and alerts aloud'
              }
              className={`flex items-center gap-2 rounded-lg border px-3 py-2 text-sm font-semibold transition-all ${
                speech.enabled
                  ? 'border-emerald-500/50 bg-emerald-500/10 text-emerald-300'
                  : 'border-slate-700 text-slate-400 hover:text-white'
              }`}
            >
              <span aria-hidden>{speech.enabled ? '🔊' : '🔇'}</span>
              Voice {speech.enabled ? 'on' : 'off'}
            </button>
          )}
          <Button onClick={refresh}>Refresh</Button>
          <Button variant="primary" onClick={() => setDialogOpen(true)}>Monitor a flight</Button>
        </>
      }
    >
      {error && <Banner tone="error">{error}</Banner>}
      {notice && <Banner tone={notice.tone} onDismiss={() => setNotice(null)}>{notice.text}</Banner>}

      {speech.enabled && !speech.unlocked && (
        <Banner tone="warning">
          <strong>Voice alerts are armed but not yet audible.</strong> Browsers block speech
          until the page has been clicked. Click anywhere — or{' '}
          <button onClick={speech.test} className="font-semibold underline">
            play a test announcement
          </button>{' '}
          — to enable audio for this session.
        </Banner>
      )}

      {(!schedulerHealthy || !mlHealthy) && (
        <Banner tone="warning">
          <strong>Monitoring is degraded.</strong>{' '}
          {!schedulerHealthy && 'The monitoring scheduler is not running. '}
          {!mlHealthy && `The risk model is unreachable — ${mlService?.error || 'no response'}. `}
          Risk figures on this board may be stale.
        </Banner>
      )}

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatTile label="Flights monitored" value={counters.monitored ?? 0} hint="scheduled and in flight" />
        <StatTile
          label="Above action threshold"
          value={counters.atRisk ?? 0}
          colour={counters.atRisk ? '#ec835a' : '#ffffff'}
          hint={`risk ≥ ${pct(thresholds?.highRisk ?? 0.7, 0)}`}
        />
        <StatTile
          label="Open incidents"
          value={counters.openIncidents ?? 0}
          colour={counters.openIncidents ? '#d03b3b' : '#ffffff'}
          hint="awaiting acknowledgement"
        />
        <StatTile
          label="Acknowledged"
          value={counters.acknowledged ?? 0}
          hint="being worked, not yet closed"
        />
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-x-6 gap-y-2 rounded-xl border border-slate-800 bg-slate-900/40 px-5 py-3">
        <StatusDot
          colour={schedulerHealthy ? '#0ca30c' : '#d03b3b'}
          label={schedulerHealthy ? `Scheduler running · ${scheduler.tickSeconds}s tick` : 'Scheduler stopped'}
        />
        <StatusDot
          colour={mlHealthy ? '#0ca30c' : '#d03b3b'}
          label={mlHealthy ? `Risk model online · ${mlService.model_version}` : 'Risk model unreachable'}
        />
        <span className="text-xs text-slate-500 tabular-nums">
          {scheduler?.cycles ?? 0} cycles · {scheduler?.checks ?? 0} evaluations · {scheduler?.incidents ?? 0} incidents raised
          {scheduler?.failures ? ` · ${scheduler.failures} failures` : ''}
        </span>
      </div>

      {/* ── Active incidents ─────────────────────────────────────────────── */}
      <Card className="mt-8">
        <CardHeader
          title="Active incidents"
          hint="Escalations that no one has closed out yet."
          right={<Link to="/incidents" className="text-sm font-semibold text-indigo-400 hover:text-indigo-300">Full log →</Link>}
        />

        {incidents.length === 0 ? (
          <div className="px-6 py-10 text-center text-sm text-slate-500">
            No active incidents. Escalations appear here the moment the rules fire.
          </div>
        ) : (
          <ul className="divide-y divide-slate-700/40">
            {incidents.map((incident) => (
              <li key={incident._id} className="px-6 py-4">
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-3">
                      <SeverityBadge severity={incident.severity} />
                      <span className="font-semibold text-white">{incident.flightNumber || 'Unscheduled'}</span>
                      <span className="text-sm text-slate-500">{incident.route}</span>
                      <span className="font-mono text-xs text-slate-600">{incident.reference}</span>
                      {incident.status === 'acknowledged' && (
                        <span className="rounded-full border border-slate-600 px-2 py-0.5 text-[10px] font-bold tracking-wider text-slate-400 uppercase">
                          Acknowledged
                        </span>
                      )}
                    </div>

                    <p className="mt-2 text-sm text-slate-400">{incident.summary}</p>

                    <div className="mt-2 flex flex-wrap gap-x-5 gap-y-1 text-xs text-slate-500">
                      <span>Raised {relativeTime(incident.createdAt)}</span>
                      <span>Last seen {relativeTime(incident.lastTriggeredAt)}</span>
                      <span>
                        Notified:{' '}
                        {incident.notifications?.filter((n) => n.status === 'sent').length || 0}/
                        {incident.notifications?.length || 0} channels
                      </span>
                    </div>
                  </div>

                  <div className="flex shrink-0 items-center gap-3">
                    <div className="text-right">
                      <div className="text-2xl font-bold tabular-nums" style={{ color: riskColour(incident.riskProbability) }}>
                        {pct(incident.riskProbability)}
                      </div>
                      <div className="text-xs text-slate-500 capitalize">{incident.flightPhase}</div>
                    </div>

                    {incident.status === 'open' && (
                      <Button onClick={() => acknowledge(incident)} disabled={busyId === incident._id}>
                        {busyId === incident._id ? '…' : 'Acknowledge'}
                      </Button>
                    )}
                    <Link
                      to="/incidents"
                      className="rounded-lg border border-slate-700 px-3 py-2 text-sm font-semibold text-slate-300 hover:text-white"
                    >
                      Open
                    </Link>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </Card>

      {/* ── Monitored flights ────────────────────────────────────────────── */}
      <Card className="mt-8 overflow-hidden">
        <CardHeader title="Flights under monitoring" hint="Sorted by current risk, highest first." />

        {flights.length === 0 ? (
          <EmptyState title="Nothing is being monitored yet">
            Continuous monitoring is what turns a one-off prediction into an early warning.
            Add a flight and the server re-scores it on its own, whether or not this page is open.
          </EmptyState>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left whitespace-nowrap">
              <thead>
                <tr className="border-b border-slate-700 bg-slate-800/50 text-xs tracking-wider text-slate-400 uppercase">
                  <th className="p-4 font-semibold">Flight</th>
                  <th className="p-4 font-semibold">Route</th>
                  <th className="p-4 font-semibold">Phase</th>
                  <th className="p-4 font-semibold">Risk</th>
                  <th className="p-4 font-semibold">Trend</th>
                  <th className="p-4 font-semibold">Peak</th>
                  <th className="p-4 font-semibold">Status</th>
                  <th className="p-4 font-semibold">Next check</th>
                  <th className="p-4" />
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-700/40">
                {flights.map((flight) => {
                  const delta =
                    flight.previousProbability === null || flight.previousProbability === undefined
                      ? null
                      : flight.latestProbability - flight.previousProbability;
                  const status = FLIGHT_STATUS[flight.status] || FLIGHT_STATUS.scheduled;
                  const critical = CRITICAL_PHASES.includes(flight.currentPhase);

                  return (
                    <tr key={flight._id} className="transition-colors hover:bg-slate-700/20">
                      <td className="p-4 font-semibold text-white">{flight.flightNumber}</td>
                      <td className="p-4 text-sm text-slate-400">
                        {flight.departureCity} → {flight.arrivalCity}
                      </td>
                      <td className="p-4 text-sm capitalize">
                        <span className={critical ? 'font-semibold text-amber-300' : 'text-slate-400'}>
                          {flight.currentPhase}
                          {critical && <span className="ml-1 text-xs" aria-hidden>▲</span>}
                        </span>
                      </td>
                      <td className="p-4 font-bold tabular-nums" style={{ color: riskColour(flight.latestProbability ?? 0) }}>
                        {flight.latestProbability === null || flight.latestProbability === undefined
                          ? 'pending'
                          : pct(flight.latestProbability)}
                      </td>
                      <td className="p-4 text-sm tabular-nums">
                        {delta === null ? (
                          <span className="text-slate-600">—</span>
                        ) : (
                          <span style={{ color: delta > 0.01 ? '#ec835a' : delta < -0.01 ? '#0ca30c' : '#898781' }}>
                            {delta > 0.01 ? '↑' : delta < -0.01 ? '↓' : '→'} {signedPct(delta)}
                          </span>
                        )}
                      </td>
                      <td className="p-4 text-sm tabular-nums text-slate-400">{pct(flight.peakProbability)}</td>
                      <td className="p-4 text-sm">
                        <div className="flex items-center gap-2">
                          <StatusDot colour={status.colour} label={status.label} />
                          {flight.highestSeverity !== 'none' && (
                            <span
                              className="text-xs font-semibold"
                              style={{ color: severityMeta(flight.highestSeverity).colour }}
                              title={`Peak severity: ${severityMeta(flight.highestSeverity).label}`}
                            >
                              {severityMeta(flight.highestSeverity).glyph}
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="p-4 text-sm text-slate-500">
                        {flight.lastError ? (
                          <span className="text-red-400" title={flight.lastError}>check failed</span>
                        ) : (
                          relativeTime(flight.nextCheckAt)
                        )}
                      </td>
                      <td className="p-4">
                        <Link
                          to={`/flights/${flight._id}`}
                          className="text-sm font-semibold text-indigo-400 hover:text-indigo-300"
                        >
                          Detail →
                        </Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      <p className="mt-6 max-w-3xl text-xs leading-relaxed text-slate-600">
        AeroSafe is a decision-support layer for airline operations. It does not replace ATC, TCAS,
        GPWS, weather radar or commander authority, and it never contacts the flight deck — alerts
        are routed to the Operations Control Centre, the duty manager and the dispatcher, who hold
        the authority to act on them.
      </p>

      <StartMonitoringDialog
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        onCreated={() => {
          setNotice({ tone: 'success', text: 'Flight is now under continuous monitoring.' });
          refresh();
        }}
      />
    </Page>
  );
}
