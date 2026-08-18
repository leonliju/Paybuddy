import { useEffect, useState } from 'react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import API from '../services/api';

const fmt = n => '₹' + Number(n).toLocaleString('en-IN', { maximumFractionDigits: 0 });

const Icon = ({ name, className = '', fill = false }) => (
  <span
    className={`material-symbols-outlined ${className}`}
    style={{ fontVariationSettings: `'FILL' ${fill ? 1 : 0}` }}
  >
    {name}
  </span>
);

const tooltipStyle = {
  background: '#1a1a1a', border: '1px solid #374151',
  borderRadius: 8, color: '#f3f4f6', fontSize: 12,
};

const CATEGORY_ICON = {
  Food: 'restaurant', Travel: 'directions_car', Bills: 'bolt',
  Shopping: 'shopping_bag', Education: 'school', Medical: 'medical_services',
  Entertainment: 'movie', Income: 'arrow_downward', Other: 'category',
};

// Severity derived per the doc's z-score thresholds (>3.5 HIGH, >2.5 MODERATE).
// Isolation Forest flags don't have a documented threshold, so they're shown
// as their own method badge rather than forced into a HIGH/MODERATE bucket.
function severityOf(f) {
  if (f.method !== 'zscore') return 'iso';
  const abs = Math.abs(f.score);
  if (abs > 3.5) return 'high';
  if (abs > 2.5) return 'moderate';
  return 'low';
}

const SEVERITY_STYLE = {
  high:     { bar: 'bg-secondary', badge: 'text-secondary border-secondary/20 bg-surface-container' },
  moderate: { bar: 'bg-primary',   badge: 'text-primary border-primary/20 bg-surface-container' },
  low:      { bar: 'bg-outline-variant', badge: 'text-on-surface-variant border-outline-variant/30 bg-surface-container' },
  iso:      { bar: 'bg-outline',   badge: 'text-on-surface-variant border-outline-variant/30 bg-surface-container' },
};

