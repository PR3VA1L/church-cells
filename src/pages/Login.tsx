import React, { useState } from 'react';
import { useData } from '../context/DataContext';

const Login = () => {
  const { data, login } = useData();
  const [role, setRole] = useState<'leader' | 'admin'>('leader'); // 'leader' or 'admin'
  const [cellId, setCellId] = useState(data.cells[0]?.id || '');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    const success = login(role, password, role === 'leader' ? cellId : null);
    if (!success) {
      setError('Invalid password. Please try again.');
    }
  };

  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', backgroundColor: 'var(--bg-color)', width: '100%' }}>
      <div className="glass-panel" style={{ padding: '2.5rem', width: '100%', maxWidth: '400px' }}>
        <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
          <h1 style={{ color: 'var(--primary)', marginBottom: '0.5rem' }}>CellSystem Auth</h1>
          <p className="text-muted">Sign in to manage your cell group.</p>
        </div>

        <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div>
            <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem', fontWeight: '500' }}>Account Type</label>
            <select value={role} onChange={(e) => setRole(e.target.value as 'leader' | 'admin')}>
              <option value="leader">Cell Leader</option>
              <option value="admin">System Administrator</option>
            </select>
          </div>

          {role === 'leader' && (
            <div>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem', fontWeight: '500' }}>Select Cell Group</label>
              <select value={cellId} onChange={(e) => setCellId(e.target.value)}>
                {data.cells.map(c => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>
          )}

          <div>
            <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem', fontWeight: '500' }}>Password</label>
            <input 
              type="password" 
              value={password} 
              onChange={(e) => setPassword(e.target.value)} 
              placeholder="Enter password"
              required 
            />
          </div>

          {error && <div style={{ color: 'var(--danger)', fontSize: '0.875rem', textAlign: 'center' }}>{error}</div>}

          <button type="submit" className="btn btn-primary" style={{ marginTop: '1rem', padding: '0.75rem' }}>
            Login securely
          </button>
        </form>
      </div>
    </div>
  );
};

export default Login;
