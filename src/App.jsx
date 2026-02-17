import { BrowserRouter, Routes, Route, Link, useLocation, Navigate } from 'react-router-dom';
import React, { useState, useEffect } from 'react';
import ReportCard from './components/ReportCard';
import UploadPage from './pages/UploadPage';
import AdminDashboard from './pages/AdminDashboard';
import LoginPage from './pages/LoginPage';
import ReportViewer from './pages/ReportViewer';
import { Upload, LayoutDashboard, LogOut, User as UserIcon } from 'lucide-react';

const NavLink = ({ to, icon: Icon, children }) => {
  const location = useLocation();
  const isActive = location.pathname === to;

  return (
    <Link
      to={to}
      className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-all duration-200 ${isActive
        ? 'bg-primary text-white shadow-md'
        : 'text-gray-600 hover:bg-gray-100'
        }`}
    >
      <Icon size={18} />
      <span className="font-medium">{children}</span>
    </Link>
  );
};

const Navigation = ({ user, onLogout }) => {
  if (!user) return null;

  return (
    <nav className="no-print glass fixed top-0 w-full z-50 px-6 py-3 flex justify-between items-center shadow-sm bg-white/80 backdrop-blur-md border-b border-slate-100">
      <div className="flex items-center gap-3">
        <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center text-white font-bold">V</div>
        <span className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-primary to-emerald-600">
          Viswam Portal
        </span>
      </div>

      <div className="flex items-center gap-4">
        {user.role === 'admin' ? (
          <NavLink to="/admin" icon={LayoutDashboard}>Admin Dashboard</NavLink>
        ) : (
          <NavLink to="/upload" icon={Upload}>Upload Portal</NavLink>
        )}

        <div className="h-6 w-px bg-slate-200 mx-2"></div>

        <div className="flex items-center gap-3 px-3 py-1.5 bg-slate-50 rounded-full border border-slate-100">
          <div className="w-6 h-6 bg-slate-200 rounded-full flex items-center justify-center">
            <UserIcon size={14} className="text-slate-500" />
          </div>
          <span className="text-xs font-bold text-slate-600">{user.email}</span>
          <button
            onClick={onLogout}
            className="p-1 hover:text-red-500 transition-colors"
            title="Logout"
          >
            <LogOut size={16} />
          </button>
        </div>
      </div>
    </nav>
  );
};

const ProtectedRoute = ({ user, allowedRoles, children }) => {
  if (!user) {
    return <Navigate to="/login" replace />;
  }
  if (allowedRoles && !allowedRoles.includes(user.role)) {
    return <Navigate to={user.role === 'admin' ? '/admin' : '/upload'} replace />;
  }
  return children;
};

function AppContent() {
  const [user, setUser] = useState(JSON.parse(localStorage.getItem('userInfo')));
  const location = useLocation();

  const handleLogout = () => {
    localStorage.removeItem('userInfo');
    setUser(null);
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans">
      <Navigation user={user} onLogout={handleLogout} />

      <main className={user ? (location.pathname.startsWith('/report') ? "" : "pt-24 pb-12 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto") : ""}>

        <Routes>
          <Route path="/login" element={<LoginPage onLogin={setUser} />} />

          <Route path="/upload" element={
            <ProtectedRoute user={user} allowedRoles={['principal']}>
              <UploadPage />
            </ProtectedRoute>
          } />

          <Route path="/admin" element={
            <ProtectedRoute user={user} allowedRoles={['admin']}>
              <AdminDashboard />
            </ProtectedRoute>
          } />

          <Route path="/report/:id" element={<ReportViewer />} />

          <Route path="/" element={<Navigate to={user ? (user.role === 'admin' ? '/admin' : '/upload') : '/login'} replace />} />
        </Routes>
      </main>
    </div>
  );
}

function App() {
  return (
    <BrowserRouter>
      <AppContent />
    </BrowserRouter>
  );
}

export default App;
