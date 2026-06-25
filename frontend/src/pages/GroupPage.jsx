import { useEffect, useState, useRef } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import api from '../api/axiosInstance';
import { useAuth } from '../context/AuthContext';
import Avatar from '../components/Avatar';
import UserSearchInput from '../components/UserSearchInput';
import AddExpenseModal from '../components/AddExpenseModal';
import AddSubscriptionModal from '../components/AddSubscriptionModal';
import { QRCodeCanvas } from 'qrcode.react';

const fmt = (n) => `₹${Math.abs(parseFloat(n)).toLocaleString('en-IN', { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`;
const fmtDate = (d) => new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });

export default function GroupPage() {
  const { id } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [group, setGroup] = useState(null);
  const [balances, setBalances] = useState(null);
  const [settlements, setSettlements] = useState([]);
  const [pendingSettlements, setPendingSettlements] = useState([]);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [editingMsgId, setEditingMsgId] = useState(null);
  const [hoveredMsgId, setHoveredMsgId] = useState(null);
  const [openMenuId, setOpenMenuId] = useState(null);
  const [hoveredSeenId, setHoveredSeenId] = useState(null);
  const [isSending, setIsSending] = useState(false);
  const chatBottomRef = useRef(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('chat'); // default to chat for now
  const [showAddMember, setShowAddMember] = useState(false);
  const [showAddExpense, setShowAddExpense] = useState(false);
  const [showDeleteGroup, setShowDeleteGroup] = useState(false);
  const [showAddSubscription, setShowAddSubscription] = useState(false);
  const [expenseToDelete, setExpenseToDelete] = useState(null);
  const [adding, setAdding] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [showUpiModal, setShowUpiModal] = useState(null);
  const [showProofModal, setShowProofModal] = useState(null);
  const [uploadingProof, setUploadingProof] = useState(null);
  const [confirmSettle, setConfirmSettle] = useState(null);
  const [toastMessage, setToastMessage] = useState(null);

  const showToast = (msg) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  useEffect(() => { fetchGroup(); fetchMessages(); }, [id]);

  useEffect(() => {
    let interval;
    if (activeTab === 'chat') {
      interval = setInterval(fetchMessages, 3000);
    }
    return () => clearInterval(interval);
  }, [id, activeTab]);

  useEffect(() => {
    if (activeTab === 'chat' && chatBottomRef.current) {
      chatBottomRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages.length, activeTab]);

  const fetchMessages = async () => {
    try {
      const res = await api.get(`/groups/${id}/messages`);
      const fetchedMessages = res.data.messages;
      setMessages(fetchedMessages);

      if (activeTab === 'chat' && user) {
        const unreadMsgIds = fetchedMessages
          .filter(msg => msg.userId !== user.id && !msg.seenBy.includes(user.id))
          .map(msg => msg.id);
          
        if (unreadMsgIds.length > 0) {
          await api.post(`/groups/${id}/messages/read`, { messageIds: unreadMsgIds });
        }
      }
    } catch (err) {
      console.error('Failed to load messages', err);
    }
  };

  const handleDeleteGroup = async () => {
    try {
      await api.delete(`/groups/${id}`);
      navigate('/dashboard');
    } catch (err) {
      showToast(err.response?.data?.error || 'Failed to delete group');
    }
  };

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!newMessage.trim() || isSending) return;
    setIsSending(true);
    try {
      if (editingMsgId) {
        await api.patch(`/groups/${id}/messages/${editingMsgId}`, { text: newMessage });
        setEditingMsgId(null);
      } else {
        await api.post(`/groups/${id}/messages`, { text: newMessage });
      }
      setNewMessage('');
      fetchMessages();
    } catch (err) {
      showToast(err.response?.data?.error || 'Failed to send message');
    } finally {
      setIsSending(false);
    }
  };

  const handleDeleteMessage = async (msgId, type) => {
    try {
      await api.delete(`/groups/${id}/messages/${msgId}?type=${type}`);
      fetchMessages();
    } catch (err) {
      showToast(err.response?.data?.error || 'Failed to delete message');
    }
  };

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
      setPendingSettlements(settleRes.data.pendingSettlements || []);
    } catch (err) { 
      console.error(err);
      showToast('Failed to load group: ' + (err.response?.data?.error || err.message));
    }
    finally { setLoading(false); }
  };

  const handleSettle = async (settlement) => {
    try {
      await api.post(`/settlements/groups/${id}/settle`, {
        fromUserId: settlement.from.id,
        amount: settlement.amount,
      });
      fetchGroup();
    } catch (err) { showToast(err.response?.data?.error || 'Failed to settle.'); }
  };

  const handleUploadProof = async (e, settlement) => {
    const file = e.target.files[0];
    if (!file) return;

    setUploadingProof(settlement.to.id);
    const formData = new FormData();
    formData.append('proof', file);
    formData.append('toUserId', settlement.to.id);
    formData.append('amount', settlement.amount);

    try {
      await api.post(`/settlements/groups/${id}/propose`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      fetchGroup();
    } catch (err) {
      showToast(err.response?.data?.error || 'Failed to upload proof.');
    } finally {
      setUploadingProof(null);
    }
  };

  const handleMarkPaid = async (settlement) => {
    setUploadingProof(settlement.to.id);
    const formData = new FormData();
    formData.append('toUserId', settlement.to.id);
    formData.append('amount', settlement.amount);

    try {
      await api.post(`/settlements/groups/${id}/propose`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      fetchGroup();
    } catch (err) {
      showToast(err.response?.data?.error || 'Failed to mark as paid.');
    } finally {
      setUploadingProof(null);
    }
  };


  const handleAddMember = async (userToAdd) => {
    setAdding(true);
    try {
      await api.post(`/groups/${id}/members`, { userId: userToAdd.id });
      setShowAddMember(false);
      fetchGroup();
    } catch (err) { showToast(err.response?.data?.error || 'Failed to add member.'); }
    finally { setAdding(false); }
  };

  const handleDeleteExpense = async () => {
    if (!expenseToDelete) return;
    setDeleting(true);
    try {
      await api.delete(`/receipts/expense/${expenseToDelete}`);
      setExpenseToDelete(null);
      fetchGroup();
    } catch (err) {
      showToast(err.response?.data?.error || 'Failed to delete expense.');
    } finally {
      setDeleting(false);
    }
  };

  const handleToggleSubscriptionStatus = async (subId, newStatus) => {
    try {
      await api.patch(`/groups/${id}/subscriptions/${subId}/status`, { status: newStatus });
      fetchGroup();
    } catch (err) {
      showToast(err.response?.data?.error || 'Failed to update status.');
    }
  };

  const handleDeleteSubscription = async (subId) => {
    try {
      await api.delete(`/groups/${id}/subscriptions/${subId}`);
      fetchGroup();
    } catch (err) {
      showToast(err.response?.data?.error || 'Failed to cancel subscription.');
    }
  };


  if (loading) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#060612' }}>
        <div style={{ width: 40, height: 40, border: '3px solid rgba(99,102,241,0.2)', borderTopColor: '#6366f1', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
      </div>
    );
  }

  const tabs = ['chat', 'expenses', 'subscriptions', 'settle up', 'members'];

  return (
    <div style={{
      minHeight: '100vh', background: '#060612', fontFamily: "'Inter', -apple-system, sans-serif",
      color: '#e2e8f0', position: 'relative', overflow: 'hidden', paddingBottom: 60,
    }}>
      {/* Background glow */}
      <div style={{
        position: 'fixed', inset: 0, zIndex: 0, pointerEvents: 'none',
        background: 'radial-gradient(ellipse 50% 40% at 20% 20%, rgba(99,102,241,0.08) 0%, transparent 60%), radial-gradient(ellipse 40% 30% at 80% 80%, rgba(236,72,153,0.06) 0%, transparent 60%)',
      }} />

      {toastMessage && (
        <div style={{
          position: 'fixed', bottom: 32, left: '50%', transform: 'translateX(-50%)', zIndex: 1000,
          background: 'rgba(244,63,94,0.95)', color: '#fff', padding: '12px 24px', borderRadius: 16,
          boxShadow: '0 8px 32px rgba(244,63,94,0.3)', backdropFilter: 'blur(12px)',
          animation: 'slideUp 0.3s cubic-bezier(0.16, 1, 0.3, 1)', fontSize: 14, fontWeight: 600,
          display: 'flex', alignItems: 'center', gap: 8
        }}>
          <span>⚠️</span> {toastMessage}
        </div>
      )}

      {showAddExpense && (
        <AddExpenseModal 
          groupId={id} 
          onClose={() => setShowAddExpense(false)} 
          onCreated={() => { setShowAddExpense(false); fetchGroup(); }} 
        />
      )}

      {showAddMember && (
        <div style={{
          position: 'fixed', inset: 0, zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center',
          background: 'rgba(6, 6, 18, 0.8)', backdropFilter: 'blur(12px)',
          animation: 'fadeIn 0.2s ease', padding: 20
        }}>
          <div style={{
            width: '100%', maxWidth: 450, borderRadius: 24, padding: 32,
            background: '#0a0a16', border: '1px solid rgba(255,255,255,0.1)',
            boxShadow: '0 24px 48px rgba(0,0,0,0.4)', position: 'relative'
          }}>
            <button onClick={() => setShowAddMember(false)} style={{
              position: 'absolute', top: 24, right: 24, background: 'transparent', border: 'none', color: '#64748b', cursor: 'pointer', fontSize: 20
            }}>✕</button>
            <h2 style={{ fontSize: 24, fontWeight: 700, color: '#f8fafc', margin: '0 0 8px' }}>Add Member</h2>
            <p style={{ color: '#94a3b8', fontSize: 14, margin: '0 0 24px' }}>Search for a user by email or phone to add them to this group.</p>
            <UserSearchInput onSelect={handleAddMember} />
            {adding && <p style={{ color: '#6366f1', fontSize: 14, marginTop: 16 }}>Adding member...</p>}
          </div>
        </div>
      )}

      {showDeleteGroup && (
        <div style={{
          position: 'fixed', inset: 0, zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center',
          background: 'rgba(6, 6, 18, 0.8)', backdropFilter: 'blur(12px)',
          animation: 'fadeIn 0.2s ease', padding: 20
        }}>
          <div style={{
            width: '100%', maxWidth: 400, borderRadius: 24, padding: 32,
            background: '#0a0a16', border: '1px solid rgba(255,255,255,0.1)',
            boxShadow: '0 24px 48px rgba(0,0,0,0.4)', textAlign: 'center', position: 'relative', overflow: 'hidden'
          }}>
            <div style={{ position: 'absolute', top: -50, left: '20%', right: '20%', height: 100, background: '#f43f5e', filter: 'blur(60px)', opacity: 0.15 }} />
            <div style={{ fontSize: 48, marginBottom: 16 }}>🗑️</div>
            <h2 style={{ fontSize: 20, fontWeight: 700, color: '#f8fafc', margin: '0 0 12px' }}>Delete Group?</h2>
            <p style={{ fontSize: 14, color: '#94a3b8', margin: '0 0 24px', lineHeight: 1.5 }}>
              Are you sure you want to permanently delete this group? All expenses, settlements, and chats will be lost. This cannot be undone.
            </p>
            <div style={{ display: 'flex', gap: 12 }}>
              <button onClick={() => setShowDeleteGroup(false)} style={{
                flex: 1, padding: '12px', borderRadius: 12, border: '1px solid rgba(255,255,255,0.1)',
                background: 'transparent', color: '#f8fafc', fontSize: 14, fontWeight: 600, cursor: 'pointer'
              }}>Cancel</button>
              <button onClick={handleDeleteGroup} style={{
                flex: 1, padding: '12px', borderRadius: 12, border: 'none', cursor: 'pointer',
                background: 'linear-gradient(135deg, #f43f5e, #e11d48)', color: '#fff', fontSize: 14, fontWeight: 600
              }}>Yes, Delete</button>
            </div>
          </div>
        </div>
      )}

      {expenseToDelete && (
        <div style={{
          position: 'fixed', inset: 0, zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center',
          background: 'rgba(6, 6, 18, 0.8)', backdropFilter: 'blur(12px)',
          animation: 'fadeIn 0.2s ease', padding: 20
        }}>
          <div style={{
            width: '100%', maxWidth: 400, borderRadius: 24, padding: 32,
            background: '#0a0a16', border: '1px solid rgba(255,255,255,0.1)',
            boxShadow: '0 24px 48px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.1)',
            animation: 'slideUp 0.3s cubic-bezier(0.16, 1, 0.3, 1)',
            position: 'relative', overflow: 'hidden', textAlign: 'center'
          }}>
            <div style={{ position: 'absolute', top: -50, left: '20%', right: '20%', height: 100, background: '#f43f5e', filter: 'blur(60px)', opacity: 0.15, pointerEvents: 'none' }} />
            <div style={{ fontSize: 48, marginBottom: 16 }}>🗑️</div>
            <h2 style={{ fontSize: 20, fontWeight: 700, color: '#f8fafc', margin: '0 0 12px' }}>Delete Expense?</h2>
            <p style={{ fontSize: 14, color: '#94a3b8', margin: '0 0 24px', lineHeight: 1.5 }}>
              Are you sure you want to delete this expense? This action cannot be undone and will recalculate everyone's balances.
            </p>
            <div style={{ display: 'flex', gap: 12 }}>
              <button onClick={() => setExpenseToDelete(null)} disabled={deleting} style={{
                flex: 1, padding: '12px', borderRadius: 12, border: '1px solid rgba(255,255,255,0.1)',
                background: 'transparent', color: '#f8fafc', fontSize: 14, fontWeight: 600, cursor: deleting ? 'not-allowed' : 'pointer',
                transition: 'all 0.2s'
              }} onMouseEnter={e => !deleting && (e.currentTarget.style.background = 'rgba(255,255,255,0.05)')} 
                 onMouseLeave={e => !deleting && (e.currentTarget.style.background = 'transparent')}>
                Cancel
              </button>
              <button onClick={handleDeleteExpense} disabled={deleting} style={{
                flex: 1, padding: '12px', borderRadius: 12, border: 'none',
                background: deleting ? 'rgba(244,63,94,0.5)' : 'linear-gradient(135deg, #f43f5e, #e11d48)', 
                color: '#fff', fontSize: 14, fontWeight: 600, cursor: deleting ? 'not-allowed' : 'pointer',
                boxShadow: deleting ? 'none' : '0 4px 15px rgba(244,63,94,0.3)', transition: 'all 0.2s'
              }}>
                {deleting ? 'Deleting...' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}

      {showUpiModal && (
        <div style={{
          position: 'fixed', inset: 0, zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center',
          background: 'rgba(6, 6, 18, 0.8)', backdropFilter: 'blur(12px)',
          animation: 'fadeIn 0.2s ease', padding: 20
        }}>
          <div style={{
            width: '100%', maxWidth: 400, borderRadius: 24, padding: 32,
            background: '#0a0a16', border: '1px solid rgba(255,255,255,0.1)',
            boxShadow: '0 24px 48px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.1)',
            animation: 'slideUp 0.3s cubic-bezier(0.16, 1, 0.3, 1)',
            position: 'relative', overflow: 'hidden', textAlign: 'center'
          }}>
            <div style={{ position: 'absolute', top: -50, left: '20%', right: '20%', height: 100, background: '#10b981', filter: 'blur(60px)', opacity: 0.15, pointerEvents: 'none' }} />
            
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
              <h2 style={{ fontSize: 20, fontWeight: 700, color: '#f8fafc', margin: 0 }}>Pay {showUpiModal.to?.name}</h2>
              <button onClick={() => setShowUpiModal(null)} style={{ background: 'none', border: 'none', color: '#94a3b8', fontSize: 20, cursor: 'pointer' }}>✕</button>
            </div>

            <div style={{
              background: '#fff', padding: 16, borderRadius: 16, display: 'inline-block', marginBottom: 20,
              boxShadow: '0 8px 24px rgba(0,0,0,0.2)'
            }}>
              <QRCodeCanvas 
                value={`upi://pay?pa=${showUpiModal.to?.upiId}&pn=${showUpiModal.to?.name}&am=${showUpiModal.amount}&cu=INR`} 
                size={200} level={"H"} 
              />
            </div>
            
            <p style={{ fontSize: 15, color: '#e2e8f0', margin: '0 0 4px' }}>Scan with any UPI App</p>
            <p style={{ fontSize: 13, color: '#64748b', margin: '0 0 24px' }}>Amount: {fmt(showUpiModal.amount)}</p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <a href={`upi://pay?pa=${showUpiModal.to?.upiId}&pn=${showUpiModal.to?.name}&am=${showUpiModal.amount}&cu=INR`} style={{
                display: 'block', padding: '14px', borderRadius: 14, textDecoration: 'none',
                background: 'linear-gradient(135deg, #6366f1, #8b5cf6)', color: '#fff',
                fontSize: 15, fontWeight: 600, boxShadow: '0 8px 24px rgba(99,102,241,0.3)',
              }}>
                Open PhonePe / GPay
              </a>
            </div>
          </div>
        </div>
      )}

      {showProofModal && (
        <div style={{
          position: 'fixed', inset: 0, zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center',
          background: 'rgba(6, 6, 18, 0.9)', backdropFilter: 'blur(12px)',
          animation: 'fadeIn 0.2s ease', padding: 20
        }} onClick={() => setShowProofModal(null)}>
          <div style={{ position: 'relative', maxWidth: '100%', maxHeight: '100%' }} onClick={e => e.stopPropagation()}>
            <img src={`http://localhost:5000${showProofModal}`} alt="Payment Proof" style={{ maxWidth: '100%', maxHeight: '80vh', borderRadius: 16, boxShadow: '0 24px 48px rgba(0,0,0,0.5)' }} />
            <button onClick={() => setShowProofModal(null)} style={{
              position: 'absolute', top: -16, right: -16, background: '#f43f5e', color: '#fff',
              border: 'none', width: 32, height: 32, borderRadius: '50%', cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16, boxShadow: '0 4px 12px rgba(244,63,94,0.4)'
            }}>✕</button>
          </div>
        </div>
      )}

      {confirmSettle && (
        <div style={{
          position: 'fixed', inset: 0, zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center',
          background: 'rgba(6, 6, 18, 0.8)', backdropFilter: 'blur(12px)',
          animation: 'fadeIn 0.2s ease', padding: 20
        }}>
          <div style={{
            width: '100%', maxWidth: 400, borderRadius: 24, padding: 32,
            background: '#0a0a16', border: '1px solid rgba(255,255,255,0.1)',
            boxShadow: '0 24px 48px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.1)',
            animation: 'slideUp 0.3s cubic-bezier(0.16, 1, 0.3, 1)',
            position: 'relative', overflow: 'hidden', textAlign: 'center'
          }}>
            <div style={{ position: 'absolute', top: -50, left: '20%', right: '20%', height: 100, background: '#22c55e', filter: 'blur(60px)', opacity: 0.15, pointerEvents: 'none' }} />
            <div style={{ fontSize: 48, marginBottom: 16 }}>💰</div>
            <h2 style={{ fontSize: 20, fontWeight: 700, color: '#f8fafc', margin: '0 0 12px' }}>Confirm Payment</h2>
            <p style={{ fontSize: 14, color: '#94a3b8', margin: '0 0 24px', lineHeight: 1.5 }}>
              Are you sure you have received <strong>{fmt(confirmSettle.amount)}</strong> from <strong>{confirmSettle.from?.name}</strong>?
            </p>
            <div style={{ display: 'flex', gap: 12 }}>
              <button onClick={() => setConfirmSettle(null)} style={{
                flex: 1, padding: '12px', borderRadius: 12, border: '1px solid rgba(255,255,255,0.1)',
                background: 'transparent', color: '#f8fafc', fontSize: 14, fontWeight: 600, cursor: 'pointer',
                transition: 'all 0.2s'
              }} onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.05)'} 
                 onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                Cancel
              </button>
              <button onClick={() => { handleSettle(confirmSettle); setConfirmSettle(null); }} style={{
                flex: 1, padding: '12px', borderRadius: 12, border: 'none',
                background: 'linear-gradient(135deg, #22c55e, #14b8a6)', 
                color: '#fff', fontSize: 14, fontWeight: 600, cursor: 'pointer',
                boxShadow: '0 4px 15px rgba(34,197,94,0.3)', transition: 'all 0.2s'
              }}>
                Yes, Received ✓
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <div style={{
        position: 'sticky', top: 0, zIndex: 40, padding: '20px 32px',
        background: 'rgba(6, 6, 18, 0.8)', backdropFilter: 'blur(16px)',
        borderBottom: '1px solid rgba(255,255,255,0.08)',
      }}>
        <div style={{ maxWidth: 800, margin: '0 auto', display: 'flex', alignItems: 'center', gap: 20 }}>
          <Link to="/dashboard" style={{
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            width: 40, height: 40, borderRadius: 12, background: 'rgba(255,255,255,0.04)',
            border: '1px solid rgba(255,255,255,0.08)', color: '#94a3b8', textDecoration: 'none',
            fontSize: 20, transition: 'all 0.2s',
          }} onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.08)'; e.currentTarget.style.color = '#fff'; }}
             onMouseLeave={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.04)'; e.currentTarget.style.color = '#94a3b8'; }}>
            ←
          </Link>
          
          <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            <div style={{
              width: 56, height: 56, borderRadius: 16, fontSize: 28,
              background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              boxShadow: '0 8px 16px rgba(0,0,0,0.2)',
            }}>{group?.icon}</div>
            <div>
              <h1 style={{ fontSize: 24, fontWeight: 700, color: '#fff', margin: '0 0 4px', letterSpacing: '-0.5px' }}>{group?.name}</h1>
              <p style={{ fontSize: 13, color: '#94a3b8', margin: 0 }}>{group?.members.length} members {group?.description ? `· ${group.description}` : ''}</p>
            </div>
          </div>

          <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginLeft: 'auto' }}>
            <button onClick={() => setShowAddMember(true)} style={{ whiteSpace: 'nowrap', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: '#fff', cursor: 'pointer', padding: '10px 16px', borderRadius: 12, transition: 'all 0.2s', fontSize: 13, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 6 }} onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.1)'} onMouseLeave={e => e.currentTarget.style.background = 'rgba(255,255,255,0.05)'}>
              <span>👤</span> Add Member
            </button>
            <button onClick={() => setShowDeleteGroup(true)} title="Delete Group" style={{ background: 'rgba(244,63,94,0.05)', border: '1px solid rgba(244,63,94,0.2)', color: '#f43f5e', cursor: 'pointer', width: 40, height: 40, borderRadius: 12, transition: 'all 0.2s', display: 'flex', alignItems: 'center', justifyContent: 'center' }} onMouseEnter={e => { e.currentTarget.style.background = 'rgba(244,63,94,0.15)'; e.currentTarget.style.transform = 'scale(1.05)'; }} onMouseLeave={e => { e.currentTarget.style.background = 'rgba(244,63,94,0.05)'; e.currentTarget.style.transform = 'scale(1)'; }}>
              <span style={{ fontSize: 16 }}>🗑️</span>
            </button>
          </div>

          <div style={{ display: 'flex', gap: 12 }}>
            <button onClick={() => setShowAddExpense(true)} style={{
              display: 'flex', alignItems: 'center', gap: 8, whiteSpace: 'nowrap',
              padding: '10px 20px', borderRadius: 12, border: 'none', cursor: 'pointer',
              background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
              color: '#fff', fontSize: 14, fontWeight: 600,
              boxShadow: '0 4px 12px rgba(99,102,241,0.3)', transition: 'all 0.2s',
            }} onMouseEnter={(e) => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 8px 20px rgba(99,102,241,0.4)'; }}
               onMouseLeave={(e) => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = '0 4px 12px rgba(99,102,241,0.3)'; }}>
              <span style={{ fontSize: 16 }}>➕</span> Expense
            </button>

            <Link to={`/groups/${id}/scan`} style={{
              display: 'flex', alignItems: 'center', gap: 8, whiteSpace: 'nowrap',
              padding: '10px 20px', borderRadius: 12, textDecoration: 'none',
              background: 'linear-gradient(135deg, #f97316, #ec4899)',
              color: '#fff', fontSize: 14, fontWeight: 600,
              boxShadow: '0 4px 12px rgba(249,115,22,0.3)', transition: 'all 0.2s',
            }} onMouseEnter={(e) => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 8px 20px rgba(249,115,22,0.4)'; }}
               onMouseLeave={(e) => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = '0 4px 12px rgba(249,115,22,0.3)'; }}>
              <span style={{ fontSize: 16 }}>📷</span> Scan
            </Link>
          </div>
        </div>
      </div>

      <div style={{ maxWidth: 800, margin: '0 auto', padding: '32px 32px', position: 'relative', zIndex: 1 }}>
        
        {/* Balances bar */}
        {balances && (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, marginBottom: 40 }}>
            <div style={{
              padding: '24px', borderRadius: 20,
              background: 'linear-gradient(135deg, rgba(34,197,94,0.08) 0%, rgba(20,184,166,0.05) 100%)',
              border: '1px solid rgba(34,197,94,0.15)',
            }}>
              <p style={{ fontSize: 12, fontWeight: 600, color: '#4ade80', textTransform: 'uppercase', letterSpacing: '0.5px', margin: '0 0 12px' }}>You are owed</p>
              <p style={{ fontSize: 32, fontWeight: 800, color: '#4ade80', letterSpacing: '-1px', margin: 0 }}>{fmt(balances.youAreOwed)}</p>
            </div>
            <div style={{
              padding: '24px', borderRadius: 20,
              background: 'linear-gradient(135deg, rgba(244,63,94,0.08) 0%, rgba(251,113,133,0.05) 100%)',
              border: '1px solid rgba(244,63,94,0.15)',
            }}>
              <p style={{ fontSize: 12, fontWeight: 600, color: '#f87171', textTransform: 'uppercase', letterSpacing: '0.5px', margin: '0 0 12px' }}>You owe</p>
              <p style={{ fontSize: 32, fontWeight: 800, color: '#f87171', letterSpacing: '-1px', margin: 0 }}>{fmt(balances.youOwe)}</p>
            </div>
          </div>
        )}

        {/* Tabs */}
        <div style={{ display: 'flex', gap: 12, marginBottom: 32, borderBottom: '1px solid rgba(255,255,255,0.08)', paddingBottom: 16 }}>
          {tabs.map((tab) => (
            <button key={tab} onClick={() => setActiveTab(tab)} style={{
              padding: '10px 24px', borderRadius: 12, textTransform: 'capitalize',
              fontSize: 14, fontWeight: 600, cursor: 'pointer', border: 'none', transition: 'all 0.2s',
              background: activeTab === tab ? 'rgba(99,102,241,0.15)' : 'transparent',
              color: activeTab === tab ? '#818cf8' : '#64748b',
              boxShadow: activeTab === tab ? 'inset 0 0 0 1px rgba(99,102,241,0.3)' : 'none',
            }} onMouseEnter={(e) => { if (activeTab !== tab) e.currentTarget.style.color = '#94a3b8'; }}
               onMouseLeave={(e) => { if (activeTab !== tab) e.currentTarget.style.color = '#64748b'; }}>
              {tab}
            </button>
          ))}
        </div>

        {/* Chat tab */}
        {activeTab === 'chat' && (
          <div style={{ display: 'flex', flexDirection: 'column', height: '600px', background: 'rgba(255,255,255,0.02)', borderRadius: 24, border: '1px solid rgba(255,255,255,0.08)', overflow: 'hidden' }}>
            {/* Chat History */}
            <div style={{ flex: 1, overflowY: 'auto', padding: '24px', display: 'flex', flexDirection: 'column', gap: 16 }}>
              {messages.length === 0 ? (
                <div style={{ margin: 'auto', textAlign: 'center', color: '#64748b' }}>
                  <div style={{ fontSize: 48, marginBottom: 16 }}>💬</div>
                  <p>No messages yet. Say hello!</p>
                </div>
              ) : (
                messages.map((msg, index) => {
                  const isMe = msg.user.id === user?.id;
                  const showAvatar = index === messages.length - 1 || messages[index + 1]?.user.id !== msg.user.id;
                  
                  return (
                    <div key={msg.id} 
                         onMouseEnter={() => setHoveredMsgId(msg.id)}
                         onMouseLeave={() => setHoveredMsgId(null)}
                         style={{ display: 'flex', alignSelf: isMe ? 'flex-end' : 'flex-start', maxWidth: '75%', gap: 8, position: 'relative' }}>
                      
                      {isMe && hoveredMsgId === msg.id && openMenuId !== msg.id && (
                        <button onClick={() => setOpenMenuId(msg.id)} style={{ alignSelf: 'center', background: 'rgba(0,0,0,0.5)', border: 'none', color: '#fff', cursor: 'pointer', padding: '6px 8px', borderRadius: 8, opacity: 0.7, transition: 'all 0.2s' }} onMouseEnter={e => e.currentTarget.style.opacity = 1} onMouseLeave={e => e.currentTarget.style.opacity = 0.7}>
                          ⋮
                        </button>
                      )}

                      {openMenuId === msg.id && (
                        <>
                          <div onClick={() => setOpenMenuId(null)} style={{ position: 'fixed', inset: 0, zIndex: 9 }} />
                          <div style={{ position: 'absolute', [isMe ? 'right' : 'left']: '100%', top: '50%', transform: 'translateY(-50%)', margin: '0 8px', display: 'flex', flexDirection: 'column', gap: 4, background: '#1e1e2d', padding: '8px', borderRadius: 12, zIndex: 10, boxShadow: '0 8px 32px rgba(0,0,0,0.5)', border: '1px solid rgba(255,255,255,0.1)', minWidth: 180 }}>
                            {!msg.isDeleted && isMe && (
                              <button onClick={() => { setEditingMsgId(msg.id); setNewMessage(msg.text); setOpenMenuId(null); }} style={{ display: 'flex', alignItems: 'center', gap: 8, background: 'transparent', border: 'none', color: '#e2e8f0', cursor: 'pointer', fontSize: 13, padding: '10px 12px', borderRadius: 8, width: '100%', whiteSpace: 'nowrap', transition: 'background 0.2s' }} onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.08)'} onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                                ✏️ Edit
                              </button>
                            )}
                            <button onClick={() => { handleDeleteMessage(msg.id, 'me'); setOpenMenuId(null); }} style={{ display: 'flex', alignItems: 'center', gap: 8, background: 'transparent', border: 'none', color: '#e2e8f0', cursor: 'pointer', fontSize: 13, padding: '10px 12px', borderRadius: 8, width: '100%', whiteSpace: 'nowrap', transition: 'background 0.2s' }} onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.08)'} onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                                🗑️ Delete for Me
                            </button>
                            {!msg.isDeleted && isMe && (
                              <button onClick={() => { handleDeleteMessage(msg.id, 'everyone'); setOpenMenuId(null); }} style={{ display: 'flex', alignItems: 'center', gap: 8, background: 'transparent', border: 'none', color: '#f87171', cursor: 'pointer', fontSize: 13, padding: '10px 12px', borderRadius: 8, width: '100%', whiteSpace: 'nowrap', transition: 'background 0.2s' }} onMouseEnter={e => e.currentTarget.style.background = 'rgba(244,63,94,0.1)'} onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                                🚫 Delete for Everyone
                              </button>
                            )}
                          </div>
                        </>
                      )}

                      {!isMe && (
                        <div style={{ width: 32, opacity: showAvatar ? 1 : 0, alignSelf: 'flex-start' }}>
                          {showAvatar && <Avatar name={msg.user.name} color={msg.user.avatarColor} size={32} />}
                        </div>
                      )}
                      <div>
                        {!isMe && showAvatar && <div style={{ fontSize: 11, color: '#94a3b8', marginBottom: 4, marginLeft: 4 }}>{msg.user.name}</div>}
                        <div style={{
                          padding: '12px 16px', borderRadius: 20, fontSize: 14, lineHeight: 1.5,
                          background: msg.isDeleted ? 'transparent' : (isMe ? 'linear-gradient(135deg, #6366f1, #8b5cf6)' : 'rgba(255,255,255,0.08)'),
                          border: msg.isDeleted ? '1px dashed rgba(255,255,255,0.2)' : 'none',
                          color: msg.isDeleted ? '#94a3b8' : '#fff', borderBottomRightRadius: isMe ? 4 : 20, borderBottomLeftRadius: !isMe ? 4 : 20,
                        }}>
                          {msg.isDeleted ? '🚫 This message was deleted' : msg.text}
                        </div>
                        <div style={{ fontSize: 10, color: '#64748b', marginTop: 4, display: 'flex', gap: 6, justifyContent: isMe ? 'flex-end' : 'flex-start', marginRight: isMe ? 4 : 0, marginLeft: !isMe ? 4 : 0 }}>
                          <span>{new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                          {msg.isEdited && !msg.isDeleted && <span>(edited)</span>}
                          {isMe && !msg.isDeleted && msg.seenBy?.length > 0 && (
                            <div style={{ position: 'relative' }} 
                                 onMouseEnter={() => setHoveredSeenId(msg.id)}
                                 onMouseLeave={() => setHoveredSeenId(null)}>
                              <span style={{ cursor: 'pointer', color: '#818cf8', fontWeight: 'bold' }}>✓✓</span>
                              {hoveredSeenId === msg.id && (
                                <div style={{ position: 'absolute', bottom: '100%', right: 0, marginBottom: 4, background: 'rgba(20,20,30,0.95)', border: '1px solid rgba(255,255,255,0.1)', padding: '6px 10px', borderRadius: 8, color: '#e2e8f0', fontSize: 11, whiteSpace: 'nowrap', zIndex: 20, boxShadow: '0 4px 12px rgba(0,0,0,0.5)' }}>
                                  <div style={{ fontWeight: 600, marginBottom: 2, color: '#94a3b8', fontSize: 10, textTransform: 'uppercase' }}>Seen by</div>
                                  {msg.seenBy.map(uId => group?.members.find(m => m.userId === uId)?.user?.name || 'Unknown').join(', ')}
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      </div>

                      {!isMe && hoveredMsgId === msg.id && openMenuId !== msg.id && (
                        <button onClick={() => setOpenMenuId(msg.id)} style={{ alignSelf: 'center', background: 'rgba(0,0,0,0.5)', border: 'none', color: '#fff', cursor: 'pointer', padding: '6px 8px', borderRadius: 8, opacity: 0.7, transition: 'all 0.2s' }} onMouseEnter={e => e.currentTarget.style.opacity = 1} onMouseLeave={e => e.currentTarget.style.opacity = 0.7}>
                          ⋮
                        </button>
                      )}
                    </div>
                  );
                })
              )}
              <div ref={chatBottomRef} />
            </div>

            {/* Chat Input */}
            <form onSubmit={handleSendMessage} style={{ padding: '16px 24px', borderTop: '1px solid rgba(255,255,255,0.08)', display: 'flex', gap: 12, background: 'rgba(6,6,18,0.5)', alignItems: 'center' }}>
              {editingMsgId && (
                <button type="button" onClick={() => { setEditingMsgId(null); setNewMessage(''); }} style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer', fontSize: 20 }}>
                  ✕
                </button>
              )}
              <input
                type="text"
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                placeholder={editingMsgId ? "Edit message..." : "Type a message..."}
                disabled={isSending}
                style={{
                  flex: 1, padding: '14px 20px', borderRadius: 100, border: '1px solid rgba(255,255,255,0.1)',
                  background: editingMsgId ? 'rgba(99,102,241,0.05)' : 'rgba(255,255,255,0.04)', color: '#fff', fontSize: 14, outline: 'none', transition: 'all 0.2s',
                  borderColor: editingMsgId ? 'rgba(99,102,241,0.3)' : 'rgba(255,255,255,0.1)',
                  opacity: isSending ? 0.5 : 1
                }}
                onFocus={(e) => { e.target.style.borderColor = 'rgba(99,102,241,0.5)'; e.target.style.background = 'rgba(99,102,241,0.03)'; }}
                onBlur={(e) => { e.target.style.borderColor = editingMsgId ? 'rgba(99,102,241,0.3)' : 'rgba(255,255,255,0.1)'; e.target.style.background = editingMsgId ? 'rgba(99,102,241,0.05)' : 'rgba(255,255,255,0.04)'; }}
              />
              <button type="submit" disabled={!newMessage.trim() || isSending} style={{
                width: 48, height: 48, borderRadius: 24, border: 'none', cursor: (newMessage.trim() && !isSending) ? 'pointer' : 'not-allowed',
                background: newMessage.trim() ? 'linear-gradient(135deg, #6366f1, #8b5cf6)' : 'rgba(255,255,255,0.1)',
                color: '#fff', fontSize: 18, display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.2s',
                opacity: isSending ? 0.5 : 1
              }}>
                {editingMsgId ? '✓' : '➤'}
              </button>
            </form>
          </div>
        )}

        {/* Expenses tab */}
        {activeTab === 'expenses' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {group?.expenses.length === 0 ? (
              <div style={{
                padding: '64px 32px', borderRadius: 24, textAlign: 'center',
                background: 'rgba(255,255,255,0.02)', border: '1px dashed rgba(255,255,255,0.08)',
              }}>
                <div style={{ fontSize: 48, marginBottom: 16 }}>🧾</div>
                <h3 style={{ fontSize: 20, fontWeight: 700, color: '#f1f5f9', margin: '0 0 8px' }}>No expenses yet</h3>
                <p style={{ fontSize: 14, color: '#64748b', margin: 0 }}>Scan a receipt to split your first bill</p>
              </div>
            ) : group?.expenses.map((exp) => (
              <div key={exp.id} style={{
                display: 'flex', alignItems: 'center', gap: 16, padding: '20px 24px', borderRadius: 20,
                background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)',
                transition: 'all 0.2s', cursor: 'pointer',
              }} onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.05)'; e.currentTarget.style.transform = 'translateY(-2px)'; }}
                 onMouseLeave={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.03)'; e.currentTarget.style.transform = 'translateY(0)'; }}>
                <div style={{
                  width: 52, height: 52, borderRadius: 16, fontSize: 24,
                  background: 'rgba(99,102,241,0.1)', border: '1px solid rgba(99,102,241,0.2)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  {exp.splitType === 'itemized' ? '🧾' : '💳'}
                </div>
                <div style={{ flex: 1 }}>
                  <p style={{ fontSize: 16, fontWeight: 600, color: '#f8fafc', margin: '0 0 6px' }}>{exp.description}</p>
                  <p style={{ fontSize: 13, color: '#64748b', margin: 0 }}>
                    Paid by <span style={{ color: exp.payer.id === user?.id ? '#818cf8' : '#e2e8f0', fontWeight: 500 }}>
                      {exp.payer.id === user?.id ? 'you' : exp.payer.name}
                    </span> · {fmtDate(exp.createdAt)}
                  </p>
                </div>
                <div style={{ textAlign: 'right', display: 'flex', alignItems: 'center', gap: 16 }}>
                  <p style={{ fontSize: 18, fontWeight: 700, color: '#f8fafc', margin: 0 }}>{fmt(exp.totalAmount)}</p>
                  {exp.payer.id === user?.id && (
                    <button onClick={(e) => { e.stopPropagation(); setExpenseToDelete(exp.id); }} style={{
                      background: 'none', border: 'none', color: '#f43f5e', cursor: 'pointer',
                      padding: 8, fontSize: 16, opacity: 0.7, transition: 'all 0.2s', borderRadius: '50%'
                    }} onMouseEnter={e => { e.currentTarget.style.opacity = 1; e.currentTarget.style.background = 'rgba(244,63,94,0.1)'; }} 
                       onMouseLeave={e => { e.currentTarget.style.opacity = 0.7; e.currentTarget.style.background = 'none'; }} 
                       title="Delete Expense">
                      🗑️
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Subscriptions tab */}
        {activeTab === 'subscriptions' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 8 }}>
              <button onClick={() => setShowAddSubscription(true)} style={{
                padding: '10px 20px', borderRadius: 12, border: 'none', cursor: 'pointer',
                background: 'linear-gradient(135deg, #6366f1, #8b5cf6)', color: '#fff',
                fontSize: 14, fontWeight: 600, boxShadow: '0 4px 15px rgba(99,102,241,0.3)',
                transition: 'all 0.2s',
              }}>
                + New Auto-Pay
              </button>
            </div>

            {(!group?.subscriptions || group.subscriptions.length === 0) ? (
              <div style={{
                padding: '64px 32px', borderRadius: 24, textAlign: 'center',
                background: 'rgba(255,255,255,0.02)', border: '1px dashed rgba(255,255,255,0.08)',
              }}>
                <div style={{ fontSize: 48, marginBottom: 16 }}>🔄</div>
                <h3 style={{ fontSize: 20, fontWeight: 700, color: '#f1f5f9', margin: '0 0 8px' }}>No subscriptions</h3>
                <p style={{ fontSize: 14, color: '#64748b', margin: 0 }}>Add Netflix, Wi-Fi, or Spotify to automate your bills.</p>
              </div>
            ) : group.subscriptions.map((sub) => {
              const countMsg = sub.intervalCount || 1;
              let cycleTxt = sub.cycle.toLowerCase();
              if (sub.cycle === 'DAYS') cycleTxt = `${countMsg} day${countMsg > 1 ? 's' : ''}`;
              else if (sub.cycle === 'WEEKLY') cycleTxt = countMsg > 1 ? `${countMsg} weeks` : 'weekly';
              else if (sub.cycle === 'MONTHLY') cycleTxt = countMsg > 1 ? `${countMsg} months` : 'monthly';
              else if (sub.cycle === 'YEARLY') cycleTxt = countMsg > 1 ? `${countMsg} years` : 'yearly';
              
              return (
              <div key={sub.id} style={{
                display: 'flex', alignItems: 'center', gap: 16, padding: '24px', borderRadius: 24,
                background: 'linear-gradient(145deg, rgba(255,255,255,0.03) 0%, rgba(255,255,255,0.01) 100%)', 
                border: '1px solid rgba(255,255,255,0.06)',
                boxShadow: '0 8px 32px rgba(0,0,0,0.2)',
                opacity: sub.status === 'PAUSED' ? 0.6 : 1,
                transition: 'opacity 0.2s'
              }}>
                <div style={{
                  width: 56, height: 56, borderRadius: 18, fontSize: 28,
                  background: 'linear-gradient(135deg, rgba(99,102,241,0.2), rgba(168,85,247,0.2))', 
                  border: '1px solid rgba(168,85,247,0.3)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  boxShadow: 'inset 0 2px 4px rgba(255,255,255,0.1)'
                }}>
                  {sub.status === 'PAUSED' ? '⏸️' : '✨'}
                </div>
                <div style={{ flex: 1 }}>
                  <p style={{ fontSize: 17, fontWeight: 700, color: '#f8fafc', margin: '0 0 6px', textDecoration: sub.status === 'PAUSED' ? 'line-through' : 'none' }}>{sub.name}</p>
                  <p style={{ fontSize: 14, color: '#94a3b8', margin: 0, display: 'flex', gap: 6, alignItems: 'center' }}>
                    <span>Paid by <strong style={{ color: sub.payer.id === user?.id ? '#a78bfa' : '#f1f5f9' }}>{sub.payer.id === user?.id ? 'you' : sub.payer.name}</strong></span>
                    {sub.status === 'ACTIVE' && (
                      <>
                        <span>•</span>
                        <span style={{ color: '#fbbf24' }}>Next bill: {fmtDate(sub.nextBillingDate)}</span>
                      </>
                    )}
                  </p>
                </div>
                <div style={{ textAlign: 'right', display: 'flex', flexDirection: 'column', gap: 6, alignItems: 'flex-end' }}>
                  <p style={{ fontSize: 20, fontWeight: 800, color: '#f8fafc', margin: 0, textShadow: '0 2px 4px rgba(0,0,0,0.5)' }}>{fmt(sub.amount)}</p>
                  <span style={{ fontSize: 12, fontWeight: 600, background: sub.status === 'PAUSED' ? 'rgba(244,63,94,0.1)' : 'rgba(255,255,255,0.1)', padding: '4px 10px', borderRadius: 12, color: sub.status === 'PAUSED' ? '#f43f5e' : '#e2e8f0', letterSpacing: 0.5 }}>
                    {sub.status === 'PAUSED' ? 'PAUSED' : `EVERY ${cycleTxt.toUpperCase()}`}
                  </span>
                  
                  {sub.payer.id === user?.id && (
                    <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
                      <button onClick={() => handleToggleSubscriptionStatus(sub.id, sub.status === 'ACTIVE' ? 'PAUSED' : 'ACTIVE')} style={{
                        padding: '6px 10px', borderRadius: 8, border: 'none', background: 'rgba(255,255,255,0.05)', color: '#cbd5e1', fontSize: 12, cursor: 'pointer', transition: 'background 0.2s'
                      }} onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.1)'} onMouseLeave={e => e.currentTarget.style.background = 'rgba(255,255,255,0.05)'}>
                        {sub.status === 'ACTIVE' ? '⏸️ Pause' : '▶️ Resume'}
                      </button>
                      <button onClick={() => handleDeleteSubscription(sub.id)} style={{
                        padding: '6px 10px', borderRadius: 8, border: 'none', background: 'rgba(244,63,94,0.1)', color: '#f43f5e', fontSize: 12, cursor: 'pointer', transition: 'background 0.2s'
                      }} onMouseEnter={e => e.currentTarget.style.background = 'rgba(244,63,94,0.2)'} onMouseLeave={e => e.currentTarget.style.background = 'rgba(244,63,94,0.1)'}>
                        🗑️ Cancel
                      </button>
                    </div>
                  )}
                </div>
              </div>
            )})}
          </div>
        )}

        {/* Members tab */}
        {activeTab === 'members' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {/* Add Member Section */}
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 8 }}>
              {!showAddMember ? (
                <button onClick={() => setShowAddMember(true)} style={{
                  padding: '10px 20px', borderRadius: 12, border: 'none', cursor: 'pointer',
                  background: 'linear-gradient(135deg, #6366f1, #8b5cf6)', color: '#fff',
                  fontSize: 14, fontWeight: 600, boxShadow: '0 4px 15px rgba(99,102,241,0.3)',
                  transition: 'all 0.2s',
                }}>
                  + Add Member
                </button>
              ) : (
                <div style={{ width: '100%', background: 'rgba(255,255,255,0.03)', padding: 16, borderRadius: 20, border: '1px solid rgba(255,255,255,0.08)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 12 }}>
                    <h3 style={{ fontSize: 16, fontWeight: 600, margin: 0, color: '#f8fafc' }}>Add a new member</h3>
                    <button onClick={() => setShowAddMember(false)} style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer' }}>Cancel</button>
                  </div>
                  {adding ? (
                    <div style={{ padding: '14px', color: '#818cf8', fontSize: 14, textAlign: 'center' }}>Adding member...</div>
                  ) : (
                    <UserSearchInput onSelect={handleAddMember} excludeIds={group?.members.map((m) => m.userId) || []} />
                  )}
                </div>
              )}
            </div>

            {[...(group?.members || [])].sort((a, b) => (b.trustScore || 0) - (a.trustScore || 0)).map((m, idx) => (
              <div key={m.userId} style={{
                display: 'flex', alignItems: 'center', gap: 16, padding: '20px 24px', borderRadius: 20,
                background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)',
              }}>
                <div style={{ fontSize: 20, fontWeight: 800, color: idx === 0 ? '#fbbf24' : idx === 1 ? '#cbd5e1' : idx === 2 ? '#b45309' : '#64748b', width: 32, textAlign: 'center' }}>
                  #{idx + 1}
                </div>
                <Avatar name={m.user.name} color={m.user.avatarColor} size={48} />
                <div style={{ flex: 1 }}>
                  <p style={{ fontSize: 16, fontWeight: 600, color: '#f8fafc', margin: '0 0 4px' }}>
                    {m.user.name} {m.userId === user?.id && <span style={{ color: '#64748b', fontSize: 13, fontWeight: 400 }}>(you)</span>}
                  </p>
                  <p style={{ fontSize: 13, color: '#64748b', margin: '0 0 6px' }}>{m.user.email}</p>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                    <span style={{ fontSize: 12, fontWeight: 700, color: '#4ade80', display: 'flex', alignItems: 'center', gap: 4 }}>
                      <span style={{ fontSize: 11 }}>⭐</span> {m.trustScore || 500}
                    </span>
                    {m.badges && m.badges.map((b, i) => (
                      <span key={i} style={{ fontSize: 10, background: 'rgba(99,102,241,0.1)', color: '#818cf8', padding: '2px 6px', borderRadius: 10, border: '1px solid rgba(99,102,241,0.2)' }}>{b}</span>
                    ))}
                  </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  {(() => {
                    if (m.userId === user?.id) return null;
                    const net = balances?.breakdown?.[m.userId] || 0;
                    if (Math.abs(net) < 0.01) return null;
                    if (net > 0) {
                      return (
                        <span style={{
                          padding: '6px 12px', borderRadius: 20, fontSize: 12, fontWeight: 600,
                          background: 'rgba(34,197,94,0.1)', color: '#4ade80', border: '1px solid rgba(34,197,94,0.2)'
                        }}>
                          Owes you {fmt(net)}
                        </span>
                      );
                    } else {
                      return (
                        <span style={{
                          padding: '6px 12px', borderRadius: 20, fontSize: 12, fontWeight: 600,
                          background: 'rgba(244,63,94,0.1)', color: '#f87171', border: '1px solid rgba(244,63,94,0.2)'
                        }}>
                          You owe {fmt(Math.abs(net))}
                        </span>
                      );
                    }
                  })()}
                  <span style={{
                    padding: '6px 12px', borderRadius: 20, fontSize: 12, fontWeight: 600,
                    background: m.dietType === 'veg' ? 'rgba(34,197,94,0.1)' : 'rgba(249,115,22,0.1)',
                    color: m.dietType === 'veg' ? '#4ade80' : '#fb923c',
                    border: `1px solid ${m.dietType === 'veg' ? 'rgba(34,197,94,0.2)' : 'rgba(249,115,22,0.2)'}`,
                  }}>
                    {m.dietType === 'veg' ? '🟢 Vegetarian' : '🍖 Everything'}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Settle up tab */}
        {activeTab === 'settle up' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {settlements.length === 0 ? (
              <div style={{
                padding: '64px 32px', borderRadius: 24, textAlign: 'center',
                background: 'linear-gradient(135deg, rgba(34,197,94,0.05) 0%, rgba(20,184,166,0.02) 100%)',
                border: '1px solid rgba(34,197,94,0.1)',
              }}>
                <div style={{ fontSize: 48, marginBottom: 16 }}>🎉</div>
                <h3 style={{ fontSize: 20, fontWeight: 700, color: '#f1f5f9', margin: '0 0 8px' }}>All settled up!</h3>
                <p style={{ fontSize: 14, color: '#64748b', margin: 0 }}>There are no outstanding balances in this group.</p>
              </div>
            ) : settlements.map((s, i) => (
              <div key={i} style={{
                display: 'flex', alignItems: 'center', gap: 20, padding: '24px', borderRadius: 20,
                background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)',
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, flex: 1 }}>
                  <Avatar name={s.from?.name} color={s.from?.avatarColor} size={44} />
                  <div style={{ fontSize: 18, color: '#64748b' }}>→</div>
                  <Avatar name={s.to?.name} color={s.to?.avatarColor} size={44} />
                  <div style={{ marginLeft: 12 }}>
                    <p style={{ fontSize: 14, color: '#94a3b8', margin: '0 0 6px' }}>
                      <span style={{ color: s.from?.id === user?.id ? '#f87171' : '#e2e8f0', fontWeight: 600 }}>{s.from?.id === user?.id ? 'You' : s.from?.name}</span>
                      {' owes '}
                      <span style={{ color: s.to?.id === user?.id ? '#4ade80' : '#e2e8f0', fontWeight: 600 }}>{s.to?.id === user?.id ? 'You' : s.to?.name}</span>
                    </p>
                    <p style={{ fontSize: 24, fontWeight: 800, color: '#f8fafc', margin: 0, letterSpacing: '-0.5px' }}>{fmt(s.amount)}</p>
                  </div>
                </div>
                {(() => {
                  const pending = pendingSettlements.find(p => p.payerId === s.from.id && p.receiverId === s.to.id);

                  if (s.from?.id === user?.id) {
                    // Current user is the debtor
                    return (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 8, minWidth: 260 }}>
                        {s.to?.upiId && (
                          <button onClick={() => setShowUpiModal(s)} style={{
                            padding: '12px 20px', borderRadius: 12, border: 'none', cursor: 'pointer',
                            background: 'linear-gradient(135deg, #3b82f6, #6366f1)', color: '#fff',
                            fontSize: 14, fontWeight: 600, boxShadow: '0 8px 24px rgba(59,130,246,0.3)', transition: 'all 0.2s',
                            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, whiteSpace: 'nowrap', width: '100%'
                          }} onMouseEnter={(e) => { e.currentTarget.style.transform = 'translateY(-2px)'; }}
                             onMouseLeave={(e) => { e.currentTarget.style.transform = 'translateY(0)'; }}>
                            <span>🏦</span> Pay via UPI
                          </button>
                        )}
                        {pending ? (
                          <div style={{
                            padding: '12px 20px', borderRadius: 12, border: '1px solid rgba(245,158,11,0.2)',
                            background: 'rgba(245,158,11,0.1)', color: '#fcd34d',
                            fontSize: 14, fontWeight: 600, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, whiteSpace: 'nowrap', width: '100%'
                          }}>
                            ⏳ Waiting for Approval
                          </div>
                        ) : (
                          <div style={{ display: 'flex', gap: 8, width: '100%' }}>
                            <label style={{
                              flex: 1, padding: '12px 0', borderRadius: 12, border: '1px dashed rgba(255,255,255,0.3)', cursor: 'pointer',
                              background: 'rgba(255,255,255,0.05)', color: '#e2e8f0',
                              fontSize: 13, fontWeight: 600, transition: 'all 0.2s', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, whiteSpace: 'nowrap'
                            }} onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.1)'; }}
                               onMouseLeave={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.05)'; }}>
                              <input type="file" style={{ display: 'none' }} accept="image/*" onChange={(e) => handleUploadProof(e, s)} disabled={uploadingProof === s.to.id} />
                              {uploadingProof === s.to.id ? 'Uploading...' : '📎 Proof'}
                            </label>
                            <button onClick={() => handleMarkPaid(s)} disabled={uploadingProof === s.to.id} style={{
                              flex: 1, padding: '12px 0', borderRadius: 12, border: '1px solid rgba(34,197,94,0.3)', cursor: 'pointer',
                              background: 'rgba(34,197,94,0.1)', color: '#4ade80',
                              fontSize: 13, fontWeight: 600, transition: 'all 0.2s', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, whiteSpace: 'nowrap'
                            }} onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(34,197,94,0.2)'; }}
                               onMouseLeave={(e) => { e.currentTarget.style.background = 'rgba(34,197,94,0.1)'; }}>
                              💵 Cash
                            </button>
                          </div>
                        )}
                      </div>
                    );
                  }

                  if (s.to?.id === user?.id) {
                    // Current user is the creditor
                    return (
                      <div style={{ display: 'flex', gap: 12 }}>
                        {pending && pending.proofUrl && (
                          <button onClick={() => setShowProofModal(pending.proofUrl)} style={{
                            padding: '12px 20px', borderRadius: 12, border: '1px solid rgba(255,255,255,0.2)', cursor: 'pointer',
                            background: 'transparent', color: '#e2e8f0',
                            fontSize: 14, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 6
                          }}>
                            🧾 View Receipt
                          </button>
                        )}
                        <button onClick={() => setConfirmSettle(s)} style={{
                          padding: '12px 20px', borderRadius: 12, border: 'none', cursor: 'pointer',
                          background: 'linear-gradient(135deg, #22c55e, #14b8a6)', color: '#fff',
                          fontSize: 14, fontWeight: 600, transition: 'all 0.2s', boxShadow: '0 8px 24px rgba(34,197,94,0.3)',
                        }} onMouseEnter={(e) => { e.currentTarget.style.transform = 'translateY(-2px)'; }}
                           onMouseLeave={(e) => { e.currentTarget.style.transform = 'translateY(0)'; }}>
                          Mark Paid ✓
                        </button>
                      </div>
                    );
                  }

                  return null;
                })()}
              </div>
            ))}
          </div>
        )}
      </div>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      {showAddSubscription && (
        <AddSubscriptionModal
          groupId={id}
          members={group?.members || []}
          onClose={() => setShowAddSubscription(false)}
          onAdded={() => {
            setShowAddSubscription(false);
            fetchGroup();
          }}
        />
      )}
    </div>
  );
}
