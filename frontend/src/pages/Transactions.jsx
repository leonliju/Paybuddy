import { useState, useRef } from 'react';
import API from '../services/api';

const CATEGORIES = ['Food','Travel','Bills','Shopping','Education',
                    'Medical','Entertainment','Income','Other'];
const fmt = n => '₹' + Number(n).toLocaleString('en-IN', { maximumFractionDigits: 0 });

const Icon = ({ name, className = '', fill = false }) => (
  <span
    className={`material-symbols-outlined ${className}`}
    style={{ fontVariationSettings: `'FILL' ${fill ? 1 : 0}` }}
  >
    {name}
  </span>
);

const Badge = ({ tone, children }) => {
  const tones = {
    good:  'text-secondary border-secondary/30 bg-secondary-container/20',
    mid:   'text-primary border-outline-variant/40 bg-surface-container-high',
    bad:   'text-error border-error/30 bg-error-container/20',
  };
  return (
    <span className={`text-xs px-2 py-0.5 rounded-full border font-medium sn-tabular ${tones[tone]}`}>
      {children}
    </span>
  );
};

const TABS = [
  { key: 'csv',    icon: 'upload_file',  label: 'Upload CSV' },
  { key: 'gpay',   icon: 'description',  label: 'Google Pay HTML' },
  { key: 'manual', icon: 'edit_note',    label: 'Manual Entry' },
];

