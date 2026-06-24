import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function RegisterPage() {
  const { register } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ name: '', email: '', phone: '', password: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const inputStyle = {
    background: 'rgba(255,255,255,0.05)',
    border: '1px solid var(--color-border)',
    color: 'var(--color-text)',
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (form.password.length < 6) {
      return setError('Password must be at least 6 characters.');
    }
    setLoading(true);
    try {
      await register(form.name, form.email, form.phone, form.password);
      navigate('/dashboard');
    } catch (err) {
      setError(err.response?.data?.error || 'Registration failed.');
    } finally {
      setLoading(false);
    }
  };

  const Field = ({ id, label, type = 'text', key_, placeholder, required = true }) => (
    <div>
      <label className="block text-sm font-medium mb-2" style={{ color: 'var(--color-text-muted)' }}>
        {label} {!required && <span className="text-xs opacity-60">(optional)</span>}
      </label>
      <input
        id={id}
        type={type}
        required={required}
        value={form[key_]}
        onChange={(e) => setForm({ ...form, [key_]: e.target.value })}
        placeholder={placeholder}
        className="w-full px-4 py-3 rounded-xl text-sm outline-none transition-all"
        style={inputStyle}
        onFocus={(e) => (e.target.style.borderColor = '#6366f1')}
        onBlur={(e) => (e.target.style.borderColor = 'var(--color-border)')}
      />
    </div>
  );

  return (
    <div className="min-h-screen flex items-center justify-center relative overflow-hidden"
      style={{ background: 'var(--color-bg)' }}>
      <div className="absolute top-[-20%] right-[-10%] w-96 h-96 rounded-full opacity-20 blur-3xl"
        style={{ background: 'radial-gradient(circle, #8b5cf6, transparent)' }} />
      <div className="absolute bottom-[-20%] left-[-10%] w-96 h-96 rounded-full opacity-15 blur-3xl"
        style={{ background: 'radial-gradient(circle, #ec4899, transparent)' }} />

      <div className="w-full max-w-md px-6 py-8 animate-fade-in-up">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl mb-4"
            style={{ background: 'linear-gradient(135deg, #6366f1, #ec4899)', boxShadow: '0 0 30px rgba(99,102,241,0.4)' }}>
            <span className="text-3xl">⚡</span>
          </div>
          <h1 className="text-3xl font-bold gradient-text">SplitWise</h1>
          <p className="mt-2 text-sm" style={{ color: 'var(--color-text-muted)' }}>Create your account</p>
        </div>

        <div className="glass rounded-2xl p-8">
          {error && (
            <div className="mb-4 p-3 rounded-xl text-sm"
              style={{ background: 'rgba(244,63,94,0.15)', border: '1px solid rgba(244,63,94,0.3)', color: '#f43f5e' }}>
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <Field id="reg-name" label="Full name" key_="name" placeholder="Shoubhit Prusty" />
            <Field id="reg-email" label="Email address" type="email" key_="email" placeholder="you@example.com" />
            <Field id="reg-phone" label="Phone number" type="tel" key_="phone" placeholder="+91 98765 43210" required={false} />
            <Field id="reg-password" label="Password" type="password" key_="password" placeholder="Min. 6 characters" />

            <button
              id="register-submit"
              type="submit"
              disabled={loading}
              className="w-full py-3 rounded-xl font-semibold text-white transition-all mt-2"
              style={{
                background: loading ? 'rgba(99,102,241,0.5)' : 'linear-gradient(135deg, #6366f1, #8b5cf6)',
                boxShadow: loading ? 'none' : '0 4px 20px rgba(99,102,241,0.4)',
                cursor: loading ? 'not-allowed' : 'pointer',
              }}>
              {loading ? 'Creating account...' : 'Create account'}
            </button>
          </form>

          <p className="mt-6 text-center text-sm" style={{ color: 'var(--color-text-muted)' }}>
            Already have an account?{' '}
            <Link to="/login" className="font-medium" style={{ color: '#6366f1' }}>Sign in</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
