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
    <div
      className="dark fixed left-0 top-0 h-screen w-[220px] flex flex-col bg-surface-container-lowest border-r border-outline-variant/20 z-50"
    >
      <div className="px-5 py-6 border-b border-outline-variant/10">
        <h2 className="font-headline-lg-mobile text-lg font-bold text-primary tracking-tight">PAYBUDDY</h2>
        <p className="text-[11px] text-on-surface-variant mt-0.5">Personal Finance Intelligence</p>
      </div>

      <nav className="flex-1 py-4 flex flex-col gap-1 px-3 overflow-y-auto">
        {links.map(({ to, icon: Icon, label }) => (
          <NavLink
            key={to} to={to}
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2.5 rounded-full text-sm transition-colors ${
                isActive
                  ? 'bg-secondary-container/30 text-primary border border-secondary-container/50 shadow-[0_0_15px_rgba(192,192,192,0.08)]'
                  : 'text-on-surface-variant hover:text-on-surface hover:bg-surface-container-high/50 border border-transparent'
              }`
            }
          >
            <Icon size={16} />
            {label}
          </NavLink>
        ))}
      </nav>

      <div className="border-t border-outline-variant/10 py-3 px-3">
        <div className="px-3 py-2 text-[11px] text-on-surface-variant">
          Logged in as <strong className="text-on-surface">{user?.username}</strong>
        </div>
        <button
          onClick={handleLogout}
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-full text-sm text-on-surface-variant hover:text-error hover:bg-error-container/10 transition-colors"
        >
          <LogOut size={16} />
          Logout
        </button>
      </div>
    </div>
  );
}
