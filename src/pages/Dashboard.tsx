import React, { useRef, useState, useMemo } from 'react';
import { useData } from '../context/DataContext';
import { Users, Cross, Activity, UserPlus, Download, Image as ImageIcon, Calendar, Filter } from 'lucide-react';
import html2canvas from 'html2canvas';
import { parseISO, startOfWeek, startOfMonth, startOfYear, isAfter, isBefore, endOfDay } from 'date-fns';
import WordCloud from '../components/WordCloud';

const defaultQuestions = [
  "Number of members who maintained a consistent prayer routine during the week - prayed at least 5 days this week.",
  "What prayer component or type did the cell practise and demonstrated growth in this week?",
  "What common barriers in prayer are affecting the cell members.",
  "Testimonies & Breakthroughs - themes"
];

const Dashboard = () => {
  const { data, currentUser, activeCellId } = useData();
  const tableRef = useRef(null);

  const isAdmin = currentUser?.role === 'admin';
  // Admin can select "All Cells" (activeCellId = "") or a specific cell. Leader is forced to activeCellId.
  const targetCellId = activeCellId || null;
  const targetCell = targetCellId ? data.cells.find(c => c.id === targetCellId) : null;

  // Time Filter State
  const [timeFilter, setTimeFilter] = useState('all');
  const [customStart, setCustomStart] = useState('');
  const [customEnd, setCustomEnd] = useState('');

  // Question Filter State (only for Cell Dashboard)
  const [selectedQuestion, setSelectedQuestion] = useState('all');

  // Filter Data
  const { filteredMeetings, filteredReports, filteredRoster } = useMemo(() => {
    let meetings = data.meetings;
    let reports = data.weeklyReports;
    let roster = data.roster;

    // Filter by Cell
    if (targetCellId) {
      meetings = meetings.filter(m => m.cellId === targetCellId);
      reports = reports.filter(r => r.cellId === targetCellId);
      roster = roster.filter(r => r.cellId === targetCellId);
    }

    // Filter by Time
    if (timeFilter !== 'all') {
      const now = new Date();
      let start = now;
      let end = now;
      
      if (timeFilter === 'week') start = startOfWeek(now, { weekStartsOn: 1 });
      else if (timeFilter === 'month') start = startOfMonth(now);
      else if (timeFilter === 'year') start = startOfYear(now);
      else if (timeFilter === 'custom') {
        start = customStart ? new Date(customStart) : new Date(0);
        end = customEnd ? endOfDay(new Date(customEnd)) : now;
      }

      meetings = meetings.filter(m => {
        const d = parseISO(m.date);
        return (isAfter(d, start) || d.getTime() === start.getTime()) && (timeFilter === 'custom' ? (isBefore(d, end) || d.getTime() === end.getTime()) : true);
      });

      reports = reports.filter(r => {
        const d = parseISO(r.date);
        return (isAfter(d, start) || d.getTime() === start.getTime()) && (timeFilter === 'custom' ? (isBefore(d, end) || d.getTime() === end.getTime()) : true);
      });
    }

    return { filteredMeetings: meetings, filteredReports: reports, filteredRoster: roster };
  }, [data, targetCellId, timeFilter, customStart, customEnd]);

  // Calculate KPIs
  const totalMembers = filteredRoster.filter(m => m.type === 'M').length;
  const totalVisitors = filteredRoster.filter(m => m.type === 'V').length;
  
  const totalMeetings = filteredMeetings.length;
  const totalAttendance = filteredMeetings.reduce((sum, m) => sum + (m.attendees || []).length, 0);
  const avgAttendance = totalMeetings > 0 ? (totalAttendance / totalMeetings).toFixed(1) : '0';
  
  const totalSalvations = filteredMeetings.reduce((sum, m) => sum + Number(m.salvations || 0), 0);

  // Determine which questions to show in dropdown
  const questionsList = useMemo(() => {
    if (targetCellId && targetCell) {
      return targetCell.custom_questions || defaultQuestions;
    } else {
      const allQs = new Set<string>();
      defaultQuestions.forEach(q => allQs.add(q));
      data.cells.forEach(c => {
        if (c.custom_questions) {
          c.custom_questions.forEach(q => allQs.add(q));
        }
      });
      return Array.from(allQs);
    }
  }, [targetCellId, targetCell, data.cells]);

  // Extract Word Cloud Texts
  const { wordCloudTexts, stopWords } = useMemo(() => {
    let texts: string[] = [];
    let customStops = new Set<string>();

    filteredReports.forEach(report => {
      // If a specific question is selected, only extract that answer
      if (selectedQuestion !== 'all') {
        if (report.custom_responses && report.custom_responses[selectedQuestion]) {
          texts.push(report.custom_responses[selectedQuestion]);
        } else {
          // Fallback for legacy fields if they match standard questions
          if (selectedQuestion === defaultQuestions[1] && report.q2) texts.push(report.q2);
          if (selectedQuestion === defaultQuestions[2] && report.q3) texts.push(report.q3);
          if (selectedQuestion === defaultQuestions[3] && report.q4) texts.push(report.q4);
        }
      } 
      // Aggregate all responses
      else {
        if (report.custom_responses && Object.keys(report.custom_responses).length > 0) {
          texts.push(...Object.values(report.custom_responses));
        } else {
          texts.push(report.q2 || '', report.q3 || '', report.q4 || '');
        }
      }
    });

    if (targetCell) {
      (targetCell.custom_stop_words || []).forEach(w => customStops.add(w));
    } else if (isAdmin) {
      data.cells.forEach(c => (c.custom_stop_words || []).forEach(w => customStops.add(w)));
    }

    return { wordCloudTexts: texts, stopWords: Array.from(customStops) };
  }, [filteredReports, targetCell, isAdmin, data.cells, targetCellId, selectedQuestion]);

  const exportToPNG = async () => {
    if (tableRef.current) {
      const canvas = await html2canvas(tableRef.current, { backgroundColor: '#ffffff' });
      const image = canvas.toDataURL('image/png');
      const link = document.createElement('a');
      link.href = image;
      link.download = 'dashboard-stats.png';
      link.click();
    }
  };

  const exportToCSV = () => {
    let csvContent = "Cell Name,Cell Leader,Meetings Held,Avg Attendance,Total Salvations\n";
    data.cells.forEach(cell => {
      const cellMeetings = filteredMeetings.filter(m => m.cellId === cell.id);
      const cellAttendances = cellMeetings.reduce((sum, m) => sum + (m.attendees || []).length, 0);
      const cellAvg = cellMeetings.length > 0 ? (cellAttendances / cellMeetings.length).toFixed(1) : '0';
      const cellSalvations = cellMeetings.reduce((sum, m) => sum + Number(m.salvations || 0), 0);
      csvContent += `${cell.name},${cell.leaderName},${cellMeetings.length},${cellAvg},${cellSalvations}\n`;
    });
    
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', 'dashboard-stats.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="dashboard" style={{ animation: 'var(--transition)' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem', marginBottom: '2rem' }}>
        <div>
          <h1 style={{ fontSize: '2rem', marginBottom: '0.5rem', color: 'var(--primary)' }}>
            {!targetCellId ? 'Global Dashboard' : `${targetCell?.name} Dashboard`}
          </h1>
          <p className="text-muted">
            {!targetCellId ? 'Overview of all cell groups across the system.' : 'Your cell group performance overview.'}
          </p>
        </div>
        
        <div className="glass-panel" style={{ padding: '0.5rem 1rem', display: 'flex', gap: '1rem', alignItems: 'center' }}>
          <Calendar size={18} color="var(--primary)" />
          <select 
            value={timeFilter} 
            onChange={(e) => setTimeFilter(e.target.value)}
            style={{ border: 'none', background: 'transparent', outline: 'none', fontWeight: '500', color: 'var(--text-main)', cursor: 'pointer' }}
          >
            <option value="all">All Time</option>
            <option value="week">This Week</option>
            <option value="month">This Month</option>
            <option value="year">This Year</option>
            <option value="custom">Custom Range</option>
          </select>
          
          {timeFilter === 'custom' && (
            <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', borderLeft: '1px solid var(--border)', paddingLeft: '1rem' }}>
              <input type="date" value={customStart} onChange={e => setCustomStart(e.target.value)} style={{ padding: '0.25rem', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)' }} />
              <span className="text-muted">to</span>
              <input type="date" value={customEnd} onChange={e => setCustomEnd(e.target.value)} style={{ padding: '0.25rem', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)' }} />
            </div>
          )}
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1.5rem', marginBottom: '2.5rem' }}>
        <StatCard icon={<Activity />} title="Avg Weekly Attendance" value={avgAttendance} color="var(--primary)" />
        <StatCard icon={<Users />} title={!targetCellId ? "Total Active Members" : "Active Members"} value={totalMembers} color="var(--secondary)" />
        <StatCard icon={<UserPlus />} title={!targetCellId ? "Total New Visitors" : "New Visitors"} value={totalVisitors} color="var(--warning)" />
        <StatCard icon={<Cross />} title="Total Salvations" value={totalSalvations} color="var(--danger)" />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '2rem', marginBottom: '2.5rem' }}>
        <div className="glass-panel" style={{ padding: '1.5rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem', marginBottom: '1.5rem' }}>
            <div>
              <h3 style={{ margin: 0, color: 'var(--primary)' }}>Report Keyword Cloud</h3>
              <p className="text-muted" style={{ margin: 0, marginTop: '0.25rem', fontSize: '0.875rem' }}>
                Most frequently used words in the weekly reports for the selected time period.
              </p>
            </div>
            
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', background: 'var(--bg-color)', padding: '0.5rem', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)' }}>
              <Filter size={16} color="var(--primary)" />
              <select 
                value={selectedQuestion} 
                onChange={(e) => setSelectedQuestion(e.target.value)}
                style={{ border: 'none', background: 'transparent', outline: 'none', fontSize: '0.875rem', color: 'var(--text-main)', cursor: 'pointer', maxWidth: '300px' }}
              >
                <option value="all">All Questions (Aggregated)</option>
                {questionsList.map((q, idx) => (
                  <option key={idx} value={q}>Question: {q.length > 50 ? q.substring(0, 50) + '...' : q}</option>
                ))}
              </select>
            </div>
          </div>
          
          <WordCloud texts={wordCloudTexts} customStopWords={stopWords} />
        </div>
      </div>

      {!targetCellId && (
        <div className="glass-panel" style={{ padding: '1.5rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
            <h3 style={{ margin: 0, color: 'var(--primary)' }}>Cell Performance Breakdown</h3>
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <button className="btn btn-outline" onClick={exportToCSV} style={{ padding: '0.5rem', fontSize: '0.75rem' }}>
                <Download size={16} /> CSV
              </button>
              <button className="btn btn-outline" onClick={exportToPNG} style={{ padding: '0.5rem', fontSize: '0.75rem' }}>
                <ImageIcon size={16} /> PNG
              </button>
            </div>
          </div>
          
          <div ref={tableRef} style={{ padding: '1rem', background: 'var(--surface)', borderRadius: 'var(--radius-md)' }}>
            <table className="data-grid">
              <thead>
                <tr>
                  <th>Cell Name</th>
                  <th>Cell Leader</th>
                  <th>Meetings Held</th>
                  <th>Avg Attendance</th>
                  <th>Total Salvations</th>
                </tr>
              </thead>
              <tbody>
                {data.cells.map(cell => {
                  const cellMeetings = filteredMeetings.filter(m => m.cellId === cell.id);
                  const cellAttendances = cellMeetings.reduce((sum, m) => sum + (m.attendees || []).length, 0);
                  const cellAvg = cellMeetings.length > 0 ? (cellAttendances / cellMeetings.length).toFixed(1) : '0';
                  const cellSalvations = cellMeetings.reduce((sum, m) => sum + Number(m.salvations || 0), 0);
                  
                  return (
                    <tr key={cell.id}>
                      <td style={{ fontWeight: '500' }}>{cell.name}</td>
                      <td>{cell.leaderName}</td>
                      <td>{cellMeetings.length}</td>
                      <td>{cellAvg}</td>
                      <td>{cellSalvations}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};

const StatCard = ({ icon, title, value, color }: { icon: React.ReactNode, title: string, value: string | number, color: string }) => (
  <div className="glass-panel" style={{ padding: '1.5rem', display: 'flex', alignItems: 'center', gap: '1.5rem' }}>
    <div style={{ 
      backgroundColor: `${color}15`, 
      color: color, 
      width: '3rem', height: '3rem', 
      borderRadius: 'var(--radius-lg)', 
      display: 'flex', alignItems: 'center', justifyContent: 'center' 
    }}>
      {icon}
    </div>
    <div>
      <p className="text-muted" style={{ fontSize: '0.875rem', fontWeight: '500', marginBottom: '0.25rem' }}>{title}</p>
      <h2 style={{ fontSize: '1.75rem', margin: 0, color: 'var(--text-main)' }}>{value}</h2>
    </div>
  </div>
);

export default Dashboard;
