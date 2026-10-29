import React, { useState, useEffect } from 'react';
import { CalendarDays, CheckCircle2, XCircle, AlertCircle, RefreshCw, MessageSquare } from 'lucide-react';
import { api } from '../services/api.js';
import { useToast } from '../context/ToastContext.js';
import confetti from 'canvas-confetti';

export function LeaveInboxPage() {
  const toast = useToast();
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
        toast.success('Leave application approved successfully!', 'Application Approved');
      } else {
        toast.info('Leave application rejected with HR feedback', 'Application Rejected');
      }

      await fetchLeaves();
    } catch (err: any) {
      toast.error(err.message || 'Review action failed', 'Error');
    } finally {
      setActionLoading(null);
    }
  };

  return (
    <div className="space-y-7 pb-10">
      {/* Title */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-6 rounded-3xl glass-panel relative overflow-hidden">
        <div className="absolute top-0 right-0 w-80 h-36 bg-blue-500/10 blur-3xl pointer-events-none" />
        <div className="relative z-10">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-bold bg-blue-500/15 text-blue-400 border border-blue-500/20 mb-2">
            <span className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-ping" />
            Approvals Command Center
          </div>
          <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-slate-900 dark:text-white">
            Leave Approvals Inbox
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1 max-w-xl">
            Evaluate time-off requests against company quotas, department coverage, and gazetted holidays.
          </p>
        </div>

        <select
          value={statusFilter}
          onChange={e => setStatusFilter(e.target.value)}
          className="relative z-10 px-4 py-2.5 rounded-2xl border border-white/10 bg-slate-900 text-slate-200 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500/50 shadow-sm"
        >
          <option value="">All Statuses</option>
          <option value="pending">Pending Approvals Only</option>
          <option value="approved">Approved</option>
          <option value="rejected">Rejected</option>
        </select>
      </div>

      {/* Requests List */}
      <div className="rounded-3xl glass-card overflow-hidden">
        {loading ? (
          <div className="p-16 text-center text-slate-400">
            <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-blue-500" />
            <span className="text-sm">Loading leave applications...</span>
          </div>
        ) : leaves.length === 0 ? (
          <div className="p-16 text-center text-slate-400 text-xs">
            No leave requests found matching selected filter.
          </div>
        ) : (
          <div className="divide-y divide-white/5">
            {leaves.map(l => (
              <div key={l.id} className="p-6 flex flex-col lg:flex-row lg:items-center justify-between gap-5 hover:bg-white/[0.02] transition">
                <div className="space-y-2.5 flex-1">
                  <div className="flex items-center space-x-3">
                    <span className="font-bold text-base text-white">
                      {l.employee_name}
                    </span>
                    <span className="text-xs font-mono text-blue-400 bg-blue-500/10 px-2 py-0.5 rounded-md border border-blue-500/20">{l.employee_code}</span>
                    <span className="text-xs text-slate-400">· {l.department_name}</span>
                    <span
                      className={`px-3 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider border ${
                        l.status === 'approved'
                          ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30'
                          : l.status === 'rejected'
                          ? 'bg-rose-500/15 text-rose-400 border-rose-500/30'
                          : l.status === 'cancelled'
                          ? 'bg-slate-500/15 text-slate-400 border-slate-500/30'
                          : 'bg-amber-500/15 text-amber-400 border-amber-500/30'
                      }`}
                    >
                      {l.status}
                    </span>
                  </div>

                  <div className="flex flex-wrap items-center gap-3 text-xs text-slate-300">
                    <span className="px-2.5 py-1 rounded-lg bg-blue-500/15 text-blue-300 font-bold border border-blue-500/25">
                      {l.leave_type_name} Leave
                    </span>
                    <span>
                      Duration: <b className="text-white font-mono">{l.start_date}</b> to <b className="text-white font-mono">{l.end_date}</b> (<span className="text-emerald-400 font-bold">{l.days_count} Working Days</span>)
                    </span>
                  </div>

                  <p className="text-xs text-slate-300 bg-white/[0.02] p-3 rounded-2xl border border-white/5">
                    Reason: <i>"{l.reason}"</i>
                  </p>

                  {l.hr_comment && (
                    <p className="text-[11px] text-blue-400 bg-blue-500/10 px-3 py-1.5 rounded-xl border border-blue-500/20">
                      HR Comment: <b>{l.hr_comment}</b>
                    </p>
                  )}
                </div>

                {l.status === 'pending' && (
                  <div className="flex flex-col sm:flex-row items-center gap-2.5 lg:w-[420px] shrink-0">
                    <input
                      type="text"
                      placeholder="Feedback/Reason for employee..."
                      value={hrComment[l.id] || ''}
                      onChange={e => setHrComment({ ...hrComment, [l.id]: e.target.value })}
                      className="w-full px-4 py-2.5 rounded-2xl border border-white/10 text-xs bg-white/5 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50 shadow-inner"
                    />

                    <div className="flex items-center space-x-2 w-full sm:w-auto shrink-0">
                      <button
                        onClick={() => handleReview(l.id, 'approve')}
                        disabled={actionLoading === l.id}
                        className="flex-1 sm:flex-none px-5 py-2.5 rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold text-xs shadow-md shadow-emerald-500/20 transition disabled:opacity-50"
                      >
                        Approve
                      </button>
                      <button
                        onClick={() => handleReview(l.id, 'reject')}
                        disabled={actionLoading === l.id}
                        className="flex-1 sm:flex-none px-4 py-2.5 rounded-2xl bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 font-bold text-xs border border-rose-500/30 transition disabled:opacity-50"
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

