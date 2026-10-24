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
    <div className="space-y-6">
      {/* Title */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black tracking-tight text-slate-900 dark:text-white">
            Payroll & Compensation
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Automated salary calculations, attendance deductions, tax slabs, and locked finalization.
          </p>
        </div>

        {/* Create Draft Form */}
        {(isAdmin || isHR) && (
          <form onSubmit={handleCreateDraft} className="flex items-center space-x-2">
            <input
              type="month"
              value={targetMonth}
              onChange={e => setTargetMonth(e.target.value)}
              className="px-3 py-1.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-semibold"
            />
            <button
              type="submit"
              disabled={drafting}
              className="px-4 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-md transition disabled:opacity-50 flex items-center space-x-1"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>{drafting ? 'Calculating...' : 'Run Monthly Draft'}</span>
            </button>
          </form>
        )}
      </div>

      {errorMsg && (
        <div className="p-4 rounded-2xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-300 text-xs flex items-center space-x-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* Runs Navigator & Run Details */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Runs List Sidebar */}
        <div className="p-4 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs space-y-2">
          <span className="text-xs font-bold uppercase text-slate-400 block px-2 mb-2">
            Payroll History ({runs.length})
          </span>

          {loading ? (
            <p className="text-xs text-slate-400 text-center py-6">Loading runs...</p>
          ) : runs.length === 0 ? (
            <p className="text-xs text-slate-400 text-center py-6">No payroll runs drafted yet.</p>
          ) : (
            runs.map(r => (
              <button
                key={r.id}
                onClick={() => loadRunDetails(r.id)}
                className={`w-full text-left p-3 rounded-2xl text-xs transition flex items-center justify-between ${
                  selectedRunId === r.id
                    ? 'bg-blue-600 text-white shadow-md'
                    : 'bg-slate-50 dark:bg-slate-800/50 text-slate-700 dark:text-slate-300 hover:bg-slate-100'
                }`}
              >
                <div>
                  <span className="font-bold text-sm block">{r.month}</span>
                  <span className={`text-[10px] font-medium ${selectedRunId === r.id ? 'text-blue-100' : 'text-slate-400'}`}>
                    Net: Rs. {Number(r.total_net).toLocaleString()}
                  </span>
                </div>
                <span
                  className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                    r.status === 'finalized'
                      ? selectedRunId === r.id ? 'bg-white text-emerald-700' : 'bg-emerald-100 text-emerald-700'
                      : selectedRunId === r.id ? 'bg-white/20 text-white' : 'bg-amber-100 text-amber-700'
                  }`}
                >
                  {r.status}
                </span>
              </button>
            ))
          )}
        </div>

        {/* Selected Run Overview & Payslips Table */}
        <div className="lg:col-span-3 space-y-6">
          {selectedRunDetails && (
            <>
              {/* Run Metrics Banner */}
              <div className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100 dark:border-slate-800">
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 rounded-2xl bg-blue-100 dark:bg-blue-900/40 text-blue-600 flex items-center justify-center font-bold">
                      <FileSpreadsheet className="w-5 h-5" />
                    </div>
                    <div>
                      <h2 className="text-lg font-black text-slate-900 dark:text-white">
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
                      <span className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-xl bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300 text-xs font-bold">
                        <Lock className="w-3.5 h-3.5" />
                        <span>Locked & Finalized</span>
                      </span>
                    ) : isAdmin ? (
                      <button
                        onClick={() => handleFinalize(selectedRunDetails.run.id)}
                        className="inline-flex items-center space-x-1.5 px-4 py-2 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white font-bold text-xs shadow-md transition"
                      >
                        <Lock className="w-3.5 h-3.5" />
                        <span>Finalize & Lock Payroll</span>
                      </button>
                    ) : (
                      <span className="text-xs text-slate-400 italic">
                        Draft Mode · Only Admin can finalize
                      </span>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pt-4 text-xs">
                  <div>
                    <span className="text-slate-400 block text-[11px]">Total Gross Payroll:</span>
                    <span className="text-base font-black text-slate-900 dark:text-white">
                      Rs. {Number(selectedRunDetails.run.total_gross).toLocaleString()}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[11px]">Attendance Deductions:</span>
                    <span className="text-base font-black text-rose-600">
                      Rs. {Number(selectedRunDetails.run.total_deductions).toLocaleString()}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[11px]">Income Tax Deducted:</span>
                    <span className="text-base font-black text-amber-600">
                      Rs. {Number(selectedRunDetails.run.total_tax).toLocaleString()}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[11px]">Net Payout:</span>
                    <span className="text-base font-black text-emerald-600">
                      Rs. {Number(selectedRunDetails.run.total_net).toLocaleString()}
                    </span>
                  </div>
                </div>
              </div>

              {/* Line Items Table */}
              <div className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-50 dark:bg-slate-800/60 text-slate-500 uppercase font-bold text-[10px] tracking-wider border-b border-slate-200 dark:border-slate-800">
                      <tr>
                        <th className="px-4 py-3">Employee</th>
                        <th className="px-4 py-3">Basic + Allowances</th>
                        <th className="px-4 py-3">Gross Salary</th>
                        <th className="px-4 py-3">Days (Pres / Abs)</th>
                        <th className="px-4 py-3">Deductions</th>
                        <th className="px-4 py-3">Income Tax</th>
                        <th className="px-4 py-3">Net Take-Home</th>
                        <th className="px-4 py-3 text-right">PDF Payslip</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 font-medium">
                      {selectedRunDetails.payslips?.map((p: any) => (
                        <tr key={p.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition">
                          <td className="px-4 py-3">
                            <span className="font-bold text-slate-900 dark:text-white block">{p.employee_name}</span>
                            <span className="text-[10px] text-slate-400 font-mono">{p.employee_code}</span>
                          </td>
                          <td className="px-4 py-3 text-slate-600 dark:text-slate-400">
                            <div>Rs. {p.basic_salary?.toLocaleString()}</div>
                            <div className="text-[10px] text-slate-400">HRA 40% + Med 10%</div>
                          </td>
                          <td className="px-4 py-3 font-bold text-slate-800 dark:text-slate-200">
                            Rs. {p.gross_salary?.toLocaleString()}
                          </td>
                          <td className="px-4 py-3">
                            <span className="text-emerald-600 font-bold">{p.present_days}P</span> /{' '}
                            <span className="text-rose-600 font-bold">{p.absent_days}A</span>
                            {p.late_penalty_days > 0 && (
                              <span className="text-[10px] text-amber-600 block">+{p.late_penalty_days}d late pen.</span>
                            )}
                          </td>
                          <td className="px-4 py-3 font-semibold text-rose-600">
                            Rs. {p.deductions?.toLocaleString()}
                          </td>
                          <td className="px-4 py-3 font-semibold text-amber-600">
                            Rs. {p.income_tax?.toLocaleString()}
                          </td>
                          <td className="px-4 py-3 font-black text-emerald-600">
                            Rs. {p.net_salary?.toLocaleString()}
                          </td>
                          <td className="px-4 py-3 text-right">
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
                              className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-lg bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-300 font-bold hover:bg-blue-100 transition"
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

