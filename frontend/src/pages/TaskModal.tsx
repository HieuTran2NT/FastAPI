import { useState } from 'react';
import apiClient from '../api/client';
import { useAuth } from '../context/AuthContext';
import type { Task, TaskCreate, TaskUpdate, TaskStatus, TaskPriority, User } from '../types';

interface TaskModalProps {
  task?: Task;
  companyId: number;
  users: User[];
  onClose: () => void;
  onSaved: () => void;
}

export default function TaskModal({ task, companyId, users, onClose, onSaved }: TaskModalProps) {
  const { user: currentUser } = useAuth();
  const isEdit = task !== undefined;

  const [summary, setSummary] = useState(task?.summary ?? '');
  const [description, setDescription] = useState(task?.description ?? '');
  const [status, setStatus] = useState<TaskStatus>(task?.status ?? 'todo');
  const [priority, setPriority] = useState<TaskPriority>(task?.priority ?? 'medium');
  const [ownerId, setOwnerId] = useState<number | ''>(task?.owner_id ?? currentUser?.id ?? '');
  const [submitting, setSubmitting] = useState(false);
  const [apiError, setApiError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setApiError(null);
    setSubmitting(true);
    try {
      if (isEdit) {
        const patch: TaskUpdate = {};
        if (summary !== task.summary) patch.summary = summary;
        if ((description || null) !== task.description) patch.description = description || undefined;
        if (status !== task.status) patch.status = status;
        if (priority !== task.priority) patch.priority = priority;
        const ownerVal = ownerId === '' ? null : ownerId;
        if (ownerVal !== task.owner_id) patch.owner_id = ownerVal ?? undefined;
        await apiClient.patch(`/companies/${companyId}/tasks/${task.id}`, patch);
      } else {
        const body: TaskCreate = {
          summary, status, priority,
          ...(description ? { description } : {}),
          ...(ownerId !== '' ? { owner_id: ownerId } : {}),
        };
        await apiClient.post(`/companies/${companyId}/tasks`, body);
      }
      onSaved();
    } catch (err: unknown) {
      const axiosErr = err as { response?: { data?: { detail?: string } } };
      setApiError(axiosErr.response?.data?.detail ?? 'An error occurred.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal" role="dialog" aria-modal="true" aria-label={isEdit ? 'Edit task' : 'Create task'}>
        <div className="modal-header">
          <h2>{isEdit ? 'Edit Task' : 'New Task'}</h2>
          <button className="modal-close" onClick={onClose} aria-label="Close">×</button>
        </div>
        <div className="modal-body">
          {apiError && <div className="alert alert-error" role="alert">{apiError}</div>}
          <form onSubmit={handleSubmit}>
            <div className="field">
              <label htmlFor="summary">Summary</label>
              <input id="summary" type="text" value={summary} onChange={(e) => setSummary(e.target.value)} placeholder="What needs to be done?" required />
            </div>
            <div className="field">
              <label htmlFor="description">Description</label>
              <textarea id="description" value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Add more details…" />
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              <div className="field">
                <label htmlFor="status">Status</label>
                <select id="status" value={status} onChange={(e) => setStatus(e.target.value as TaskStatus)}>
                  <option value="todo">Todo</option>
                  <option value="in_progress">In Progress</option>
                  <option value="done">Done</option>
                </select>
              </div>
              <div className="field">
                <label htmlFor="priority">Priority</label>
                <select id="priority" value={priority} onChange={(e) => setPriority(e.target.value as TaskPriority)}>
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                </select>
              </div>
            </div>
            <div className="field">
              <label htmlFor="owner">Assignee</label>
              <select id="owner" value={ownerId} onChange={(e) => setOwnerId(e.target.value === '' ? '' : Number(e.target.value))}>
                <option value="">Unassigned</option>
                {users.map((u) => <option key={u.id} value={u.id}>{u.username}</option>)}
              </select>
            </div>
            <div className="modal-footer">
              <button type="button" className="btn btn-secondary" onClick={onClose}>Cancel</button>
              <button type="submit" className="btn btn-primary" disabled={submitting}>
                {submitting ? 'Saving…' : isEdit ? 'Save changes' : 'Create task'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
