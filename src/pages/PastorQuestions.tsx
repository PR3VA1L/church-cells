import React, { useState, useMemo } from 'react';
import { useData } from '../context/DataContext';
import { format, parseISO } from 'date-fns';
import { 
  HelpCircle, 
  Send, 
  CheckCircle2, 
  Clock, 
  Trash2, 
  Edit3, 
  Search, 
  Filter, 
  MessageSquare, 
  ShieldCheck, 
  X, 
  Sparkles,
  BookOpen
} from 'lucide-react';
import LatinCross from '../components/LatinCross';

export default function PastorQuestions() {
  const { 
    data, 
    currentUser, 
    activeCellId, 
    addPastorQuestion, 
    updatePastorQuestion, 
    deletePastorQuestion, 
    answerPastorQuestion 
  } = useData();

  const isAdmin = currentUser?.role === 'admin';
  const targetCellId = activeCellId || currentUser?.cellId || null;
  const currentCell = targetCellId ? data.cells.find(c => c.id === targetCellId) : null;

  // New question form state
  const [showAddForm, setShowAddForm] = useState(false);
  const [newQuestionText, setNewQuestionText] = useState('');
  const [newQuestionDate, setNewQuestionDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Edit question state
  const [editingQuestionId, setEditingQuestionId] = useState<string | null>(null);
  const [editQuestionText, setEditQuestionText] = useState('');

  // Pastor answer form state
  const [answeringQuestionId, setAnsweringQuestionId] = useState<string | null>(null);
  const [answerDraft, setAnswerDraft] = useState('');

  // Filter & search state
  const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'answered'>('all');
  const [adminCellFilter, setAdminCellFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Filter questions based on role and active filters
  const filteredQuestions = useMemo(() => {
    let list = data.pastorQuestions || [];

    // Cell leader only sees questions for their active cell
    if (!isAdmin) {
      if (targetCellId) {
        list = list.filter(q => q.cellId === targetCellId);
      }
    } else {
      // Admin cell filter
      if (adminCellFilter !== 'all') {
        list = list.filter(q => q.cellId === adminCellFilter);
      }
    }

    // Status filter
    if (statusFilter !== 'all') {
      list = list.filter(q => q.status === statusFilter);
    }

    // Search query
    if (searchQuery.trim()) {
      const qLower = searchQuery.toLowerCase();
      list = list.filter(q => 
        q.question.toLowerCase().includes(qLower) || 
        (q.answer && q.answer.toLowerCase().includes(qLower))
      );
    }

    return list;
  }, [data.pastorQuestions, isAdmin, targetCellId, adminCellFilter, statusFilter, searchQuery]);

  // Overall counts for badges
  const stats = useMemo(() => {
    let pool = data.pastorQuestions || [];
    if (!isAdmin && targetCellId) {
      pool = pool.filter(q => q.cellId === targetCellId);
    } else if (isAdmin && adminCellFilter !== 'all') {
      pool = pool.filter(q => q.cellId === adminCellFilter);
    }
    const total = pool.length;
    const pending = pool.filter(q => q.status === 'pending').length;
    const answered = pool.filter(q => q.status === 'answered').length;
    return { total, pending, answered };
  }, [data.pastorQuestions, isAdmin, targetCellId, adminCellFilter]);

  const handleCreateQuestion = async (e: React.FormEvent) => {
    e.preventDefault();
    const cellIdToUse = targetCellId || (isAdmin && adminCellFilter !== 'all' ? adminCellFilter : data.cells[0]?.id);
    if (!cellIdToUse) {
      alert("Please select a cell group first.");
      return;
    }
    if (!newQuestionText.trim()) {
      alert("Please enter a question.");
      return;
    }

    setIsSubmitting(true);
    try {
      await addPastorQuestion(cellIdToUse, newQuestionText, newQuestionDate);
      setNewQuestionText('');
      setNewQuestionDate(format(new Date(), 'yyyy-MM-dd'));
      setShowAddForm(false);
    } catch {
      // Error handled by DataContext notification
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSaveEdit = async (questionId: string) => {
    if (!editQuestionText.trim()) return;
    try {
      await updatePastorQuestion(questionId, editQuestionText);
      setEditingQuestionId(null);
      setEditQuestionText('');
    } catch {
      // Error handled by DataContext notification
    }
  };

  const handleDelete = async (questionId: string) => {
    if (window.confirm("Are you sure you want to delete this question?")) {
      await deletePastorQuestion(questionId);
    }
  };

  const handleSaveAnswer = async (questionId: string) => {
    if (!answerDraft.trim()) {
      alert("Please provide an answer or guidance.");
      return;
    }
    try {
      await answerPastorQuestion(questionId, answerDraft, 'answered');
      setAnsweringQuestionId(null);
      setAnswerDraft('');
    } catch {
      // Error handled by DataContext notification
    }
  };

  const handleToggleUnanswered = async (questionId: string, currentAnswer?: string) => {
    if (window.confirm("Mark this question as pending/unanswered?")) {
      await answerPastorQuestion(questionId, currentAnswer || '', 'pending');
    }
  };

  const getCellName = (cellId: string) => {
    const c = data.cells.find(cell => cell.id === cellId);
    return c ? c.name : 'Unknown Cell';
  };

  return (
    <div className="page-container" style={{ padding: '1.5rem', maxWidth: '1100px', margin: '0 auto' }}>
      {/* Page Header */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        flexWrap: 'wrap',
        gap: '1rem',
        marginBottom: '1.5rem'
      }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--primary)', marginBottom: '0.25rem' }}>
            <LatinCross size={22} />
            <h1 style={{ margin: 0, fontSize: '1.75rem', fontWeight: 700, color: 'var(--text-main)' }}>
              {isAdmin ? 'Questions from Cells (Pastor Q&A)' : 'Questions for Pastor'}
            </h1>
          </div>
          <p className="text-muted" style={{ margin: 0, fontSize: '0.9rem' }}>
            {isAdmin 
              ? 'Review questions asked across cell meetings and provide pastoral or biblical answers.' 
              : `Record questions asked in ${currentCell?.name || 'your cell'} meetings for pastoral answers.`}
          </p>
        </div>

        {/* Action Button for Leaders & Admins */}
        <button
          className="btn btn-primary"
          onClick={() => setShowAddForm(!showAddForm)}
          style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.65rem 1.25rem' }}
        >
          {showAddForm ? <X size={18} /> : <MessageSquare size={18} />}
          {showAddForm ? 'Cancel' : 'Record a Cell Question'}
        </button>
      </div>

      {/* Anonymous Notice Banner */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: '0.75rem',
        padding: '0.85rem 1rem',
        backgroundColor: 'rgba(99, 102, 241, 0.08)',
        border: '1px solid rgba(99, 102, 241, 0.25)',
        borderRadius: 'var(--radius-md)',
        marginBottom: '1.5rem',
        fontSize: '0.875rem',
        color: 'var(--text-main)'
      }}>
        <ShieldCheck size={20} color="var(--primary)" style={{ flexShrink: 0 }} />
        <div>
          <strong>Anonymous Question Policy:</strong> We only record the question text itself—never who asked it. Members and visitors can ask freely and openly without fear of embarrassment.
        </div>
      </div>

      {/* New Question Form */}
      {showAddForm && (
        <div className="glass-panel" style={{
          padding: '1.5rem',
          marginBottom: '2rem',
          borderRadius: 'var(--radius-lg)',
          border: '2px solid var(--primary)',
          boxShadow: 'var(--shadow-md)',
          animation: 'fade-in 0.2s ease-out'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem', color: 'var(--primary)' }}>
            <Sparkles size={20} />
            <h3 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 600 }}>Record a Question for the Pastor</h3>
          </div>

          <form onSubmit={handleCreateQuestion}>
            <div style={{ display: 'grid', gridTemplateColumns: isAdmin ? '1fr 1fr' : '1fr', gap: '1rem', marginBottom: '1rem' }}>
              {isAdmin && (
                <div>
                  <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 500, marginBottom: '0.4rem', color: 'var(--text-main)' }}>
                    Cell Group
                  </label>
                  <select 
                    value={adminCellFilter === 'all' ? (data.cells[0]?.id || '') : adminCellFilter} 
                    onChange={(e) => setAdminCellFilter(e.target.value)}
                    style={{ width: '100%', padding: '0.6rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border)', background: 'var(--surface)', color: 'var(--text-main)' }}
                  >
                    {data.cells.map(c => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                </div>
              )}

              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 500, marginBottom: '0.4rem', color: 'var(--text-main)' }}>
                  Date Asked (Meeting Date)
                </label>
                <input 
                  type="date"
                  value={newQuestionDate}
                  onChange={(e) => setNewQuestionDate(e.target.value)}
                  style={{ width: '100%', padding: '0.6rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border)', background: 'var(--surface)', color: 'var(--text-main)' }}
                  required
                />
              </div>
            </div>

            <div style={{ marginBottom: '1.25rem' }}>
              <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 500, marginBottom: '0.4rem', color: 'var(--text-main)' }}>
                Question Asked in Cell
              </label>
              <textarea
                value={newQuestionText}
                onChange={(e) => setNewQuestionText(e.target.value)}
                placeholder="Type the question as asked during cell... (e.g., 'Can someone lose their salvation?', 'How do we pray when we feel God is silent?')"
                rows={3}
                style={{
                  width: '100%',
                  padding: '0.75rem',
                  borderRadius: 'var(--radius-md)',
                  border: '1px solid var(--border)',
                  background: 'var(--surface)',
                  color: 'var(--text-main)',
                  fontSize: '0.95rem',
                  lineHeight: '1.5',
                  resize: 'vertical'
                }}
                required
              />
              <span className="text-muted" style={{ fontSize: '0.75rem' }}>
                Note: Do not include names or identifiable personal info.
              </span>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
              <button 
                type="button" 
                className="btn btn-outline" 
                onClick={() => setShowAddForm(false)}
                disabled={isSubmitting}
              >
                Cancel
              </button>
              <button 
                type="submit" 
                className="btn btn-primary" 
                disabled={isSubmitting}
                style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}
              >
                <Send size={16} />
                {isSubmitting ? 'Submitting...' : 'Save Question for Pastor'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* KPI Stats Strip */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
        gap: '1rem',
        marginBottom: '1.5rem'
      }}>
        <div className="glass-panel" style={{ padding: '1rem 1.25rem', display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <div style={{ padding: '0.75rem', borderRadius: 'var(--radius-md)', backgroundColor: 'var(--primary-light)', color: 'var(--primary)' }}>
            <BookOpen size={24} />
          </div>
          <div>
            <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Total Questions</div>
            <div style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--text-main)' }}>{stats.total}</div>
          </div>
        </div>

        <div className="glass-panel" style={{ padding: '1rem 1.25rem', display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <div style={{ padding: '0.75rem', borderRadius: 'var(--radius-md)', backgroundColor: 'rgba(245, 158, 11, 0.15)', color: '#d97706' }}>
            <Clock size={24} />
          </div>
          <div>
            <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Awaiting Pastor's Answer</div>
            <div style={{ fontSize: '1.5rem', fontWeight: 700, color: '#d97706' }}>{stats.pending}</div>
          </div>
        </div>

        <div className="glass-panel" style={{ padding: '1rem 1.25rem', display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <div style={{ padding: '0.75rem', borderRadius: 'var(--radius-md)', backgroundColor: 'rgba(16, 185, 129, 0.15)', color: '#059669' }}>
            <CheckCircle2 size={24} />
          </div>
          <div>
            <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Answered & Guided</div>
            <div style={{ fontSize: '1.5rem', fontWeight: 700, color: '#059669' }}>{stats.answered}</div>
          </div>
        </div>
      </div>

      {/* Filters & Search Bar */}
      <div className="glass-panel" style={{
        padding: '1rem 1.25rem',
        marginBottom: '1.5rem',
        display: 'flex',
        flexWrap: 'wrap',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: '1rem'
      }}>
        {/* Status Filter Tabs */}
        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
          <button
            className={`btn ${statusFilter === 'all' ? 'btn-primary' : 'btn-outline'}`}
            onClick={() => setStatusFilter('all')}
            style={{ padding: '0.4rem 0.85rem', fontSize: '0.85rem' }}
          >
            All ({stats.total})
          </button>
          <button
            className={`btn ${statusFilter === 'pending' ? 'btn-primary' : 'btn-outline'}`}
            onClick={() => setStatusFilter('pending')}
            style={{ padding: '0.4rem 0.85rem', fontSize: '0.85rem' }}
          >
            Awaiting Answer ({stats.pending})
          </button>
          <button
            className={`btn ${statusFilter === 'answered' ? 'btn-primary' : 'btn-outline'}`}
            onClick={() => setStatusFilter('answered')}
            style={{ padding: '0.4rem 0.85rem', fontSize: '0.85rem' }}
          >
            Answered ({stats.answered})
          </button>
        </div>

        {/* Admin Cell Selector & Search */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
          {isAdmin && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Filter size={16} className="text-muted" />
              <select
                value={adminCellFilter}
                onChange={(e) => setAdminCellFilter(e.target.value)}
                style={{
                  padding: '0.45rem 0.75rem',
                  borderRadius: 'var(--radius-md)',
                  border: '1px solid var(--border)',
                  background: 'var(--surface)',
                  color: 'var(--text-main)',
                  fontSize: '0.85rem'
                }}
              >
                <option value="all">All Cell Groups</option>
                {data.cells.map(c => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>
          )}

          <div style={{ position: 'relative', minWidth: '200px' }}>
            <Search size={16} className="text-muted" style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)' }} />
            <input
              type="text"
              placeholder="Search questions..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{
                width: '100%',
                padding: '0.45rem 0.75rem 0.45rem 2.25rem',
                borderRadius: 'var(--radius-md)',
                border: '1px solid var(--border)',
                background: 'var(--surface)',
                color: 'var(--text-main)',
                fontSize: '0.85rem'
              }}
            />
          </div>
        </div>
      </div>

      {/* Questions List */}
      {filteredQuestions.length === 0 ? (
        <div className="glass-panel" style={{ padding: '3rem', textAlign: 'center' }}>
          <HelpCircle size={48} color="var(--text-muted)" style={{ marginBottom: '1rem', opacity: 0.5 }} />
          <h3 style={{ margin: 0, color: 'var(--text-main)', marginBottom: '0.5rem' }}>No Questions Found</h3>
          <p className="text-muted" style={{ margin: 0, maxWidth: '450px', marginInline: 'auto', fontSize: '0.9rem' }}>
            {searchQuery 
              ? 'No questions matched your search query. Try another search term.' 
              : statusFilter === 'pending'
                ? 'All questions currently have answers. Great job!'
                : 'Questions asked by cell members during meetings will appear here once recorded.'}
          </p>
          {!showAddForm && (
            <button 
              className="btn btn-primary" 
              onClick={() => setShowAddForm(true)}
              style={{ marginTop: '1.25rem' }}
            >
              Record First Question
            </button>
          )}
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {filteredQuestions.map((q) => {
            const isAnswered = q.status === 'answered';
            const isEditingThis = editingQuestionId === q.id;
            const isAnsweringThis = answeringQuestionId === q.id;
            const cellName = getCellName(q.cellId);

            return (
              <div 
                key={q.id} 
                className="glass-panel" 
                style={{ 
                  padding: '1.5rem', 
                  borderRadius: 'var(--radius-lg)', 
                  borderLeft: isAnswered ? '4px solid #10b981' : '4px solid #f59e0b',
                  transition: 'all 0.2s'
                }}
              >
                {/* Question Header Meta */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem', flexWrap: 'wrap', gap: '0.5rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                    <span style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '0.35rem',
                      fontSize: '0.75rem',
                      fontWeight: 600,
                      padding: '0.2rem 0.6rem',
                      borderRadius: '999px',
                      backgroundColor: isAnswered ? 'rgba(16, 185, 129, 0.15)' : 'rgba(245, 158, 11, 0.15)',
                      color: isAnswered ? '#059669' : '#d97706'
                    }}>
                      {isAnswered ? <CheckCircle2 size={12} /> : <Clock size={12} />}
                      {isAnswered ? 'Answered' : 'Awaiting Pastor'}
                    </span>

                    <span style={{
                      fontSize: '0.75rem',
                      fontWeight: 600,
                      padding: '0.2rem 0.5rem',
                      borderRadius: 'var(--radius-sm)',
                      backgroundColor: 'var(--bg-color)',
                      color: 'var(--primary)'
                    }}>
                      {cellName}
                    </span>

                    <span className="text-muted" style={{ fontSize: '0.8rem' }}>
                      Asked on {format(parseISO(q.date), 'MMMM d, yyyy')}
                    </span>
                  </div>

                  {/* Action Buttons for Leader/Admin */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    {!isEditingThis && (
                      <button
                        className="btn"
                        onClick={() => {
                          setEditingQuestionId(q.id);
                          setEditQuestionText(q.question);
                        }}
                        title="Edit question text"
                        style={{ padding: '0.3rem 0.5rem', color: 'var(--text-muted)' }}
                      >
                        <Edit3 size={15} />
                      </button>
                    )}
                    <button
                      className="btn"
                      onClick={() => handleDelete(q.id)}
                      title="Delete question"
                      style={{ padding: '0.3rem 0.5rem', color: 'var(--danger)' }}
                    >
                      <Trash2 size={15} />
                    </button>
                  </div>
                </div>

                {/* Question Text */}
                {isEditingThis ? (
                  <div style={{ margin: '0.75rem 0' }}>
                    <textarea
                      value={editQuestionText}
                      onChange={(e) => setEditQuestionText(e.target.value)}
                      rows={2}
                      style={{
                        width: '100%',
                        padding: '0.65rem',
                        borderRadius: 'var(--radius-md)',
                        border: '1px solid var(--primary)',
                        background: 'var(--surface)',
                        color: 'var(--text-main)',
                        fontSize: '0.95rem'
                      }}
                    />
                    <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.5rem' }}>
                      <button 
                        className="btn btn-primary" 
                        onClick={() => handleSaveEdit(q.id)}
                        style={{ padding: '0.35rem 0.75rem', fontSize: '0.8rem' }}
                      >
                        Save Question
                      </button>
                      <button 
                        className="btn btn-outline" 
                        onClick={() => setEditingQuestionId(null)}
                        style={{ padding: '0.35rem 0.75rem', fontSize: '0.8rem' }}
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : (
                  <div style={{
                    fontSize: '1.05rem',
                    fontWeight: 600,
                    color: 'var(--text-main)',
                    lineHeight: '1.5',
                    marginBottom: '1rem'
                  }}>
                    "{q.question}"
                  </div>
                )}

                {/* Pastor Answer Display */}
                {isAnswered && !isAnsweringThis && (
                  <div style={{
                    marginTop: '0.75rem',
                    padding: '1rem 1.25rem',
                    backgroundColor: 'rgba(16, 185, 129, 0.06)',
                    border: '1px solid rgba(16, 185, 129, 0.25)',
                    borderRadius: 'var(--radius-md)'
                  }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: '#059669', fontWeight: 600, fontSize: '0.85rem' }}>
                        <LatinCross size={16} />
                        <span>Pastor's Answer & Guidance</span>
                      </div>
                      {q.answeredAt && (
                        <span className="text-muted" style={{ fontSize: '0.75rem' }}>
                          Answered {format(parseISO(q.answeredAt), 'MMM d, yyyy')}
                        </span>
                      )}
                    </div>
                    <p style={{ margin: 0, fontSize: '0.925rem', color: 'var(--text-main)', lineHeight: '1.6', whiteSpace: 'pre-wrap' }}>
                      {q.answer}
                    </p>

                    {isAdmin && (
                      <div style={{ display: 'flex', gap: '0.75rem', marginTop: '0.75rem' }}>
                        <button
                          className="btn btn-outline"
                          onClick={() => {
                            setAnsweringQuestionId(q.id);
                            setAnswerDraft(q.answer || '');
                          }}
                          style={{ padding: '0.25rem 0.65rem', fontSize: '0.75rem' }}
                        >
                          Edit Answer
                        </button>
                        <button
                          className="btn"
                          onClick={() => handleToggleUnanswered(q.id, q.answer)}
                          style={{ padding: '0.25rem 0.65rem', fontSize: '0.75rem', color: 'var(--text-muted)' }}
                        >
                          Mark as Unanswered
                        </button>
                      </div>
                    )}
                  </div>
                )}

                {/* Pastor Answering Form (For Admin / Pastor) */}
                {isAnsweringThis ? (
                  <div style={{
                    marginTop: '1rem',
                    padding: '1.25rem',
                    backgroundColor: 'var(--bg-color)',
                    border: '1px solid var(--border)',
                    borderRadius: 'var(--radius-md)'
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', marginBottom: '0.5rem', color: 'var(--primary)', fontWeight: 600 }}>
                      <LatinCross size={18} />
                      <span>{isAnswered ? 'Edit Pastor Answer' : 'Provide Pastor Answer'}</span>
                    </div>
                    <textarea
                      value={answerDraft}
                      onChange={(e) => setAnswerDraft(e.target.value)}
                      placeholder="Type pastoral response, scripture references, and guidance here..."
                      rows={4}
                      style={{
                        width: '100%',
                        padding: '0.75rem',
                        borderRadius: 'var(--radius-md)',
                        border: '1px solid var(--border)',
                        background: 'var(--surface)',
                        color: 'var(--text-main)',
                        fontSize: '0.9rem',
                        lineHeight: '1.5'
                      }}
                      autoFocus
                    />
                    <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem', marginTop: '0.75rem' }}>
                      <button
                        className="btn btn-outline"
                        onClick={() => {
                          setAnsweringQuestionId(null);
                          setAnswerDraft('');
                        }}
                      >
                        Cancel
                      </button>
                      <button
                        className="btn btn-primary"
                        onClick={() => handleSaveAnswer(q.id)}
                        style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}
                      >
                        <CheckCircle2 size={16} /> Save & Mark Answered
                      </button>
                    </div>
                  </div>
                ) : (
                  isAdmin && !isAnswered && (
                    <div style={{ marginTop: '0.75rem' }}>
                      <button
                        className="btn btn-primary"
                        onClick={() => {
                          setAnsweringQuestionId(q.id);
                          setAnswerDraft('');
                        }}
                        style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.85rem', padding: '0.4rem 0.85rem' }}
                      >
                        <LatinCross size={16} /> Answer This Question
                      </button>
                    </div>
                  )
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