export default function Transactions() {
  const [activeTab, setActiveTab] = useState('csv');
  const [preview, setPreview] = useState([]);
  const [importing, setImporting] = useState(false);
  const [message, setMessage] = useState('');
  const [stepsOpen, setStepsOpen] = useState(false);
  const [form, setForm] = useState({
    date: '', amount: '', direction: 'debit',
    description: '', merchant: '', category: '', note: ''
  });
  const csvRef = useRef();
  const gpayRef = useRef();

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
      setForm({ date: '', amount: '', direction: 'debit',
                description: '', merchant: '', category: '', note: '' });
    } catch (err) {
      setMessage('✗ ' + (err.response?.data?.detail || 'Failed'));
    }
  };

  const inputCls = "w-full mt-1 bg-surface-container-low border border-outline-variant/30 rounded-lg px-3 py-2 text-sm text-on-surface placeholder:text-on-surface-variant/50 focus:outline-none focus:border-primary/50 sn-recessed";
  const labelCls = "text-xs text-on-surface-variant";

  return (
    <div className="dark bg-background text-on-surface font-body-md antialiased -m-6 p-container-padding min-h-screen">
      <header className="mb-stack-lg">
        <h1 className="font-headline-lg-mobile md:font-headline-lg text-headline-lg-mobile md:text-headline-lg text-on-surface tracking-tight">
          Transaction Ingestion
        </h1>
        <p className="text-on-surface-variant mt-2 max-w-xl text-body-md">
          Bring transactions in from a CSV export, your Google Pay history, or add them by hand.
        </p>
      </header>

      {/* Source Tabs */}
      <div className="flex gap-2 mb-6 flex-wrap">
        {TABS.map(t => (
          <button
            key={t.key}
            onClick={() => { setActiveTab(t.key); setMessage(''); }}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-full font-label-sm text-label-sm uppercase tracking-widest transition-all border ${
              activeTab === t.key
                ? 'bg-secondary-container/30 text-primary border-secondary-container/50 shadow-[0_0_15px_rgba(192,192,192,0.1)]'
                : 'text-on-surface-variant border-outline-variant/20 hover:text-on-surface'
            }`}
          >
            <Icon name={t.icon} className="text-[16px]" fill={activeTab === t.key} />
            {t.label}
          </button>
        ))}
      </div>

      {message && (
        <div className={`mb-6 text-sm px-4 py-3 rounded-lg border flex items-center gap-2 ${
          message.startsWith('✓')
            ? 'text-secondary border-secondary/30 bg-secondary-container/20'
            : 'text-error border-error/30 bg-error-container/20'
        }`}>
          <Icon name={message.startsWith('✓') ? 'check_circle' : 'error'} className="text-[16px]" fill />
          {message}
        </div>
      )}

      {/* CSV Upload */}
      {activeTab === 'csv' && (
        <div className="bg-surface-container rounded-xl p-8 sn-neo border border-outline-variant/20 max-w-3xl">
          <h3 className="font-label-sm text-label-sm text-on-surface-variant uppercase tracking-widest mb-2">
            Import CSV File
          </h3>
          <p className="text-xs text-on-surface-variant mb-5 leading-relaxed">
            CSV should have columns: date (DD-MM-YYYY), amount, direction (Debit/Credit),
            description, merchant, category, note
          </p>

          <input type="file" accept=".csv" ref={csvRef} className="hidden" onChange={handleCSV} />
          <button
            onClick={() => csvRef.current.click()}
            disabled={importing}
            className="flex items-center gap-2 bg-primary-container text-on-primary-container hover:bg-outline-variant transition-colors px-6 py-2.5 rounded-full font-medium text-sm shadow-[inset_0_1px_0_rgba(255,255,255,0.1)] disabled:opacity-50"
          >
            <Icon name={importing ? 'progress_activity' : 'upload_file'} className={`text-[18px] ${importing ? 'animate-spin' : ''}`} />
            {importing ? 'Importing...' : 'Choose CSV File'}
          </button>

          {preview.length > 0 && (
            <div className="mt-8">
              <h4 className="font-label-sm text-label-sm text-on-surface-variant uppercase tracking-widest mb-3">
                Import Preview — first 10 rows
              </h4>
              <div className="overflow-x-auto rounded-lg border border-outline-variant/20">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-outline-variant/20 text-on-surface-variant text-xs uppercase tracking-widest">
                      <th className="text-left font-medium py-2.5 px-3">Date</th>
                      <th className="text-left font-medium py-2.5 px-3">Amount</th>
                      <th className="text-left font-medium py-2.5 px-3">Merchant</th>
                      <th className="text-left font-medium py-2.5 px-3">Category</th>
                      <th className="text-left font-medium py-2.5 px-3">Confidence</th>
                    </tr>
                  </thead>
                  <tbody>
                    {preview.map((p, i) => (
                      <tr key={i} className="border-b border-outline-variant/10 last:border-0">
                        <td className="py-2.5 px-3 text-on-surface-variant">{p.date}</td>
                        <td className="py-2.5 px-3 sn-tabular font-medium">{fmt(p.amount)}</td>
                        <td className="py-2.5 px-3">{p.merchant}</td>
                        <td className="py-2.5 px-3 text-on-surface-variant">{p.category}</td>
                        <td className="py-2.5 px-3">
                          <Badge tone={p.confidence >= 0.8 ? 'good' : p.confidence >= 0.6 ? 'mid' : 'bad'}>
                            {Math.round(p.confidence * 100)}%
                          </Badge>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Google Pay HTML */}
      {activeTab === 'gpay' && (
        <div className="bg-surface-container rounded-xl p-8 sn-neo border border-outline-variant/20 max-w-3xl">
          <h3 className="font-label-sm text-label-sm text-on-surface-variant uppercase tracking-widest mb-2">
            Import Google Pay Transaction History
          </h3>
          <p className="text-xs text-on-surface-variant mb-1 leading-relaxed">
            Upload the <strong className="text-on-surface">MyActivity.html</strong> file from Google Takeout.
            Maximum file size: 10 MB.
          </p>

          <a href="https://takeout.google.com" target="_blank" rel="noreferrer"
            className="text-xs text-secondary hover:text-primary inline-flex items-center gap-1 my-3 transition-colors">
            <Icon name="open_in_new" className="text-[14px]" />
            Don't have your file? Download from Google Takeout
          </a>

          <div>
            <button
              onClick={() => setStepsOpen(!stepsOpen)}
              className="flex items-center gap-1.5 text-xs text-on-surface-variant hover:text-on-surface transition-colors"
            >
              <Icon name={stepsOpen ? 'expand_less' : 'expand_more'} className="text-[16px]" />
              How to get your Google Pay file? (step-by-step guide)
            </button>
            {stepsOpen && (
              <div className="mt-3 rounded-lg border border-outline-variant/20 bg-surface-container-low p-4 text-xs text-on-surface-variant leading-relaxed space-y-1.5 sn-recessed">
                <div>Step 1 → Go to <a href="https://takeout.google.com" target="_blank" rel="noreferrer" className="text-secondary">takeout.google.com</a></div>
                <div>Step 2 → Click <strong className="text-on-surface">"Deselect all"</strong> at the top</div>
                <div>Step 3 → Search for <strong className="text-on-surface">"Google Pay"</strong> and tick it</div>
                <div>Step 4 → Click <strong className="text-on-surface">"Next step"</strong></div>
                <div>Step 5 → Choose <strong className="text-on-surface">Export once</strong>, file type <strong className="text-on-surface">.zip</strong></div>
                <div>Step 6 → Click <strong className="text-on-surface">"Create export"</strong></div>
                <div>Step 7 → Wait for email (usually 30 min – 2 hours)</div>
                <div>Step 8 → Download the ZIP file from the email link</div>
                <div>Step 9 → Open the ZIP → Go to <strong className="text-on-surface">Takeout / Google Pay / My Activity /</strong></div>
                <div>Step 10 → Upload <strong className="text-on-surface">MyActivity.html</strong> here ↓</div>
                <div className="pt-1 text-on-surface-variant/70">⏱ Tip: Request tonight and it will be ready by morning!</div>
              </div>
            )}
          </div>

          <div className="mt-5">
            <input type="file" accept=".html" ref={gpayRef} className="hidden" onChange={handleGPay} />
            <button
              onClick={() => gpayRef.current.click()}
              disabled={importing}
              className="flex items-center gap-2 bg-primary-container text-on-primary-container hover:bg-outline-variant transition-colors px-6 py-2.5 rounded-full font-medium text-sm shadow-[inset_0_1px_0_rgba(255,255,255,0.1)] disabled:opacity-50"
            >
              <Icon name={importing ? 'progress_activity' : 'upload_file'} className={`text-[18px] ${importing ? 'animate-spin' : ''}`} />
              {importing ? 'Importing...' : 'Choose MyActivity.html'}
            </button>
          </div>

          {preview.length > 0 && (
            <div className="mt-8">
              <h4 className="font-label-sm text-label-sm text-on-surface-variant uppercase tracking-widest mb-3">
                Import Preview — first 10 rows
              </h4>
              <div className="overflow-x-auto rounded-lg border border-outline-variant/20">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-outline-variant/20 text-on-surface-variant text-xs uppercase tracking-widest">
                      <th className="text-left font-medium py-2.5 px-3">Date</th>
                      <th className="text-left font-medium py-2.5 px-3">Amount</th>
                      <th className="text-left font-medium py-2.5 px-3">Merchant</th>
                      <th className="text-left font-medium py-2.5 px-3">Direction</th>
                      <th className="text-left font-medium py-2.5 px-3">Category</th>
                    </tr>
                  </thead>
                  <tbody>
                    {preview.map((p, i) => (
                      <tr key={i} className="border-b border-outline-variant/10 last:border-0">
                        <td className="py-2.5 px-3 text-on-surface-variant">{p.date}</td>
                        <td className="py-2.5 px-3 sn-tabular font-medium">{fmt(p.amount)}</td>
                        <td className="py-2.5 px-3">{p.merchant}</td>
                        <td className="py-2.5 px-3">
                          <Badge tone={p.direction === 'credit' ? 'good' : 'bad'}>{p.direction}</Badge>
                        </td>
                        <td className="py-2.5 px-3 text-on-surface-variant">{p.category}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Manual Entry */}
      {activeTab === 'manual' && (
        <div className="bg-surface-container rounded-xl p-8 sn-neo border border-outline-variant/20 max-w-3xl">
          <h3 className="font-label-sm text-label-sm text-on-surface-variant uppercase tracking-widest mb-5">
            Add Transaction Manually
          </h3>
          <form onSubmit={handleManual} className="flex flex-col gap-4">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className={labelCls}>Date</label>
                <input type="date" className={inputCls}
                  value={form.date} onChange={e => setForm({ ...form, date: e.target.value })} required />
              </div>
              <div>
                <label className={labelCls}>Amount (₹)</label>
                <input type="number" step="0.01" className={`${inputCls} sn-tabular`}
                  value={form.amount} onChange={e => setForm({ ...form, amount: e.target.value })}
                  placeholder="0.00" required />
              </div>
              <div>
                <label className={labelCls}>Direction</label>
                <select className={inputCls} value={form.direction}
                  onChange={e => setForm({ ...form, direction: e.target.value })}>
                  <option value="debit">Debit (Expense)</option>
                  <option value="credit">Credit (Income)</option>
                </select>
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className={labelCls}>Merchant</label>
                <input className={inputCls} value={form.merchant}
                  onChange={e => setForm({ ...form, merchant: e.target.value })}
                  placeholder="e.g. Swiggy" />
              </div>
              <div>
                <label className={labelCls}>Description</label>
                <input className={inputCls} value={form.description}
                  onChange={e => setForm({ ...form, description: e.target.value })}
                  placeholder="e.g. Lunch order" />
              </div>
              <div>
                <label className={labelCls}>Category</label>
                <select className={inputCls} value={form.category}
                  onChange={e => setForm({ ...form, category: e.target.value })}>
                  <option value="">Auto-detect</option>
                  {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
            </div>
            <div>
              <label className={labelCls}>Note (optional)</label>
              <input className={inputCls} value={form.note}
                onChange={e => setForm({ ...form, note: e.target.value })}
                placeholder="Any additional notes" />
            </div>
            <button
              type="submit"
              className="mt-1 bg-primary-container text-on-primary-container hover:bg-outline-variant transition-colors px-6 py-2.5 rounded-full font-medium text-sm shadow-[inset_0_1px_0_rgba(255,255,255,0.1)] w-fit"
            >
              Add Transaction
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
