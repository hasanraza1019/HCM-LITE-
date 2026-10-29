import React, { useState, useEffect } from 'react';
import { Clock, CheckCircle2, XCircle, AlertCircle, RefreshCw, MessageSquare, Check, X, ShieldCheck } from 'lucide-react';
import { api } from '../services/api.js';
import { useAuth } from '../context/AuthContext.js';
import { useToast } from '../context/ToastContext.js';
import confetti from 'canvas-confetti';

export function AttendanceCorrectionsPage() {
  const { user } = useAuth();
  const { showToast } = useToast();
  const isHRorAdmin = user?.role === 'HR' || user?.role === 'Admin';

  const [corrections, setCorrections] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [reviewComment, setReviewComment] = useState<Record<number, string>>({});
  const [actionLoading, setActionLoading] = useState<number | null>(null);

  const fetchCorrections = async () => {
    try {
      setLoading(true);
      const res = await api.get('/attendance/corrections');
      setCorrections(res.corrections || []);
    } catch (err) {
      console.error('Failed to load corrections:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCorrections();
  }, []);

  const handleReview = async (id: number, action: 'approve' | 'reject') => {
    setActionLoading(id);
    try {
      await api.patch(`/attendance/corrections/${id}/review`, {
        action,
        hr_comment: reviewComment[id] || ''
      });

      if (action === 'approve') {
        confetti({ particleCount: 50, spread: 60 });
        showToast('Attendance correction approved and times updated.', 'success');
      } else {
        showToast('Attendance correction rejected.', 'info');
      }

      await fetchCorrections();
    } catch (err: any) {
      const msg = err.message || 'Review action failed';
      showToast(msg, 'error');
    } finally {
      setActionLoading(null);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="p-6 rounded-3xl glass-panel relative overflow-hidden border border-slate-200/80 dark:border-slate-800/80">
        <div className="absolute top-0 right-0 w-80 h-32 bg-amber-500/10 dark:bg-amber-500/5 blur-3xl pointer-events-none" />
        <div className="relative z-10">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-bold bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20 mb-2">
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>HR Compliance</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-slate-900 dark:text-white">
            Attendance Corrections Inbox
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
            Review employee correction requests, adjust timestamps, and verify justification reasons.
          </p>
        </div>
      </div>

      <div className="rounded-3xl glass-panel border border-slate-200/80 dark:border-slate-800/80 shadow-xs overflow-hidden">
        {loading ? (
          <div className="p-16 text-center text-slate-400">
            <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-blue-500" />
            <span className="text-sm font-semibold">Loading correction requests...</span>
          </div>
        ) : corrections.length === 0 ? (
          <div className="p-16 text-center text-slate-400 text-sm">
            No attendance correction requests submitted. All records aligned!
          </div>
        ) : (
          <div className="divide-y divide-slate-100 dark:divide-slate-800/60">
            {corrections.map(c => (
              <div key={c.id} className="p-6 flex flex-col lg:flex-row lg:items-center justify-between gap-5 hover:bg-slate-50/40 dark:hover:bg-slate-800/20 transition">
                <div className="space-y-2 flex-1">
                  <div className="flex items-center space-x-3">
                    <span className="font-extrabold text-base text-slate-900 dark:text-white">
                      {c.employee_name}
                    </span>
                    <span className="px-2 py-0.5 rounded-lg bg-slate-100 dark:bg-slate-800 text-[11px] font-mono font-bold text-slate-600 dark:text-slate-300">
                      {c.employee_code}
                    </span>
                    <span
                      className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider border ${
                        c.status === 'approved'
                          ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20'
                          : c.status === 'rejected'
                          ? 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20'
                          : 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20'
                      }`}
                    >
                      {c.status}
                    </span>
                  </div>

                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Target Date: <b className="text-slate-900 dark:text-white font-mono">{c.date}</b> · Requested Times:{' '}
                    <b className="text-blue-600 dark:text-blue-400 font-mono">{c.requested_check_in}</b> to{' '}
                    <b className="text-blue-600 dark:text-blue-400 font-mono">{c.requested_check_out}</b>
                  </p>

                  <p className="text-xs text-slate-700 dark:text-slate-200 bg-slate-100/60 dark:bg-slate-800/50 p-3 rounded-2xl border border-slate-200/60 dark:border-slate-800">
                    Reason: <i>"{c.reason}"</i>
                  </p>

                  {c.hr_comment && (
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      HR Feedback: <b className="text-slate-800 dark:text-slate-200">{c.hr_comment}</b>
                    </p>
                  )}
                </div>

                {isHRorAdmin && c.status === 'pending' && (
                  <div className="flex flex-col sm:flex-row items-center gap-2.5 lg:w-96">
                    <input
                      type="text"
                      placeholder="Comment / Note..."
                      value={reviewComment[c.id] || ''}
                      onChange={e => setReviewComment({ ...reviewComment, [c.id]: e.target.value })}
                      className="w-full px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-xs bg-white/80 dark:bg-slate-800/80 text-slate-900 dark:text-slate-100 focus:outline-hidden focus:ring-2 focus:ring-blue-500"
                    />

                    <div className="flex items-center space-x-2 w-full sm:w-auto">
                      <button
                        onClick={() => handleReview(c.id, 'approve')}
                        disabled={actionLoading === c.id}
                        className="flex-1 sm:flex-none inline-flex items-center justify-center space-x-1 px-4 py-2 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white font-bold text-xs shadow-md shadow-emerald-500/20 transition active:scale-95 disabled:opacity-50"
                      >
                        <Check className="w-3.5 h-3.5" />
                        <span>Approve</span>
                      </button>
                      <button
                        onClick={() => handleReview(c.id, 'reject')}
                        disabled={actionLoading === c.id}
                        className="flex-1 sm:flex-none inline-flex items-center justify-center space-x-1 px-4 py-2 rounded-xl bg-gradient-to-r from-rose-600 to-red-600 hover:from-rose-700 hover:to-red-700 text-white font-bold text-xs shadow-md shadow-rose-500/20 transition active:scale-95 disabled:opacity-50"
                      >
                        <X className="w-3.5 h-3.5" />
                        <span>Reject</span>
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

