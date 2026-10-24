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
      <div className="flex items-center justify-center min-h-[60vh] text-slate-500">
        <RefreshCw className="w-6 h-6 animate-spin text-blue-600 mr-2" />
        <span>Loading Self-Service Portal...</span>
      </div>
    );
  }

  const todayAtt = data?.todayAttendance;
  const hoursThisWeek = data?.hoursThisWeek || 0;
  const weeklyTarget = data?.weeklyTargetHours || 40;
  const hoursProgress = Math.min(100, Math.round((hoursThisWeek / weeklyTarget) * 100));

  return (
    <div className="space-y-6">
      {/* Welcome Greeting Banner */}
      <div className="p-6 rounded-3xl bg-gradient-to-r from-blue-600 via-indigo-600 to-slate-900 text-white shadow-xl flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <span className="text-xs uppercase font-bold text-blue-200 tracking-wider">Employee Self-Service</span>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight mt-1">
            Welcome back, {employee?.full_name || user?.email?.split('@')[0]}!
          </h1>
          <p className="text-xs sm:text-sm text-blue-100 mt-1">
            {employee?.designation_name || 'Staff Member'} · {employee?.department_name || 'General Dept'} · Code: {employee?.code || 'EMP'}
          </p>
        </div>

        <div className="flex items-center space-x-2">
          <Link
            to="/leave/my"
            className="px-4 py-2.5 rounded-xl bg-white text-blue-900 hover:bg-blue-50 font-bold text-xs shadow-md transition"
          >
            Apply for Leave
          </Link>
        </div>
      </div>

      {errorMsg && (
        <div className="p-4 rounded-2xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-300 text-xs flex items-center space-x-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* Main Grid: Attendance Check-In Widget & Weekly Target */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Attendance Check-in Widget */}
        <div className="lg:col-span-2 p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-base font-bold text-slate-900 dark:text-white">Daily Attendance Stamp</h2>
              <p className="text-xs text-slate-400">Secure cloud timestamp with automated policy verification</p>
            </div>
            <span className="px-2.5 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
              {new Date().toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })}
            </span>
          </div>

          {/* Current Status Box */}
          <div className="p-5 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-4 mb-6">
            <div className="flex items-center space-x-4">
              <div
                className={`w-12 h-12 rounded-2xl flex items-center justify-center ${
                  !todayAtt
                    ? 'bg-amber-100 text-amber-600 dark:bg-amber-900/40'
                    : todayAtt.check_out
                    ? 'bg-emerald-100 text-emerald-600 dark:bg-emerald-900/40'
                    : 'bg-blue-100 text-blue-600 dark:bg-blue-900/40'
                }`}
              >
                <Clock className="w-6 h-6" />
              </div>
              <div>
                <p className="text-xs text-slate-400 uppercase font-bold tracking-wider">Status Today</p>
                <div className="flex items-center space-x-2 mt-0.5">
                  <span className="text-lg font-black text-slate-900 dark:text-white capitalize">
                    {!todayAtt ? 'Not Checked In' : todayAtt.check_out ? 'Completed Shift' : 'Clocked In'}
                  </span>
                  {todayAtt && (
                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase ${
                        todayAtt.status === 'present'
                          ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40'
                          : todayAtt.status === 'late'
                          ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/40'
                          : 'bg-blue-100 text-blue-700 dark:bg-blue-900/40'
                      }`}
                    >
                      {todayAtt.status}
                    </span>
                  )}
                </div>
              </div>
            </div>

            <div className="text-right sm:border-l sm:border-slate-200 dark:sm:border-slate-700 sm:pl-6 space-y-1">
              {todayAtt ? (
                <>
                  <p className="text-xs text-slate-500">
                    In: <b className="text-slate-900 dark:text-white font-mono">{todayAtt.check_in}</b>
                  </p>
                  <p className="text-xs text-slate-500">
                    Out: <b className="text-slate-900 dark:text-white font-mono">{todayAtt.check_out || 'Active'}</b>
                  </p>
                  {todayAtt.work_hours > 0 && (
                    <p className="text-xs font-bold text-emerald-600 dark:text-emerald-400">
                      Duration: {todayAtt.work_hours} hrs
                    </p>
                  )}
                </>
              ) : (
                <p className="text-xs text-slate-400">Start before 09:15 AM to avoid late status.</p>
              )}
            </div>
          </div>

          {/* Action Buttons */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <button
              onClick={handleWebCheckIn}
              disabled={actionLoading || Boolean(todayAtt)}
              className="py-3 px-4 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-md transition disabled:opacity-40 flex items-center justify-center space-x-2"
            >
              <Clock className="w-4 h-4" />
              <span>Web Check-In</span>
            </button>

            <button
              onClick={() => setCameraModalOpen(true)}
              disabled={actionLoading || Boolean(todayAtt)}
              className="py-3 px-4 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white font-bold text-xs shadow-md transition disabled:opacity-40 flex items-center justify-center space-x-2"
            >
              <Camera className="w-4 h-4" />
              <span>Camera + GPS Check-In</span>
            </button>

            <button
              onClick={handleWebCheckOut}
              disabled={actionLoading || !todayAtt || Boolean(todayAtt?.check_out)}
              className="py-3 px-4 rounded-xl bg-slate-800 hover:bg-slate-900 text-white font-bold text-xs shadow-md transition disabled:opacity-40 flex items-center justify-center space-x-2"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>Check-Out</span>
            </button>
          </div>
        </div>

        {/* Weekly Target & Punctuality */}
        <div className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs flex flex-col justify-between space-y-6">
          <div>
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400 block mb-1">Weekly Target</span>
            <div className="flex items-baseline justify-between mb-2">
              <span className="text-2xl font-black text-slate-900 dark:text-white">{hoursThisWeek} hrs</span>
              <span className="text-xs font-bold text-slate-400">of {weeklyTarget} hrs ({hoursProgress}%)</span>
            </div>
            {/* Progress Bar */}
            <div className="w-full h-3 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
              <div
                className="h-full rounded-full bg-gradient-to-r from-blue-500 to-indigo-600 transition-all duration-500"
                style={{ width: `${hoursProgress}%` }}
              />
            </div>
          </div>

          <div className="p-4 rounded-2xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900/40">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-amber-800 dark:text-amber-300">Late Arrivals This Month:</span>
              <span className="text-lg font-black text-amber-600 dark:text-amber-400">{data?.lateCountThisMonth || 0}</span>
            </div>
            <p className="text-[11px] text-amber-700/80 dark:text-amber-400/80 mt-1">
              Rule: 3 late arrivals result in 0.5-day salary deduction.
            </p>
          </div>
        </div>
      </div>

      {/* Leave Balances Grid */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-base font-bold text-slate-900 dark:text-white">My Yearly Leave Quota Balances</h2>
          <Link to="/leave/my" className="text-xs text-blue-600 font-semibold hover:underline">
            View history / Apply →
          </Link>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {data?.leaveBalances?.map((b: any) => (
            <div
              key={b.name}
              className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs"
            >
              <p className="text-xs font-bold text-slate-500 uppercase">{b.name} Leave</p>
              <div className="text-2xl font-black text-slate-900 dark:text-white mt-1">
                {b.remaining}
              </div>
              <p className="text-[11px] text-slate-400 mt-0.5">
                {b.quota === -1 ? 'Unlimited days' : `${b.used} of ${b.quota} days used`}
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* Payslip & Announcements Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Last Payslip Card */}
        <div className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-base font-bold text-slate-900 dark:text-white">Latest Payslip</h2>
            <Link to="/payslips" className="text-xs text-blue-600 hover:underline font-semibold">
              All Payslips
            </Link>
          </div>

          {data?.lastPayslip ? (
            <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800 space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-xs font-bold text-slate-400 uppercase">Period:</span>
                  <p className="text-sm font-black text-slate-900 dark:text-white">{data.lastPayslip.month}</p>
                </div>
                <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 capitalize">
                  {data.lastPayslip.run_status}
                </span>
              </div>

              <div className="grid grid-cols-2 gap-2 text-xs pt-2 border-t border-slate-200 dark:border-slate-700">
                <div>
                  <span className="text-slate-400 block">Gross Salary:</span>
                  <span className="font-bold text-slate-800 dark:text-slate-200">
                    Rs. {data.lastPayslip.gross_salary?.toLocaleString()}
                  </span>
                </div>
                <div>
                  <span className="text-slate-400 block">Net Take-Home:</span>
                  <span className="font-bold text-emerald-600 text-sm">
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
                className="mt-2 w-full py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs flex items-center justify-center space-x-1.5 shadow-xs transition"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Download Official Payslip PDF</span>
              </button>
            </div>
          ) : (
            <p className="text-xs text-slate-400 text-center py-8">No finalized payslips available yet.</p>
          )}
        </div>

        {/* Company Announcements */}
        <div className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs">
          <h2 className="text-base font-bold text-slate-900 dark:text-white mb-4">Announcements</h2>
          <div className="space-y-3 max-h-56 overflow-y-auto">
            {data?.announcements?.length > 0 ? (
              data.announcements.map((a: any) => (
                <div
                  key={a.id}
                  className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800 text-xs"
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-bold text-slate-900 dark:text-white">{a.title}</span>
                    <span className="text-[10px] text-slate-400">{new Date(a.created_at).toLocaleDateString()}</span>
                  </div>
                  <p className="text-slate-600 dark:text-slate-400">{a.content}</p>
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

