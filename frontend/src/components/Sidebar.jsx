import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
  LayoutDashboard, ArrowLeftRight, Tag, TrendingUp,
  AlertTriangle, Heart, Target, Bot, LogOut
} from 'lucide-react';

const links = [
  { to: '/dashboard',      icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/transactions',   icon: ArrowLeftRight,  label: 'Transactions' },
  { to: '/categorisation', icon: Tag,             label: 'Categorisation' },
  { to: '/forecast',       icon: TrendingUp,      label: 'Forecast' },
  { to: '/anomaly',        icon: AlertTriangle,   label: 'Anomaly Alerts' },
  { to: '/health',         icon: Heart,           label: 'Health & Budget' },
  { to: '/goals',          icon: Target,          label: 'Goals & Dead Money' },
  { to: '/assistant',      icon: Bot,             label: 'AI Assistant' },
];

export default function Sidebar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => { logout(); navigate('/'); };

  return (
    <div className="sidebar">
      <div className="sidebar-logo">
        <h2>PAYBUDDY</h2>
        <p>Personal Finance Intelligence</p>
      </div>

      <nav className="sidebar-nav">
        {links.map(({ to, icon: Icon, label }) => (
          <NavLink
            key={to} to={to}
            className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
          >
            <Icon size={16} />
            {label}
          </NavLink>
        ))}
      </nav>

      <div className="sidebar-footer">
        <div style={{ padding: '8px 16px', fontSize: 11, color: '#666', marginBottom: 4 }}>
          Logged in as <strong style={{ color: '#aaa' }}>{user?.username}</strong>
        </div>
        <div className="nav-item" onClick={handleLogout}>
          <LogOut size={16} />
          Logout
        </div>
      </div>
    </div>
  );
}