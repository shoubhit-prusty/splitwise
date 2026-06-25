import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import api from '../api/axiosInstance';
import { useAuth } from '../context/AuthContext';
import CreateGroupModal from '../components/CreateGroupModal';
import ProfileModal from '../components/ProfileModal';
import Avatar from '../components/Avatar';

const fmt = (n) =>
  '₹' + Math.abs(n).toLocaleString('en-IN', { minimumFractionDigits: 0, maximumFractionDigits: 2 });

export default function DashboardPage() {
  const { user, logout } = useAuth();
  const [groups, setGroups] = useState([]);
  const [summary, setSummary] = useState({ totalOwed: 0, totalOwe: 0, netBalance: 0 });
  const [showCreate, setShowCreate] = useState(false);
  const [showProfile, setShowProfile] = useState(false);
  const [loading, setLoading] = useState(true);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [activeTab, setActiveTab] = useState('Dashboard');

  useEffect(() => { fetchData(); }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [g, s] = await Promise.all([
        api.get('/groups'), 
        api.get('/settlements/dashboard')
      ]);
      setGroups(g.data.groups);
      setSummary(s.data.summary);
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  };

  const netPositive = summary.netBalance >= 0;

  return (
    <div style={{
      minHeight: '100vh', display: 'flex',
      background: '#060612', fontFamily: "'Inter', -apple-system, sans-serif",
      color: '#e2e8f0',
    }}>
      {/* Background glow */}
      <div style={{
        position: 'fixed', inset: 0, zIndex: 0, pointerEvents: 'none',
        background: 'radial-gradient(ellipse 50% 40% at 20% 20%, rgba(99,102,241,0.08) 0%, transparent 60%), radial-gradient(ellipse 40% 30% at 80% 80%, rgba(236,72,153,0.06) 0%, transparent 60%)',
      }} />

      {/* Sidebar */}
      <aside style={{
        width: 240, flexShrink: 0, display: 'flex', flexDirection: 'column',
        background: 'rgba(255,255,255,0.02)',
        borderRight: '1px solid rgba(255,255,255,0.06)',
        position: 'fixed', top: 0, left: 0, bottom: 0, zIndex: 10,
        padding: '24px 16px',
      }}>
        {/* Logo */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 40, padding: '0 8px' }}>
          <div style={{
            width: 34, height: 34, borderRadius: 10,
            background: 'linear-gradient(135deg, #6366f1, #a855f7)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 16, boxShadow: '0 0 16px rgba(99,102,241,0.4)',
          }}>⚡</div>
          <span style={{ fontSize: 17, fontWeight: 700, letterSpacing: '-0.3px', color: '#fff' }}>SplitWise</span>
        </div>

        {/* Nav */}
        <nav style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 2 }}>
          {[
            { icon: '⊞', label: 'Dashboard' },
            { icon: '👥', label: 'Groups' },
            { icon: '📊', label: 'Activity' },
          ].map((item) => (
            <button key={item.label} onClick={() => setActiveTab(item.label)} style={{
              display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px',
              borderRadius: 10, border: 'none', cursor: 'pointer', textAlign: 'left',
              transition: 'all 0.15s',
              background: activeTab === item.label ? 'rgba(99,102,241,0.12)' : 'transparent',
              color: activeTab === item.label ? '#a5b4fc' : '#475569',
              fontWeight: activeTab === item.label ? 600 : 400,
              fontSize: 14, boxShadow: activeTab === item.label ? 'inset 0 0 0 1px rgba(99,102,241,0.2)' : 'none',
            }}>
              <span style={{ fontSize: 16 }}>{item.icon}</span>
              {item.label}
            </button>
          ))}
        </nav>

        {/* User section */}
        <div style={{
          padding: '14px 12px', borderRadius: 12,
          background: 'rgba(255,255,255,0.03)',
          border: '1px solid rgba(255,255,255,0.06)',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
            <Avatar name={user?.name} color={user?.avatarColor} size={34} />
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 13, fontWeight: 600, color: '#e2e8f0', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {user?.name}
              </div>
              <div style={{ fontSize: 11, color: '#475569', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {user?.email}
              </div>
            </div>
            <button onClick={() => setShowProfile(true)} style={{
              background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)',
              width: 28, height: 28, borderRadius: 8, color: '#94a3b8', fontSize: 14, cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.2s', flexShrink: 0
            }} onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.1)'; e.currentTarget.style.color = '#fff'; }}
               onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.05)'; e.currentTarget.style.color = '#94a3b8'; }}
               title="Settings">
              ⚙️
            </button>
          </div>
          <button onClick={logout} style={{
            width: '100%', padding: '8px', borderRadius: 8, border: '1px solid rgba(255,255,255,0.08)',
            background: 'transparent', color: '#475569', fontSize: 12, cursor: 'pointer',
            transition: 'all 0.15s',
          }}
          onMouseEnter={(e) => { e.currentTarget.style.color = '#94a3b8'; e.currentTarget.style.borderColor = 'rgba(255,255,255,0.15)'; }}
          onMouseLeave={(e) => { e.currentTarget.style.color = '#475569'; e.currentTarget.style.borderColor = 'rgba(255,255,255,0.08)'; }}>
            Sign out
          </button>
        </div>
      </aside>

      {/* Main content */}
      <main style={{ marginLeft: 240, flex: 1, padding: '40px 48px', position: 'relative', zIndex: 1, maxWidth: '100%', boxSizing: 'border-box' }}>
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 40 }}>
          <div>
            <h1 style={{ fontSize: 30, fontWeight: 800, color: '#f8fafc', margin: '0 0 6px', letterSpacing: '-0.8px' }}>
              Hey, {user?.name?.split(' ')[0]} 👋
            </h1>
            <p style={{ color: '#475569', fontSize: 14, margin: 0 }}>
              {new Date().toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long' })}
            </p>
          </div>
          <button
            id="create-group-open-btn"
            onClick={() => setShowCreate(true)}
            style={{
              display: 'flex', alignItems: 'center', gap: 8,
              padding: '11px 20px', borderRadius: 12, border: 'none',
              background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
              color: '#fff', fontSize: 14, fontWeight: 600, cursor: 'pointer',
              boxShadow: '0 4px 20px rgba(99,102,241,0.35)',
              transition: 'all 0.2s',
            }}
            onMouseEnter={(e) => { e.currentTarget.style.transform = 'translateY(-1px)'; e.currentTarget.style.boxShadow = '0 8px 28px rgba(99,102,241,0.45)'; }}
            onMouseLeave={(e) => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = '0 4px 20px rgba(99,102,241,0.35)'; }}
          >
            <span style={{ fontSize: 18, lineHeight: 1 }}>+</span> New Group
          </button>
        </div>

        {/* Balance cards */}
        {activeTab === 'Dashboard' && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 20, marginBottom: 40 }}>
            {/* You are owed */}
            <div style={{
              padding: '28px', borderRadius: 20,
              background: 'linear-gradient(135deg, rgba(34,197,94,0.08) 0%, rgba(20,184,166,0.06) 100%)',
              border: '1px solid rgba(34,197,94,0.15)',
              position: 'relative', overflow: 'hidden',
            }}>
              <div style={{ position: 'absolute', top: -20, right: -20, width: 100, height: 100, borderRadius: '50%', background: 'rgba(34,197,94,0.06)', filter: 'blur(20px)' }} />
              <div style={{
                display: 'inline-flex', alignItems: 'center', gap: 6, padding: '4px 10px',
                borderRadius: 20, background: 'rgba(34,197,94,0.1)', border: '1px solid rgba(34,197,94,0.2)',
                fontSize: 11, fontWeight: 600, color: '#4ade80', marginBottom: 16, letterSpacing: '0.5px', textTransform: 'uppercase',
              }}>
                <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#22c55e', display: 'inline-block' }} />
                You're owed
              </div>
              <div style={{ fontSize: 38, fontWeight: 800, color: '#4ade80', letterSpacing: '-1.5px', lineHeight: 1 }}>
                {loading ? '—' : fmt(summary.totalOwed)}
              </div>
              <div style={{ fontSize: 13, color: '#166534', marginTop: 8 }}>across all groups</div>
            </div>

            {/* You owe */}
            <div style={{
              padding: '28px', borderRadius: 20,
              background: 'linear-gradient(135deg, rgba(244,63,94,0.08) 0%, rgba(251,113,133,0.05) 100%)',
              border: '1px solid rgba(244,63,94,0.15)',
              position: 'relative', overflow: 'hidden',
            }}>
              <div style={{ position: 'absolute', top: -20, right: -20, width: 100, height: 100, borderRadius: '50%', background: 'rgba(244,63,94,0.06)', filter: 'blur(20px)' }} />
              <div style={{
                display: 'inline-flex', alignItems: 'center', gap: 6, padding: '4px 10px',
                borderRadius: 20, background: 'rgba(244,63,94,0.1)', border: '1px solid rgba(244,63,94,0.2)',
                fontSize: 11, fontWeight: 600, color: '#f87171', marginBottom: 16, letterSpacing: '0.5px', textTransform: 'uppercase',
              }}>
                <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#f43f5e', display: 'inline-block' }} />
                You owe
              </div>
              <div style={{ fontSize: 38, fontWeight: 800, color: '#f87171', letterSpacing: '-1.5px', lineHeight: 1 }}>
                {loading ? '—' : fmt(summary.totalOwe)}
              </div>
              <div style={{ fontSize: 13, color: '#7f1d1d', marginTop: 8 }}>across all groups</div>
            </div>

            {/* Net balance */}
            <div style={{
              padding: '28px', borderRadius: 20,
              background: netPositive
                ? 'linear-gradient(135deg, rgba(99,102,241,0.1) 0%, rgba(139,92,246,0.07) 100%)'
                : 'linear-gradient(135deg, rgba(249,115,22,0.08) 0%, rgba(234,179,8,0.06) 100%)',
              border: netPositive ? '1px solid rgba(99,102,241,0.2)' : '1px solid rgba(249,115,22,0.2)',
              position: 'relative', overflow: 'hidden',
            }}>
              <div style={{ position: 'absolute', top: -20, right: -20, width: 100, height: 100, borderRadius: '50%', background: 'rgba(99,102,241,0.06)', filter: 'blur(20px)' }} />
              <div style={{
                display: 'inline-flex', alignItems: 'center', gap: 6, padding: '4px 10px',
                borderRadius: 20, background: 'rgba(99,102,241,0.1)', border: '1px solid rgba(99,102,241,0.2)',
                fontSize: 11, fontWeight: 600, color: '#a5b4fc', marginBottom: 16, letterSpacing: '0.5px', textTransform: 'uppercase',
              }}>
                <span style={{ fontSize: 10 }}>◈</span> Net balance
              </div>
              <div style={{
                fontSize: 38, fontWeight: 800, letterSpacing: '-1.5px', lineHeight: 1,
                color: netPositive ? '#818cf8' : '#fb923c',
              }}>
                {loading ? '—' : (netPositive ? '+' : '-') + fmt(summary.netBalance)}
              </div>
              <div style={{ fontSize: 13, marginTop: 8, color: netPositive ? '#3730a3' : '#9a3412' }}>
                {netPositive ? "You're ahead 🎉" : "You're behind 😬"}
              </div>
            </div>
          </div>
        )}

        {/* Groups section */}
        {(activeTab === 'Dashboard' || activeTab === 'Groups') && (
          <>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
              <div>
                <h2 style={{ fontSize: 20, fontWeight: 700, color: '#f1f5f9', margin: '0 0 4px', letterSpacing: '-0.3px' }}>
                  Your Groups
                </h2>
                <p style={{ fontSize: 13, color: '#475569', margin: 0 }}>
                  {groups.length} active group{groups.length !== 1 ? 's' : ''}
                </p>
              </div>
            </div>

            {loading ? (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 16 }}>
                {[...Array(4)].map((_, i) => (
                  <div key={i} style={{
                    height: 140, borderRadius: 20,
                    background: 'linear-gradient(90deg, rgba(255,255,255,0.03) 25%, rgba(255,255,255,0.06) 50%, rgba(255,255,255,0.03) 75%)',
                    backgroundSize: '200% 100%',
                    animation: 'shimmer 1.5s infinite',
                  }} />
                ))}
              </div>
            ) : groups.length === 0 ? (
              <div style={{
                padding: '64px 32px', borderRadius: 24, textAlign: 'center',
                background: 'rgba(255,255,255,0.02)', border: '1px dashed rgba(255,255,255,0.08)',
              }}>
                <div style={{
                  width: 72, height: 72, borderRadius: 20, margin: '0 auto 20px',
                  background: 'rgba(99,102,241,0.1)', border: '1px solid rgba(99,102,241,0.2)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 32,
                }}>👥</div>
                <h3 style={{ fontSize: 20, fontWeight: 700, color: '#f1f5f9', margin: '0 0 8px' }}>
                  No groups yet
                </h3>
                <p style={{ fontSize: 14, color: '#475569', margin: '0 0 24px' }}>
                  Create your first group to start splitting expenses
                </p>
                <button onClick={() => setShowCreate(true)} style={{
                  padding: '12px 28px', borderRadius: 12, border: 'none',
                  background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
                  color: '#fff', fontSize: 14, fontWeight: 600, cursor: 'pointer',
                  boxShadow: '0 4px 20px rgba(99,102,241,0.35)',
                }}>
                  + Create a group
                </button>
              </div>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 16 }}>
                {groups.map((group, i) => (
                  <Link key={group.id} to={`/groups/${group.id}`} style={{ textDecoration: 'none', display: 'block', outline: 'none' }}>
                    <div
                      style={{
                        padding: '24px', borderRadius: 20,
                        background: 'rgba(255,255,255,0.03)',
                        border: '1px solid rgba(255,255,255,0.07)',
                        cursor: 'pointer', transition: 'all 0.2s',
                        animation: `fadeUp 0.3s ease ${i * 0.05}s both`,
                      }}
                      onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(99,102,241,0.06)'; e.currentTarget.style.borderColor = 'rgba(99,102,241,0.25)'; e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 12px 32px rgba(0,0,0,0.3)'; }}
                      onMouseLeave={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.03)'; e.currentTarget.style.borderColor = 'rgba(255,255,255,0.07)'; e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = 'none'; }}
                    >
                      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 20 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                          <div style={{
                            width: 48, height: 48, borderRadius: 14, fontSize: 22,
                            background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                          }}>{group.icon}</div>
                          <div>
                            <div style={{ fontSize: 16, fontWeight: 700, color: '#f1f5f9', marginBottom: 3 }}>{group.name}</div>
                            <div style={{ fontSize: 12, color: '#475569' }}>
                              {group.members.length} member{group.members.length !== 1 ? 's' : ''}
                            </div>
                          </div>
                        </div>
                        <div style={{
                          padding: '4px 10px', borderRadius: 20,
                          background: 'rgba(99,102,241,0.1)', border: '1px solid rgba(99,102,241,0.15)',
                          fontSize: 11, color: '#818cf8', fontWeight: 600,
                        }}>
                          {group._count.expenses} exp.
                        </div>
                      </div>

                      {/* Members row */}
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <div style={{ display: 'flex', alignItems: 'center' }}>
                          {group.members.slice(0, 5).map((m, idx) => (
                            <div key={m.userId} style={{ marginLeft: idx === 0 ? 0 : -8 }}>
                              <Avatar name={m.user.name} color={m.user.avatarColor} size={30} />
                            </div>
                          ))}
                          {group.members.length > 5 && (
                            <div style={{
                              width: 30, height: 30, borderRadius: '50%', marginLeft: -8,
                              background: 'rgba(99,102,241,0.2)', border: '2px solid #060612',
                              display: 'flex', alignItems: 'center', justifyContent: 'center',
                              fontSize: 10, fontWeight: 700, color: '#818cf8',
                            }}>+{group.members.length - 5}</div>
                          )}
                        </div>
                        <span style={{ fontSize: 13, color: '#334155', fontWeight: 500 }}>View →</span>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </>
        )}

        {/* Activity section placeholder */}
        {activeTab === 'Activity' && (
          <div style={{
            padding: '80px 40px', borderRadius: 24, textAlign: 'center',
            background: 'rgba(255,255,255,0.02)', border: '1px dashed rgba(255,255,255,0.08)',
          }}>
            <div style={{ fontSize: 64, marginBottom: 24 }}>📊</div>
            <h2 style={{ fontSize: 24, fontWeight: 700, color: '#f8fafc', margin: '0 0 12px' }}>Activity Feed Coming Soon</h2>
            <p style={{ fontSize: 15, color: '#94a3b8', margin: '0 0 32px', maxWidth: 400, marginLeft: 'auto', marginRight: 'auto', lineHeight: 1.6 }}>
              Soon you will be able to see a real-time feed of all expenses, payments, and settlements across all your groups right here.
            </p>
          </div>
        )}
      </main>

      {showCreate && (
        <CreateGroupModal
          onClose={() => setShowCreate(false)}
          onCreated={() => {
            setShowCreate(false);
            fetchData();
          }}
        />
      )}
      
      {showProfile && (
        <ProfileModal
          onClose={() => setShowProfile(false)}
        />
      )}

      <style>{`
        @keyframes fadeUp { from { opacity: 0; transform: translateY(12px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes shimmer { 0% { background-position: -200% 0; } 100% { background-position: 200% 0; } }
      `}</style>
    </div>
  );
}
