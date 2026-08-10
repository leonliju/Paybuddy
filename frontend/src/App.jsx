import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import Sidebar from './components/Sidebar';
import Login        from './pages/Login';
import Dashboard    from './pages/Dashboard';
import Transactions from './pages/Transactions';
import Categorisation from './pages/Categorisation';
import Forecast     from './pages/Forecast';
import Anomaly      from './pages/Anomaly';
import Health       from './pages/Health';
import Goals        from './pages/Goals';
import Assistant    from './pages/Assistant';

function ProtectedRoute({ children }) {
  const { user } = useAuth();
  return user ? (
    <div style={{ display: 'flex' }}>
      <Sidebar />
      <div className="main-content">{children}</div>
    </div>
  ) : <Navigate to="/" />;
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Login />} />
          <Route path="/dashboard"      element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
          <Route path="/transactions"   element={<ProtectedRoute><Transactions /></ProtectedRoute>} />
          <Route path="/categorisation" element={<ProtectedRoute><Categorisation /></ProtectedRoute>} />
          <Route path="/forecast"       element={<ProtectedRoute><Forecast /></ProtectedRoute>} />
          <Route path="/anomaly"        element={<ProtectedRoute><Anomaly /></ProtectedRoute>} />
          <Route path="/health"         element={<ProtectedRoute><Health /></ProtectedRoute>} />
          <Route path="/goals"          element={<ProtectedRoute><Goals /></ProtectedRoute>} />
          <Route path="/assistant"      element={<ProtectedRoute><Assistant /></ProtectedRoute>} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}