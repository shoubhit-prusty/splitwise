import { useState, useCallback, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import api from '../api/axiosInstance';
import Avatar from '../components/Avatar';

export default function ScanReceiptPage() {
  const { id: groupId } = useParams();
  const navigate = useNavigate();
  const [step, setStep] = useState('upload'); // upload | review | saving
  const [dragging, setDragging] = useState(false);
  const [preview, setPreview] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [items, setItems] = useState([]);
  const [receiptUrl, setReceiptUrl] = useState('');
  const [description, setDescription] = useState('Restaurant bill');
  const [tax, setTax] = useState('');
  const [tip, setTip] = useState('');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const [members, setMembers] = useState([]);
  const [enableRoundOff, setEnableRoundOff] = useState(true);

  useEffect(() => {
    // Fetch group members so we can assign them to items
    api.get(`/groups/${groupId}`)
      .then(res => setMembers(res.data.group.members.map(m => m.user)))
      .catch(err => console.error("Failed to load members", err));
  }, [groupId]);

  const handleFile = async (file) => {
    if (!file) return;
    setPreview(URL.createObjectURL(file));
    setUploading(true);
    setError('');
    try {
      const formData = new FormData();
      formData.append('receipt', file);
      const { data } = await api.post('/receipts/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      setItems(data.items.map((item, i) => ({ ...item, id: i, assignedUserIds: [] })));
      if (data.tax) setTax(data.tax);
      if (data.tip) setTip(data.tip);
      setReceiptUrl(data.receiptUrl);
      setStep('review');
    } catch (err) {
      setError(err.response?.data?.error || 'OCR processing failed. Please try again.');
    } finally {
      setUploading(false);
    }
  };

  const onDrop = useCallback((e) => {
    e.preventDefault();
    setDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  }, []);

  const updateItem = (id, field, value) => {
    setItems((prev) => prev.map((item) => item.id === id ? { ...item, [field]: value } : item));
  };

  const toggleAssignee = (itemId, userId) => {
    setItems((prev) => prev.map((item) => {
      if (item.id !== itemId) return item;
      const assigned = item.assignedUserIds || [];
      if (assigned.includes(userId)) {
        return { ...item, assignedUserIds: assigned.filter(id => id !== userId) };
      } else {
        return { ...item, assignedUserIds: [...assigned, userId] };
      }
    }));
  };

  const removeItem = (id) => setItems((prev) => prev.filter((item) => item.id !== id));

  const addItem = () => {
    const newId = Date.now();
    setItems((prev) => [...prev, { id: newId, name: '', price: 0, quantity: 1, isVeg: true, assignedUserIds: [] }]);
  };

  const subtotal = items.reduce((s, i) => s + (parseFloat(i.price) || 0) * (parseInt(i.quantity) || 1), 0);
  const exactTotal = subtotal + (parseFloat(tax) || 0) + (parseFloat(tip) || 0);
  const total = enableRoundOff ? Math.round(exactTotal) : exactTotal;
  const roundOff = enableRoundOff ? total - exactTotal : 0;

  const handleConfirm = async () => {
    setSaving(true);
    setError('');
    try {
      await api.post('/receipts/confirm', {
        groupId,
        description,
        items,
        tax: parseFloat(tax) || 0,
        tip: parseFloat(tip) || 0,
        roundOff: parseFloat(roundOff.toFixed(2)),
        receiptUrl,
      });
      navigate(`/groups/${groupId}`);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to save expense.');
      setSaving(false);
    }
  };

  const inputStyle = {
    background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)',
    color: '#f8fafc', padding: '12px 16px', borderRadius: 12, fontSize: 14, outline: 'none', transition: 'all 0.2s',
    minWidth: 0,
  };

  return (
    <div style={{ minHeight: '100vh', background: '#060612', color: '#e2e8f0', fontFamily: "'Inter', sans-serif" }}>
      {/* Background glow */}
      <div style={{
        position: 'fixed', inset: 0, zIndex: 0, pointerEvents: 'none',
        background: 'radial-gradient(ellipse 50% 40% at 20% 20%, rgba(99,102,241,0.08) 0%, transparent 60%), radial-gradient(ellipse 40% 30% at 80% 80%, rgba(236,72,153,0.06) 0%, transparent 60%)',
      }} />

      {/* Header */}
      <div style={{
        position: 'sticky', top: 0, zIndex: 40, padding: '20px 32px',
        background: 'rgba(6, 6, 18, 0.8)', backdropFilter: 'blur(16px)',
        borderBottom: '1px solid rgba(255,255,255,0.08)',
      }}>
        <div style={{ maxWidth: 800, margin: '0 auto', display: 'flex', alignItems: 'center', gap: 20 }}>
          <Link to={`/groups/${groupId}`} style={{
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            width: 40, height: 40, borderRadius: 12, background: 'rgba(255,255,255,0.04)',
            border: '1px solid rgba(255,255,255,0.08)', color: '#94a3b8', textDecoration: 'none',
            fontSize: 20, transition: 'all 0.2s',
          }} onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.08)'; e.currentTarget.style.color = '#fff'; }}
             onMouseLeave={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.04)'; e.currentTarget.style.color = '#94a3b8'; }}>
            ←
          </Link>
          <h1 style={{ fontSize: 20, fontWeight: 700, color: '#fff', margin: 0 }}>📷 Scan Receipt</h1>
        </div>
      </div>

      <div style={{ maxWidth: 800, margin: '0 auto', padding: '32px 32px', position: 'relative', zIndex: 1 }}>
        {error && (
          <div style={{ padding: '16px', borderRadius: 16, background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)', color: '#fca5a5', marginBottom: 24, fontSize: 14 }}>
            ⚠️ {error}
          </div>
        )}

        {/* STEP 1: Upload */}
        {step === 'upload' && (
          <div style={{ animation: 'fadeUp 0.3s ease' }}>
            <div
              onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
              onDragLeave={() => setDragging(false)}
              onDrop={onDrop}
              onClick={() => document.getElementById('receipt-file-input').click()}
              style={{
                padding: '64px 32px', borderRadius: 24, textAlign: 'center', cursor: 'pointer', transition: 'all 0.2s',
                border: `2px dashed ${dragging ? '#6366f1' : 'rgba(255,255,255,0.1)'}`,
                background: dragging ? 'rgba(99,102,241,0.05)' : 'rgba(255,255,255,0.02)',
              }}>
              <input id="receipt-file-input" type="file" accept="image/*" style={{ display: 'none' }} onChange={(e) => handleFile(e.target.files[0])} />

              {uploading ? (
                <div>
                  <div style={{ width: 48, height: 48, border: '3px solid rgba(99,102,241,0.2)', borderTopColor: '#6366f1', borderRadius: '50%', animation: 'spin 1s linear infinite', margin: '0 auto 16px' }} />
                  <p style={{ fontSize: 18, fontWeight: 600, color: '#f8fafc', margin: '0 0 8px' }}>Scanning with AI...</p>
                  <p style={{ fontSize: 14, color: '#64748b', margin: 0 }}>Extracting items and prices</p>
                </div>
              ) : (
                <div>
                  <div style={{ fontSize: 64, marginBottom: 16 }}>🧾</div>
                  <p style={{ fontSize: 20, fontWeight: 700, color: '#f8fafc', margin: '0 0 8px' }}>
                    {dragging ? 'Drop it here!' : 'Upload a receipt'}
                  </p>
                  <p style={{ fontSize: 14, color: '#64748b', margin: '0 0 24px' }}>Drag & drop or click to browse · JPEG, PNG, WebP</p>
                  <div style={{
                    display: 'inline-flex', padding: '12px 24px', borderRadius: 12, fontWeight: 600, color: '#fff',
                    background: 'linear-gradient(135deg, #6366f1, #8b5cf6)', boxShadow: '0 8px 24px rgba(99,102,241,0.3)',
                  }}>Choose image</div>
                </div>
              )}
            </div>
            {preview && !uploading && (
              <div style={{ marginTop: 24, padding: 16, borderRadius: 20, background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)' }}>
                <img src={preview} alt="Preview" style={{ width: '100%', maxHeight: 300, objectFit: 'contain', borderRadius: 12 }} />
              </div>
            )}
          </div>
        )}

        {/* STEP 2: Review */}
        {step === 'review' && (
          <div style={{ animation: 'fadeUp 0.3s ease', display: 'flex', flexDirection: 'column', gap: 24 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <h2 style={{ fontSize: 20, fontWeight: 700, color: '#f8fafc', margin: 0 }}>Review & Assign Items</h2>
              <button onClick={() => setStep('upload')} style={{ background: 'none', border: 'none', color: '#818cf8', cursor: 'pointer', fontSize: 14, fontWeight: 600 }}>← Re-upload</button>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: 13, fontWeight: 500, color: '#94a3b8', marginBottom: 8 }}>Expense Title</label>
              <input value={description} onChange={(e) => setDescription(e.target.value)} style={{ ...inputStyle, width: '100%', boxSizing: 'border-box' }}
                onFocus={(e) => { e.target.style.borderColor = 'rgba(99,102,241,0.5)'; e.target.style.background = 'rgba(99,102,241,0.03)'; }}
                onBlur={(e) => { e.target.style.borderColor = 'rgba(255,255,255,0.08)'; e.target.style.background = 'rgba(255,255,255,0.03)'; }} />
            </div>

            <div style={{ borderRadius: 20, background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.08)', overflow: 'hidden' }}>
              <div style={{ display: 'flex', padding: '12px 20px', background: 'rgba(255,255,255,0.02)', borderBottom: '1px solid rgba(255,255,255,0.08)', fontSize: 12, fontWeight: 600, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                <div style={{ flex: 2 }}>Item</div>
                <div style={{ flex: 1, textAlign: 'right' }}>Price</div>
                <div style={{ flex: 0.5, textAlign: 'center' }}>Qty</div>
                <div style={{ width: 40 }}></div>
              </div>

              <div>
                {items.map((item) => (
                  <div key={item.id} style={{ padding: '20px', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                    <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                      <input value={item.name} onChange={(e) => updateItem(item.id, 'name', e.target.value)} style={{ ...inputStyle, flex: 2, padding: '10px 14px' }} placeholder="Item name" />
                      <input value={item.price} type="number" min="0" onChange={(e) => updateItem(item.id, 'price', e.target.value)} style={{ ...inputStyle, flex: 1, padding: '10px 14px', textAlign: 'right' }} />
                      <input value={item.quantity} type="number" min="1" onChange={(e) => updateItem(item.id, 'quantity', e.target.value)} style={{ ...inputStyle, flex: 0.5, padding: '10px 14px', textAlign: 'center' }} />
                      <button 
                        onClick={() => updateItem(item.id, 'isVeg', !item.isVeg)} 
                        style={{ 
                          background: item.isVeg ? 'rgba(34,197,94,0.1)' : 'rgba(244,63,94,0.1)', 
                          border: `1px solid ${item.isVeg ? 'rgba(34,197,94,0.3)' : 'rgba(244,63,94,0.3)'}`, 
                          color: item.isVeg ? '#4ade80' : '#f43f5e', 
                          fontSize: 12, fontWeight: 700, padding: '10px 14px', borderRadius: 8, cursor: 'pointer', transition: 'all 0.2s', whiteSpace: 'nowrap', flexShrink: 0
                        }}
                        onMouseEnter={e => e.currentTarget.style.transform = 'scale(1.05)'}
                        onMouseLeave={e => e.currentTarget.style.transform = 'scale(1)'}
                      >
                        {item.isVeg ? '🟢 Veg' : '🥩 Non-Veg'}
                      </button>
                      <button onClick={() => removeItem(item.id)} style={{ background: 'none', border: 'none', color: '#f43f5e', fontSize: 20, cursor: 'pointer', padding: '10px', opacity: 0.7, flexShrink: 0 }} onMouseEnter={e => e.target.style.opacity=1} onMouseLeave={e => e.target.style.opacity=0.7}>×</button>
                    </div>
                    
                    {/* Assignees */}
                    <div style={{ marginTop: 12, display: 'flex', alignItems: 'center', gap: 12 }}>
                      <span style={{ fontSize: 12, color: '#94a3b8', fontWeight: 500 }}>Who ate this?</span>
                      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                        {members.map(member => {
                          const isAssigned = (item.assignedUserIds || []).includes(member.id);
                          return (
                            <div key={member.id} onClick={() => toggleAssignee(item.id, member.id)} style={{
                              display: 'flex', alignItems: 'center', gap: 6, padding: '4px 10px 4px 4px', borderRadius: 20, cursor: 'pointer', transition: 'all 0.2s',
                              background: isAssigned ? 'rgba(99,102,241,0.2)' : 'rgba(255,255,255,0.03)',
                              border: `1px solid ${isAssigned ? 'rgba(99,102,241,0.4)' : 'rgba(255,255,255,0.08)'}`,
                            }}>
                              <Avatar name={member.name} color={member.avatarColor} size={20} />
                              <span style={{ fontSize: 11, fontWeight: 500, color: isAssigned ? '#a5b4fc' : '#64748b' }}>{member.name.split(' ')[0]}</span>
                            </div>
                          );
                        })}
                      </div>
                      <span style={{ fontSize: 11, color: '#64748b', marginLeft: 'auto', textAlign: 'right' }}>
                        {item.assignedUserIds?.length > 0 
                          ? `Split among ${item.assignedUserIds.length}`
                          : item.isVeg 
                            ? 'Splitting among everyone (Veg)' 
                            : 'Splitting among non-vegetarians'}
                      </span>
                    </div>
                  </div>
                ))}
              </div>

              <button onClick={addItem} style={{
                width: '100%', padding: '16px', background: 'transparent', border: 'none',
                color: '#818cf8', fontSize: 14, fontWeight: 600, cursor: 'pointer', transition: 'all 0.2s'
              }} onMouseEnter={e => e.target.style.background = 'rgba(99,102,241,0.05)'} onMouseLeave={e => e.target.style.background = 'transparent'}>
                + Add manual item
              </button>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
              <div>
                <label style={{ display: 'block', fontSize: 13, fontWeight: 500, color: '#94a3b8', marginBottom: 8 }}>Tax (₹)</label>
                <input type="number" min="0" value={tax} onChange={(e) => setTax(e.target.value)} style={{ ...inputStyle, width: '100%', boxSizing: 'border-box' }} placeholder="0" />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: 13, fontWeight: 500, color: '#94a3b8', marginBottom: 8 }}>Tip (₹)</label>
                <input type="number" min="0" value={tip} onChange={(e) => setTip(e.target.value)} style={{ ...inputStyle, width: '100%', boxSizing: 'border-box' }} placeholder="0" />
              </div>
            </div>

            <div style={{ padding: '24px', borderRadius: 20, background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', color: '#94a3b8', fontSize: 14, marginBottom: 8 }}>
                <span>Subtotal</span><span>₹{subtotal.toFixed(2)}</span>
              </div>
              {parseFloat(tax) > 0 && <div style={{ display: 'flex', justifyContent: 'space-between', color: '#94a3b8', fontSize: 14, marginBottom: 8 }}><span>Tax</span><span>₹{parseFloat(tax).toFixed(2)}</span></div>}
              {parseFloat(tip) > 0 && <div style={{ display: 'flex', justifyContent: 'space-between', color: '#94a3b8', fontSize: 14, marginBottom: 8 }}><span>Tip</span><span>₹{parseFloat(tip).toFixed(2)}</span></div>}
              
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', color: '#94a3b8', fontSize: 14, marginBottom: 8 }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
                  <input type="checkbox" checked={enableRoundOff} onChange={(e) => setEnableRoundOff(e.target.checked)} style={{ accentColor: '#6366f1' }} />
                  Round off bill
                </label>
                {enableRoundOff && <span>{roundOff > 0 ? '+' : ''}₹{roundOff.toFixed(2)}</span>}
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', color: '#f8fafc', fontSize: 20, fontWeight: 800, marginTop: 16, paddingTop: 16, borderTop: '1px solid rgba(255,255,255,0.08)' }}>
                <span>Total</span><span>₹{total.toFixed(2)}</span>
              </div>
            </div>

            <button onClick={handleConfirm} disabled={saving || items.length === 0} style={{
              width: '100%', padding: '18px', borderRadius: 16, border: 'none',
              background: saving || items.length === 0 ? 'rgba(99,102,241,0.3)' : 'linear-gradient(135deg, #6366f1, #8b5cf6)',
              color: '#fff', fontSize: 16, fontWeight: 700, cursor: saving || items.length === 0 ? 'not-allowed' : 'pointer',
              boxShadow: saving || items.length === 0 ? 'none' : '0 8px 32px rgba(99,102,241,0.4)', transition: 'all 0.2s'
            }}>
              {saving ? 'Saving expense...' : `✓ Split ₹${total.toFixed(0)} Now`}
            </button>
          </div>
        )}
      </div>

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes fadeUp { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
      `}</style>
    </div>
  );
}
