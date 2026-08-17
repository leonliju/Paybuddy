import { useEffect, useState } from 'react';
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

export default function Goals() {
  const [goals, setGoals] = useState([]);
  const [deadMoney, setDeadMoney] = useState(null);
  const [feasibility, setFeasibility] = useState(null);
  const [feasibilityFor, setFeasibilityFor] = useState(null);
  const [form, setForm] = useState({ goal_name: '', target_amount: '', deadline: '' });
  const [msg, setMsg] = useState('');

  useEffect(() => {
    API.get('/savings/goals').then(r => setGoals(r.data));
    API.get('/deadmoney/detect').then(r => setDeadMoney(r.data)).catch(() => {});
  }, []);

  const addGoal = async (e) => {
    e.preventDefault(); setMsg('');
    try {
      await API.post('/savings/goals', form);
      setMsg('✓ Goal added');
      const res = await API.get('/savings/goals');
      setGoals(res.data);
      setForm({ goal_name: '', target_amount: '', deadline: '' });
    } catch { setMsg('✗ Failed to add goal'); }
  };

  const checkFeasibility = async (goal_id) => {
    setFeasibilityFor(goal_id);
    try {
      const res = await API.get(`/savings/feasibility/${goal_id}`);
      setFeasibility(res.data);
    } catch {}
  };

  const wasteRows = [
    { key: 'zombie_subscriptions', icon: 'skull', label: 'Zombie Subscriptions',
      note: 'Recurring charge with no related activity in 30 days',
      render: z => ({ title: z.merchant, value: `${fmt(z.monthly_cost)}/mo`, tone: 'text-secondary' }) },
    { key: 'duplicate_services', icon: 'content_copy', label: 'Duplicate Services',
      render: d => ({ title: d.message, value: null, tone: 'text-on-surface' }) },
    { key: 'micro_leaks', icon: 'water_drop', label: 'Micro Leaks',
      render: m => ({ title: m.merchant, value: `${fmt(m.annual_cost)}/yr`, tone: 'text-secondary' }) },
    { key: 'price_drift_alerts', icon: 'trending_up', label: 'Price Increases',
      render: p => ({ title: p.merchant, value: `+${p.increase_pct}%`, sub: `${fmt(p.old_amount)} → ${fmt(p.new_amount)}`, tone: 'text-error' }) },
  ];

  return (
    <div className="dark bg-background text-on-surface font-body-md antialiased -m-6 p-container-padding min-h-screen">
      <header className="mb-stack-lg">
        <h1 className="font-headline-lg-mobile md:font-headline-lg text-headline-lg-mobile md:text-headline-lg text-on-surface tracking-tight">
          Goals &amp; Dead Money
        </h1>
        <p className="text-on-surface-variant mt-2 max-w-xl text-body-md">
          Track savings targets and surface recurring spend that's quietly draining your budget.
        </p>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-12 gap-stack-md items-start">
        {/* LEFT: Goals */}
        <div className="md:col-span-5 flex flex-col gap-stack-md">
          <div className="bg-surface-container rounded-xl p-6 sn-neo border border-outline-variant/20">
            <h3 className="font-label-sm text-label-sm text-on-surface-variant uppercase tracking-widest mb-4">
              Add Savings Goal
            </h3>
            <form onSubmit={addGoal} className="flex flex-col gap-3">
              <div>
                <label className="text-xs text-on-surface-variant">Goal Name</label>
                <input
                  className="w-full mt-1 bg-surface-container-low border border-outline-variant/30 rounded-lg px-3 py-2 text-sm text-on-surface placeholder:text-on-surface-variant/60 focus:outline-none focus:border-primary/50 sn-recessed"
                  value={form.goal_name}
                  onChange={e => setForm({ ...form, goal_name: e.target.value })}
                  placeholder="e.g. New Laptop" required
                />
              </div>
              <div>
                <label className="text-xs text-on-surface-variant">Target Amount (₹)</label>
                <input
                  type="number"
                  className="w-full mt-1 bg-surface-container-low border border-outline-variant/30 rounded-lg px-3 py-2 text-sm text-on-surface placeholder:text-on-surface-variant/60 focus:outline-none focus:border-primary/50 sn-recessed sn-tabular"
                  value={form.target_amount}
                  onChange={e => setForm({ ...form, target_amount: e.target.value })}
                  placeholder="50000" required
                />
              </div>
              <div>
                <label className="text-xs text-on-surface-variant">Deadline</label>
                <input
                  type="date"
                  className="w-full mt-1 bg-surface-container-low border border-outline-variant/30 rounded-lg px-3 py-2 text-sm text-on-surface focus:outline-none focus:border-primary/50 sn-recessed"
                  value={form.deadline}
                  onChange={e => setForm({ ...form, deadline: e.target.value })}
                  required
                />
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
                Add Goal
              </button>
            </form>
          </div>

          <div className="bg-surface-container rounded-xl p-6 sn-neo border border-outline-variant/20">
            <h3 className="font-label-sm text-label-sm text-on-surface-variant uppercase tracking-widest mb-4">
              Your Goals
            </h3>
            {goals.length === 0 ? (
              <p className="text-on-surface-variant text-sm">No goals yet. Add your first goal above.</p>
            ) : (
              <div className="flex flex-col gap-4">
                {goals.map(g => (
                  <div key={g.goal_id} className="border-b border-outline-variant/10 last:border-0 pb-4 last:pb-0">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-full bg-surface-container-high flex items-center justify-center text-secondary border border-outline-variant/30">
                          <Icon name="flag" className="text-[16px]" fill />
                        </div>
                        <div>
                          <div className="font-medium text-on-surface text-sm">{g.goal_name}</div>
                          <div className="text-xs text-on-surface-variant">by {g.deadline}</div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-primary font-medium sn-tabular text-sm">{fmt(g.target_amount)}</div>
                        <button
                          onClick={() => checkFeasibility(g.goal_id)}
                          className="text-xs text-secondary hover:text-primary transition-colors mt-1"
                        >
                          Check Feasibility →
                        </button>
                      </div>
                    </div>

                    {feasibilityFor === g.goal_id && feasibility && (
                      <div className={`mt-3 rounded-lg border p-3 text-xs ${
                        feasibility.feasible
                          ? 'border-secondary/30 bg-secondary-container/20 text-on-surface'
                          : 'border-error/30 bg-error-container/20 text-on-surface'
                      }`}>
                        <div className="flex items-center gap-1.5 font-medium mb-1">
                          <Icon name={feasibility.feasible ? 'check_circle' : 'error'} className="text-[16px]" fill />
                          {feasibility.feasible
                            ? `Feasible — save ${fmt(feasibility.required_monthly)}/month`
                            : `Not feasible — need ${fmt(feasibility.required_monthly)}/month, only saving ${fmt(feasibility.current_surplus)}/month`}
                        </div>
                        {feasibility.suggestions?.length > 0 && (
                          <div className="mt-2 pl-1">
                            <div className="text-on-surface-variant uppercase tracking-widest text-[10px] mb-1">Top reduction suggestions</div>
                            <ol className="list-decimal list-inside space-y-0.5">
                              {feasibility.suggestions.map((s, i) => (
                                <li key={i}>{s.category} — reduce by {fmt(s.reduce_by)}/month</li>
                              ))}
                            </ol>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* RIGHT: Dead Money Detector */}
        <div className="md:col-span-7 flex flex-col gap-stack-md">
          <div className="bg-surface-container rounded-xl p-8 sn-neo relative overflow-hidden border border-outline-variant/10">
            <div className="absolute top-0 right-0 w-64 h-64 bg-error/10 blur-[60px] rounded-full pointer-events-none translate-x-1/3 -translate-y-1/3" />
            <div className="flex items-center gap-2 relative z-10 mb-2">
              <Icon name="bug_report" className="text-error text-[20px]" fill />
              <span className="font-label-sm text-label-sm text-error uppercase tracking-widest">Dead Money Detector</span>
            </div>
            {!deadMoney ? (
              <p className="text-on-surface-variant text-sm relative z-10">Analysing your subscriptions...</p>
            ) : (
              <div className="relative z-10 text-center py-4">
                <div className="text-on-surface-variant text-xs uppercase tracking-widest">Estimated Monthly Waste</div>
                <div className="text-display-lg font-display-lg text-primary sn-tabular mt-2">{fmt(deadMoney.total_monthly_waste)}</div>
                <div className="text-on-surface-variant text-sm mt-1">= {fmt(deadMoney.total_annual_waste)} per year</div>
              </div>
            )}
          </div>

          {deadMoney && deadMoney.total_monthly_waste === 0 && (
            <div className="bg-surface-container rounded-xl p-6 sn-neo border border-secondary/30 text-secondary text-sm flex items-center gap-2">
              <Icon name="check_circle" className="text-[18px]" fill />
              No dead money detected. Your subscriptions look clean!
            </div>
          )}

          {deadMoney && wasteRows.map(({ key, icon, label, note, render }) => (
            deadMoney[key]?.length > 0 && (
              <div key={key} className="bg-surface-container rounded-xl p-6 sn-neo border border-outline-variant/20">
                <h3 className="font-label-sm text-label-sm text-on-surface-variant uppercase tracking-widest mb-4 flex items-center gap-2">
                  <Icon name={icon} className="text-[16px]" />
                  {label}
                </h3>
                <div className="flex flex-col gap-3">
                  {deadMoney[key].map((item, i) => {
                    const r = render(item);
                    return (
                      <div key={i} className="flex items-center justify-between border-b border-outline-variant/10 last:border-0 pb-3 last:pb-0">
                        <div>
                          <div className="text-on-surface text-sm font-medium">{r.title}</div>
                          {(r.sub || note) && <div className="text-xs text-on-surface-variant mt-0.5">{r.sub || note}</div>}
                        </div>
                        {r.value && <div className={`text-sm font-medium sn-tabular ${r.tone}`}>{r.value}</div>}
                      </div>
                    );
                  })}
                </div>
              </div>
            )
          ))}
        </div>
      </div>
    </div>
  );
}
