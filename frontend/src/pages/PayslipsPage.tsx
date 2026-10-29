import React, { useState, useEffect } from 'react';
import { FileSpreadsheet, Download, RefreshCw, Calendar, CheckCircle2 } from 'lucide-react';
import { api } from '../services/api.js';
import { useAuth } from '../context/AuthContext.js';

export function PayslipsPage() {
  const { user } = useAuth();
  const [payslips, setPayslips] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchPayslips = async () => {
    if (!user?.employeeId) return;
    try {
      setLoading(true);
      const res = await api.get(`/employees/${user.employeeId}`);
      setPayslips(res.recent_payslips || []);
    } catch (err) {
      console.error('Failed to load payslips:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPayslips();
  }, [user]);

  return (
    <div className="space-y-7 pb-10">
      {/* Title */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-6 rounded-3xl glass-panel relative overflow-hidden">
        <div className="absolute top-0 right-0 w-80 h-36 bg-blue-500/10 blur-3xl pointer-events-none" />
        <div className="relative z-10">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-bold bg-blue-500/15 text-blue-400 border border-blue-500/20 mb-2">
            <span className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-ping" />
            Verified Financial Documentation
          </div>
          <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-slate-900 dark:text-white">
            My Salary Payslips
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1 max-w-xl">
            Download certified salary slips with earnings, attendance deductions, and income tax breakdown.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {loading ? (
          <div className="col-span-full py-16 text-center text-slate-400">
            <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-blue-500" />
            <span>Loading payslips...</span>
          </div>
        ) : payslips.length === 0 ? (
          <div className="col-span-full py-16 text-center text-slate-400 text-xs glass-card rounded-3xl p-8">
            No salary payslips generated yet. Once HR drafts and Admin finalizes monthly payroll, your payslips will appear here.
          </div>
        ) : (
          payslips.map(p => (
            <div
              key={p.id}
              className="p-6 rounded-3xl glass-card space-y-4 hover:border-blue-500/50 transition-all duration-300"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2.5">
                  <div className="w-8 h-8 rounded-xl bg-blue-500/15 text-blue-400 border border-blue-500/30 flex items-center justify-center">
                    <Calendar className="w-4 h-4" />
                  </div>
                  <span className="font-black text-base text-white">{p.month}</span>
                </div>
                <span className="px-3 py-1 rounded-full text-[10px] font-bold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 uppercase tracking-wider">
                  {p.run_status}
                </span>
              </div>

              <div className="space-y-1.5 text-xs border-y border-white/10 py-3.5">
                <div className="flex justify-between text-slate-300">
                  <span>Gross Salary:</span>
                  <span className="font-semibold text-white">
                    Rs. {p.gross_salary?.toLocaleString()}
                  </span>
                </div>
                <div className="flex justify-between text-slate-300">
                  <span>Attendance Deductions:</span>
                  <span className="font-semibold text-rose-400">
                    - Rs. {p.deductions?.toLocaleString()}
                  </span>
                </div>
                <div className="flex justify-between text-slate-300">
                  <span>Income Tax:</span>
                  <span className="font-semibold text-amber-400">
                    - Rs. {p.income_tax?.toLocaleString()}
                  </span>
                </div>
                <div className="flex justify-between text-white pt-2.5 border-t border-white/10 text-sm font-black">
                  <span>Net Take-Home:</span>
                  <span className="text-emerald-400 text-base">
                    Rs. {p.net_salary?.toLocaleString()}
                  </span>
                </div>
              </div>

              <button
                type="button"
                onClick={() =>
                  api
                    .download(`/payroll/payslips/${p.id}/pdf`, `Payslip_${p.month}.pdf`)
                    .catch(err => alert(err.message || 'PDF download failed'))
                }
                className="w-full py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs flex items-center justify-center space-x-2 shadow-lg shadow-blue-500/25 transition"
              >
                <Download className="w-4 h-4" />
                <span>Download Official PDF</span>
              </button>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

