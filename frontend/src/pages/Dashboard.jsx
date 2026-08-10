import { useEffect, useState } from 'react';
import { PieChart, Pie, Cell, LineChart, Line, XAxis, YAxis,
         Tooltip, ResponsiveContainer } from 'recharts';
import API from '../services/api';

const COLORS = ['#1a1a2e','#c9a84c','#2d7a2d','#c0392b',
                '#2980b9','#8e44ad','#e67e22','#16a085','#7f8c8d'];

const fmt = n => '₹' + Number(n).toLocaleString('en-IN', { maximumFractionDigits: 0 });

export default function Dashboard() {
  const [summary,   setSummary]   = useState(null);
  const [byCategory,setByCategory]= useState([]);
  const [trend,     setTrend]     = useState([]);
  const [recent,    setRecent]    = useState([]);
  const [cashflow,  setCashflow]  = useState([]);

  useEffect(() => {
    API.get('/analytics/summary').then(r => setSummary(r.data));
    API.get('/analytics/by-category').then(r => setByCategory(r.data));
    API.get('/analytics/monthly-trend').then(r => setTrend(r.data));
    API.get('/analytics/recent').then(r => setRecent(r.data));
    API.get('/analytics/cashflow-calendar').then(r => setCashflow(r.data)).catch(()=>{});
  }, []);

  return (
    <div>
      <div className="page-title">Dashboard</div>

      {/* KPI Cards */}
      <div className="kpi-grid">
        <div className="kpi-card">
          <div className="kpi-label">Total Expenses This Month</div>
          <div className="kpi-value red">{summary ? fmt(summary.total_expenses) : '—'}</div>
        </div>
        <div className="kpi-card">
          <div className="kpi-label">Total Income This Month</div>
          <div className="kpi-value green">{summary ? fmt(summary.total_income) : '—'}</div>
        </div>
        <div className="kpi-card">
          <div className="kpi-label">Net Balance</div>
          <div className={`kpi-value ${summary?.net >= 0 ? 'green' : 'red'}`}>
            {summary ? fmt(summary.net) : '—'}
          </div>
        </div>
      </div>

      {/* Charts */}
      <div className="grid-2">
        <div className="card">
          <div className="card-title">Spending by Category</div>
          {byCategory.length > 0 ? (
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie data={byCategory} dataKey="total" nameKey="category"
                     cx="50%" cy="50%" outerRadius={80} label={({category}) => category}>
                  {byCategory.map((_, i) => (
                    <Cell key={i} fill={COLORS[i % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip formatter={v => fmt(v)} />
              </PieChart>
            </ResponsiveContainer>
          ) : <p style={{color:'#aaa',fontSize:13}}>No transactions this month</p>}
        </div>

        <div className="card">
          <div className="card-title">Monthly Spending Trend</div>
          <ResponsiveContainer width="100%" height={220}>
            <LineChart data={trend}>
              <XAxis dataKey="month" tick={{fontSize:11}} />
              <YAxis tick={{fontSize:11}} tickFormatter={v=>'₹'+v/1000+'k'} />
              <Tooltip formatter={v => fmt(v)} />
              <Line type="monotone" dataKey="total" stroke="#c9a84c"
                    strokeWidth={2} dot={{r:4}} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Cash Flow Calendar */}
      {cashflow.length > 0 && (
        <div className="card">
          <div className="card-title">Upcoming Fixed Outflows (Cash Flow Calendar)</div>
          <div style={{ display:'flex', flexWrap:'wrap', gap:8 }}>
            {cashflow.map((c,i) => (
              <div key={i} style={{
                background:'#fafaf5', border:'1px solid #e8e8e0',
                borderRadius:6, padding:'8px 12px', fontSize:12
              }}>
                <strong>Day {c.day_of_month}</strong> — {c.merchant}
                <span style={{ color:'#c0392b', marginLeft:6 }}>{fmt(c.amount)}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Recent Transactions */}
      <div className="card">
        <div className="card-title">Recent Transactions</div>
        <table className="data-table">
          <thead>
            <tr>
              <th>Date</th><th>Merchant</th><th>Category</th>
              <th>Amount</th><th>Type</th>
            </tr>
          </thead>
          <tbody>
            {recent.map(t => (
              <tr key={t.transaction_id}>
                <td>{t.date}</td>
                <td>{t.merchant || '—'}</td>
                <td>{t.category}</td>
                <td className={`amount amount-${t.direction}`}>{fmt(t.amount)}</td>
                <td><span className={`badge badge-${t.direction}`}>{t.direction}</span></td>
              </tr>
            ))}
            {recent.length === 0 && (
              <tr><td colSpan={5} style={{color:'#aaa',textAlign:'center',padding:20}}>
                No transactions yet. Start by importing data.
              </td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}