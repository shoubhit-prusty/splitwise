import { useEffect, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import api from '../api/axiosInstance';
import { useAuth } from '../context/AuthContext';
import Avatar from '../components/Avatar';

const fmt = (n) => `₹${Math.abs(parseFloat(n)).toLocaleString('en-IN', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
const fmtDate = (d) => new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });

export default function GroupPage() {
  const { id } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [group, setGroup] = useState(null);
  const [balances, setBalances] = useState(null);
  const [settlements, setSettlements] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('expenses');

  useEffect(() => { fetchGroup(); }, [id]);

  const fetchGroup = async () => {
    setLoading(true);
    try {
      const [groupRes, settleRes] = await Promise.all([
        api.get(`/groups/${id}`),
        api.get(`/settlements/groups/${id}`),
      ]);
      setGroup(groupRes.data.group);
      setBalances(groupRes.data.balances);
      setSettlements(settleRes.data.settlements);
    } catch { navigate('/dashboard'); }
    finally { setLoading(false); }
  };

  const handleSettle = async (settlement) => {
    try {
      await api.post(`/settlements/groups/${id}/settle`, {
        toUserId: settlement.to.id,
        amount: settlement.amount,
      });
      fetchGroup();
    } catch (err) { alert(err.response?.data?.error || 'Failed to settle.'); }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: 'var(--color-bg)' }}>
        <div className="text-center">
          <div className="w-12 h-12 rounded-full border-2 border-transparent mx-auto mb-4"
            style={{ borderTopColor: '#6366f1', animation: 'spin 1s linear infinite' }} />
          <p style={{ color: 'var(--color-text-muted)' }}>Loading group...</p>
        </div>
      </div>
    );
  }

  const tabs = ['expenses', 'members', 'settle up'];

  return (
    <div className="min-h-screen" style={{ background: 'var(--color-bg)' }}>
      {/* Header */}
      <div className="sticky top-0 z-40 px-6 py-4"
        style={{ background: 'rgba(15,15,26,0.9)', backdropFilter: 'blur(16px)', borderBottom: '1px solid var(--color-border)' }}>
        <div className="max-w-3xl mx-auto flex items-center gap-4">
          <Link to="/dashboard" className="text-lg opacity-60 hover:opacity-100 transition-opacity"
            style={{ color: 'var(--color-text)' }}>← </Link>
          <span className="text-2xl">{group?.icon}</span>
          <div>
            <h1 className="font-bold text-lg" style={{ color: 'var(--color-text)' }}>{group?.name}</h1>
            <p className="text-xs" style={{ color: 'var(--color-text-muted)' }}>
              {group?.members.length} members
            </p>
          </div>
          <Link to={`/groups/${id}/scan`} className="ml-auto flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium text-white"
            style={{ background: 'linear-gradient(135deg, #f97316, #ec4899)', boxShadow: '0 4px 15px rgba(249,115,22,0.3)' }}>
            📷 Scan Receipt
          </Link>
        </div>

        {/* Tabs */}
        <div className="max-w-3xl mx-auto mt-4 flex gap-1">
          {tabs.map((tab) => (
            <button key={tab} onClick={() => setActiveTab(tab)}
              className="px-4 py-1.5 rounded-lg text-sm font-medium capitalize transition-all"
              style={{
                background: activeTab === tab ? 'rgba(99,102,241,0.2)' : 'transparent',
                color: activeTab === tab ? '#6366f1' : 'var(--color-text-muted)',
                border: activeTab === tab ? '1px solid rgba(99,102,241,0.3)' : '1px solid transparent',
              }}>
              {tab}
            </button>
          ))}
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-6 py-6">
        {/* Balances bar */}
        {balances && (
          <div className="grid grid-cols-2 gap-4 mb-6">
            <div className="glass rounded-xl p-4">
              <p className="text-xs" style={{ color: 'var(--color-text-muted)' }}>You are owed</p>
              <p className="text-xl font-bold mt-1" style={{ color: '#22c55e' }}>{fmt(balances.youAreOwed)}</p>
            </div>
            <div className="glass rounded-xl p-4">
              <p className="text-xs" style={{ color: 'var(--color-text-muted)' }}>You owe</p>
              <p className="text-xl font-bold mt-1" style={{ color: '#f43f5e' }}>{fmt(balances.youOwe)}</p>
            </div>
          </div>
        )}

        {/* Expenses tab */}
        {activeTab === 'expenses' && (
          <div className="space-y-3">
            {group?.expenses.length === 0 ? (
              <div className="glass rounded-2xl p-10 text-center">
                <div className="text-4xl mb-3">🧾</div>
                <p className="font-medium" style={{ color: 'var(--color-text)' }}>No expenses yet</p>
                <p className="text-sm mt-1" style={{ color: 'var(--color-text-muted)' }}>
                  Scan a receipt or add an expense to get started
                </p>
              </div>
            ) : group?.expenses.map((exp) => (
              <div key={exp.id} className="glass rounded-xl p-4 flex items-center gap-4">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center text-lg"
                  style={{ background: 'rgba(99,102,241,0.15)' }}>
                  {exp.splitType === 'itemized' ? '🧾' : '💳'}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium truncate" style={{ color: 'var(--color-text)' }}>{exp.description}</p>
                  <p className="text-xs mt-0.5" style={{ color: 'var(--color-text-muted)' }}>
                    Paid by <span style={{ color: exp.payer.id === user?.id ? '#6366f1' : 'var(--color-text)' }}>
                      {exp.payer.id === user?.id ? 'you' : exp.payer.name}
                    </span> · {fmtDate(exp.createdAt)}
                  </p>
                </div>
                <div className="text-right shrink-0">
                  <p className="font-bold" style={{ color: 'var(--color-text)' }}>{fmt(exp.totalAmount)}</p>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Members tab */}
        {activeTab === 'members' && (
          <div className="space-y-3">
            {group?.members.map((m) => (
              <div key={m.userId} className="glass rounded-xl p-4 flex items-center gap-4">
                <Avatar name={m.user.name} color={m.user.avatarColor} size={44} />
                <div className="flex-1">
                  <p className="font-medium" style={{ color: 'var(--color-text)' }}>
                    {m.user.name} {m.userId === user?.id && <span className="text-xs opacity-50">(you)</span>}
                  </p>
                  <p className="text-xs mt-0.5" style={{ color: 'var(--color-text-muted)' }}>{m.user.email}</p>
                </div>
                <div className="flex items-center gap-2">
                  <span className={`px-2 py-0.5 rounded-full text-xs font-medium`}
                    style={{
                      background: m.dietType === 'veg' ? 'rgba(34,197,94,0.15)' : 'rgba(249,115,22,0.15)',
                      color: m.dietType === 'veg' ? '#22c55e' : '#f97316',
                      border: `1px solid ${m.dietType === 'veg' ? 'rgba(34,197,94,0.3)' : 'rgba(249,115,22,0.3)'}`,
                    }}>
                    {m.dietType === 'veg' ? '🟢 Veg' : '🍖 Everything'}
                  </span>
                  <span className="px-2 py-0.5 rounded-full text-xs"
                    style={{ background: 'rgba(99,102,241,0.1)', color: '#6366f1' }}>
                    {m.role}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Settle up tab */}
        {activeTab === 'settle up' && (
          <div className="space-y-3">
            {settlements.length === 0 ? (
              <div className="glass rounded-2xl p-10 text-center">
                <div className="text-4xl mb-3">🎉</div>
                <p className="font-medium" style={{ color: 'var(--color-text)' }}>All settled up!</p>
                <p className="text-sm mt-1" style={{ color: 'var(--color-text-muted)' }}>No outstanding balances</p>
              </div>
            ) : settlements.map((s, i) => (
              <div key={i} className="glass rounded-xl p-4 flex items-center gap-4">
                <Avatar name={s.from?.name} color={s.from?.avatarColor} size={40} />
                <div className="flex-1">
                  <p className="text-sm font-medium" style={{ color: 'var(--color-text)' }}>
                    <span style={{ color: s.from?.id === user?.id ? '#6366f1' : 'var(--color-text)' }}>
                      {s.from?.id === user?.id ? 'You' : s.from?.name}
                    </span>
                    {' → '}
                    <span style={{ color: s.to?.id === user?.id ? '#22c55e' : 'var(--color-text)' }}>
                      {s.to?.id === user?.id ? 'You' : s.to?.name}
                    </span>
                  </p>
                  <p className="text-xl font-bold mt-0.5" style={{ color: '#f43f5e' }}>{fmt(s.amount)}</p>
                </div>
                {s.from?.id === user?.id && (
                  <button onClick={() => handleSettle(s)}
                    className="px-4 py-2 rounded-xl text-sm font-medium text-white"
                    style={{ background: 'linear-gradient(135deg, #22c55e, #14b8a6)', boxShadow: '0 4px 15px rgba(34,197,94,0.3)' }}>
                    Mark Paid ✓
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
