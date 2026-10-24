import React, { useState, useEffect } from 'react';
import {
  Clock, Calendar, Users, Camera, CheckCircle2, AlertTriangle,
  RefreshCw, Filter, ShieldCheck, MapPin
} from 'lucide-react';
import { api } from '../services/api.js';

export function AttendanceBoardPage() {
  const [date, setDate] = useState(new Date().toISOString().substring(0, 10));
  const [selectedDept, setSelectedDept] = useState('');
  const [departments, setDepartments] = useState<any[]>([]);
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const fetchDepts = async () => {
    try {
      const res = await api.get('/org/departments');
      setDepartments(res.departments || []);
    } catch (err) {
      // ignore
    }
  };

  const fetchBoard = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        date,
        ...(selectedDept && { department_id: selectedDept })
      });
      const res = await api.get(`/attendance/board?${params.toString()}`);
      setData(res);
    } catch (err) {
      console.error('Failed to load board:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDepts();
  }, []);

  useEffect(() => {
    fetchBoard();
  }, [date, selectedDept]);

  const summary = data?.summary || {};

  return (
    <div className="space-y-6">
      {/* Title */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black tracking-tight text-slate-900 dark:text-white">
            Daily Attendance Board
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Monitor punctuality, working hours, camera GPS stamps, and absenteeism.
          </p>
        </div>

        {/* Date & Dept Picker */}
        <div className="flex flex-wrap items-center gap-2">
          <input
            type="date"
            value={date}
            onChange={e => setDate(e.target.value)}
            className="px-3 py-1.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-semibold"
          />

          <select
            value={selectedDept}
            onChange={e => setSelectedDept(e.target.value)}
            className="px-3 py-1.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-semibold"
          >
            <option value="">All Departments</option>
            {departments.map(d => (
              <option key={d.id} value={d.id}>{d.name}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Summary KPI Strip */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <div className="p-3.5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs">
          <span className="text-[10px] font-bold uppercase text-slate-400">Total Staff</span>
          <div className="text-xl font-black text-slate-900 dark:text-white mt-0.5">{summary.totalEmployees || 0}</div>
        </div>

        <div className="p-3.5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs">
          <span className="text-[10px] font-bold uppercase text-emerald-500">Present (On-Time)</span>
          <div className="text-xl font-black text-emerald-600 dark:text-emerald-400 mt-0.5">{summary.present || 0}</div>
        </div>

        <div className="p-3.5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs">
          <span className="text-[10px] font-bold uppercase text-amber-500">Late (&gt; 09:15)</span>
          <div className="text-xl font-black text-amber-600 dark:text-amber-400 mt-0.5">{summary.late || 0}</div>
        </div>

        <div className="p-3.5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs">
          <span className="text-[10px] font-bold uppercase text-indigo-500">Half-Day (&lt;5h)</span>
          <div className="text-xl font-black text-indigo-600 dark:text-indigo-400 mt-0.5">{summary.halfDay || 0}</div>
        </div>

        <div className="p-3.5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs">
          <span className="text-[10px] font-bold uppercase text-blue-500">On Approved Leave</span>
          <div className="text-xl font-black text-blue-600 dark:text-blue-400 mt-0.5">{summary.onLeave || 0}</div>
        </div>

        <div className="p-3.5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs">
          <span className="text-[10px] font-bold uppercase text-rose-500">Absent</span>
          <div className="text-xl font-black text-rose-600 dark:text-rose-400 mt-0.5">{summary.absent || 0}</div>
        </div>
      </div>

      {/* Board Table */}
      <div className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 dark:bg-slate-800/60 text-slate-500 uppercase font-bold text-[10px] tracking-wider border-b border-slate-200 dark:border-slate-800">
              <tr>
                <th className="px-4 py-3">Employee</th>
                <th className="px-4 py-3">Department</th>
                <th className="px-4 py-3">Check-In</th>
                <th className="px-4 py-3">Check-Out</th>
                <th className="px-4 py-3">Worked Hours</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Source & Verification</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 font-medium">
              {loading ? (
                <tr>
                  <td colSpan={7} className="text-center py-10 text-slate-400">
                    <RefreshCw className="w-5 h-5 animate-spin mx-auto mb-2 text-blue-500" />
                    <span>Loading attendance records for {date}...</span>
                  </td>
                </tr>
              ) : data?.board?.length === 0 ? (
                <tr>
                  <td colSpan={7} className="text-center py-10 text-slate-400">
                    No active employees registered.
                  </td>
                </tr>
              ) : (
                data?.board?.map((item: any) => (
                  <tr key={item.employee_id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition">
                    <td className="px-4 py-3">
                      <div>
                        <span className="font-bold text-slate-900 dark:text-white block">{item.full_name}</span>
                        <span className="text-[10px] text-slate-400 font-mono">{item.code}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-slate-600 dark:text-slate-300">
                      {item.department || 'General'}
                    </td>
                    <td className="px-4 py-3 font-mono font-semibold">
                      {item.check_in || '—'}
                    </td>
                    <td className="px-4 py-3 font-mono font-semibold">
                      {item.check_out || (item.check_in ? 'In Progress' : '—')}
                    </td>
                    <td className="px-4 py-3 font-semibold">
                      {item.work_hours > 0 ? `${item.work_hours} hrs` : '—'}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                          item.status === 'present'
                            ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40'
                            : item.status === 'late'
                            ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/40'
                            : item.status === 'half_day'
                            ? 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/40'
                            : item.status === 'on_leave'
                            ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/40'
                            : item.status === 'missing_checkout'
                            ? 'bg-orange-100 text-orange-700 dark:bg-orange-900/40'
                            : 'bg-rose-100 text-rose-700 dark:bg-rose-900/40'
                        }`}
                      >
                        {item.status?.replace('_', ' ')}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      {item.source === 'camera' ? (
                        <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300 text-[10px] font-bold">
                          <Camera className="w-3 h-3" />
                          <span>Camera (Face+GPS)</span>
                        </span>
                      ) : item.source === 'web' ? (
                        <span className="text-[11px] text-slate-500">Web Portal</span>
                      ) : item.source === 'correction' ? (
                        <span className="text-[11px] text-indigo-500 font-semibold">HR Correction</span>
                      ) : (
                        <span className="text-[11px] text-slate-400">—</span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
