import React, { useState } from 'react';
import { DataProvider, useData } from './context/DataContext';
import Sidebar from './components/Sidebar';
import Dashboard from './pages/Dashboard';
import CellRoster from './pages/CellRoster';
import AttendanceRegister from './pages/AttendanceRegister';
import Login from './pages/Login';
import AdminPanel from './pages/AdminPanel';
import Assessments from './pages/Assessments';
import { Menu, Cross } from 'lucide-react';
import './index.css';

function AppContent() {
  const { currentUser, loading } = useData();
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
      {isOffline && (
        <div style={{ backgroundColor: 'var(--danger)', color: 'white', padding: '0.5rem', textAlign: 'center', fontWeight: 'bold', width: '100%', position: 'sticky', top: 0, zIndex: 9999 }}>
          You are currently offline. Changes may not be saved until you reconnect.
        </div>
      )}
      {/* Mobile Header */}
      <div className="mobile-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <span style={{ color: 'var(--primary)', fontWeight: 'bold', fontSize: '1.25rem', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
            <Cross size={20} /> CellSystem
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
