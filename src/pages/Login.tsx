import React, { useState, useEffect } from 'react';
import { useData } from '../context/DataContext';

const Login = () => {
  const { data, login, updateCellPassword } = useData();
  const [role, setRole] = useState<'leader' | 'admin'>('leader'); // 'leader' or 'admin'
  const [cellId, setCellId] = useState(data.cells[0]?.id || '');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // View State: 'login', 'setup', or 'forgot'
  const [viewMode, setViewMode] = useState<'login' | 'setup' | 'forgot'>('login');
  const [email, setEmail] = useState('');
  const [newPassword, setNewPassword] = useState('');

  // Automatically switch to setup mode if the cell has no password
  useEffect(() => {
    if (role === 'leader' && data.cells.length > 0) {
      const cell = data.cells.find(c => c.id === cellId);
      if (cell && !cell.password) {
        setViewMode('setup');
        setError('');
      } else if (viewMode === 'setup') {
        // If they switched from a setup cell to a normal cell, go back to login
        setViewMode('login');
        setError('');
      }
    }
  }, [cellId, role, data.cells]);

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    const successLogin = login(role, password, role === 'leader' ? cellId : null);
    if (!successLogin) {
      setError('Invalid password. Please try again.');
    }
  };

  const handleSetupOrForgot = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    
    if (!cellId) {
      setError('Please select a cell.');
      return;
    }

    const cell = data.cells.find(c => c.id === cellId);
    if (!cell) {
      setError('Cell not found.');
      return;
    }
    
    try {
      if (viewMode === 'setup') {
        // 1. First Time Setup: Save both email and new password
        await updateCellEmail(cellId, email.trim());
        await updateCellPassword(cellId, newPassword);
        setSuccess('Setup complete! Logging you in...');
      } else if (viewMode === 'forgot') {
        // 2. Forgot Password: Verify email before allowing password change
        if (!cell.email) {
          setError('No email registered for this cell. Please ask your administrator to reset your password.');
          return;
        }
        if (cell.email.trim().toLowerCase() !== email.trim().toLowerCase()) {
          setError('The provided email does not match our records for this cell.');
          return;
        }
        await updateCellPassword(cellId, newPassword);
        setSuccess('Password reset successfully! Logging you in...');
      }

      setTimeout(() => {
        login('leader', newPassword, cellId);
      }, 1500);
    } catch (err: any) {
      setError('An error occurred: ' + err.message);
    }
  };

  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', backgroundColor: 'var(--bg-color)', width: '100%' }}>
      <div className="glass-panel" style={{ padding: '2.5rem', width: '100%', maxWidth: '400px' }}>
        <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
          <h1 style={{ color: 'var(--primary)', marginBottom: '0.5rem' }}>CellSystem Auth</h1>
          <p className="text-muted">Sign in to manage your cell group.</p>
        </div>

        {viewMode === 'setup' || viewMode === 'forgot' ? (
          <form onSubmit={handleSetupOrForgot} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div style={{ textAlign: 'center', marginBottom: '1rem' }}>
              <h3 style={{ margin: 0, color: 'var(--primary)' }}>
                {viewMode === 'setup' ? 'First Time Setup' : 'Forgot Password'}
              </h3>
              <p className="text-muted" style={{ fontSize: '0.875rem', marginTop: '0.5rem' }}>
                {viewMode === 'setup' 
                  ? 'Welcome! Please register your email and create a password to secure your account.'
                  : 'Enter your registered email to set a new password.'}
              </p>
            </div>

            <div>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem', fontWeight: '500' }}>Select Cell Group</label>
              <select value={cellId} onChange={(e) => setCellId(e.target.value)}>
                {data.cells.map(c => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>

            <div>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem', fontWeight: '500' }}>
                {viewMode === 'setup' ? 'Register an Email (for future resets)' : 'Registered Email'}
              </label>
              <input 
                type="email" 
                value={email} 
                onChange={(e) => setEmail(e.target.value)} 
                placeholder={viewMode === 'setup' ? "e.g. leader@example.com" : "Enter your registered email"}
                required 
              />
            </div>

            <div>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem', fontWeight: '500' }}>
                {viewMode === 'setup' ? 'Create a Password' : 'New Password'}
              </label>
              <input 
                type="password" 
                value={newPassword} 
                onChange={(e) => setNewPassword(e.target.value)} 
                placeholder={viewMode === 'setup' ? "Create a strong password" : "Enter new password"}
                required 
                minLength={4}
              />
            </div>

            {error && <div style={{ color: 'var(--danger)', fontSize: '0.875rem', textAlign: 'center' }}>{error}</div>}
            {success && <div style={{ color: 'var(--success)', fontSize: '0.875rem', textAlign: 'center' }}>{success}</div>}

            <button type="submit" className="btn btn-primary" style={{ marginTop: '1rem', padding: '0.75rem' }}>
              {viewMode === 'setup' ? 'Complete Setup & Login' : 'Reset Password & Login'}
            </button>
            <div style={{ textAlign: 'center', marginTop: '0.5rem' }}>
              <button type="button" className="btn-icon" style={{ background: 'none', border: 'none', color: 'var(--primary)', fontSize: '0.875rem', cursor: 'pointer' }} onClick={() => { setViewMode('login'); setError(''); setSuccess(''); }}>
                Back to Login
              </button>
            </div>
          </form>
        ) : (
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
            {role === 'leader' && (
              <div style={{ textAlign: 'center', marginTop: '0.5rem' }}>
                <button type="button" className="btn-icon" style={{ background: 'none', border: 'none', color: 'var(--primary)', fontSize: '0.875rem', cursor: 'pointer' }} onClick={() => { setViewMode('forgot'); setError(''); setEmail(''); setNewPassword(''); }}>
                  Forgot Password?
                </button>
              </div>
            )}
          </form>
        )}
      </div>
    </div>
  );
};

export default Login;
