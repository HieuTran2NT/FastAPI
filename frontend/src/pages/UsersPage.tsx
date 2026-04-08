import { useEffect, useState } from 'react';
import apiClient from '../api/client';
import { useAuth } from '../context/AuthContext';
import type { User, UserCreate } from '../types';

export default function UsersPage() {
  const { user } = useAuth();
  const companyId = user!.company_id;

  const [users, setUsers] = useState<User[]>([]);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [email, setEmail] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => { fetchUsers(); }, [companyId]);

  async function fetchUsers() {
    setFetchError(null);
    try {
      const res = await apiClient.get<User[]>(`/companies/${companyId}/users`);
      setUsers(res.data);
    } catch {
      setFetchError('Failed to load users.');
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setFormError(null);
    setSubmitting(true);
    const payload: UserCreate = { email, username, password };
    if (firstName.trim()) payload.first_name = firstName.trim();
    if (lastName.trim()) payload.last_name = lastName.trim();
    try {
      const res = await apiClient.post<User>(`/companies/${companyId}/users`, payload);
      setUsers((prev) => [...prev, res.data]);
      setEmail(''); setUsername(''); setPassword(''); setFirstName(''); setLastName('');
    } catch (err: unknown) {
      const detail = (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail;
      setFormError(typeof detail === 'string' ? detail : 'Failed to create user.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="page">
      <div className="page-header">
        <h1>Team Members</h1>
      </div>

      {fetchError && <div className="alert alert-error" role="alert">{fetchError}</div>}

      <div className="table-wrap" style={{ marginBottom: 32 }}>
        <table>
          <thead>
            <tr>
              <th>Username</th>
              <th>Email</th>
              <th>First Name</th>
              <th>Last Name</th>
              <th>Role</th>
            </tr>
          </thead>
          <tbody>
            {users.length === 0 && (
              <tr><td colSpan={5} style={{ textAlign: 'center', color: 'var(--muted)', padding: '32px' }}>No users found.</td></tr>
            )}
            {users.map((u) => (
              <tr key={u.id}>
                <td><strong>{u.username}</strong></td>
                <td>{u.email}</td>
                <td>{u.first_name ?? '—'}</td>
                <td>{u.last_name ?? '—'}</td>
                <td>{u.is_admin ? <span className="badge badge-admin">Admin</span> : <span className="badge badge-todo">Member</span>}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="card">
        <h3>Add Team Member</h3>
        {formError && <div className="alert alert-error" role="alert">{formError}</div>}
        <form onSubmit={handleSubmit}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <div className="field">
              <label htmlFor="email">Email</label>
              <input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="user@example.com" required />
            </div>
            <div className="field">
              <label htmlFor="username">Username</label>
              <input id="username" type="text" value={username} onChange={(e) => setUsername(e.target.value)} placeholder="username" required />
            </div>
            <div className="field">
              <label htmlFor="password">Password</label>
              <input id="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" required />
            </div>
            <div className="field" style={{ gridColumn: 'span 1' }} />
            <div className="field">
              <label htmlFor="first_name">First Name</label>
              <input id="first_name" type="text" value={firstName} onChange={(e) => setFirstName(e.target.value)} placeholder="Optional" />
            </div>
            <div className="field">
              <label htmlFor="last_name">Last Name</label>
              <input id="last_name" type="text" value={lastName} onChange={(e) => setLastName(e.target.value)} placeholder="Optional" />
            </div>
          </div>
          <button className="btn btn-primary" type="submit" disabled={submitting}>
            {submitting ? 'Adding…' : 'Add member'}
          </button>
        </form>
      </div>
    </div>
  );
}
