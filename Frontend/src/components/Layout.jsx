import { useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
  LayoutDashboard, Users, CalendarDays, ClipboardList,
  LogOut, Menu, X, Briefcase, ChevronRight, Bell
} from 'lucide-react';

const navItems = [
  { to: '/dashboard', icon: LayoutDashboard, label: 'Dashboard', roles: ['admin', 'manager', 'employee'] },
  { to: '/leaves', icon: CalendarDays, label: 'My Leaves', roles: ['employee', 'manager', 'admin'] },
  { to: '/approvals', icon: ClipboardList, label: 'Approvals', roles: ['admin', 'manager'] },
  { to: '/employees', icon: Users, label: 'Employees', roles: ['admin', 'manager'] },
];

function Avatar({ user, size = 'md' }) {
  const sizes = { sm: 'w-8 h-8 text-xs', md: 'w-10 h-10 text-sm' };
  const initials = user?.name?.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase() || '?';
  const colors = ['bg-brand-500', 'bg-purple-500', 'bg-emerald-500', 'bg-amber-500', 'bg-rose-500'];
  const color = colors[user?.id % colors.length] || colors[0];

  return (
    <div className={`${sizes[size]} ${color} rounded-full flex items-center justify-center text-white font-bold flex-shrink-0`}>
      {initials}
    </div>
  );
}

export { Avatar };

export default function Layout({ children }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const filteredNav = navItems.filter(item => item.roles.includes(user?.role));

  const SidebarContent = () => (
    <div className="flex flex-col h-full">
      {/* Logo */}
      <div className="px-5 py-6 border-b border-slate-100">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 bg-brand-500 rounded-xl flex items-center justify-center">
            <Briefcase className="w-5 h-5 text-white" />
          </div>
          <div>
            <div className="font-bold text-slate-800 text-sm leading-none">LeaveFlow</div>
            <div className="text-[11px] text-slate-400 mt-0.5">ABC Company</div>
          </div>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
        <p className="px-3 text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">Menu</p>
        {filteredNav.map(({ to, icon: Icon, label }) => (
          <NavLink
            key={to}
            to={to}
            onClick={() => setSidebarOpen(false)}
            className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`}
          >
            <Icon className="w-4 h-4 flex-shrink-0" />
            <span className="flex-1">{label}</span>
            <ChevronRight className="w-3 h-3 opacity-30" />
          </NavLink>
        ))}
      </nav>

      {/* User */}
      <div className="px-3 py-4 border-t border-slate-100">
        <div className="flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-slate-50 transition-colors">
          <Avatar user={user} size="sm" />
          <div className="flex-1 min-w-0">
            <div className="text-sm font-semibold text-slate-700 truncate">{user?.name}</div>
            <div className="text-[11px] text-slate-400 capitalize">{user?.role}</div>
          </div>
          <button onClick={handleLogout} className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors" title="Logout">
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <div className="flex h-screen overflow-hidden bg-slate-50">
      {/* Desktop Sidebar */}
      <aside className="hidden lg:flex flex-col w-60 bg-white border-r border-slate-100 flex-shrink-0">
        <SidebarContent />
      </aside>

      {/* Mobile Sidebar */}
      {sidebarOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setSidebarOpen(false)} />
          <aside className="relative flex flex-col w-72 h-full bg-white shadow-xl">
            <button className="absolute top-4 right-4 p-2 text-slate-500 hover:text-slate-700" onClick={() => setSidebarOpen(false)}>
              <X className="w-5 h-5" />
            </button>
            <SidebarContent />
          </aside>
        </div>
      )}

      {/* Main */}
      <main className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Top bar */}
        <header className="bg-white border-b border-slate-100 px-4 lg:px-6 py-4 flex items-center gap-4 flex-shrink-0">
          <button
            className="lg:hidden p-2 text-slate-500 hover:text-slate-700 hover:bg-slate-100 rounded-lg"
            onClick={() => setSidebarOpen(true)}
          >
            <Menu className="w-5 h-5" />
          </button>
          <div className="flex-1" />
          <div className="flex items-center gap-2">
            <button className="p-2 text-slate-500 hover:text-slate-700 hover:bg-slate-100 rounded-lg relative">
              <Bell className="w-5 h-5" />
              <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full" />
            </button>
            <div className="hidden sm:flex items-center gap-2 pl-2 border-l border-slate-200">
              <Avatar user={user} size="sm" />
              <div className="hidden md:block">
                <div className="text-sm font-semibold text-slate-700">{user?.name}</div>
                <div className="text-[11px] text-slate-400">{user?.department}</div>
              </div>
            </div>
          </div>
        </header>

        {/* Page Content */}
        <div className="flex-1 overflow-y-auto">
          <div className="p-4 lg:p-6 page-enter">
            {children}
          </div>
        </div>
      </main>
    </div>
  );
}