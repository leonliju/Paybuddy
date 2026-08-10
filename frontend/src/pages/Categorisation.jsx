import { useEffect, useState } from 'react';
import API from '../services/api';

const CATEGORIES = ['Food','Travel','Bills','Shopping','Education',
                    'Medical','Entertainment','Income','Other'];
const fmt = n => '₹' + Number(n).toLocaleString('en-IN', {maximumFractionDigits:0});

export default function Categorisation() {
  const [items,   setItems]   = useState([]);
  const [done,    setDone]    = useState({});
  const [stats,   setStats]   = useState(null);

  useEffect(() => {
    API.get('/categorisation/low-confidence').then(r => setItems(r.data));
    API.get('/categorisation/stats').then(r => setStats(r.data));
  }, []);

  const correct = async (txn_id, cat) => {
    try {
      await API.post('/categorisation/correct',
        { transaction_id: txn_id, corrected_category: cat });
      setDone(d => ({ ...d, [txn_id]: cat }));
    } catch {}
  };

  const pending = items.filter(i => !done[i.transaction_id]);

  return (
    <div>
      <div className="page-title">Categorisation Review</div>

      {stats && (
        <div className="kpi-grid" style={{gridTemplateColumns:'repeat(3,1fr)'}}>
          <div className="kpi-card">
            <div className="kpi-label">Total Transactions</div>
            <div className="kpi-value">{stats.total_transactions}</div>
          </div>
          <div className="kpi-card">
            <div className="kpi-label">Corrections Made</div>
            <div className="kpi-value gold">{stats.corrections_made}</div>
          </div>
          <div className="kpi-card">
            <div className="kpi-label">Needs Review</div>
            <div className="kpi-value red">{pending.length}</div>
          </div>
        </div>
      )}

      <div className="card">
        <div className="card-title">
          Transactions Needing Review
          <span style={{
            marginLeft:8, background:'#fdecea', color:'#c0392b',
            padding:'2px 8px', borderRadius:10, fontSize:11
          }}>{pending.length} pending</span>
        </div>

        {pending.length === 0 ? (
          <div className="alert alert-success">
            ✅ All transactions are categorised correctly. Great job!
          </div>
        ) : (
          <table className="data-table">
            <thead>
              <tr>
                <th>Date</th><th>Merchant</th><th>Description</th>
                <th>Amount</th><th>Current Category</th>
                <th>Confidence</th><th>Correct To</th><th></th>
              </tr>
            </thead>
            <tbody>
              {pending.map(item => (
                <tr key={item.transaction_id}>
                  <td>{item.date}</td>
                  <td>{item.merchant || '—'}</td>
                  <td style={{maxWidth:160,overflow:'hidden',
                               textOverflow:'ellipsis',whiteSpace:'nowrap'}}>
                    {item.description}
                  </td>
                  <td className="amount">{fmt(item.amount)}</td>
                  <td>{item.category}</td>
                  <td>
                    <span className={`badge badge-${
                      item.confidence < 0.5 ? 'low' :
                      item.confidence < 0.8 ? 'medium' : 'high'}`}>
                      {Math.round(item.confidence * 100)}%
                    </span>
                  </td>
                  <td>
                    <select className="form-control" style={{padding:'4px 6px',fontSize:12}}
                      defaultValue={item.category}
                      onChange={e => correct(item.transaction_id, e.target.value)}>
                      {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                  </td>
                  <td>
                    <button className="btn btn-sm btn-gold"
                      onClick={() => correct(item.transaction_id, item.category)}>
                        
                      ✓
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}