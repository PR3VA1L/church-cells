import React, { useState, useEffect } from 'react';
import { useData } from '../context/DataContext';
import { format } from 'date-fns';
import { Save, Calendar, Plus, Search, ChevronDown, ChevronRight, Settings, Trash2 } from 'lucide-react';

const defaultQuestions = [
  "Number of members who maintained a consistent prayer routine during the week - prayed at least 5 days this week.",
  "What prayer component or type did the cell practise and demonstrated growth in this week?",
  "What common barriers in prayer are affecting the cell members.",
  "Testimonies & Breakthroughs - themes"
];

const WeeklyReport = () => {
  const { data, activeCellId, saveWeeklyReport, currentUser, updateCellQuestions, updateCellStopWords } = useData();
  const activeCell = data.cells.find(c => c.id === activeCellId);
  const isAdmin = currentUser?.role === 'admin';

  const questions = activeCell?.custom_questions || defaultQuestions;
  const stopWords = activeCell?.custom_stop_words || [];

  const [date, setDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [responses, setResponses] = useState<Record<string, string>>({});

  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [expandedId, setExpandedId] = useState<string | null>(null);

  // Settings State
  const [editQuestions, setEditQuestions] = useState<string[]>([...questions]);
  const [editStopWords, setEditStopWords] = useState<string[]>([...stopWords]);
  const [newQuestion, setNewQuestion] = useState('');
  const [newStopWord, setNewStopWord] = useState('');

  // Load existing report for this date if it exists
  useEffect(() => {
    if (activeCellId && data.weeklyReports) {
      const existingReport = data.weeklyReports.find(r => r.cellId === activeCellId && r.date === date);
      if (existingReport) {
        // Build responses object
        const loaded: Record<string, string> = { ...(existingReport.custom_responses || {}) };
        // Fallback for legacy fields
        if (existingReport.q1 && !loaded[defaultQuestions[0]]) loaded[defaultQuestions[0]] = existingReport.q1;
        if (existingReport.q2 && !loaded[defaultQuestions[1]]) loaded[defaultQuestions[1]] = existingReport.q2;
        if (existingReport.q3 && !loaded[defaultQuestions[2]]) loaded[defaultQuestions[2]] = existingReport.q3;
        if (existingReport.q4 && !loaded[defaultQuestions[3]]) loaded[defaultQuestions[3]] = existingReport.q4;
        setResponses(loaded);
      } else {
        setResponses({});
      }
    }
  }, [date, activeCellId, data.weeklyReports]);

  // Sync settings state when opening settings
  useEffect(() => {
    if (isSettingsOpen) {
      setEditQuestions([...questions]);
      setEditStopWords([...stopWords]);
    }
  }, [isSettingsOpen, questions, stopWords]);

  if (!activeCellId || !activeCell) {
    return (
      <div className="page-header">
        <h1>Weekly Prayer Reports</h1>
        <p className="text-muted">Please select a cell group first.</p>
      </div>
    );
  }

  const handleSave = () => {
    // For legacy compatibility, map the first 4 default questions back to q1-q4 if they exist
    const report = {
      id: Date.now().toString(),
      cellId: activeCellId,
      date,
      q1: responses[defaultQuestions[0]] || '',
      q2: responses[defaultQuestions[1]] || '',
      q3: responses[defaultQuestions[2]] || '',
      q4: responses[defaultQuestions[3]] || '',
      custom_responses: responses,
      timestamp: new Date().toISOString()
    };
    saveWeeklyReport(report);
    setIsFormOpen(false);
  };

  const handleSaveSettings = async () => {
    await updateCellQuestions(activeCellId, editQuestions);
    await updateCellStopWords(activeCellId, editStopWords);
    setIsSettingsOpen(false);
  };

  const cellReports = (data.weeklyReports || [])
    .filter(r => r.cellId === activeCellId)
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  const filteredReports = cellReports.filter(r => 
    r.date.includes(searchTerm) || format(new Date(r.date), 'MMMM d, yyyy').toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div style={{ maxWidth: '800px', margin: '0 auto', animation: 'var(--transition)' }}>
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h1>Weekly Prayer Reports</h1>
          <p className="text-muted">Review past reports and track spiritual growth.</p>
        </div>
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <button className="btn btn-outline" onClick={() => setIsSettingsOpen(true)}>
            <Settings size={18} /> Settings
          </button>
          <button className="btn btn-primary" onClick={() => setIsFormOpen(!isFormOpen)}>
            {isFormOpen ? 'Cancel' : <><Plus size={18} /> Submit New Report</>}
          </button>
        </div>
      </div>

      {isSettingsOpen && (
        <div className="card" style={{ marginBottom: '2rem', padding: '1.5rem', animation: 'var(--transition)' }}>
          <h2 style={{ marginTop: 0, marginBottom: '1.5rem', fontSize: '1.25rem' }}>Report Settings</h2>
          
          <div style={{ marginBottom: '2rem' }}>
            <h3 style={{ fontSize: '1rem', marginBottom: '1rem' }}>Custom Questions</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', marginBottom: '1rem' }}>
              {editQuestions.map((q, idx) => (
                <div key={idx} style={{ display: 'flex', gap: '0.5rem', alignItems: 'flex-start' }}>
                  <textarea 
                    value={q} 
                    onChange={e => {
                      const newQ = [...editQuestions];
                      newQ[idx] = e.target.value;
                      setEditQuestions(newQ);
                    }}
                    style={{ flex: 1, padding: '0.5rem', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)', resize: 'vertical' }}
                    rows={2}
                  />
                  <button className="btn btn-outline" style={{ padding: '0.5rem', color: 'var(--danger)', borderColor: 'var(--danger)' }} onClick={() => setEditQuestions(editQuestions.filter((_, i) => i !== idx))}>
                    <Trash2 size={16} />
                  </button>
                </div>
              ))}
            </div>
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <input 
                type="text" 
                value={newQuestion} 
                onChange={e => setNewQuestion(e.target.value)} 
                placeholder="Add a new question..." 
                style={{ flex: 1, padding: '0.5rem', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)' }}
                onKeyDown={e => {
                  if (e.key === 'Enter' && newQuestion.trim()) {
                    setEditQuestions([...editQuestions, newQuestion.trim()]);
                    setNewQuestion('');
                  }
                }}
              />
              <button className="btn btn-outline" onClick={() => { if(newQuestion.trim()) { setEditQuestions([...editQuestions, newQuestion.trim()]); setNewQuestion(''); }}}>
                Add
              </button>
            </div>
          </div>

          <div style={{ marginBottom: '2rem' }}>
            <h3 style={{ fontSize: '1rem', marginBottom: '1rem' }}>Custom Stop Words (Ignored by Word Cloud)</h3>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', marginBottom: '1rem' }}>
              {editStopWords.map((word, idx) => (
                <span key={idx} className="badge badge-member" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.875rem', background: 'var(--bg-color)', border: '1px solid var(--border)', color: 'var(--text-main)' }}>
                  {word}
                  <Trash2 size={14} style={{ cursor: 'pointer', color: 'var(--danger)' }} onClick={() => setEditStopWords(editStopWords.filter((_, i) => i !== idx))} />
                </span>
              ))}
              {editStopWords.length === 0 && <span className="text-muted" style={{ fontSize: '0.875rem' }}>No custom stop words.</span>}
            </div>
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <input 
                type="text" 
                value={newStopWord} 
                onChange={e => setNewStopWord(e.target.value)} 
                placeholder="e.g. cell, church, meeting..." 
                style={{ flex: 1, padding: '0.5rem', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)' }}
                onKeyDown={e => {
                  if (e.key === 'Enter' && newStopWord.trim()) {
                    setEditStopWords([...editStopWords, newStopWord.trim().toLowerCase()]);
                    setNewStopWord('');
                  }
                }}
              />
              <button className="btn btn-outline" onClick={() => { if(newStopWord.trim()) { setEditStopWords([...editStopWords, newStopWord.trim().toLowerCase()]); setNewStopWord(''); }}}>
                Add
              </button>
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '1rem', borderTop: '1px solid var(--border)', paddingTop: '1.5rem' }}>
            <button className="btn btn-outline" onClick={() => setIsSettingsOpen(false)}>Cancel</button>
            <button className="btn btn-primary" onClick={handleSaveSettings}>Save Settings</button>
          </div>
        </div>
      )}

      {isFormOpen && !isSettingsOpen && (
        <div className="card" style={{ marginBottom: '2rem', animation: 'var(--transition)' }}>
          <div style={{ display: 'flex', gap: '1rem', marginBottom: '1.5rem', alignItems: 'center' }}>
            <div style={{ flex: '1', display: 'flex', alignItems: 'center', gap: '0.5rem', background: 'var(--bg-color)', padding: '0.75rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border)' }}>
              <Calendar size={20} color="var(--primary)" />
              <input 
                type="date" 
                value={date} 
                onChange={(e) => setDate(e.target.value)}
                style={{ border: 'none', background: 'transparent', outline: 'none', fontSize: '1rem', width: '100%', color: 'var(--text-main)' }}
              />
            </div>
            <button className="btn btn-primary" onClick={handleSave}>
              <Save size={18} /> Save Report
            </button>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            {questions.map((q, idx) => (
              <div key={idx} className="form-group">
                <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '600' }}>
                  {idx + 1}. {q}
                </label>
                {q.toLowerCase().includes('number') ? (
                  <input 
                    type="number" 
                    value={responses[q] || ''} 
                    onChange={(e) => setResponses({ ...responses, [q]: e.target.value })}
                    placeholder="e.g. 5"
                    style={{ width: '100%', padding: '0.75rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border)', background: 'var(--bg-color)', color: 'var(--text-main)' }}
                  />
                ) : (
                  <textarea 
                    value={responses[q] || ''} 
                    onChange={(e) => setResponses({ ...responses, [q]: e.target.value })}
                    rows={3}
                    placeholder="Type your response here..."
                    style={{ width: '100%', padding: '0.75rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border)', background: 'var(--bg-color)', color: 'var(--text-main)', resize: 'vertical' }}
                  />
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="glass-panel" style={{ padding: '1.5rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1.5rem', background: 'var(--bg-color)', padding: '0.5rem 1rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border)' }}>
          <Search size={18} color="var(--text-muted)" />
          <input 
            placeholder="Search reports by date (e.g. August 8)..." 
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            style={{ border: 'none', background: 'transparent', outline: 'none', width: '100%', color: 'var(--text-main)' }}
          />
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {filteredReports.map(report => (
            <div key={report.id} className="card" style={{ padding: '1rem', overflow: 'hidden' }}>
              <div 
                style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer' }}
                onClick={() => setExpandedId(expandedId === report.id ? null : report.id)}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                  {expandedId === report.id ? <ChevronDown size={20} color="var(--primary)" /> : <ChevronRight size={20} color="var(--primary)" />}
                  <h3 style={{ margin: 0, fontSize: '1.1rem' }}>{format(new Date(report.date), 'MMMM d, yyyy')} Meeting Report</h3>
                </div>
                <button className="btn btn-outline" style={{ padding: '0.25rem 0.5rem', fontSize: '0.75rem' }} onClick={(e) => { e.stopPropagation(); setDate(report.date); setIsFormOpen(true); setIsSettingsOpen(false); window.scrollTo({ top: 0, behavior: 'smooth' }); }}>
                  Edit
                </button>
              </div>
              
              {expandedId === report.id && (
                <div style={{ marginTop: '1rem', paddingTop: '1rem', borderTop: '1px solid var(--border)', display: 'flex', flexDirection: 'column', gap: '1.5rem', animation: 'var(--transition)' }}>
                  
                  {/* Map over the report's custom responses, or fallback to legacy q1-q4 */}
                  {report.custom_responses && Object.keys(report.custom_responses).length > 0 ? (
                    Object.entries(report.custom_responses).map(([q, a], i) => (
                      <div key={i}>
                        <strong style={{ display: 'block', marginBottom: '0.25rem', color: 'var(--primary)' }}>{i + 1}. {q}</strong>
                        <p style={{ margin: 0, color: 'var(--text-muted)' }}>{a || 'None provided'}</p>
                      </div>
                    ))
                  ) : (
                    <>
                      <div>
                        <strong style={{ display: 'block', marginBottom: '0.25rem', color: 'var(--primary)' }}>1. Consistent Pray-ers (5+ days):</strong>
                        <p style={{ margin: 0, color: 'var(--text-muted)' }}>{report.q1 || '0'}</p>
                      </div>
                      <div>
                        <strong style={{ display: 'block', marginBottom: '0.25rem', color: 'var(--primary)' }}>2. Prayer components practiced:</strong>
                        <p style={{ margin: 0, color: 'var(--text-muted)' }}>{report.q2 || 'None provided'}</p>
                      </div>
                      <div>
                        <strong style={{ display: 'block', marginBottom: '0.25rem', color: 'var(--primary)' }}>3. Common barriers:</strong>
                        <p style={{ margin: 0, color: 'var(--text-muted)' }}>{report.q3 || 'None provided'}</p>
                      </div>
                      <div>
                        <strong style={{ display: 'block', marginBottom: '0.25rem', color: 'var(--primary)' }}>4. Testimonies & Breakthroughs:</strong>
                        <p style={{ margin: 0, color: 'var(--text-muted)' }}>{report.q4 || 'None provided'}</p>
                      </div>
                    </>
                  )}
                  
                </div>
              )}
            </div>
          ))}
          
          {filteredReports.length === 0 && (
            <div style={{ textAlign: 'center', padding: '3rem 1rem', color: 'var(--text-muted)', background: 'var(--bg-color)', borderRadius: 'var(--radius-md)' }}>
              No reports found for this cell.
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default WeeklyReport;
