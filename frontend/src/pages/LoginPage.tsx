import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function LoginPage() {
  const { login } = useAuth();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      await login(username, password);
    } catch (err: unknown) {
      const status = (err as { response?: { status?: number } }).response?.status;
      setError(status === 401 ? 'Invalid credentials' : 'An error occurred. Please try again.');
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
            <h2 style={styles.heroHeading}>Manage your team's work in one place</h2>
            <p style={styles.heroSub}>Track tasks, collaborate with teammates, and ship faster.</p>

            {/* Illustration */}
            <svg viewBox="0 0 380 260" fill="none" style={styles.illustration} aria-hidden="true">
              {/* Background card */}
              <rect x="20" y="20" width="340" height="220" rx="16" fill="white" fillOpacity=".08"/>
              {/* Header bar */}
              <rect x="20" y="20" width="340" height="44" rx="16" fill="white" fillOpacity=".12"/>
              <circle cx="52" cy="42" r="8" fill="white" fillOpacity=".4"/>
              <rect x="68" y="37" width="80" height="10" rx="5" fill="white" fillOpacity=".3"/>
              <rect x="300" y="34" width="44" height="16" rx="8" fill="white" fillOpacity=".25"/>
              {/* Row 1 */}
              <rect x="36" y="82" width="12" height="12" rx="3" fill="#a5b4fc"/>
              <rect x="56" y="84" width="120" height="8" rx="4" fill="white" fillOpacity=".5"/>
              <rect x="240" y="82" width="52" height="12" rx="6" fill="#6ee7b7" fillOpacity=".7"/>
              <rect x="304" y="84" width="40" height="8" rx="4" fill="white" fillOpacity=".2"/>
              {/* Row 2 */}
              <rect x="36" y="110" width="12" height="12" rx="3" fill="#fcd34d"/>
              <rect x="56" y="112" width="160" height="8" rx="4" fill="white" fillOpacity=".5"/>
              <rect x="240" y="110" width="60" height="12" rx="6" fill="#fca5a5" fillOpacity=".7"/>
              <rect x="304" y="112" width="40" height="8" rx="4" fill="white" fillOpacity=".2"/>
              {/* Row 3 */}
              <rect x="36" y="138" width="12" height="12" rx="3" fill="#6ee7b7"/>
              <rect x="56" y="140" width="100" height="8" rx="4" fill="white" fillOpacity=".5"/>
              <rect x="240" y="138" width="52" height="12" rx="6" fill="#a5b4fc" fillOpacity=".7"/>
              <rect x="304" y="140" width="40" height="8" rx="4" fill="white" fillOpacity=".2"/>
              {/* Row 4 */}
              <rect x="36" y="166" width="12" height="12" rx="3" fill="#f9a8d4"/>
              <rect x="56" y="168" width="140" height="8" rx="4" fill="white" fillOpacity=".5"/>
              <rect x="240" y="166" width="56" height="12" rx="6" fill="#fcd34d" fillOpacity=".7"/>
              <rect x="304" y="168" width="40" height="8" rx="4" fill="white" fillOpacity=".2"/>
              {/* Dividers */}
              <line x1="36" y1="100" x2="344" y2="100" stroke="white" strokeOpacity=".08"/>
              <line x1="36" y1="128" x2="344" y2="128" stroke="white" strokeOpacity=".08"/>
              <line x1="36" y1="156" x2="344" y2="156" stroke="white" strokeOpacity=".08"/>
              {/* Floating badge */}
              <rect x="240" y="196" width="120" height="32" rx="10" fill="white" fillOpacity=".15"/>
              <circle cx="258" cy="212" r="8" fill="#6ee7b7" fillOpacity=".8"/>
              <rect x="272" y="207" width="72" height="8" rx="4" fill="white" fillOpacity=".5"/>
              <rect x="272" y="218" width="48" height="6" rx="3" fill="white" fillOpacity=".25"/>
            </svg>
          </div>

          <div style={styles.heroFeatures}>
            {['Task tracking', 'Team collaboration', 'Priority management'].map((f) => (
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
            <h1 style={styles.formTitle}>Welcome back</h1>
            <p style={styles.formSub}>Sign in to your account to continue</p>
          </div>

          {error && (
            <div className="alert alert-error" role="alert">{error}</div>
          )}

          <form onSubmit={handleSubmit}>
            <div className="field">
              <label htmlFor="username">Username</label>
              <input
                id="username"
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Enter your username"
                autoComplete="username"
                required
              />
            </div>
            <div className="field">
              <label htmlFor="password">Password</label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter your password"
                autoComplete="current-password"
                required
              />
            </div>
            <button
              className="btn btn-primary btn-full"
              type="submit"
              disabled={submitting}
              style={{ marginTop: 8 }}
            >
              {submitting ? 'Signing in…' : 'Sign in'}
            </button>
          </form>

          <div className="auth-footer">
            Don't have an account? <Link to="/register">Create one</Link>
          </div>
        </div>
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  page: {
    display: 'flex',
    minHeight: '100vh',
  },
  hero: {
    flex: '0 0 52%',
    background: 'linear-gradient(135deg, #4f46e5 0%, #7c3aed 60%, #a855f7 100%)',
    display: 'flex',
    alignItems: 'stretch',
    padding: '0',
  },
  heroInner: {
    display: 'flex',
    flexDirection: 'column',
    padding: '40px 48px',
    width: '100%',
  },
  logoMark: {
    display: 'flex',
    alignItems: 'center',
    gap: 10,
    marginBottom: 'auto',
  },
  logoText: {
    color: 'white',
    fontWeight: 700,
    fontSize: 20,
    letterSpacing: '-0.3px',
  },
  heroContent: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'center',
    paddingTop: 40,
    paddingBottom: 32,
  },
  heroHeading: {
    color: 'white',
    fontSize: 28,
    fontWeight: 700,
    lineHeight: 1.3,
    marginBottom: 12,
    letterSpacing: '-0.5px',
  },
  heroSub: {
    color: 'rgba(255,255,255,0.75)',
    fontSize: 15,
    marginBottom: 32,
    lineHeight: 1.6,
  },
  illustration: {
    width: '100%',
    maxWidth: 380,
    borderRadius: 12,
  },
  heroFeatures: {
    display: 'flex',
    flexDirection: 'column',
    gap: 10,
    marginTop: 'auto',
  },
  featureItem: {
    display: 'flex',
    alignItems: 'center',
    gap: 10,
    color: 'rgba(255,255,255,0.85)',
    fontSize: 14,
  },
  formPanel: {
    flex: 1,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '40px 32px',
    background: '#f8fafc',
  },
  formCard: {
    width: '100%',
    maxWidth: 380,
  },
  formHeader: {
    marginBottom: 28,
  },
  formTitle: {
    fontSize: 24,
    fontWeight: 700,
    color: '#1e293b',
    marginBottom: 6,
    letterSpacing: '-0.4px',
  },
  formSub: {
    color: '#64748b',
    fontSize: 14,
  },
};
