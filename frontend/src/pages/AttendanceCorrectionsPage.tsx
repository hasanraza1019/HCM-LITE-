import React, { useState, useEffect } from 'react';
import { Clock, CheckCircle2, XCircle, AlertCircle, RefreshCw, MessageSquare } from 'lucide-react';
import { api } from '../services/api.js';
import { useAuth } from '../context/AuthContext.js';
import confetti from 'canvas-confetti';

export function AttendanceCorrectionsPage() {
  const { user } = useAuth();
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
        confetti({ particleCount: 40, spread: 45 });
      }

      await fetchCorrections();
    } catch (err: any) {
      alert(err.message || 'Review action failed');
    } finally {
      setActionLoading(null);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-black tracking-tight text-slate-900 dark:text-white">
          Attendance Corrections Inbox
        </h1>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
          Review employee correction requests, adjust timestamps, and verify justification reasons.
        </p>
      </div>

      <div className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-slate-400">
            <RefreshCw className="w-5 h-5 animate-spin mx-auto mb-2 text-blue-500" />
            <span>Loading correction requests...</span>
          </div>
        ) : corrections.length === 0 ? (
          <div className="p-12 text-center text-slate-400 text-xs">
            No attendance correction requests submitted.
          </div>
        ) : (
          <div className="divide-y divide-slate-100 dark:divide-slate-800">
            {corrections.map(c => (
              <div key={c.id} className="p-5 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                <div className="space-y-1.5 flex-1">
                  <div className="flex items-center space-x-2.5">
                    <span className="font-bold text-sm text-slate-900 dark:text-white">
                      {c.employee_name} ({c.employee_code})
                    </span>
                    <span
                      className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                        c.status === 'approved'
                          ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40'
                          : c.status === 'rejected'
                          ? 'bg-rose-100 text-rose-700 dark:bg-rose-900/40'
                          : 'bg-amber-100 text-amber-700 dark:bg-amber-900/40'
                      }`}
                    >
                      {c.status}
                    </span>
                  </div>

                  <p className="text-xs text-slate-500">
                    Target Date: <b className="text-slate-800 dark:text-slate-200 font-mono">{c.date}</b> · Requested Times:{' '}
                    <b className="text-blue-600 font-mono">{c.requested_check_in}</b> to{' '}
                    <b className="text-blue-600 font-mono">{c.requested_check_out}</b>
                  </p>

                  <p className="text-xs text-slate-600 dark:text-slate-300 bg-slate-50 dark:bg-slate-800/40 p-2.5 rounded-xl border border-slate-100 dark:border-slate-800">
                    Reason: <i>"{c.reason}"</i>
                  </p>

                  {c.hr_comment && (
                    <p className="text-[11px] text-slate-500">
                      HR Feedback: <b>{c.hr_comment}</b>
                    </p>
                  )}
                </div>

                {isHRorAdmin && c.status === 'pending' && (
                  <div className="flex flex-col sm:flex-row items-center gap-2 lg:w-96">
                    <input
                      type="text"
                      placeholder="Comment / Note..."
                      value={reviewComment[c.id] || ''}
                      onChange={e => setReviewComment({ ...reviewComment, [c.id]: e.target.value })}
                      className="w-full px-3 py-1.5 rounded-xl border border-slate-300 dark:border-slate-700 text-xs bg-white dark:bg-slate-800"
                    />

                    <div className="flex items-center space-x-2 w-full sm:w-auto">
                      <button
                        onClick={() => handleReview(c.id, 'approve')}
                        disabled={actionLoading === c.id}
                        className="flex-1 sm:flex-none px-3.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-xs transition"
                      >
                        Approve
                      </button>
                      <button
                        onClick={() => handleReview(c.id, 'reject')}
                        disabled={actionLoading === c.id}
                        className="flex-1 sm:flex-none px-3.5 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs shadow-xs transition"
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

