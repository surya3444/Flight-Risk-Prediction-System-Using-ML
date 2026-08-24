import { severityMeta, bandFor, bandMeta, riskColour, pct, signedPct } from '../lib/risk';

/** The dark page shell every operations screen sits on. */
export function Page({ title, subtitle, actions, children }) {
  return (
    <div className="relative min-h-screen overflow-x-hidden bg-[#0B0F19] text-slate-200">
      <div className="pointer-events-none absolute top-[-10%] left-[-10%] h-[40%] w-[40%] rounded-full bg-indigo-600/15 blur-[120px]" />
      <div className="pointer-events-none absolute right-[-10%] bottom-[-10%] h-[40%] w-[40%] rounded-full bg-blue-600/10 blur-[120px]" />

      <div className="relative z-10 mx-auto max-w-7xl px-4 py-8 md:px-8">
        <header className="mb-8 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div>
            <h1 className="bg-gradient-to-r from-white to-slate-400 bg-clip-text text-3xl font-extrabold tracking-tight text-transparent">
              {title}
            </h1>
            {subtitle && <p className="mt-2 max-w-2xl text-sm text-slate-400">{subtitle}</p>}
          </div>
          {actions && <div className="flex flex-wrap items-center gap-3">{actions}</div>}
        </header>
        {children}
      </div>
    </div>
  );
}

export function Card({ children, className = '', ...rest }) {
  return (
    <div
      className={`rounded-2xl border border-slate-700/50 bg-slate-800/40 backdrop-blur-xl ${className}`}
      {...rest}
    >
      {children}
    </div>
  );
}

export function CardHeader({ title, hint, right }) {
  return (
    <div className="flex items-start justify-between gap-4 border-b border-slate-700/50 px-6 py-4">
      <div>
        <h2 className="text-xs font-semibold tracking-[0.14em] text-slate-400 uppercase">{title}</h2>
        {hint && <p className="mt-1 text-sm text-slate-500">{hint}</p>}
      </div>
      {right}
    </div>
  );
}

const BUTTON_VARIANTS = {
  primary:
    'bg-gradient-to-r from-indigo-600 to-blue-600 text-white border-indigo-500/50 hover:from-indigo-500 hover:to-blue-500',
  ghost: 'bg-slate-900/50 text-slate-300 border-slate-700 hover:border-slate-500 hover:text-white',
  danger: 'bg-red-500/10 text-red-300 border-red-500/40 hover:bg-red-500/20',
};

export function Button({ variant = 'ghost', className = '', ...rest }) {
  return (
    <button
      {...rest}
      className={`rounded-lg border px-4 py-2 text-sm font-semibold transition-all disabled:cursor-not-allowed disabled:opacity-50 ${BUTTON_VARIANTS[variant]} ${className}`}
    />
  );
}

/**
 * Severity as colour + glyph + word. Never colour alone — this is the same
 * badge an operator reads on a monochrome terminal.
 */
