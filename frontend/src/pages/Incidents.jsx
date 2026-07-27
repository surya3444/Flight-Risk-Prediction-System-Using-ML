import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { incidentApi, errorMessage } from '../services/api';
import { useOps } from '../context/opsContextValue';
import {
  Page,
  Card,
  Button,
  Banner,
  Spinner,
  EmptyState,
  SeverityBadge,
  RuleList,
  FactorList,
} from '../components/ui';
import { pct, relativeTime, riskColour, severityMeta } from '../lib/risk';

const STATUS_FILTERS = [
  { key: '', label: 'All' },
  { key: 'open', label: 'Open' },
  { key: 'acknowledged', label: 'Acknowledged' },
  { key: 'resolved', label: 'Resolved' },
];

const CHANNEL_LABELS = {
  dispatcher: 'Dispatcher email',
  dutyManager: 'Duty manager email',
  dutyManagerSms: 'Duty manager SMS',
  occWebhook: 'OCC feed',
  log: 'Internal log',
};

/**
 * The incident log — the audit trail an examiner or a safety investigator reads
 * after the fact. Deliberately shows failed notification attempts alongside
 * successful ones: "we tried to page the duty manager and the SMS gateway was
 * down" is exactly the kind of fact a log exists to preserve.
 */
export default function Incidents() {
  const { refresh: refreshOps } = useOps();

  const [incidents, setIncidents] = useState([]);
  const [counts, setCounts] = useState({});
  const [status, setStatus] = useState('open');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [notice, setNotice] = useState(null);
  const [expanded, setExpanded] = useState(null);
  const [resolutionText, setResolutionText] = useState('');
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const response = await incidentApi.list(status ? { status } : {});
      setIncidents(response.data);
      setCounts(response.counts || {});
      setError(null);
    } catch (err) {
      setError(errorMessage(err, 'Could not load the incident log.'));
    } finally {
      setLoading(false);
    }
  }, [status]);

  useEffect(() => { load(); }, [load]);

  const act = async (fn, successText) => {
    setBusy(true);
    setNotice(null);
    try {
      await fn();
      setNotice({ tone: 'success', text: successText });
      setResolutionText('');
      await load();
      refreshOps();
    } catch (err) {
      setNotice({ tone: 'error', text: errorMessage(err) });
    } finally {
      setBusy(false);
    }
  };

  return (
    <Page
      title="Incident log"
      subtitle="Every escalation the system has raised, who it was routed to, whether it reached them, and how it was closed out."
      actions={<Button onClick={load}>Refresh</Button>}
    >
      {error && <Banner tone="error">{error}</Banner>}
      {notice && <Banner tone={notice.tone} onDismiss={() => setNotice(null)}>{notice.text}</Banner>}

      <div className="mb-6 flex flex-wrap gap-2">
        {STATUS_FILTERS.map((filter) => (
          <button
            key={filter.key}
            onClick={() => setStatus(filter.key)}
            className={`rounded-lg border px-4 py-2 text-sm font-semibold transition-all ${
              status === filter.key
                ? 'border-indigo-500 bg-indigo-600/20 text-white'
                : 'border-slate-700 text-slate-400 hover:text-white'
            }`}
          >
            {filter.label}
            {counts[filter.key] !== undefined && (
              <span className="ml-2 text-xs text-slate-500">{counts[filter.key]}</span>
            )}
          </button>
        ))}
      </div>

      {loading ? (
        <Spinner label="Loading incidents" />
      ) : incidents.length === 0 ? (
        <EmptyState title="No incidents to show">
          {status === 'open'
            ? 'Nothing is currently open. Escalations land here automatically when a monitored flight crosses the thresholds.'
            : 'Nothing matches this filter yet.'}
        </EmptyState>
      ) : (
        <div className="space-y-4">
          {incidents.map((incident) => {
            const open = expanded === incident._id;
            const sent = incident.notifications?.filter((n) => n.status === 'sent').length || 0;
            const failed = incident.notifications?.filter((n) => n.status === 'failed').length || 0;

            return (
              <Card key={incident._id} className="overflow-hidden">
                <button
                  onClick={() => setExpanded(open ? null : incident._id)}
                  className="flex w-full flex-wrap items-start justify-between gap-4 px-6 py-4 text-left hover:bg-slate-700/10"
                  aria-expanded={open}
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-3">
                      <SeverityBadge severity={incident.severity} />
                      <span className="font-semibold text-white">{incident.flightNumber || 'Unscheduled'}</span>
                      <span className="text-sm text-slate-500">{incident.route}</span>
                      <span className="font-mono text-xs text-slate-600">{incident.reference}</span>
                      <span
                        className={`rounded-full border px-2 py-0.5 text-[10px] font-bold tracking-wider uppercase ${
                          incident.status === 'open'
                            ? 'border-red-500/40 text-red-300'
                            : incident.status === 'acknowledged'
                              ? 'border-amber-500/40 text-amber-300'
                              : 'border-slate-600 text-slate-400'
                        }`}
                      >
                        {incident.status}
                      </span>
                    </div>

                    <p className="mt-2 text-sm text-slate-400">{incident.summary}</p>

                    <div className="mt-2 flex flex-wrap gap-x-5 gap-y-1 text-xs text-slate-500">
                      <span>Raised {relativeTime(incident.createdAt)}</span>
                      <span className={failed ? 'text-amber-400' : ''}>
                        {sent} delivered{failed ? `, ${failed} failed` : ''}
                      </span>
                      <span>{incident.source === 'monitor' ? 'Continuous monitoring' : 'Manual assessment'}</span>
                    </div>
                  </div>

                  <div className="flex shrink-0 items-center gap-4">
                    <div className="text-right">
                      <div className="text-2xl font-bold tabular-nums" style={{ color: riskColour(incident.riskProbability) }}>
                        {pct(incident.riskProbability)}
                      </div>
                      <div className="text-xs text-slate-500 capitalize">{incident.flightPhase}</div>
                    </div>
                    <span className="text-slate-500" aria-hidden>{open ? '▲' : '▼'}</span>
                  </div>
                </button>

                {open && (
                  <div className="border-t border-slate-700/50 px-6 py-5">
                    <div className="grid grid-cols-1 gap-8 lg:grid-cols-2">
                      <div>
                        <h3 className="mb-3 text-xs font-semibold tracking-[0.14em] text-slate-500 uppercase">
                          Why it escalated
                        </h3>
                        <RuleList rules={incident.triggeredRules} />

                        <h3 className="mt-6 mb-3 text-xs font-semibold tracking-[0.14em] text-slate-500 uppercase">
                          Top model factors
                        </h3>
                        <FactorList factors={incident.contributingFactors} />
                      </div>

                      <div>
                        <h3 className="mb-3 text-xs font-semibold tracking-[0.14em] text-slate-500 uppercase">
                          Notification trail
                        </h3>
                        <ul className="space-y-2">
                          {(incident.notifications || []).map((n, i) => (
                            <li key={i} className="flex items-start justify-between gap-3 rounded-lg bg-slate-900/50 px-3 py-2 text-sm">
                              <div>
                                <div className="font-medium text-slate-300">
                                  {CHANNEL_LABELS[n.channel] || n.channel}
                                </div>
                                <div className="text-xs text-slate-500">{n.target || n.detail}</div>
                              </div>
                              <span
                                className="shrink-0 text-xs font-bold"
                                style={{
                                  color:
                                    n.status === 'sent' ? '#0ca30c' : n.status === 'failed' ? '#d03b3b' : '#898781',
                                }}
                              >
                                {n.status === 'sent' ? '✓ sent' : n.status === 'failed' ? '✕ failed' : '— skipped'}
                              </span>
                            </li>
                          ))}
                        </ul>

                        <h3 className="mt-6 mb-3 text-xs font-semibold tracking-[0.14em] text-slate-500 uppercase">
                          Timeline
                        </h3>
                        <ul className="space-y-2 text-sm">
                          {(incident.updates || []).map((u, i) => (
                            <li key={i} className="flex gap-3">
                              <span className="w-16 shrink-0 text-xs text-slate-500 tabular-nums">
                                {new Date(u.at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                              </span>
                              <span className="text-slate-400">
                                {u.note} · {pct(u.riskProbability)}
                                <span className="ml-1.5" style={{ color: severityMeta(u.severity).colour }}>
                                  {severityMeta(u.severity).label}
                                </span>
                              </span>
                            </li>
                          ))}
                        </ul>

                        {incident.resolution && (
                          <div className="mt-6 rounded-lg border border-slate-700 bg-slate-900/50 px-4 py-3">
                            <div className="text-xs tracking-wider text-slate-500 uppercase">Resolution</div>
                            <p className="mt-1 text-sm text-slate-300">{incident.resolution}</p>
                          </div>
                        )}
                      </div>
                    </div>

                    {incident.status !== 'resolved' && (
                      <div className="mt-6 flex flex-wrap items-end gap-3 border-t border-slate-700/50 pt-5">
                        {incident.status === 'open' && (
                          <Button
                            disabled={busy}
                            onClick={() =>
                              act(() => incidentApi.acknowledge(incident._id), `${incident.reference} acknowledged.`)
                            }
                          >
                            Acknowledge
                          </Button>
                        )}

                        <Button
                          disabled={busy}
                          onClick={() =>
                            act(() => incidentApi.renotify(incident._id), 'Alert re-sent to the configured channels.')
                          }
                        >
                          Re-send alert
                        </Button>

                        <div className="flex min-w-[280px] flex-1 items-end gap-2">
                          <div className="flex-1">
                            <label className="block text-xs tracking-wider text-slate-500 uppercase" htmlFor={`res-${incident._id}`}>
                              Resolution note
                            </label>
                            <input
                              id={`res-${incident._id}`}
                              value={resolutionText}
                              onChange={(e) => setResolutionText(e.target.value)}
                              placeholder="What was actually done?"
                              className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-900/50 px-3 py-2 text-sm text-slate-200 placeholder-slate-600 focus:border-indigo-500 focus:outline-none"
                            />
                          </div>
                          <Button
                            variant="primary"
                            disabled={busy || !resolutionText.trim()}
                            onClick={() =>
                              act(
                                () => incidentApi.resolve(incident._id, resolutionText),
                                `${incident.reference} resolved.`
                              )
                            }
                          >
                            Resolve
                          </Button>
                        </div>
                      </div>
                    )}

                    {incident.flight && (
                      <Link
                        to={`/flights/${incident.flight._id || incident.flight}`}
                        className="mt-4 inline-block text-sm font-semibold text-indigo-400 hover:text-indigo-300"
                      >
                        View flight monitor →
                      </Link>
                    )}
                  </div>
                )}
              </Card>
            );
          })}
        </div>
      )}
    </Page>
  );
}
