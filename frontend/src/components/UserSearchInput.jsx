import { useState, useEffect, useRef } from 'react';
import api from '../api/axiosInstance';
import Avatar from './Avatar';

/**
 * Debounced search input that queries /api/users/search
 * and renders a dropdown of results.
 */
export default function UserSearchInput({ onSelect, excludeIds = [], placeholder = 'Search by name, email or phone...' }) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const debounceRef = useRef(null);
  const containerRef = useRef(null);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (query.length < 2) { setResults([]); return; }

    debounceRef.current = setTimeout(async () => {
      setLoading(true);
      try {
        const { data } = await api.get(`/users/search?q=${encodeURIComponent(query)}`);
        setResults(data.users.filter((u) => !excludeIds.includes(u.id)));
      } catch { setResults([]); }
      finally { setLoading(false); }
    }, 300);
  }, [query]);

  // Close dropdown on outside click
  useEffect(() => {
    const handler = (e) => { if (!containerRef.current?.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const handleSelect = (user) => {
    onSelect(user);
    setQuery('');
    setResults([]);
    setOpen(false);
  };

  return (
    <div ref={containerRef} className="relative">
      <input
        id="user-search-input"
        type="text"
        value={query}
        onChange={(e) => { setQuery(e.target.value); setOpen(true); }}
        onFocus={() => setOpen(true)}
        placeholder={placeholder}
        className="w-full px-4 py-3 rounded-xl text-sm outline-none transition-all"
        style={{
          background: 'rgba(255,255,255,0.05)',
          border: '1px solid var(--color-border)',
          color: 'var(--color-text)',
        }}
        onFocusCapture={(e) => (e.target.style.borderColor = '#6366f1')}
        onBlurCapture={(e) => (e.target.style.borderColor = 'var(--color-border)')}
      />

      {open && (query.length >= 2) && (
        <div className="absolute top-full left-0 right-0 mt-2 rounded-xl z-50 overflow-hidden"
          style={{ background: 'var(--color-surface-2)', border: '1px solid var(--color-border)', boxShadow: '0 20px 40px rgba(0,0,0,0.4)' }}>
          {loading && (
            <div className="px-4 py-3 text-sm" style={{ color: 'var(--color-text-muted)' }}>Searching...</div>
          )}
          {!loading && results.length === 0 && (
            <div className="px-4 py-3 text-sm" style={{ color: 'var(--color-text-muted)' }}>No users found.</div>
          )}
          {results.map((user) => (
            <button
              key={user.id}
              onClick={() => handleSelect(user)}
              className="w-full flex items-center gap-3 px-4 py-3 transition-all text-left"
              style={{ color: 'var(--color-text)' }}
              onMouseEnter={(e) => (e.currentTarget.style.background = 'rgba(99,102,241,0.1)')}
              onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
            >
              <Avatar name={user.name} color={user.avatarColor} size={36} />
              <div>
                <div className="font-medium text-sm">{user.name}</div>
                <div className="text-xs" style={{ color: 'var(--color-text-muted)' }}>{user.email}</div>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
