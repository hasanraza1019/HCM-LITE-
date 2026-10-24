import React, { useState, useEffect } from 'react';
import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom';
import {
  Building2, LayoutDashboard, Users, Clock, CalendarDays,
  FileSpreadsheet, Megaphone, ShieldCheck, Settings, LogOut,
  Bell, Sun, Moon, Menu, X, CheckCircle, ChevronDown, CheckCheck,
  ClipboardList, UserCheck
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
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col">
      {/* Top Navigation Bar */}
      <header className="sticky top-0 z-30 h-16 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 px-4 sm:px-6 flex items-center justify-between shadow-xs">
        {/* Left Brand & Mobile Toggle */}
        <div className="flex items-center space-x-3">
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="md:hidden p-2 rounded-lg text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
          >
            {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>

          <Link to="/" className="flex items-center space-x-2.5">
            <div className="w-9 h-9 rounded-xl bg-blue-600 text-white flex items-center justify-center shadow-md">
              <Building2 className="w-5 h-5" />
            </div>
            <div>
              <span className="font-extrabold text-base tracking-tight text-slate-900 dark:text-white">
                {companyName || 'HCM Lite'}
              </span>
              <span className="hidden sm:inline-block text-[10px] uppercase font-bold text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/40 px-1.5 py-0.5 rounded ml-2">
                Enterprise
              </span>
            </div>
          </Link>
        </div>

        {/* Right Controls */}
        <div className="flex items-center space-x-2 sm:space-x-3">
          {/* Active Role Tag */}
          <span
            className={`px-2.5 py-1 rounded-full text-xs font-bold uppercase tracking-wider ${
              role === 'Admin'
                ? 'bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300'
                : role === 'HR'
                ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300'
                : 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300'
            }`}
          >
            {role} Scope
          </span>

          {/* Dark Mode Toggle */}
          <button
            onClick={toggleTheme}
            className="p-2 rounded-xl text-slate-500 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800 transition"
            title="Toggle Dark Mode"
          >
            {theme === 'dark' ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-slate-600" />}
          </button>

          {/* Notifications Dropdown */}
          <div className="relative">
            <button
              onClick={() => setShowNotifDropdown(!showNotifDropdown)}
              className="p-2 rounded-xl text-slate-500 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800 transition relative"
            >
              <Bell className="w-4 h-4" />
              {unreadCount > 0 && (
                <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-rose-500 ring-2 ring-white dark:ring-slate-900" />
              )}
            </button>

            {showNotifDropdown && (
              <div className="absolute right-0 mt-2 w-80 bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 p-3 z-50">
                <div className="flex items-center justify-between pb-2 mb-2 border-b border-slate-100 dark:border-slate-800">
                  <span className="text-xs font-bold uppercase text-slate-600 dark:text-slate-300">
                    Notifications ({unreadCount})
                  </span>
                  {unreadCount > 0 && (
                    <button
                      onClick={handleMarkAllRead}
                      className="text-[11px] text-blue-600 hover:underline flex items-center space-x-1"
                    >
                      <CheckCheck className="w-3.5 h-3.5" />
                      <span>Mark all read</span>
                    </button>
                  )}
                </div>
                <div className="max-h-60 overflow-y-auto space-y-2">
                  {notifications.length === 0 ? (
                    <p className="text-xs text-slate-400 text-center py-4">No notifications</p>
                  ) : (
                    notifications.map(n => (
                      <div
                        key={n.id}
                        className={`p-2.5 rounded-xl text-xs ${
                          n.is_read
                            ? 'bg-slate-50 dark:bg-slate-800/40 text-slate-600 dark:text-slate-400'
                            : 'bg-blue-50 dark:bg-blue-950/40 border-l-2 border-blue-600 text-slate-900 dark:text-white font-medium'
                        }`}
                      >
                        <p className="font-bold">{n.title}</p>
                        <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">{n.message}</p>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>

          {/* User Menu / Logout */}
          <div className="flex items-center space-x-2 pl-2 border-l border-slate-200 dark:border-slate-800">
            <div className="text-right hidden sm:block">
              <p className="text-xs font-bold text-slate-900 dark:text-white leading-tight">
                {employee?.full_name || user?.email?.split('@')[0]}
              </p>
              <p className="text-[10px] text-slate-400 font-mono">{user?.email}</p>
            </div>
            <button
              onClick={() => {
                logout();
                navigate('/login');
              }}
              className="p-2 rounded-xl text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition"
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
        <aside className="hidden md:flex flex-col w-64 bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 p-4 shrink-0">
          <div className="text-[11px] uppercase font-bold text-slate-400 tracking-wider px-3 mb-2">
            Navigation ({role})
          </div>
          <nav className="space-y-1 flex-1">
            {currentNav.map(item => {
              const Icon = item.icon;
              const isActive = location.pathname === item.path;
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  className={`flex items-center space-x-3 px-3 py-2.5 rounded-xl text-xs font-semibold transition ${
                    isActive
                      ? 'bg-blue-600 text-white shadow-sm'
                      : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  <Icon className="w-4 h-4 shrink-0" />
                  <span>{item.label}</span>
                </Link>
              );
            })}
          </nav>

          {/* Footer Card */}
          <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-800 text-[11px] text-slate-500">
            <span className="font-bold text-slate-700 dark:text-slate-300 block mb-0.5">{companyName || 'HCM Lite'} · v1.4</span>
            <span>Cloud Human Capital Management System</span>
          </div>
        </aside>

        {/* Mobile Navigation Drawer */}
        {mobileMenuOpen && (
          <div
            className="md:hidden fixed inset-0 z-40 bg-slate-950/50 backdrop-blur-xs flex"
            onClick={() => setMobileMenuOpen(false)}
          >
            <div
              className="w-64 bg-white dark:bg-slate-900 h-full p-4 flex flex-col border-r border-slate-200 dark:border-slate-800"
              onClick={e => e.stopPropagation()}
            >
              <div className="text-[11px] uppercase font-bold text-slate-400 tracking-wider px-3 mb-2">
                Navigation ({role})
              </div>
              <nav className="space-y-1 flex-1">
                {currentNav.map(item => {
                  const Icon = item.icon;
                  const isActive = location.pathname === item.path;
                  return (
                    <Link
                      key={item.path}
                      to={item.path}
                      onClick={() => setMobileMenuOpen(false)}
                      className={`flex items-center space-x-3 px-3 py-2.5 rounded-xl text-xs font-semibold transition ${
                        isActive
                          ? 'bg-blue-600 text-white shadow-sm'
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

        {/* Content Area */}
        <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto w-full">
          <Outlet />
        </main>
      </div>

      {/* Global AI Assistant Floating Drawer */}
      <AIAssistantDrawer onPreFillLeave={leaveData => navigate('/leave/my', { state: { prefill: leaveData } })} />
    </div>
  );
}

