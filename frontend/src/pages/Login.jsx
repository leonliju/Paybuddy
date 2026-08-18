import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import API from '../services/api';

const Icon = ({ name, className = '' }) => (
  <span className={`material-symbols-outlined ${className}`}>{name}</span>
);

export default function Login() {
  const [mode, setMode] = useState('login');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(''); setLoading(true);
    try {
      const endpoint = mode === 'login' ? '/auth/login' : '/auth/register';
      const res = await API.post(endpoint, { username, password });
      login(res.data);
      // New accounts walk through onboarding; returning users go straight in.
      navigate(mode === 'login' ? '/dashboard' : '/onboarding/categories');
    } catch (err) {
      setError(err.response?.data?.detail || 'Something went wrong');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="dark bg-[#0A0A0C] text-on-surface font-body-md antialiased min-h-screen flex items-center justify-center p-gutter relative overflow-hidden">
      <div className="absolute top-0 left-0 w-full h-full pointer-events-none overflow-hidden z-0">
        <div className="absolute -top-[20%] -left-[10%] w-[50%] h-[50%] bg-primary-container opacity-[0.05] blur-[120px] rounded-full" />
        <div className="absolute bottom-[10%] -right-[10%] w-[40%] h-[60%] bg-primary-container opacity-[0.04] blur-[100px] rounded-full" />
      </div>

      <main className="relative z-10 w-full max-w-md rounded-[24px] border border-white/10 bg-[rgba(22,22,26,0.7)] backdrop-blur-2xl p-10 flex flex-col items-center shadow-[0_10px_30px_-10px_rgba(192,192,192,0.08)]">
        <div className="mb-8 flex items-center justify-center w-12 h-12 rounded-full border border-white/10 bg-surface-container-lowest shadow-[inset_0_2px_4px_rgba(255,255,255,0.1)]">
          <Icon name="account_balance_wallet" className="text-primary text-[24px]" />
        </div>

        <div className="w-full text-left mb-8">
          <h1 className="font-display-lg text-display-lg text-primary tracking-tighter leading-none lowercase">
            {mode === 'login' ? 'welcome back.' : 'get started.'}
          </h1>
          <p className="text-on-surface-variant mt-2 text-body-md">
            {mode === 'login' ? 'Sign in to manage your wealth.' : 'Create an account to begin tracking.'}
          </p>
        </div>

        <div className="w-full flex mb-8 border-b border-white/10">
          {['login', 'register'].map(m => (
            <button
              key={m}
              onClick={() => { setMode(m); setError(''); }}
              className={`flex-1 py-2.5 text-center font-label-sm text-label-sm uppercase tracking-widest capitalize transition-colors border-b-2 -mb-px ${
                mode === m ? 'text-primary border-primary' : 'text-on-surface-variant border-transparent hover:text-on-surface'
              }`}
            >
              {m}
            </button>
          ))}
        </div>

        <form onSubmit={handleSubmit} className="w-full space-y-6">
          <div className="space-y-2">
            <label className="font-label-sm text-label-sm text-on-surface-variant block uppercase tracking-widest">
              Username
            </label>
            <div className="relative flex items-center bg-surface-container-lowest border border-white/10 rounded-lg h-14 px-4 transition-all focus-within:border-white focus-within:shadow-[0_0_0_4px_rgba(255,255,255,0.08)]">
              <Icon name="person" className="text-outline-variant mr-3 text-[20px]" />
              <input
                className="w-full bg-transparent border-none text-on-surface text-sm placeholder:text-outline-variant focus:outline-none focus:ring-0 p-0"
                value={username} onChange={e => setUsername(e.target.value)}
                placeholder="Enter username" required
              />
            </div>
          </div>

          <div className="space-y-2">
            <label className="font-label-sm text-label-sm text-on-surface-variant block uppercase tracking-widest">
              Password
            </label>
            <div className="relative flex items-center bg-surface-container-lowest border border-white/10 rounded-lg h-14 px-4 transition-all focus-within:border-white focus-within:shadow-[0_0_0_4px_rgba(255,255,255,0.08)]">
              <Icon name="lock" className="text-outline-variant mr-3 text-[20px]" />
              <input
                type="password"
                className="w-full bg-transparent border-none text-on-surface text-sm placeholder:text-outline-variant focus:outline-none focus:ring-0 p-0"
                value={password} onChange={e => setPassword(e.target.value)}
                placeholder="Enter password" required
              />
            </div>
          </div>

          {error && (
            <div className="text-sm px-4 py-3 rounded-lg border border-error/30 bg-error-container/20 text-error">
              {error}
            </div>
          )}

          <button
            type="submit" disabled={loading}
            className="w-full h-14 bg-white text-black font-label-sm text-label-sm uppercase tracking-widest rounded-lg flex items-center justify-center hover:bg-gray-200 transition-colors shadow-[0_0_15px_rgba(255,255,255,0.15)] disabled:opacity-50"
          >
            {loading ? 'Please wait...' : mode === 'login' ? 'Sign In' : 'Create Account'}
          </button>
        </form>
      </main>
    </div>
  );
}
