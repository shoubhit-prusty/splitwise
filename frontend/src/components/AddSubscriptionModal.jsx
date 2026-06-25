import { useState, useRef, useEffect } from 'react';
import api from '../api/axiosInstance';
import Avatar from './Avatar';
import { useAuth } from '../context/AuthContext';

export default function AddSubscriptionModal({ groupId, members, onClose, onAdded }) {
  const { user } = useAuth();
  const [name, setName] = useState('');
  const [amount, setAmount] = useState('');
  const [intervalCount, setIntervalCount] = useState(1);
  const [cycle, setCycle] = useState('MONTHLY');
  const [nextBillingDate, setNextBillingDate] = useState('');
  
  // Default to everyone paying equally
  const [splitWith, setSplitWith] = useState(members.map(m => m.userId));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const modalRef = useRef(null);
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (modalRef.current && !modalRef.current.contains(e.target)) onClose();
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [onClose]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!name || !amount || !nextBillingDate) return setError('Please fill all fields.');
    if (splitWith.length === 0) return setError('Please select who to split with.');
    
    setSaving(true);
    setError('');

    try {
      const shares = splitWith.map(uid => ({ userId: uid }));
      const payload = {
        name,
        amount: parseFloat(amount),
        cycle,
        intervalCount: parseInt(intervalCount, 10),
        nextBillingDate,
        splitType: 'equal',
        shares
      };

      await api.post(`/groups/${groupId}/subscriptions`, payload);
      onAdded();
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to add subscription.');
    } finally {
      setSaving(false);
    }
  };

  const toggleMember = (uid) => {
    setSplitWith(prev => 
      prev.includes(uid) ? prev.filter(id => id !== uid) : [...prev, uid]
    );
  };

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: 'rgba(6, 6, 18, 0.85)', backdropFilter: 'blur(12px)', padding: 20
    }}>
      <div ref={modalRef} style={{
        width: '100%', maxWidth: 440, borderRadius: 24, padding: 32,
        background: '#0a0a16', border: '1px solid rgba(255,255,255,0.1)',
        boxShadow: '0 24px 48px rgba(0,0,0,0.5)', position: 'relative', overflow: 'hidden'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
          <h2 style={{ fontSize: 20, fontWeight: 700, color: '#f8fafc', margin: 0 }}>Add Subscription</h2>
          <button onClick={onClose} style={{ background: 'transparent', border: 'none', color: '#94a3b8', fontSize: 18, cursor: 'pointer' }}>✕</button>
        </div>

        {error && <div style={{ padding: 12, borderRadius: 12, background: 'rgba(244,63,94,0.1)', color: '#f43f5e', fontSize: 13, marginBottom: 20 }}>{error}</div>}

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div>
            <label style={{ display: 'block', fontSize: 13, color: '#cbd5e1', marginBottom: 8 }}>Service Name</label>
            <input type="text" value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Netflix, Spotify" style={{ width: '100%', padding: '14px 16px', borderRadius: 12, background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.1)', color: '#fff', fontSize: 15, boxSizing: 'border-box' }} />
          </div>

          <div style={{ display: 'flex', gap: 12 }}>
            <div style={{ flex: 1 }}>
              <label style={{ display: 'block', fontSize: 13, color: '#cbd5e1', marginBottom: 8 }}>Amount (₹)</label>
              <input type="number" step="0.01" value={amount} onChange={e => setAmount(e.target.value)} placeholder="0.00" style={{ width: '100%', padding: '14px 16px', borderRadius: 12, background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.1)', color: '#fff', fontSize: 15, boxSizing: 'border-box' }} />
            </div>
            <div style={{ flex: 1 }}>
              <label style={{ display: 'block', fontSize: 13, color: '#cbd5e1', marginBottom: 8 }}>Repeat every</label>
              <div style={{ display: 'flex', gap: 8 }}>
                <input type="number" min="1" value={intervalCount} onChange={e => setIntervalCount(e.target.value)} style={{ width: 60, padding: '14px 8px', borderRadius: 12, background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.1)', color: '#fff', fontSize: 15, textAlign: 'center', outline: 'none' }} />
                
                <div style={{ position: 'relative', flex: 1 }}>
                  <div
                    onClick={() => {
                      // simple toggle
                      const dd = document.getElementById('cycle-dropdown');
                      if (dd) dd.style.display = dd.style.display === 'block' ? 'none' : 'block';
                    }}
                    style={{
                      width: '100%', padding: '14px 16px', borderRadius: 12, background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.1)',
                      color: '#fff', fontSize: 15, boxSizing: 'border-box', cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center'
                    }}
                  >
                    <span>
                      {cycle === 'DAYS' ? (intervalCount > 1 ? 'Days' : 'Day') :
                       cycle === 'WEEKLY' ? (intervalCount > 1 ? 'Weeks' : 'Week') :
                       cycle === 'MONTHLY' ? (intervalCount > 1 ? 'Months' : 'Month') :
                       (intervalCount > 1 ? 'Years' : 'Year')}
                    </span>
                    <span style={{ fontSize: 10, color: '#94a3b8' }}>▼</span>
                  </div>

                  <div id="cycle-dropdown" style={{
                    display: 'none', position: 'absolute', top: '100%', left: 0, right: 0, marginTop: 4, zIndex: 10,
                    background: '#1e1e2d', borderRadius: 12, border: '1px solid rgba(255,255,255,0.1)', overflow: 'hidden', boxShadow: '0 8px 24px rgba(0,0,0,0.5)'
                  }}>
                    {['DAYS', 'WEEKLY', 'MONTHLY', 'YEARLY'].map(val => (
                      <div
                        key={val}
                        onClick={() => {
                          setCycle(val);
                          document.getElementById('cycle-dropdown').style.display = 'none';
                        }}
                        onMouseEnter={e => e.currentTarget.style.background = 'rgba(99,102,241,0.2)'}
                        onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                        style={{
                          padding: '12px 16px', color: cycle === val ? '#818cf8' : '#e2e8f0', cursor: 'pointer', fontSize: 15, transition: 'background 0.2s'
                        }}
                      >
                        {val === 'DAYS' ? (intervalCount > 1 ? 'Days' : 'Day') :
                         val === 'WEEKLY' ? (intervalCount > 1 ? 'Weeks' : 'Week') :
                         val === 'MONTHLY' ? (intervalCount > 1 ? 'Months' : 'Month') :
                         (intervalCount > 1 ? 'Years' : 'Year')}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div>
            <label style={{ display: 'block', fontSize: 13, color: '#cbd5e1', marginBottom: 8 }}>Next Billing Date</label>
            <input type="date" value={nextBillingDate} onChange={e => setNextBillingDate(e.target.value)} style={{ width: '100%', padding: '14px 16px', borderRadius: 12, background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.1)', color: '#fff', fontSize: 15, boxSizing: 'border-box' }} />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: 13, color: '#cbd5e1', marginBottom: 12 }}>Split equally with:</label>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, maxHeight: 150, overflowY: 'auto' }}>
              {members.map(m => {
                const isSelected = splitWith.includes(m.userId);
                return (
                  <div key={m.userId} onClick={() => toggleMember(m.userId)} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 12px', borderRadius: 12, background: isSelected ? 'rgba(99,102,241,0.1)' : 'rgba(255,255,255,0.02)', border: `1px solid ${isSelected ? 'rgba(99,102,241,0.3)' : 'transparent'}`, cursor: 'pointer', transition: 'all 0.2s' }}>
                    <div style={{ width: 20, height: 20, borderRadius: 6, border: `2px solid ${isSelected ? '#6366f1' : '#475569'}`, background: isSelected ? '#6366f1' : 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      {isSelected && <span style={{ color: '#fff', fontSize: 12 }}>✓</span>}
                    </div>
                    <Avatar name={m.user.name} color={m.user.avatarColor} size={28} />
                    <span style={{ fontSize: 14, color: isSelected ? '#f8fafc' : '#94a3b8' }}>{m.userId === user?.id ? 'You' : m.user.name}</span>
                  </div>
                );
              })}
            </div>
          </div>

          <button type="submit" disabled={saving} style={{ marginTop: 8, padding: '14px', borderRadius: 14, border: 'none', background: 'linear-gradient(135deg, #6366f1, #8b5cf6)', color: '#fff', fontSize: 15, fontWeight: 600, cursor: saving ? 'not-allowed' : 'pointer', opacity: saving ? 0.7 : 1 }}>
            {saving ? 'Saving...' : 'Add Auto-Pay Subscription'}
          </button>
        </form>
      </div>
    </div>
  );
}
