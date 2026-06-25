import { useState, useEffect } from 'react';
import api from '../api/axiosInstance';
import Avatar from './Avatar';

export default function AddExpenseModal({ groupId, onClose, onCreated }) {
  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  
  const [members, setMembers] = useState([]);
  const [splitMode, setSplitMode] = useState('equal'); // 'equal' | 'exact' | 'percentage'
  const [splits, setSplits] = useState({}); 
  const [lockedShares, setLockedShares] = useState(new Set());

  useEffect(() => {
    api.get(`/groups/${groupId}`)
      .then(res => {
        const mems = res.data.group.members.map(m => m.user);
        setMembers(mems);
        const initSplits = {};
        mems.forEach(m => initSplits[m.id] = true); // default all included
        setSplits(initSplits);
      })
      .catch(err => console.error("Failed to load members", err));
  }, [groupId]);

  const resetShares = (mode = splitMode, totalAmt = parseFloat(amount) || 0) => {
    const newSplits = {};
    if (mode === 'equal') {
      members.forEach(m => newSplits[m.id] = true);
    } else if (mode === 'percentage') {
      const pct = (100 / members.length);
      const basePct = Math.floor(pct * 100) / 100;
      let diff = Math.round((100 - basePct * members.length) * 100);
      members.forEach((m, i) => {
        newSplits[m.id] = (basePct + (i < diff ? 0.01 : 0)).toFixed(2);
      });
    } else if (mode === 'exact') {
      const amt = (totalAmt / members.length);
      const baseAmt = Math.floor(amt * 100) / 100;
      let diff = Math.round((totalAmt - baseAmt * members.length) * 100);
      members.forEach((m, i) => {
        newSplits[m.id] = (baseAmt + (i < diff ? 0.01 : 0)).toFixed(2);
      });
    }
    setSplits(newSplits);
    setLockedShares(new Set());
  };

  useEffect(() => {
    if (splitMode === 'exact') {
      resetShares('exact');
    }
  }, [amount]);

  const handleSplitChange = (userId, value) => {
    if (splitMode === 'equal') {
      setSplits(prev => ({ ...prev, [userId]: value }));
      return;
    }

    const newSplits = { ...splits, [userId]: value };
    const newLocked = new Set(lockedShares);
    newLocked.add(userId);
    setLockedShares(newLocked);

    const unlockedMembers = members.filter(m => !newLocked.has(m.id));
    if (unlockedMembers.length > 0) {
      let totalNeeded = splitMode === 'percentage' ? 100 : (parseFloat(amount) || 0);
      let lockedSum = 0;
      members.forEach(m => {
        if (newLocked.has(m.id)) {
          lockedSum += parseFloat(newSplits[m.id]) || 0;
        }
      });

      let remaining = totalNeeded - lockedSum;
      if (remaining < 0) remaining = 0; // prevent negative shares

      let sharePerUnlocked = Math.floor((remaining / unlockedMembers.length) * 100) / 100;
      let totalDistributed = sharePerUnlocked * unlockedMembers.length;
      let diff = Math.round((remaining - totalDistributed) * 100);

      unlockedMembers.forEach((m, i) => {
        let val = sharePerUnlocked;
        if (i < diff) val += 0.01;
        newSplits[m.id] = val.toFixed(2);
      });
    }

    setSplits(newSplits);
  };

  const handleModeChange = (newMode) => {
    const oldMode = splitMode;
    setSplitMode(newMode);
    
    if (oldMode === 'equal' || newMode === 'equal') {
      resetShares(newMode);
      return;
    }

    const totalAmt = parseFloat(amount) || 0;
    if (totalAmt <= 0) {
      resetShares(newMode);
      return;
    }

    const newSplits = {};
    if (oldMode === 'exact' && newMode === 'percentage') {
      members.forEach(m => {
        const val = parseFloat(splits[m.id]) || 0;
        newSplits[m.id] = ((val / totalAmt) * 100).toFixed(2);
      });
    } else if (oldMode === 'percentage' && newMode === 'exact') {
      members.forEach(m => {
        const pct = parseFloat(splits[m.id]) || 0;
        newSplits[m.id] = ((pct / 100) * totalAmt).toFixed(2);
      });
    }
    
    setSplits(newSplits);
    // Note: We deliberately do NOT reset lockedShares so the user's manual locks persist across mode changes
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const totalAmount = parseFloat(amount);
    if (!description.trim() || !totalAmount || totalAmount <= 0) {
      setError('Please provide a valid description and amount.');
      return;
    }

    let items = [];

    if (splitMode === 'equal') {
      const includedIds = Object.keys(splits).filter(id => splits[id]);
      if (includedIds.length === 0) {
        setError('At least one person must be included in the split.');
        return;
      }
      items = [{
        name: description,
        price: totalAmount,
        quantity: 1,
        isVeg: true,
        assignedUserIds: includedIds
      }];
    } else if (splitMode === 'exact') {
      let sum = 0;
      for (const m of members) {
        const val = parseFloat(splits[m.id]) || 0;
        sum += val;
        if (val > 0) {
          items.push({ name: description, price: val, quantity: 1, isVeg: true, assignedUserIds: [m.id] });
        }
      }
      if (Math.abs(sum - totalAmount) > 0.01) {
        setError(`Exact amounts must sum to ${totalAmount}. Currently sums to ${sum}.`);
        return;
      }
    } else if (splitMode === 'percentage') {
      let pctSum = 0;
      for (const m of members) {
        const pct = parseFloat(splits[m.id]) || 0;
        pctSum += pct;
        if (pct > 0) {
          const val = (totalAmount * pct) / 100;
          items.push({ name: description, price: val, quantity: 1, isVeg: true, assignedUserIds: [m.id] });
        }
      }
      if (Math.abs(pctSum - 100) > 0.01) {
        setError(`Percentages must sum to 100%. Currently sums to ${pctSum}%.`);
        return;
      }
    }

    setSaving(true);
    setError('');
    
    try {
      await api.post('/receipts/confirm', {
        groupId,
        description,
        items,
        tax: 0,
        tip: 0,
        receiptUrl: null
      });
      onCreated(); 
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to add expense');
      setSaving(false);
    }
  };

  const inputStyle = {
    width: '100%',
    background: 'rgba(255,255,255,0.03)',
    border: '1px solid rgba(255,255,255,0.1)',
    color: '#f8fafc',
    padding: '12px 16px',
    borderRadius: 12,
    fontSize: 14,
    outline: 'none',
    transition: 'all 0.2s',
    boxSizing: 'border-box'
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
        position: 'relative', overflow: 'hidden', maxHeight: '90vh', display: 'flex', flexDirection: 'column'
      }}>
        {/* Glow */}
        <div style={{ position: 'absolute', top: -50, left: '20%', right: '20%', height: 100, background: '#6366f1', filter: 'blur(60px)', opacity: 0.2, pointerEvents: 'none' }} />

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <h2 style={{ fontSize: 20, fontWeight: 700, color: '#f8fafc', margin: 0 }}>Add New Expense</h2>
          <button onClick={onClose} style={{
            background: 'rgba(255,255,255,0.05)', border: 'none', color: '#94a3b8',
            width: 32, height: 32, borderRadius: '50%', cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.2s'
          }} onMouseEnter={e => e.currentTarget.style.color = '#fff'} onMouseLeave={e => e.currentTarget.style.color = '#94a3b8'}>
            ✕
          </button>
        </div>

        {error && (
          <div style={{ padding: 12, borderRadius: 12, background: 'rgba(239,68,68,0.1)', color: '#fca5a5', fontSize: 13, marginBottom: 16, border: '1px solid rgba(239,68,68,0.2)' }}>
            ⚠️ {error}
          </div>
        )}

        <div style={{ overflowY: 'auto', flex: 1, paddingRight: 4 }}>
          <form id="expense-form" onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div>
              <label style={{ display: 'block', fontSize: 13, fontWeight: 500, color: '#94a3b8', marginBottom: 8 }}>
                What is this expense for?
              </label>
              <input 
                autoFocus
                placeholder="e.g. Dinner, Uber, Groceries" 
                value={description} 
                onChange={e => setDescription(e.target.value)}
                style={inputStyle}
                onFocus={e => { e.currentTarget.style.borderColor = 'rgba(99,102,241,0.5)'; e.currentTarget.style.background = 'rgba(99,102,241,0.05)'; }}
                onBlur={e => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.1)'; e.currentTarget.style.background = 'rgba(255,255,255,0.03)'; }}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: 13, fontWeight: 500, color: '#94a3b8', marginBottom: 8 }}>
                Total Amount (₹)
              </label>
              <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                <span style={{ position: 'absolute', left: 16, color: '#94a3b8', fontSize: 16, fontWeight: 500 }}>₹</span>
                <input 
                  type="number" 
                  min="0.01" 
                  step="0.01"
                  placeholder="0.00" 
                  value={amount} 
                  onChange={e => setAmount(e.target.value)}
                  style={{ ...inputStyle, paddingLeft: 36, fontSize: 16, fontWeight: 600 }}
                  onFocus={e => { e.currentTarget.style.borderColor = 'rgba(99,102,241,0.5)'; e.currentTarget.style.background = 'rgba(99,102,241,0.05)'; }}
                  onBlur={e => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.1)'; e.currentTarget.style.background = 'rgba(255,255,255,0.03)'; }}
                />
              </div>
            </div>

            <div style={{ marginTop: 8 }}>
              <label style={{ display: 'block', fontSize: 13, fontWeight: 500, color: '#94a3b8', marginBottom: 12 }}>
                How to split this?
              </label>
              <div style={{ display: 'flex', gap: 8, marginBottom: 16, background: 'rgba(255,255,255,0.03)', padding: 4, borderRadius: 14 }}>
                {['equal', 'exact', 'percentage'].map(mode => (
                  <button key={mode} type="button" onClick={() => handleModeChange(mode)} style={{
                    flex: 1, padding: '8px 0', border: 'none', borderRadius: 10, cursor: 'pointer',
                    fontSize: 13, fontWeight: 600, textTransform: 'capitalize', transition: 'all 0.2s',
                    background: splitMode === mode ? 'rgba(99,102,241,0.15)' : 'transparent',
                    color: splitMode === mode ? '#a5b4fc' : '#64748b',
                    boxShadow: splitMode === mode ? 'inset 0 0 0 1px rgba(99,102,241,0.3)' : 'none'
                  }}>
                    {mode}
                  </button>
                ))}
              </div>

              {(splitMode === 'percentage' || splitMode === 'exact') && lockedShares.size > 0 && (
                <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 12 }}>
                  <button type="button" onClick={() => resetShares()} style={{
                    background: 'rgba(244,63,94,0.1)', color: '#fda4af', border: '1px solid rgba(244,63,94,0.2)',
                    padding: '4px 12px', borderRadius: 12, fontSize: 12, fontWeight: 600, cursor: 'pointer'
                  }}>
                    ↺ Reset to Equal
                  </button>
                </div>
              )}

              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {members.map(m => (
                  <div key={m.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12, opacity: splitMode === 'equal' && !splits[m.id] ? 0.5 : 1 }}>
                      <Avatar name={m.name} color={m.avatarColor} size={32} />
                      <span style={{ fontSize: 14, fontWeight: 500, color: '#f1f5f9' }}>{m.name}</span>
                    </div>
                    
                    {splitMode === 'equal' && (
                      <label style={{ display: 'flex', alignItems: 'center', cursor: 'pointer' }}>
                        <input type="checkbox" checked={!!splits[m.id]} onChange={(e) => handleSplitChange(m.id, e.target.checked)} 
                          style={{ width: 18, height: 18, accentColor: '#6366f1', cursor: 'pointer' }} />
                      </label>
                    )}
                    
                    {splitMode === 'exact' && (
                      <div style={{ position: 'relative', width: 90 }}>
                        <span style={{ position: 'absolute', left: 10, top: 8, color: '#64748b', fontSize: 13 }}>₹</span>
                        <input type="number" step="0.01" min="0" placeholder="0" value={splits[m.id]} onChange={(e) => handleSplitChange(m.id, e.target.value)}
                          style={{ ...inputStyle, padding: '8px 8px 8px 24px', fontSize: 13 }} />
                      </div>
                    )}
                    
                    {splitMode === 'percentage' && (
                      <div style={{ position: 'relative', width: 80 }}>
                        <span style={{ position: 'absolute', right: 10, top: 8, color: '#64748b', fontSize: 13 }}>%</span>
                        <input type="number" step="0.1" min="0" max="100" placeholder="0" value={splits[m.id]} onChange={(e) => handleSplitChange(m.id, e.target.value)}
                          style={{ ...inputStyle, padding: '8px 24px 8px 12px', fontSize: 13 }} />
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </form>
        </div>

        <div style={{ display: 'flex', gap: 12, marginTop: 24, paddingTop: 16, borderTop: '1px solid rgba(255,255,255,0.08)' }}>
          <button type="button" onClick={onClose} style={{
            flex: 1, padding: '14px', borderRadius: 12, border: '1px solid rgba(255,255,255,0.1)',
            background: 'transparent', color: '#f8fafc', fontSize: 14, fontWeight: 600, cursor: 'pointer',
            transition: 'all 0.2s'
          }} onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.05)'} onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
            Cancel
          </button>
          <button type="submit" form="expense-form" disabled={saving} style={{
            flex: 1.5, padding: '14px', borderRadius: 12, border: 'none',
            background: saving ? 'rgba(99,102,241,0.5)' : 'linear-gradient(135deg, #6366f1, #8b5cf6)', 
            color: '#fff', fontSize: 14, fontWeight: 600, cursor: saving ? 'not-allowed' : 'pointer',
            boxShadow: saving ? 'none' : '0 4px 15px rgba(99,102,241,0.3)', transition: 'all 0.2s'
          }}>
            {saving ? 'Adding...' : 'Split Expense'}
          </button>
        </div>
      </div>

      <style>{`
        @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
        @keyframes slideUp { from { opacity: 0; transform: translateY(20px) scale(0.95); } to { opacity: 1; transform: translateY(0) scale(1); } }
        input[type="number"]::-webkit-inner-spin-button,
        input[type="number"]::-webkit-outer-spin-button {
          -webkit-appearance: none;
          margin: 0;
        }
        input[type="number"] {
          -moz-appearance: textfield;
        }
      `}</style>
    </div>
  );
}
