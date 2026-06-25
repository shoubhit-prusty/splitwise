import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function RegisterPage() {
  const { register } = useAuth();
  const navigate = useNavigate();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState(1); // 2-step form

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (step === 1) { setStep(2); return; }
    setError('');
    if (password.length < 6) return setError('Password must be at least 6 characters.');
    setLoading(true);
    try {
      await register(name, email, phone, password);
      navigate('/dashboard');
    } catch (err) {
      setError(err.response?.data?.error || 'Registration failed. Try again.');
    } finally {
      setLoading(false);
    }
  };

  const inputStyle = {
    width: '100%', padding: '13px 14px 13px 40px', borderRadius: 12,
    background: 'rgba(255,255,255,0.05)',
    border: '1px solid rgba(255,255,255,0.1)',
    color: '#f1f5f9', fontSize: 14, outline: 'none', boxSizing: 'border-box',
    transition: 'border-color 0.15s, background 0.15s',
  };

  const fieldFocus = (e) => { e.target.style.borderColor = 'rgba(99,102,241,0.7)'; e.target.style.background = 'rgba(99,102,241,0.06)'; };
  const fieldBlur = (e) => { e.target.style.borderColor = 'rgba(255,255,255,0.1)'; e.target.style.background = 'rgba(255,255,255,0.05)'; };

  return (
    <div style={{
      minHeight: '100vh', display: 'flex',
      fontFamily: "'Inter', -apple-system, sans-serif",
      background: '#060612', position: 'relative', overflow: 'hidden',
    }}>
      {/* Background */}
      <div style={{
        position: 'fixed', inset: 0, zIndex: 0,
        background: 'radial-gradient(ellipse 70% 50% at 80% 30%, rgba(139,92,246,0.14) 0%, transparent 60%), radial-gradient(ellipse 60% 50% at 20% 80%, rgba(236,72,153,0.12) 0%, transparent 60%), radial-gradient(ellipse 40% 30% at 50% 50%, rgba(99,102,241,0.08) 0%, transparent 60%)',
      }} />
      <div style={{
        position: 'fixed', inset: 0, zIndex: 0,
        backgroundImage: 'linear-gradient(rgba(255,255,255,0.02) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.02) 1px, transparent 1px)',
        backgroundSize: '64px 64px',
      }} />

      {/* Left panel */}
      <div style={{
        flex: 1, display: 'flex', flexDirection: 'column',
        justifyContent: 'center', padding: '80px',
        position: 'relative', zIndex: 1,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 64 }}>
          <div style={{
            width: 40, height: 40, borderRadius: 12,
            background: 'linear-gradient(135deg, #6366f1, #a855f7)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 18, boxShadow: '0 0 20px rgba(99,102,241,0.4)',
          }}>⚡</div>
          <span style={{ fontSize: 20, fontWeight: 700, color: '#fff', letterSpacing: '-0.3px' }}>SplitWise</span>
        </div>

        <h1 style={{
          fontSize: 52, fontWeight: 800, lineHeight: 1.05,
          letterSpacing: '-2px', margin: '0 0 20px', color: '#fff', maxWidth: 440,
        }}>
          Your group's<br />
          <span style={{
            background: 'linear-gradient(135deg, #818cf8 0%, #c084fc 50%, #f472b6 100%)',
            WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
          }}>financial brain.</span>
        </h1>

        <p style={{ fontSize: 17, color: '#64748b', lineHeight: 1.7, margin: '0 0 52px', maxWidth: 360 }}>
          From restaurant bills to vacation expenses — split everything fairly in seconds.
        </p>

        {/* Feature list */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16, maxWidth: 380 }}>
          {[
            { icon: '📷', title: 'Scan any receipt', desc: 'OCR reads your bill automatically' },
            { icon: '🧮', title: 'Smart debt simplification', desc: 'Minimize transactions for the group' },
            { icon: '🥗', title: 'Veg / Non-veg splits', desc: 'Auto-exclude non-veg items for vegetarians' },
          ].map((f) => (
            <div key={f.title} style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
              <div style={{
                width: 44, height: 44, borderRadius: 12, flexShrink: 0,
                background: 'rgba(99,102,241,0.12)', border: '1px solid rgba(99,102,241,0.2)',
                display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20,
              }}>{f.icon}</div>
              <div>
                <div style={{ fontSize: 14, fontWeight: 600, color: '#e2e8f0', marginBottom: 2 }}>{f.title}</div>
                <div style={{ fontSize: 13, color: '#475569' }}>{f.desc}</div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Right panel */}
      <div style={{
        width: 520, display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: '40px', position: 'relative', zIndex: 1,
      }}>
        <div style={{
          width: '100%', maxWidth: 420,
          background: 'rgba(255,255,255,0.04)',
          backdropFilter: 'blur(24px)',
          border: '1px solid rgba(255,255,255,0.08)',
          borderRadius: 24, padding: '40px',
          boxShadow: '0 32px 64px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.06)',
        }}>
          {/* Progress */}
          <div style={{ display: 'flex', gap: 6, marginBottom: 28 }}>
            {[1, 2].map((s) => (
              <div key={s} style={{
                flex: 1, height: 3, borderRadius: 2,
                background: step >= s ? 'linear-gradient(90deg, #6366f1, #a855f7)' : 'rgba(255,255,255,0.1)',
                transition: 'background 0.3s',
              }} />
            ))}
          </div>

          <div style={{ marginBottom: 28 }}>
            <h2 style={{ fontSize: 24, fontWeight: 700, color: '#f8fafc', margin: '0 0 6px', letterSpacing: '-0.5px' }}>
              {step === 1 ? 'Create account' : 'Set your password'}
            </h2>
            <p style={{ color: '#475569', fontSize: 14, margin: 0 }}>
              {step === 1 ? 'Step 1 of 2 — Basic info' : 'Step 2 of 2 — Secure your account'}
            </p>
          </div>

          {error && (
            <div style={{
              display: 'flex', alignItems: 'center', gap: 10,
              padding: '12px 16px', borderRadius: 12, marginBottom: 20,
              background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)',
              color: '#fca5a5', fontSize: 14,
            }}>
              <span>⚠️</span> {error}
            </div>
          )}

          <form onSubmit={handleSubmit}>
            {step === 1 ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                {/* Name */}
                <div>
                  <label style={{ display: 'block', fontSize: 13, fontWeight: 500, color: '#94a3b8', marginBottom: 8 }}>Full name</label>
                  <div style={{ position: 'relative' }}>
                    <span style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', fontSize: 15, opacity: 0.4 }}>👤</span>
                    <input id="reg-name" type="text" required autoComplete="name" value={name}
                      onChange={(e) => setName(e.target.value)} placeholder="Your full name"
                      style={inputStyle} onFocus={fieldFocus} onBlur={fieldBlur} />
                  </div>
                </div>
                {/* Email */}
                <div>
                  <label style={{ display: 'block', fontSize: 13, fontWeight: 500, color: '#94a3b8', marginBottom: 8 }}>Email address</label>
                  <div style={{ position: 'relative' }}>
                    <span style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', fontSize: 15, opacity: 0.4 }}>✉</span>
                    <input id="reg-email" type="email" required autoComplete="email" value={email}
                      onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com"
                      style={inputStyle} onFocus={fieldFocus} onBlur={fieldBlur} />
                  </div>
                </div>
                {/* Phone */}
                <div>
                  <label style={{ display: 'block', fontSize: 13, fontWeight: 500, color: '#94a3b8', marginBottom: 8 }}>
                    Phone <span style={{ color: '#334155', fontWeight: 400 }}>(optional)</span>
                  </label>
                  <div style={{ position: 'relative' }}>
                    <span style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', fontSize: 15, opacity: 0.4 }}>📱</span>
                    <input id="reg-phone" type="tel" autoComplete="tel" value={phone}
                      onChange={(e) => setPhone(e.target.value)} placeholder="+91 98765 43210"
                      style={inputStyle} onFocus={fieldFocus} onBlur={fieldBlur} />
                  </div>
                </div>
              </div>
            ) : (
              <div>
                <label style={{ display: 'block', fontSize: 13, fontWeight: 500, color: '#94a3b8', marginBottom: 8 }}>Create a password</label>
                <div style={{ position: 'relative' }}>
                  <span style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', fontSize: 15, opacity: 0.4 }}>🔒</span>
                  <input id="reg-password" type={showPassword ? 'text' : 'password'} required autoComplete="new-password"
                    value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Min. 6 characters"
                    style={{ ...inputStyle, paddingRight: 44 }} onFocus={fieldFocus} onBlur={fieldBlur} />
                  <button type="button" onClick={() => setShowPassword(!showPassword)} style={{
                    position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)',
                    background: 'none', border: 'none', cursor: 'pointer', color: '#475569', fontSize: 14, padding: 4,
                  }}>{showPassword ? '🙈' : '👁'}</button>
                </div>
                {/* Strength indicator */}
                {password && (
                  <div style={{ marginTop: 10 }}>
                    <div style={{ display: 'flex', gap: 4, marginBottom: 6 }}>
                      {[1,2,3,4].map((lvl) => (
                        <div key={lvl} style={{
                          flex: 1, height: 3, borderRadius: 2,
                          background: password.length >= lvl * 2
                            ? lvl <= 1 ? '#ef4444' : lvl <= 2 ? '#f97316' : lvl <= 3 ? '#eab308' : '#22c55e'
                            : 'rgba(255,255,255,0.1)',
                          transition: 'background 0.2s',
                        }} />
                      ))}
                    </div>
                    <p style={{ fontSize: 12, color: '#475569', margin: 0 }}>
                      {password.length < 4 ? 'Too weak' : password.length < 6 ? 'Weak' : password.length < 8 ? 'Good' : 'Strong'}
                    </p>
                  </div>
                )}
                <button type="button" onClick={() => setStep(1)} style={{
                  marginTop: 16, background: 'none', border: 'none', color: '#475569',
                  fontSize: 13, cursor: 'pointer', padding: 0, textDecoration: 'underline',
                }}>← Back to step 1</button>
              </div>
            )}

            <button
              id="register-submit"
              type="submit"
              disabled={loading}
              style={{
                width: '100%', marginTop: 24, padding: '14px', borderRadius: 12, border: 'none',
                background: loading ? 'rgba(99,102,241,0.3)' : 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)',
                color: '#fff', fontSize: 15, fontWeight: 600,
                cursor: loading ? 'not-allowed' : 'pointer',
                boxShadow: loading ? 'none' : '0 4px 20px rgba(99,102,241,0.35)',
                transition: 'all 0.2s', letterSpacing: '-0.1px',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
              }}
              onMouseEnter={(e) => { if (!loading) { e.currentTarget.style.transform = 'translateY(-1px)'; e.currentTarget.style.boxShadow = '0 8px 30px rgba(99,102,241,0.45)'; }}}
              onMouseLeave={(e) => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = '0 4px 20px rgba(99,102,241,0.35)'; }}
            >
              {loading ? (
                <><span style={{ width: 16, height: 16, border: '2px solid rgba(255,255,255,0.3)', borderTopColor: '#fff', borderRadius: '50%', display: 'inline-block', animation: 'spin 0.8s linear infinite' }} /> Creating...</>
              ) : step === 1 ? 'Continue →' : 'Create my account →'}
            </button>
          </form>

          <p style={{ marginTop: 24, textAlign: 'center', fontSize: 14, color: '#475569' }}>
            Already have an account?{' '}
            <Link to="/login" style={{ color: '#818cf8', fontWeight: 600, textDecoration: 'none' }}>Sign in</Link>
          </p>
        </div>
      </div>

      <style>{`@keyframes spin { to { transform: rotate(360deg); } } input::placeholder { color: #334155; }`}</style>
    </div>
  );
}
