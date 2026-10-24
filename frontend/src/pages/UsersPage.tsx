import React, { useState, useEffect } from 'react';
import { ShieldCheck, UserPlus, KeyRound, CheckCircle2, AlertCircle, RefreshCw, X, UserX } from 'lucide-react';
import { api } from '../services/api.js';

export function UsersPage() {
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [createHRModal, setCreateHRModal] = useState(false);
  const [resetModalUserId, setResetModalUserId] = useState<number | null>(null);

  // Form State
  const [hrEmail, setHrEmail] = useState('');
  const [hrPassword, setHrPassword] = useState('');
  const [tempPassword, setTempPassword] = useState('Welcome@123');
  const [submitting, setSubmitting] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const res = await api.get('/auth/users');
      setUsers(res.users || []);
    } catch (err) {
      console.error('Failed to load users:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const handleCreateHR = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setMsg(null);
    try {
      await api.post('/auth/users/hr', { email: hrEmail, password: hrPassword });
      setCreateHRModal(false);
      setHrEmail('');
      setHrPassword('');
      alert('HR user created successfully.');
      await fetchUsers();
    } catch (err: any) {
      setMsg(err.message || 'Creation failed');
    } finally {
      setSubmitting(false);
    }
  };

  const handleToggleStatus = async (id: number) => {
    try {
      const res = await api.patch(`/auth/users/${id}/toggle-status`, {});
      alert(res.message);
      await fetchUsers();
    } catch (err: any) {
      alert(err.message || 'Status toggle failed');
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resetModalUserId) return;
    setSubmitting(true);
    try {
      const res = await api.post(`/auth/users/${resetModalUserId}/reset-password`, {
        temporaryPassword: tempPassword
      });
      alert(res.message);
      setResetModalUserId(null);
      await fetchUsers();
    } catch (err: any) {
      alert(err.message || 'Password reset failed');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black tracking-tight text-slate-900 dark:text-white">
            System Accounts & Logins
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Admin governance: Provision HR roles, deactivate logins, and issue temporary passwords.
          </p>
        </div>

        <button
          onClick={() => setCreateHRModal(true)}
          className="inline-flex items-center space-x-1.5 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-md transition"
        >
          <UserPlus className="w-4 h-4" />
          <span>Provision HR Login</span>
        </button>
      </div>

      <div className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 dark:bg-slate-800/60 text-slate-500 uppercase font-bold text-[10px] tracking-wider border-b border-slate-200 dark:border-slate-800">
              <tr>
                <th className="px-4 py-3">Account Email</th>
                <th className="px-4 py-3">Role</th>
                <th className="px-4 py-3">Linked Employee</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Password Change Req.</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-medium">
              {loading ? (
                <tr>
                  <td colSpan={6} className="text-center py-10 text-slate-400">
                    <RefreshCw className="w-5 h-5 animate-spin mx-auto mb-2 text-blue-500" />
                    <span>Loading system accounts...</span>
                  </td>
                </tr>
              ) : (
                users.map(u => (
                  <tr key={u.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition">
                    <td className="px-4 py-3 font-mono font-bold text-slate-800 dark:text-slate-200">
                      {u.email}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                          u.role === 'Admin'
                            ? 'bg-purple-100 text-purple-700'
                            : u.role === 'HR'
                            ? 'bg-blue-100 text-blue-700'
                            : 'bg-emerald-100 text-emerald-700'
                        }`}
                      >
                        {u.role}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      {u.employee_name ? `${u.employee_name} (${u.employee_code})` : '—'}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                          u.is_active ? 'text-emerald-600 bg-emerald-50' : 'text-rose-600 bg-rose-50'
                        }`}
                      >
                        {u.is_active ? 'Active' : 'Deactivated'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-slate-500">
                      {u.must_change_password ? '⚠️ Yes (Temporary)' : 'No (Active)'}
                    </td>
                    <td className="px-4 py-3 text-right space-x-2">
                      <button
                        onClick={() => setResetModalUserId(u.id)}
                        className="px-2 py-1 rounded bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold hover:bg-slate-200 transition"
                      >
                        Reset Password
                      </button>

                      {u.role !== 'Admin' && (
                        <button
                          onClick={() => handleToggleStatus(u.id)}
                          className={`px-2 py-1 rounded font-bold ${
                            u.is_active
                              ? 'bg-rose-50 text-rose-600 hover:bg-rose-100'
                              : 'bg-emerald-50 text-emerald-600 hover:bg-emerald-100'
                          }`}
                        >
                          {u.is_active ? 'Deactivate' : 'Activate'}
                        </button>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Create HR Modal */}
      {createHRModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs">
          <div className="max-w-md w-full bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-base text-slate-900 dark:text-white">Create HR User Login</h3>
              <button onClick={() => setCreateHRModal(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            {msg && <div className="p-3 rounded-xl bg-rose-50 text-rose-700 text-xs">{msg}</div>}

            <form onSubmit={handleCreateHR} className="space-y-4">
              <div>
                <label className="text-xs font-bold text-slate-600 uppercase block mb-1">HR Email *</label>
                <input
                  type="email"
                  required
                  value={hrEmail}
                  onChange={e => setHrEmail(e.target.value)}
                  placeholder="hr@saylaniit.com"
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-600 uppercase block mb-1">Password *</label>
                <input
                  type="password"
                  required
                  value={hrPassword}
                  onChange={e => setHrPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs"
                />
              </div>

              <div className="flex justify-end space-x-2 pt-2">
                <button
                  type="button"
                  onClick={() => setCreateHRModal(false)}
                  className="px-4 py-2 rounded-xl border border-slate-300 text-xs font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-6 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-md disabled:opacity-50"
                >
                  {submitting ? 'Creating...' : 'Create HR Login'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Reset Password Modal */}
      {resetModalUserId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs">
          <div className="max-w-md w-full bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-base text-slate-900 dark:text-white">Issue Temporary Password</h3>
              <button onClick={() => setResetModalUserId(null)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleResetPassword} className="space-y-4">
              <div>
                <label className="text-xs font-bold text-slate-600 uppercase block mb-1">Temporary Password *</label>
                <input
                  type="text"
                  required
                  value={tempPassword}
                  onChange={e => setTempPassword(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs font-mono"
                />
                <span className="text-[11px] text-slate-400 mt-1 block">
                  The user will be required to change this password upon their next sign-in.
                </span>
              </div>

              <div className="flex justify-end space-x-2 pt-2">
                <button
                  type="button"
                  onClick={() => setResetModalUserId(null)}
                  className="px-4 py-2 rounded-xl border border-slate-300 text-xs font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-6 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs shadow-md disabled:opacity-50"
                >
                  {submitting ? 'Resetting...' : 'Confirm Reset'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

