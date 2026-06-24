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
    if (!members.find((m) => m.id === user.id)) {
      setMembers([...members, user]);
    }
  };

  const removeMember = (userId) => setMembers(members.filter((m) => m.id !== userId));

  const handleCreate = async () => {
    if (!name.trim()) return setError('Group name is required.');
    setLoading(true);
    setError('');
    try {
      const { data } = await api.post('/groups', {
        name,
        icon,
        description,
        memberIds: members.map((m) => m.id),
      });
      onCreated(data.group);
      onClose();
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to create group.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(4px)' }}
      onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="w-full max-w-lg rounded-2xl p-6 animate-fade-in-up"
        style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)' }}>

        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold" style={{ color: 'var(--color-text)' }}>Create Group</h2>
          <button onClick={onClose} className="text-2xl leading-none opacity-50 hover:opacity-100 transition-opacity"
            style={{ color: 'var(--color-text)' }}>×</button>
        </div>

        {error && (
          <div className="mb-4 p-3 rounded-xl text-sm"
            style={{ background: 'rgba(244,63,94,0.15)', border: '1px solid rgba(244,63,94,0.3)', color: '#f43f5e' }}>
            {error}
          </div>
        )}

        {/* Icon picker */}
        <div className="mb-4">
          <label className="block text-sm font-medium mb-2" style={{ color: 'var(--color-text-muted)' }}>Group icon</label>
          <div className="flex gap-2 flex-wrap">
            {GROUP_ICONS.map((ic) => (
              <button key={ic} onClick={() => setIcon(ic)}
                className="w-10 h-10 rounded-xl text-xl transition-all"
                style={{
                  background: icon === ic ? 'rgba(99,102,241,0.3)' : 'rgba(255,255,255,0.05)',
                  border: `1px solid ${icon === ic ? '#6366f1' : 'var(--color-border)'}`,
                }}>
                {ic}
              </button>
            ))}
          </div>
        </div>

        {/* Name */}
        <div className="mb-4">
          <label className="block text-sm font-medium mb-2" style={{ color: 'var(--color-text-muted)' }}>Group name</label>
          <input id="group-name-input" value={name} onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Flatmates, Trip to Goa..."
            className="w-full px-4 py-3 rounded-xl text-sm outline-none transition-all"
            style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid var(--color-border)', color: 'var(--color-text)' }}
            onFocus={(e) => (e.target.style.borderColor = '#6366f1')}
            onBlur={(e) => (e.target.style.borderColor = 'var(--color-border)')} />
        </div>

        {/* Description */}
        <div className="mb-4">
          <label className="block text-sm font-medium mb-2" style={{ color: 'var(--color-text-muted)' }}>
            Description <span className="opacity-60 text-xs">(optional)</span>
          </label>
          <input id="group-desc-input" value={description} onChange={(e) => setDescription(e.target.value)}
            placeholder="What's this group for?"
            className="w-full px-4 py-3 rounded-xl text-sm outline-none transition-all"
            style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid var(--color-border)', color: 'var(--color-text)' }}
            onFocus={(e) => (e.target.style.borderColor = '#6366f1')}
            onBlur={(e) => (e.target.style.borderColor = 'var(--color-border)')} />
        </div>

        {/* Member search */}
        <div className="mb-4">
          <label className="block text-sm font-medium mb-2" style={{ color: 'var(--color-text-muted)' }}>Add members</label>
          <UserSearchInput onSelect={addMember} excludeIds={members.map((m) => m.id)} />
        </div>

        {/* Selected members */}
        {members.length > 0 && (
          <div className="flex flex-wrap gap-2 mb-4">
            {members.map((m) => (
              <div key={m.id} className="flex items-center gap-2 px-3 py-1.5 rounded-full"
                style={{ background: 'rgba(99,102,241,0.15)', border: '1px solid rgba(99,102,241,0.3)' }}>
                <Avatar name={m.name} color={m.avatarColor} size={22} />
                <span className="text-sm font-medium" style={{ color: 'var(--color-text)' }}>{m.name}</span>
                <button onClick={() => removeMember(m.id)} className="opacity-60 hover:opacity-100 text-sm leading-none"
                  style={{ color: 'var(--color-text)' }}>×</button>
              </div>
            ))}
          </div>
        )}

        <div className="flex gap-3 mt-6">
          <button onClick={onClose} className="flex-1 py-3 rounded-xl font-medium transition-all"
            style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid var(--color-border)', color: 'var(--color-text-muted)' }}>
            Cancel
          </button>
          <button id="create-group-btn" onClick={handleCreate} disabled={loading}
            className="flex-1 py-3 rounded-xl font-semibold text-white transition-all"
            style={{
              background: loading ? 'rgba(99,102,241,0.5)' : 'linear-gradient(135deg, #6366f1, #8b5cf6)',
              boxShadow: loading ? 'none' : '0 4px 20px rgba(99,102,241,0.4)',
            }}>
            {loading ? 'Creating...' : `Create ${icon}`}
          </button>
        </div>
      </div>
    </div>
  );
}
