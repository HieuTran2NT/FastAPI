export interface Company {
  id: number;
  name: string;
  description: string | null;
  mode: string | null;
  rating: number | null;
}

export interface User {
  id: number;
  email: string;
  username: string;
  first_name: string | null;
  last_name: string | null;
  is_active: boolean;
  is_admin: boolean;
  company_id: number;
}

export type TaskStatus = 'todo' | 'in_progress' | 'done';
export type TaskPriority = 'low' | 'medium' | 'high';

export interface Task {
  id: number;
  summary: string;
  description: string | null;
  status: TaskStatus;
  priority: TaskPriority;
  company_id: number;
  owner_id: number | null;
}

export interface TaskCreate {
  summary: string;
  description?: string;
  status?: TaskStatus;
  priority?: TaskPriority;
  owner_id?: number;
}

export interface TaskUpdate {
  summary?: string;
  description?: string;
  status?: TaskStatus;
  priority?: TaskPriority;
  owner_id?: number;
}

export interface UserCreate {
  email: string;
  username: string;
  password: string;
  first_name?: string;
  last_name?: string;
}
