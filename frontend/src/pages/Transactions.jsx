import { useState, useRef } from 'react';
import { Upload, FileText, PenLine, ExternalLink, ChevronDown, ChevronUp } from 'lucide-react';
import API from '../services/api';

const CATEGORIES = ['Food','Travel','Bills','Shopping','Education',
                    'Medical','Entertainment','Income','Other'];
const fmt = n => '₹' + Number(n).toLocaleString('en-IN', { maximumFractionDigits: 0 });

export default function Transactions() {
  const [activeTab,    setActiveTab]    = useState('csv');
  const [preview,      setPreview]      = useState([]);
  const [importing,    setImporting]    = useState(false);
  const [message,      setMessage]      = useState('');
  const [stepsOpen,    setStepsOpen]    = useState(false);
  const [form, setForm] = useState({
    date:'', amount:'', direction:'debit',
    description:'', merchant:'', category:'', note:''
  });
  const csvRef   = useRef();
  const gpayRef  = useRef();

  const handleCSV = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setImporting(true); setMessage('');
    const fd = new FormData();
    fd.append('file', file);
    try {
      const res = await API.post('/transactions/import-csv', fd);
      setPreview(res.data.preview);
      setMessage(`✓ ${res.data.imported} transactions imported successfully`);
    } catch (err) {
      setMessage('✗ ' + (err.response?.data?.detail || 'Import failed'));
    } finally { setImporting(false); }
  };

  const handleGPay = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (file.size > 10 * 1024 * 1024) {
      setMessage('✗ File too large. Maximum size is 10 MB.'); return;
    }
    setImporting(true); setMessage('');
    const fd = new FormData();
    fd.append('file', file);
    try {
      const res = await API.post('/transactions/import-gpay-html', fd);
      setPreview(res.data.preview);
      setMessage(`✓ ${res.data.imported} Google Pay transactions imported successfully`);
    } catch (err) {
      setMessage('✗ ' + (err.response?.data?.detail || 'Import failed'));
    } finally { setImporting(false); }
  };

  const handleManual = async (e) => {
    e.preventDefault();
    try {
      await API.post('/transactions/manual', form);
      setMessage('✓ Transaction added successfully');
      setForm({ date:'', amount:'', direction:'debit',
                description:'', merchant:'', category:'', note:'' });
    } catch (err) {
      setMessage('✗ ' + (err.response?.data?.detail || 'Failed'));
    }
  };

  return (
    <div>
      <div className="page-title">Transaction Ingestion</div>

      {/* Import Method Tabs */}
      <div style={{ display:'flex', gap:8, marginBottom:20 }}>
        {[
          { key:'csv',    icon:<Upload size={14}/>,       label:'Upload CSV' },
          { key:'gpay',   icon:<FileText size={14}/>,     label:'Google Pay HTML' },
          { key:'manual', icon:<PenLine size={14}/>,      label:'Manual Entry' },
        ].map(t => (
          <button key={t.key} onClick={() => { setActiveTab(t.key); setMessage(''); }}
            className={`btn ${activeTab===t.key ? 'btn-primary' : 'btn-outline'}`}
            style={{ display:'flex', alignItems:'center', gap:6 }}>
            {t.icon} {t.label}
          </button>
        ))}
      </div>

      {message && (
        <div className={`alert ${message.startsWith('✓') ? 'alert-success' : 'alert-danger'}`}>
          {message}
        </div>
      )}

      {/* CSV Upload */}
      {activeTab === 'csv' && (
        <div className="card">
          <div className="card-title">Import CSV File</div>
          <p style={{fontSize:12,color:'#666',marginBottom:12}}>
            CSV should have columns: date (DD-MM-YYYY), amount, direction (Debit/Credit),
            description, merchant, category, note
          </p>
          <input type="file" accept=".csv" ref={csvRef}
            style={{display:'none'}} onChange={handleCSV} />
          <button className="btn btn-gold" onClick={() => csvRef.current.click()}
            disabled={importing}>
            {importing ? <><span className="spinner"/> Importing...</> : 'Choose CSV File'}
          </button>

          {preview.length > 0 && (
            <div style={{marginTop:16}}>
              <div className="card-title">Import Preview (first 10 rows)</div>
              <table className="data-table">
                <thead>
                  <tr><th>Date</th><th>Amount</th><th>Merchant</th>
                      <th>Category</th><th>Confidence</th></tr>
                </thead>
                <tbody>
                  {preview.map((p,i) => (
                    <tr key={i}>
                      <td>{p.date}</td>
                      <td className="amount">{fmt(p.amount)}</td>
                      <td>{p.merchant}</td>
                      <td>{p.category}</td>
                      <td>
                        <span className={`badge badge-${
                          p.confidence >= 0.8 ? 'high' :
                          p.confidence >= 0.6 ? 'medium' : 'low'}`}>
                          {Math.round(p.confidence * 100)}%
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Google Pay HTML */}
      {activeTab === 'gpay' && (
        <div className="card">
          <div className="card-title">Import Google Pay Transaction History</div>
          <p style={{fontSize:12,color:'#666',marginBottom:4}}>
            Upload the <strong>MyActivity.html</strong> file from Google Takeout.
            Maximum file size: 10 MB.
          </p>

          <a href="https://takeout.google.com" target="_blank" rel="noreferrer"
            style={{ fontSize:12, color:'#2980b9', display:'inline-flex',
                     alignItems:'center', gap:4, marginBottom:12 }}>
            <ExternalLink size={12}/> Don't have your file? Download from Google Takeout
          </a>

          {/* Collapsible Steps */}
          <div>
            <div className="steps-toggle" onClick={() => setStepsOpen(!stepsOpen)}>
              {stepsOpen ? <ChevronUp size={14}/> : <ChevronDown size={14}/>}
              How to get your Google Pay file? (Step-by-step guide)
            </div>
            {stepsOpen && (
              <div className="steps-body">
                <div>Step 1 → Go to <a href="https://takeout.google.com"
                  target="_blank" rel="noreferrer" style={{color:'#2980b9'}}>
                  takeout.google.com</a></div>
                <div>Step 2 → Click <strong>"Deselect all"</strong> at the top</div>
                <div>Step 3 → Search for <strong>"Google Pay"</strong> and tick it</div>
                <div>Step 4 → Click <strong>"Next step"</strong></div>
                <div>Step 5 → Choose <strong>Export once</strong>, file type <strong>.zip</strong></div>
                <div>Step 6 → Click <strong>"Create export"</strong></div>
                <div>Step 7 → Wait for email (usually 30 min – 2 hours)</div>
                <div>Step 8 → Download the ZIP file from the email link</div>
                <div>Step 9 → Open the ZIP → Go to <strong>Takeout / Google Pay / My Activity /</strong></div>
                <div>Step 10 → Upload <strong>MyActivity.html</strong> here ↓</div>
                <div style={{marginTop:6,color:'#888'}}>
                  ⏱ Tip: Request tonight and it will be ready by morning!
                </div>
              </div>
            )}
          </div>

          <div style={{marginTop:12}}>
            <input type="file" accept=".html" ref={gpayRef}
              style={{display:'none'}} onChange={handleGPay} />
            <button className="btn btn-gold" onClick={() => gpayRef.current.click()}
              disabled={importing}>
              {importing ? <><span className="spinner"/> Importing...</> : 'Choose MyActivity.html'}
            </button>
          </div>

          {preview.length > 0 && (
            <div style={{marginTop:16}}>
              <div className="card-title">Import Preview (first 10 rows)</div>
              <table className="data-table">
                <thead>
                  <tr><th>Date</th><th>Amount</th><th>Merchant</th>
                      <th>Direction</th><th>Category</th></tr>
                </thead>
                <tbody>
                  {preview.map((p,i) => (
                    <tr key={i}>
                      <td>{p.date}</td>
                      <td className="amount">{fmt(p.amount)}</td>
                      <td>{p.merchant}</td>
                      <td><span className={`badge badge-${p.direction}`}>{p.direction}</span></td>
                      <td>{p.category}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Manual Entry */}
      {activeTab === 'manual' && (
        <div className="card">
          <div className="card-title">Add Transaction Manually</div>
          <form onSubmit={handleManual}>
            <div className="form-row">
              <div className="form-group">
                <label className="form-label">Date</label>
                <input className="form-control" type="date"
                  value={form.date} onChange={e => setForm({...form, date:e.target.value})}
                  required />
              </div>
              <div className="form-group">
                <label className="form-label">Amount (₹)</label>
                <input className="form-control" type="number" step="0.01"
                  value={form.amount} onChange={e => setForm({...form, amount:e.target.value})}
                  placeholder="0.00" required />
              </div>
              <div className="form-group">
                <label className="form-label">Direction</label>
                <select className="form-control" value={form.direction}
                  onChange={e => setForm({...form, direction:e.target.value})}>
                  <option value="debit">Debit (Expense)</option>
                  <option value="credit">Credit (Income)</option>
                </select>
              </div>
            </div>
            <div className="form-row">
              <div className="form-group">
                <label className="form-label">Merchant</label>
                <input className="form-control" value={form.merchant}
                  onChange={e => setForm({...form, merchant:e.target.value})}
                  placeholder="e.g. Swiggy" />
              </div>
              <div className="form-group">
                <label className="form-label">Description</label>
                <input className="form-control" value={form.description}
                  onChange={e => setForm({...form, description:e.target.value})}
                  placeholder="e.g. Lunch order" />
              </div>
              <div className="form-group">
                <label className="form-label">Category</label>
                <select className="form-control" value={form.category}
                  onChange={e => setForm({...form, category:e.target.value})}>
                  <option value="">Auto-detect</option>
                  {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
            </div>
            <div className="form-group" style={{marginBottom:16}}>
              <label className="form-label">Note (optional)</label>
              <input className="form-control" value={form.note}
                onChange={e => setForm({...form, note:e.target.value})}
                placeholder="Any additional notes" />
            </div>
            <button className="btn btn-primary" type="submit">Add Transaction</button>
          </form>
        </div>
      )}
    </div>
  );
}