export default function Anomaly() {
  const [flags, setFlags] = useState([]);
  const [running, setRunning] = useState(false);
  const [message, setMessage] = useState('');

  const load = () => API.get('/anomaly/flags').then(r => setFlags(r.data));

  useEffect(() => { load(); }, []);

  const detect = async () => {
    setRunning(true); setMessage('');
    try {
      const res = await API.get('/anomaly/detect');
      setMessage(`✓ Detection complete. ${res.data.detected} anomalies found.`);
      await load();
    } catch {
      setMessage('✗ Detection failed');
    } finally { setRunning(false); }
  };

  const byCat = flags.reduce((acc, f) => {
    acc[f.category] = (acc[f.category] || 0) + 1;
    return acc;
  }, {});
  const chartData = Object.entries(byCat).map(([k, v]) => ({ category: k, count: v }));
  const highRiskCount = flags.filter(f => severityOf(f) === 'high').length;

  return (
    <div className="dark bg-background text-on-surface font-body-md antialiased -m-6 p-container-padding min-h-screen">
      <header className="mb-8 flex flex-col md:flex-row justify-between items-start md:items-end gap-6">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <Icon name="troubleshoot" className="text-secondary text-[28px]" fill />
            <h1 className="font-headline-lg-mobile md:font-headline-lg text-headline-lg-mobile md:text-headline-lg text-on-surface tracking-tight">
              Anomaly Detective
            </h1>
          </div>
          <p className="text-on-surface-variant max-w-xl text-body-md">
            Z-Score and Isolation Forest monitoring surface transactions that deviate from your historical baseline.
          </p>
        </div>
        <button
          onClick={detect} disabled={running}
          className="flex items-center gap-2 bg-primary-container text-on-primary-container hover:bg-outline-variant transition-colors px-6 py-3 rounded-full font-medium text-sm shadow-[inset_0_1px_0_rgba(255,255,255,0.1)] disabled:opacity-50 shrink-0"
        >
          <Icon name={running ? 'progress_activity' : 'troubleshoot'} className={`text-[18px] ${running ? 'animate-spin' : ''}`} />
          {running ? 'Running...' : 'Run Anomaly Detection'}
        </button>
      </header>

      {message && (
        <div className={`mb-6 text-sm px-4 py-3 rounded-lg border flex items-center gap-2 max-w-xl ${
          message.startsWith('✓')
            ? 'text-secondary border-secondary/30 bg-secondary-container/20'
            : 'text-error border-error/30 bg-error-container/20'
        }`}>
          <Icon name={message.startsWith('✓') ? 'check_circle' : 'error'} className="text-[16px]" fill />
          {message}
        </div>
      )}

      {/* Overview bento */}
      <section className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="bg-surface-container rounded-xl p-8 sn-neo border border-outline-variant/20 flex flex-col justify-between">
          <span className="font-label-sm text-label-sm text-on-surface-variant uppercase tracking-widest mb-4">Total Flagged</span>
          <div className="text-display-lg font-display-lg text-on-surface sn-tabular">{flags.length}</div>
        </div>
        <div className="bg-surface-container rounded-xl p-8 sn-neo border border-outline-variant/20 flex flex-col justify-between relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-secondary/5 to-transparent pointer-events-none" />
          <span className="font-label-sm text-label-sm text-on-surface-variant uppercase tracking-widest mb-4 flex items-center gap-2 relative z-10">
            <Icon name="warning" className="text-secondary text-[16px]" fill />
            High Risk (|Z| &gt; 3.5)
          </span>
          <div className="text-display-lg font-display-lg text-secondary sn-tabular relative z-10">{highRiskCount}</div>
          <p className="text-sm text-on-surface-variant mt-2 relative z-10">Requires immediate review</p>
        </div>
        <div className="bg-surface-container rounded-xl p-8 sn-neo border border-outline-variant/20 flex flex-col justify-between">
          <span className="font-label-sm text-label-sm text-on-surface-variant uppercase tracking-widest mb-4">Deviation Thresholds</span>
          <div className="text-headline-lg-mobile font-headline-lg-mobile text-on-surface">Z &gt; 2.5 / 3.5</div>
          <p className="text-sm text-on-surface-variant mt-2">Moderate / High severity cutoffs</p>
        </div>
      </section>

      {/* Flagged Transactions */}
      <section className="flex flex-col gap-4">
        <h3 className="font-headline-lg-mobile text-headline-lg-mobile text-on-surface mb-1">Flagged Transactions</h3>

        {flags.length === 0 ? (
          <div className="bg-surface-container rounded-xl p-10 sn-neo border border-outline-variant/20 text-center">
            <p className="text-on-surface-variant text-sm">
              No anomalies detected yet. Click "Run Anomaly Detection" to analyse your transactions.
            </p>
          </div>
        ) : (
          flags.map(f => {
            const sev = severityOf(f);
            const style = SEVERITY_STYLE[sev];
            return (
              <article key={f.flag_id}
                className="bg-surface-container rounded-xl p-6 md:p-8 sn-neo border border-outline-variant/20 relative overflow-hidden flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6"
              >
                <div className={`absolute top-0 left-0 w-1 h-full ${style.bar}`} />
                <div className="flex-1 flex flex-col md:flex-row gap-6 w-full relative z-10">
                  <div className="flex items-center gap-4 min-w-[220px]">
                    <div className="w-12 h-12 rounded-full bg-surface-container-high text-on-surface flex items-center justify-center sn-recessed shrink-0">
                      <Icon name={CATEGORY_ICON[f.category] || 'receipt_long'} className="text-[20px]" />
                    </div>
                    <div>
                      <h4 className="text-on-surface font-medium mb-0.5 truncate">{f.merchant || 'Unknown Merchant'}</h4>
                      <p className="text-on-surface-variant text-xs">{f.date}</p>
                    </div>
                  </div>
                  <div className="flex flex-col justify-center flex-1">
                    <div className="flex flex-wrap gap-2 mb-2">
                      <span className={`px-2.5 py-1 rounded-sm border text-[10px] uppercase tracking-widest font-medium ${style.badge}`}>
                        {f.method === 'zscore' ? `Z: ${f.score}` : `Isolation Forest: ${f.score}`}
                      </span>
                      <span className="px-2.5 py-1 bg-surface-container-high rounded-sm border border-outline-variant/30 text-[10px] uppercase tracking-widest text-on-surface-variant">
                        {f.category}
                      </span>
                    </div>
                    <p className="text-sm text-on-surface-variant">{f.reason}</p>
                  </div>
                </div>
                <div className="flex flex-col items-end justify-center min-w-[120px] relative z-10">
                  <span className="text-[10px] text-on-surface-variant uppercase tracking-widest mb-1">Amount</span>
                  <span className="text-xl font-semibold text-on-surface sn-tabular">{fmt(f.amount)}</span>
                </div>
              </article>
            );
          })
        )}

        {chartData.length > 0 && (
          <div className="bg-surface-container rounded-xl p-8 sn-neo border border-outline-variant/20 mt-2">
            <h4 className="font-label-sm text-label-sm text-on-surface-variant uppercase tracking-widest mb-4">
              Anomaly Distribution by Category
            </h4>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={chartData}>
                <XAxis dataKey="category" tick={{ fontSize: 11, fill: '#9ca3af' }} axisLine={{ stroke: '#374151' }} tickLine={false} />
                <YAxis tick={{ fontSize: 11, fill: '#9ca3af' }} axisLine={false} tickLine={false} allowDecimals={false} />
                <Tooltip contentStyle={tooltipStyle} />
                <Bar dataKey="count" fill="#c0c0c0" radius={[3, 3, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </section>
    </div>
  );
}
