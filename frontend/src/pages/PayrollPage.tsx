import React, { useState, useEffect } from 'react';
import {
  FileSpreadsheet, Lock, Download, Plus, CheckCircle2, AlertCircle,
  RefreshCw, DollarSign, Calendar, ShieldCheck, Eye, Sparkles
} from 'lucide-react';
import { api } from '../services/api.js';
import { useAuth } from '../context/AuthContext.js';
import confetti from 'canvas-confetti';

export function PayrollPage() {
  const { user } = useAuth();
  const isAdmin = user?.role === 'Admin';
  const isHR = user?.role === 'HR';

  const [runs, setRuns] = useState<any[]>([]);
  const [selectedRunId, setSelectedRunId] = useState<number | null>(null);
  const [selectedRunDetails, setSelectedRunDetails] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [drafting, setDrafting] = useState(false);
  const [targetMonth, setTargetMonth] = useState(new Date().toISOString().substring(0, 7));
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const fetchRuns = async () => {
    try {
      setLoading(true);
      const res = await api.get('/payroll/runs');
      setRuns(res.payrollRuns || []);
      if (res.payrollRuns?.length > 0 && !selectedRunId) {
        loadRunDetails(res.payrollRuns[0].id);
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to load payroll runs');
    } finally {
      setLoading(false);
    }
  };

  const loadRunDetails = async (id: number) => {
    setSelectedRunId(id);
    try {
      const res = await api.get(`/payroll/runs/${id}`);
      setSelectedRunDetails(res);
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to load run details');
    }
  };

  useEffect(() => {
    fetchRuns();
  }, []);

  const handleCreateDraft = async (e: React.FormEvent) => {
    e.preventDefault();
    setDrafting(true);
    setErrorMsg(null);

    try {
      const res = await api.post('/payroll/draft', { month: targetMonth });
      confetti({ particleCount: 50, spread: 50 });
      alert(res.message);
      await fetchRuns();
      if (res.payrollRunId) {
        await loadRunDetails(res.payrollRunId);
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to create payroll draft');
    } finally {
      setDrafting(false);
    }
  };

  const handleFinalize = async (id: number) => {
    if (!isAdmin) {
      alert('Only Admin role can finalize and lock payroll.');
      return;
    }

    if (!confirm('Finalizing will permanently lock this month’s payroll and notify all employees. Continue?')) {
      return;
    }

    try {
      const res = await api.patch(`/payroll/runs/${id}/finalize`, {});
      confetti({ particleCount: 80, spread: 70 });
      alert(res.message);
      await fetchRuns();
      await loadRunDetails(id);
    } catch (err: any) {
      alert(err.message || 'Finalization failed');
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
            Automated Financial Engine
          </div>
          <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-slate-900 dark:text-white">
            Payroll & Compensation
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1 max-w-xl">
            Automated statutory salary calculations, attendance penalty deductions, tax bracket slabs, and tamper-proof finalization.
          </p>
        </div>

        {/* Create Draft Form */}
        {(isAdmin || isHR) && (
          <form onSubmit={handleCreateDraft} className="relative z-10 flex items-center space-x-2.5">
            <input
              type="month"
              value={targetMonth}
              onChange={e => setTargetMonth(e.target.value)}
              className="px-4 py-2.5 rounded-2xl border border-white/10 bg-slate-900 text-slate-200 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500/50 shadow-sm"
            />
            <button
              type="submit"
              disabled={drafting}
              className="px-5 py-2.5 rounded-2xl bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 hover:from-blue-500 hover:to-indigo-500 text-white font-bold text-xs shadow-lg shadow-blue-500/25 transition-all transform hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 flex items-center space-x-2 shrink-0"
            >
              <Plus className="w-4 h-4" />
              <span>{drafting ? 'Calculating Engine...' : 'Run Monthly Draft'}</span>
            </button>
          </form>
        )}
      </div>

      {errorMsg && (
        <div className="p-4 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-center space-x-3 shadow-lg shadow-rose-950/40">
          <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
          <span className="font-medium">{errorMsg}</span>
        </div>
      )}

      {/* Runs Navigator & Run Details */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Runs List Sidebar */}
        <div className="p-5 rounded-3xl glass-card space-y-3">
          <span className="text-xs font-bold uppercase tracking-wider text-slate-400 block px-1">
            Payroll History ({runs.length})
          </span>

          <div className="space-y-2">
            {loading ? (
              <p className="text-xs text-slate-400 text-center py-6">Loading runs...</p>
            ) : runs.length === 0 ? (
              <p className="text-xs text-slate-400 text-center py-6">No payroll runs drafted yet.</p>
            ) : (
              runs.map(r => (
                <button
                  key={r.id}
                  onClick={() => loadRunDetails(r.id)}
                  className={`w-full text-left p-3.5 rounded-2xl text-xs transition flex items-center justify-between border ${
                    selectedRunId === r.id
                      ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white border-blue-400/40 shadow-lg shadow-blue-500/20'
                      : 'bg-white/[0.02] border-white/5 text-slate-300 hover:bg-white/[0.05]'
                  }`}
                >
                  <div>
                    <span className="font-bold text-sm block">{r.month}</span>
                    <span className={`text-[11px] font-medium ${selectedRunId === r.id ? 'text-blue-100' : 'text-slate-400'}`}>
                      Net: Rs. {Number(r.total_net).toLocaleString()}
                    </span>
                  </div>
                  <span
                    className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider border ${
                      r.status === 'finalized'
                        ? selectedRunId === r.id ? 'bg-white text-emerald-700 border-white' : 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30'
                        : selectedRunId === r.id ? 'bg-white/20 text-white border-white/20' : 'bg-amber-500/15 text-amber-400 border-amber-500/30'
                    }`}
                  >
                    {r.status}
                  </span>
                </button>
              ))
            )}
          </div>
        </div>

        {/* Selected Run Overview & Payslips Table */}
        <div className="lg:col-span-3 space-y-6">
          {selectedRunDetails && (
            <>
              {/* Run Metrics Banner */}
              <div className="p-6 rounded-3xl glass-card space-y-5">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-white/10">
                  <div className="flex items-center space-x-3.5">
                    <div className="w-12 h-12 rounded-2xl bg-blue-500/15 border border-blue-500/30 text-blue-400 flex items-center justify-center font-bold shadow-sm">
                      <FileSpreadsheet className="w-6 h-6" />
                    </div>
                    <div>
                      <h2 className="text-xl font-black text-slate-900 dark:text-white">
                        Payroll Run: {selectedRunDetails.run.month}
                      </h2>
                      <p className="text-xs text-slate-400">
                        {selectedRunDetails.run.working_days} Official Working Days in Month
                      </p>
                    </div>
                  </div>

                  {/* Finalize Action */}
                  <div className="flex items-center space-x-2">
                    {selectedRunDetails.run.status === 'finalized' ? (
                      <span className="inline-flex items-center space-x-1.5 px-3.5 py-2 rounded-2xl bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 text-xs font-bold">
                        <Lock className="w-4 h-4" />
                        <span>Locked & Finalized</span>
                      </span>
                    ) : isAdmin ? (
                      <button
                        onClick={() => handleFinalize(selectedRunDetails.run.id)}
                        className="inline-flex items-center space-x-2 px-5 py-2.5 rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold text-xs shadow-lg shadow-emerald-500/25 transition-all transform hover:scale-[1.02] active:scale-[0.98]"
                      >
                        <Lock className="w-4 h-4" />
                        <span>Finalize & Lock Payroll</span>
                      </button>
                    ) : (
                      <span className="text-xs text-slate-400 italic">
                        Draft Mode · Only Admin can finalize
                      </span>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pt-1">
                  <div className="p-4 rounded-2xl bg-white/[0.02] border border-white/5">
                    <span className="text-slate-400 block text-[11px] uppercase font-bold tracking-wider">Gross Payroll</span>
                    <span className="text-xl sm:text-2xl font-black text-white mt-1 block">
                      Rs. {Number(selectedRunDetails.run.total_gross).toLocaleString()}
                    </span>
                  </div>
                  <div className="p-4 rounded-2xl bg-rose-500/5 border border-rose-500/10">
                    <span className="text-rose-400 block text-[11px] uppercase font-bold tracking-wider">Deductions</span>
                    <span className="text-xl sm:text-2xl font-black text-rose-500 mt-1 block">
                      Rs. {Number(selectedRunDetails.run.total_deductions).toLocaleString()}
                    </span>
                  </div>
                  <div className="p-4 rounded-2xl bg-amber-500/5 border border-amber-500/10">
                    <span className="text-amber-400 block text-[11px] uppercase font-bold tracking-wider">Income Tax</span>
                    <span className="text-xl sm:text-2xl font-black text-amber-500 mt-1 block">
                      Rs. {Number(selectedRunDetails.run.total_tax).toLocaleString()}
                    </span>
                  </div>
                  <div className="p-4 rounded-2xl bg-emerald-500/5 border border-emerald-500/10">
                    <span className="text-emerald-400 block text-[11px] uppercase font-bold tracking-wider">Net Payout</span>
                    <span className="text-xl sm:text-2xl font-black text-emerald-500 mt-1 block">
                      Rs. {Number(selectedRunDetails.run.total_net).toLocaleString()}
                    </span>
                  </div>
                </div>
              </div>

              {/* Line Items Table */}
              <div className="rounded-3xl glass-card overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-white/[0.02] text-slate-400 uppercase font-bold text-[10px] tracking-wider border-b border-white/10">
                      <tr>
                        <th className="px-5 py-4">Employee</th>
                        <th className="px-5 py-4">Basic + Allowances</th>
                        <th className="px-5 py-4">Gross Salary</th>
                        <th className="px-5 py-4">Days (Pres / Abs)</th>
                        <th className="px-5 py-4">Deductions</th>
                        <th className="px-5 py-4">Income Tax</th>
                        <th className="px-5 py-4">Net Take-Home</th>
                        <th className="px-5 py-4 text-right">PDF Payslip</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5 font-medium">
                      {selectedRunDetails.payslips?.map((p: any) => (
                        <tr key={p.id} className="hover:bg-white/[0.04] transition">
                          <td className="px-5 py-4">
                            <span className="font-bold text-white text-sm block">{p.employee_name}</span>
                            <span className="text-[11px] text-slate-400 font-mono">{p.employee_code}</span>
                          </td>
                          <td className="px-5 py-4 text-slate-300">
                            <div>Rs. {p.basic_salary?.toLocaleString()}</div>
                            <div className="text-[10px] text-slate-500">HRA 40% + Med 10%</div>
                          </td>
                          <td className="px-5 py-4 font-bold text-white">
                            Rs. {p.gross_salary?.toLocaleString()}
                          </td>
                          <td className="px-5 py-4">
                            <span className="text-emerald-400 font-bold">{p.present_days}P</span> /{' '}
                            <span className="text-rose-400 font-bold">{p.absent_days}A</span>
                            {p.late_penalty_days > 0 && (
                              <span className="text-[10px] text-amber-400 block font-semibold">+{p.late_penalty_days}d late pen.</span>
                            )}
                          </td>
                          <td className="px-5 py-4 font-semibold text-rose-400">
                            Rs. {p.deductions?.toLocaleString()}
                          </td>
                          <td className="px-5 py-4 font-semibold text-amber-400">
                            Rs. {p.income_tax?.toLocaleString()}
                          </td>
                          <td className="px-5 py-4 font-black text-emerald-400 text-sm">
                            Rs. {p.net_salary?.toLocaleString()}
                          </td>
                          <td className="px-5 py-4 text-right">
                            <button
                              type="button"
                              onClick={() =>
                                api
                                  .download(
                                    `/payroll/payslips/${p.id}/pdf`,
                                    `Payslip_${p.employee_code}_${selectedRunDetails.run.month}.pdf`
                                  )
                                  .catch(err => alert(err.message || 'PDF download failed'))
                              }
                              className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-xl bg-blue-500/15 hover:bg-blue-500/25 text-blue-300 font-bold border border-blue-500/30 transition shadow-sm"
                            >
                              <Download className="w-3.5 h-3.5" />
                              <span>PDF</span>
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

