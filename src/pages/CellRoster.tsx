import React, { useRef } from 'react';
import { useData } from '../context/DataContext';
import { Mail, Phone, Download, Image as ImageIcon } from 'lucide-react';
import html2canvas from 'html2canvas';

const CellRoster = () => {
  const { data, activeCellId, updateMemberStatus } = useData();
  const tableRef = useRef(null);
  
  const activeCell = data.cells.find(c => c.id === activeCellId);
  const roster = data.roster.filter(r => r.cellId === activeCellId);
  
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
                    <span style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <Phone size={14} className="text-muted" />
                      {person.phone || 'N/A'}
                    </span>
                  </td>
                  <td>
                    <span className={`badge ${person.type === 'M' ? 'badge-member' : 'badge-visitor'}`}>
                      {person.type === 'M' ? 'Member' : 'Visitor'}
                    </span>
                  </td>
                  <td data-html2canvas-ignore>
                    {person.type === 'V' && (
                      <button 
                        className="btn btn-outline" 
                        style={{ padding: '0.25rem 0.5rem', fontSize: '0.75rem' }}
                        onClick={() => updateMemberStatus(person.id, 'M')}
                      >
                        Upgrade to Member
                      </button>
                    )}
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
