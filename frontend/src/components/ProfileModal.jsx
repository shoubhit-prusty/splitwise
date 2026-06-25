import { useState } from 'react';
import api from '../api/axiosInstance';
import Avatar from './Avatar';
import { useAuth } from '../context/AuthContext';

export default function ProfileModal({ onClose, onUpdated }) {
  const { user } = useAuth();
  const [upiId, setUpiId] = useState(user?.upiId || '');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const handleSave = async () => {
    setError('');
    setSaving(true);
    try {
      const res = await api.put('/users/profile', { upiId: upiId.trim() });
      if (onUpdated) onUpdated(res.data.user);
      onClose();
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to update profile.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: 'rgba(6, 6, 18, 0.8)', backdropFilter: 'blur(12px)',
      animation: 'fadeIn 0.2s ease', padding: 20
    }}>
      <div style={{
        width: '100%', maxWidth: 440, borderRadius: 24, padding: 32,
        background: '#0a0a16', border: '1px solid rgba(255,255,255,0.1)',
        boxShadow: '0 24px 48px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.1)',
        animation: 'slideUp 0.3s cubic-bezier(0.16, 1, 0.3, 1)',
        position: 'relative', overflow: 'hidden'
      }}>
        {/* Glow effect */}
        <div style={{ position: 'absolute', top: -50, left: '20%', right: '20%', height: 100, background: '#6366f1', filter: 'blur(60px)', opacity: 0.15, pointerEvents: 'none' }} />

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
          <h2 style={{ fontSize: 20, fontWeight: 700, color: '#f8fafc', margin: 0 }}>Profile Settings</h2>
          <button onClick={onClose} style={{
            background: 'rgba(255,255,255,0.05)', border: 'none', color: '#94a3b8', 
            width: 32, height: 32, borderRadius: '50%', cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.2s'
          }} onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.1)'; e.currentTarget.style.color = '#fff'; }}
             onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.05)'; e.currentTarget.style.color = '#94a3b8'; }}>
            ✕
          </button>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 32, padding: 16, background: 'rgba(255,255,255,0.03)', borderRadius: 16, border: '1px solid rgba(255,255,255,0.05)' }}>
          <Avatar name={user?.name} color={user?.avatarColor} size={56} />
          <div>
            <div style={{ fontSize: 18, fontWeight: 700, color: '#f8fafc', margin: '0 0 4px' }}>{user?.name}</div>
            <div style={{ fontSize: 13, color: '#94a3b8' }}>{user?.email}</div>
          </div>
        </div>

        <div style={{ marginBottom: 24 }}>
          <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#cbd5e1', marginBottom: 8 }}>UPI ID (Optional)</label>
          <div style={{ position: 'relative' }}>
            <span style={{ position: 'absolute', left: 16, top: '50%', transform: 'translateY(-50%)', fontSize: 18, color: '#64748b' }}>🏦</span>
            <input
              type="text"
              value={upiId}
              onChange={(e) => setUpiId(e.target.value)}
              placeholder="e.g. shoubhit@ybl"
              style={{
                width: '100%', padding: '14px 16px 14px 44px', borderRadius: 12,
                background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.1)',
                color: '#f8fafc', fontSize: 15, transition: 'all 0.2s', outline: 'none',
                boxSizing: 'border-box'
              }}
              onFocus={(e) => { e.target.style.borderColor = '#6366f1'; e.target.style.background = 'rgba(99,102,241,0.05)'; }}
              onBlur={(e) => { e.target.style.borderColor = 'rgba(255,255,255,0.1)'; e.target.style.background = 'rgba(255,255,255,0.03)'; }}
            />
          </div>
          <p style={{ fontSize: 12, color: '#64748b', margin: '8px 0 0 0', lineHeight: 1.4 }}>
            Adding your UPI ID lets other members easily tap to pay you via GPay, PhonePe, or Paytm when settling up.
          </p>
        </div>

        {error && (
          <div style={{ padding: '12px 16px', borderRadius: 10, background: 'rgba(244,63,94,0.1)', border: '1px solid rgba(244,63,94,0.2)', color: '#f43f5e', fontSize: 13, marginBottom: 24 }}>
            {error}
          </div>
        )}

        <button onClick={handleSave} disabled={saving} style={{
          width: '100%', padding: '14px', borderRadius: 14, border: 'none',
          background: saving ? 'rgba(99,102,241,0.5)' : 'linear-gradient(135deg, #6366f1, #8b5cf6)',
          color: '#fff', fontSize: 15, fontWeight: 600, cursor: saving ? 'not-allowed' : 'pointer',
          boxShadow: saving ? 'none' : '0 8px 24px rgba(99,102,241,0.3)', transition: 'all 0.2s',
        }} onMouseEnter={(e) => { if (!saving) { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 12px 32px rgba(99,102,241,0.4)'; } }}
           onMouseLeave={(e) => { if (!saving) { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = '0 8px 24px rgba(99,102,241,0.3)'; } }}>
          {saving ? 'Saving...' : 'Save Changes'}
        </button>
      </div>
    </div>
  );
}
