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
    <div className="space-y-7 pb-10">
      {/* Title */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-6 rounded-3xl glass-panel relative overflow-hidden">
        <div className="absolute top-0 right-0 w-80 h-36 bg-blue-500/10 blur-3xl pointer-events-none" />
        <div className="relative z-10">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-bold bg-blue-500/15 text-blue-400 border border-blue-500/20 mb-2">
            <span className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-ping" />
            Live Time & Attendance Ledger
          </div>
          <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-slate-900 dark:text-white">
            Daily Attendance Board
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1 max-w-xl">
            Live shift tracking, punctuality status, worked hours calculation, and facial/GPS verification telemetry.
          </p>
        </div>

        {/* Date & Dept Picker */}
        <div className="relative z-10 flex flex-wrap items-center gap-2.5">
          <input
            type="date"
            value={date}
            onChange={e => setDate(e.target.value)}
            className="px-4 py-2.5 rounded-2xl border border-white/10 bg-slate-900 text-slate-200 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500/50 shadow-sm"
          />

          <select
            value={selectedDept}
            onChange={e => setSelectedDept(e.target.value)}
            className="px-4 py-2.5 rounded-2xl border border-white/10 bg-slate-900 text-slate-200 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500/50 shadow-sm"
          >
            <option value="">All Departments</option>
            {departments.map(d => (
              <option key={d.id} value={d.id}>{d.name}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Summary KPI Strip */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3.5">
        <div className="p-4 rounded-3xl glass-card">
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Total Staff</span>
          <div className="text-2xl font-black text-slate-900 dark:text-white mt-1">{summary.totalEmployees || 0}</div>
        </div>

        <div className="p-4 rounded-3xl glass-card border-emerald-500/20">
          <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-400">Present (On-Time)</span>
          <div className="text-2xl font-black text-emerald-500 mt-1">{summary.present || 0}</div>
        </div>

        <div className="p-4 rounded-3xl glass-card border-amber-500/20">
          <span className="text-[10px] font-bold uppercase tracking-wider text-amber-400">Late Arrivals</span>
          <div className="text-2xl font-black text-amber-500 mt-1">{summary.late || 0}</div>
        </div>

        <div className="p-4 rounded-3xl glass-card border-indigo-500/20">
          <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-400">Half-Day (&lt;5h)</span>
          <div className="text-2xl font-black text-indigo-400 mt-1">{summary.halfDay || 0}</div>
        </div>

        <div className="p-4 rounded-3xl glass-card border-blue-500/20">
          <span className="text-[10px] font-bold uppercase tracking-wider text-blue-400">On Leave</span>
          <div className="text-2xl font-black text-blue-400 mt-1">{summary.onLeave || 0}</div>
        </div>

        <div className="p-4 rounded-3xl glass-card border-rose-500/20">
          <span className="text-[10px] font-bold uppercase tracking-wider text-rose-400">Absent</span>
          <div className="text-2xl font-black text-rose-500 mt-1">{summary.absent || 0}</div>
        </div>
      </div>

      {/* Board Table */}
      <div className="rounded-3xl glass-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-white/[0.02] text-slate-400 uppercase font-bold text-[10px] tracking-wider border-b border-white/10">
              <tr>
                <th className="px-5 py-4">Employee</th>
                <th className="px-5 py-4">Department</th>
                <th className="px-5 py-4">Check-In</th>
                <th className="px-5 py-4">Check-Out</th>
                <th className="px-5 py-4">Worked Hours</th>
                <th className="px-5 py-4">Status</th>
                <th className="px-5 py-4">Source & Verification</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5 font-medium">
              {loading ? (
                <tr>
                  <td colSpan={7} className="text-center py-12 text-slate-400">
                    <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-blue-500" />
                    <span>Loading attendance records for {date}...</span>
                  </td>
                </tr>
              ) : data?.board?.length === 0 ? (
                <tr>
                  <td colSpan={7} className="text-center py-12 text-slate-400">
                    No active employees registered.
                  </td>
                </tr>
              ) : (
                data?.board?.map((item: any) => (
                  <tr key={item.employee_id} className="hover:bg-white/[0.04] transition">
                    <td className="px-5 py-4">
                      <div>
                        <span className="font-bold text-white text-sm block">{item.full_name}</span>
                        <span className="text-[11px] text-slate-400 font-mono">{item.code}</span>
                      </div>
                    </td>
                    <td className="px-5 py-4 text-slate-300">
                      {item.department || 'General'}
                    </td>
                    <td className="px-5 py-4 font-mono font-semibold text-slate-200">
                      {item.check_in || '—'}
                    </td>
                    <td className="px-5 py-4 font-mono font-semibold text-slate-200">
                      {item.check_out || (item.check_in ? <span className="text-blue-400 animate-pulse">In Progress</span> : '—')}
                    </td>
                    <td className="px-5 py-4 font-semibold text-slate-200">
                      {item.work_hours > 0 ? `${item.work_hours} hrs` : '—'}
                    </td>
                    <td className="px-5 py-4">
                      <span
                        className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider border ${
                          item.status === 'present'
                            ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30'
                            : item.status === 'late'
                            ? 'bg-amber-500/15 text-amber-400 border-amber-500/30'
                            : item.status === 'half_day'
                            ? 'bg-indigo-500/15 text-indigo-400 border-indigo-500/30'
                            : item.status === 'on_leave'
                            ? 'bg-blue-500/15 text-blue-400 border-blue-500/30'
                            : item.status === 'missing_checkout'
                            ? 'bg-orange-500/15 text-orange-400 border-orange-500/30'
                            : 'bg-rose-500/15 text-rose-400 border-rose-500/30'
                        }`}
                      >
                        {item.status?.replace('_', ' ')}
                      </span>
                    </td>
                    <td className="px-5 py-4">
                      {item.source === 'camera' ? (
                        <span className="inline-flex items-center space-x-1.5 px-2.5 py-1 rounded-lg bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 text-[10px] font-bold">
                          <Camera className="w-3.5 h-3.5" />
                          <span>Camera (Face + GPS)</span>
                        </span>
                      ) : item.source === 'web' ? (
                        <span className="text-[11px] text-slate-400">Web Portal</span>
                      ) : item.source === 'correction' ? (
                        <span className="text-[11px] text-indigo-400 font-semibold">HR Correction</span>
                      ) : (
                        <span className="text-[11px] text-slate-500">—</span>
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
