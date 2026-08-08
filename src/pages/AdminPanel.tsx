import React, { useState } from 'react';
import { useData } from '../context/DataContext';

const AdminPanel = () => {
  const { data, createCell, updateCellPassword, addMember } = useData();
  
  // State for new cell
  const [newCellName, setNewCellName] = useState('');
  const [newCellLeader, setNewCellLeader] = useState('');
  const [newCellPassword, setNewCellPassword] = useState('');

  // State for adding member
  const [memberCellId, setMemberCellId] = useState(data.cells[0]?.id || '');
  const [memberName, setMemberName] = useState('');
  const [memberPhone, setMemberPhone] = useState('');

  const handleCreateCell = (e: React.FormEvent) => {
    e.preventDefault();
    createCell(newCellName, newCellLeader, newCellPassword);
    setNewCellName('');
    setNewCellLeader('');
    setNewCellPassword('');
    alert('Cell created successfully!');
  };

  const handleAddMember = (e: React.FormEvent) => {
    e.preventDefault();
    addMember(memberCellId, memberName, memberPhone);
    setMemberName('');
    setMemberPhone('');
    alert('Member added successfully!');
  };

  const handleChangePassword = (cellId: string, currentPassword?: string) => {
    const newPass = prompt('Enter new password for this cell:', currentPassword);
    if (newPass && newPass.trim() !== '') {
      updateCellPassword(cellId, newPass);
    }
  };

  return (
    <div style={{ animation: 'var(--transition)' }}>
      <h1 style={{ fontSize: '2rem', marginBottom: '0.25rem' }}>Admin Panel</h1>
      <p className="text-muted" style={{ marginBottom: '2rem' }}>Manage cells, leaders, and global data.</p>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem' }}>
        
        {/* Create Cell Section */}
        <div className="glass-panel" style={{ padding: '1.5rem' }}>
          <h3 style={{ marginBottom: '1.5rem', color: 'var(--primary)' }}>Create New Cell Group</h3>
          <form onSubmit={handleCreateCell} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem' }}>Cell Name</label>
              <input value={newCellName} onChange={e => setNewCellName(e.target.value)} required />
            </div>
            <div>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem' }}>Cell Leader Name</label>
              <input value={newCellLeader} onChange={e => setNewCellLeader(e.target.value)} required />
            </div>
            <div>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem' }}>Login Password</label>
              <input value={newCellPassword} onChange={e => setNewCellPassword(e.target.value)} required />
            </div>
            <button type="submit" className="btn btn-primary" style={{ marginTop: '0.5rem' }}>Create Cell</button>
          </form>
        </div>

        {/* Add Member Manually Section */}
        <div className="glass-panel" style={{ padding: '1.5rem' }}>
          <h3 style={{ marginBottom: '1.5rem', color: 'var(--primary)' }}>Add Permanent Member</h3>
          <form onSubmit={handleAddMember} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem' }}>Assign to Cell</label>
              <select value={memberCellId} onChange={e => setMemberCellId(e.target.value)} required>
                <option value="" disabled>Select a cell...</option>
                {data.cells.map(c => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem' }}>Full Name</label>
              <input value={memberName} onChange={e => setMemberName(e.target.value)} required />
            </div>
            <div>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem' }}>Phone Number</label>
              <input value={memberPhone} onChange={e => setMemberPhone(e.target.value)} />
            </div>
            <button type="submit" className="btn btn-primary" style={{ marginTop: '0.5rem' }}>Add Member</button>
          </form>
        </div>

        {/* Manage Existing Cells */}
        <div className="glass-panel" style={{ padding: '1.5rem', gridColumn: '1 / -1' }}>
          <h3 style={{ marginBottom: '1.5rem', color: 'var(--primary)' }}>Manage Existing Cells</h3>
          <table className="data-grid">
            <thead>
              <tr>
                <th>Cell Name</th>
                <th>Leader</th>
                <th>Password</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {data.cells.map(cell => (
                <tr key={cell.id}>
                  <td style={{ fontWeight: '500' }}>{cell.name}</td>
                  <td>{cell.leaderName}</td>
                  <td style={{ fontFamily: 'monospace' }}>{cell.password}</td>
                  <td>
                    <button 
                      className="btn btn-outline" 
                      style={{ padding: '0.25rem 0.5rem', fontSize: '0.75rem' }}
                      onClick={() => handleChangePassword(cell.id, cell.password)}
                    >
                      Change Password
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default AdminPanel;
