import React, { useState, useEffect } from 'react';
import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom';
import {
  Building2, LayoutDashboard, Users, Clock, CalendarDays,
  FileSpreadsheet, Megaphone, ShieldCheck, Settings, LogOut,
  Bell, Sun, Moon, Menu, X, CheckCircle, ChevronDown, CheckCheck,
  ClipboardList, UserCheck, Sparkles, Activity
} from 'lucide-react';
import { useAuth } from '../context/AuthContext.js';
import { useTheme } from '../context/ThemeContext.js';
import { AIAssistantDrawer } from './AIAssistantDrawer.js';
import { api } from '../services/api.js';
import { NotificationItem } from '../types/index.js';

export function Layout() {
  const { user, employee, logout, companyName } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const location = useLocation();
  const navigate = useNavigate();

  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [showNotifDropdown, setShowNotifDropdown] = useState(false);

  const fetchNotifications = async () => {
    try {
      const res = await api.get('/comms/notifications');
      setNotifications(res.notifications || []);
      setUnreadCount(res.unreadCount || 0);
    } catch (err) {
      // ignore
    }
  };

  useEffect(() => {
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 20000);
    return () => clearInterval(interval);
  }, []);

  const handleMarkAllRead = async () => {
    try {
      await api.patch('/comms/notifications/read-all');
      setUnreadCount(0);
      setNotifications(notifications.map(n => ({ ...n, is_read: 1 })));
    } catch (err) {
      // ignore
    }
  };

  const role = user?.role || 'Employee';

  // Role Navigation Items
  const navItems = {
    Admin: [
      { label: 'Admin Dashboard', path: '/admin', icon: LayoutDashboard },
      { label: 'Organization Setup', path: '/admin/org', icon: Settings },
      { label: 'User Logins', path: '/admin/users', icon: ShieldCheck },
      { label: 'Employees Directory', path: '/employees', icon: Users },
      { label: 'Daily Attendance Board', path: '/attendance/board', icon: Clock },
      { label: 'Payroll & Payslips', path: '/payroll', icon: FileSpreadsheet },
      { label: 'Announcements', path: '/announcements', icon: Megaphone },
      { label: 'Audit Logs', path: '/admin/audit', icon: ClipboardList }
    ],
    HR: [
      { label: 'HR Dashboard', path: '/hr', icon: LayoutDashboard },
      { label: 'Employees Directory', path: '/employees', icon: Users },
      { label: 'Daily Attendance Board', path: '/attendance/board', icon: Clock },
      { label: 'Attendance Corrections', path: '/attendance/corrections', icon: Clock },
      { label: 'Leave Approvals', path: '/leave/inbox', icon: CalendarDays },
      { label: 'Monthly Payroll', path: '/payroll', icon: FileSpreadsheet },
      { label: 'Announcements', path: '/announcements', icon: Megaphone }
    ],
    Employee: [
      { label: 'My Dashboard', path: '/employee', icon: LayoutDashboard },
      { label: 'My Attendance Calendar', path: '/attendance/my', icon: Clock },
      { label: 'Apply for Leave', path: '/leave/my', icon: CalendarDays },
      { label: 'My Payslips', path: '/payslips', icon: FileSpreadsheet },
      { label: 'My Profile', path: '/profile', icon: UserCheck }
    ]
  };

  const currentNav = navItems[role] || navItems.Employee;

  return (
    <div className="min-h-screen bg-mesh-light dark:bg-mesh-dark flex flex-col font-sans transition-colors duration-300">
      {/* Top Ambient Glow Line */}
      <div className="h-1 w-full bg-gradient-to-r from-blue-600 via-indigo-500 to-purple-600 shadow-sm" />

      {/* Top Navigation Bar */}
      <header className="sticky top-0 z-30 h-16 glass-panel border-b border-slate-200/80 dark:border-slate-800/80 px-4 sm:px-6 flex items-center justify-between shadow-xs">
        {/* Left Brand & Mobile Toggle */}
        <div className="flex items-center space-x-3">
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="md:hidden p-2 rounded-xl text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800/80 transition"
          >
            {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>

          <Link to="/" className="flex items-center space-x-3 group">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-blue-600 via-indigo-600 to-violet-600 text-white flex items-center justify-center shadow-lg shadow-indigo-500/25 group-hover:scale-105 group-hover:shadow-indigo-500/40 transition-all duration-300">
              <Building2 className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <span className="font-extrabold text-base tracking-tight text-slate-900 dark:text-white group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
                  {companyName || 'HCM Lite'}
                </span>
                <span className="hidden sm:inline-flex items-center gap-1 text-[10px] uppercase font-bold tracking-wider text-indigo-700 dark:text-indigo-300 bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-200/60 dark:border-indigo-800/60 px-2 py-0.5 rounded-full">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  Cloud HR
                </span>
              </div>
              <p className="text-[10px] text-slate-400 font-medium hidden sm:block">AI-Assisted People Operations</p>
            </div>
          </Link>
        </div>

        {/* Right Controls */}
        <div className="flex items-center space-x-2 sm:space-x-3">
          {/* Active Role Tag */}
          <span
            className={`px-3 py-1 rounded-full text-[11px] font-extrabold uppercase tracking-wider shadow-xs border ${
              role === 'Admin'
                ? 'bg-gradient-to-r from-purple-500/10 to-indigo-500/10 text-purple-700 dark:text-purple-300 border-purple-200 dark:border-purple-800/60'
                : role === 'HR'
                ? 'bg-gradient-to-r from-cyan-500/10 to-blue-500/10 text-cyan-700 dark:text-cyan-300 border-cyan-200 dark:border-cyan-800/60'
                : 'bg-gradient-to-r from-emerald-500/10 to-teal-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800/60'
            }`}
          >
            {role} Portal
          </span>

          {/* Dark Mode Toggle */}
          <button
            onClick={toggleTheme}
            className="p-2.5 rounded-xl text-slate-500 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800/70 border border-transparent hover:border-slate-200 dark:hover:border-slate-700/60 transition-all duration-200"
            title="Toggle Dark Mode"
          >
            {theme === 'dark' ? <Sun className="w-4 h-4 text-amber-400 animate-spin-slow" /> : <Moon className="w-4 h-4 text-indigo-600" />}
          </button>

          {/* Notifications Dropdown */}
          <div className="relative">
            <button
              onClick={() => setShowNotifDropdown(!showNotifDropdown)}
              className="p-2.5 rounded-xl text-slate-500 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800/70 border border-transparent hover:border-slate-200 dark:hover:border-slate-700/60 transition-all duration-200 relative"
            >
              <Bell className="w-4 h-4" />
              {unreadCount > 0 && (
                <span className="absolute top-1.5 right-1.5 w-2.5 h-2.5 rounded-full bg-rose-500 ring-2 ring-white dark:ring-slate-900 animate-pulse" />
              )}
            </button>

            {showNotifDropdown && (
              <div className="absolute right-0 mt-3 w-84 glass-panel rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 p-4 z-50 animate-in fade-in zoom-in-95 duration-150">
                <div className="flex items-center justify-between pb-3 mb-3 border-b border-slate-100 dark:border-slate-800">
                  <div className="flex items-center space-x-2">
                    <span className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-200">
                      Notifications
                    </span>
                    {unreadCount > 0 && (
                      <span className="px-1.5 py-0.5 rounded-md bg-rose-500 text-white text-[10px] font-bold">
                        {unreadCount}
                      </span>
                    )}
                  </div>
                  {unreadCount > 0 && (
                    <button
                      onClick={handleMarkAllRead}
                      className="text-[11px] text-indigo-600 dark:text-indigo-400 hover:underline flex items-center space-x-1 font-semibold"
                    >
                      <CheckCheck className="w-3.5 h-3.5" />
                      <span>Mark all read</span>
                    </button>
                  )}
                </div>
                <div className="max-h-72 overflow-y-auto space-y-2 pr-1">
                  {notifications.length === 0 ? (
                    <div className="text-center py-8 text-slate-400">
                      <Bell className="w-8 h-8 mx-auto mb-2 opacity-30" />
                      <p className="text-xs">All caught up! No notifications.</p>
                    </div>
                  ) : (
                    notifications.map(n => (
                      <div
                        key={n.id}
                        className={`p-3 rounded-xl text-xs transition ${
                          n.is_read
                            ? 'bg-slate-50/80 dark:bg-slate-800/40 text-slate-600 dark:text-slate-400 border border-transparent'
                            : 'bg-indigo-50/80 dark:bg-indigo-950/40 border border-indigo-200/80 dark:border-indigo-800/60 text-slate-900 dark:text-white shadow-xs'
                        }`}
                      >
                        <p className="font-bold flex items-center justify-between">
                          <span>{n.title}</span>
                          {!n.is_read && <span className="w-1.5 h-1.5 rounded-full bg-indigo-600" />}
                        </p>
                        <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">{n.message}</p>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>

          {/* User Menu / Logout */}
          <div className="flex items-center space-x-3 pl-3 border-l border-slate-200/80 dark:border-slate-800">
            <div className="text-right hidden sm:block">
              <p className="text-xs font-extrabold text-slate-900 dark:text-white leading-tight">
                {employee?.full_name || user?.email?.split('@')[0]}
              </p>
              <p className="text-[10px] text-indigo-600 dark:text-indigo-400 font-mono mt-0.5">{user?.email}</p>
            </div>
            <button
              onClick={() => {
                logout();
                navigate('/login');
              }}
              className="p-2.5 rounded-xl text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 hover:text-rose-700 transition"
              title="Sign Out"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </header>

      {/* Main Body */}
      <div className="flex-1 flex overflow-hidden">
        {/* Desktop Sidebar */}
        <aside className="hidden md:flex flex-col w-68 glass-panel border-r border-slate-200/80 dark:border-slate-800/80 p-4 shrink-0 shadow-xs">
          <div className="flex items-center justify-between px-3 mb-3">
            <span className="text-[10px] uppercase font-extrabold text-slate-400 tracking-wider">
              {role} Workspace
            </span>
            <Activity className="w-3.5 h-3.5 text-indigo-500" />
          </div>
          <nav className="space-y-1.5 flex-1 overflow-y-auto pr-1">
            {currentNav.map(item => {
              const Icon = item.icon;
              const isActive = location.pathname === item.path;
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  className={`flex items-center space-x-3 px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all duration-200 ${
                    isActive
                      ? 'bg-gradient-to-r from-blue-600 via-indigo-600 to-violet-600 text-white shadow-md shadow-indigo-500/25 scale-[1.02]'
                      : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100/80 dark:hover:bg-slate-800/60 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  <Icon className={`w-4 h-4 shrink-0 ${isActive ? 'text-white' : 'text-slate-400 group-hover:text-indigo-500'}`} />
                  <span>{item.label}</span>
                </Link>
              );
            })}
          </nav>

          {/* Footer Card */}
          <div className="p-3.5 rounded-2xl bg-gradient-to-br from-indigo-500/5 via-purple-500/5 to-blue-500/5 border border-indigo-200/50 dark:border-indigo-800/40 text-[11px] text-slate-500 dark:text-slate-400">
            <div className="flex items-center space-x-2 text-indigo-600 dark:text-indigo-400 font-bold mb-1">
              <Sparkles className="w-3.5 h-3.5" />
              <span>AI Engine Active</span>
            </div>
            <p className="text-[10px] leading-relaxed">
              Real-time attendance policy, leave quotas & tax calculations enabled.
            </p>
          </div>
        </aside>

        {/* Mobile Navigation Drawer */}
        {mobileMenuOpen && (
          <div
            className="md:hidden fixed inset-0 z-40 bg-slate-950/60 backdrop-blur-sm flex"
            onClick={() => setMobileMenuOpen(false)}
          >
            <div
              className="w-72 glass-panel h-full p-4 flex flex-col border-r border-slate-200 dark:border-slate-800 shadow-2xl animate-in slide-in-from-left duration-200"
              onClick={e => e.stopPropagation()}
            >
              <div className="flex items-center justify-between pb-3 mb-3 border-b border-slate-100 dark:border-slate-800">
                <span className="text-xs font-bold uppercase text-slate-500">Navigation ({role})</span>
                <button onClick={() => setMobileMenuOpen(false)} className="p-1 text-slate-400">
                  <X className="w-5 h-5" />
                </button>
              </div>
              <nav className="space-y-1.5 flex-1 overflow-y-auto">
                {currentNav.map(item => {
                  const Icon = item.icon;
                  const isActive = location.pathname === item.path;
                  return (
                    <Link
                      key={item.path}
                      to={item.path}
                      onClick={() => setMobileMenuOpen(false)}
                      className={`flex items-center space-x-3 px-3.5 py-2.5 rounded-xl text-xs font-bold transition ${
                        isActive
                          ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-md'
                          : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
                      }`}
                    >
                      <Icon className="w-4 h-4 shrink-0" />
                      <span>{item.label}</span>
                    </Link>
                  );
                })}
              </nav>
            </div>
          </div>
        )}

        {/* Content Area with Ambient Glow */}
        <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto w-full relative">
          <Outlet />
        </main>
      </div>

      {/* Global AI Assistant Floating Drawer */}
      <AIAssistantDrawer onPreFillLeave={leaveData => navigate('/leave/my', { state: { prefill: leaveData } })} />
    </div>
  );
}
