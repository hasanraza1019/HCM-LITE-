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
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-black tracking-tight text-slate-900 dark:text-white">
          Leave Center & Smart Applications
        </h1>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
          Natural language Smart Leave, quota balances, working day checks, and request tracking.
        </p>
      </div>

      {/* Quota Balances */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {balances.map(b => (
          <div
            key={b.id}
            className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs"
          >
            <span className="text-xs font-bold uppercase text-slate-500">{b.name} Leave</span>
            <div className="text-3xl font-black text-blue-600 dark:text-blue-400 mt-1">
              {b.remaining}
            </div>
            <p className="text-[11px] text-slate-400 mt-0.5">
              {b.quota === -1 ? 'Unlimited PTO' : `${b.used} of ${b.quota} days used`}
            </p>
          </div>
        ))}
      </div>

      {/* Smart Leave Banner */}
      <div className="p-5 rounded-3xl bg-gradient-to-r from-purple-900 via-indigo-900 to-slate-900 text-white shadow-xl">
        <div className="flex items-center space-x-2 mb-2">
          <Sparkles className="w-5 h-5 text-amber-400" />
          <h2 className="font-extrabold text-sm sm:text-base">Smart Leave (AI Assistant)</h2>
          <span className="px-2 py-0.5 rounded text-[10px] bg-white/20 font-bold uppercase">Fast Track</span>
        </div>
        <p className="text-xs text-purple-100 max-w-xl mb-3">
          Type plain sentences like <i>"Need next Monday and Tuesday off for my sister's wedding"</i> or <i>"Bhai ki shadi hai chutti chahiye"</i>. AI automatically determines dates, leave type, and pre-fills your form!
        </p>

        <form onSubmit={handleSmartLeaveParse} className="flex gap-2">
          <input
            type="text"
            value={smartPrompt}
            onChange={e => setSmartPrompt(e.target.value)}
            placeholder="Type your leave request in plain words..."
            className="flex-1 px-4 py-2.5 rounded-xl bg-white/10 backdrop-blur-sm border border-white/20 text-xs sm:text-sm text-white placeholder-purple-200 focus:outline-none focus:ring-2 focus:ring-amber-400"
          />
          <button
            type="submit"
            disabled={smartLoading || !smartPrompt.trim()}
            className="px-5 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold text-xs shadow-md transition disabled:opacity-40 flex items-center space-x-1.5"
          >
            <Sparkles className="w-4 h-4" />
            <span>{smartLoading ? 'Extracting...' : 'AI Pre-Fill'}</span>
          </button>
        </form>
      </div>

      {errorMsg && (
        <div className="p-4 rounded-2xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-300 text-xs flex items-center space-x-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* Main Grid: Application Form & Request History */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Application Form */}
        <div className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs">
          <h2 className="text-base font-bold text-slate-900 dark:text-white mb-4">
            Apply for Time Off
          </h2>

          <form onSubmit={handleApply} className="space-y-4">
            <div>
              <label className="text-xs font-bold text-slate-600 uppercase block mb-1">Leave Type *</label>
              <select
                required
                value={leaveTypeId}
                onChange={e => setLeaveTypeId(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-semibold"
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
                <label className="text-xs font-bold text-slate-600 uppercase block mb-1">Start Date *</label>
                <input
                  type="date"
                  required
                  value={startDate}
                  onChange={e => setStartDate(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 text-xs"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-600 uppercase block mb-1">End Date *</label>
                <input
                  type="date"
                  required
                  value={endDate}
                  onChange={e => setEndDate(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 text-xs"
                />
              </div>
            </div>

            <div>
              <label className="text-xs font-bold text-slate-600 uppercase block mb-1">Reason for Leave *</label>
              <textarea
                required
                rows={3}
                value={reason}
                onChange={e => setReason(e.target.value)}
                placeholder="Brief justification..."
                className="w-full p-3 rounded-xl border border-slate-300 dark:border-slate-700 text-xs"
              />
            </div>

            <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/40 text-[11px] text-slate-500">
              <b>Policy Note:</b> Official company weekends and gazetted public holidays are automatically excluded from leave day deductions.
            </div>

            <button
              type="submit"
              disabled={submitting}
              className="w-full py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-md transition disabled:opacity-50"
            >
              {submitting ? 'Submitting Application...' : 'Confirm & Submit Application'}
            </button>
          </form>
        </div>

        {/* Requests History */}
        <div className="lg:col-span-2 p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs">
          <h2 className="text-base font-bold text-slate-900 dark:text-white mb-4">
            My Leave Request History
          </h2>

          <div className="space-y-3 max-h-[500px] overflow-y-auto">
            {myRequests.length === 0 ? (
              <p className="text-xs text-slate-400 text-center py-10">No leave requests submitted yet.</p>
            ) : (
              myRequests.map(r => (
                <div
                  key={r.id}
                  className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800 text-xs space-y-2"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <span className="font-bold text-slate-900 dark:text-white">
                        {r.leave_type_name} Leave
                      </span>
                      <span className="text-slate-400 font-medium">({r.days_count} Working Days)</span>
                    </div>

                    <div className="flex items-center space-x-2">
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                          r.status === 'approved'
                            ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40'
                            : r.status === 'rejected'
                            ? 'bg-rose-100 text-rose-700 dark:bg-rose-900/40'
                            : r.status === 'cancelled'
                            ? 'bg-slate-200 text-slate-700'
                            : 'bg-amber-100 text-amber-700 dark:bg-amber-900/40'
                        }`}
                      >
                        {r.status}
                      </span>

                      {r.status === 'pending' && (
                        <button
                          onClick={() => handleCancel(r.id)}
                          className="text-[11px] text-rose-600 hover:underline font-semibold"
                        >
                          Cancel
                        </button>
                      )}
                    </div>
                  </div>

                  <p className="text-slate-500 font-mono text-[11px]">
                    {r.start_date} to {r.end_date}
                  </p>

                  <p className="text-slate-700 dark:text-slate-300">
                    Reason: <i>"{r.reason}"</i>
                  </p>

                  {r.hr_comment && (
                    <p className="text-[11px] text-blue-600 dark:text-blue-400">
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

