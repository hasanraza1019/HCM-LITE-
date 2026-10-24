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
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-black tracking-tight text-slate-900 dark:text-white">
          My Salary Payslips
        </h1>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
          Download certified salary slips with earnings, attendance deductions, and income tax breakdown.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {loading ? (
          <div className="col-span-full py-16 text-center text-slate-400">
            <RefreshCw className="w-5 h-5 animate-spin mx-auto mb-2 text-blue-500" />
            <span>Loading payslips...</span>
          </div>
        ) : payslips.length === 0 ? (
          <div className="col-span-full py-16 text-center text-slate-400 text-xs">
            No salary payslips generated yet. Once HR drafts and Admin finalizes monthly payroll, your payslips will appear here.
          </div>
        ) : (
          payslips.map(p => (
            <div
              key={p.id}
              className="p-5 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs space-y-4"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <Calendar className="w-4 h-4 text-blue-500" />
                  <span className="font-bold text-sm text-slate-900 dark:text-white">{p.month}</span>
                </div>
                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 uppercase">
                  {p.run_status}
                </span>
              </div>

              <div className="space-y-1 text-xs border-y border-slate-100 dark:border-slate-800 py-3">
                <div className="flex justify-between text-slate-600 dark:text-slate-400">
                  <span>Gross Salary:</span>
                  <span className="font-semibold text-slate-800 dark:text-slate-200">
                    Rs. {p.gross_salary?.toLocaleString()}
                  </span>
                </div>
                <div className="flex justify-between text-slate-600 dark:text-slate-400">
                  <span>Attendance Deductions:</span>
                  <span className="font-semibold text-rose-600">
                    - Rs. {p.deductions?.toLocaleString()}
                  </span>
                </div>
                <div className="flex justify-between text-slate-600 dark:text-slate-400">
                  <span>Income Tax:</span>
                  <span className="font-semibold text-amber-600">
                    - Rs. {p.income_tax?.toLocaleString()}
                  </span>
                </div>
                <div className="flex justify-between text-slate-900 dark:text-white pt-2 border-t border-slate-100 dark:border-slate-800 text-sm font-black">
                  <span>Net Take-Home:</span>
                  <span className="text-emerald-600">
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
                className="w-full py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs flex items-center justify-center space-x-2 shadow-xs transition"
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

