import React from 'react';
import { useData } from '../context/DataContext';
import { LayoutDashboard, Users, UserCheck, Settings, LogOut, Shield, FileText } from 'lucide-react';

const Sidebar = ({ activeTab, setActiveTab }: { activeTab: string, setActiveTab: (tab: string) => void }) => {
  const { data, currentUser, logout, activeCellId, setActiveCellId } = useData();

  const handleCellChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setActiveCellId(e.target.value);
  };

  return (
    <div className="sidebar">
      <div style={{ padding: '1.5rem', borderBottom: '1px solid var(--border)' }}>
        <h2 style={{ fontSize: '1.25rem', display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--primary)' }}>
          ✦ CellSystem
        </h2>
        <div style={{ marginTop: '0.5rem', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
          Logged in as: <strong style={{ color: 'var(--text-main)' }}>{currentUser?.role === 'admin' ? 'Administrator' : 'Cell Leader'}</strong>
        </div>
      </div>

      {currentUser?.role === 'admin' && (
        <div style={{ padding: '1.5rem', borderBottom: '1px solid var(--border)' }}>
          <p className="text-muted" style={{ marginBottom: '0.5rem', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            Active Cell View
          </p>
          <select value={activeCellId || ''} onChange={handleCellChange}>
            <option value="">All Cells (Global)</option>
            <option value="disabled" disabled>--- Select a Cell ---</option>
            {data.cells.map(cell => (
              <option key={cell.id} value={cell.id}>{cell.name}</option>
            ))}
          </select>
        </div>
      )}

      {currentUser?.role === 'leader' && (
        <div style={{ padding: '1.5rem', borderBottom: '1px solid var(--border)' }}>
          <p className="text-muted" style={{ marginBottom: '0.5rem', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            My Cell Group
          </p>
          <div style={{ fontWeight: '600', color: 'var(--primary)' }}>
            {data.cells.find(c => c.id === activeCellId)?.name || 'Unknown Cell'}
          </div>
        </div>
      )}

      <nav style={{ padding: '1.5rem 1rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
        <NavItem 
          icon={<LayoutDashboard size={20} />} 
          label="Dashboard" 
          active={activeTab === 'dashboard'} 
          onClick={() => setActiveTab('dashboard')} 
        />
        {currentUser?.role === 'admin' && (
          <>
            <NavItem 
              icon={<Shield size={20} />} 
              label="Admin Panel" 
              active={activeTab === 'admin'} 
              onClick={() => setActiveTab('admin')} 
            />
            <div style={{ height: '1px', background: 'var(--border)', margin: '0.5rem 0' }} />
          </>
        )}
        
        <NavItem 
          icon={<Users size={20} />} 
          label="Cell Roster" 
          active={activeTab === 'roster'} 
          onClick={() => setActiveTab('roster')} 
        />
        <NavItem 
          icon={<UserCheck size={20} />} 
          label="Attendance Register" 
          active={activeTab === 'attendance'} 
          onClick={() => setActiveTab('attendance')} 
        />
        <NavItem 
          icon={<FileText size={20} />} 
          label="Weekly Reports" 
          active={activeTab === 'reports'} 
          onClick={() => setActiveTab('reports')} 
        />
      </nav>
      
      <div style={{ marginTop: 'auto', padding: '1.5rem 1rem' }}>
        <NavItem 
          icon={<LogOut size={20} />} 
          label="Logout" 
          active={false} 
          onClick={logout} 
        />
      </div>
    </div>
  );
};

const NavItem = ({ icon, label, active, onClick }: { icon: React.ReactNode, label: string, active: boolean, onClick: () => void }) => {
  return (
    <button 
      onClick={onClick}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '0.75rem',
        padding: '0.75rem 1rem',
        borderRadius: 'var(--radius-md)',
        backgroundColor: active ? 'var(--primary-light)' : 'transparent',
        color: active ? 'var(--primary)' : 'var(--text-muted)',
        border: 'none',
        cursor: 'pointer',
        textAlign: 'left',
        fontWeight: active ? '600' : '500',
        transition: 'var(--transition)',
        width: '100%'
      }}
      onMouseOver={(e) => { if(!active) { e.currentTarget.style.backgroundColor = 'var(--bg-color)'; e.currentTarget.style.color = 'var(--text-main)'; } }}
      onMouseOut={(e) => { if(!active) { e.currentTarget.style.backgroundColor = 'transparent'; e.currentTarget.style.color = 'var(--text-muted)'; } }}
    >
      {icon}
      <span>{label}</span>
    </button>
  );
};

export default Sidebar;
