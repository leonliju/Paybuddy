import { useState } from 'react';
import { LineChart, Line, XAxis, YAxis, Tooltip,
         ResponsiveContainer, CartesianGrid } from 'recharts';
import API from '../services/api';

const CATEGORIES = ['all','Food','Travel','Bills','Shopping',
                    'Education','Medical','Entertainment','Income','Other'];
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

export default function Forecast() {
  const [category, setCategory] = useState('all');
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);

  const fetchForecast = async () => {
    setLoading(true); setData(null);
    try {
      const res = await API.get(`/forecast/${category}`);
      setData(res.data);
    } finally { setLoading(false); }
  };

  const chartData = data && !data.insufficient_data
    ? [
        ...(data.history || []).map(h => ({ month: h.month, actual: h.total })),
        ...(data.lr_forecast ? [{
          month: 'Next Month',
          lr_forecast: data.lr_forecast,
          ...(data.arima_forecast ? { arima_forecast: data.arima_forecast } : {})
        }] : [])
      ]
    : [];

  // Scale bar widths relative to the larger of the two forecasts, for the duel visual
  const maxVal = data && !data.insufficient_data
    ? Math.max(data.lr_forecast || 0, data.arima_forecast || 0, 1)
    : 1;
  const lowerMae = data?.arima_forecast != null
    ? (data.mae_arima <= data.mae_lr ? 'arima' : 'lr')
    : 'lr';

  return (
    <div className="dark bg-background text-on-surface font-body-md antialiased -m-6 p-container-padding min-h-screen">
      <header className="mb-stack-lg">
        <h1 className="font-headline-lg-mobile md:font-headline-lg text-headline-lg-mobile md:text-headline-lg text-on-surface tracking-tight">
          Forecast &amp; Planning
        </h1>
        <p className="text-on-surface-variant mt-2 max-w-2xl text-body-md">
          AI-driven financial modeling comparing ARIMA and Linear Regression against your spending history.
        </p>
      </header>

      {/* Controls */}
      <div className="flex items-end gap-3 mb-stack-md flex-wrap">
        <div>
          <label className="text-xs text-on-surface-variant">Category</label>
          <select
            className="block mt-1 w-48 bg-surface-container-low border border-outline-variant/30 rounded-lg px-3 py-2 text-sm text-on-surface focus:outline-none focus:border-primary/50 sn-recessed"
            value={category} onChange={e => setCategory(e.target.value)}
          >
            {CATEGORIES.map(c => (
              <option key={c} value={c}>{c === 'all' ? 'All Categories' : c}</option>
            ))}
          </select>
        </div>
        <button
          onClick={fetchForecast} disabled={loading}
          className="flex items-center gap-2 bg-primary-container text-on-primary-container hover:bg-outline-variant transition-colors px-6 py-2.5 rounded-full font-medium text-sm shadow-[inset_0_1px_0_rgba(255,255,255,0.1)] disabled:opacity-50"
        >
          <Icon name={loading ? 'progress_activity' : 'timeline'} className={`text-[18px] ${loading ? 'animate-spin' : ''}`} />
          {loading ? 'Loading...' : 'Get Forecast'}
        </button>
      </div>

      {data?.insufficient_data && (
        <div className="text-sm px-4 py-3 rounded-lg border border-error/30 bg-error-container/20 text-error flex items-center gap-2 max-w-2xl">
          <Icon name="warning" className="text-[16px]" fill />
          Not enough historical data for this category. Add more transactions and check back after 3 months of data.
        </div>
      )}

      {data && !data.insufficient_data && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-stack-md">
          {/* Forecast Duel */}
          <section className="lg:col-span-8 bg-surface-container rounded-xl p-8 sn-neo border border-outline-variant/20 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-secondary/5 rounded-full blur-3xl pointer-events-none" />
            <h3 className="font-headline-lg-mobile text-headline-lg-mobile text-on-surface mb-6 flex items-center gap-3">
              <Icon name="compare_arrows" className="text-secondary text-[22px]" />
              Forecast Duel
            </h3>
            <div className="space-y-6 relative z-10">
              <div>
                <div className="flex justify-between font-label-sm text-label-sm uppercase mb-2">
                  <span className={lowerMae === 'lr' ? 'text-white font-bold' : 'text-on-surface-variant'}>Linear Regression</span>
                  <span className="text-on-surface sn-tabular">{fmt(data.lr_forecast)}</span>
                </div>
                <div className="h-4 bg-surface-container-high rounded-full overflow-hidden sn-recessed">
                  <div
                    className={`h-full rounded-full sn-bar-fill ${lowerMae === 'lr' ? 'bg-secondary shadow-[0_0_15px_rgba(192,192,192,0.6)]' : 'bg-outline'}`}
                    style={{ width: `${Math.min(100, (data.lr_forecast / maxVal) * 100)}%` }}
                  />
                </div>
                <div className="text-xs text-on-surface-variant mt-1">MAE: {fmt(data.mae_lr)}</div>
              </div>

              {data.arima_forecast != null && (
                <div>
                  <div className="flex justify-between font-label-sm text-label-sm uppercase mb-2">
                    <span className={lowerMae === 'arima' ? 'text-white font-bold' : 'text-on-surface-variant'}>ARIMA (1,1,1)</span>
                    <span className="text-on-surface sn-tabular">{fmt(data.arima_forecast)}</span>
                  </div>
                  <div className="h-4 bg-surface-container-high rounded-full overflow-hidden sn-recessed">
                    <div
                      className={`h-full rounded-full sn-bar-fill ${lowerMae === 'arima' ? 'bg-secondary shadow-[0_0_15px_rgba(192,192,192,0.6)]' : 'bg-outline'}`}
                      style={{ width: `${Math.min(100, (data.arima_forecast / maxVal) * 100)}%` }}
                    />
                  </div>
                  <div className="text-xs text-on-surface-variant mt-1">MAE: {fmt(data.mae_arima)}</div>
                </div>
              )}
            </div>

            <div className="mt-8 p-6 bg-surface-container-low rounded-lg border border-outline-variant/20 sn-recessed relative z-10">
              <p className="text-sm text-on-surface-variant leading-relaxed">
                {data.arima_forecast != null
                  ? `The ${lowerMae === 'arima' ? 'ARIMA' : 'Linear Regression'} model has the lower error (MAE) on your held-out validation month for this category, so it's the more reliable read on next month's total.`
                  : `Only Linear Regression is available for this category yet — ARIMA needs at least 6 months of history to fit.`}
              </p>
            </div>
          </section>

          {/* Model Comparison */}
          <section className="lg:col-span-4 bg-surface-container rounded-xl p-8 sn-neo border border-outline-variant/20 flex flex-col">
            <h4 className="font-label-sm text-label-sm uppercase text-on-surface-variant tracking-widest mb-2">
              Next Month Forecast
            </h4>
            <div className="text-display-lg font-display-lg text-primary sn-tabular mt-1">
              {fmt(lowerMae === 'arima' ? data.arima_forecast : data.lr_forecast)}
            </div>
            <p className="text-sm text-on-surface-variant mt-3">
              Based on the lower-error model ({lowerMae === 'arima' ? 'ARIMA' : 'Linear Regression'}) for {category === 'all' ? 'all categories' : category}.
            </p>
            <div className="mt-6 flex flex-wrap gap-2">
              <span className="text-xs uppercase px-3 py-1 bg-surface-container-high rounded-full border border-outline-variant/30 text-on-surface">
                {category === 'all' ? 'ALL CATEGORIES' : category.toUpperCase()}
              </span>
              <span className="text-xs uppercase px-3 py-1 bg-surface-container-high rounded-full border border-outline-variant/30 text-on-surface">
                {data.arima_forecast != null ? '2 MODELS' : '1 MODEL'}
              </span>
            </div>
          </section>

          {/* Chart */}
          <section className="lg:col-span-12 bg-surface-container rounded-xl p-8 sn-neo border border-outline-variant/20">
            <h3 className="font-label-sm text-label-sm text-on-surface-variant uppercase tracking-widest mb-4">
              Historical + Forecast
            </h3>
            <ResponsiveContainer width="100%" height={260}>
              <LineChart data={chartData}>
                <CartesianGrid stroke="#1f2937" strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="month" tick={{ fontSize: 11, fill: '#9ca3af' }} axisLine={{ stroke: '#374151' }} tickLine={false} />
                <YAxis tick={{ fontSize: 11, fill: '#9ca3af' }} axisLine={false} tickLine={false}
                       tickFormatter={v => '₹' + v / 1000 + 'k'} />
                <Tooltip formatter={v => fmt(v)} contentStyle={tooltipStyle} />
                <Line type="monotone" dataKey="actual" stroke="#e5e7eb"
                      strokeWidth={2} dot={{ r: 4, fill: '#e5e7eb' }} name="Actual" />
                <Line type="monotone" dataKey="lr_forecast" stroke="#c0c0c0"
                      strokeWidth={2} strokeDasharray="5 5" dot={{ r: 5, fill: '#c0c0c0' }} name="LR Forecast" />
                {data.arima_forecast != null && (
                  <Line type="monotone" dataKey="arima_forecast" stroke="#71717a"
                        strokeWidth={2} strokeDasharray="5 5" dot={{ r: 5, fill: '#71717a' }} name="ARIMA Forecast" />
                )}
              </LineChart>
            </ResponsiveContainer>
          </section>

          {/* Model Comparison Table */}
          <section className="lg:col-span-12 bg-surface-container rounded-xl p-8 sn-neo border border-outline-variant/20">
            <h3 className="font-label-sm text-label-sm text-on-surface-variant uppercase tracking-widest mb-4">
              Model Comparison
            </h3>
            <div className="overflow-x-auto rounded-lg border border-outline-variant/20">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-outline-variant/20 text-on-surface-variant text-xs uppercase tracking-widest">
                    <th className="text-left font-medium py-2.5 px-3">Model</th>
                    <th className="text-left font-medium py-2.5 px-3">Forecast</th>
                    <th className="text-left font-medium py-2.5 px-3">MAE</th>
                  </tr>
                </thead>
                <tbody>
                  <tr className="border-b border-outline-variant/10 last:border-0">
                    <td className="py-2.5 px-3">Linear Regression</td>
                    <td className="py-2.5 px-3 sn-tabular font-medium">{fmt(data.lr_forecast)}</td>
                    <td className="py-2.5 px-3 text-on-surface-variant sn-tabular">{fmt(data.mae_lr)}</td>
                  </tr>
                  {data.arima_forecast != null && (
                    <tr className="border-b border-outline-variant/10 last:border-0">
                      <td className="py-2.5 px-3">ARIMA (1,1,1)</td>
                      <td className="py-2.5 px-3 sn-tabular font-medium">{fmt(data.arima_forecast)}</td>
                      <td className="py-2.5 px-3 text-on-surface-variant sn-tabular">{fmt(data.mae_arima)}</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </section>
        </div>
      )}
    </div>
  );
}
