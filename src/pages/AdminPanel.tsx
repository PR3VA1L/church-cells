import React, { useState } from 'react';
import { useData } from '../context/DataContext';
import { Save, Plus, Trash2 } from 'lucide-react';

const AdminPanel = () => {
  const { data, createCell, updateCellPassword, addMember, deleteCell, updatePillarQuestions } = useData();
  
  // State for new cell
  const [newCellName, setNewCellName] = useState('');
  const [newCellLeader, setNewCellLeader] = useState('');
  const [newCellPassword, setNewCellPassword] = useState('');

  // State for adding member
  const [memberCellId, setMemberCellId] = useState(data.cells[0]?.id || '');
  const [memberName, setMemberName] = useState('');
  const [memberPhone, setMemberPhone] = useState('');

  // State for Pillar Questions
  const [pillars, setPillars] = useState(data.pillarQuestions);
  const [isSavingPillars, setIsSavingPillars] = useState(false);

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

  const handleDeleteCell = (cellId: string) => {
    if (window.confirm("Are you sure you want to delete this cell? All associated data will be removed. This action cannot be undone.")) {
      deleteCell(cellId);
    }
  };

  const handlePillarChange = (pIdx: number, newPillarName: string) => {
    const newPillars = [...pillars];
    newPillars[pIdx].pillar = newPillarName;
    setPillars(newPillars);
  };

  const handleQuestionChange = (pIdx: number, qIdx: number, newQuestion: string) => {
    const newPillars = [...pillars];
    newPillars[pIdx].questions[qIdx] = newQuestion;
    setPillars(newPillars);
  };

  const addQuestion = (pIdx: number) => {
    const newPillars = [...pillars];
    newPillars[pIdx].questions.push("New Question");
    setPillars(newPillars);
  };

  const removeQuestion = (pIdx: number, qIdx: number) => {
    const newPillars = [...pillars];
    newPillars[pIdx].questions.splice(qIdx, 1);
    setPillars(newPillars);
  };

  const savePillars = async () => {
    setIsSavingPillars(true);
    await updatePillarQuestions(pillars);
    alert('Global Pillar Questions saved successfully!');
    setIsSavingPillars(false);
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
                      style={{ padding: '0.25rem 0.5rem', fontSize: '0.75rem', marginRight: '0.5rem' }}
                      onClick={() => handleChangePassword(cell.id, cell.password)}
                    >
                      Change Password
                    </button>
                    <button 
                      className="btn btn-outline" 
                      style={{ padding: '0.25rem 0.5rem', fontSize: '0.75rem', borderColor: 'var(--danger)', color: 'var(--danger)' }}
                      onClick={() => handleDeleteCell(cell.id)}
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Manage Global Pillar Questions */}
        <div className="glass-panel" style={{ padding: '1.5rem', gridColumn: '1 / -1' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
            <h3 style={{ margin: 0, color: 'var(--primary)' }}>Global 4-Pillars Assessment Questions</h3>
            <button 
              className="btn btn-primary" 
              onClick={savePillars}
              disabled={isSavingPillars}
            >
              {isSavingPillars ? 'Saving...' : <><Save size={16} /> Save Questions</>}
            </button>
          </div>
          
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '2rem' }}>
            {pillars.map((pillar, pIdx) => (
              <div key={pIdx} style={{ background: 'var(--surface)', padding: '1rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border)' }}>
                <input 
                  value={pillar.pillar}
                  onChange={(e) => handlePillarChange(pIdx, e.target.value)}
                  style={{ fontSize: '1.25rem', fontWeight: 'bold', color: 'var(--primary)', marginBottom: '1rem', width: '100%', background: 'transparent', border: 'none', borderBottom: '1px solid var(--border)', paddingBottom: '0.25rem', outline: 'none' }}
                />
                
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                  {pillar.questions.map((q, qIdx) => (
                    <div key={qIdx} style={{ display: 'flex', gap: '0.5rem', alignItems: 'flex-start' }}>
                      <textarea
                        value={q}
                        onChange={(e) => handleQuestionChange(pIdx, qIdx, e.target.value)}
                        style={{ flex: 1, minHeight: '60px', padding: '0.5rem', fontSize: '0.875rem', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)', resize: 'vertical' }}
                      />
                      <button 
                        onClick={() => removeQuestion(pIdx, qIdx)}
                        style={{ background: 'transparent', border: 'none', color: 'var(--danger)', cursor: 'pointer', padding: '0.25rem' }}
                        title="Remove Question"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  ))}
                  <button 
                    onClick={() => addQuestion(pIdx)}
                    style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', background: 'transparent', border: '1px dashed var(--primary)', color: 'var(--primary)', padding: '0.5rem', borderRadius: 'var(--radius-sm)', cursor: 'pointer', justifyContent: 'center', marginTop: '0.5rem' }}
                  >
                    <Plus size={16} /> Add Question
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminPanel;
