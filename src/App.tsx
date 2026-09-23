import React, { useState } from 'react';
import { DataProvider, useData } from './context/DataContext';
import Sidebar from './components/Sidebar';
import Dashboard from './pages/Dashboard';
import CellRoster from './pages/CellRoster';
import AttendanceRegister from './pages/AttendanceRegister';
import Login from './pages/Login';
import AdminPanel from './pages/AdminPanel';
import Assessments from './pages/Assessments';
import { Menu, WifiOff, AlertTriangle, Info, CheckCircle2 } from 'lucide-react';
import LatinCross from './components/LatinCross';
import './index.css';

// Simple Toast component
const Toast = ({ message, type, onClose }: { message: string, type: 'error' | 'success' | 'info', onClose: () => void }) => {
  const Icon = type === 'error' ? AlertTriangle : type === 'success' ? CheckCircle2 : Info;
  const bgColor = type === 'error' ? 'var(--danger)' : type === 'success' ? 'var(--success)' : '#3b82f6';
  
  React.useEffect(() => {
    const timer = setTimeout(onClose, 5000);
    return () => clearTimeout(timer);
  }, [onClose]);

  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: '0.75rem',
      backgroundColor: bgColor, color: 'white',
      padding: '1rem', borderRadius: 'var(--radius-md)',
      boxShadow: 'var(--shadow-lg)',
      animation: 'slide-up 0.3s ease-out forwards',
      pointerEvents: 'auto',
      marginBottom: '0.5rem'
    }}>
      <Icon size={20} />
      <span style={{ fontWeight: '500' }}>{message}</span>
    </div>
  );
};

function AppContent() {
  const { currentUser, loading, notifications, removeNotification } = useData();
  const [activeTab, setActiveTab] = useState('dashboard');
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isOffline, setIsOffline] = useState(!navigator.onLine);

  React.useEffect(() => {
    const handleOnline = () => setIsOffline(false);
    const handleOffline = () => setIsOffline(true);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  if (loading) {
    return <div style={{ display: 'flex', height: '100vh', alignItems: 'center', justifyContent: 'center' }}>Loading...</div>;
  }

  if (!currentUser) {
    return <Login />;
  }

  const handleTabChange = (tab: string) => {
    setActiveTab(tab);
    setIsMobileMenuOpen(false); // Close menu when a tab is selected
  };

  return (
    <div className="app-container">
      {/* Offline Overlay overlay when fully disconnected */}
      {isOffline && (
        <div style={{ 
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, 
          backgroundColor: 'rgba(255, 255, 255, 0.9)', 
          zIndex: 99999, display: 'flex', flexDirection: 'column', 
          alignItems: 'center', justifyContent: 'center', backdropFilter: 'blur(4px)' 
        }}>
          <WifiOff size={64} color="var(--danger)" style={{ marginBottom: '1rem' }} />
          <h2 style={{ color: 'var(--danger)', marginBottom: '0.5rem' }}>Connection Lost</h2>
          <p className="text-muted" style={{ textAlign: 'center', maxWidth: '400px' }}>
            It looks like you're offline. Please check your internet connection. 
            The app will automatically resume once you're back online.
          </p>
        </div>
      )}

      {/* Global Notifications Container */}
      <div style={{
        position: 'fixed', bottom: '2rem', right: '2rem', zIndex: 9999,
        display: 'flex', flexDirection: 'column', pointerEvents: 'none',
        maxWidth: '350px'
      }}>
        {notifications.map(n => (
          <Toast key={n.id} message={n.message} type={n.type} onClose={() => removeNotification(n.id)} />
        ))}
      </div>
      {/* Mobile Header */}
      <div className="mobile-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <span style={{ color: 'var(--primary)', fontWeight: 'bold', fontSize: '1.25rem', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
            <LatinCross size={20} /> CellSystem
          </span>
        </div>
        <button className="btn" onClick={() => setIsMobileMenuOpen(true)} style={{ padding: '0.25rem', background: 'transparent', color: 'var(--primary)' }}>
          <Menu size={24} />
        </button>
      </div>

      {/* Mobile Overlay */}
      {isMobileMenuOpen && (
        <div className="mobile-overlay" onClick={() => setIsMobileMenuOpen(false)}></div>
      )}

      {/* Sidebar */}
      <div className={`sidebar-wrapper ${isMobileMenuOpen ? 'open' : ''}`}>
        <Sidebar activeTab={activeTab} setActiveTab={handleTabChange} />
      </div>
      
      <main className="main-content">
        {activeTab === 'dashboard' && <Dashboard />}
        {activeTab === 'admin' && currentUser.role === 'admin' && <AdminPanel />}
        {activeTab === 'roster' && <CellRoster />}
        {activeTab === 'attendance' && <AttendanceRegister />}
        {activeTab === 'assessments' && <Assessments />}
      </main>
    </div>
  );
}

function App() {
  return (
    <DataProvider>
      <AppContent />
    </DataProvider>
  );
}

export default App;