export function SeverityBadge({ severity, size = 'sm' }) {
  const meta = severityMeta(severity);
  const scale = size === 'lg' ? 'px-3 py-1.5 text-sm' : 'px-2.5 py-1 text-xs';

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border font-bold tracking-wide ${scale}`}
      style={{
        color: meta.colour,
        borderColor: `${meta.colour}55`,
        backgroundColor: `${meta.colour}18`,
      }}
    >
      <span aria-hidden>{meta.glyph}</span>
      {meta.label.toUpperCase()}
    </span>
  );
}

export function BandBadge({ probability }) {
  const meta = bandMeta(bandFor(probability));
  return (
    <span
      className="inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-bold"
      style={{ color: meta.colour, borderColor: `${meta.colour}55`, backgroundColor: `${meta.colour}18` }}
    >
      {meta.label.toUpperCase()}
    </span>
  );
}

export function StatusDot({ colour, label }) {
  return (
    <span className="inline-flex items-center gap-2 text-xs font-medium text-slate-300">
      <span className="h-2 w-2 rounded-full" style={{ backgroundColor: colour }} aria-hidden />
      {label}
    </span>
  );
}

/** A headline number. No plot, so no hover layer — just the figure and its label. */
export function StatTile({ label, value, hint, colour }) {
  return (
    <Card className="px-5 py-4">
      <div className="text-xs font-semibold tracking-[0.12em] text-slate-500 uppercase">{label}</div>
      <div className="mt-2 text-3xl font-bold" style={{ color: colour || '#ffffff' }}>
        {value}
      </div>
      {hint && <div className="mt-1 text-xs text-slate-500">{hint}</div>}
    </Card>
  );
}

/**
 * The current risk figure, with the bar reading against the two thresholds that
 * actually change what happens. A bare percentage does not tell a dispatcher
 * whether they are near an action line; this does.
 */
export function RiskGauge({ probability, thresholds, label = 'Current risk', compact = false }) {
  const value = probability ?? 0;
  const colour = riskColour(value);
  const high = thresholds?.highRisk ?? 0.7;
  const elevated = thresholds?.elevatedRisk ?? 0.55;

  return (
    <div>
      <div className="flex items-baseline justify-between gap-3">
        <span className="text-xs font-semibold tracking-[0.12em] text-slate-500 uppercase">{label}</span>
        <BandBadge probability={value} />
      </div>

      <div className={`mt-2 font-bold tabular-nums ${compact ? 'text-3xl' : 'text-5xl'}`} style={{ color: colour }}>
        {probability === null || probability === undefined ? '—' : pct(value)}
      </div>

      <div className="relative mt-4 h-2 w-full overflow-hidden rounded-full bg-slate-900/80">
        <div
          className="h-full rounded-full transition-[width] duration-500"
          style={{ width: `${Math.min(value, 1) * 100}%`, backgroundColor: colour }}
        />
        {[
          { at: elevated, title: `Elevated ${pct(elevated, 0)}` },
          { at: high, title: `Action ${pct(high, 0)}` },
        ].map((mark) => (
          <span
            key={mark.title}
            title={mark.title}
            className="absolute top-0 h-full w-0.5 bg-slate-300/70"
            style={{ left: `${mark.at * 100}%` }}
          />
        ))}
      </div>

      <div className="mt-2 flex justify-between text-[11px] text-slate-500 tabular-nums">
        <span>0%</span>
        <span>elevated {pct(elevated, 0)}</span>
        <span>action {pct(high, 0)}</span>
        <span>100%</span>
      </div>
    </div>
  );
}

/**
 * Risk contributors, ranked.
 *
 * The percentage is each condition's **standalone contribution**: how far it
 * lifts risk above this same aircraft on a nominal day, measured by re-scoring
 * with that one condition switched on. It is deliberately not a share of the
 * total — conditions overlap, so the parts do not sum to the whole, and
 * pretending otherwise would understate a storm sitting alongside severe
 * turbulence.
 *
 * `marginal` (how much removing it right now would recover) rides along in the
 * data and surfaces on hover, because on a saturated flight it is often near
 * zero and that is itself the useful signal: nothing you fix alone will help.
 */
export function FactorList({
  factors,
  baseline,
  emptyText = 'No single condition stands out — risk is driven by the overall picture.',
}) {
  if (!factors?.length) return <p className="text-sm text-slate-500">{emptyText}</p>;

  const max = Math.max(...factors.map((f) => f.impact), 0.01);

  return (
    <>
      <ul className="space-y-4">
        {factors.map((f) => {
          const colour = f.impact >= 0.3 ? '#d03b3b' : f.impact >= 0.15 ? '#ec835a' : '#fab219';

          return (
            <li
              key={f.feature}
              title={
                f.marginal !== undefined
                  ? `Removing this now would change risk by ${signedPct(f.marginal)} points`
                  : undefined
              }
            >
              <div className="flex items-baseline justify-between gap-3">
                <div className="min-w-0">
                  <span className="text-sm font-semibold text-slate-100">{f.label}</span>
                  {f.detail && <span className="ml-2 text-xs text-slate-500">{f.detail}</span>}
                </div>
                <span className="shrink-0 text-base font-bold tabular-nums" style={{ color: colour }}>
                  +{pct(f.impact, 0)}
                </span>
              </div>
              <div className="mt-1.5 h-2 w-full overflow-hidden rounded-full bg-slate-900/80">
                <div
                  className="h-full rounded-full transition-[width] duration-500"
                  style={{ width: `${Math.max((f.impact / max) * 100, 3)}%`, backgroundColor: colour }}
                />
              </div>
            </li>
          );
        })}
      </ul>

      {baseline !== null && baseline !== undefined && (
        <p className="mt-4 border-t border-slate-700/50 pt-3 text-xs text-slate-500">
          Measured against {pct(baseline, 0)} — what this same aircraft would carry on a nominal day.
          Conditions overlap, so these do not add up to the total risk.
        </p>
      )}
    </>
  );
}

/**
 * Recommended actions, ranked by measured effect.
 *
 * Every row was produced by applying that change to the flight and re-scoring
 * it, so "92% → 88%" is a model output, not a guess. Actions that would not
 * move the number are never shown — an advisory panel that pads itself with
 * ineffective advice teaches operators to skip it.
 *
 * The combined row matters most on a badly compromised flight: when several
 * conditions each independently hold risk high, no single action helps much and
 * only the stack does.
 */
export function RecommendationList({ recommendations, combined, phase }) {
  if (!recommendations?.length) {
    return (
      <p className="text-sm text-slate-500">
        No available action would materially reduce this risk
        {phase ? ` at the ${phase} stage` : ''}. Monitor and re-assess as conditions change.
      </p>
    );
  }

  return (
    <>
      <ol className="space-y-3">
        {recommendations.map((r, i) => (
          <li
            key={r.id}
            className="rounded-lg border border-slate-700/60 bg-slate-900/40 px-4 py-3"
          >
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-indigo-500/20 text-[11px] font-bold text-indigo-300">
                    {i + 1}
                  </span>
                  <span className="text-sm font-semibold text-slate-100">{r.action}</span>
                  <span className="rounded border border-slate-700 px-1.5 py-0.5 text-[10px] font-medium tracking-wider text-slate-500 uppercase">
                    {r.category}
                  </span>
                </div>
                <p className="mt-1.5 pl-7 text-xs leading-relaxed text-slate-400">{r.detail}</p>
              </div>

              <div className="shrink-0 text-right">
                <div className="text-sm tabular-nums">
                  <span className="text-slate-500">{pct(r.risk_before, 0)}</span>
                  <span className="mx-1.5 text-slate-600" aria-hidden>→</span>
                  <span className="font-bold" style={{ color: riskColour(r.risk_after) }}>
                    {pct(r.risk_after, 0)}
                  </span>
                </div>
                <div className="mt-0.5 text-xs font-semibold" style={{ color: '#0ca30c' }}>
                  −{pct(r.reduction, 0)} pts
                </div>
              </div>
            </div>
          </li>
        ))}
      </ol>

      {combined && (
        <div className="mt-4 rounded-lg border px-4 py-3" style={{ borderColor: '#0ca30c55', backgroundColor: '#0ca30c14' }}>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <span className="text-xs font-semibold tracking-[0.12em] uppercase" style={{ color: '#0ca30c' }}>
              All together
            </span>
            <span className="text-sm font-bold tabular-nums" style={{ color: riskColour(combined.risk_after) }}>
              {pct(combined.risk_after, 0)}
              <span className="ml-2 text-xs font-semibold" style={{ color: '#0ca30c' }}>
                −{pct(combined.reduction, 0)} pts
              </span>
            </span>
          </div>
          <p className="mt-1 text-xs text-slate-400">
            Taking {combined.actions.join(', ')} together.
          </p>
        </div>
      )}

      <p className="mt-4 border-t border-slate-700/50 pt-3 text-xs text-slate-500">
        Each figure is the risk the model returns after applying that change. Advisory only —
        the dispatcher and commander decide.
      </p>
    </>
  );
}

/** Which escalation rules fired, and the sentence explaining each. */
export function RuleList({ rules }) {
  if (!rules?.length) return <p className="text-sm text-slate-500">No escalation rules triggered.</p>;

  return (
    <ul className="space-y-3">
      {rules.map((rule) => (
        <li key={rule.code} className="flex gap-3">
          <span
            className="mt-1.5 h-2 w-2 shrink-0 rounded-full"
            style={{ backgroundColor: rule.kind === 'primary' ? '#d03b3b' : '#fab219' }}
            aria-hidden
          />
          <div>
            <div className="text-sm font-semibold text-slate-200">
              {rule.label}
              <span className="ml-2 text-[10px] font-medium tracking-wider text-slate-500 uppercase">
                {rule.kind}
              </span>
            </div>
            <p className="text-sm text-slate-400">{rule.detail}</p>
          </div>
        </li>
      ))}
    </ul>
  );
}

export function Banner({ tone = 'info', children, onDismiss }) {
  const tones = {
    info: { colour: '#3987e5', glyph: 'ℹ' },
    success: { colour: '#0ca30c', glyph: '✓' },
    warning: { colour: '#fab219', glyph: '▲' },
    error: { colour: '#d03b3b', glyph: '⛔' },
  };
  const t = tones[tone] || tones.info;

  return (
    <div
      role={tone === 'error' ? 'alert' : 'status'}
      className="mb-6 flex items-start gap-3 rounded-lg border px-4 py-3 text-sm"
      style={{ color: t.colour, borderColor: `${t.colour}55`, backgroundColor: `${t.colour}14` }}
    >
      <span aria-hidden className="text-base leading-5">{t.glyph}</span>
      <div className="flex-1 text-slate-200">{children}</div>
      {onDismiss && (
        <button onClick={onDismiss} className="text-slate-500 hover:text-slate-300" aria-label="Dismiss">
          ✕
        </button>
      )}
    </div>
  );
}

export function EmptyState({ title, children }) {
  return (
    <Card className="px-8 py-14 text-center">
      <p className="text-lg font-semibold text-slate-300">{title}</p>
      <div className="mx-auto mt-2 max-w-md text-sm text-slate-500">{children}</div>
    </Card>
  );
}

export function Spinner({ label = 'Loading' }) {
  return (
    <div className="flex items-center justify-center gap-3 py-16 text-sm text-slate-500">
      <span className="h-5 w-5 animate-spin rounded-full border-2 border-slate-700 border-t-indigo-500" />
      {label}
    </div>
  );
}

export const inputClass =
  'w-full rounded-lg border border-slate-700 bg-slate-900/50 p-3 text-slate-200 placeholder-slate-500 transition-all focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 focus:outline-none';

export const labelClass = 'block text-xs font-medium tracking-wider text-slate-400 uppercase';
