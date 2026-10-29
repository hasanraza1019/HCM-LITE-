import React, { useState, useEffect } from 'react';
import {
  Clock, Calendar, CheckCircle2, AlertCircle, Camera, FileText,
  Download, ArrowRight, Bot, ShieldCheck, Sparkles, RefreshCw
} from 'lucide-react';
import { api } from '../services/api.js';
import { useAuth } from '../context/AuthContext.js';
import { CameraCheckInModal } from '../components/CameraCheckInModal.js';
import confetti from 'canvas-confetti';
import { Link } from 'react-router-dom';

export function EmployeeDashboardPage() {
  const { user, employee } = useAuth();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [cameraModalOpen, setCameraModalOpen] = useState(false);

  const fetchDashboard = async () => {
    try {
      setLoading(true);
      setErrorMsg(null);
      const res = await api.get('/analytics/employee');
      setData(res);
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to load employee dashboard');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboard();
  }, []);

  const handleWebCheckIn = async () => {
    setActionLoading(true);
    setErrorMsg(null);
    try {
      await api.post('/attendance/check-in', { source: 'web' });
      confetti({ particleCount: 60, spread: 55, origin: { y: 0.6 } });
      await fetchDashboard();
    } catch (err: any) {
      setErrorMsg(err.message || 'Check-in failed');
    } finally {
      setActionLoading(false);
    }
  };

  const handleWebCheckOut = async () => {
    setActionLoading(true);
    setErrorMsg(null);
    try {
      await api.post('/attendance/check-out', {});
      confetti({ particleCount: 50, spread: 50, origin: { y: 0.6 } });
      await fetchDashboard();
    } catch (err: any) {
      setErrorMsg(err.message || 'Check-out failed');
    } finally {
      setActionLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-slate-400 gap-3">
        <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-600 animate-pulse flex items-center justify-center shadow-lg shadow-blue-500/25">
          <RefreshCw className="w-6 h-6 animate-spin text-white" />
        </div>
        <span className="text-sm font-semibold text-slate-300">Loading Self-Service Portal...</span>
      </div>
    );
  }

  const todayAtt = data?.todayAttendance;
  const hoursThisWeek = data?.hoursThisWeek || 0;
  const weeklyTarget = data?.weeklyTargetHours || 40;
  const hoursProgress = Math.min(100, Math.round((hoursThisWeek / weeklyTarget) * 100));

  return (
    <div className="space-y-7 pb-10">
      {/* Welcome Greeting Banner */}
      <div className="p-6 sm:p-8 rounded-3xl bg-gradient-to-r from-blue-600/30 via-indigo-600/20 to-purple-600/20 border border-white/10 glass-panel shadow-2xl relative overflow-hidden flex flex-col sm:flex-row sm:items-center justify-between gap-5">
        <div className="absolute top-0 right-0 w-96 h-36 bg-blue-500/10 blur-3xl pointer-events-none" />
        <div className="relative z-10">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-bold bg-blue-500/20 text-blue-300 border border-blue-500/30 mb-2">
            <span className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-ping" />
            Employee Self-Service Flight Deck
          </div>
          <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-white mt-1">
            Welcome back, {employee?.full_name || user?.email?.split('@')[0]}!
          </h1>
          <p className="text-xs sm:text-sm text-slate-300 mt-1 flex flex-wrap items-center gap-2">
            <span className="font-semibold text-white">{employee?.designation_name || 'Staff Member'}</span>
            <span>·</span>
            <span>{employee?.department_name || 'General Dept'}</span>
            <span>·</span>
            <span className="font-mono text-blue-400 bg-blue-500/10 px-2 py-0.5 rounded-md border border-blue-500/20">ID: {employee?.code || 'EMP'}</span>
          </p>
        </div>

        <div className="relative z-10 flex items-center space-x-3 shrink-0">
          <Link
            to="/leave/my"
            className="px-5 py-3 rounded-2xl bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 hover:from-blue-500 hover:to-indigo-500 text-white font-bold text-xs shadow-lg shadow-blue-500/25 transition-all transform hover:scale-[1.02] active:scale-[0.98]"
          >
            Apply for Leave
          </Link>
        </div>
      </div>

      {errorMsg && (
        <div className="p-4 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-center space-x-3 shadow-lg shadow-rose-950/40">
          <AlertCircle className="w-5 h-5 shrink-0 text-rose-400" />
          <span className="font-medium">{errorMsg}</span>
        </div>
      )}

      {/* Main Grid: Attendance Check-In Widget & Weekly Target */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Attendance Check-in Widget */}
        <div className="lg:col-span-2 p-6 rounded-3xl glass-card relative overflow-hidden space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-base font-bold text-slate-900 dark:text-white uppercase tracking-wider flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-blue-500 animate-pulse" />
                Daily Attendance Stamp
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">Secure cloud timestamp with policy verification</p>
            </div>
            <span className="px-3 py-1 rounded-full text-xs font-bold bg-white/5 border border-white/10 text-slate-300">
              {new Date().toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })}
            </span>
          </div>

          {/* Current Status Box */}
          <div className="p-5 rounded-2xl bg-white/[0.03] border border-white/5 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center space-x-4">
              <div
                className={`w-14 h-14 rounded-2xl flex items-center justify-center shadow-lg transition-transform ${
                  !todayAtt
                    ? 'bg-amber-500/15 text-amber-400 border border-amber-500/30'
                    : todayAtt.check_out
                    ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
                    : 'bg-blue-500/15 text-blue-400 border border-blue-500/30 animate-pulse'
                }`}
              >
                <Clock className="w-7 h-7" />
              </div>
              <div>
                <p className="text-xs text-slate-400 uppercase font-bold tracking-wider">Status Today</p>
                <div className="flex items-center space-x-2 mt-0.5">
                  <span className="text-xl font-black text-slate-900 dark:text-white capitalize">
                    {!todayAtt ? 'Not Checked In' : todayAtt.check_out ? 'Shift Completed' : 'Clocked In'}
                  </span>
                  {todayAtt && (
                    <span
                      className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full uppercase border ${
                        todayAtt.status === 'present'
                          ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30'
                          : todayAtt.status === 'late'
                          ? 'bg-amber-500/15 text-amber-400 border-amber-500/30'
                          : 'bg-blue-500/15 text-blue-400 border-blue-500/30'
                      }`}
                    >
                      {todayAtt.status}
                    </span>
                  )}
                </div>
              </div>
            </div>

            <div className="text-right sm:border-l sm:border-white/10 sm:pl-6 space-y-1">
              {todayAtt ? (
                <>
                  <p className="text-xs text-slate-400">
                    In: <b className="text-white font-mono ml-1">{todayAtt.check_in}</b>
                  </p>
                  <p className="text-xs text-slate-400">
                    Out: <b className="text-white font-mono ml-1">{todayAtt.check_out || 'Active Now'}</b>
                  </p>
                  {todayAtt.work_hours > 0 && (
                    <p className="text-xs font-bold text-emerald-400">
                      Duration: {todayAtt.work_hours} hrs
                    </p>
                  )}
                </>
              ) : (
                <p className="text-xs text-slate-400">Office start is 09:00 AM (grace 15 mins).</p>
              )}
            </div>
          </div>

          {/* Action Buttons */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <button
              onClick={handleWebCheckIn}
              disabled={actionLoading || Boolean(todayAtt)}
              className="py-3.5 px-4 rounded-2xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs shadow-lg shadow-blue-500/25 transition-all transform hover:scale-[1.02] active:scale-[0.98] disabled:opacity-40 flex items-center justify-center space-x-2"
            >
              <Clock className="w-4 h-4" />
              <span>Web Check-In</span>
            </button>

            <button
              onClick={() => setCameraModalOpen(true)}
              disabled={actionLoading || Boolean(todayAtt)}
              className="py-3.5 px-4 rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold text-xs shadow-lg shadow-emerald-500/25 transition-all transform hover:scale-[1.02] active:scale-[0.98] disabled:opacity-40 flex items-center justify-center space-x-2"
            >
              <Camera className="w-4 h-4" />
              <span>Camera + GPS Check-In</span>
            </button>

            <button
              onClick={handleWebCheckOut}
              disabled={actionLoading || !todayAtt || Boolean(todayAtt?.check_out)}
              className="py-3.5 px-4 rounded-2xl bg-white/10 hover:bg-white/20 text-white font-bold text-xs border border-white/10 shadow-sm transition-all transform hover:scale-[1.02] active:scale-[0.98] disabled:opacity-40 flex items-center justify-center space-x-2"
            >
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              <span>Check-Out</span>
            </button>
          </div>
        </div>

        {/* Weekly Target & Punctuality */}
        <div className="p-6 rounded-3xl glass-card flex flex-col justify-between space-y-6">
          <div>
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400 block mb-2">Weekly Work Target</span>
            <div className="flex items-baseline justify-between mb-2">
              <span className="text-3xl font-black text-slate-900 dark:text-white">{hoursThisWeek} hrs</span>
              <span className="text-xs font-bold text-slate-400">of {weeklyTarget} hrs ({hoursProgress}%)</span>
            </div>
            {/* Progress Bar */}
            <div className="w-full h-3 rounded-full bg-white/5 overflow-hidden border border-white/10">
              <div
                className="h-full rounded-full bg-gradient-to-r from-blue-500 via-indigo-500 to-purple-500 transition-all duration-500 shadow-sm shadow-blue-500"
                style={{ width: `${hoursProgress}%` }}
              />
            </div>
          </div>

          <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/20">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-amber-300">Late Arrivals This Month:</span>
              <span className="text-2xl font-black text-amber-400">{data?.lateCountThisMonth || 0}</span>
            </div>
            <p className="text-[11px] text-amber-200/80 mt-1 leading-relaxed">
              3 late arrivals trigger a 0.5-day salary deduction.
            </p>
          </div>
        </div>
      </div>

      {/* Leave Balances Grid */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-base font-bold text-slate-900 dark:text-white uppercase tracking-wider flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-500" />
            Yearly Leave Quota Balances
          </h2>
          <Link to="/leave/my" className="text-xs text-blue-400 font-semibold hover:underline">
            View history / Apply →
          </Link>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {data?.leaveBalances?.map((b: any) => (
            <div
              key={b.name}
              className="p-5 rounded-3xl glass-card group hover:border-blue-500/50 transition-all"
            >
              <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">{b.name} Leave</p>
              <div className="text-3xl font-black text-slate-900 dark:text-white mt-2">
                {b.remaining}
              </div>
              <p className="text-[11px] text-slate-400 mt-1">
                {b.quota === -1 ? 'Unlimited days' : `${b.used} of ${b.quota} days used`}
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* Payslip & Announcements Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Last Payslip Card */}
        <div className="p-6 rounded-3xl glass-card space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-bold text-slate-900 dark:text-white uppercase tracking-wider flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-500" />
              Latest Payslip
            </h2>
            <Link to="/payslips" className="text-xs text-blue-400 hover:underline font-semibold">
              All Payslips
            </Link>
          </div>

          {data?.lastPayslip ? (
            <div className="p-5 rounded-2xl bg-white/[0.03] border border-white/5 space-y-3.5">
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-xs font-bold text-slate-400 uppercase">Period:</span>
                  <p className="text-base font-black text-white">{data.lastPayslip.month}</p>
                </div>
                <span className="px-3 py-1 rounded-full text-xs font-bold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 capitalize">
                  {data.lastPayslip.run_status}
                </span>
              </div>

              <div className="grid grid-cols-2 gap-3 text-xs pt-3 border-t border-white/10">
                <div>
                  <span className="text-slate-400 block">Gross Salary:</span>
                  <span className="font-bold text-white text-sm">
                    Rs. {data.lastPayslip.gross_salary?.toLocaleString()}
                  </span>
                </div>
                <div>
                  <span className="text-slate-400 block">Net Take-Home:</span>
                  <span className="font-bold text-emerald-400 text-base">
                    Rs. {data.lastPayslip.net_salary?.toLocaleString()}
                  </span>
                </div>
              </div>

              <button
                type="button"
                onClick={() =>
                  api
                    .download(
                      `/payroll/payslips/${data.lastPayslip.id}/pdf`,
                      `Payslip_${data.lastPayslip.month}.pdf`
                    )
                    .catch(err => alert(err.message || 'PDF download failed'))
                }
                className="mt-2 w-full py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs flex items-center justify-center space-x-2 shadow-lg shadow-blue-500/25 transition"
              >
                <Download className="w-4 h-4" />
                <span>Download Official Payslip PDF</span>
              </button>
            </div>
          ) : (
            <p className="text-xs text-slate-400 text-center py-8">No finalized payslips available yet.</p>
          )}
        </div>

        {/* Company Announcements */}
        <div className="p-6 rounded-3xl glass-card space-y-4">
          <h2 className="text-base font-bold text-slate-900 dark:text-white uppercase tracking-wider flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-indigo-500" />
            Company Announcements
          </h2>
          <div className="space-y-3 max-h-60 overflow-y-auto pr-1">
            {data?.announcements?.length > 0 ? (
              data.announcements.map((a: any) => (
                <div
                  key={a.id}
                  className="p-4 rounded-2xl bg-white/[0.03] border border-white/5 text-xs hover:border-white/10 transition"
                >
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="font-bold text-white text-sm">{a.title}</span>
                    <span className="text-[10px] text-slate-400 font-mono">{new Date(a.created_at).toLocaleDateString()}</span>
                  </div>
                  <p className="text-slate-300 leading-relaxed">{a.content}</p>
                </div>
              ))
            ) : (
              <p className="text-xs text-slate-400 text-center py-8">No company announcements posted.</p>
            )}
          </div>
        </div>
      </div>

      {/* Camera Attendance Modal */}
      <CameraCheckInModal
        isOpen={cameraModalOpen}
        onClose={() => setCameraModalOpen(false)}
        onSuccess={fetchDashboard}
      />
    </div>
  );
}

