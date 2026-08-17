import { useEffect, useState } from 'react';
import { PieChart, Pie, Cell, LineChart, Line, XAxis, YAxis,
         Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import API from '../services/api';

const SN_COLORS = ['#e5e7eb', '#c0c0c0', '#9ca3af', '#6b7280',
                    '#4b5563', '#d1d5db', '#a1a1aa', '#71717a', '#52525b'];

const fmt = n => '₹' + Number(n).toLocaleString('en-IN', { maximumFractionDigits: 0 });

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
  Shopping: 'shopping_bag', Education: 'school', Medical: 'medical_services',
  Entertainment: 'movie', Income: 'arrow_downward', Other: 'category',
};

const tooltipStyle = {
  background: '#1a1a1a', border: '1px solid #374151',
  borderRadius: 8, color: '#f3f4f6', fontSize: 12,
};

export default function Dashboard() {
  const [summary,    setSummary]    = useState(null);
  const [byCategory, setByCategory] = useState([]);
  const [trend,      setTrend]      = useState([]);
  const [recent,     setRecent]     = useState([]);
  const [cashflow,   setCashflow]   = useState([]);

  useEffect(() => {
    API.get('/analytics/summary').then(r => setSummary(r.data));
    API.get('/analytics/by-category').then(r => setByCategory(r.data));
    API.get('/analytics/monthly-trend').then(r => setTrend(r.data));
    API.get('/analytics/recent').then(r => setRecent(r.data));
    API.get('/analytics/cashflow-calendar').then(r => setCashflow(r.data)).catch(() => {});
  }, []);

  const kpis = [
    { label: 'Total Expenses This Month', value: summary?.total_expenses, tone: 'text-error', icon: 'arrow_upward' },
    { label: 'Total Income This Month',   value: summary?.total_income,   tone: 'text-secondary', icon: 'arrow_downward' },
    { label: 'Net Balance',               value: summary?.net,            tone: summary?.net >= 0 ? 'text-secondary' : 'text-error', icon: 'account_balance_wallet' },
  ];

  return (
    <div className="dark bg-background text-on-surface font-body-md antialiased -m-6 p-container-padding min-h-screen">
      <header className="mb-stack-lg">
        <h1 className="font-headline-lg-mobile md:font-headline-lg text-headline-lg-mobile md:text-headline-lg text-on-surface tracking-tight">
          Dashboard
        </h1>
        <p className="text-on-surface-variant mt-2 max-w-xl text-body-md">
          Your spending at a glance — this month's totals, trends, and recent activity.
        </p>
      </header>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-stack-md mb-stack-md">
        {kpis.map(k => (
          <div key={k.label} className="bg-surface-container rounded-xl p-6 sn-neo border border-outline-variant/20">
            <div className="flex items-center justify-between mb-3">
              <span className="font-label-sm text-label-sm text-on-surface-variant uppercase tracking-widest">{k.label}</span>
              <Icon name={k.icon} className={`text-[18px] ${k.tone}`} />
            </div>
            <div className={`text-2xl font-semibold sn-tabular ${k.tone}`}>
              {summary ? fmt(k.value) : '—'}
            </div>
          </div>
        ))}
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-stack-md mb-stack-md">
        <div className="bg-surface-container rounded-xl p-6 sn-neo border border-outline-variant/20">
          <h3 className="font-label-sm text-label-sm text-on-surface-variant uppercase tracking-widest mb-4">
            Spending by Category
          </h3>
          {byCategory.length > 0 ? (
            <ResponsiveContainer width="100%" height={240}>
              <PieChart>
                <Pie data={byCategory} dataKey="total" nameKey="category"
                     cx="50%" cy="50%" outerRadius={85}
                     label={({ category }) => category}
                     labelLine={{ stroke: '#4b5563' }}>
                  {byCategory.map((_, i) => (
                    <Cell key={i} fill={SN_COLORS[i % SN_COLORS.length]} stroke="#050505" strokeWidth={1} />
                  ))}
                </Pie>
                <Tooltip formatter={v => fmt(v)} contentStyle={tooltipStyle} />
              </PieChart>
            </ResponsiveContainer>
          ) : <p className="text-on-surface-variant text-sm">No transactions this month</p>}
        </div>

        <div className="bg-surface-container rounded-xl p-6 sn-neo border border-outline-variant/20">
          <h3 className="font-label-sm text-label-sm text-on-surface-variant uppercase tracking-widest mb-4">
            Monthly Spending Trend
          </h3>
          <ResponsiveContainer width="100%" height={240}>
            <LineChart data={trend}>
              <CartesianGrid stroke="#1f2937" strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="month" tick={{ fontSize: 11, fill: '#9ca3af' }} axisLine={{ stroke: '#374151' }} tickLine={false} />
              <YAxis tick={{ fontSize: 11, fill: '#9ca3af' }} axisLine={false} tickLine={false}
                     tickFormatter={v => '₹' + v / 1000 + 'k'} />
              <Tooltip formatter={v => fmt(v)} contentStyle={tooltipStyle} />
              <Line type="monotone" dataKey="total" stroke="#c0c0c0"
                    strokeWidth={2} dot={{ r: 4, fill: '#c0c0c0' }} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Cash Flow Calendar */}
      {cashflow.length > 0 && (
        <div className="bg-surface-container rounded-xl p-6 sn-neo border border-outline-variant/20 mb-stack-md">
          <h3 className="font-label-sm text-label-sm text-on-surface-variant uppercase tracking-widest mb-4">
            Upcoming Fixed Outflows — Cash Flow Calendar
          </h3>
          <div className="flex flex-wrap gap-3">
            {cashflow.map((c, i) => (
              <div key={i} className="bg-surface-container-high/50 backdrop-blur-md border border-outline-variant/20 rounded-full px-4 py-2 flex items-center gap-2">
                <Icon name="event" className="text-[16px] text-secondary" />
                <span className="text-sm text-on-surface">Day {c.day_of_month} — {c.merchant}</span>
                <span className="text-sm text-error font-medium sn-tabular">{fmt(c.amount)}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Recent Transactions */}
      <div className="bg-surface-container rounded-xl p-6 sn-neo border border-outline-variant/20">
        <h3 className="font-label-sm text-label-sm text-on-surface-variant uppercase tracking-widest mb-4">
          Recent Activity
        </h3>
        {recent.length === 0 ? (
          <p className="text-on-surface-variant text-sm text-center py-6">
            No transactions yet. Start by importing data.
          </p>
        ) : (
          <div className="flex flex-col gap-3">
            {recent.map(t => (
              <div key={t.transaction_id}
                className="flex items-center justify-between p-4 rounded-lg bg-surface-container-low border border-surface-container hover:bg-surface-container-high/50 transition-colors">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-full bg-surface-container-highest flex items-center justify-center text-on-surface-variant">
                    <Icon name={CATEGORY_ICON[t.category] || 'receipt_long'} className="text-[18px]" />
                  </div>
                  <div>
                    <div className="text-sm text-on-surface font-medium">{t.merchant || '—'}</div>
                    <div className="text-xs text-on-surface-variant mt-0.5">{t.date} · {t.category}</div>
                  </div>
                </div>
                <div className={`text-sm font-medium sn-tabular ${t.direction === 'credit' ? 'text-secondary' : 'text-on-surface'}`}>
                  {t.direction === 'credit' ? '+' : '-'}{fmt(t.amount)}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
