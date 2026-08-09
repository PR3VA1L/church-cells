import React, { useState, useEffect } from 'react';
import { useData } from '../context/DataContext';
import { format } from 'date-fns';
import { UserPlus, Save, CheckCircle2, Circle, Plus, Search, ChevronDown, ChevronRight, Users } from 'lucide-react';

const AttendanceRegister = () => {
  const { data, activeCellId, saveMeeting, addVisitor, currentUser } = useData();
  const activeCell = data.cells.find(c => c.id === activeCellId);
  const roster = data.roster.filter(r => r.cellId === activeCellId);
  
  const isAdmin = currentUser?.role === 'admin';

  const [date, setDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [attendedIds, setAttendedIds] = useState<Set<string>>(new Set());
  const [salvations, setSalvations] = useState(0);
  const [welfare, setWelfare] = useState(0);
  const [isSaved, setIsSaved] = useState(false);
  
  const [showNewVisitor, setShowNewVisitor] = useState(false);
  const [visitorName, setVisitorName] = useState('');
  const [visitorPhone, setVisitorPhone] = useState('');

  const [isFormOpen, setIsFormOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [expandedId, setExpandedId] = useState<string | null>(null);

  // Load existing meeting data if it exists for this date
  useEffect(() => {
    const existingMeeting = data.meetings.find(m => m.cellId === activeCellId && m.date === date);
    if (existingMeeting) {
      setAttendedIds(new Set(existingMeeting.attendees || []));
      setSalvations(existingMeeting.salvations || 0);
      setWelfare(existingMeeting.welfare || 0);
    } else {
      setAttendedIds(new Set());
      setSalvations(0);
      setWelfare(0);
    }
    setIsSaved(false);
  }, [date, activeCellId, data.meetings]);

  const toggleAttendance = (id: string) => {
    const newSet = new Set(attendedIds);
    if (newSet.has(id)) {
      newSet.delete(id);
    } else {
      newSet.add(id);
    }
    setAttendedIds(newSet);
    setIsSaved(false);
  };

  const handleSave = () => {
    saveMeeting({
      id: Date.now().toString(),
      cellId: activeCellId as string,
      date,
      attendees: Array.from(attendedIds),
      salvations,
      welfare
    });
    setIsSaved(true);
    setTimeout(() => {
      setIsSaved(false);
      setIsFormOpen(false);
    }, 1000);
  };

  const handleEdit = (reportDate: string) => {
    setDate(reportDate);
    setIsFormOpen(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleAddVisitor = async (e: React.FormEvent) => {
    e.preventDefault();
    if (visitorName.trim()) {
      const newVisitor = await addVisitor(activeCellId as string, visitorName, visitorPhone);
      setAttendedIds(prev => new Set(prev).add(newVisitor.id));
      setVisitorName('');
      setVisitorPhone('');
      setShowNewVisitor(false);
    }
  };

  if (!activeCell) return <div className="page-header"><h1>Attendance Register</h1><p className="text-muted">Please select a cell group from the sidebar.</p></div>;

  const pastMeetings = (data.meetings || [])
    .filter(m => m.cellId === activeCellId)
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  const filteredMeetings = pastMeetings.filter(m => 
    m.date.includes(searchTerm) || format(new Date(m.date), 'MMMM d, yyyy').toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="attendance-view" style={{ maxWidth: '800px', margin: '0 auto', animation: 'var(--transition)' }}>
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', flexWrap: 'wrap', gap: '1rem', marginBottom: '2rem' }}>
        <div>
          <h1 style={{ fontSize: '2rem', marginBottom: '0.25rem' }}>Attendance Register</h1>
          <p className="text-muted">Track attendance for {activeCell.name}</p>
        </div>
        <button className="btn btn-primary" onClick={() => setIsFormOpen(!isFormOpen)}>
          {isFormOpen ? 'Cancel' : <><Plus size={18} /> Take Attendance</>}
        </button>
      </div>

      {isFormOpen && (
        <div style={{ animation: 'var(--transition)', marginBottom: '3rem' }}>
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '1rem', alignItems: 'center', marginBottom: '1rem' }}>
            <input 
              type="date" 
              value={date} 
              onChange={(e) => setDate(e.target.value)}
              style={{ width: 'auto', fontWeight: '500', padding: '0.5rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border)' }}
            />
            <button className="btn btn-primary" onClick={handleSave} style={{ backgroundColor: isSaved ? 'var(--success)' : '' }}>
              <Save size={18} />
              {isSaved ? 'Saved!' : 'Save Register'}
            </button>
          </div>

          <div className="glass-panel" style={{ padding: '0', overflow: 'hidden', marginBottom: '2rem' }}>
            <table className="data-grid">
              <thead>
                <tr>
                  <th style={{ width: '80px', textAlign: 'center' }}>Status</th>
                  <th>Name</th>
                  <th>Type</th>
                  <th>Phone</th>
                </tr>
              </thead>
              <tbody>
                {roster.map(person => {
                  const isPresent = attendedIds.has(person.id);
                  return (
                    <tr 
                      key={person.id} 
                      style={{ backgroundColor: isPresent ? 'var(--primary-light)' : '' }}
                    >
                      <td style={{ textAlign: 'center' }}>
                        <button 
                          className={`btn ${isPresent ? 'btn-primary' : 'btn-outline'}`}
                          style={{ padding: '0.25rem 0.5rem', fontSize: '0.85rem', width: '100px' }}
                          onClick={() => toggleAttendance(person.id)}
                        >
                          {isPresent ? <><CheckCircle2 size={14} /> Present</> : 'Mark Present'}
                        </button>
                      </td>
                      <td style={{ fontWeight: '500', color: isPresent ? 'var(--primary)' : 'inherit' }}>
                        {person.name}
                      </td>
                      <td>
                        <span className={`badge ${person.type === 'M' ? 'badge-member' : 'badge-visitor'}`}>
                          {person.type === 'M' ? 'Member' : 'Visitor'}
                        </span>
                      </td>
                      <td className="text-muted">{person.phone || '-'}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            
            <div style={{ padding: '1rem', borderTop: '1px solid var(--border)', backgroundColor: '#f8fafc' }}>
              {!showNewVisitor ? (
                <button className="btn btn-outline" onClick={() => setShowNewVisitor(true)}>
                  <UserPlus size={16} /> Add New Visitor
                </button>
              ) : (
                <form onSubmit={handleAddVisitor} style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                  <input 
                    placeholder="Visitor Name" 
                    value={visitorName} 
                    onChange={e => setVisitorName(e.target.value)} 
                    required 
                    style={{ flex: 1 }}
                  />
                  <input 
                    placeholder="Phone (Optional)" 
                    value={visitorPhone} 
                    onChange={e => setVisitorPhone(e.target.value)} 
                    style={{ flex: 1 }}
                  />
                  <button type="submit" className="btn btn-primary">Add</button>
                  <button type="button" className="btn btn-outline" onClick={() => setShowNewVisitor(false)}>Cancel</button>
                </form>
              )}
            </div>
          </div>

          <div style={{ display: 'flex', gap: '2rem' }}>
            <div className="glass-panel" style={{ padding: '1.5rem', flex: 1 }}>
              <h3 style={{ fontSize: '1.1rem', marginBottom: '1rem' }}>Spiritual KPIs</h3>
              <div style={{ display: 'flex', gap: '1.5rem' }}>
                <div style={{ flex: 1 }}>
                  <label className="text-muted" style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem' }}>Salvations / Rededications</label>
                  <input type="number" min="0" value={salvations} onChange={e => { setSalvations(parseInt(e.target.value, 10) || 0); setIsSaved(false); }} style={{ width: '100%', padding: '0.5rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border)' }} />
                </div>
                <div style={{ flex: 1 }}>
                  <label className="text-muted" style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem' }}>Welfare Follow-ups Needed</label>
                  <input type="number" min="0" value={welfare} onChange={e => { setWelfare(parseInt(e.target.value, 10) || 0); setIsSaved(false); }} style={{ width: '100%', padding: '0.5rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border)' }} />
                </div>
              </div>
            </div>
            <div className="glass-panel" style={{ padding: '1.5rem', flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column' }}>
              <h1 style={{ fontSize: '3rem', color: 'var(--primary)', margin: 0, lineHeight: 1 }}>
                {attendedIds.size}
              </h1>
              <p className="text-muted">Total Present</p>
            </div>
          </div>
        </div>
      )}

      <div className="glass-panel" style={{ padding: '1.5rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1.5rem', background: 'var(--bg-color)', padding: '0.5rem 1rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border)' }}>
          <Search size={18} color="var(--text-muted)" />
          <input 
            placeholder="Search registers by date (e.g. August 8)..." 
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            style={{ border: 'none', background: 'transparent', outline: 'none', width: '100%', color: 'var(--text-main)' }}
          />
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {filteredMeetings.map(meeting => (
            <div key={meeting.id} className="card" style={{ padding: '1rem', overflow: 'hidden' }}>
              <div 
                style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer' }}
                onClick={() => setExpandedId(expandedId === meeting.id ? null : meeting.id)}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                  {expandedId === meeting.id ? <ChevronDown size={20} color="var(--primary)" /> : <ChevronRight size={20} color="var(--primary)" />}
                  <h3 style={{ margin: 0, fontSize: '1.1rem' }}>{format(new Date(meeting.date), 'MMMM d, yyyy')}</h3>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                  <span style={{ fontSize: '0.9rem', color: 'var(--text-muted)' }}>
                    <strong>{(meeting.attendees || []).length}</strong> Present
                  </span>
                  <button className="btn btn-outline" style={{ padding: '0.25rem 0.5rem', fontSize: '0.75rem' }} onClick={(e) => { e.stopPropagation(); handleEdit(meeting.date); }}>
                    Edit
                  </button>
                </div>
              </div>
              
              {expandedId === meeting.id && (
                <div style={{ marginTop: '1rem', paddingTop: '1rem', borderTop: '1px solid var(--border)', animation: 'var(--transition)' }}>
                  
                  <div style={{ display: 'flex', gap: '2rem', marginBottom: '1.5rem', background: 'var(--bg-color)', padding: '1rem', borderRadius: 'var(--radius-md)' }}>
                    <div>
                      <span className="text-muted" style={{ fontSize: '0.75rem', textTransform: 'uppercase' }}>Salvations</span>
                      <p style={{ margin: 0, fontSize: '1.25rem', fontWeight: '600', color: 'var(--primary)' }}>{meeting.salvations || 0}</p>
                    </div>
                    <div>
                      <span className="text-muted" style={{ fontSize: '0.75rem', textTransform: 'uppercase' }}>Welfare Follow-ups</span>
                      <p style={{ margin: 0, fontSize: '1.25rem', fontWeight: '600', color: 'var(--primary)' }}>{meeting.welfare || 0}</p>
                    </div>
                  </div>

                  <h4 style={{ fontSize: '0.875rem', marginBottom: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Attendees ({ (meeting.attendees || []).length })</h4>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                    {(meeting.attendees || []).length === 0 ? (
                      <p style={{ color: 'var(--text-muted)' }}>No attendees recorded.</p>
                    ) : (
                      (meeting.attendees || []).map(id => {
                        const person = roster.find(r => r.id === id);
                        return (
                          <div key={id} style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.5rem', background: 'var(--bg-color)', borderRadius: 'var(--radius-sm)' }}>
                            <CheckCircle2 size={16} color="var(--success)" />
                            <span style={{ fontWeight: '500' }}>{person?.name || 'Unknown Member'}</span>
                            {person && (
                              <span style={{ fontSize: '0.75rem', marginLeft: 'auto', color: 'var(--text-muted)' }}>
                                {person.type === 'M' ? 'Member' : 'Visitor'}
                              </span>
                            )}
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>
              )}
            </div>
          ))}
          
          {filteredMeetings.length === 0 && (
            <div style={{ textAlign: 'center', padding: '3rem 1rem', color: 'var(--text-muted)', background: 'var(--bg-color)', borderRadius: 'var(--radius-md)' }}>
              No registers found.
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default AttendanceRegister;
