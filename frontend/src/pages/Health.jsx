import { useEffect, useState } from 'react';
import { RadialBarChart, RadialBar, ResponsiveContainer } from 'recharts';
import API from '../services/api';

const fmt = n => '₹' + Number(n).toLocaleString('en-IN', {maximumFractionDigits:0});
const CATEGORIES = ['Food','Travel','Bills','Shopping','Education',
                    'Medical','Entertainment','Income','Other'];

export default function Health() {
  const [score,   setScore]   = useState(null);
  const [budgets, setBudgets] = useState([]);
  const [form,    setForm]    = useState({ category:'Food', month:'', limit_amount:'' });
  const [msg,     setMsg]     = useState('');

  useEffect(() => {
    const m = new Date().toISOString().slice(0,7);
    setForm(f => ({...f, month:m}));
    API.get('/health/score').then(r => setScore(r.data));
    API.get('/budget/status').then(r => setBudgets(r.data));
  }, []);

  const riskBadge = (r) => {
    const map = { Saver:'saver', Balanced:'balanced',
                  'Risky Spender':'risky', 'Impulsive Buyer':'impulsive' };
    return <span className={`badge badge-${map[r]||'balanced'}`}>{r}</span>;
  };

  const saveBudget = async (e) => {
    e.preventDefault(); setMsg('');
    try {
      await API.post('/budget/set', form);
      setMsg('✓ Budget saved');
      const res = await API.get('/budget/status');
      setBudgets(res.data);
    } catch { setMsg('✗ Failed to save'); }
  };

  

  return (
    <div>
      <div className="page-title">Health & Budget</div>

      <div className="grid-2">
        {/* Health Score */}
        <div className="card">
          <div className="card-title">Financial Health Score</div>
          {score ? (
            <>
              <div className="gauge-wrap">
                <ResponsiveContainer width={200} height={120}>
                  <RadialBarChart cx="50%" cy="100%" innerRadius={60}
                    outerRadius={100} startAngle={180} endAngle={0}
                    data={[{ value:100, fill:'#f0f0e8' }, { value:score.score, fill:'#c9a84c' }]}>
                    <RadialBar dataKey="value" />
                  </RadialBarChart>
                </ResponsiveContainer>
                <div className="gauge-score">{score.score}</div>
                <div className="gauge-label">out of 100</div>
                <div style={{marginTop:8}}>{riskBadge(score.risk_classification)}</div>
              </div>
              <div style={{
                background:'#fafaf5', borderRadius:6,
                padding:12, fontSize:13, color:'#555', marginTop:12, lineHeight:1.6
              }}>
                {score.rationale}
              </div>
              {score.breakdown && (
                <div style={{marginTop:12}}>
                  {Object.entries(score.breakdown).map(([k,v]) => (
                    <div key={k} style={{display:'flex',justifyContent:'space-between',
                                          fontSize:12,color:'#666',marginBottom:4}}>
                      <span>{k.replace(/_/g,' ')}</span>
                      <strong>{v}/100</strong>
                    </div>
                  ))}
                </div>
              )}
            </>
          ) : <p style={{color:'#aaa'}}>Loading health score...</p>}
        </div>

        {/* Budget Tracker */}
        <div>
          <div className="card">
            <div className="card-title">Budget Tracker — This Month</div>
            {budgets.length === 0 ? (
              <p style={{color:'#aaa',fontSize:13}}>
                No budgets set yet. Add your first budget below.
              </p>
            ) : budgets.map(b => (
              <div key={b.category} style={{marginBottom:14}}>
                <div style={{ display:'flex', justifyContent:'space-between',
                               fontSize:13, marginBottom:4 }}>
                  <span style={{fontWeight:600}}>{b.category}</span>
                  <span>
                    <span className={`amount amount-${b.status==='ok'?'credit':'debit'}`}>
                      {fmt(b.spent)}
                    </span>
                    <span style={{color:'#888'}}> / {fmt(b.limit_amount)}</span>
                    <span style={{marginLeft:8}}>
                      <span className={`badge badge-${b.status}`}>{b.percentage}%</span>
                    </span>
                  </span>
                </div>
                <div className="progress-bar-wrap">
                  <div className="progress-bar-fill" style={{
                    width: `${Math.min(b.percentage, 100)}%`,
                    background: b.status==='over' ? '#c0392b'
                              : b.status==='warning' ? '#f1c40f' : '#2d7a2d'
                  }} />
                </div>
              </div>
            ))}
          </div>

          {/* Set Budget Form */}
          <div className="card">
            <div className="card-title">Set New Budget</div>
            <form onSubmit={saveBudget}>
              <div className="form-row" style={{gridTemplateColumns:'1fr 1fr 1fr'}}>
                <div className="form-group">
                  <label className="form-label">Category</label>
                  <select className="form-control" value={form.category}
                    onChange={e => setForm({...form, category:e.target.value})}>
                    {CATEGORIES.map(c => <option key={c}>{c}</option>)}
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Month (YYYY-MM)</label>
                  <input className="form-control" value={form.month}
                    onChange={e => setForm({...form, month:e.target.value})}
                    placeholder="2026-07" />
                </div>
                <div className="form-group">
                  <label className="form-label">Limit (₹)</label>
                  <input className="form-control" type="number"
                    value={form.limit_amount}
                    onChange={e => setForm({...form, limit_amount:e.target.value})}
                    placeholder="5000" />
                </div>
              </div>
              {msg && <div className={`alert ${msg.startsWith('✓')?'alert-success':'alert-danger'}`}
                style={{marginBottom:8}}>{msg}</div>}
              <button className="btn btn-primary" type="submit">Save Budget</button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}