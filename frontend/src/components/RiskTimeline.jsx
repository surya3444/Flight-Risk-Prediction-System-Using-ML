import { useEffect, useMemo, useRef, useState } from 'react';
import { pct, riskColour, severityMeta, signedPct, clockTime } from '../lib/risk';

/**
 * Risk probability over the life of a flight.
 *
 * One series, so no legend box — the title names it. The two horizontal
 * reference lines are the thresholds that change what the system does, and they
 * are labelled directly on the plot rather than encoded in colour alone.
 * Snapshots that triggered an escalation carry a ring marker.
 *
 * Colours: series #3987e5 and the status steps, all ≥3:1 against the #0B0F19
 * chart surface.
 */

const SERIES = '#3987e5';
const GRID = '#1E293B';
const AXIS = '#334155';
const MUTED = '#898781';

const PAD = { top: 16, right: 64, bottom: 30, left: 44 };
const HEIGHT = 260;

function useMeasuredWidth() {
  const ref = useRef(null);
  const [width, setWidth] = useState(720);

  useEffect(() => {
    const node = ref.current;
    if (!node) return undefined;

    const observer = new ResizeObserver(([entry]) => {
      setWidth(Math.max(entry.contentRect.width, 280));
    });
    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  return [ref, width];
}

export default function RiskTimeline({ snapshots = [], thresholds = {}, title = 'Risk trend' }) {
  const [wrapRef, width] = useMeasuredWidth();
  const [hover, setHover] = useState(null);
  const [showTable, setShowTable] = useState(false);

  const high = thresholds.highRisk ?? 0.7;
  const elevated = thresholds.elevatedRisk ?? 0.55;

  const points = useMemo(() => {
    if (snapshots.length === 0) return [];

    const times = snapshots.map((s) => new Date(s.createdAt).getTime());
    const min = Math.min(...times);
    const max = Math.max(...times);
    // A single snapshot, or several inside the same instant, has no span to
    // scale against — pin it to the left edge rather than dividing by zero.
    const span = max - min || 1;

    const plotW = width - PAD.left - PAD.right;
    const plotH = HEIGHT - PAD.top - PAD.bottom;

    return snapshots.map((s, i) => ({
      snapshot: s,
      index: i,
      x: PAD.left + ((times[i] - min) / span) * plotW,
      y: PAD.top + (1 - Math.min(s.riskProbability, 1)) * plotH,
    }));
  }, [snapshots, width]);

  const plotW = width - PAD.left - PAD.right;
  const plotH = HEIGHT - PAD.top - PAD.bottom;
  const yFor = (p) => PAD.top + (1 - p) * plotH;

  const path = points.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ');

  const areaPath = points.length
    ? `${path} L${points[points.length - 1].x.toFixed(1)},${(PAD.top + plotH).toFixed(1)} L${points[0].x.toFixed(1)},${(PAD.top + plotH).toFixed(1)} Z`
    : '';

  /** Nearest point to the pointer — a bigger hit target than the marks themselves. */
  const onMove = (event) => {
    if (!points.length) return;
    const box = event.currentTarget.getBoundingClientRect();
    const x = event.clientX - box.left;

    let nearest = points[0];
    for (const p of points) {
      if (Math.abs(p.x - x) < Math.abs(nearest.x - x)) nearest = p;
    }
    setHover(nearest);
  };

  if (!snapshots.length) {
    return (
      <div className="px-6 py-12 text-center text-sm text-slate-500">
        No risk history yet. The first evaluation appears once the monitor runs.
      </div>
    );
  }

  const escalations = points.filter((p) => p.snapshot.severity && p.snapshot.severity !== 'none');

  return (
    <figure className="m-0">
      <figcaption className="flex items-center justify-between gap-4 px-6 pt-4 pb-2">
        <div>
          <h3 className="text-sm font-semibold text-slate-200">{title}</h3>
          <p className="text-xs text-slate-500">
            {snapshots.length} evaluations · peak {pct(Math.max(...snapshots.map((s) => s.riskProbability)))}
          </p>
        </div>
        <button
          onClick={() => setShowTable((v) => !v)}
          className="rounded-md border border-slate-700 px-2.5 py-1 text-xs text-slate-400 hover:text-white"
        >
          {showTable ? 'Show chart' : 'Show table'}
        </button>
      </figcaption>

      {showTable ? (
        <div className="max-h-72 overflow-auto px-6 pb-4">
          <table className="w-full text-left text-sm tabular-nums">
            <thead className="sticky top-0 bg-[#0B0F19]">
              <tr className="text-xs tracking-wider text-slate-500 uppercase">
                <th className="py-2 pr-4">Time</th>
                <th className="py-2 pr-4">Phase</th>
                <th className="py-2 pr-4">Risk</th>
                <th className="py-2 pr-4">Change</th>
                <th className="py-2">Severity</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800">
              {snapshots.map((s) => (
                <tr key={s._id}>
                  <td className="py-2 pr-4 text-slate-400">{clockTime(s.createdAt)}</td>
                  <td className="py-2 pr-4 text-slate-400 capitalize">{s.flightPhase}</td>
                  <td className="py-2 pr-4 font-semibold" style={{ color: riskColour(s.riskProbability) }}>
                    {pct(s.riskProbability)}
                  </td>
                  <td className="py-2 pr-4 text-slate-400">{signedPct(s.delta)}</td>
                  <td className="py-2 text-slate-400">{severityMeta(s.severity).label}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div ref={wrapRef} className="relative px-6 pb-4">
          <svg
            width={width}
            height={HEIGHT}
            role="img"
            aria-label={`Risk trend across ${snapshots.length} evaluations, peaking at ${pct(
              Math.max(...snapshots.map((s) => s.riskProbability))
            )}`}
            onMouseMove={onMove}
            onMouseLeave={() => setHover(null)}
          >
            {/* Recessive grid */}
            {[0, 0.25, 0.5, 0.75, 1].map((tick) => (
              <g key={tick}>
                <line
                  x1={PAD.left}
                  x2={PAD.left + plotW}
                  y1={yFor(tick)}
                  y2={yFor(tick)}
                  stroke={GRID}
                  strokeWidth="1"
                />
                <text x={PAD.left - 10} y={yFor(tick) + 4} textAnchor="end" fontSize="11" fill={MUTED}>
                  {tick * 100}%
                </text>
              </g>
            ))}

            {/* Threshold reference lines, labelled directly at the right edge */}
            {[
              { at: elevated, colour: '#fab219', label: 'Elevated' },
              { at: high, colour: '#ec835a', label: 'Action' },
            ].map((t) => (
              <g key={t.label}>
                <line
                  x1={PAD.left}
                  x2={PAD.left + plotW}
                  y1={yFor(t.at)}
                  y2={yFor(t.at)}
                  stroke={t.colour}
                  strokeWidth="1.5"
                  strokeDasharray="5 4"
                  opacity="0.75"
                />
                <text x={PAD.left + plotW + 8} y={yFor(t.at) + 4} fontSize="11" fill={t.colour} fontWeight="600">
                  {t.label}
                </text>
                <text x={PAD.left + plotW + 8} y={yFor(t.at) + 17} fontSize="10" fill={MUTED}>
                  {pct(t.at, 0)}
                </text>
              </g>
            ))}

            <line
              x1={PAD.left}
              x2={PAD.left + plotW}
              y1={yFor(0)}
              y2={yFor(0)}
              stroke={AXIS}
              strokeWidth="1"
            />

            <defs>
              <linearGradient id="risk-fill" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={SERIES} stopOpacity="0.28" />
                <stop offset="100%" stopColor={SERIES} stopOpacity="0" />
              </linearGradient>
            </defs>

            {points.length > 1 && <path d={areaPath} fill="url(#risk-fill)" />}
            <path d={path} fill="none" stroke={SERIES} strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" />

            {/* Escalations get a ring; a 2px surface ring keeps them legible where
                marks overlap the line. */}
            {escalations.map((p) => (
              <circle
                key={p.snapshot._id}
                cx={p.x}
                cy={p.y}
                r="5"
                fill={severityMeta(p.snapshot.severity).colour}
                stroke="#0B0F19"
                strokeWidth="2"
              />
            ))}

            {/* Single-point series still needs a visible mark */}
            {points.length === 1 && (
              <circle cx={points[0].x} cy={points[0].y} r="5" fill={SERIES} stroke="#0B0F19" strokeWidth="2" />
            )}

            {hover && (
              <g>
                <line
                  x1={hover.x}
                  x2={hover.x}
                  y1={PAD.top}
                  y2={PAD.top + plotH}
                  stroke={AXIS}
                  strokeWidth="1"
                />
                <circle
                  cx={hover.x}
                  cy={hover.y}
                  r="6"
                  fill={riskColour(hover.snapshot.riskProbability)}
                  stroke="#0B0F19"
                  strokeWidth="2"
                />
              </g>
            )}

            {/* Time axis: first, middle and last only — a tick per point is noise */}
            {[points[0], points[Math.floor(points.length / 2)], points[points.length - 1]]
              .filter((p, i, arr) => p && arr.indexOf(p) === i)
              .map((p) => (
                <text
                  key={p.snapshot._id}
                  x={Math.min(Math.max(p.x, PAD.left + 14), PAD.left + plotW - 14)}
                  y={HEIGHT - 10}
                  textAnchor="middle"
                  fontSize="11"
                  fill={MUTED}
                >
                  {clockTime(p.snapshot.createdAt)}
                </text>
              ))}
          </svg>

          {hover && (
            <div
              className="pointer-events-none absolute z-20 w-52 rounded-lg border border-slate-700 bg-[#0F1523] p-3 text-xs shadow-2xl"
              style={{
                left: Math.min(Math.max(hover.x - 80, 8), width - 216),
                top: Math.max(hover.y - 96, 4),
              }}
            >
              <div className="text-slate-500">{new Date(hover.snapshot.createdAt).toLocaleString()}</div>
              <div className="mt-1 text-xl font-bold tabular-nums" style={{ color: riskColour(hover.snapshot.riskProbability) }}>
                {pct(hover.snapshot.riskProbability)}
              </div>
              <dl className="mt-2 space-y-1 text-slate-400">
                <div className="flex justify-between gap-2">
                  <dt>Phase</dt>
                  <dd className="capitalize text-slate-300">{hover.snapshot.flightPhase}</dd>
                </div>
                <div className="flex justify-between gap-2">
                  <dt>Change</dt>
                  <dd className="tabular-nums text-slate-300">{signedPct(hover.snapshot.delta)}</dd>
                </div>
                <div className="flex justify-between gap-2">
                  <dt>Severity</dt>
                  <dd style={{ color: severityMeta(hover.snapshot.severity).colour }}>
                    {severityMeta(hover.snapshot.severity).label}
                  </dd>
                </div>
                {hover.snapshot.weatherSource && (
                  <div className="flex justify-between gap-2">
                    <dt>Weather</dt>
                    <dd className="text-slate-300">{hover.snapshot.weatherSource}</dd>
                  </div>
                )}
              </dl>
            </div>
          )}
        </div>
      )}
    </figure>
  );
}
