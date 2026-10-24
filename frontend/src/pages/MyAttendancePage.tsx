import React, { useState, useEffect } from 'react';
import { Clock, Plus, Calendar, AlertCircle, CheckCircle2, RefreshCw, X } from 'lucide-react';
import { api } from '../services/api.js';
import { useAuth } from '../context/AuthContext.js';

export function MyAttendancePage() {
  const { user } = useAuth();
  const [month, setMonth] = useState(new Date().toISOString().substring(0, 7));
  const [records, setRecords] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Correction Modal
  const [correctionModalOpen, setCorrectionModalOpen] = useState(false);
  const [targetDate, setTargetDate] = useState(new Date().toISOString().substring(0, 10));
  const [reqCheckIn, setReqCheckIn] = useState('09:00');
  const [reqCheckOut, setReqCheckOut] = useState('17:00');
  const [reason, setReason] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [formMsg, setFormMsg] = useState<string | null>(null);

  const fetchRecords = async () => {
    if (!user?.employeeId) return;
    try {
      setLoading(true);
      const res = await api.get(`/attendance/employee/${user.employeeId}?month=${month}`);
      setRecords(res.records || []);
    } catch (err) {
      console.error('Failed to load my attendance:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRecords();
  }, [month, user]);

  const handleRequestCorrection = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setFormMsg(null);

    try {
      await api.post('/attendance/corrections', {
        date: targetDate,
        requested_check_in: reqCheckIn,
        requested_check_out: reqCheckOut,
        reason
      });

      alert('Attendance correction request submitted for HR approval.');
      setCorrectionModalOpen(false);
      setReason('');
    } catch (err: any) {
      setFormMsg(err.message || 'Submission failed');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Title & Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black tracking-tight text-slate-900 dark:text-white">
            My Attendance Calendar
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Review your daily clock-ins, worked hours, and submit attendance correction requests.
          </p>
        </div>

        <div className="flex items-center space-x-2">
          <input
            type="month"
            value={month}
            onChange={e => setMonth(e.target.value)}
            className="px-3 py-1.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-semibold"
          />

          <button
            onClick={() => setCorrectionModalOpen(true)}
            className="inline-flex items-center space-x-1.5 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-md transition"
          >
            <Plus className="w-4 h-4" />
            <span>Request Correction</span>
          </button>
        </div>
      </div>

      {/* History Table */}
      <div className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 dark:bg-slate-800/60 text-slate-500 uppercase font-bold text-[10px] tracking-wider border-b border-slate-200 dark:border-slate-800">
              <tr>
                <th className="px-4 py-3">Date</th>
                <th className="px-4 py-3">Check-In</th>
                <th className="px-4 py-3">Check-Out</th>
                <th className="px-4 py-3">Worked Hours</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Method</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 font-medium">
              {loading ? (
                <tr>
                  <td colSpan={6} className="text-center py-10 text-slate-400">
                    <RefreshCw className="w-5 h-5 animate-spin mx-auto mb-2 text-blue-500" />
                    <span>Loading attendance records...</span>
                  </td>
                </tr>
              ) : records.length === 0 ? (
                <tr>
                  <td colSpan={6} className="text-center py-10 text-slate-400">
                    No attendance records for {month}.
                  </td>
                </tr>
              ) : (
                records.map(r => (
                  <tr key={r.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition">
                    <td className="px-4 py-3 font-semibold text-slate-900 dark:text-white">
                      {r.date}
                    </td>
                    <td className="px-4 py-3 font-mono font-bold text-slate-800 dark:text-slate-200">
                      {r.check_in}
                    </td>
                    <td className="px-4 py-3 font-mono font-bold text-slate-800 dark:text-slate-200">
                      {r.check_out || 'In Progress'}
                    </td>
                    <td className="px-4 py-3 font-bold text-emerald-600">
                      {r.work_hours > 0 ? `${r.work_hours} hrs` : '—'}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                          r.status === 'present'
                            ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40'
                            : r.status === 'late'
                            ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/40'
                            : r.status === 'half_day'
                            ? 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/40'
                            : 'bg-rose-100 text-rose-700 dark:bg-rose-900/40'
                        }`}
                      >
                        {r.status?.replace('_', ' ')}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-slate-500 capitalize">
                      {r.source === 'camera' ? '📷 Camera GPS' : r.source === 'web' ? '💻 Web' : 'HR Correction'}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Correction Request Modal */}
      {correctionModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs">
          <div className="max-w-md w-full bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-base text-slate-900 dark:text-white">
                Request Attendance Correction
              </h3>
              <button onClick={() => setCorrectionModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            {formMsg && (
              <div className="p-3 rounded-xl bg-rose-50 text-rose-700 text-xs">
                {formMsg}
              </div>
            )}

            <form onSubmit={handleRequestCorrection} className="space-y-4">
              <div>
                <label className="text-xs font-bold text-slate-600 uppercase block mb-1">Date</label>
                <input
                  type="date"
                  required
                  value={targetDate}
                  onChange={e => setTargetDate(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-slate-600 uppercase block mb-1">Check-In</label>
                  <input
                    type="time"
                    required
                    value={reqCheckIn}
                    onChange={e => setReqCheckIn(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs font-mono"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-600 uppercase block mb-1">Check-Out</label>
                  <input
                    type="time"
                    required
                    value={reqCheckOut}
                    onChange={e => setReqCheckOut(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-600 uppercase block mb-1">Reason for Correction *</label>
                <textarea
                  required
                  rows={3}
                  value={reason}
                  onChange={e => setReason(e.target.value)}
                  placeholder="e.g. Fingerprint device issue / visited on-site client in morning"
                  className="w-full p-3 rounded-xl border border-slate-300 text-xs"
                />
              </div>

              <div className="flex justify-end space-x-2 pt-2">
                <button
                  type="button"
                  onClick={() => setCorrectionModalOpen(false)}
                  className="px-4 py-2 rounded-xl border border-slate-300 text-xs font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-6 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-md disabled:opacity-50"
                >
                  {submitting ? 'Submitting...' : 'Submit Request'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

