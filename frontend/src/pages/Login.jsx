import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import API from '../services/api';

export default function Login() {
  const [mode,     setMode]     = useState('login');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error,    setError]    = useState('');
  const [loading,  setLoading]  = useState(false);
  const { login } = useAuth();
  const navigate  = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(''); setLoading(true);
    try {
      const endpoint = mode === 'login' ? '/auth/login' : '/auth/register';
      const res = await API.post(endpoint, { username, password });
      login(res.data);
      navigate('/dashboard');
    } catch (err) {
      setError(err.response?.data?.detail || 'Something went wrong');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      minHeight: '100vh', background: '#1a1a2e',
      display: 'flex', alignItems: 'center', justifyContent: 'center'
    }}>
      <div style={{
        background: '#fff', borderRadius: 10, padding: '40px',
        width: 380, boxShadow: '0 4px 24px rgba(0,0,0,0.3)'
      }}>
        <div style={{ textAlign: 'center', marginBottom: 28 }}>
          <h1 style={{ color: '#c9a84c', fontSize: 28, fontWeight: 800, letterSpacing: 2 }}>
            PAYBUDDY
          </h1>
          <p style={{ color: '#888', fontSize: 12, marginTop: 4 }}>
            Personal Finance Intelligence
          </p>
        </div>

        <div style={{ display: 'flex', marginBottom: 24, borderBottom: '1px solid #eee' }}>
          {['login','register'].map(m => (
            <button key={m} onClick={() => setMode(m)} style={{
              flex: 1, padding: '10px', background: 'none', border: 'none',
              fontSize: 13, fontWeight: 600, cursor: 'pointer',
              color: mode === m ? '#1a1a2e' : '#aaa',
              borderBottom: mode === m ? '2px solid #c9a84c' : '2px solid transparent',
              marginBottom: -1, textTransform: 'capitalize'
            }}>{m}</button>
          ))}
        </div>

        <form onSubmit={handleSubmit}>
          <div className="form-group" style={{ marginBottom: 14 }}>
            <label className="form-label">Username</label>
            <input className="form-control" value={username}
              onChange={e => setUsername(e.target.value)}
              placeholder="Enter username" required />
          </div>
          <div className="form-group" style={{ marginBottom: 20 }}>
            <label className="form-label">Password</label>
            <input className="form-control" type="password" value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="Enter password" required />
          </div>
          {error && <div className="alert alert-danger" style={{ marginBottom: 14 }}>{error}</div>}
          <button className="btn btn-primary" type="submit"
            style={{ width: '100%', padding: 10 }} disabled={loading}>
            {loading ? 'Please wait...' : mode === 'login' ? 'Login' : 'Create Account'}
          </button>
        </form>
      </div>
    </div>
  );
}