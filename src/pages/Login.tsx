import React, { useState, useEffect } from 'react';
import emailjs from '@emailjs/browser';
import { useData } from '../context/DataContext';

const Login = () => {
  const { data, login, updateCellPassword, updateCellEmail, notifyAdminForReset } = useData();
  const [role, setRole] = useState<'leader' | 'admin'>('leader');
  const [cellId, setCellId] = useState(data.cells[0]?.id || '');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // View State
  const [viewMode, setViewMode] = useState<'login' | 'setup' | 'forgot' | 'verify' | 'reset'>('login');
  const [email, setEmail] = useState('');
  const [newPassword, setNewPassword] = useState('');
  
  // OTP State
  const [otpCode, setOtpCode] = useState('');
  const [otpInput, setOtpInput] = useState('');
  const [timer, setTimer] = useState(120);

  // Timer Effect
  useEffect(() => {
    let interval: ReturnType<typeof setInterval>;
    if (viewMode === 'verify' && timer > 0) {
      interval = setInterval(() => {
        setTimer(prev => prev - 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [viewMode, timer]);

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

  const handleAction = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    
    if (!cellId) return setError('Please select a cell.');
    const cell = data.cells.find(c => c.id === cellId);
    if (!cell) return setError('Cell not found.');
    
    try {
      if (viewMode === 'setup') {
        await updateCellEmail(cellId, email.trim());
        await updateCellPassword(cellId, newPassword);
        setSuccess('Setup complete! Logging you in...');
        setTimeout(() => login('leader', newPassword, cellId), 1500);
      } 
      else if (viewMode === 'forgot') {
        if (!cell.email) return setError('No email registered for this cell. Please notify the administrator.');
        if (cell.email.trim().toLowerCase() !== email.trim().toLowerCase()) return setError('The provided email does not match our records for this cell.');
        
        generateAndSendOTP();
      }
      else if (viewMode === 'verify') {
        if (timer <= 0) return setError('Code expired. Please resend a new code.');
        if (otpInput.trim() !== otpCode) return setError('Invalid verification code.');
        
        setViewMode('reset');
        setError('');
        setSuccess('Code verified! Please enter your new password.');
      }
      else if (viewMode === 'reset') {
        await updateCellPassword(cellId, newPassword);
        setSuccess('Password reset successfully! Logging you in...');
        setTimeout(() => login('leader', newPassword, cellId), 1500);
      }
    } catch (err: any) {
      setError('An error occurred: ' + err.message);
    }
  };

  const generateAndSendOTP = async () => {
    const code = Math.floor(10000 + Math.random() * 90000).toString();
    setOtpCode(code);
    setTimer(120);
    setOtpInput('');
    setViewMode('verify');
    
    try {
      const cellName = data.cells.find(c => c.id === cellId)?.name || 'your cell group';
      
      const templateParams = {
        to_email: email,
        verification_code: code,
        cell_name: cellName
      };

      // Ensure environment variables are loaded
      const serviceId = import.meta.env.VITE_EMAILJS_SERVICE_ID;
      const templateId = import.meta.env.VITE_EMAILJS_TEMPLATE_ID;
      const publicKey = import.meta.env.VITE_EMAILJS_PUBLIC_KEY;

      if (!serviceId || !templateId || !publicKey) {
        throw new Error("EmailJS configuration is missing.");
      }

      await emailjs.send(serviceId, templateId, templateParams, publicKey);
      setSuccess(`A verification code was sent to ${email}`);
    } catch (error: any) {
      console.error('EmailJS Error:', error);
      setError('Failed to send verification email: ' + (error.text || error.message));
    }
  };

  const handleNotifyAdmin = async () => {
    if (!cellId) return;
    try {
      await notifyAdminForReset(cellId);
      setSuccess('The administrator has been notified. They will reach out to you shortly.');
      setError('');
    } catch (err: any) {
      setError('Failed to notify admin: ' + err.message);
    }
  };

  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', backgroundColor: 'var(--bg-color)', width: '100%' }}>
      <div className="glass-panel" style={{ padding: '2.5rem', width: '100%', maxWidth: '400px' }}>
        <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
          <h1 style={{ color: 'var(--primary)', marginBottom: '0.5rem' }}>CellSystem Auth</h1>
          <p className="text-muted">Sign in to manage your cell group.</p>
        </div>

        {viewMode !== 'login' ? (
          <form onSubmit={handleAction} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div style={{ textAlign: 'center', marginBottom: '1rem' }}>
              <h3 style={{ margin: 0, color: 'var(--primary)' }}>
                {viewMode === 'setup' && 'First Time Setup'}
                {viewMode === 'forgot' && 'Forgot Password'}
                {viewMode === 'verify' && 'Verify Email'}
                {viewMode === 'reset' && 'Create New Password'}
              </h3>
              <p className="text-muted" style={{ fontSize: '0.875rem', marginTop: '0.5rem' }}>
                {viewMode === 'setup' && 'Welcome! Please register your email and create a password to secure your account.'}
                {viewMode === 'forgot' && 'Enter your registered email to receive a 5-digit verification code.'}
                {viewMode === 'verify' && `A 5-digit code has been sent to ${email}.`}
                {viewMode === 'reset' && 'Please enter your new password below.'}
              </p>
            </div>

            {(viewMode === 'setup' || viewMode === 'forgot') && (
              <>
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
              </>
            )}

            {viewMode === 'setup' && (
              <div>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem', fontWeight: '500' }}>Create a Password</label>
                <input type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} placeholder="Create a strong password" required minLength={4} />
              </div>
            )}

            {viewMode === 'verify' && (
              <div style={{ textAlign: 'center' }}>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem', fontWeight: '500' }}>5-Digit Code</label>
                <input 
                  type="text" 
                  value={otpInput} 
                  onChange={(e) => setOtpInput(e.target.value.replace(/\D/g, '').slice(0, 5))} 
                  placeholder="Enter 5-digit code"
                  required 
                  style={{ textAlign: 'center', letterSpacing: '0.5rem', fontSize: '1.25rem', padding: '0.75rem' }}
                />
                <div style={{ marginTop: '0.75rem', fontSize: '0.875rem', color: timer > 0 ? 'var(--text-muted)' : 'var(--danger)' }}>
                  {timer > 0 ? `Code expires in ${Math.floor(timer / 60)}:${(timer % 60).toString().padStart(2, '0')}` : 'Code expired.'}
                </div>
              </div>
            )}

            {viewMode === 'reset' && (
              <div>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem', fontWeight: '500' }}>New Password</label>
                <input type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} placeholder="Enter new password" required minLength={4} />
              </div>
            )}

            {error && <div style={{ color: 'var(--danger)', fontSize: '0.875rem', textAlign: 'center' }}>{error}</div>}
            {success && <div style={{ color: 'var(--success)', fontSize: '0.875rem', textAlign: 'center' }}>{success}</div>}

            <button type="submit" className="btn btn-primary" style={{ marginTop: '0.5rem', padding: '0.75rem' }}>
              {viewMode === 'setup' && 'Complete Setup & Login'}
              {viewMode === 'forgot' && 'Send Verification Code'}
              {viewMode === 'verify' && 'Verify Code'}
              {viewMode === 'reset' && 'Reset Password & Login'}
            </button>
            
            {viewMode === 'verify' && timer <= 0 && (
              <button type="button" className="btn btn-outline" onClick={generateAndSendOTP} style={{ padding: '0.5rem' }}>
                Resend Code
              </button>
            )}

            {(viewMode === 'forgot' || viewMode === 'verify') && (
              <div style={{ textAlign: 'center', marginTop: '0.5rem' }}>
                <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>If you can't access your email, you can</p>
                <button type="button" onClick={handleNotifyAdmin} style={{ background: 'none', border: 'none', color: 'var(--danger)', fontSize: '0.875rem', cursor: 'pointer', textDecoration: 'underline' }}>
                  Notify Admin for Help
                </button>
              </div>
            )}

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
