import { useCallback, useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { reportApi, errorMessage } from '../services/api';
import { Page, Card, Button, Banner, Spinner } from '../components/ui';
import { pct } from '../lib/risk';

/**
 * The shareable operational risk advisory.
 *
 * Two audiences, one document. On screen it sits in the dark operations theme
 * like everything else; printed, it drops to ink on white via the rules in
 * index.css, because this is the one screen intended to leave the building.
 *
 * PDF is produced through the browser's own print pipeline rather than a
 * bundled generator. That is a deliberate trade: a client-side PDF library adds
 * ~350 KB and renders formatted documents poorly, while the browser already has
 * a typographically correct one that every reviewer knows how to drive.
 */

function Field({ label, value }) {
  if (value === null || value === undefined || value === '') return null;
  return (
    <div className="flex gap-3 py-1">
      <dt className="w-40 shrink-0 text-sm text-slate-500">{label}</dt>
      <dd className="text-sm font-medium text-slate-200">{value}</dd>
    </div>
  );
}

function Section({ number, title, children, note }) {
  return (
    <section className="print-block mt-8">
      <h2 className="border-b border-slate-700/60 pb-2 text-xs font-semibold tracking-[0.14em] text-slate-400 uppercase">
        {number}. {title}
      </h2>
      {note && <p className="mt-2 text-xs text-slate-500 italic">{note}</p>}
      <div className="mt-3">{children}</div>
    </section>
  );
}

export default function Report() {
  const params = useParams();
  const kind = params.incidentId ? 'incident' : 'flight';
  const id = params.incidentId || params.flightId;

  const [report, setReport] = useState(null);
  const [text, setText] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [notice, setNotice] = useState(null);
  const [sending, setSending] = useState(false);

  useEffect(() => {
    reportApi
      .get(kind, id)
      .then((r) => {
        setReport(r.data);
        setText(r.text);
      })
      .catch((err) => setError(errorMessage(err, 'Could not build this advisory.')))
      .finally(() => setLoading(false));
  }, [kind, id]);

  const emailOcc = useCallback(async () => {
    setSending(true);
    setNotice(null);
    try {
      const r = await reportApi.send(kind, id);
      const { delivered, attempted, results } = r.data;
      const failed = results.filter((x) => x.status !== 'sent');
      setNotice({
        tone: delivered === attempted ? 'success' : delivered ? 'warning' : 'error',
        text:
          `Advisory ${r.data.reference} sent to ${delivered} of ${attempted} contacts.` +
          (failed.length ? ` Failed: ${failed.map((f) => `${f.channel} (${f.detail})`).join('; ')}` : ''),
      });
    } catch (err) {
      setNotice({ tone: 'error', text: errorMessage(err, 'Could not send the advisory.') });
    } finally {
      setSending(false);
    }
  }, [kind, id]);

  const copyText = async () => {
    try {
      await navigator.clipboard.writeText(text);
      setNotice({ tone: 'success', text: 'Advisory copied to the clipboard.' });
    } catch {
      setNotice({ tone: 'error', text: 'Clipboard is blocked — use Download instead.' });
    }
  };

  /** The plain-text advisory as a real file, for systems that ingest text. */
  const downloadText = () => {
    const blob = new Blob([text], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${report.reference}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (loading) return <Page title="Operational advisory"><Spinner label="Building advisory" /></Page>;

  if (error) {
    return (
      <Page title="Operational advisory">
        <Banner tone="error">{error}</Banner>
        <Link to="/incidents" className="text-sm font-semibold text-indigo-400">← Back to the incident log</Link>
      </Page>
    );
  }

  const a = report.assessment;

  return (
    <Page
      title="Operational risk advisory"
      subtitle={`${report.reference} · a shareable summary for airline operations. This is not an ATC communication.`}
      actions={
        <div className="no-print flex flex-wrap items-center gap-3">
          <Button onClick={() => window.print()} title="Opens your browser's print dialog — choose 'Save as PDF'">
            Download PDF
          </Button>
          <Button onClick={downloadText}>Download text</Button>
          <Button onClick={copyText}>Copy</Button>
          <Button variant="primary" onClick={emailOcc} disabled={sending}>
            {sending ? 'Sending…' : 'Email OCC'}
          </Button>
        </div>
      }
    >
      {notice && (
        <div className="no-print">
          <Banner tone={notice.tone} onDismiss={() => setNotice(null)}>{notice.text}</Banner>
        </div>
      )}

      <Card className="print-sheet px-8 py-7">
        <header className="print-block border-b-2 border-slate-600 pb-4">
          <div className="text-[11px] font-semibold tracking-[0.18em] text-slate-500 uppercase">
            {report.originator}
          </div>
          <h1 className="mt-1 text-2xl font-bold text-white">Operational Risk Advisory</h1>
          <dl className="mt-3">
            <Field label="Report reference" value={report.reference} />
            <Field label="Issued" value={new Date(report.issuedAt).toUTCString()} />
            <Field
              label="Classification"
              value={`${a.severityLabel.toUpperCase()} — internal advisory`}
            />
          </dl>
        </header>

        <Section number="1" title="Flight">
          <dl>
            <Field label="Flight number" value={report.flight.number} />
            <Field label="Route" value={report.flight.route} />
            <Field label="Operator" value={report.flight.operator} />
            <Field label="Aircraft type" value={report.flight.aircraftType} />
            <Field label="Phase of flight" value={report.flight.phase} />
            <Field
              label="Scheduled departure"
              value={report.flight.scheduledDeparture ? new Date(report.flight.scheduledDeparture).toUTCString() : null}
            />
          </dl>
        </Section>

        <Section number="2" title="Risk assessment">
          <div className="print-emphasis text-4xl font-bold" style={{ color: '#d03b3b' }}>
            {pct(a.riskProbability)}
          </div>
          <dl className="mt-3">
            <Field label="Severity" value={a.severityLabel.toUpperCase()} />
            <Field label="Peak this flight" value={pct(a.peakProbability)} />
            <Field
              label="Nominal-day reference"
              value={a.baselineProbability !== null ? pct(a.baselineProbability) : null}
            />
            <Field label="Evaluated" value={new Date(a.evaluatedAt).toUTCString()} />
            <Field label="Model" value={a.modelVersion} />
            <Field label="Evaluations this flight" value={a.checkCount} />
          </dl>
        </Section>

        {report.reasons.length > 0 && (
          <Section number="3" title="Reason for advisory">
            <ol className="space-y-3">
              {report.reasons.map((r, i) => (
                <li key={i} className="text-sm">
                  <span className="print-emphasis font-semibold text-slate-100">{i + 1}. {r.label}</span>
                  <p className="mt-0.5 pl-5 text-slate-400">{r.detail}</p>
                </li>
              ))}
            </ol>
          </Section>
        )}

        {report.factors.length > 0 && (
          <Section
            number="4"
            title="Contributing conditions"
            note="Each figure is the risk this condition adds on its own, measured against the same aircraft in nominal conditions. Conditions overlap, so they do not sum to the total."
          >
            <table className="w-full text-sm">
              <tbody>
                {report.factors.map((f, i) => (
                  <tr key={i} className="border-b border-slate-800 last:border-0">
                    <td className="py-1.5 font-medium text-slate-200">{f.label}</td>
                    <td className="py-1.5 text-slate-400">{f.detail}</td>
                    <td className="print-emphasis py-1.5 text-right font-bold tabular-nums" style={{ color: '#d03b3b' }}>
                      +{pct(f.impact)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Section>
        )}

        {report.conditions.observation && (
          <Section number="5" title="Observation used">
            <dl>
              <Field
                label="Station"
                value={`${report.conditions.observation.station || report.conditions.observation.city} (${report.conditions.observation.field || 'departure'} field)`}
              />
              <Field
                label="Conditions"
                value={`${report.conditions.observation.weather_condition}, ${report.conditions.observation.visibility_km} km visibility`}
              />
              <Field
                label="Wind"
                value={`${report.conditions.observation.wind_speed_knots} kt / ${report.conditions.observation.wind_direction}°`}
              />
              <Field
                label="Temperature"
                value={`${report.conditions.observation.temperature_c} °C, precipitation ${report.conditions.observation.precipitation_mm} mm`}
              />
              <Field
                label="Turbulence"
                value={`${report.conditions.observation.turbulence_severity} (estimated, not a reported observation)`}
              />
              <Field label="Data source" value={report.conditions.source} />
            </dl>
          </Section>
        )}

        {report.recommendations.length > 0 && (
          <Section
            number="6"
            title="Recommended actions"
            note="Each option was applied to the flight and re-scored. The figures are model outputs, not estimates."
          >
            <ol className="space-y-4">
              {report.recommendations.map((r, i) => (
                <li key={i} className="text-sm">
                  <div className="flex flex-wrap items-baseline justify-between gap-2">
                    <span className="print-emphasis font-semibold text-slate-100">
                      {i + 1}. {r.action}
                      <span className="ml-2 text-xs font-normal text-slate-500">[{r.category}]</span>
                    </span>
                    <span className="tabular-nums text-slate-400">
                      {pct(r.riskBefore)} → <span className="print-emphasis font-bold" style={{ color: '#0ca30c' }}>{pct(r.riskAfter)}</span>
                    </span>
                  </div>
                  <p className="mt-0.5 pl-5 text-slate-400">{r.detail}</p>
                </li>
              ))}
            </ol>
          </Section>
        )}

        {report.distribution.length > 0 && (
          <Section number="7" title="Distribution">
            <ul className="space-y-1 text-sm text-slate-300">
              {report.distribution.map((d, i) => <li key={i}>— {d}</li>)}
            </ul>
          </Section>
        )}

        <footer className="print-block mt-10 rounded-lg border border-slate-700/60 bg-slate-900/40 px-5 py-4">
          <h2 className="text-xs font-semibold tracking-[0.14em] text-slate-400 uppercase">Disclaimer</h2>
          <p className="mt-2 text-xs leading-relaxed whitespace-pre-line text-slate-400">
            {report.disclaimer}
          </p>
        </footer>

        <p className="mt-6 text-center text-xs text-slate-600">
          End of advisory {report.reference}
        </p>
      </Card>

      <div className="no-print mt-6">
        <Link to="/incidents" className="text-sm font-semibold text-indigo-400 hover:text-indigo-300">
          ← Back to the incident log
        </Link>
      </div>
    </Page>
  );
}
