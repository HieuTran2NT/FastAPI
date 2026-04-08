import { NavLink } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function NavBar() {
  const { user, logout } = useAuth();
  if (!user) return null;

  return (
    <nav className="navbar">
      <span className="navbar-brand">TaskFlow</span>
      <NavLink to="/tasks" className={({ isActive }) => 'navbar-link' + (isActive ? ' active' : '')}>
        Tasks
      </NavLink>
      {user.is_admin && (
        <NavLink to="/users" className={({ isActive }) => 'navbar-link' + (isActive ? ' active' : '')}>
          Users
        </NavLink>
      )}
      <span className="navbar-spacer" />
      <span className="navbar-user">👤 {user.username}</span>
      <button className="btn btn-secondary" onClick={logout}>Logout</button>
    </nav>
  );
}
