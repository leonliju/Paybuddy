import { useEffect, useState } from 'react';
import API from '../services/api';

const fmt = n => '₹' + Number(n).toLocaleString('en-IN', { maximumFractionDigits: 0 });
const CATEGORIES = ['Food', 'Travel', 'Bills', 'Shopping', 'Education',
                    'Medical', 'Entertainment', 'Income', 'Other'];

const Icon = ({ name, className = '', fill = false }) => (
  <span
    className={`material-symbols-outlined ${className}`}
    style={{ fontVariationSettings: `'FILL' ${fill ? 1 : 0}` }}
  >
    {name}
  </span>
);

const CATEGORY_ICON = {
  Food: 'restaurant', Travel: 'directions_car', Bills: 'bolt',
  Shopping: 'shopping_cart', Education: 'school', Medical: 'medical_services',
  Entertainment: 'movie', Income: 'arrow_downward', Other: 'category',
};

const RISK_STYLE = {
  Saver:              { text: 'text-secondary',  label: 'Saver' },
  Balanced:            { text: 'text-primary',    label: 'Balanced' },
  'Risky Spender':     { text: 'text-primary',    label: 'Risky Spender' },
  'Impulsive Buyer':   { text: 'text-error',       label: 'Impulsive Buyer' },
};

const STATUS_STYLE = {
  ok:      { fill: 'bg-secondary',        text: 'text-secondary' },
  warning: { fill: 'bg-primary',          text: 'text-primary' },
  over:    { fill: 'bg-error',            text: 'text-error' },
};

