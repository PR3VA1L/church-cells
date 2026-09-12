import React, { useRef, useState, useMemo } from 'react';
import { useData } from '../context/DataContext';
import { Users, Cross, Activity, UserPlus, Download, Image as ImageIcon, Calendar, Target, Settings, X } from 'lucide-react';
import html2canvas from 'html2canvas';
import { parseISO, startOfWeek, startOfMonth, startOfYear, isAfter, isBefore, endOfDay, format } from 'date-fns';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

const Dashboard = () => {
  const { data, currentUser, activeCellId, updateCellPassword, updateCellEmail } = useData();
  const dashboardRef = useRef(null);

  const isAdmin = currentUser?.role === 'admin';
  const targetCellId = activeCellId || null;
  const targetCell = targetCellId ? data.cells.find(c => c.id === targetCellId) : null;

  // Settings State
  const [showSettings, setShowSettings] = useState(false);
  const [newEmail, setNewEmail] = useState(targetCell?.email || '');
  const [newPassword, setNewPassword] = useState('');

  // Time Filter State
  const [timeFilter, setTimeFilter] = useState('all');
  const [customStart, setCustomStart] = useState('');
  const [customEnd, setCustomEnd] = useState('');

  // Filter Data
  const { filteredMeetings, filteredAssessments, filteredRoster } = useMemo(() => {
    let meetings = data.meetings;
    let assessments = data.assessments;
    let roster = data.roster;

    // Filter by Cell
    if (targetCellId) {
      meetings = meetings.filter(m => m.cellId === targetCellId);
      assessments = assessments.filter(r => r.cellId === targetCellId);
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

      assessments = assessments.filter(a => {
        const d = parseISO(a.date);
        return (isAfter(d, start) || d.getTime() === start.getTime()) && (timeFilter === 'custom' ? (isBefore(d, end) || d.getTime() === end.getTime()) : true);
      });
    }

    return { filteredMeetings: meetings, filteredAssessments: assessments, filteredRoster: roster };
  }, [data, targetCellId, timeFilter, customStart, customEnd]);

  // Calculate KPIs
  const totalMembers = filteredRoster.filter(m => m.type === 'M').length;
  const totalVisitors = filteredRoster.filter(m => m.type === 'V').length;
  
  const totalMeetings = filteredMeetings.length;
  const totalAttendance = filteredMeetings.reduce((sum, m) => sum + (m.attendees || []).length, 0);
  const avgAttendance = totalMeetings > 0 ? (totalAttendance / totalMeetings).toFixed(1) : '0';
  
  const totalSalvations = filteredMeetings.reduce((sum, m) => sum + Number(m.salvations || 0), 0);

  // Calculate Assessment Averages
  const assessmentStats = useMemo(() => {
    const stats: Record<number, Record<number, { sum: number, count: number }>> = {};
    let totalSum = 0;
    let totalCount = 0;
    
    data.pillarQuestions.forEach((pillar, pIdx) => {
      stats[pIdx] = {};
      pillar.questions.forEach((_, qIdx) => {
        stats[pIdx][qIdx] = { sum: 0, count: 0 };
      });
    });

    filteredAssessments.forEach(assessment => {
      Object.entries(assessment.scores).forEach(([pIdxStr, questions]) => {
        const pIdx = parseInt(pIdxStr);
        Object.entries(questions).forEach(([qIdxStr, score]) => {
          const qIdx = parseInt(qIdxStr);
          if (score > 0 && stats[pIdx] && stats[pIdx][qIdx]) {
            stats[pIdx][qIdx].sum += score;
            stats[pIdx][qIdx].count += 1;
            totalSum += score;
            totalCount += 1;
          }
        });
      });
    });

    const overallAvg = totalCount > 0 ? (totalSum / totalCount).toFixed(1) : '0.0';
    return { stats, overallAvg };
  }, [filteredAssessments, data.pillarQuestions]);

  const trendData = useMemo(() => {
    const byDate: Record<string, any> = {};
    
    filteredAssessments.forEach(a => {
      if (!byDate[a.date]) {
        byDate[a.date] = { date: a.date, sum: [0, 0, 0, 0], count: [0, 0, 0, 0] };
      }
      
      data.pillarQuestions.forEach((pillar, pIdx) => {
        let pSum = 0;
        let pCount = 0;
        Object.entries(a.scores[pIdx] || {}).forEach(([_, score]) => {
          if (score > 0) {
            pSum += score;
            pCount++;
          }
        });
        byDate[a.date].sum[pIdx] += pSum;
        byDate[a.date].count[pIdx] += pCount;
      });
    });

    const formatted = Object.values(byDate).map(d => {
      const item: any = { name: format(parseISO(d.date), 'MMM dd') };
      data.pillarQuestions.forEach((p, pIdx) => {
        item[p.pillar] = d.count[pIdx] > 0 ? Number((d.sum[pIdx] / d.count[pIdx]).toFixed(1)) : null;
      });
      const totalSum = d.sum.reduce((a: number, b: number) => a + b, 0);
      const totalCount = d.count.reduce((a: number, b: number) => a + b, 0);
      item['Overall'] = totalCount > 0 ? Number((totalSum / totalCount).toFixed(1)) : null;
      item._rawDate = d.date;
      return item;
    });

    return formatted.sort((a, b) => new Date(a._rawDate).getTime() - new Date(b._rawDate).getTime());
  }, [filteredAssessments, data.pillarQuestions]);


  const exportToPNG = async () => {
    if (dashboardRef.current) {
      const canvas = await html2canvas(dashboardRef.current, { backgroundColor: '#ffffff' });
      const image = canvas.toDataURL('image/png');
      const link = document.createElement('a');
      link.href = image;
      link.download = 'dashboard-stats.png';
      link.click();
    }
  };

  const handleUpdateEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!targetCellId) return;
    try {
      await updateCellEmail(targetCellId, newEmail);
      alert('Email updated successfully!');
    } catch (err: any) {
      alert('Failed to update email: ' + err.message);
    }
  };

  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!targetCellId) return;
    try {
      await updateCellPassword(targetCellId, newPassword);
      setNewPassword('');
      alert('Password updated successfully!');
    } catch (err: any) {
      alert('Failed to update password: ' + err.message);
    }
  };

  const exportToCSV = () => {
    let csvContent = "Cell Name,Cell Leader,Meetings Held,Avg Attendance,Total Salvations,New Visitors\n";
    data.cells.forEach(cell => {
      const cellMeetings = filteredMeetings.filter(m => m.cellId === cell.id);
      const cellAttendances = cellMeetings.reduce((sum, m) => sum + (m.attendees || []).length, 0);
      const cellAvg = cellMeetings.length > 0 ? (cellAttendances / cellMeetings.length).toFixed(1) : '0';
      const cellSalvations = cellMeetings.reduce((sum, m) => sum + Number(m.salvations || 0), 0);
      const cellVisitors = filteredRoster.filter(m => m.cellId === cell.id && m.type === 'V').length;
      csvContent += `${cell.name},${cell.leaderName},${cellMeetings.length},${cellAvg},${cellSalvations},${cellVisitors}\n`;
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
    <div ref={dashboardRef} className="dashboard" style={{ animation: 'var(--transition)' }}>
      <div data-html2canvas-ignore style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '1rem', gap: '0.5rem' }}>
        <button className="btn btn-outline" onClick={exportToCSV}>
          <Download size={16} /> Export CSV
        </button>
        <button className="btn btn-outline" onClick={exportToPNG}>
          <ImageIcon size={16} /> Export PNG
        </button>
        {!isAdmin && targetCellId && (
          <button className="btn btn-primary" onClick={() => setShowSettings(!showSettings)}>
            <Settings size={16} /> Settings
          </button>
        )}
      </div>

      {showSettings && (
        <div data-html2canvas-ignore className="glass-panel" style={{ padding: '1.5rem', marginBottom: '2rem', position: 'relative' }}>
          <button onClick={() => setShowSettings(false)} style={{ position: 'absolute', top: '1rem', right: '1rem', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}>
            <X size={20} />
          </button>
          <h3 style={{ marginTop: 0, color: 'var(--primary)', marginBottom: '1.5rem' }}>Cell Leader Settings</h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '2rem' }}>
            <form onSubmit={handleUpdateEmail} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem', fontWeight: '500' }}>Registered Email</label>
                <input type="email" value={newEmail} onChange={e => setNewEmail(e.target.value)} required />
              </div>
              <button type="submit" className="btn btn-primary">Update Email</button>
            </form>
            <form onSubmit={handleUpdatePassword} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem', fontWeight: '500' }}>Change Password</label>
                <input type="password" value={newPassword} onChange={e => setNewPassword(e.target.value)} required minLength={4} placeholder="Enter new password" />
              </div>
              <button type="submit" className="btn btn-primary">Update Password</button>
            </form>
          </div>
        </div>
      )}

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
        <StatCard icon={<Cross />} title={!targetCellId ? "Total Salvations" : "Salvations"} value={totalSalvations} color="#3b82f6" />
        <StatCard icon={<Target />} title="Overall Pillar Average" value={`${assessmentStats.overallAvg} / 5`} color="#10b981" />
      </div>

      {trendData.length > 0 && (
        <div className="glass-panel" style={{ padding: '1.5rem', marginBottom: '2.5rem' }}>
          <div style={{ marginBottom: '1.5rem' }}>
            <h3 style={{ margin: 0, color: 'var(--primary)' }}>Overall Pillar Trend</h3>
            <p className="text-muted" style={{ margin: 0, marginTop: '0.25rem', fontSize: '0.875rem' }}>
              Spiritual growth across the 4 pillars over time.
            </p>
          </div>
          <div style={{ height: '350px', width: '100%' }}>
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={trendData} margin={{ top: 5, right: 20, left: -20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                <XAxis dataKey="name" stroke="var(--text-muted)" fontSize={12} tickLine={false} axisLine={false} dy={10} />
                <YAxis domain={[0, 5]} stroke="var(--text-muted)" fontSize={12} tickLine={false} axisLine={false} dx={-10} />
                <Tooltip 
                  contentStyle={{ backgroundColor: 'var(--surface)', borderColor: 'var(--border)', borderRadius: 'var(--radius-md)', color: 'var(--text-main)' }}
                  itemStyle={{ color: 'var(--text-main)', fontWeight: 500 }}
                />
                <Legend iconType="circle" wrapperStyle={{ paddingTop: '20px' }} />
                <Line type="monotone" dataKey="Overall" stroke="#10b981" strokeWidth={3} dot={{ r: 4, fill: '#10b981', strokeWidth: 2 }} activeDot={{ r: 6 }} />
                <Line type="monotone" dataKey="PRAYER" stroke="#3b82f6" strokeWidth={2} dot={false} activeDot={{ r: 4 }} opacity={0.6} />
                <Line type="monotone" dataKey="THE WORD" stroke="#8b5cf6" strokeWidth={2} dot={false} activeDot={{ r: 4 }} opacity={0.6} />
                <Line type="monotone" dataKey="EVANGELISM" stroke="#f59e0b" strokeWidth={2} dot={false} activeDot={{ r: 4 }} opacity={0.6} />
                <Line type="monotone" dataKey="SERVICE" stroke="#ef4444" strokeWidth={2} dot={false} activeDot={{ r: 4 }} opacity={0.6} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '2rem', marginBottom: '2.5rem' }}>
        <div className="glass-panel" style={{ padding: '1.5rem' }}>
          <div style={{ marginBottom: '1.5rem' }}>
            <h3 style={{ margin: 0, color: 'var(--primary)' }}>4-Pillars Growth Analysis</h3>
            <p className="text-muted" style={{ margin: 0, marginTop: '0.25rem', fontSize: '0.875rem' }}>
              Average ratings (1-5) for each pillar and question during the selected time period.
            </p>
          </div>
          
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(350px, 1fr))', gap: '2rem' }}>
            {data.pillarQuestions.map((pillar, pIdx) => {
              let pSum = 0;
              let pCount = 0;
              pillar.questions.forEach((_, qIdx) => {
                pSum += assessmentStats.stats[pIdx]?.[qIdx]?.sum || 0;
                pCount += assessmentStats.stats[pIdx]?.[qIdx]?.count || 0;
              });
              const pAvgNum = pCount > 0 ? (pSum / pCount) : 0;
              const pAvg = pAvgNum.toFixed(1);
              
              // Determine overall color for the pillar
              const pillarColor = pAvgNum >= 4 ? 'var(--success)' : pAvgNum >= 2.5 ? 'var(--warning)' : 'var(--danger)';

              return (
                <div key={pIdx} style={{ background: 'var(--surface)', padding: '1.5rem', borderRadius: 'var(--radius-xl)', boxShadow: 'var(--shadow-md)', border: '1px solid var(--border)', display: 'flex', flexDirection: 'column' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem', borderBottom: '2px solid var(--bg-color)', paddingBottom: '0.75rem' }}>
                    <h4 style={{ margin: 0, fontSize: '1.15rem', color: 'var(--text-main)', letterSpacing: '0.02em', textTransform: 'uppercase' }}>{pillar.pillar}</h4>
                    <div style={{ fontWeight: '700', color: pillarColor, fontSize: '1.5rem', background: `${pillarColor}15`, padding: '0.25rem 0.75rem', borderRadius: 'var(--radius-md)' }}>
                      {pAvg} <span style={{ fontSize: '0.875rem', fontWeight: '500', color: 'var(--text-muted)' }}>/ 5</span>
                    </div>
                  </div>
                  
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem', flex: 1 }}>
                    {pillar.questions.map((question, qIdx) => {
                      const qSum = assessmentStats.stats[pIdx]?.[qIdx]?.sum || 0;
                      const qCount = assessmentStats.stats[pIdx]?.[qIdx]?.count || 0;
                      const qAvg = qCount > 0 ? (qSum / qCount).toFixed(1) : '0.0';
                      const qAvgNum = parseFloat(qAvg);
                      const widthPct = (qAvgNum / 5) * 100;
                      
                      const barColor = qAvgNum >= 4 ? 'var(--success)' : qAvgNum >= 2.5 ? 'var(--warning)' : 'var(--danger)';

                      return (
                        <div key={qIdx} style={{ background: 'var(--bg-color)', padding: '1rem', borderRadius: 'var(--radius-md)' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '1rem', marginBottom: '0.75rem' }}>
                            <span style={{ color: 'var(--text-main)', fontSize: '0.9rem', fontWeight: '500', lineHeight: '1.4', flex: 1 }}>{question}</span>
                            <span style={{ fontWeight: '700', color: barColor, fontSize: '1rem', whiteSpace: 'nowrap' }}>{qAvg}</span>
                          </div>
                          <div style={{ height: '8px', background: 'var(--border)', borderRadius: '4px', overflow: 'hidden' }}>
                            <div style={{ 
                              height: '100%', 
                              width: `${widthPct}%`, 
                              background: barColor, 
                              borderRadius: '4px',
                              transition: 'width 1s cubic-bezier(0.4, 0, 0.2, 1)'
                            }}></div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {!targetCellId && (
        <div className="glass-panel" style={{ padding: '1.5rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
            <h3 style={{ margin: 0, color: 'var(--primary)' }}>Cell Performance Breakdown</h3>
          </div>
          
          <div style={{ padding: '1rem', background: 'var(--surface)', borderRadius: 'var(--radius-md)' }}>
            <table className="data-grid">
              <thead>
                <tr>
                  <th>Cell Name</th>
                  <th>Cell Leader</th>
                  <th>Meetings Held</th>
                  <th>Avg Attendance</th>
                  <th>Total Salvations</th>
                  <th>New Visitors</th>
                </tr>
              </thead>
              <tbody>
                {data.cells.map(cell => {
                  const cellMeetings = filteredMeetings.filter(m => m.cellId === cell.id);
                  const cellAttendances = cellMeetings.reduce((sum, m) => sum + (m.attendees || []).length, 0);
                  const cellAvg = cellMeetings.length > 0 ? (cellAttendances / cellMeetings.length).toFixed(1) : '0';
                  const cellSalvations = cellMeetings.reduce((sum, m) => sum + Number(m.salvations || 0), 0);
                  const cellVisitors = filteredRoster.filter(m => m.cellId === cell.id && m.type === 'V').length;
                  
                  return (
                    <tr key={cell.id}>
                      <td style={{ fontWeight: '500' }}>{cell.name}</td>
                      <td>{cell.leaderName}</td>
                      <td>{cellMeetings.length}</td>
                      <td>{cellAvg}</td>
                      <td>{cellSalvations}</td>
                      <td>{cellVisitors}</td>
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
