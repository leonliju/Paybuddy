import { useState } from 'react';
import { LineChart, Line, XAxis, YAxis, Tooltip,
         ResponsiveContainer } from 'recharts';
import API from '../services/api';

const CATEGORIES = ['all','Food','Travel','Bills','Shopping',
                    'Education','Medical','Entertainment','Income','Other'];
const fmt = n => '₹' + Number(n).toLocaleString('en-IN', {maximumFractionDigits:0});

export default function Forecast() {
  const [category, setCategory] = useState('all');
  const [data,     setData]     = useState(null);
  const [loading,  setLoading]  = useState(false);

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

  return (
    <div>
      <div className="page-title">Expense Forecasting</div>

      <div className="card">
        <div style={{ display:'flex', gap:12, alignItems:'flex-end', marginBottom:16 }}>
          <div className="form-group">
            <label className="form-label">Category</label>
            <select className="form-control" value={category}
              onChange={e => setCategory(e.target.value)}
              style={{width:180}}>
              {CATEGORIES.map(c => <option key={c} value={c}>
                {c === 'all' ? 'All Categories' : c}
              </option>)}
            </select>
          </div>
          <button className="btn btn-primary" onClick={fetchForecast} disabled={loading}>
            {loading ? <><span className="spinner"/> Loading...</> : 'Get Forecast'}
          </button>
        </div>

        {data?.insufficient_data && (
          <div className="alert alert-warning">
            ⚠️ Not enough historical data for this category. Add more transactions and
            check back after 3 months of data.
          </div>
        )}

        {data && !data.insufficient_data && (
          <>
            {/* Forecast Cards */}
            <div className="grid-2" style={{marginBottom:20}}>
              <div style={{
                background:'#fafaf5', border:'2px solid #c9a84c',
                borderRadius:8, padding:20, textAlign:'center'
              }}>
                <div style={{fontSize:11,color:'#888',fontWeight:600,
                              textTransform:'uppercase',letterSpacing:0.5}}>
                  Linear Regression Forecast
                </div>
                <div style={{fontSize:32,fontWeight:800,color:'#1a1a2e',margin:'8px 0'}}>
                  {fmt(data.lr_forecast)}
                </div>
                <div style={{fontSize:11,color:'#888'}}>MAE: {fmt(data.mae_lr)}</div>
              </div>

              {data.arima_forecast && (
                <div style={{
                  background:'#fafaf5', border:'2px solid #1a1a2e',
                  borderRadius:8, padding:20, textAlign:'center'
                }}>
                  <div style={{fontSize:11,color:'#888',fontWeight:600,
                                textTransform:'uppercase',letterSpacing:0.5}}>
                    ARIMA Forecast
                  </div>
                  <div style={{fontSize:32,fontWeight:800,color:'#1a1a2e',margin:'8px 0'}}>
                    {fmt(data.arima_forecast)}
                  </div>
                  <div style={{fontSize:11,color:'#888'}}>MAE: {fmt(data.mae_arima)}</div>
                </div>
              )}
            </div>

            {/* Chart */}
            <div className="card-title">Historical + Forecast</div>
            <ResponsiveContainer width="100%" height={240}>
              <LineChart data={chartData}>
                <XAxis dataKey="month" tick={{fontSize:11}} />
                <YAxis tick={{fontSize:11}} tickFormatter={v=>'₹'+v/1000+'k'} />
                <Tooltip formatter={v => fmt(v)} />
                <Line type="monotone" dataKey="actual" stroke="#1a1a2e"
                      strokeWidth={2} dot={{r:4}} name="Actual" />
                <Line type="monotone" dataKey="lr_forecast" stroke="#c9a84c"
                      strokeWidth={2} strokeDasharray="5 5" dot={{r:5}} name="LR Forecast" />
                {data.arima_forecast && (
                  <Line type="monotone" dataKey="arima_forecast" stroke="#2d7a2d"
                        strokeWidth={2} strokeDasharray="5 5" dot={{r:5}} name="ARIMA Forecast" />
                )}
              </LineChart>
            </ResponsiveContainer>

            {/* Model Comparison */}
            <div className="card-title" style={{marginTop:16}}>Model Comparison</div>
            <table className="data-table">
              <thead>
                <tr><th>Model</th><th>Forecast</th><th>MAE</th></tr>
              </thead>
              <tbody>
                <tr>
                  <td>Linear Regression</td>
                  <td className="amount">{fmt(data.lr_forecast)}</td>
                  <td>{fmt(data.mae_lr)}</td>
                </tr>
                {data.arima_forecast && (
                  <tr>
                    <td>ARIMA (1,1,1)</td>
                    <td className="amount">{fmt(data.arima_forecast)}</td>
                    <td>{fmt(data.mae_arima)}</td>
                  </tr>
                )}
              </tbody>
            </table>
          </>
        )}
      </div>
    </div>
  );
}