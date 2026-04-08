import { useEffect, useState, useCallback } from 'react';
import apiClient from '../api/client';
import { useAuth } from '../context/AuthContext';
import type { Task, User } from '../types';
import TaskModal from './TaskModal';

function StatusBadge({ status }: { status: string }) {
  const cls = status === 'todo' ? 'badge-todo' : status === 'in_progress' ? 'badge-progress' : 'badge-done';
  const label = status === 'in_progress' ? 'In Progress' : status.charAt(0).toUpperCase() + status.slice(1);
  return <span className={`badge ${cls}`}>{label}</span>;
}

function PriorityBadge({ priority }: { priority: string }) {
  const cls = `badge badge-${priority}`;
  return <span className={cls}>{priority.charAt(0).toUpperCase() + priority.slice(1)}</span>;
}

export default function TasksPage() {
  const { user } = useAuth();
  const companyId = user!.company_id;

  const [tasks, setTasks] = useState<Task[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [filterUserId, setFilterUserId] = useState<number | ''>('');
  const [error, setError] = useState<string | null>(null);
  const [modalTask, setModalTask] = useState<Task | undefined>(undefined);
  const [modalOpen, setModalOpen] = useState(false);

  const fetchTasks = useCallback(async (uid?: number) => {
    setError(null);
    try {
      const params = uid ? { user_id: uid } : {};
      const res = await apiClient.get<Task[]>(`/companies/${companyId}/tasks`, { params });
      setTasks(res.data);
    } catch {
      setError('Failed to load tasks.');
    }
  }, [companyId]);

  const fetchUsers = useCallback(async () => {
    try {
      const res = await apiClient.get<User[]>(`/companies/${companyId}/users`);
      setUsers(res.data);
    } catch { /* non-critical */ }
  }, [companyId]);

  useEffect(() => { fetchTasks(); fetchUsers(); }, [fetchTasks, fetchUsers]);

  function handleFilterChange(e: React.ChangeEvent<HTMLSelectElement>) {
    const val = e.target.value === '' ? '' : Number(e.target.value);
    setFilterUserId(val);
    fetchTasks(val === '' ? undefined : val);
  }

  function getOwnerUsername(ownerId: number | null): string {
    if (ownerId === null) return '—';
    const found = users.find((u) => u.id === ownerId);
    return found ? found.username : String(ownerId);
  }

  return (
    <div className="page">
      <div className="page-header">
        <h1>Tasks</h1>
        <button className="btn btn-primary" onClick={() => { setModalTask(undefined); setModalOpen(true); }}>
          + New Task
        </button>
      </div>

      <div className="toolbar">
        <select value={filterUserId} onChange={handleFilterChange} aria-label="Filter by user">
          <option value="">All members</option>
          {users.map((u) => <option key={u.id} value={u.id}>{u.username}</option>)}
        </select>
      </div>

      {error && (
        <div className="alert alert-error" role="alert">
          {error} <button className="btn btn-secondary" style={{ marginLeft: 12 }} onClick={() => fetchTasks(filterUserId === '' ? undefined : filterUserId)}>Retry</button>
        </div>
      )}

      {!error && tasks.length === 0 && (
        <div className="empty-state">
          <p>No tasks yet. Create your first task to get started.</p>
        </div>
      )}

      {!error && tasks.length > 0 && (
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Summary</th>
                <th>Status</th>
                <th>Priority</th>
                <th>Assignee</th>
              </tr>
            </thead>
            <tbody>
              {tasks.map((task) => (
                <tr key={task.id} className="clickable" onClick={() => { setModalTask(task); setModalOpen(true); }}>
                  <td>{task.summary}</td>
                  <td><StatusBadge status={task.status} /></td>
                  <td><PriorityBadge priority={task.priority} /></td>
                  <td>{getOwnerUsername(task.owner_id)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {modalOpen && (
        <TaskModal
          task={modalTask}
          companyId={companyId}
          users={users}
          onClose={() => setModalOpen(false)}
          onSaved={() => { setModalOpen(false); fetchTasks(filterUserId === '' ? undefined : filterUserId); }}
        />
      )}
    </div>
  );
}
