import React, { useRef, useState } from 'react';
import { useData } from '../context/DataContext';
import { Mail, Phone, Download, Image as ImageIcon, Trash2, Edit2, Check, X, Plus } from 'lucide-react';
import html2canvas from 'html2canvas';

const CellRoster = () => {
  const { data, activeCellId, updateMember, removeMember, addMember, addVisitor } = useData();
  const [editingPhoneId, setEditingPhoneId] = useState<string | null>(null);
  const [editPhoneValue, setEditPhoneValue] = useState('');
  
  // State for adding new person
  const [newName, setNewName] = useState('');
  const [newPhone, setNewPhone] = useState('');
  const [newType, setNewType] = useState<'M' | 'V'>('M');
  const [isAdding, setIsAdding] = useState(false);

  const tableRef = useRef(null);
  
  const activeCell = data.cells.find(c => c.id === activeCellId);
  const roster = data.roster.filter(r => r.cellId === activeCellId);
  
  const handleAddPerson = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeCellId) return;
    try {
      if (newType === 'M') {
        await addMember(activeCellId, newName, newPhone);
      } else {
        await addVisitor(activeCellId, newName, newPhone);
      }
      setNewName('');
      setNewPhone('');
      setNewType('M');
      setIsAdding(false);
    } catch (err: any) {
      alert('Failed to add person: ' + err.message);
    }
  };

  const exportToPNG = async () => {
    if (!activeCell) return;
    if (tableRef.current) {
      const canvas = await html2canvas(tableRef.current, { backgroundColor: '#ffffff' });
      const image = canvas.toDataURL('image/png');
      const link = document.createElement('a');
      link.href = image;
      link.download = `${activeCell.name}-roster.png`;
      link.click();
    }
  };

  const exportToCSV = () => {
    if (!activeCell) return;
    let csvContent = "Name,Phone,Status\n";
    roster.forEach(person => {
      const status = person.type === 'M' ? 'Member' : 'Visitor';
      csvContent += `${person.name},${person.phone || 'N/A'},${status}\n`;
    });
    
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `${activeCell.name}-roster.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  if (!activeCell) return <div>Please select a cell group from the sidebar.</div>;

  return (
    <div className="roster-view" style={{ animation: 'var(--transition)' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <div>
          <h1 style={{ fontSize: '2rem', marginBottom: '0.25rem', color: 'var(--primary)' }}>{activeCell.name} Roster</h1>
          <p className="text-muted">Leader: {activeCell.leaderName}</p>
        </div>
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <button className="btn btn-outline" onClick={exportToCSV}>
            <Download size={16} /> Export CSV
          </button>
          <button className="btn btn-outline" onClick={exportToPNG}>
            <ImageIcon size={16} /> Export PNG
          </button>
        </div>
      </div>

      <div className="glass-panel" style={{ padding: '1.5rem', marginBottom: '2rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: isAdding ? '1.5rem' : '0' }}>
          <h3 style={{ margin: 0, color: 'var(--primary)' }}>Add New Person</h3>
          {!isAdding && (
            <button className="btn btn-primary" onClick={() => setIsAdding(true)}>
              <Plus size={16} /> Add Member / Visitor
            </button>
          )}
        </div>
        
        {isAdding && (
          <form onSubmit={handleAddPerson} style={{ display: 'flex', gap: '1rem', alignItems: 'flex-end', flexWrap: 'wrap' }}>
            <div style={{ flex: 1, minWidth: '200px' }}>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem' }}>Full Name</label>
              <input value={newName} onChange={e => setNewName(e.target.value)} required style={{ width: '100%', padding: '0.5rem', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)' }} />
            </div>
            <div style={{ flex: 1, minWidth: '150px' }}>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem' }}>Phone Number</label>
              <input value={newPhone} onChange={e => setNewPhone(e.target.value)} style={{ width: '100%', padding: '0.5rem', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)' }} />
            </div>
            <div style={{ width: '120px' }}>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem' }}>Type</label>
              <select value={newType} onChange={e => setNewType(e.target.value as 'M'|'V')} style={{ width: '100%', padding: '0.5rem', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)' }}>
                <option value="M">Member</option>
                <option value="V">Visitor</option>
              </select>
            </div>
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <button type="submit" className="btn btn-primary" style={{ padding: '0.5rem 1rem' }}>Save</button>
              <button type="button" className="btn btn-outline" onClick={() => setIsAdding(false)} style={{ padding: '0.5rem 1rem' }}>Cancel</button>
            </div>
          </form>
        )}
      </div>

      <div className="glass-panel" style={{ padding: '1.5rem' }}>
        <div ref={tableRef} style={{ padding: '1rem', background: 'var(--surface)', borderRadius: 'var(--radius-md)' }}>
          <h3 style={{ marginBottom: '1.5rem', color: 'var(--primary)' }}>Membership Data</h3>
          <table className="data-grid">
            <thead>
              <tr>
                <th>Name</th>
                <th>Phone</th>
                <th>Status</th>
                <th data-html2canvas-ignore>Actions</th>
              </tr>
            </thead>
            <tbody>
              {roster.map(person => (
                <tr key={person.id}>
                  <td style={{ fontWeight: '500' }}>{person.name}</td>
                  <td>
                    {editingPhoneId === person.id ? (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <input 
                          type="text" 
                          className="form-control" 
                          style={{ padding: '0.25rem', width: '120px' }} 
                          value={editPhoneValue}
                          onChange={(e) => setEditPhoneValue(e.target.value)}
                        />
                        <button className="btn" style={{ padding: '0.25rem', background: 'var(--success)', color: 'white' }} onClick={() => { updateMember(person.id, editPhoneValue, person.type); setEditingPhoneId(null); }}>
                          <Check size={14} />
                        </button>
                        <button className="btn btn-outline" style={{ padding: '0.25rem' }} onClick={() => setEditingPhoneId(null)}>
                          <X size={14} />
                        </button>
                      </div>
                    ) : (
                      <span style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <Phone size={14} className="text-muted" />
                        {person.phone || 'N/A'}
                        <button className="btn-icon" onClick={() => { setEditingPhoneId(person.id); setEditPhoneValue(person.phone || ''); }} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>
                          <Edit2 size={12} className="text-muted" />
                        </button>
                      </span>
                    )}
                  </td>
                  <td>
                    <button 
                      className={`badge ${person.type === 'M' ? 'badge-member' : 'badge-visitor'}`}
                      style={{ border: 'none', cursor: 'pointer' }}
                      onClick={() => updateMember(person.id, person.phone, person.type === 'M' ? 'V' : 'M')}
                      title="Click to toggle role"
                    >
                      {person.type === 'M' ? 'Member' : 'Visitor'}
                    </button>
                  </td>
                  <td data-html2canvas-ignore>
                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                      <button 
                        className="btn btn-outline" 
                        style={{ padding: '0.25rem 0.5rem', fontSize: '0.75rem', borderColor: 'var(--danger)', color: 'var(--danger)' }}
                        onClick={() => { if(window.confirm('Are you sure you want to remove this person?')) removeMember(person.id); }}
                      >
                        <Trash2 size={14} /> Remove
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {roster.length === 0 && (
                <tr>
                  <td colSpan={4} style={{ textAlign: 'center', padding: '2rem' }}>
                    No members found in this cell group.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default CellRoster;
