import { useEffect, useState } from 'react';
import API from '../services/api';

const fmt = n => '₹' + Number(n).toLocaleString('en-IN', {maximumFractionDigits:0});

export default function Goals() {
  const [goals,      setGoals]      = useState([]);
  const [deadMoney,  setDeadMoney]  = useState(null);
  const [feasibility,setFeasibility]= useState(null);
  const [form, setForm] = useState({ goal_name:'', target_amount:'', deadline:'' });
  const [msg, setMsg]   = useState('');

  useEffect(() => {
    API.get('/savings/goals').then(r => setGoals(r.data));
    API.get('/deadmoney/detect').then(r => setDeadMoney(r.data)).catch(()=>{});
  }, []);

  const addGoal = async (e) => {
    e.preventDefault(); setMsg('');
    try {
      await API.post('/savings/goals', form);
      setMsg('✓ Goal added');
      const res = await API.get('/savings/goals');
      setGoals(res.data);
      setForm({ goal_name:'', target_amount:'', deadline:'' });
    } catch { setMsg('✗ Failed to add goal'); }
  };

  const checkFeasibility = async (goal_id) => {
    try {
      const res = await API.get(`/savings/feasibility/${goal_id}`);
      setFeasibility(res.data);
    } catch {}
  };

  return (
    <div>
      <div className="page-title">Goals & Dead Money Detector</div>

      <div className="grid-2">
        {/* Add Goal */}
        <div>
          <div className="card">
            <div className="card-title">Add Savings Goal</div>
            <form onSubmit={addGoal}>
              <div className="form-group" style={{marginBottom:10}}>
                <label className="form-label">Goal Name</label>
                <input className="form-control" value={form.goal_name}
                  onChange={e => setForm({...form, goal_name:e.target.value})}
                  placeholder="e.g. New Laptop" required />
              </div>
              <div className="form-group" style={{marginBottom:10}}>
                <label className="form-label">Target Amount (₹)</label>
                <input className="form-control" type="number"
                  value={form.target_amount}
                  onChange={e => setForm({...form, target_amount:e.target.value})}
                  placeholder="50000" required />
              </div>
              <div className="form-group" style={{marginBottom:14}}>
                <label className="form-label">Deadline</label>
                <input className="form-control" type="date"
                  value={form.deadline}
                  onChange={e => setForm({...form, deadline:e.target.value})}
                  required />
              </div>
              {msg && <div className={`alert ${msg.startsWith('✓')?'alert-success':'alert-danger'}`}
                style={{marginBottom:8}}>{msg}</div>}
              <button className="btn btn-primary" type="submit">Add Goal</button>
            </form>
          </div>

          {/* Goals Table */}
          <div className="card">
            <div className="card-title">Your Goals</div>
            {goals.length === 0 ? (
              <p style={{color:'#aaa',fontSize:13}}>No goals yet. Add your first goal above.</p>
            ) : (
              <table className="data-table">
                <thead>
                  <tr><th>Goal</th><th>Target</th><th>Deadline</th><th></th></tr>
                </thead>
                <tbody>
                  {goals.map(g => (
                    <tr key={g.goal_id}>
                      <td><strong>{g.goal_name}</strong></td>
                      <td className="amount">{fmt(g.target_amount)}</td>
                      <td>{g.deadline}</td>
                      <td>
                        <button className="btn btn-sm btn-outline"
                          onClick={() => checkFeasibility(g.goal_id)}>
                          Check Feasibility
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>

          {/* Feasibility Result */}
          {feasibility && (
            <div className={`alert ${feasibility.feasible ? 'alert-success':'alert-danger'}`}>
              <strong>{feasibility.goal_name}</strong><br/>
              {feasibility.feasible
                ? `✅ Feasible — Save ${fmt(feasibility.required_monthly)}/month`
                : `❌ Not Feasible — Need ${fmt(feasibility.required_monthly)}/month but only saving ${fmt(feasibility.current_surplus)}/month`}
              {feasibility.suggestions?.length > 0 && (
                <div style={{marginTop:8}}>
                  <strong>Top reduction suggestions:</strong>
                  <ol style={{marginTop:4,paddingLeft:18}}>
                    {feasibility.suggestions.map((s,i) => (
                      <li key={i}>
                        {s.category} — reduce by {fmt(s.reduce_by)}/month
                      </li>
                    ))}
                  </ol>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Dead Money Detector */}
        <div className="card">
          <div className="card-title">Dead Money Detector</div>
          {!deadMoney ? (
            <p style={{color:'#aaa',fontSize:13}}>Analysing your subscriptions...</p>
          ) : (
            <>
              <div style={{
                background:'#fdecea', border:'1px solid #f5b7b1',
                borderRadius:6, padding:12, marginBottom:16, textAlign:'center'
              }}>
                <div style={{fontSize:11,color:'#922b21',fontWeight:600,
                              textTransform:'uppercase',letterSpacing:0.5}}>
                  Estimated Monthly Waste
                </div>
                <div style={{fontSize:28,fontWeight:800,color:'#c0392b'}}>
                  {fmt(deadMoney.total_monthly_waste)}
                </div>
                <div style={{fontSize:12,color:'#888'}}>
                  = {fmt(deadMoney.total_annual_waste)} per year
                </div>
              </div>

              {deadMoney.zombie_subscriptions?.length > 0 && (
                <>
                  <div className="card-title">🧟 Zombie Subscriptions</div>
                  {deadMoney.zombie_subscriptions.map((z,i) => (
                    <div key={i} className="dead-money-card zombie">
                      <strong>{z.merchant}</strong>
                      <span style={{float:'right',color:'#8e44ad',fontWeight:700}}>
                        {fmt(z.monthly_cost)}/mo
                      </span>
                      <div style={{fontSize:12,color:'#666',marginTop:2}}>
                        Recurring charge with no related activity in 30 days
                      </div>
                    </div>
                  ))}
                </>
              )}

              {deadMoney.duplicate_services?.length > 0 && (
                <>
                  <div className="card-title" style={{marginTop:12}}>📺 Duplicate Services</div>
                  {deadMoney.duplicate_services.map((d,i) => (
                    <div key={i} className="dead-money-card dup">
                      <div style={{fontSize:13}}>{d.message}</div>
                    </div>
                  ))}
                </>
              )}

              {deadMoney.micro_leaks?.length > 0 && (
                <>
                  <div className="card-title" style={{marginTop:12}}>💧 Micro Leaks</div>
                  {deadMoney.micro_leaks.map((m,i) => (
                    <div key={i} className="dead-money-card micro">
                      <strong>{m.merchant}</strong>
                      <span style={{float:'right',color:'#e67e22',fontWeight:700}}>
                        {fmt(m.annual_cost)}/year
                      </span>
                    </div>
                  ))}
                </>
              )}

              {deadMoney.price_drift_alerts?.length > 0 && (
                <>
                  <div className="card-title" style={{marginTop:12}}>📈 Price Increases</div>
                  {deadMoney.price_drift_alerts.map((p,i) => (
                    <div key={i} className="dead-money-card drift">
                      <strong>{p.merchant}</strong>
                      <span style={{float:'right',color:'#e74c3c',fontWeight:700}}>
                        +{p.increase_pct}%
                      </span>
                      <div style={{fontSize:12,color:'#666',marginTop:2}}>
                        {fmt(p.old_amount)} → {fmt(p.new_amount)}
                      </div>
                    </div>
                  ))}
                </>
              )}

              {deadMoney.total_monthly_waste === 0 && (
                <div className="alert alert-success">
                  ✅ No dead money detected. Your subscriptions look clean!
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}