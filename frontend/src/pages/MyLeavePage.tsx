import React, { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import {
  CalendarDays, Sparkles, Plus, Clock, AlertCircle, CheckCircle2,
  X, RefreshCw, Send, ChevronRight
} from 'lucide-react';
import { api } from '../services/api.js';
import confetti from 'canvas-confetti';

export function MyLeavePage() {
  const location = useLocation();

  const [balances, setBalances] = useState<any[]>([]);
  const [myRequests, setMyRequests] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Smart Leave NLP input
  const [smartPrompt, setSmartPrompt] = useState('');
  const [smartLoading, setSmartLoading] = useState(false);

  // Manual Form
  const [leaveTypeId, setLeaveTypeId] = useState<number | string>('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [reason, setReason] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const fetchLeaveData = async () => {
    try {
      setLoading(true);
      const [balRes, reqRes] = await Promise.all([
        api.get('/leave/balances'),
        api.get('/leave/requests')
      ]);
      setBalances(balRes.balances || []);
      setMyRequests(reqRes.leaves || []);
    } catch (err) {
      console.error('Failed to load leave data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLeaveData();
  }, []);

  // Handle pre-fill from AI Assistant Drawer if routed
  useEffect(() => {
    const prefill = (location.state as any)?.prefill;
    if (prefill) {
      if (prefill.leave_type_id) setLeaveTypeId(prefill.leave_type_id);
      if (prefill.start_date) setStartDate(prefill.start_date);
      if (prefill.end_date) setEndDate(prefill.end_date);
      if (prefill.reason) setReason(prefill.reason);
    }
  }, [location.state]);

  const handleSmartLeaveParse = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!smartPrompt.trim()) return;
    setSmartLoading(true);
    setErrorMsg(null);

    try {
      const res = await api.post('/ai/smart-leave', { prompt: smartPrompt });
      const parsed = res.parsed;
      if (parsed) {
        setLeaveTypeId(parsed.leave_type_id);
        setStartDate(parsed.start_date);
        setEndDate(parsed.end_date);
        setReason(parsed.reason);
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Smart leave parsing failed');
    } finally {
      setSmartLoading(false);
    }
  };

  const handleApply = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSubmitting(true);

    try {
      await api.post('/leave/apply', {
        leave_type_id: Number(leaveTypeId),
        start_date: startDate,
        end_date: endDate,
        reason
      });

      confetti({ particleCount: 50, spread: 50 });
      alert('Leave application submitted successfully for HR approval.');
      setReason('');
      setStartDate('');
      setEndDate('');
      await fetchLeaveData();
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to submit leave request');
    } finally {
      setSubmitting(false);
    }
  };

  const handleCancel = async (id: number) => {
    if (!confirm('Are you sure you want to cancel this pending request?')) return;
    try {
      await api.patch(`/leave/${id}/cancel`);
      await fetchLeaveData();
    } catch (err: any) {
      alert(err.message || 'Could not cancel request');
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
            Time Off & Absence Hub
          </div>
          <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-slate-900 dark:text-white">
            Leave Center & Smart Applications
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1 max-w-xl">
            Natural language Smart Leave, quota balances, official calendar exclusions, and real-time request tracking.
          </p>
        </div>
      </div>

      {/* Quota Balances */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {balances.map(b => (
          <div
            key={b.id}
            className="p-5 rounded-3xl glass-card group hover:border-blue-500/50 transition-all"
          >
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">{b.name} Leave</span>
            <div className="text-3xl font-black text-blue-500 mt-2">
              {b.remaining}
            </div>
            <p className="text-[11px] text-slate-400 mt-1">
              {b.quota === -1 ? 'Unlimited PTO' : `${b.used} of ${b.quota} days used`}
            </p>
          </div>
        ))}
      </div>

      {/* Smart Leave Banner */}
      <div className="p-6 sm:p-7 rounded-3xl bg-gradient-to-r from-purple-950/80 via-indigo-950/80 to-slate-900/90 border border-purple-500/30 text-white shadow-2xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-80 h-40 bg-purple-500/15 blur-3xl pointer-events-none" />
        <div className="flex items-center space-x-2.5 mb-2 relative z-10">
          <div className="w-8 h-8 rounded-xl bg-amber-400/20 text-amber-300 flex items-center justify-center border border-amber-400/30">
            <Sparkles className="w-4 h-4 animate-pulse" />
          </div>
          <h2 className="font-black text-base sm:text-lg">Smart Leave (AI Natural Language Copilot)</h2>
          <span className="px-2.5 py-0.5 rounded-full text-[10px] bg-amber-400/20 text-amber-300 font-bold uppercase border border-amber-400/30">
            Instant NLP
          </span>
        </div>
        <p className="text-xs sm:text-sm text-purple-200/90 max-w-xl mb-4 relative z-10 leading-relaxed">
          Type plain sentences like <i>"Need next Monday and Tuesday off for family wedding"</i> or <i>"Bhai ki shadi hai chutti chahiye"</i>. AI automatically determines dates, leave type, and pre-fills your form!
        </p>

        <form onSubmit={handleSmartLeaveParse} className="flex gap-2.5 relative z-10">
          <input
            type="text"
            value={smartPrompt}
            onChange={e => setSmartPrompt(e.target.value)}
            placeholder="Type your leave request in plain words or Roman Urdu..."
            className="flex-1 px-4 py-3 rounded-2xl bg-white/10 backdrop-blur-md border border-white/20 text-xs sm:text-sm text-white placeholder-purple-300/60 focus:outline-none focus:ring-2 focus:ring-amber-400/70 shadow-inner"
          />
          <button
            type="submit"
            disabled={smartLoading || !smartPrompt.trim()}
            className="px-6 py-3 rounded-2xl bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-300 hover:to-amber-400 text-slate-950 font-black text-xs shadow-lg shadow-amber-500/25 transition-all transform hover:scale-[1.02] active:scale-[0.98] disabled:opacity-40 flex items-center space-x-2 shrink-0"
          >
            <Sparkles className="w-4 h-4" />
            <span>{smartLoading ? 'Extracting...' : 'AI Pre-Fill'}</span>
          </button>
        </form>
      </div>

      {errorMsg && (
        <div className="p-4 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-center space-x-3 shadow-lg shadow-rose-950/40">
          <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
          <span className="font-medium">{errorMsg}</span>
        </div>
      )}

      {/* Main Grid: Application Form & Request History */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Application Form */}
        <div className="p-6 rounded-3xl glass-card space-y-4">
          <h2 className="text-base font-bold text-slate-900 dark:text-white uppercase tracking-wider flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-blue-500" />
            Apply for Time Off
          </h2>

          <form onSubmit={handleApply} className="space-y-4">
            <div>
              <label className="text-xs font-bold text-slate-400 uppercase tracking-wider block mb-1.5">Leave Type *</label>
              <select
                required
                value={leaveTypeId}
                onChange={e => setLeaveTypeId(e.target.value)}
                className="w-full px-4 py-2.5 rounded-2xl border border-white/10 bg-slate-900 text-slate-200 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500/50 shadow-sm"
              >
                <option value="">Select Category...</option>
                {balances.map(b => (
                  <option key={b.id} value={b.id}>
                    {b.name} Leave ({b.remaining} remaining)
                  </option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-bold text-slate-400 uppercase tracking-wider block mb-1.5">Start Date *</label>
                <input
                  type="date"
                  required
                  value={startDate}
                  onChange={e => setStartDate(e.target.value)}
                  className="w-full px-3 py-2 rounded-2xl border border-white/10 bg-slate-900 text-slate-200 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500/50 shadow-sm"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-400 uppercase tracking-wider block mb-1.5">End Date *</label>
                <input
                  type="date"
                  required
                  value={endDate}
                  onChange={e => setEndDate(e.target.value)}
                  className="w-full px-3 py-2 rounded-2xl border border-white/10 bg-slate-900 text-slate-200 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500/50 shadow-sm"
                />
              </div>
            </div>

            <div>
              <label className="text-xs font-bold text-slate-400 uppercase tracking-wider block mb-1.5">Reason for Leave *</label>
              <textarea
                required
                rows={3}
                value={reason}
                onChange={e => setReason(e.target.value)}
                placeholder="Brief justification for your supervisor..."
                className="w-full p-3.5 rounded-2xl border border-white/10 bg-white/5 text-white placeholder-slate-500 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500/50 shadow-inner"
              />
            </div>

            <div className="p-3.5 rounded-2xl bg-white/[0.03] border border-white/5 text-[11px] text-slate-400 leading-relaxed">
              <b className="text-slate-300">Policy Guard:</b> Official company weekends and gazetted public holidays are automatically excluded from leave deductions.
            </div>

            <button
              type="submit"
              disabled={submitting}
              className="w-full py-3 rounded-2xl bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 hover:from-blue-500 hover:to-indigo-500 text-white font-bold text-xs shadow-lg shadow-blue-500/25 transition-all transform hover:scale-[1.01] active:scale-[0.98] disabled:opacity-50"
            >
              {submitting ? 'Submitting Application...' : 'Confirm & Submit Application'}
            </button>
          </form>
        </div>

        {/* Requests History */}
        <div className="lg:col-span-2 p-6 rounded-3xl glass-card space-y-4">
          <h2 className="text-base font-bold text-slate-900 dark:text-white uppercase tracking-wider flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-500" />
            My Leave Request History
          </h2>

          <div className="space-y-3 max-h-[500px] overflow-y-auto pr-1">
            {myRequests.length === 0 ? (
              <p className="text-xs text-slate-400 text-center py-12">No leave requests submitted yet.</p>
            ) : (
              myRequests.map(r => (
                <div
                  key={r.id}
                  className="p-4 rounded-2xl bg-white/[0.03] border border-white/5 hover:border-white/10 transition text-xs space-y-2"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <span className="font-bold text-white text-sm">
                        {r.leave_type_name} Leave
                      </span>
                      <span className="text-slate-400 font-medium font-mono">({r.days_count} Working Days)</span>
                    </div>

                    <div className="flex items-center space-x-2">
                      <span
                        className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider border ${
                          r.status === 'approved'
                            ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30'
                            : r.status === 'rejected'
                            ? 'bg-rose-500/15 text-rose-400 border-rose-500/30'
                            : r.status === 'cancelled'
                            ? 'bg-slate-500/15 text-slate-400 border-slate-500/30'
                            : 'bg-amber-500/15 text-amber-400 border-amber-500/30'
                        }`}
                      >
                        {r.status}
                      </span>

                      {r.status === 'pending' && (
                        <button
                          onClick={() => handleCancel(r.id)}
                          className="text-[11px] text-rose-400 hover:underline font-semibold"
                        >
                          Cancel
                        </button>
                      )}
                    </div>
                  </div>

                  <p className="text-slate-400 font-mono text-[11px]">
                    {r.start_date} to {r.end_date}
                  </p>

                  <p className="text-slate-300">
                    Reason: <i>"{r.reason}"</i>
                  </p>

                  {r.hr_comment && (
                    <p className="text-[11px] text-blue-400 bg-blue-500/10 p-2 rounded-xl border border-blue-500/20">
                      HR Feedback: <b>{r.hr_comment}</b>
                    </p>
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

