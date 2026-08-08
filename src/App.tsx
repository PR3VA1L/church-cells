import React, { useState } from 'react';
import { DataProvider, useData } from './context/DataContext';
import Sidebar from './components/Sidebar';
import Dashboard from './pages/Dashboard';
import CellRoster from './pages/CellRoster';
import AttendanceRegister from './pages/AttendanceRegister';
import Login from './pages/Login';
import AdminPanel from './pages/AdminPanel';
import WeeklyReport from './pages/WeeklyReport';
import './index.css';

function AppContent() {
  const { currentUser, loading } = useData();
  const [activeTab, setActiveTab] = useState('dashboard');

  if (loading) {
    return <div style={{ display: 'flex', height: '100vh', alignItems: 'center', justifyContent: 'center' }}>Loading...</div>;
  }

  if (!currentUser) {
    return <Login />;
  }

  return (
    <div className="app-container">
      <Sidebar activeTab={activeTab} setActiveTab={setActiveTab} />
      
      <main className="main-content">
        {activeTab === 'dashboard' && <Dashboard />}
        {activeTab === 'admin' && currentUser.role === 'admin' && <AdminPanel />}
        {activeTab === 'roster' && <CellRoster />}
        {activeTab === 'attendance' && <AttendanceRegister />}
        {activeTab === 'reports' && <WeeklyReport />}
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
