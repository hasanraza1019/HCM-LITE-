import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext.js';
import { ThemeProvider } from './context/ThemeContext.js';
import { ToastProvider } from './context/ToastContext.js';

// Layout & Auth Pages
import { Layout } from './components/Layout.js';
import { SetupPage } from './pages/SetupPage.js';
import { LoginPage } from './pages/LoginPage.js';
import { ChangePasswordPage } from './pages/ChangePasswordPage.js';

// Dashboards
import { AdminDashboardPage } from './pages/AdminDashboardPage.js';
import { HRDashboardPage } from './pages/HRDashboardPage.js';
import { EmployeeDashboardPage } from './pages/EmployeeDashboardPage.js';

// Module Pages
import { OrgSetupPage } from './pages/OrgSetupPage.js';
import { UsersPage } from './pages/UsersPage.js';
import { EmployeesPage } from './pages/EmployeesPage.js';
import { AttendanceBoardPage } from './pages/AttendanceBoardPage.js';
import { AttendanceCorrectionsPage } from './pages/AttendanceCorrectionsPage.js';
import { MyAttendancePage } from './pages/MyAttendancePage.js';
import { LeaveInboxPage } from './pages/LeaveInboxPage.js';
import { MyLeavePage } from './pages/MyLeavePage.js';
import { PayrollPage } from './pages/PayrollPage.js';
import { PayslipsPage } from './pages/PayslipsPage.js';
import { AnnouncementsPage } from './pages/AnnouncementsPage.js';
import { AuditLogsPage } from './pages/AuditLogsPage.js';
import { ProfilePage } from './pages/ProfilePage.js';
import { ExpensesPage } from './pages/ExpensesPage.js';

function ProtectedRoute({ children, allowedRoles }: { children: React.ReactNode; allowedRoles?: string[] }) {
  const { user, isLoading, isInitialized } = useAuth();

  if (isLoading || isInitialized === null) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center text-white text-xs">
        Initializing HCM Lite...
      </div>
    );
  }

  if (isInitialized === false) {
    return <Navigate to="/setup" replace />;
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (user.mustChangePassword && !window.location.pathname.includes('/change-password')) {
    return <Navigate to="/change-password" replace />;
  }

  if (allowedRoles && !allowedRoles.includes(user.role)) {
    // Redirect to their default dashboard
    if (user.role === 'Admin') return <Navigate to="/admin" replace />;
    if (user.role === 'HR') return <Navigate to="/hr" replace />;
    return <Navigate to="/employee" replace />;
  }

  return <>{children}</>;
}

function RoleDefaultRedirect() {
  const { user } = useAuth();
  if (!user) return <Navigate to="/login" replace />;
  if (user.role === 'Admin') return <Navigate to="/admin" replace />;
  if (user.role === 'HR') return <Navigate to="/hr" replace />;
  return <Navigate to="/employee" replace />;
}

export function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <ToastProvider>
          <BrowserRouter>
          <Routes>
            {/* Public Setup & Auth */}
            <Route path="/setup" element={<SetupPage />} />
            <Route path="/login" element={<LoginPage />} />
            <Route path="/change-password" element={<ChangePasswordPage />} />

            {/* Protected Routes inside Layout */}
            <Route
              path="/"
              element={
                <ProtectedRoute>
                  <Layout />
                </ProtectedRoute>
              }
            >
              <Route index element={<RoleDefaultRedirect />} />

              {/* Admin Pages */}
              <Route
                path="admin"
                element={
                  <ProtectedRoute allowedRoles={['Admin']}>
                    <AdminDashboardPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="admin/org"
                element={
                  <ProtectedRoute allowedRoles={['Admin', 'HR']}>
                    <OrgSetupPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="admin/users"
                element={
                  <ProtectedRoute allowedRoles={['Admin']}>
                    <UsersPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="admin/audit"
                element={
                  <ProtectedRoute allowedRoles={['Admin']}>
                    <AuditLogsPage />
                  </ProtectedRoute>
                }
              />

              {/* HR Pages */}
              <Route
                path="hr"
                element={
                  <ProtectedRoute allowedRoles={['HR', 'Admin']}>
                    <HRDashboardPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="attendance/corrections"
                element={
                  <ProtectedRoute allowedRoles={['HR', 'Admin']}>
                    <AttendanceCorrectionsPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="leave/inbox"
                element={
                  <ProtectedRoute allowedRoles={['HR', 'Admin']}>
                    <LeaveInboxPage />
                  </ProtectedRoute>
                }
              />

              {/* Employee Pages */}
              <Route
                path="employee"
                element={
                  <ProtectedRoute allowedRoles={['Employee']}>
                    <EmployeeDashboardPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="attendance/my"
                element={
                  <ProtectedRoute allowedRoles={['Employee']}>
                    <MyAttendancePage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="leave/my"
                element={
                  <ProtectedRoute allowedRoles={['Employee']}>
                    <MyLeavePage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="payslips"
                element={
                  <ProtectedRoute allowedRoles={['Employee', 'Admin', 'HR']}>
                    <PayslipsPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="profile"
                element={
                  <ProtectedRoute allowedRoles={['Employee']}>
                    <ProfilePage />
                  </ProtectedRoute>
                }
              />

              {/* Shared Pages with Role Scope */}
              <Route
                path="employees"
                element={
                  <ProtectedRoute allowedRoles={['Admin', 'HR', 'Employee']}>
                    <EmployeesPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="attendance/board"
                element={
                  <ProtectedRoute allowedRoles={['Admin', 'HR']}>
                    <AttendanceBoardPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="payroll"
                element={
                  <ProtectedRoute allowedRoles={['Admin', 'HR']}>
                    <PayrollPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="announcements"
                element={
                  <ProtectedRoute allowedRoles={['Admin', 'HR', 'Employee']}>
                    <AnnouncementsPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="expenses"
                element={
                  <ProtectedRoute allowedRoles={['Admin', 'HR', 'Employee']}>
                    <ExpensesPage />
                  </ProtectedRoute>
                }
              />
            </Route>

            {/* Catch-all */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </BrowserRouter>
        </ToastProvider>
      </AuthProvider>
    </ThemeProvider>
  );
}

export default App;

