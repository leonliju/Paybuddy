import { useEffect, useState } from 'react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import API from '../services/api';

const fmt = n => '₹' + Number(n).toLocaleString('en-IN', {maximumFractionDigits:0});

export default function Anomaly() {
  const [flags,    setFlags]    = useState([]);
  const [running,  setRunning]  = useState(false);
  const [message,  setMessage]  = useState('');

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

  // Category distribution for chart
  const byCat = flags.reduce((acc, f) => {
    acc[f.category] = (acc[f.category] || 0) + 1;
    return acc;
  }, {});
  const chartData = Object.entries(byCat).map(([k,v]) => ({category:k, count:v}));

  return (
    <div>
      <div className="page-title">Anomaly Alerts</div>

      <div style={{ display:'flex', alignItems:'center', gap:16, marginBottom:20 }}>
        <button className="btn btn-primary" onClick={detect} disabled={running}>
          {running ? <><span className="spinner"/> Running...</> : 'Run Anomaly Detection'}
        </button>
        <div style={{
          background:'#fdecea', border:'1px solid #f5b7b1',
          borderRadius:6, padding:'8px 16px', fontSize:13, color:'#922b21'
        }}>
          {flags.length} anomalies detected
        </div>
      </div>

      {message && (
        <div className={`alert ${message.startsWith('✓') ? 'alert-success':'alert-danger'}`}>
          {message}
        </div>
      )}

      {/* Anomaly Cards */}
      {flags.length === 0 ? (
        <div className="card">
          <p style={{color:'#aaa',textAlign:'center',padding:20}}>
            No anomalies detected yet. Click "Run Anomaly Detection" to analyse your transactions.
          </p>
        </div>
      ) : (
        <>
          {flags.map(f => (
            <div key={f.flag_id} style={{
              background:'#fff', border:'1px solid #e8e8e0',
              borderLeft: f.method==='zscore' ? '4px solid #f1c40f' : '4px solid #e74c3c',
              borderRadius:6, padding:'14px 16px', marginBottom:10
            }}>
              <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start' }}>
                <div>
                  <div style={{ fontWeight:600, fontSize:14, marginBottom:4 }}>
                    {f.merchant || 'Unknown Merchant'}
                    <span style={{marginLeft:8, fontSize:12, color:'#888'}}>{f.date}</span>
                  </div>
                  <div style={{ fontSize:12, color:'#555', marginBottom:6 }}>{f.reason}</div>
                  <div style={{ display:'flex', gap:8 }}>
                    <span className={`badge badge-${f.method==='zscore'?'zscore':'iso'}`}>
                      {f.method === 'zscore' ? 'Z-Score' : 'Isolation Forest'}
                    </span>
                    <span className="badge" style={{background:'#f0f0e8',color:'#555'}}>
                      {f.category}
                    </span>
                    <span style={{fontSize:11,color:'#888'}}>Score: {f.score}</span>
                  </div>
                </div>
                <div style={{ fontSize:22, fontWeight:800, color:'#c0392b' }}>
                  {fmt(f.amount)}
                </div>
              </div>
            </div>
          ))}

          {chartData.length > 0 && (
            <div className="card" style={{marginTop:16}}>
              <div className="card-title">Anomaly Distribution by Category</div>
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={chartData}>
                  <XAxis dataKey="category" tick={{fontSize:11}} />
                  <YAxis tick={{fontSize:11}} />
                  <Tooltip />
                  <Bar dataKey="count" fill="#c0392b" radius={[3,3,0,0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </>
      )}
    </div>
  );
}