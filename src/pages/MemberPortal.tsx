import React, { useState, useEffect, useMemo } from 'react';
import { useData } from '../context/DataContext';
import { format, parseISO, startOfWeek } from 'date-fns';
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip } from 'recharts';
import { CheckCircle2, Save, LogOut } from 'lucide-react';
import LatinCross from '../components/LatinCross';

const MemberPortal = () => {
  const { data, currentUser, logout, saveAssessment } = useData();
  const [isSaving, setIsSaving] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');

  const member = data.roster.find(m => m.id === currentUser?.memberId);
  const cell = data.cells.find(c => c.id === currentUser?.cellId);
  
  const today = new Date();
  const currentWeekDate = format(startOfWeek(today, { weekStartsOn: 1 }), 'yyyy-MM-dd');
  const [date, setDate] = useState(currentWeekDate);

  const pillars = data.pillarQuestions;

  const memberAssessments = useMemo(() => {
    return data.assessments
      .filter(a => a.memberId === currentUser?.memberId)
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [data.assessments, currentUser?.memberId]);

  // Group assessments into blocks based on their schema snapshot
  const blocks = useMemo(() => {
    const currentSchemaStr = JSON.stringify(pillars);
    
    const currentBlock = {
      isCurrent: true,
      pillars: pillars,
      dates: new Set<string>([currentWeekDate]),
      assessments: [] as typeof memberAssessments
    };

    const archivedBlocks: Array<{isCurrent: boolean, pillars: any, dates: Set<string>, assessments: any[]}> = [];
    
    memberAssessments.forEach(a => {
      // If old data has no snapshot, we assume it's the current schema
      const snap = a.scores._snapshot ? a.scores._snapshot : pillars;
      const snapStr = JSON.stringify(snap);
      
      if (snapStr === currentSchemaStr) {
        currentBlock.dates.add(a.date);
        currentBlock.assessments.push(a);
      } else {
        let existing = archivedBlocks.find(b => JSON.stringify(b.pillars) === snapStr);
        if (!existing) {
          existing = { isCurrent: false, pillars: snap, dates: new Set<string>(), assessments: [] };
          archivedBlocks.push(existing);
        }
        existing.dates.add(a.date);
        existing.assessments.push(a);
      }
    });

    return [currentBlock, ...archivedBlocks].map(b => ({
      ...b,
      // Sort descending, take top 8, reverse for display
      dates: Array.from(b.dates).sort((d1, d2) => new Date(d2).getTime() - new Date(d1).getTime()).slice(0, 8).reverse()
    }));
  }, [memberAssessments, pillars, currentWeekDate]);

  const currentAssessment = blocks[0].assessments.find(a => a.date === date);
  const [scores, setScores] = useState<Record<number, Record<number, number>>>(
    currentAssessment?.scores || {}
  );

  useEffect(() => {
    setScores(currentAssessment?.scores || {});
  }, [date, currentAssessment]);

  const handleScoreChange = (pillarIndex: number, questionIndex: number, val: number) => {
    setScores(prev => {
      const newScores = JSON.parse(JSON.stringify(prev));
      if (!newScores[pillarIndex]) newScores[pillarIndex] = {};
      newScores[pillarIndex][questionIndex] = val;
      return newScores;
    });
  };

  const handleSave = async () => {
    if (!currentUser?.cellId || !currentUser?.memberId) return;

    let hasValidationError = false;
    for (let pIdx = 0; pIdx < pillars.length; pIdx++) {
      const pillarScores = (scores as any)[pIdx] || {};
      let answeredCount = 0;
      pillars[pIdx].questions.forEach((_, qIdx) => {
        if (pillarScores[qIdx] > 0) answeredCount++;
      });
      
      if (answeredCount > 0 && answeredCount < pillars[pIdx].questions.length) {
        hasValidationError = true;
        alert(`You must answer all questions for a pillar in order to save. Please complete the ${pillars[pIdx].pillar} pillar.`);
        return;
      }
    }

    setIsSaving(true);
    setSuccessMsg('');
    try {
      await saveAssessment({
        id: `${currentUser.cellId}_${currentUser.memberId}_${date}`,
        cellId: currentUser.cellId,
        memberId: currentUser.memberId,
        date: date,
        scores: { ...scores, _snapshot: pillars },
        timestamp: new Date().toISOString()
      });
      setSuccessMsg('Your assessment has been saved successfully!');
      setTimeout(() => setSuccessMsg(''), 3000);
    } catch (err) {
      console.error(err);
      alert('Failed to save assessment');
    }
    setIsSaving(false);
  };

  const trendData = useMemo(() => {
    return memberAssessments.map(a => {
      const item: any = { name: format(parseISO(a.date), 'MMM dd') };
      let sum = 0;
      let count = 0;
      
      // We calculate scores based on the snapshot it was saved with
      const snapPillars = a.scores._snapshot || pillars;
      snapPillars.forEach((p: any, pIdx: number) => {
        Object.values(a.scores[pIdx] || {}).forEach((score: any) => {
          if (score > 0) {
            sum += score;
            count++;
          }
        });
      });
      
      item.Score = count > 0 ? parseFloat((sum / count).toFixed(1)) : null;
      item._rawDate = a.date;
      return item;
    }).filter(i => i.Score !== null).sort((a, b) => new Date(a._rawDate).getTime() - new Date(b._rawDate).getTime());
  }, [memberAssessments, pillars]);

  if (!member) return <div style={{ padding: '2rem', textAlign: 'center' }}>Member not found. Please log out and try again.</div>;

  return (
    <div style={{ padding: '1rem', maxWidth: '1000px', margin: '0 auto' }}>
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem', padding: '1rem', background: 'var(--surface)', borderRadius: 'var(--radius-lg)', boxShadow: 'var(--shadow-sm)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <div style={{ background: 'var(--primary)', color: 'white', padding: '0.5rem', borderRadius: 'var(--radius-md)' }}>
            <LatinCross size={24} />
          </div>
          <div>
            <h1 style={{ margin: 0, fontSize: '1.5rem', color: 'var(--text-main)' }}>Welcome, {member.name}</h1>
            <p className="text-muted" style={{ margin: 0, fontSize: '0.875rem' }}>{cell?.name || 'Your Cell Group'}</p>
          </div>
        </div>
        <button className="btn btn-outline" onClick={logout} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <LogOut size={16} /> Logout
        </button>
      </header>

      {trendData.length > 0 && (
        <div className="glass-panel" style={{ padding: '1.5rem', marginBottom: '2rem' }}>
          <h3 style={{ margin: 0, color: 'var(--primary)', marginBottom: '1rem' }}>Your Growth Journey</h3>
          <div style={{ height: '200px', width: '100%' }}>
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={trendData} margin={{ top: 5, right: 20, left: -20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                <XAxis dataKey="name" stroke="var(--text-muted)" fontSize={12} tickLine={false} axisLine={false} dy={10} />
                <YAxis domain={[0, 5]} stroke="var(--text-muted)" fontSize={12} tickLine={false} axisLine={false} dx={-10} />
                <Tooltip 
                  contentStyle={{ backgroundColor: 'var(--surface)', borderColor: 'var(--border)', borderRadius: 'var(--radius-md)' }}
                />
                <Line type="monotone" dataKey="Score" stroke="var(--primary)" strokeWidth={3} dot={{ r: 4 }} activeDot={{ r: 6 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {blocks.map((block, bIdx) => (
        <div key={bIdx} className="glass-panel" style={{ padding: '1.5rem', marginBottom: '2rem', overflowX: 'auto', opacity: block.isCurrent ? 1 : 0.85 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
            <div>
              <h3 style={{ margin: 0, color: block.isCurrent ? 'var(--primary)' : 'var(--text-main)' }}>
                {block.isCurrent ? 'Self-Assessment Tracker' : 'Archived Period'}
              </h3>
              <p className="text-muted" style={{ margin: 0, fontSize: '0.875rem' }}>
                {block.isCurrent ? 'Track your spiritual growth across the current 4 pillars.' : 'Read-only view of a previous question set.'}
              </p>
            </div>
            
            {block.isCurrent && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', background: 'var(--bg-color)', padding: '0.5rem', borderRadius: 'var(--radius-md)' }}>
                  <span style={{ fontSize: '0.875rem', fontWeight: 500 }}>Week of:</span>
                  <select 
                    value={date} 
                    onChange={(e) => setDate(e.target.value)}
                    style={{ border: 'none', background: 'transparent', outline: 'none', fontWeight: 600, color: 'var(--text-main)', cursor: 'pointer' }}
                  >
                    <option value={currentWeekDate}>This Week ({format(parseISO(currentWeekDate), 'MMM dd')})</option>
                    {block.dates.filter(d => d !== currentWeekDate).reverse().map(d => (
                      <option key={d} value={d}>{format(parseISO(d), 'MMM dd, yyyy')}</option>
                    ))}
                  </select>
                </div>
                
                <button 
                  className="btn btn-primary" 
                  onClick={handleSave}
                  disabled={isSaving}
                  style={{ minWidth: '120px' }}
                >
                  {isSaving ? 'Saving...' : <><Save size={18} /> Save</>}
                </button>
              </div>
            )}
          </div>

          {block.isCurrent && successMsg && (
            <div style={{ marginBottom: '1.5rem', color: 'var(--success)', display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '1rem', background: 'var(--bg-color)', borderRadius: 'var(--radius-md)' }}>
              <CheckCircle2 size={18} /> {successMsg}
            </div>
          )}

          <div style={{ overflowX: 'auto', borderRadius: 'var(--radius-md)' }}>
            <table className="roster-table" style={{ width: '100%', minWidth: '800px', borderCollapse: 'collapse', border: '2px solid var(--border)' }}>
              <thead>
                <tr>
                  <th style={{ width: '150px', border: '1px solid var(--border)', padding: '1rem', background: 'var(--surface)' }}>Pillar</th>
                  <th style={{ border: '1px solid var(--border)', padding: '1rem', background: 'var(--surface)' }}>Self-check statement</th>
                  {block.dates.map((d, i) => (
                    <th key={d} style={{ width: '80px', textAlign: 'center', border: '1px solid var(--border)', padding: '1rem', background: (block.isCurrent && d === date) ? 'rgba(99, 102, 241, 0.1)' : 'var(--surface)', color: (block.isCurrent && d === date) ? 'var(--primary)' : 'var(--text-main)' }}>
                      Wk {i+1}
                      <div style={{ fontSize: '0.75rem', fontWeight: 'normal', color: 'var(--text-muted)', marginTop: '0.25rem' }}>{format(parseISO(d), 'MMM dd')}</div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {block.pillars.map((pillar: any, pIdx: number) => (
                  <React.Fragment key={pIdx}>
                    {pillar.questions.map((q: string, qIdx: number) => (
                      <tr key={qIdx}>
                        {qIdx === 0 && (
                          <td rowSpan={pillar.questions.length} style={{ verticalAlign: 'top', fontWeight: 600, color: 'var(--primary)', borderRight: '2px solid var(--border)', borderBottom: '1px solid var(--border)', padding: '1.25rem 1rem' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem' }}>
                              {pillar.pillar}
                            </div>
                          </td>
                        )}
                        <td style={{ fontSize: '0.875rem', padding: '1rem', borderBottom: '1px solid var(--border)', borderRight: '1px solid var(--border)', lineHeight: '1.5' }}>{q}</td>
                        {block.dates.map((d) => {
                          const isCurrentEditDate = block.isCurrent && d === date;
                          
                          if (isCurrentEditDate) {
                            const val = scores?.[pIdx]?.[qIdx] || 0;
                            return (
                              <td key={d} style={{ textAlign: 'center', background: 'rgba(99, 102, 241, 0.05)', padding: '0.75rem', borderBottom: '1px solid var(--border)', borderRight: '1px solid var(--border)' }}>
                                <select 
                                  value={val} 
                                  onChange={(e) => handleScoreChange(pIdx, qIdx, Number(e.target.value))}
                                  style={{ 
                                    width: '100%', 
                                    padding: '0.5rem', 
                                    border: val > 0 ? '1px solid var(--primary)' : '1px solid var(--border)',
                                    borderRadius: 'var(--radius-sm)',
                                    outline: 'none',
                                    background: val > 0 ? 'var(--primary)' : 'var(--surface)',
                                    color: val > 0 ? 'white' : 'var(--text-main)',
                                    fontWeight: val > 0 ? 600 : 'normal',
                                    textAlign: 'center',
                                    appearance: 'none',
                                    cursor: 'pointer',
                                    boxShadow: val > 0 ? '0 2px 4px rgba(99, 102, 241, 0.2)' : 'none',
                                    transition: 'all 0.2s'
                                  }}
                                >
                                  <option value={0}>-</option>
                                  <option value={1}>1</option>
                                  <option value={2}>2</option>
                                  <option value={3}>3</option>
                                  <option value={4}>4</option>
                                  <option value={5}>5</option>
                                </select>
                              </td>
                            );
                          } else {
                            const pastAss = block.assessments.find(a => a.date === d);
                            const val = pastAss?.scores?.[pIdx]?.[qIdx] || 0;
                            return (
                              <td key={d} style={{ textAlign: 'center', fontWeight: val > 0 ? 600 : 'normal', color: val > 0 ? 'var(--text-main)' : 'var(--text-muted)', borderBottom: '1px solid var(--border)', borderRight: '1px solid var(--border)' }}>
                                {val > 0 ? val : '-'}
                              </td>
                            );
                          }
                        })}
                      </tr>
                    ))}
                    <tr>
                      <td colSpan={2 + block.dates.length} style={{ height: '0.5rem', background: 'var(--border)', padding: 0 }}></td>
                    </tr>
                  </React.Fragment>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ))}
    </div>
  );
};

export default MemberPortal;
