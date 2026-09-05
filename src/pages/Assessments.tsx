import React, { useState } from 'react';
import { useData } from '../context/DataContext';
import { format, parseISO } from 'date-fns';
import { ChevronDown, ChevronUp, Save, CheckCircle2 } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

const RATING_OPTIONS = [
  { value: 0, label: 'Not Assessed' },
  { value: 1, label: '1 - Not yet' },
  { value: 2, label: '2 - Sometimes' },
  { value: 3, label: '3 - Often' },
  { value: 4, label: '4 - Most of the time' },
  { value: 5, label: '5 - Consistently' }
];

export default function Assessments() {
  const { data, activeCellId, saveAssessment } = useData();
  const [date, setDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [expandedMember, setExpandedMember] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

  // Local state to hold the form data before saving
  // Structure: { [memberId]: { [pillarIndex]: { [questionIndex]: score } } }
  const [scores, setScores] = useState<Record<string, Record<string, Record<string, number>>>>({});
  
  const scoresRef = React.useRef(scores);
  const dateRef = React.useRef(date);
  React.useEffect(() => {
    scoresRef.current = scores;
    dateRef.current = date;
  }, [scores, date]);

  if (!activeCellId) return <div>Please select a cell first.</div>;

  const cell = data.cells.find(c => c.id === activeCellId);
  const members = data.roster.filter(m => m.cellId === activeCellId && m.type === 'M');
  const pillars = data.pillarQuestions;

  // Initialize scores from existing data if available for this date
  React.useEffect(() => {
    const existingScores: Record<string, any> = {};
    const assessmentsForDate = data.assessments.filter(a => a.cellId === activeCellId && a.date === date);
    
    members.forEach(m => {
      const existing = assessmentsForDate.find(a => a.memberId === m.id);
      if (existing) {
        existingScores[m.id] = existing.scores;
      } else {
        existingScores[m.id] = {};
      }
    });
    setScores(existingScores);
    setHasUnsavedChanges(false);
  }, [activeCellId, date, data.assessments, data.roster]); // Re-run when date changes

  const handleScoreChange = (memberId: string, pillarIndex: number, questionIndex: number, val: number) => {
    setScores(prev => {
      const newScores = { ...prev };
      if (!newScores[memberId]) newScores[memberId] = {};
      if (!newScores[memberId][pillarIndex]) newScores[memberId][pillarIndex] = {};
      
      newScores[memberId][pillarIndex][questionIndex] = val;
      return newScores;
    });
    setHasUnsavedChanges(true);
  };

  const handleSave = async (autoSaveScores?: any, autoSaveDate?: string) => {
    const currentScores = autoSaveScores || scores;
    const currentDate = autoSaveDate || date;
    setIsSaving(true);
    setSuccessMsg('');
    try {
      const promises = members.map(m => {
        const memberScores = currentScores[m.id] || {};
        return saveAssessment({
          id: `${activeCellId}_${m.id}_${currentDate}`,
          cellId: activeCellId,
          memberId: m.id,
          date: currentDate,
          scores: memberScores,
          timestamp: new Date().toISOString()
        });
      });
      await Promise.all(promises);
      setHasUnsavedChanges(false);
      setSuccessMsg('Assessments saved successfully!');
      setTimeout(() => setSuccessMsg(''), 3000);
    } catch (err) {
      console.error(err);
      alert('Failed to save assessments');
    }
    setIsSaving(false);
  };

  React.useEffect(() => {
    const interval = setInterval(() => {
      if (hasUnsavedChanges) {
        handleSave(scoresRef.current, dateRef.current);
      }
    }, 60000);
    return () => clearInterval(interval);
  }, [hasUnsavedChanges, members, activeCellId]);

  const toggleMember = (memberId: string) => {
    setExpandedMember(prev => prev === memberId ? null : memberId);
  };

  const calculateMemberProgress = (memberId: string) => {
    const memberScores = scores[memberId] || {};
    let totalQuestions = 0;
    let answeredQuestions = 0;
    
    pillars.forEach((p, pIdx) => {
      p.questions.forEach((_, qIdx) => {
        totalQuestions++;
        if (memberScores[pIdx] && memberScores[pIdx][qIdx] > 0) {
          answeredQuestions++;
        }
      });
    });
    
    return { answered: answeredQuestions, total: totalQuestions };
  };

  const pastDates = Array.from(new Set(data.assessments.filter(a => a.cellId === activeCellId).map(a => a.date))).sort().reverse();

  return (
    <div className="assessments-view" style={{ maxWidth: '900px', margin: '0 auto', animation: 'var(--transition)' }}>
      <div className="page-header" style={{ marginBottom: '2rem' }}>
        <h1 style={{ fontSize: '2rem', marginBottom: '0.25rem' }}>4-Pillars Assessment</h1>
        <p className="text-muted">Track the spiritual growth of {cell?.name} members</p>
      </div>

      <div className="card" style={{ marginBottom: '2rem' }}>
        <div style={{ display: 'flex', gap: '1rem', alignItems: 'flex-end', flexWrap: 'wrap' }}>
          <div className="form-group" style={{ flex: 1, minWidth: '200px' }}>
            <label>Assessment Date</label>
            <input 
              type="date" 
              className="form-control"
              value={date}
              onChange={(e) => setDate(e.target.value)}
            />
          </div>
          <button 
            className="btn btn-primary" 
            onClick={handleSave}
            disabled={isSaving}
            style={{ minWidth: '150px' }}
          >
            {isSaving ? 'Saving...' : <><Save size={18} /> Save All</>}
          </button>
        </div>
        {successMsg && (
          <div style={{ marginTop: '1rem', color: '#10b981', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <CheckCircle2 size={18} /> {successMsg}
          </div>
        )}
        
        {pastDates.length > 0 && (
          <div style={{ marginTop: '1.5rem', borderTop: '1px solid var(--border)', paddingTop: '1rem' }}>
            <span className="text-muted" style={{ fontSize: '0.875rem', fontWeight: '500' }}>Recent Assessments: </span>
            <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginTop: '0.75rem' }}>
              {pastDates.slice(0, 8).map(d => (
                <button 
                  key={d} 
                  className="btn btn-outline" 
                  style={{ 
                    padding: '0.35rem 0.75rem', 
                    fontSize: '0.8rem', 
                    borderColor: d === date ? 'var(--primary)' : 'var(--border)', 
                    color: d === date ? 'white' : 'var(--text-main)',
                    backgroundColor: d === date ? 'var(--primary)' : 'transparent',
                    borderRadius: 'var(--radius-full)'
                  }}
                  onClick={() => setDate(d)}
                >
                  {format(parseISO(d), 'MMM dd, yyyy')}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        {members.length === 0 ? (
          <div className="card" style={{ textAlign: 'center', padding: '3rem' }}>
            <p className="text-muted">No members found in this cell.</p>
          </div>
        ) : (
          members.map(member => {
            const isExpanded = expandedMember === member.id;
            const progress = calculateMemberProgress(member.id);
            
            const memberAssessments = data.assessments.filter(a => a.cellId === activeCellId && a.memberId === member.id);
            const memberTrendData = memberAssessments.map(a => {
              const item: any = { name: format(parseISO(a.date), 'MMM dd') };
              let sum = 0;
              let count = 0;
              pillars.forEach((p, pIdx) => {
                Object.values(a.scores[pIdx] || {}).forEach(score => {
                  if (score > 0) {
                    sum += score;
                    count++;
                  }
                });
              });
              item.Score = count > 0 ? Number((sum / count).toFixed(1)) : null;
              item._rawDate = a.date;
              return item;
            }).filter(i => i.Score !== null).sort((a, b) => new Date(a._rawDate).getTime() - new Date(b._rawDate).getTime());
            
            return (
              <div key={member.id} className="card" style={{ padding: '0', overflow: 'hidden' }}>
                <div 
                  style={{ 
                    padding: '1.5rem', 
                    display: 'flex', 
                    justifyContent: 'space-between', 
                    alignItems: 'center',
                    cursor: 'pointer',
                    background: isExpanded ? 'rgba(99, 102, 241, 0.05)' : 'transparent'
                  }}
                  onClick={() => toggleMember(member.id)}
                >
                  <div>
                    <h3 style={{ margin: 0, fontSize: '1.25rem', color: 'var(--text-main)' }}>{member.name}</h3>
                    <div style={{ fontSize: '0.875rem', color: progress.answered === progress.total && progress.total > 0 ? '#10b981' : 'var(--text-muted)', marginTop: '0.35rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      {progress.answered === progress.total && progress.total > 0 ? <CheckCircle2 size={14} /> : null}
                      Status: {progress.answered} / {progress.total} Questions Answered
                    </div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                    <button className="btn" style={{ 
                      padding: '0.5rem 1.25rem', 
                      fontSize: '0.9rem', 
                      background: isExpanded ? 'var(--bg-color)' : 'var(--primary)',
                      color: isExpanded ? 'var(--text-main)' : 'white',
                      border: isExpanded ? '1px solid var(--border)' : 'none',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.5rem'
                    }}>
                      {isExpanded ? (
                        <>Close Form <ChevronUp size={16} /></>
                      ) : (
                        <>Evaluate Member <ChevronDown size={16} /></>
                      )}
                    </button>
                  </div>
                </div>

                {isExpanded && (
                  <div style={{ padding: '2rem', borderTop: '1px solid var(--border)', background: 'var(--bg-color)' }}>
                    
                    {memberTrendData.length > 0 && (
                      <div style={{ marginBottom: '2rem', padding: '1.5rem', background: 'var(--surface)', borderRadius: 'var(--radius-xl)', border: '1px solid var(--border)', boxShadow: 'var(--shadow-sm)' }}>
                        <h4 style={{ margin: 0, marginBottom: '1rem', color: 'var(--primary)', fontSize: '1.1rem', textTransform: 'uppercase', letterSpacing: '0.02em' }}>Personal Growth Trend</h4>
                        <div style={{ height: '220px', width: '100%' }}>
                          <ResponsiveContainer width="100%" height="100%">
                            <LineChart data={memberTrendData} margin={{ top: 5, right: 10, left: -20, bottom: 5 }}>
                              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                              <XAxis dataKey="name" stroke="var(--text-muted)" fontSize={11} tickLine={false} axisLine={false} dy={5} />
                              <YAxis domain={[0, 5]} stroke="var(--text-muted)" fontSize={11} tickLine={false} axisLine={false} dx={-5} />
                              <Tooltip contentStyle={{ backgroundColor: 'var(--surface)', borderColor: 'var(--border)', borderRadius: 'var(--radius-md)' }} />
                              <Line type="monotone" dataKey="Score" stroke="var(--primary)" strokeWidth={2} dot={{ r: 4, fill: 'var(--primary)', strokeWidth: 2 }} activeDot={{ r: 6 }} />
                            </LineChart>
                          </ResponsiveContainer>
                        </div>
                      </div>
                    )}

                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '2rem' }}>
                      {pillars.map((pillar, pIdx) => (
                        <div key={pIdx} style={{ background: 'var(--surface)', padding: '1.5rem', borderRadius: 'var(--radius-xl)', boxShadow: 'var(--shadow-md)', border: '1px solid var(--border)' }}>
                          <h4 style={{ 
                            fontSize: '1.15rem', 
                            color: 'var(--primary)', 
                            marginBottom: '1.25rem',
                            paddingBottom: '0.75rem',
                            borderBottom: '2px solid var(--bg-color)',
                            textTransform: 'uppercase',
                            letterSpacing: '0.02em'
                          }}>
                            {pillar.pillar}
                          </h4>
                          
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                            {pillar.questions.map((question, qIdx) => {
                              const val = scores[member.id]?.[pIdx]?.[qIdx] || 0;
                              return (
                                <div key={qIdx} style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', padding: '1rem', background: 'var(--bg-color)', borderRadius: 'var(--radius-md)' }}>
                                  <label style={{ fontSize: '0.9rem', lineHeight: '1.5', color: 'var(--text-main)', fontWeight: '500' }}>{question}</label>
                                  <select 
                                    className="form-control"
                                    style={{ 
                                      width: '100%', 
                                      maxWidth: '100%', 
                                      fontWeight: val > 0 ? '600' : '400',
                                      color: val > 0 ? 'var(--primary)' : 'var(--text-main)',
                                      backgroundColor: 'var(--surface)',
                                      border: '1px solid var(--border)',
                                      padding: '0.5rem 0.75rem'
                                    }}
                                    value={val}
                                    onChange={(e) => handleScoreChange(member.id, pIdx, qIdx, parseInt(e.target.value))}
                                  >
                                    {RATING_OPTIONS.map(opt => (
                                      <option key={opt.value} value={opt.value}>{opt.label}</option>
                                    ))}
                                  </select>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
