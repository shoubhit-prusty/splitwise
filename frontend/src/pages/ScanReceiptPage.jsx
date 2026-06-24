import { useState, useCallback } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import api from '../api/axiosInstance';

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

  const removeItem = (id) => setItems((prev) => prev.filter((item) => item.id !== id));

  const addItem = () => {
    const newId = Date.now();
    setItems((prev) => [...prev, { id: newId, name: '', price: 0, quantity: 1, isVeg: true, assignedUserIds: [] }]);
  };

  const subtotal = items.reduce((s, i) => s + (parseFloat(i.price) || 0) * (parseInt(i.quantity) || 1), 0);
  const total = subtotal + (parseFloat(tax) || 0) + (parseFloat(tip) || 0);

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
        receiptUrl,
      });
      navigate(`/groups/${groupId}`);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to save expense.');
      setSaving(false);
    }
  };

  const inputStyle = {
    background: 'rgba(255,255,255,0.05)',
    border: '1px solid var(--color-border)',
    color: 'var(--color-text)',
  };

  return (
    <div className="min-h-screen" style={{ background: 'var(--color-bg)' }}>
      {/* Header */}
      <div className="sticky top-0 z-40 px-6 py-4"
        style={{ background: 'rgba(15,15,26,0.9)', backdropFilter: 'blur(16px)', borderBottom: '1px solid var(--color-border)' }}>
        <div className="max-w-3xl mx-auto flex items-center gap-4">
          <Link to={`/groups/${groupId}`} style={{ color: 'var(--color-text-muted)' }}>← Back</Link>
          <h1 className="font-bold text-lg" style={{ color: 'var(--color-text)' }}>📷 Scan Receipt</h1>
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-6 py-8">
        {error && (
          <div className="mb-6 p-4 rounded-xl text-sm"
            style={{ background: 'rgba(244,63,94,0.15)', border: '1px solid rgba(244,63,94,0.3)', color: '#f43f5e' }}>
            {error}
          </div>
        )}

        {/* STEP 1: Upload */}
        {step === 'upload' && (
          <div className="animate-fade-in-up">
            <div
              onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
              onDragLeave={() => setDragging(false)}
              onDrop={onDrop}
              className="relative rounded-2xl p-12 text-center transition-all cursor-pointer"
              style={{
                border: `2px dashed ${dragging ? '#6366f1' : 'var(--color-border)'}`,
                background: dragging ? 'rgba(99,102,241,0.05)' : 'rgba(255,255,255,0.02)',
              }}
              onClick={() => document.getElementById('receipt-file-input').click()}>
              <input id="receipt-file-input" type="file" accept="image/*" className="hidden"
                onChange={(e) => handleFile(e.target.files[0])} />

              {uploading ? (
                <>
                  <div className="w-12 h-12 rounded-full border-2 border-transparent mx-auto mb-4"
                    style={{ borderTopColor: '#6366f1', animation: 'spin 1s linear infinite' }} />
                  <p className="font-medium" style={{ color: 'var(--color-text)' }}>Processing receipt with OCR...</p>
                  <p className="text-sm mt-1" style={{ color: 'var(--color-text-muted)' }}>This may take a few seconds</p>
                </>
              ) : (
                <>
                  <div className="text-5xl mb-4">🧾</div>
                  <p className="font-semibold text-lg mb-2" style={{ color: 'var(--color-text)' }}>
                    {dragging ? 'Drop it here!' : 'Upload a receipt'}
                  </p>
                  <p className="text-sm" style={{ color: 'var(--color-text-muted)' }}>
                    Drag & drop or click to browse · JPEG, PNG, WebP · Max 10MB
                  </p>
                  <div className="mt-6 inline-flex items-center gap-2 px-6 py-3 rounded-xl font-medium text-white"
                    style={{ background: 'linear-gradient(135deg, #6366f1, #8b5cf6)', boxShadow: '0 4px 15px rgba(99,102,241,0.3)' }}>
                    Choose image
                  </div>
                </>
              )}
            </div>

            {preview && !uploading && (
              <div className="mt-4 glass rounded-xl p-3">
                <img src={preview} alt="Receipt preview" className="w-full max-h-64 object-contain rounded-lg" />
              </div>
            )}
          </div>
        )}

        {/* STEP 2: Review */}
        {step === 'review' && (
          <div className="animate-fade-in-up space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold" style={{ color: 'var(--color-text)' }}>
                Review & Edit Items
              </h2>
              <button onClick={() => setStep('upload')} className="text-sm"
                style={{ color: 'var(--color-text-muted)' }}>
                ← Re-upload
              </button>
            </div>

            {/* Description */}
            <div>
              <label className="block text-sm font-medium mb-2" style={{ color: 'var(--color-text-muted)' }}>
                Expense description
              </label>
              <input value={description} onChange={(e) => setDescription(e.target.value)}
                className="w-full px-4 py-3 rounded-xl text-sm outline-none"
                style={inputStyle}
                onFocus={(e) => (e.target.style.borderColor = '#6366f1')}
                onBlur={(e) => (e.target.style.borderColor = 'var(--color-border)')} />
            </div>

            {/* Items table */}
            <div className="glass rounded-xl overflow-hidden">
              <div className="grid text-xs font-medium uppercase tracking-wider px-4 py-3"
                style={{ color: 'var(--color-text-muted)', gridTemplateColumns: '1fr 80px 70px 80px 32px', background: 'rgba(255,255,255,0.03)', borderBottom: '1px solid var(--color-border)' }}>
                <span>Item name</span>
                <span className="text-right">Price</span>
                <span className="text-right">Qty</span>
                <span className="text-center">Diet</span>
                <span />
              </div>

              <div className="divide-y" style={{ borderColor: 'var(--color-border)' }}>
                {items.map((item) => (
                  <div key={item.id} className="grid items-center px-4 py-3 gap-2"
                    style={{ gridTemplateColumns: '1fr 80px 70px 80px 32px' }}>
                    <input value={item.name}
                      onChange={(e) => updateItem(item.id, 'name', e.target.value)}
                      className="px-2 py-1.5 rounded-lg text-sm outline-none w-full"
                      style={inputStyle}
                      placeholder="Item name" />
                    <input value={item.price} type="number" min="0"
                      onChange={(e) => updateItem(item.id, 'price', e.target.value)}
                      className="px-2 py-1.5 rounded-lg text-sm outline-none text-right w-full"
                      style={inputStyle} />
                    <input value={item.quantity} type="number" min="1"
                      onChange={(e) => updateItem(item.id, 'quantity', e.target.value)}
                      className="px-2 py-1.5 rounded-lg text-sm outline-none text-right w-full"
                      style={inputStyle} />
                    <button onClick={() => updateItem(item.id, 'isVeg', !item.isVeg)}
                      className="w-full py-1.5 rounded-lg text-sm font-medium transition-all"
                      style={{
                        background: item.isVeg ? 'rgba(34,197,94,0.15)' : 'rgba(249,115,22,0.15)',
                        border: `1px solid ${item.isVeg ? 'rgba(34,197,94,0.4)' : 'rgba(249,115,22,0.4)'}`,
                        color: item.isVeg ? '#22c55e' : '#f97316',
                      }}>
                      {item.isVeg ? '🟢' : '🔴'}
                    </button>
                    <button onClick={() => removeItem(item.id)} className="text-center opacity-40 hover:opacity-100 transition-opacity"
                      style={{ color: '#f43f5e', fontSize: 18 }}>×</button>
                  </div>
                ))}
              </div>

              <button onClick={addItem}
                className="w-full py-3 text-sm font-medium transition-all"
                style={{ color: '#6366f1', borderTop: '1px solid var(--color-border)', background: 'transparent' }}
                onMouseEnter={(e) => (e.target.style.background = 'rgba(99,102,241,0.05)')}
                onMouseLeave={(e) => (e.target.style.background = 'transparent')}>
                + Add item
              </button>
            </div>

            {/* Tax & Tip */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-2" style={{ color: 'var(--color-text-muted)' }}>Tax (₹)</label>
                <input id="tax-input" type="number" min="0" value={tax}
                  onChange={(e) => setTax(e.target.value)} placeholder="0"
                  className="w-full px-4 py-3 rounded-xl text-sm outline-none"
                  style={inputStyle}
                  onFocus={(e) => (e.target.style.borderColor = '#6366f1')}
                  onBlur={(e) => (e.target.style.borderColor = 'var(--color-border)')} />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2" style={{ color: 'var(--color-text-muted)' }}>Tip (₹)</label>
                <input id="tip-input" type="number" min="0" value={tip}
                  onChange={(e) => setTip(e.target.value)} placeholder="0"
                  className="w-full px-4 py-3 rounded-xl text-sm outline-none"
                  style={inputStyle}
                  onFocus={(e) => (e.target.style.borderColor = '#6366f1')}
                  onBlur={(e) => (e.target.style.borderColor = 'var(--color-border)')} />
              </div>
            </div>

            {/* Total summary */}
            <div className="glass rounded-xl p-4 space-y-2">
              <div className="flex justify-between text-sm" style={{ color: 'var(--color-text-muted)' }}>
                <span>Subtotal</span><span>₹{subtotal.toFixed(2)}</span>
              </div>
              {parseFloat(tax) > 0 && (
                <div className="flex justify-between text-sm" style={{ color: 'var(--color-text-muted)' }}>
                  <span>Tax</span><span>₹{parseFloat(tax).toFixed(2)}</span>
                </div>
              )}
              {parseFloat(tip) > 0 && (
                <div className="flex justify-between text-sm" style={{ color: 'var(--color-text-muted)' }}>
                  <span>Tip</span><span>₹{parseFloat(tip).toFixed(2)}</span>
                </div>
              )}
              <div className="flex justify-between font-bold pt-2" style={{ borderTop: '1px solid var(--color-border)', color: 'var(--color-text)' }}>
                <span>Total</span><span>₹{total.toFixed(2)}</span>
              </div>
            </div>

            <button id="confirm-receipt-btn" onClick={handleConfirm} disabled={saving || items.length === 0}
              className="w-full py-4 rounded-xl font-semibold text-white text-lg transition-all"
              style={{
                background: saving || items.length === 0 ? 'rgba(99,102,241,0.4)' : 'linear-gradient(135deg, #6366f1, #8b5cf6)',
                boxShadow: saving || items.length === 0 ? 'none' : '0 4px 25px rgba(99,102,241,0.5)',
                cursor: saving || items.length === 0 ? 'not-allowed' : 'pointer',
              }}>
              {saving ? 'Saving expense...' : `✓ Confirm & Split ₹${total.toFixed(0)}`}
            </button>
          </div>
        )}
      </div>

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
