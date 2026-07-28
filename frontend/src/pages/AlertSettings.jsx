import { useEffect, useState } from 'react';
import { settingsApi, errorMessage } from '../services/api';
import { useOps } from '../context/opsContextValue';
import { Page, Card, CardHeader, Button, Banner, Spinner, SeverityBadge, inputClass, labelClass } from '../components/ui';
import { SEVERITY, pct } from '../lib/risk';

const ESCALATION_TIERS = ['watch', 'advisory', 'alert', 'emergency'];

/**
 * Alert routing.
 *
 * The readiness strip at the top is the important part: it shows which
 * escalation channels would actually reach a human right now. An escalation
 * path nobody has tested is not a path, so there is a drill button that fires a
 * clearly-labelled test alert down every configured channel.
 */
export default function AlertSettings() {
  const { policy } = useOps();

  const [form, setForm] = useState(null);
  const [readiness, setReadiness] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [notice, setNotice] = useState(null);

  useEffect(() => {
    settingsApi
      .get()
      .then((r) => {
        setForm(r.data);
        setReadiness(r.readiness);
      })
      .catch((err) => setNotice({ tone: 'error', text: errorMessage(err) }))
      .finally(() => setLoading(false));
  }, []);

  const set = (event) => {
    const { name, value, type, checked } = event.target;
    setForm((prev) => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : type === 'number' ? Number(value) : value,
    }));
  };

  const save = async (event) => {
    event.preventDefault();
    setSaving(true);
    setNotice(null);
    try {
      const response = await settingsApi.update(form);
      setForm(response.data);
      setReadiness(response.readiness);
      setNotice({ tone: 'success', text: 'Alert routing saved.' });
    } catch (err) {
      setNotice({ tone: 'error', text: errorMessage(err) });
    } finally {
      setSaving(false);
    }
  };

  /**
   * Proves the mailbox authenticates. Kept separate from the drill because a
   * bad Gmail App Password is by far the most common failure, and catching it
   * should not cost a send against the daily quota.
   */
  const verifySmtp = async () => {
    setVerifying(true);
    setNotice(null);
    try {
      const response = await settingsApi.verifySmtp();
      setNotice({
        tone: 'success',
        text: `Mail connection OK — authenticated as ${response.data.mailbox} via ${response.data.host}:${response.data.port}.`,
      });
    } catch (err) {
      setNotice({ tone: 'error', text: errorMessage(err, 'Mail connection failed.') });
    } finally {
      setVerifying(false);
    }
  };

  const runDrill = async () => {
    setTesting(true);
    setNotice(null);
    try {
      const response = await settingsApi.test('emergency');
      const { delivered, attempted, notifications } = response.data;
      const failures = notifications.filter((n) => n.status !== 'sent');

      setNotice({
        tone: delivered === attempted ? 'success' : delivered > 0 ? 'warning' : 'error',
        text:
          `Drill sent on ${delivered} of ${attempted} channels.` +
          (failures.length
            ? ` Not delivered: ${failures.map((f) => `${f.channel} (${f.detail})`).join('; ')}`
            : ''),
      });
    } catch (err) {
      setNotice({ tone: 'error', text: errorMessage(err) });
    } finally {
      setTesting(false);
    }
  };

  if (loading || !form) {
    return <Page title="Alert routing"><Spinner label="Loading alert settings" /></Page>;
  }

  const readinessRows = [
    ['Dispatcher email', readiness?.dispatcher, 'Receives advisories and above'],
    ['Duty manager email', readiness?.dutyManagerEmail, 'Receives alerts and emergencies'],
    ['Duty manager SMS', readiness?.dutyManagerSms, 'Paged on emergencies only'],
    ['OCC feed webhook', readiness?.occWebhook, 'Pushes alerts to an existing OCC dashboard'],
  ];

  return (
    <Page
      title="Alert routing"
      subtitle="Who gets told when a flight escalates. Alerts go to airline operations — never to the flight deck."
      actions={
        <Button onClick={runDrill} disabled={testing}>
          {testing ? 'Sending drill…' : 'Send test alert'}
        </Button>
      }
    >
      {notice && <Banner tone={notice.tone} onDismiss={() => setNotice(null)}>{notice.text}</Banner>}

      <Card className="mb-6">
        <CardHeader
          title="Escalation readiness"
          hint="Which channels would actually reach someone right now."
        />
        <div className="grid grid-cols-1 gap-px bg-slate-700/40 sm:grid-cols-2 lg:grid-cols-4">
          {readinessRows.map(([label, ready, hint]) => (
            <div key={label} className="bg-[#0F1523] px-5 py-4">
              <div className="flex items-center gap-2">
                <span
                  className="h-2 w-2 rounded-full"
                  style={{ backgroundColor: ready ? '#0ca30c' : '#898781' }}
                  aria-hidden
                />
                <span className="text-sm font-semibold text-slate-200">{label}</span>
              </div>
              <div className="mt-1 text-xs" style={{ color: ready ? '#0ca30c' : '#898781' }}>
                {ready ? '✓ Ready' : '— Not configured'}
              </div>
              <div className="mt-1 text-xs text-slate-600">{hint}</div>
            </div>
          ))}
        </div>

        {(!readiness?.emailGatewayConfigured || (form.smsEnabled && !readiness?.smsGatewayConfigured)) && (
          <div className="border-t border-slate-700/50 px-6 py-3 text-xs text-amber-400">
            {!readiness?.emailGatewayConfigured &&
              'Gmail SMTP is not configured on the server (GMAIL_USER and GMAIL_APP_PASSWORD). '}
            {form.smsEnabled && !readiness?.smsGatewayConfigured &&
              'SMS gateway is not configured on the server (TWILIO_* variables).'}
          </div>
        )}

        <div className="flex flex-wrap items-center gap-3 border-t border-slate-700/50 px-6 py-3">
          <Button onClick={verifySmtp} disabled={verifying} type="button">
            {verifying ? 'Checking…' : 'Test mail connection'}
          </Button>
          <span className="text-xs text-slate-500">
            Authenticates against Gmail without sending anything — it does not touch your daily send quota.
          </span>
        </div>
      </Card>

      <form onSubmit={save}>
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          <Card>
            <CardHeader title="Operations contacts" hint="The people an escalation is routed to." />
            <div className="space-y-4 px-6 py-5">
              <div>
                <label className={labelClass} htmlFor="occName">Operations centre name</label>
                <input id="occName" name="occName" value={form.occName || ''} onChange={set} className={`${inputClass} mt-1`} />
              </div>
              <div>
                <label className={labelClass} htmlFor="dispatcherEmail">Dispatcher email</label>
                <input id="dispatcherEmail" type="email" name="dispatcherEmail" value={form.dispatcherEmail || ''} onChange={set} className={`${inputClass} mt-1`} />
              </div>
              <div>
                <label className={labelClass} htmlFor="dutyManagerEmail">Duty manager email</label>
                <input id="dutyManagerEmail" type="email" name="dutyManagerEmail" value={form.dutyManagerEmail || ''} onChange={set} className={`${inputClass} mt-1`} />
              </div>
              <div>
                <label className={labelClass} htmlFor="dutyManagerPhone">Duty manager phone (E.164)</label>
                <input id="dutyManagerPhone" name="dutyManagerPhone" placeholder="+919876543210" value={form.dutyManagerPhone || ''} onChange={set} className={`${inputClass} mt-1`} />
              </div>
              <div>
                <label className={labelClass} htmlFor="occWebhookUrl">OCC webhook URL (optional)</label>
                <input id="occWebhookUrl" name="occWebhookUrl" placeholder="https://occ.example.com/hooks/aerosafe" value={form.occWebhookUrl || ''} onChange={set} className={`${inputClass} mt-1`} />
                <p className="mt-1 text-xs text-slate-600">
                  Alerts are POSTed here as JSON so an existing operations dashboard can consume the feed.
                </p>
              </div>
            </div>
          </Card>

          <div className="space-y-6">
            <Card>
              <CardHeader title="Channels" />
              <div className="space-y-4 px-6 py-5">
                {[
                  ['emailEnabled', 'Email alerts', 'Dispatcher and duty manager notifications.'],
                  ['smsEnabled', 'SMS paging', 'Emergency-tier only. Requires a configured SMS gateway.'],
                ].map(([name, label, hint]) => (
                  <label key={name} className="flex cursor-pointer items-start gap-3">
                    <input
                      type="checkbox"
                      name={name}
                      checked={Boolean(form[name])}
                      onChange={set}
                      className="mt-1 h-4 w-4 accent-indigo-500"
                    />
                    <span>
                      <span className="block text-sm font-semibold text-slate-200">{label}</span>
                      <span className="block text-xs text-slate-500">{hint}</span>
                    </span>
                  </label>
                ))}

                <div>
                  <label className={labelClass} htmlFor="notifyFrom">Notify from severity</label>
                  <select id="notifyFrom" name="notifyFrom" value={form.notifyFrom} onChange={set} className={`${inputClass} mt-1`}>
                    {ESCALATION_TIERS.map((tier) => (
                      <option key={tier} value={tier} className="bg-slate-800">
                        {SEVERITY[tier].label} — {SEVERITY[tier].blurb}
                      </option>
                    ))}
                  </select>
                  <p className="mt-1 text-xs text-slate-600">
                    Anything below this still appears on the board and in the incident log — it just does not page anyone.
                  </p>
                </div>
              </div>
            </Card>

            <Card>
              <CardHeader title="Thresholds" hint="Tune these to your fleet. Everything else follows the standing policy." />
              <div className="grid grid-cols-1 gap-4 px-6 py-5 sm:grid-cols-3">
                <div>
                  <label className={labelClass} htmlFor="highRiskThreshold">Action threshold</label>
                  <input id="highRiskThreshold" type="number" step="0.05" min="0.1" max="0.99" name="highRiskThreshold" value={form.highRiskThreshold} onChange={set} className={`${inputClass} mt-1`} />
                  <p className="mt-1 text-xs text-slate-600">Currently {pct(form.highRiskThreshold, 0)}</p>
                </div>
                <div>
                  <label className={labelClass} htmlFor="escalationDelta">Trend trigger</label>
                  <input id="escalationDelta" type="number" step="0.05" min="0.02" max="0.9" name="escalationDelta" value={form.escalationDelta} onChange={set} className={`${inputClass} mt-1`} />
                  <p className="mt-1 text-xs text-slate-600">Rise of {pct(form.escalationDelta, 0)} between checks</p>
                </div>
                <div>
                  <label className={labelClass} htmlFor="defaultIntervalMinutes">Default interval</label>
                  <input id="defaultIntervalMinutes" type="number" min="1" max="60" name="defaultIntervalMinutes" value={form.defaultIntervalMinutes} onChange={set} className={`${inputClass} mt-1`} />
                  <p className="mt-1 text-xs text-slate-600">Minutes between checks</p>
                </div>
              </div>
            </Card>
          </div>
        </div>

        <div className="mt-6 flex justify-end">
          <Button type="submit" variant="primary" disabled={saving}>
            {saving ? 'Saving…' : 'Save alert routing'}
          </Button>
        </div>
      </form>

      {/* The standing policy, read from the server so it cannot drift from what
          is actually enforced. */}
      <Card className="mt-8">
        <CardHeader
          title="Escalation policy"
          hint="How severity is decided. Three primary conditions coincide → full escalation."
        />
        <div className="px-6 py-5">
          <div className="mb-6 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {ESCALATION_TIERS.map((tier) => (
              <div key={tier} className="rounded-lg border border-slate-700/60 bg-slate-900/40 px-4 py-3">
                <SeverityBadge severity={tier} />
                <p className="mt-2 text-xs text-slate-400">{SEVERITY[tier].blurb}</p>
              </div>
            ))}
          </div>

          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-slate-700 text-xs tracking-wider text-slate-500 uppercase">
                <th className="py-2 pr-4">Rule</th>
                <th className="py-2">Type</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800">
              {(policy?.rules || []).map((rule) => (
                <tr key={rule.code}>
                  <td className="py-2.5 pr-4 text-slate-300">{rule.label}</td>
                  <td className="py-2.5 text-xs text-slate-500">
                    {rule.kind === 'primary' ? 'Primary — sets severity' : rule.bumps ? 'Secondary — raises one tier' : 'Secondary — context'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </Page>
  );
}