export default function Health() {
  const [score, setScore] = useState(null);
  const [budgets, setBudgets] = useState([]);
  const [form, setForm] = useState({ category: 'Food', month: '', limit_amount: '' });
  const [msg, setMsg] = useState('');

  useEffect(() => {
    const m = new Date().toISOString().slice(0, 7);
    setForm(f => ({ ...f, month: m }));
    API.get('/health/score').then(r => setScore(r.data));
    API.get('/budget/status').then(r => setBudgets(r.data));
  }, []);

  const saveBudget = async (e) => {
    e.preventDefault(); setMsg('');
    try {
      await API.post('/budget/set', form);
      setMsg('✓ Budget saved');
      const res = await API.get('/budget/status');
      setBudgets(res.data);
    } catch { setMsg('✗ Failed to save'); }
  };

  const riskStyle = score ? (RISK_STYLE[score.risk_classification] || RISK_STYLE.Balanced) : null;
  const gaugeDeg = score ? Math.round((score.score / 100) * 360) : 0;

  return (
    <div className="dark bg-background text-on-surface font-body-md antialiased -m-6 p-container-padding min-h-screen">
      <header className="mb-stack-lg">
        <h1 className="font-headline-lg-mobile md:font-headline-lg text-headline-lg-mobile md:text-headline-lg text-on-surface tracking-tight">
          Financial Vitality
        </h1>
        <p className="text-on-surface-variant mt-2 max-w-xl text-body-md">
          Your budget health score against defined safety thresholds, and category-level spend tracking.
        </p>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-12 gap-stack-md">
        {/* Health Score Gauge */}
        <div className="md:col-span-5 bg-surface-container rounded-xl p-8 flex flex-col items-center justify-center sn-neo relative overflow-hidden min-h-[360px] border border-outline-variant/10">
          <div className="absolute inset-0 bg-gradient-to-br from-surface-container-high/50 to-transparent pointer-events-none" />
          <h2 className="font-label-sm text-label-sm text-on-surface-variant tracking-widest uppercase mb-8 z-10">
            Overall Health Score
          </h2>
          {score ? (
            <>
              <div className="relative w-56 h-56 rounded-full sn-recessed flex items-center justify-center bg-surface-container-low z-10 border border-outline-variant/20">
                <div
                  className="absolute inset-2 rounded-full"
                  style={{ background: `conic-gradient(from 180deg, #c0c0c0 0deg, #c0c0c0 ${gaugeDeg}deg, #374151 ${gaugeDeg}deg, #374151 360deg)` }}
                />
                <div className="absolute inset-4 bg-surface-container rounded-full sn-neo flex flex-col items-center justify-center z-20 border border-outline-variant/10">
                  <span className="font-display-lg text-display-lg text-primary sn-tabular leading-none mt-2">{score.score}</span>
                  <span className={`font-label-sm text-label-sm uppercase mt-2 ${riskStyle.text}`}>{riskStyle.label}</span>
                </div>
              </div>
              <p className="mt-8 text-sm text-on-surface-variant text-center max-w-sm leading-relaxed z-10">
                {score.rationale}
              </p>
            </>
          ) : <p className="text-on-surface-variant text-sm z-10">Loading health score...</p>}
        </div>

        {/* Score Breakdown */}
        <div className="md:col-span-7 flex flex-col gap-stack-md">
          {score?.breakdown && (
            <div className="bg-surface-container rounded-xl p-6 sn-neo border border-outline-variant/20">
              <h3 className="font-label-sm text-label-sm text-on-surface-variant uppercase tracking-widest mb-5">
                Score Breakdown
              </h3>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                {Object.entries(score.breakdown).map(([k, v]) => (
                  <div key={k} className="bg-surface-container-low rounded-lg p-4 sn-recessed border border-outline-variant/10">
                    <div className="text-xs text-on-surface-variant uppercase tracking-wide mb-1">{k.replace(/_/g, ' ')}</div>
                    <div className="text-lg font-semibold text-on-surface sn-tabular">{v}<span className="text-xs text-on-surface-variant">/100</span></div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Set Budget Form */}
          <div className="bg-surface-container rounded-xl p-6 sn-neo border border-outline-variant/20 flex-1">
            <h3 className="font-label-sm text-label-sm text-on-surface-variant uppercase tracking-widest mb-5">
              Set New Budget
            </h3>
            <form onSubmit={saveBudget} className="flex flex-col gap-3">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="text-xs text-on-surface-variant">Category</label>
                  <select
                    className="w-full mt-1 bg-surface-container-low border border-outline-variant/30 rounded-lg px-3 py-2 text-sm text-on-surface focus:outline-none focus:border-primary/50 sn-recessed"
                    value={form.category} onChange={e => setForm({ ...form, category: e.target.value })}
                  >
                    {CATEGORIES.map(c => <option key={c}>{c}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-xs text-on-surface-variant">Month (YYYY-MM)</label>
                  <input
                    className="w-full mt-1 bg-surface-container-low border border-outline-variant/30 rounded-lg px-3 py-2 text-sm text-on-surface placeholder:text-on-surface-variant/60 focus:outline-none focus:border-primary/50 sn-recessed"
                    value={form.month} onChange={e => setForm({ ...form, month: e.target.value })}
                    placeholder="2026-08"
                  />
                </div>
                <div>
                  <label className="text-xs text-on-surface-variant">Limit (₹)</label>
                  <input
                    type="number"
                    className="w-full mt-1 bg-surface-container-low border border-outline-variant/30 rounded-lg px-3 py-2 text-sm text-on-surface placeholder:text-on-surface-variant/60 focus:outline-none focus:border-primary/50 sn-recessed sn-tabular"
                    value={form.limit_amount} onChange={e => setForm({ ...form, limit_amount: e.target.value })}
                    placeholder="5000"
                  />
                </div>
              </div>
              {msg && (
                <div className={`text-xs px-3 py-2 rounded-lg border ${
                  msg.startsWith('✓')
                    ? 'text-secondary border-secondary/30 bg-secondary-container/20'
                    : 'text-error border-error/30 bg-error-container/20'
                }`}>{msg}</div>
              )}
              <button
                type="submit"
                className="mt-1 bg-primary-container text-on-primary-container hover:bg-outline-variant transition-colors px-6 py-2.5 rounded-full font-medium text-sm shadow-[inset_0_1px_0_rgba(255,255,255,0.1)] w-fit"
              >
                Save Budget
              </button>
            </form>
          </div>
        </div>

        {/* Budget Progress Bars */}
        <div className="col-span-full bg-surface-container rounded-xl p-8 sn-neo border border-outline-variant/20">
          <h3 className="font-label-sm text-label-sm text-on-surface-variant uppercase tracking-widest mb-8">
            Category Thresholds — This Month
          </h3>
          {budgets.length === 0 ? (
            <p className="text-on-surface-variant text-sm">No budgets set yet. Add your first budget above.</p>
          ) : (
            <div className="flex flex-col gap-6">
              {budgets.map(b => {
                const s = STATUS_STYLE[b.status] || STATUS_STYLE.ok;
                return (
                  <div key={b.category}>
                    <div className="flex justify-between items-end mb-2">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-surface-container-high flex items-center justify-center text-on-surface-variant border border-outline-variant/30">
                          <Icon name={CATEGORY_ICON[b.category] || 'category'} className="text-[16px]" />
                        </div>
                        <span className="font-medium text-on-surface">{b.category}</span>
                      </div>
                      <div className="text-right">
                        <span className={`font-medium sn-tabular ${s.text}`}>{fmt(b.spent)}</span>
                        <span className="text-on-surface-variant text-sm sn-tabular"> / {fmt(b.limit_amount)}</span>
                        <span className="ml-2 text-xs text-on-surface-variant">({b.percentage}%)</span>
                      </div>
                    </div>
                    <div className="h-2 w-full bg-surface-container-low rounded-full sn-recessed overflow-hidden relative border border-outline-variant/10">
                      <div className="absolute top-0 bottom-0 left-[80%] w-px bg-error/50 z-10" />
                      <div
                        className={`h-full rounded-full sn-bar-fill ${s.fill}`}
                        style={{ width: `${Math.min(b.percentage, 100)}%` }}
                      />
                    </div>
                    {b.status === 'over' && (
                      <p className="text-xs text-error mt-1.5 text-right font-medium">Over budget</p>
                    )}
                    {b.status === 'warning' && (
                      <p className="text-xs text-primary mt-1.5 text-right font-medium">Exceeding 80% safe threshold</p>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
