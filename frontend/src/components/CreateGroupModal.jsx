import { useState } from 'react';
import api from '../api/axiosInstance';
import UserSearchInput from './UserSearchInput';
import Avatar from './Avatar';

const GROUP_ICONS = ['🏠', '✈️', '🍕', '🎉', '💼', '🏖️', '🎮', '🛒', '🏋️', '🎓'];

export default function CreateGroupModal({ onClose, onCreated }) {
  const [name, setName] = useState('');
  const [icon, setIcon] = useState('🏠');
  const [description, setDescription] = useState('');
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const addMember = (user) => {
    if (!members.find((m) => m.id === user.id)) setMembers([...members, user]);
  };
  const removeMember = (userId) => setMembers(members.filter((m) => m.id !== userId));

  const handleCreate = async () => {
    if (!name.trim()) return setError('Group name is required.');
    setLoading(true); setError('');
    try {
      const { data } = await api.post('/groups', { name, icon, description, memberIds: members.map((m) => m.id) });
      onCreated(data.group);
      onClose();
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to create group.');
    } finally { setLoading(false); }
  };

  const inputStyle = {
    width: '100%', padding: '14px 16px', borderRadius: 12,
    background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)',
    color: '#f8fafc', fontSize: 14, outline: 'none', transition: 'all 0.2s ease',
  };

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: 'rgba(6,6,18,0.7)', backdropFilter: 'blur(12px)', padding: 20,
    }} onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div style={{
        width: '100%', maxWidth: 480, background: '#0f0f1a', borderRadius: 24, padding: 32,
        border: '1px solid rgba(255,255,255,0.08)', boxShadow: '0 32px 64px rgba(0,0,0,0.5)',
        position: 'relative', overflow: 'hidden', animation: 'scaleUp 0.3s cubic-bezier(0.16, 1, 0.3, 1)',
      }}>
        {/* Glow effect */}
        <div style={{ position: 'absolute', top: -50, left: '50%', transform: 'translateX(-50%)', width: 200, height: 100, background: 'rgba(99,102,241,0.2)', filter: 'blur(50px)', borderRadius: '50%' }} />

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 28, position: 'relative' }}>
          <div>
            <h2 style={{ fontSize: 24, fontWeight: 700, color: '#f8fafc', letterSpacing: '-0.5px', margin: '0 0 4px' }}>Create Group</h2>
            <p style={{ fontSize: 14, color: '#64748b', margin: 0 }}>Start splitting expenses with friends</p>
          </div>
          <button onClick={onClose} style={{
            background: 'rgba(255,255,255,0.05)', border: 'none', width: 32, height: 32, borderRadius: '50%',
            display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#94a3b8', fontSize: 18, cursor: 'pointer', transition: 'all 0.2s'
          }} onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.1)'} onMouseLeave={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.05)'}>×</button>
        </div>

        {error && (
          <div style={{ padding: '12px 16px', borderRadius: 12, marginBottom: 24, background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)', color: '#fca5a5', fontSize: 14 }}>
            ⚠️ {error}
          </div>
        )}

        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          {/* Icon */}
          <div>
            <label style={{ display: 'block', fontSize: 13, fontWeight: 500, color: '#94a3b8', marginBottom: 8 }}>Choose an icon</label>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              {GROUP_ICONS.map((ic) => (
                <button key={ic} onClick={() => setIcon(ic)} style={{
                  width: 42, height: 42, borderRadius: 12, fontSize: 20, cursor: 'pointer', transition: 'all 0.2s',
                  background: icon === ic ? 'rgba(99,102,241,0.2)' : 'rgba(255,255,255,0.03)',
                  border: `1px solid ${icon === ic ? '#6366f1' : 'rgba(255,255,255,0.05)'}`,
                  transform: icon === ic ? 'scale(1.05)' : 'scale(1)',
                }}>{ic}</button>
              ))}
            </div>
          </div>

          {/* Name */}
          <div>
            <label style={{ display: 'block', fontSize: 13, fontWeight: 500, color: '#94a3b8', marginBottom: 8 }}>Group name</label>
            <input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Goa Trip 2024" style={inputStyle}
              onFocus={(e) => { e.target.style.borderColor = 'rgba(99,102,241,0.5)'; e.target.style.background = 'rgba(99,102,241,0.03)'; }}
              onBlur={(e) => { e.target.style.borderColor = 'rgba(255,255,255,0.08)'; e.target.style.background = 'rgba(255,255,255,0.03)'; }} />
          </div>

          {/* Desc */}
          <div>
            <label style={{ display: 'block', fontSize: 13, fontWeight: 500, color: '#94a3b8', marginBottom: 8 }}>Description <span style={{ color: '#475569', fontWeight: 400 }}>(optional)</span></label>
            <input value={description} onChange={(e) => setDescription(e.target.value)} placeholder="What's the occasion?" style={inputStyle}
              onFocus={(e) => { e.target.style.borderColor = 'rgba(99,102,241,0.5)'; e.target.style.background = 'rgba(99,102,241,0.03)'; }}
              onBlur={(e) => { e.target.style.borderColor = 'rgba(255,255,255,0.08)'; e.target.style.background = 'rgba(255,255,255,0.03)'; }} />
          </div>

          {/* Members */}
          <div>
            <label style={{ display: 'block', fontSize: 13, fontWeight: 500, color: '#94a3b8', marginBottom: 8 }}>Add friends</label>
            <UserSearchInput onSelect={addMember} excludeIds={members.map((m) => m.id)} />
            {members.length > 0 && (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 12 }}>
                {members.map((m) => (
                  <div key={m.id} style={{
                    display: 'flex', alignItems: 'center', gap: 8, padding: '6px 12px 6px 6px',
                    borderRadius: 20, background: 'rgba(99,102,241,0.1)', border: '1px solid rgba(99,102,241,0.2)'
                  }}>
                    <Avatar name={m.name} color={m.avatarColor} size={24} />
                    <span style={{ fontSize: 13, fontWeight: 500, color: '#e2e8f0' }}>{m.name.split(' ')[0]}</span>
                    <button onClick={() => removeMember(m.id)} style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer', fontSize: 14, marginLeft: 2 }}>×</button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <div style={{ display: 'flex', gap: 12, marginTop: 32 }}>
          <button onClick={onClose} style={{
            flex: 1, padding: '14px', borderRadius: 12, border: '1px solid rgba(255,255,255,0.08)',
            background: 'rgba(255,255,255,0.03)', color: '#f8fafc', fontSize: 14, fontWeight: 600, cursor: 'pointer', transition: 'all 0.2s'
          }} onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.06)'} onMouseLeave={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.03)'}>Cancel</button>
          
          <button onClick={handleCreate} disabled={loading} style={{
            flex: 2, padding: '14px', borderRadius: 12, border: 'none',
            background: loading ? 'rgba(99,102,241,0.3)' : 'linear-gradient(135deg, #6366f1, #8b5cf6)',
            color: '#fff', fontSize: 14, fontWeight: 600, cursor: loading ? 'not-allowed' : 'pointer',
            boxShadow: loading ? 'none' : '0 8px 24px rgba(99,102,241,0.35)', transition: 'all 0.2s',
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8
          }}>
            {loading ? 'Creating...' : `Create ${icon}`}
          </button>
        </div>
      </div>
      <style>{`@keyframes scaleUp { from { opacity: 0; transform: scale(0.95); } to { opacity: 1; transform: scale(1); } }`}</style>
    </div>
  );
}
