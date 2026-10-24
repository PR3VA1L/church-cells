import React, { useMemo } from 'react';
import { useData } from '../context/DataContext';
import { LayoutDashboard, Users, UserCheck, LogOut, Shield, FileText, HelpCircle } from 'lucide-react';
import LatinCross from './LatinCross';

const Sidebar = ({ activeTab, setActiveTab }: { activeTab: string, setActiveTab: (tab: string) => void }) => {
  const { data, currentUser, logout, activeCellId, setActiveCellId } = useData();

  const handleCellChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setActiveCellId(e.target.value);
  };

  const pendingQuestionsCount = useMemo(() => {
    const list = data.pastorQuestions || [];
    if (currentUser?.role === 'admin') {
      return list.filter(q => q.status === 'pending').length;
    }
    const myCellId = activeCellId || currentUser?.cellId;
    return list.filter(q => q.cellId === myCellId && q.status === 'pending').length;
  }, [data.pastorQuestions, currentUser, activeCellId]);

  return (
    <div className="sidebar">
      <div style={{ padding: '1.5rem', borderBottom: '1px solid var(--border)' }}>
        <h2 style={{ fontSize: '1.25rem', display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--primary)' }}>
          <LatinCross size={20} /> CellSystem
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
          label="Assessments" 
          active={activeTab === 'assessments'} 
          onClick={() => setActiveTab('assessments')} 
        />
        <NavItem 
          icon={<HelpCircle size={20} />} 
          label="Key Biblical Questions" 
          active={activeTab === 'questions'} 
          onClick={() => setActiveTab('questions')} 
          badge={pendingQuestionsCount}
        />
      </nav>
      
      <div style={{ marginTop: 'auto', padding: '0.5rem 1rem' }}>
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

const NavItem = ({ 
  icon, 
  label, 
  active, 
  onClick, 
  badge 
}: { 
  icon: React.ReactNode, 
  label: string, 
  active: boolean, 
  onClick: () => void,
  badge?: number
}) => {
  return (
    <button 
      onClick={onClick}
      style={{
        display: 'flex',
        alignItems: 'center',
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
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          {icon}
          <span>{label}</span>
        </div>
        {typeof badge === 'number' && badge > 0 && (
          <span style={{
            backgroundColor: active ? 'var(--primary)' : '#f59e0b',
            color: 'white',
            fontSize: '0.7rem',
            fontWeight: 'bold',
            padding: '0.15rem 0.5rem',
            borderRadius: '999px',
            lineHeight: 1.2
          }}>
            {badge}
          </span>
        )}
      </div>
    </button>
  );
};

export default Sidebar;
