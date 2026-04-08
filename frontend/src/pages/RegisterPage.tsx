import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import apiClient from '../api/client';
import type { Company } from '../types';

export default function RegisterPage() {
  const navigate = useNavigate();
  const [companies, setCompanies] = useState<Company[]>([]);
  const [companiesError, setCompaniesError] = useState<string | null>(null);
  const [companyId, setCompanyId] = useState('');
  const [email, setEmail] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    apiClient.get<Company[]>('/companies/')
      .then((res) => {
        setCompanies(res.data);
        if (res.data.length > 0) setCompanyId(String(res.data[0].id));
      })
      .catch(() => setCompaniesError('Could not load companies. Please try again.'));
  }, []);

  function extractErrorMessage(err: unknown): string {
    const detail = (err as { response?: { data?: { detail?: unknown } } }).response?.data?.detail;
    if (!detail) return 'An error occurred. Please try again.';
    if (typeof detail === 'string') return detail;
    if (Array.isArray(detail))
      return detail.map((d) =>
        typeof d === 'object' && d !== null && 'msg' in d ? (d as { msg: string }).msg : String(d)
      ).join(', ');
    return 'An error occurred. Please try again.';
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const body: Record<string, string> = { email, username, password };
      if (firstName) body.first_name = firstName;
      if (lastName) body.last_name = lastName;
      await apiClient.post(`/companies/${companyId}/users`, body);
      navigate('/login');
    } catch (err) {
      setError(extractErrorMessage(err));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div style={styles.page}>
      {/* ── Left panel ── */}
      <div style={styles.hero}>
        <div style={styles.heroInner}>
          <div style={styles.logoMark}>
            <svg width="36" height="36" viewBox="0 0 36 36" fill="none">
              <rect width="36" height="36" rx="10" fill="white" fillOpacity=".15"/>
              <path d="M10 18h16M18 10l8 8-8 8" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            <span style={styles.logoText}>TaskFlow</span>
          </div>
          <div style={styles.heroContent}>
            <h2 style={styles.heroHeading}>Start managing tasks with your team today</h2>
            <p style={styles.heroSub}>Create your account and invite teammates to collaborate on tasks and projects.</p>
            <svg viewBox="0 0 380 200" fill="none" style={styles.illustration} aria-hidden="true">
              <rect x="20" y="16" width="160" height="168" rx="14" fill="white" fillOpacity=".08"/>
              <rect x="200" y="16" width="160" height="80" rx="14" fill="white" fillOpacity=".08"/>
              <rect x="200" y="104" width="160" height="80" rx="14" fill="white" fillOpacity=".08"/>
              {/* Left card content */}
              <rect x="36" y="32" width="80" height="8" rx="4" fill="white" fillOpacity=".4"/>
              <rect x="36" y="48" width="128" height="6" rx="3" fill="white" fillOpacity=".2"/>
              <rect x="36" y="60" width="100" height="6" rx="3" fill="white" fillOpacity=".2"/>
              <rect x="36" y="80" width="128" height="28" rx="8" fill="#6ee7b7" fillOpacity=".25"/>
              <rect x="36" y="116" width="128" height="28" rx="8" fill="#a5b4fc" fillOpacity=".25"/>
              <rect x="36" y="152" width="128" height="28" rx="8" fill="#fcd34d" fillOpacity=".25"/>
              {/* Right top card */}
              <circle cx="224" cy="40" r="10" fill="white" fillOpacity=".2"/>
              <rect x="242" y="34" width="60" height="8" rx="4" fill="white" fillOpacity=".4"/>
              <rect x="242" y="46" width="40" height="6" rx="3" fill="white" fillOpacity=".2"/>
              <rect x="216" y="60" width="128" height="6" rx="3" fill="white" fillOpacity=".15"/>
              <rect x="216" y="72" width="100" height="6" rx="3" fill="white" fillOpacity=".15"/>
              {/* Right bottom card */}
              <circle cx="224" cy="128" r="10" fill="white" fillOpacity=".2"/>
              <rect x="242" y="122" width="72" height="8" rx="4" fill="white" fillOpacity=".4"/>
              <rect x="242" y="134" width="48" height="6" rx="3" fill="white" fillOpacity=".2"/>
              <rect x="216" y="148" width="128" height="6" rx="3" fill="white" fillOpacity=".15"/>
              <rect x="216" y="160" width="80" height="6" rx="3" fill="white" fillOpacity=".15"/>
            </svg>
          </div>
          <div style={styles.heroFeatures}>
            {['Free to get started', 'No credit card required', 'Invite your whole team'].map((f) => (
              <div key={f} style={styles.featureItem}>
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                  <circle cx="8" cy="8" r="8" fill="white" fillOpacity=".2"/>
                  <path d="M5 8l2 2 4-4" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
                <span>{f}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── Right panel ── */}
      <div style={styles.formPanel}>
        <div style={styles.formCard}>
          <div style={styles.formHeader}>
            <h1 style={styles.formTitle}>Create your account</h1>
            <p style={styles.formSub}>Join your company workspace</p>
          </div>

          {companiesError && <div className="alert alert-error" role="alert">{companiesError}</div>}
          {error && <div className="alert alert-error" role="alert">{error}</div>}

          <form onSubmit={handleSubmit}>
            <div className="field">
              <label htmlFor="company">Company</label>
              <select id="company" value={companyId} onChange={(e) => setCompanyId(e.target.value)} required>
                {companies.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
            <div className="field">
              <label htmlFor="email">Email</label>
              <input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" required />
            </div>
            <div className="field">
              <label htmlFor="username">Username</label>
              <input id="username" type="text" value={username} onChange={(e) => setUsername(e.target.value)} placeholder="Choose a username" required />
            </div>
            <div className="field">
              <label htmlFor="password">Password</label>
              <input id="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Create a password" required />
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              <div className="field">
                <label htmlFor="firstName">First Name</label>
                <input id="firstName" type="text" value={firstName} onChange={(e) => setFirstName(e.target.value)} placeholder="Optional" />
              </div>
              <div className="field">
                <label htmlFor="lastName">Last Name</label>
                <input id="lastName" type="text" value={lastName} onChange={(e) => setLastName(e.target.value)} placeholder="Optional" />
              </div>
            </div>
            <button
              className="btn btn-primary btn-full"
              type="submit"
              disabled={submitting || !!companiesError}
              style={{ marginTop: 8 }}
            >
              {submitting ? 'Creating account…' : 'Create account'}
            </button>
          </form>

          <div className="auth-footer">
            Already have an account? <Link to="/login">Sign in</Link>
          </div>
        </div>
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  page: { display: 'flex', minHeight: '100vh' },
  hero: {
    flex: '0 0 48%',
    background: 'linear-gradient(135deg, #4f46e5 0%, #7c3aed 60%, #a855f7 100%)',
    display: 'flex',
    alignItems: 'stretch',
  },
  heroInner: {
    display: 'flex',
    flexDirection: 'column',
    padding: '40px 48px',
    width: '100%',
  },
  logoMark: { display: 'flex', alignItems: 'center', gap: 10, marginBottom: 'auto' },
  logoText: { color: 'white', fontWeight: 700, fontSize: 20, letterSpacing: '-0.3px' },
  heroContent: { flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', paddingTop: 40, paddingBottom: 32 },
  heroHeading: { color: 'white', fontSize: 26, fontWeight: 700, lineHeight: 1.3, marginBottom: 12, letterSpacing: '-0.5px' },
  heroSub: { color: 'rgba(255,255,255,0.75)', fontSize: 14, marginBottom: 28, lineHeight: 1.6 },
  illustration: { width: '100%', maxWidth: 380, borderRadius: 12 },
  heroFeatures: { display: 'flex', flexDirection: 'column', gap: 10, marginTop: 'auto' },
  featureItem: { display: 'flex', alignItems: 'center', gap: 10, color: 'rgba(255,255,255,0.85)', fontSize: 14 },
  formPanel: { flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '40px 32px', background: '#f8fafc', overflowY: 'auto' },
  formCard: { width: '100%', maxWidth: 380 },
  formHeader: { marginBottom: 28 },
  formTitle: { fontSize: 24, fontWeight: 700, color: '#1e293b', marginBottom: 6, letterSpacing: '-0.4px' },
  formSub: { color: '#64748b', fontSize: 14 },
};
