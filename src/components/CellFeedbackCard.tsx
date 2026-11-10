import React, { useState, useEffect } from 'react';
import { useData } from '../context/DataContext';
import { Sparkles, Save, CheckCircle2, Clock, AlertCircle, MessageSquare } from 'lucide-react';
import { format, parseISO } from 'date-fns';

interface CellFeedbackCardProps {
  cellId: string;
}

export const CellFeedbackCard: React.FC<CellFeedbackCardProps> = ({ cellId }) => {
  const { data, currentUser, saveCellFeedback } = useData();

  const cell = data.cells.find(c => c.id === cellId);
  const currentFeedback = data.cellFeedback?.find(f => f.cellId === cellId);

  const [empowermentNeeds, setEmpowermentNeeds] = useState(currentFeedback?.empowermentNeeds || '');
  const [otherPoints, setOtherPoints] = useState(currentFeedback?.otherPoints || '');
  const [isSaving, setIsSaving] = useState(false);
  const [hasSavedRecently, setHasSavedRecently] = useState(false);

  // Sync state when active cell changes or new data arrives from Supabase
  useEffect(() => {
    const feedback = data.cellFeedback?.find(f => f.cellId === cellId);
    setEmpowermentNeeds(feedback?.empowermentNeeds || '');
    setOtherPoints(feedback?.otherPoints || '');
    setHasSavedRecently(false);
  }, [cellId, data.cellFeedback]);

  const hasUnsavedChanges = 
    empowermentNeeds.trim() !== (currentFeedback?.empowermentNeeds || '').trim() ||
    otherPoints.trim() !== (currentFeedback?.otherPoints || '').trim();

  const handleSave = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!cellId) return;

    setIsSaving(true);
    try {
      const updatedBy = currentUser?.role === 'admin' 
        ? 'Admin' 
        : (cell?.leaderName || 'Cell Leader');
      await saveCellFeedback(cellId, empowermentNeeds, otherPoints, updatedBy);
      setHasSavedRecently(true);
      setTimeout(() => setHasSavedRecently(false), 4000);
    } catch (_err) {
      // DataContext handles error notification
    } finally {
      setIsSaving(false);
    }
  };

  const formattedUpdated = currentFeedback?.updatedAt ? (() => {
    try {
      return format(parseISO(currentFeedback.updatedAt), 'dd MMM yyyy, HH:mm');
    } catch {
      return currentFeedback.updatedAt;
    }
  })() : null;

  return (
    <div className="glass-panel" style={{ padding: '1.75rem', marginBottom: '2.5rem', border: '1px solid var(--border)' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem', marginBottom: '1.25rem', borderBottom: '1px solid var(--border)', paddingBottom: '1rem' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '0.35rem' }}>
            <span style={{ 
              backgroundColor: 'rgba(59, 130, 246, 0.12)', 
              color: '#3b82f6', 
              padding: '0.4rem', 
              borderRadius: 'var(--radius-md)', 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'center' 
            }}>
              <Sparkles size={20} />
            </span>
            <h3 style={{ margin: 0, color: 'var(--primary)', fontSize: '1.25rem' }}>
              Cell Empowerment Needs & Leader Feedback
            </h3>
          </div>
          <p className="text-muted" style={{ margin: 0, fontSize: '0.875rem' }}>
            Share what your cell group needs to be strengthened, plus any general feedback, praise reports, or points for church administration.
          </p>
        </div>

        {/* Status indicator */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          {hasUnsavedChanges && (
            <span style={{ 
              display: 'inline-flex', 
              alignItems: 'center', 
              gap: '0.35rem', 
              fontSize: '0.75rem', 
              fontWeight: 600, 
              color: 'var(--warning)', 
              backgroundColor: 'rgba(245, 158, 11, 0.12)', 
              padding: '0.25rem 0.6rem', 
              borderRadius: '999px' 
            }}>
              <AlertCircle size={14} /> Unsaved changes
            </span>
          )}

          {formattedUpdated && (
            <span style={{ 
              display: 'inline-flex', 
              alignItems: 'center', 
              gap: '0.35rem', 
              fontSize: '0.75rem', 
              color: 'var(--text-muted)' 
            }}>
              <Clock size={14} /> Last saved: {formattedUpdated}
            </span>
          )}
        </div>
      </div>

      {/* Free Text Boxes Form */}
      <form onSubmit={handleSave} style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '1.5rem' }}>
          {/* Box 1: Empowerment Needs */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
              <label style={{ fontWeight: '600', fontSize: '0.95rem', color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                <span style={{ color: 'var(--primary)' }}>🌱</span> Empowerment Needs
              </label>
              <span className="text-muted" style={{ fontSize: '0.75rem' }}>
                {empowermentNeeds.length} characters
              </span>
            </div>
            <p className="text-muted" style={{ margin: 0, fontSize: '0.8rem', lineHeight: '1.4' }}>
              What support, resources, training, study material, or leadership assistance does your cell group need?
            </p>
            <textarea
              value={empowermentNeeds}
              onChange={(e) => setEmpowermentNeeds(e.target.value)}
              placeholder="e.g. We need additional discipleship study booklets, leadership mentoring on follow-up, venue assistance, prayer support for 3 new converts..."
              rows={5}
              style={{
                width: '100%',
                padding: '0.85rem',
                borderRadius: 'var(--radius-md)',
                border: '1px solid var(--border)',
                backgroundColor: 'var(--surface)',
                color: 'var(--text-main)',
                fontSize: '0.9rem',
                lineHeight: '1.5',
                resize: 'vertical',
                fontFamily: 'inherit',
                outline: 'none',
                transition: 'border-color 0.2s ease, box-shadow 0.2s ease'
              }}
              onFocus={(e) => e.target.style.borderColor = 'var(--primary)'}
              onBlur={(e) => e.target.style.borderColor = 'var(--border)'}
            />
          </div>

          {/* Box 2: Other Points & Leader Feedback */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
              <label style={{ fontWeight: '600', fontSize: '0.95rem', color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                <MessageSquare size={16} color="var(--primary)" /> Other Points & Leader Feedback
              </label>
              <span className="text-muted" style={{ fontSize: '0.75rem' }}>
                {otherPoints.length} characters
              </span>
            </div>
            <p className="text-muted" style={{ margin: 0, fontSize: '0.8rem', lineHeight: '1.4' }}>
              Any general observations, testimonies, praise reports, challenges, or points for church administration.
            </p>
            <textarea
              value={otherPoints}
              onChange={(e) => setOtherPoints(e.target.value)}
              placeholder="e.g. Great attendance consistency this month! Two members started praying together on Wednesdays. Would love to plan a combined fellowship..."
              rows={5}
              style={{
                width: '100%',
                padding: '0.85rem',
                borderRadius: 'var(--radius-md)',
                border: '1px solid var(--border)',
                backgroundColor: 'var(--surface)',
                color: 'var(--text-main)',
                fontSize: '0.9rem',
                lineHeight: '1.5',
                resize: 'vertical',
                fontFamily: 'inherit',
                outline: 'none',
                transition: 'border-color 0.2s ease, box-shadow 0.2s ease'
              }}
              onFocus={(e) => e.target.style.borderColor = 'var(--primary)'}
              onBlur={(e) => e.target.style.borderColor = 'var(--border)'}
            />
          </div>
        </div>

        {/* Footer Actions */}
        <div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: '1rem', paddingTop: '0.5rem', borderTop: '1px solid var(--border)' }}>
          {hasSavedRecently && (
            <span style={{ 
              display: 'inline-flex', 
              alignItems: 'center', 
              gap: '0.35rem', 
              color: 'var(--success)', 
              fontWeight: 500, 
              fontSize: '0.875rem' 
            }}>
              <CheckCircle2 size={18} /> Saved successfully!
            </span>
          )}
          <button
            type="submit"
            className="btn btn-primary"
            disabled={isSaving || (!hasUnsavedChanges && !hasSavedRecently && Boolean(currentFeedback))}
            style={{
              padding: '0.65rem 1.5rem',
              fontWeight: 600,
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.5rem',
              minWidth: '150px',
              justifyContent: 'center',
              opacity: (isSaving || (!hasUnsavedChanges && Boolean(currentFeedback))) ? 0.75 : 1
            }}
          >
            {isSaving ? (
              'Saving...'
            ) : (
              <>
                <Save size={16} /> Save Needs & Feedback
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
};
