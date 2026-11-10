import React, { useState, useMemo } from 'react';
import { useData } from '../context/DataContext';
import { Sparkles, Download, Search, Clock, Edit3, X, Save } from 'lucide-react';
import { format, parseISO } from 'date-fns';

export const CellFeedbackReport: React.FC = () => {
  const { data, saveCellFeedback } = useData();

  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState<'all' | 'needs' | 'points' | 'pending'>('all');

  // Modal state for admin quick edit / add feedback on behalf of a cell
  const [editingCellId, setEditingCellId] = useState<string | null>(null);
  const [editNeeds, setEditNeeds] = useState('');
  const [editPoints, setEditPoints] = useState('');
  const [isSavingEdit, setIsSavingEdit] = useState(false);

  // Build unified rows joining data.cells with data.cellFeedback
  const rows = useMemo(() => {
    const feedbackMap = new Map((data.cellFeedback || []).map(f => [f.cellId, f]));

    return data.cells.map(cell => {
      const fb = feedbackMap.get(cell.id);
      const empowermentNeeds = fb?.empowermentNeeds || '';
      const otherPoints = fb?.otherPoints || '';
      const updatedAt = fb?.updatedAt || null;
      const updatedBy = fb?.updatedBy || '';
      const hasNeeds = empowermentNeeds.trim().length > 0;
      const hasPoints = otherPoints.trim().length > 0;
      const isPending = !hasNeeds && !hasPoints;

      return {
        cellId: cell.id,
        cellName: cell.name,
        leaderName: cell.leaderName,
        email: cell.email || '',
        empowermentNeeds,
        otherPoints,
        updatedAt,
        updatedBy,
        hasNeeds,
        hasPoints,
        isPending
      };
    });
  }, [data.cells, data.cellFeedback]);

  // Counts
  const totalCells = rows.length;
  const needsCount = rows.filter(r => r.hasNeeds).length;
  const pointsCount = rows.filter(r => r.hasPoints).length;
  const pendingCount = rows.filter(r => r.isPending).length;

  // Filter & Search
  const filteredRows = useMemo(() => {
    return rows.filter(row => {
      // Filter by category
      if (activeFilter === 'needs' && !row.hasNeeds) return false;
      if (activeFilter === 'points' && !row.hasPoints) return false;
      if (activeFilter === 'pending' && !row.isPending) return false;

      // Filter by search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesCell = row.cellName.toLowerCase().includes(q);
        const matchesLeader = row.leaderName.toLowerCase().includes(q);
        const matchesNeeds = row.empowermentNeeds.toLowerCase().includes(q);
        const matchesPoints = row.otherPoints.toLowerCase().includes(q);
        if (!matchesCell && !matchesLeader && !matchesNeeds && !matchesPoints) {
          return false;
        }
      }

      return true;
    });
  }, [rows, activeFilter, searchQuery]);

  // CSV Export
  const exportToCSV = () => {
    const escapeCsv = (val: string) => `"${val.replace(/"/g, '""')}"`;
    let csv = "Cell Name,Leader Name,Email,Empowerment Needs,Other Points & Feedback,Last Updated\n";

    filteredRows.forEach(row => {
      const formattedDate = row.updatedAt ? (() => {
        try {
          return format(parseISO(row.updatedAt), 'yyyy-MM-dd HH:mm');
        } catch {
          return row.updatedAt;
        }
      })() : 'Not submitted';

      csv += `${escapeCsv(row.cellName)},${escapeCsv(row.leaderName)},${escapeCsv(row.email)},${escapeCsv(row.empowermentNeeds)},${escapeCsv(row.otherPoints)},${escapeCsv(formattedDate)}\n`;
    });

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `Cell_Empowerment_Needs_Report_${format(new Date(), 'yyyy-MM-dd')}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleOpenEdit = (row: typeof rows[0]) => {
    setEditingCellId(row.cellId);
    setEditNeeds(row.empowermentNeeds);
    setEditPoints(row.otherPoints);
  };

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingCellId) return;

    setIsSavingEdit(true);
    try {
      await saveCellFeedback(editingCellId, editNeeds, editPoints, 'Admin');
      setEditingCellId(null);
    } catch (_err) {
      // Handled in DataContext
    } finally {
      setIsSavingEdit(false);
    }
  };

  return (
    <div className="glass-panel" style={{ padding: '1.75rem', marginBottom: '2.5rem' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem', marginBottom: '1.5rem' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '0.35rem' }}>
            <span style={{ 
              backgroundColor: 'rgba(59, 130, 246, 0.12)', 
              color: '#3b82f6', 
              padding: '0.45rem', 
              borderRadius: 'var(--radius-md)', 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'center' 
            }}>
              <Sparkles size={22} />
            </span>
            <h3 style={{ margin: 0, color: 'var(--primary)', fontSize: '1.35rem' }}>
              Cell Empowerment Needs & Leader Feedback Report
            </h3>
          </div>
          <p className="text-muted" style={{ margin: 0, fontSize: '0.875rem' }}>
            Dynamic consolidated table showing all cell needs and points submitted by cell leaders across the church.
          </p>
        </div>

        <button 
          className="btn btn-outline" 
          onClick={exportToCSV}
          style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', fontWeight: '500' }}
        >
          <Download size={16} /> Export Report (CSV)
        </button>
      </div>

      {/* Summary KPI Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '1rem', marginBottom: '1.5rem' }}>
        <div style={{ background: 'var(--surface)', padding: '1rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border)' }}>
          <p className="text-muted" style={{ fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em', margin: 0 }}>Total Cells</p>
          <h3 style={{ fontSize: '1.75rem', margin: '0.25rem 0 0', color: 'var(--text-main)' }}>{totalCells}</h3>
        </div>

        <div style={{ background: 'var(--surface)', padding: '1rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border)' }}>
          <p className="text-muted" style={{ fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em', margin: 0 }}>With Needs Reported</p>
          <h3 style={{ fontSize: '1.75rem', margin: '0.25rem 0 0', color: '#10b981' }}>{needsCount}</h3>
        </div>

        <div style={{ background: 'var(--surface)', padding: '1rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border)' }}>
          <p className="text-muted" style={{ fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em', margin: 0 }}>With Other Points</p>
          <h3 style={{ fontSize: '1.75rem', margin: '0.25rem 0 0', color: '#3b82f6' }}>{pointsCount}</h3>
        </div>

        <div style={{ background: 'var(--surface)', padding: '1rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border)' }}>
          <p className="text-muted" style={{ fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em', margin: 0 }}>Awaiting Feedback</p>
          <h3 style={{ fontSize: '1.75rem', margin: '0.25rem 0 0', color: 'var(--text-muted)' }}>{pendingCount}</h3>
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem', marginBottom: '1.25rem' }}>
        {/* Category Pills */}
        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
          <button
            className="btn"
            onClick={() => setActiveFilter('all')}
            style={{
              padding: '0.4rem 0.85rem',
              fontSize: '0.85rem',
              fontWeight: 500,
              backgroundColor: activeFilter === 'all' ? 'var(--primary)' : 'var(--surface)',
              color: activeFilter === 'all' ? 'white' : 'var(--text-main)',
              border: '1px solid var(--border)'
            }}
          >
            All Cells ({totalCells})
          </button>
          <button
            className="btn"
            onClick={() => setActiveFilter('needs')}
            style={{
              padding: '0.4rem 0.85rem',
              fontSize: '0.85rem',
              fontWeight: 500,
              backgroundColor: activeFilter === 'needs' ? '#10b981' : 'var(--surface)',
              color: activeFilter === 'needs' ? 'white' : 'var(--text-main)',
              border: '1px solid var(--border)'
            }}
          >
            🌱 Has Needs ({needsCount})
          </button>
          <button
            className="btn"
            onClick={() => setActiveFilter('points')}
            style={{
              padding: '0.4rem 0.85rem',
              fontSize: '0.85rem',
              fontWeight: 500,
              backgroundColor: activeFilter === 'points' ? '#3b82f6' : 'var(--surface)',
              color: activeFilter === 'points' ? 'white' : 'var(--text-main)',
              border: '1px solid var(--border)'
            }}
          >
            💬 Has Other Points ({pointsCount})
          </button>
          <button
            className="btn"
            onClick={() => setActiveFilter('pending')}
            style={{
              padding: '0.4rem 0.85rem',
              fontSize: '0.85rem',
              fontWeight: 500,
              backgroundColor: activeFilter === 'pending' ? 'var(--text-muted)' : 'var(--surface)',
              color: activeFilter === 'pending' ? 'white' : 'var(--text-main)',
              border: '1px solid var(--border)'
            }}
          >
            ⏳ Awaiting Feedback ({pendingCount})
          </button>
        </div>

        {/* Search input */}
        <div style={{ position: 'relative', minWidth: '260px', flex: '1', maxWidth: '350px' }}>
          <Search size={16} style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by cell, leader, or keyword..."
            style={{
              width: '100%',
              padding: '0.45rem 0.75rem 0.45rem 2.25rem',
              borderRadius: 'var(--radius-md)',
              border: '1px solid var(--border)',
              backgroundColor: 'var(--surface)',
              fontSize: '0.85rem'
            }}
          />
        </div>
      </div>

      {/* Dynamic Report Table */}
      <div style={{ overflowX: 'auto', background: 'var(--surface)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border)' }}>
        <table className="data-grid" style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
          <thead>
            <tr style={{ borderBottom: '2px solid var(--border)' }}>
              <th style={{ padding: '0.85rem 1rem', width: '22%' }}>Cell & Leader</th>
              <th style={{ padding: '0.85rem 1rem', width: '32%' }}>🌱 Empowerment Needs</th>
              <th style={{ padding: '0.85rem 1rem', width: '28%' }}>💬 Other Points & Feedback</th>
              <th style={{ padding: '0.85rem 1rem', width: '18%' }}>Last Updated</th>
            </tr>
          </thead>
          <tbody>
            {filteredRows.length === 0 ? (
              <tr>
                <td colSpan={4} style={{ textAlign: 'center', padding: '2.5rem', color: 'var(--text-muted)' }}>
                  No cell feedback found matching the selected filter or search query.
                </td>
              </tr>
            ) : (
              filteredRows.map(row => {
                const formattedDate = row.updatedAt ? (() => {
                  try {
                    return format(parseISO(row.updatedAt), 'dd MMM yyyy, HH:mm');
                  } catch {
                    return row.updatedAt;
                  }
                })() : null;

                return (
                  <tr key={row.cellId} style={{ borderBottom: '1px solid var(--border)', verticalAlign: 'top' }}>
                    {/* Cell & Leader */}
                    <td style={{ padding: '1rem' }}>
                      <div style={{ fontWeight: '600', fontSize: '0.95rem', color: 'var(--primary)' }}>
                        {row.cellName}
                      </div>
                      <div style={{ fontSize: '0.825rem', color: 'var(--text-main)', marginTop: '0.15rem' }}>
                        Leader: <strong>{row.leaderName}</strong>
                      </div>
                      {row.email && (
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                          {row.email}
                        </div>
                      )}
                      <div style={{ marginTop: '0.5rem' }}>
                        <button
                          onClick={() => handleOpenEdit(row)}
                          className="btn btn-outline"
                          style={{
                            padding: '0.2rem 0.5rem',
                            fontSize: '0.75rem',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '0.3rem'
                          }}
                        >
                          <Edit3 size={12} /> Edit / Respond
                        </button>
                      </div>
                    </td>

                    {/* Empowerment Needs */}
                    <td style={{ padding: '1rem' }}>
                      {row.hasNeeds ? (
                        <div style={{
                          backgroundColor: 'rgba(16, 185, 129, 0.06)',
                          borderLeft: '3px solid #10b981',
                          padding: '0.75rem 0.9rem',
                          borderRadius: 'var(--radius-sm)',
                          fontSize: '0.875rem',
                          lineHeight: '1.5',
                          whiteSpace: 'pre-wrap',
                          color: 'var(--text-main)'
                        }}>
                          {row.empowermentNeeds}
                        </div>
                      ) : (
                        <span style={{ 
                          display: 'inline-block',
                          fontSize: '0.8rem', 
                          color: 'var(--text-muted)', 
                          fontStyle: 'italic',
                          backgroundColor: 'var(--bg-color)',
                          padding: '0.35rem 0.65rem',
                          borderRadius: 'var(--radius-sm)'
                        }}>
                          None reported
                        </span>
                      )}
                    </td>

                    {/* Other Points & Feedback */}
                    <td style={{ padding: '1rem' }}>
                      {row.hasPoints ? (
                        <div style={{
                          backgroundColor: 'rgba(59, 130, 246, 0.06)',
                          borderLeft: '3px solid #3b82f6',
                          padding: '0.75rem 0.9rem',
                          borderRadius: 'var(--radius-sm)',
                          fontSize: '0.875rem',
                          lineHeight: '1.5',
                          whiteSpace: 'pre-wrap',
                          color: 'var(--text-main)'
                        }}>
                          {row.otherPoints}
                        </div>
                      ) : (
                        <span style={{ 
                          display: 'inline-block',
                          fontSize: '0.8rem', 
                          color: 'var(--text-muted)', 
                          fontStyle: 'italic',
                          backgroundColor: 'var(--bg-color)',
                          padding: '0.35rem 0.65rem',
                          borderRadius: 'var(--radius-sm)'
                        }}>
                          None reported
                        </span>
                      )}
                    </td>

                    {/* Last Updated & Status */}
                    <td style={{ padding: '1rem', whiteSpace: 'nowrap' }}>
                      {formattedDate ? (
                        <div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.825rem', color: 'var(--text-main)', fontWeight: 500 }}>
                            <Clock size={14} color="var(--primary)" /> {formattedDate}
                          </div>
                          {row.updatedBy && (
                            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.15rem' }}>
                              by {row.updatedBy}
                            </div>
                          )}
                          <div style={{ marginTop: '0.5rem' }}>
                            {row.hasNeeds ? (
                              <span style={{
                                backgroundColor: 'rgba(16, 185, 129, 0.15)',
                                color: '#10b981',
                                fontSize: '0.7rem',
                                fontWeight: 600,
                                padding: '0.2rem 0.5rem',
                                borderRadius: '999px'
                              }}>
                                Needs Active
                              </span>
                            ) : (
                              <span style={{
                                backgroundColor: 'rgba(59, 130, 246, 0.15)',
                                color: '#3b82f6',
                                fontSize: '0.7rem',
                                fontWeight: 600,
                                padding: '0.2rem 0.5rem',
                                borderRadius: '999px'
                              }}>
                                Feedback Shared
                              </span>
                            )}
                          </div>
                        </div>
                      ) : (
                        <span style={{
                          backgroundColor: 'var(--bg-color)',
                          color: 'var(--text-muted)',
                          fontSize: '0.75rem',
                          fontWeight: 500,
                          padding: '0.25rem 0.6rem',
                          borderRadius: '999px'
                        }}>
                          Awaiting Feedback
                        </span>
                      )}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Admin Quick Edit Modal */}
      {editingCellId && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0,0,0,0.5)',
          zIndex: 9999,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '1rem'
        }}>
          <div className="glass-panel" style={{
            backgroundColor: 'var(--surface)',
            padding: '1.75rem',
            borderRadius: 'var(--radius-lg)',
            width: '100%',
            maxWidth: '600px',
            boxShadow: 'var(--shadow-xl)',
            position: 'relative'
          }}>
            <button
              onClick={() => setEditingCellId(null)}
              style={{ position: 'absolute', top: '1.25rem', right: '1.25rem', background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}
            >
              <X size={20} />
            </button>

            <h3 style={{ margin: 0, marginBottom: '0.25rem', color: 'var(--primary)' }}>
              Edit Needs & Feedback
            </h3>
            <p className="text-muted" style={{ margin: 0, marginBottom: '1.25rem', fontSize: '0.85rem' }}>
              Updating feedback for <strong>{rows.find(r => r.cellId === editingCellId)?.cellName}</strong>
            </p>

            <form onSubmit={handleSaveEdit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div>
                <label style={{ display: 'block', marginBottom: '0.4rem', fontWeight: 600, fontSize: '0.85rem' }}>
                  🌱 Empowerment Needs
                </label>
                <textarea
                  value={editNeeds}
                  onChange={(e) => setEditNeeds(e.target.value)}
                  rows={4}
                  style={{
                    width: '100%',
                    padding: '0.75rem',
                    borderRadius: 'var(--radius-md)',
                    border: '1px solid var(--border)',
                    fontSize: '0.875rem'
                  }}
                />
              </div>

              <div>
                <label style={{ display: 'block', marginBottom: '0.4rem', fontWeight: 600, fontSize: '0.85rem' }}>
                  💬 Other Points & Feedback
                </label>
                <textarea
                  value={editPoints}
                  onChange={(e) => setEditPoints(e.target.value)}
                  rows={4}
                  style={{
                    width: '100%',
                    padding: '0.75rem',
                    borderRadius: 'var(--radius-md)',
                    border: '1px solid var(--border)',
                    fontSize: '0.875rem'
                  }}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '0.5rem' }}>
                <button
                  type="button"
                  className="btn btn-outline"
                  onClick={() => setEditingCellId(null)}
                  disabled={isSavingEdit}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={isSavingEdit}
                  style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem' }}
                >
                  <Save size={16} /> {isSavingEdit ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
