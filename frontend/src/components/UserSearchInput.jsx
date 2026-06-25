import { useEffect, useState, useRef } from 'react';
import api from '../api/axiosInstance';
import Avatar from './Avatar';

export default function UserSearchInput({ onSelect, excludeIds = [] }) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const wrapperRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target)) setIsOpen(false);
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    const search = async () => {
      if (query.length < 2) { setResults([]); return; }
      setLoading(true);
      try {
        const { data } = await api.get(`/users/search?q=${query}`);
        setResults(data.users.filter((u) => !excludeIds.includes(u.id)));
      } catch {}
      finally { setLoading(false); }
    };
    const to = setTimeout(search, 300);
    return () => clearTimeout(to);
  }, [query, excludeIds]);

  return (
    <div ref={wrapperRef} style={{ position: 'relative' }}>
      <div style={{ position: 'relative' }}>
        <span style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', fontSize: 16, opacity: 0.4 }}>🔍</span>
        <input value={query} onChange={(e) => { setQuery(e.target.value); setIsOpen(true); }}
          placeholder="Search by name, email or phone..."
          style={{
            width: '100%', padding: '14px 16px 14px 44px', borderRadius: 12,
            background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)',
            color: '#f8fafc', fontSize: 14, outline: 'none', transition: 'all 0.2s ease',
          }}
          onFocus={(e) => { setIsOpen(true); e.target.style.borderColor = 'rgba(99,102,241,0.5)'; e.target.style.background = 'rgba(99,102,241,0.03)'; }}
          onBlur={(e) => { e.target.style.borderColor = 'rgba(255,255,255,0.08)'; e.target.style.background = 'rgba(255,255,255,0.03)'; }} />
        {loading && <div style={{ position: 'absolute', right: 14, top: '50%', transform: 'translateY(-50%)', width: 14, height: 14, border: '2px solid rgba(255,255,255,0.2)', borderTopColor: '#fff', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />}
      </div>

      {isOpen && query.length >= 2 && (
        <div style={{
          position: 'absolute', top: 'calc(100% + 8px)', left: 0, right: 0, zIndex: 50,
          background: '#131320', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 16,
          boxShadow: '0 12px 40px rgba(0,0,0,0.5)', overflow: 'hidden', padding: 8,
          animation: 'fadeDown 0.2s ease forwards',
        }}>
          {results.length === 0 && !loading ? (
            <div style={{ padding: '24px 16px', textAlign: 'center', color: '#64748b', fontSize: 14 }}>
              No users found matching "{query}"
            </div>
          ) : (
            <div style={{ maxHeight: 240, overflowY: 'auto' }}>
              {results.map((u) => (
                <div key={u.id} onClick={() => { onSelect(u); setQuery(''); setIsOpen(false); }}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 12, padding: '10px 12px',
                    borderRadius: 10, cursor: 'pointer', transition: 'background 0.15s',
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.04)'}
                  onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                >
                  <Avatar name={u.name} color={u.avatarColor} size={36} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 14, fontWeight: 600, color: '#f8fafc', marginBottom: 2 }}>{u.name}</div>
                    <div style={{ fontSize: 12, color: '#64748b' }}>{u.email}</div>
                  </div>
                  <button style={{
                    background: 'rgba(99,102,241,0.1)', color: '#818cf8', border: 'none',
                    padding: '4px 12px', borderRadius: 20, fontSize: 12, fontWeight: 600, cursor: 'pointer',
                  }}>Add</button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
      <style>{`@keyframes fadeDown { from { opacity: 0; transform: translateY(-8px); } to { opacity: 1; transform: translateY(0); } }`}</style>
    </div>
  );
}
