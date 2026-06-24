import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import api from '../api/axiosInstance';
import { useAuth } from '../context/AuthContext';
import CreateGroupModal from '../components/CreateGroupModal';
import Avatar from '../components/Avatar';

const fmt = (n) => `₹${Math.abs(n).toLocaleString('en-IN', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;

export default function DashboardPage() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [groups, setGroups] = useState([]);
  const [summary, setSummary] = useState({ totalOwed: 0, totalOwe: 0, netBalance: 0 });
  const [showCreate, setShowCreate] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [groupsRes, summaryRes] = await Promise.all([
        api.get('/groups'),
        api.get('/settlements/dashboard'),
      ]);
      setGroups(groupsRes.data.groups);
      setSummary(summaryRes.data.summary);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleGroupCreated = (newGroup) => {
    setGroups((prev) => [newGroup, ...prev]);
    fetchData();
  };

  return (
    <div className="min-h-screen" style={{ background: 'var(--color-bg)' }}>
      {/* Navbar */}
      <nav className="sticky top-0 z-40 px-6 py-4 flex items-center justify-between"
        style={{ background: 'rgba(15,15,26,0.8)', backdropFilter: 'blur(16px)', borderBottom: '1px solid var(--color-border)' }}>
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg flex items-center justify-center"
            style={{ background: 'linear-gradient(135deg, #6366f1, #ec4899)' }}>
            <span className="text-sm">⚡</span>
          </div>
          <span className="font-bold text-lg gradient-text">SplitWise</span>
        </div>
        <div className="flex items-center gap-4">
          <Avatar name={user?.name} color={user?.avatarColor} size={36} />
          <button onClick={logout} className="text-sm px-3 py-1.5 rounded-lg transition-all"
            style={{ color: 'var(--color-text-muted)', border: '1px solid var(--color-border)' }}
            onMouseEnter={(e) => (e.target.style.color = 'var(--color-text)')}
            onMouseLeave={(e) => (e.target.style.color = 'var(--color-text-muted)')}>
            Logout
          </button>
        </div>
      </nav>

      <div className="max-w-5xl mx-auto px-6 py-8">
        {/* Greeting */}
        <div className="mb-8 animate-fade-in-up">
          <h1 className="text-3xl font-bold" style={{ color: 'var(--color-text)' }}>
            Hey, {user?.name?.split(' ')[0]} 👋
          </h1>
          <p className="mt-1 text-sm" style={{ color: 'var(--color-text-muted)' }}>
            Here's your expense overview
          </p>
        </div>

        {/* Balance cards */}
        <div className="grid grid-cols-3 gap-4 mb-8">
          {/* Total owed to you */}
          <div className="glass rounded-2xl p-5 animate-fade-in-up" style={{ animationDelay: '0.05s' }}>
            <p className="text-xs font-medium uppercase tracking-wider mb-2" style={{ color: 'var(--color-text-muted)' }}>
              You are owed
            </p>
            <p className="text-2xl font-bold" style={{ color: '#22c55e' }}>
              {loading ? '—' : fmt(summary.totalOwed)}
            </p>
            <p className="text-xs mt-1" style={{ color: 'var(--color-text-muted)' }}>across all groups</p>
          </div>
          {/* Total you owe */}
          <div className="glass rounded-2xl p-5 animate-fade-in-up" style={{ animationDelay: '0.1s' }}>
            <p className="text-xs font-medium uppercase tracking-wider mb-2" style={{ color: 'var(--color-text-muted)' }}>
              You owe
            </p>
            <p className="text-2xl font-bold" style={{ color: '#f43f5e' }}>
              {loading ? '—' : fmt(summary.totalOwe)}
            </p>
            <p className="text-xs mt-1" style={{ color: 'var(--color-text-muted)' }}>across all groups</p>
          </div>
          {/* Net balance */}
          <div className="glass rounded-2xl p-5 animate-fade-in-up" style={{ animationDelay: '0.15s' }}>
            <p className="text-xs font-medium uppercase tracking-wider mb-2" style={{ color: 'var(--color-text-muted)' }}>
              Net balance
            </p>
            <p className="text-2xl font-bold"
              style={{ color: summary.netBalance >= 0 ? '#22c55e' : '#f43f5e' }}>
              {loading ? '—' : (summary.netBalance >= 0 ? '+' : '') + fmt(summary.netBalance)}
            </p>
            <p className="text-xs mt-1" style={{ color: 'var(--color-text-muted)' }}>
              {summary.netBalance >= 0 ? 'You\'re ahead 🎉' : 'You\'re behind 😬'}
            </p>
          </div>
        </div>

        {/* Groups section */}
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold" style={{ color: 'var(--color-text)' }}>Your Groups</h2>
          <button id="create-group-open-btn" onClick={() => setShowCreate(true)}
            className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium text-white transition-all"
            style={{ background: 'linear-gradient(135deg, #6366f1, #8b5cf6)', boxShadow: '0 4px 15px rgba(99,102,241,0.3)' }}
            onMouseEnter={(e) => (e.currentTarget.style.transform = 'translateY(-1px)')}
            onMouseLeave={(e) => (e.currentTarget.style.transform = 'translateY(0)')}>
            <span>+</span> New Group
          </button>
        </div>

        {loading ? (
          <div className="grid grid-cols-2 gap-4">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="skeleton h-28 rounded-2xl" />
            ))}
          </div>
        ) : groups.length === 0 ? (
          <div className="glass rounded-2xl p-12 text-center">
            <div className="text-5xl mb-4">🏠</div>
            <p className="font-medium mb-1" style={{ color: 'var(--color-text)' }}>No groups yet</p>
            <p className="text-sm" style={{ color: 'var(--color-text-muted)' }}>
              Create a group to start splitting expenses
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {groups.map((group, i) => (
              <Link key={group.id} to={`/groups/${group.id}`}
                className="glass rounded-2xl p-5 transition-all block animate-fade-in-up"
                style={{ animationDelay: `${i * 0.05}s`, textDecoration: 'none' }}
                onMouseEnter={(e) => { e.currentTarget.style.borderColor = 'rgba(99,102,241,0.4)'; e.currentTarget.style.transform = 'translateY(-2px)'; }}
                onMouseLeave={(e) => { e.currentTarget.style.borderColor = 'var(--color-border)'; e.currentTarget.style.transform = 'translateY(0)'; }}>
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <span className="text-2xl">{group.icon}</span>
                    <div>
                      <p className="font-semibold" style={{ color: 'var(--color-text)' }}>{group.name}</p>
                      <p className="text-xs" style={{ color: 'var(--color-text-muted)' }}>
                        {group.members.length} member{group.members.length !== 1 ? 's' : ''} · {group._count.expenses} expense{group._count.expenses !== 1 ? 's' : ''}
                      </p>
                    </div>
                  </div>
                </div>
                {/* Member avatars */}
                <div className="flex -space-x-2">
                  {group.members.slice(0, 5).map((m) => (
                    <Avatar key={m.userId} name={m.user.name} color={m.user.avatarColor} size={28} />
                  ))}
                  {group.members.length > 5 && (
                    <div className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-medium"
                      style={{ background: 'rgba(99,102,241,0.3)', border: '2px solid var(--color-bg)', color: '#6366f1' }}>
                      +{group.members.length - 5}
                    </div>
                  )}
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>

      {showCreate && (
        <CreateGroupModal onClose={() => setShowCreate(false)} onCreated={handleGroupCreated} />
      )}
    </div>
  );
}
