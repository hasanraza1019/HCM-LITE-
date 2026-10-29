import React, { useState, useEffect } from 'react';
import {
  Users, UserCheck, Clock, CalendarDays, AlertTriangle, Sparkles,
  TrendingUp, CheckCircle2, ChevronRight, RefreshCw, Flame
} from 'lucide-react';
import {
  ResponsiveContainer, LineChart, Line, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid
} from 'recharts';
import { api } from '../services/api.js';
import { Link } from 'react-router-dom';

export function HRDashboardPage() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [summarizing, setSummarizing] = useState(false);
  const [aiSummary, setAiSummary] = useState<string[] | null>(null);

  const fetchData = async () => {
    try {
      setLoading(true);
      const res = await api.get('/analytics/hr');
      setData(res);
    } catch (err) {
      console.error('Failed to load HR analytics:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleSummarize = async () => {
    if (!data?.kpis) return;
    try {
      setSummarizing(true);
      const res = await api.post('/ai/summary', {
        kpis: data.kpis,
        role: 'HR'
      });
      setAiSummary(res.summaryBullets || []);
    } catch (err) {
      console.error('Failed to summarize:', err);
    } finally {
      setSummarizing(false);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-slate-400 gap-3">
        <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-600 animate-pulse flex items-center justify-center shadow-lg shadow-blue-500/25">
          <RefreshCw className="w-6 h-6 animate-spin text-white" />
        </div>
        <span className="text-sm font-semibold text-slate-300">Loading People Operations...</span>
      </div>
    );
  }

  const kpis = data?.kpis || {};

  return (
    <div className="space-y-7 pb-10">
      {/* Title & AI Summarize */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-6 rounded-3xl glass-panel relative overflow-hidden">
        <div className="absolute top-0 right-0 w-80 h-36 bg-blue-500/10 blur-3xl pointer-events-none" />
        <div className="relative z-10">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-bold bg-blue-500/15 text-blue-400 border border-blue-500/20 mb-2">
            <span className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-ping" />
            Workforce Command Center
          </div>
          <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-slate-900 dark:text-white">
            HR People Operations Dashboard
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1 max-w-xl">
            Real-time attendance monitor, pending approvals inbox, leave utilization, and workforce anomaly flags.
          </p>
        </div>

        <button
          onClick={handleSummarize}
          disabled={summarizing}
          className="relative z-10 inline-flex items-center space-x-2.5 px-5 py-3 rounded-2xl bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 text-white font-bold text-xs shadow-lg shadow-blue-500/25 transition-all transform hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 shrink-0"
        >
          <Sparkles className="w-4 h-4 text-amber-300 animate-pulse" />
          <span>{summarizing ? 'Analyzing Daily Metrics...' : 'Summarize with AI Copilot'}</span>
        </button>
      </div>

      {/* AI Summary Banner */}
      {aiSummary && (
        <div className="p-6 rounded-3xl bg-gradient-to-br from-indigo-950/60 via-slate-900/90 to-blue-950/60 border border-blue-500/30 shadow-2xl backdrop-blur-xl animate-fade-in relative overflow-hidden">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center space-x-2.5 text-blue-400 font-bold text-xs uppercase tracking-wider">
              <div className="w-7 h-7 rounded-lg bg-blue-500/20 flex items-center justify-center">
                <Sparkles className="w-4 h-4 text-blue-300" />
              </div>
              <span className="text-white font-black text-sm">AI Operations Briefing</span>
            </div>
            <span className="text-[10px] px-3 py-1 rounded-full bg-blue-500/20 text-blue-300 font-mono border border-blue-500/30 font-semibold">
              Daily Digest
            </span>
          </div>
          <ul className="space-y-2 text-xs sm:text-sm text-slate-200 leading-relaxed">
            {aiSummary.map((b, i) => (
              <li key={i} className="flex items-start space-x-3 p-2 rounded-xl hover:bg-white/5 transition">
                <span className="w-2 h-2 rounded-full bg-blue-400 mt-2 shrink-0 shadow-sm shadow-blue-400" />
                <span className="flex-1 font-medium">{b}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Top 5 KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
        {/* Headcount */}
        <div className="p-5 rounded-3xl glass-card group hover:border-blue-500/50 transition-all">
          <div className="text-slate-400 text-xs font-bold uppercase tracking-wider mb-2 flex items-center justify-between">
            <span>Headcount</span>
            <Users className="w-4 h-4 text-slate-500 group-hover:text-blue-400 transition" />
          </div>
          <div className="text-3xl font-black text-slate-900 dark:text-white tracking-tight">{kpis.headcount || 0}</div>
          <span className="text-[11px] text-slate-400 mt-1 block">Active employees</span>
        </div>

        {/* Present Today */}
        <div className="p-5 rounded-3xl glass-card group hover:border-emerald-500/50 transition-all">
          <div className="text-emerald-400 text-xs font-bold uppercase tracking-wider mb-2 flex items-center justify-between">
            <span>Present Today</span>
            <UserCheck className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-3xl font-black text-emerald-600 dark:text-emerald-400 tracking-tight">{kpis.presentToday || 0}</div>
          <span className="text-[11px] text-slate-400 mt-1 block">On-time check-in</span>
        </div>

        {/* Late Today */}
        <div className="p-5 rounded-3xl glass-card group hover:border-amber-500/50 transition-all">
          <div className="text-amber-400 text-xs font-bold uppercase tracking-wider mb-2 flex items-center justify-between">
            <span>Late Today</span>
            <Clock className="w-4 h-4 text-amber-400" />
          </div>
          <div className="text-3xl font-black text-amber-600 dark:text-amber-400 tracking-tight">{kpis.lateToday || 0}</div>
          <span className="text-[11px] text-slate-400 mt-1 block">After grace threshold</span>
        </div>

        {/* On Leave Today */}
        <div className="p-5 rounded-3xl glass-card group hover:border-blue-500/50 transition-all">
          <div className="text-blue-400 text-xs font-bold uppercase tracking-wider mb-2 flex items-center justify-between">
            <span>On Leave</span>
            <CalendarDays className="w-4 h-4 text-blue-400" />
          </div>
          <div className="text-3xl font-black text-blue-600 dark:text-blue-400 tracking-tight">{kpis.onLeaveToday || 0}</div>
          <span className="text-[11px] text-slate-400 mt-1 block">Approved absences</span>
        </div>

        {/* Pending Approvals */}
        <div className="p-5 rounded-3xl glass-card group hover:border-purple-500/50 transition-all col-span-2 sm:col-span-1">
          <div className="text-purple-400 text-xs font-bold uppercase tracking-wider mb-2 flex items-center justify-between">
            <span>Pending Inbox</span>
            <AlertTriangle className="w-4 h-4 text-purple-400" />
          </div>
          <div className="text-3xl font-black text-purple-600 dark:text-purple-400 tracking-tight">{kpis.pendingApprovals || 0}</div>
          <Link to="/leave/inbox" className="text-[11px] text-purple-400 hover:text-purple-300 font-semibold flex items-center space-x-0.5 mt-1 transition">
            <span>Review inbox</span>
            <ChevronRight className="w-3 h-3" />
          </Link>
        </div>
      </div>

      {/* Attendance Trend Chart */}
      <div className="p-6 rounded-3xl glass-card space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-blue-500" />
            Workforce Attendance Dynamics (Last 7 Days)
          </h2>
          <span className="text-xs font-mono text-slate-400">7-Day Rolling Trend</span>
        </div>
        <div className="h-68 pt-2">
          {data.attendanceTrend?.length > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={data.attendanceTrend} margin={{ top: 10, right: 10, left: -20, bottom: 20 }}>
                <CartesianGrid strokeDasharray="3 3" opacity={0.08} />
                <XAxis dataKey="date" tick={{ fontSize: 11, fill: '#94a3b8' }} stroke="#334155" />
                <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: '#94a3b8' }} stroke="#334155" />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'rgba(15, 23, 42, 0.95)',
                    borderRadius: '16px',
                    border: '1px solid rgba(255,255,255,0.1)',
                    color: '#fff',
                    boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.5)'
                  }}
                />
                <Line type="monotone" dataKey="attended" stroke="#3b82f6" strokeWidth={3} name="Total Attended" dot={{ fill: '#3b82f6', r: 4 }} activeDot={{ r: 6 }} />
                <Line type="monotone" dataKey="late" stroke="#f59e0b" strokeWidth={2} name="Late Arrivals" strokeDasharray="4 4" dot={{ fill: '#f59e0b', r: 3 }} />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-full flex items-center justify-center text-xs text-slate-400">
              No daily records recorded yet
            </div>
          )}
        </div>
      </div>

      {/* Grid: Top 5 Late-Comers & Absence Anomaly Flags */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top 5 Late-Comers */}
        <div className="p-6 rounded-3xl glass-card space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-amber-500" />
              Punctuality Monitor: Top Late Arrivals
            </h2>
            <span className="text-[10px] px-2.5 py-1 rounded-full bg-amber-500/10 text-amber-300 font-bold border border-amber-500/20">
              3 Lates = 0.5 Day Cut
            </span>
          </div>

          <div className="space-y-2.5">
            {data.topLateComers?.length > 0 ? (
              data.topLateComers.map((item: any, idx: number) => (
                <div
                  key={item.id}
                  className="p-3.5 rounded-2xl bg-white/[0.03] border border-white/5 hover:border-white/10 hover:bg-white/[0.06] transition flex items-center justify-between text-xs"
                >
                  <div className="flex items-center space-x-3">
                    <span className={`w-6 h-6 rounded-xl flex items-center justify-center font-black text-xs ${
                      idx === 0 ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40' : 'bg-white/5 text-slate-400'
                    }`}>
                      {idx + 1}
                    </span>
                    <div>
                      <p className="font-bold text-white text-sm">{item.full_name}</p>
                      <p className="text-[11px] text-slate-400">{item.code} · {item.department || 'General'}</p>
                    </div>
                  </div>
                  <span className="px-3 py-1 rounded-xl bg-amber-500/15 text-amber-300 font-bold text-xs border border-amber-500/20">
                    {item.late_count} Late{item.late_count > 1 ? 's' : ''}
                  </span>
                </div>
              ))
            ) : (
              <p className="text-xs text-slate-400 text-center py-8">No late records this month</p>
            )}
          </div>
        </div>

        {/* Bonus: Absence Anomaly & Attrition Risk */}
        <div className="p-6 rounded-3xl glass-card space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Flame className="w-4 h-4 text-rose-500 animate-pulse" />
              <h2 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider">
                Absence Anomalies & Burnout Risk
              </h2>
            </div>
            <span className="text-[10px] uppercase font-bold text-rose-400 bg-rose-500/15 border border-rose-500/20 px-2.5 py-1 rounded-full">
              Automated AI Scan
            </span>
          </div>

          <div className="space-y-2.5">
            {data.anomalyFlags?.length > 0 ? (
              data.anomalyFlags.map((item: any) => (
                <div
                  key={item.id}
                  className="p-3.5 rounded-2xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-between text-xs"
                >
                  <div>
                    <div className="flex items-center space-x-2">
                      <span className="font-bold text-white text-sm">{item.full_name}</span>
                      <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-rose-500/20 text-rose-300 border border-rose-500/30">
                        {item.riskLevel} Risk
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-300 mt-1">{item.reason}</p>
                  </div>
                  <Link
                    to={`/employees`}
                    className="px-3 py-1 rounded-lg bg-white/5 hover:bg-white/10 text-xs text-blue-400 hover:text-blue-300 font-semibold border border-white/10 transition"
                  >
                    View 360
                  </Link>
                </div>
              ))
            ) : (
              <div className="p-8 text-center text-xs text-slate-400 space-y-2">
                <CheckCircle2 className="w-10 h-10 text-emerald-400 mx-auto opacity-80" />
                <p className="font-medium text-slate-300">All workforce attendance indicators healthy</p>
                <p className="text-[11px]">No critical absence anomalies or attrition risk alerts found.</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

