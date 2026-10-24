import React, { useState, useEffect } from 'react';
import { CalendarDays, CheckCircle2, XCircle, AlertCircle, RefreshCw, MessageSquare } from 'lucide-react';
import { api } from '../services/api.js';
import confetti from 'canvas-confetti';

export function LeaveInboxPage() {
  const [leaves, setLeaves] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('');
  const [hrComment, setHrComment] = useState<Record<number, string>>({});
  const [actionLoading, setActionLoading] = useState<number | null>(null);

  const fetchLeaves = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        ...(statusFilter && { status: statusFilter })
      });
      const res = await api.get(`/leave/requests?${params.toString()}`);
      setLeaves(res.leaves || []);
    } catch (err) {
      console.error('Failed to load leave requests:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLeaves();
  }, [statusFilter]);

  const handleReview = async (id: number, action: 'approve' | 'reject') => {
    setActionLoading(id);
    try {
      await api.patch(`/leave/requests/${id}/review`, {
        action,
        hr_comment: hrComment[id] || ''
      });

      if (action === 'approve') {
        confetti({ particleCount: 50, spread: 50 });
      }

      await fetchLeaves();
    } catch (err: any) {
      alert(err.message || 'Review failed');
    } finally {
      setActionLoading(null);
    }
  };

  return (
    <div className="space-y-6">
      {/* Title */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black tracking-tight text-slate-900 dark:text-white">
            Leave Approvals Inbox
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Evaluate time-off requests against company quotas, business coverage, and holidays.
          </p>
        </div>

        <select
          value={statusFilter}
          onChange={e => setStatusFilter(e.target.value)}
          className="px-3 py-1.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-semibold"
        >
          <option value="">All Statuses</option>
          <option value="pending">Pending Approvals Only</option>
          <option value="approved">Approved</option>
          <option value="rejected">Rejected</option>
        </select>
      </div>

      {/* Requests List */}
      <div className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-slate-400">
            <RefreshCw className="w-5 h-5 animate-spin mx-auto mb-2 text-blue-500" />
            <span>Loading leave applications...</span>
          </div>
        ) : leaves.length === 0 ? (
          <div className="p-12 text-center text-slate-400 text-xs">
            No leave requests found.
          </div>
        ) : (
          <div className="divide-y divide-slate-100 dark:divide-slate-800">
            {leaves.map(l => (
              <div key={l.id} className="p-5 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                <div className="space-y-2 flex-1">
                  <div className="flex items-center space-x-2.5">
                    <span className="font-bold text-sm text-slate-900 dark:text-white">
                      {l.employee_name} ({l.employee_code})
                    </span>
                    <span className="text-xs text-slate-400">· {l.department_name}</span>
                    <span
                      className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                        l.status === 'approved'
                          ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40'
                          : l.status === 'rejected'
                          ? 'bg-rose-100 text-rose-700 dark:bg-rose-900/40'
                          : l.status === 'cancelled'
                          ? 'bg-slate-100 text-slate-700 dark:bg-slate-800'
                          : 'bg-amber-100 text-amber-700 dark:bg-amber-900/40'
                      }`}
                    >
                      {l.status}
                    </span>
                  </div>

                  <div className="flex flex-wrap items-center gap-3 text-xs text-slate-600 dark:text-slate-300">
                    <span className="px-2 py-0.5 rounded bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 font-bold">
                      {l.leave_type_name} Leave
                    </span>
                    <span>
                      Duration: <b>{l.start_date}</b> to <b>{l.end_date}</b> ({l.days_count} Working Days)
                    </span>
                  </div>

                  <p className="text-xs text-slate-600 dark:text-slate-300 bg-slate-50 dark:bg-slate-800/40 p-2.5 rounded-xl border border-slate-100 dark:border-slate-800">
                    Reason: <i>"{l.reason}"</i>
                  </p>

                  {l.hr_comment && (
                    <p className="text-[11px] text-slate-500">
                      HR Comment: <b>{l.hr_comment}</b>
                    </p>
                  )}
                </div>

                {l.status === 'pending' && (
                  <div className="flex flex-col sm:flex-row items-center gap-2 lg:w-96">
                    <input
                      type="text"
                      placeholder="Comment for employee..."
                      value={hrComment[l.id] || ''}
                      onChange={e => setHrComment({ ...hrComment, [l.id]: e.target.value })}
                      className="w-full px-3 py-1.5 rounded-xl border border-slate-300 dark:border-slate-700 text-xs bg-white dark:bg-slate-800"
                    />

                    <div className="flex items-center space-x-2 w-full sm:w-auto">
                      <button
                        onClick={() => handleReview(l.id, 'approve')}
                        disabled={actionLoading === l.id}
                        className="flex-1 sm:flex-none px-4 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-xs transition"
                      >
                        Approve
                      </button>
                      <button
                        onClick={() => handleReview(l.id, 'reject')}
                        disabled={actionLoading === l.id}
                        className="flex-1 sm:flex-none px-4 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs shadow-xs transition"
                      >
                        Reject
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

