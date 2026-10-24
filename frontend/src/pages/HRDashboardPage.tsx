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
      <div className="flex items-center justify-center min-h-[60vh] text-slate-500">
        <RefreshCw className="w-6 h-6 animate-spin text-blue-600 mr-2" />
        <span>Loading People Operations Dashboard...</span>
      </div>
    );
  }

  const kpis = data?.kpis || {};

  return (
    <div className="space-y-6">
      {/* Title & AI Summarize */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black tracking-tight text-slate-900 dark:text-white">
            HR People Operations Dashboard
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Attendance monitoring, pending approvals, leave utilization, and workforce anomaly flags.
          </p>
        </div>

        <button
          onClick={handleSummarize}
          disabled={summarizing}
          className="inline-flex items-center space-x-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-semibold text-xs shadow-md transition disabled:opacity-50"
        >
          <Sparkles className="w-4 h-4" />
          <span>{summarizing ? 'Analyzing Daily Numbers...' : 'Summarize with AI'}</span>
        </button>
      </div>

      {/* AI Summary Banner */}
      {aiSummary && (
        <div className="p-4 rounded-2xl bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-slate-900 dark:to-blue-950/40 border border-blue-200 dark:border-blue-800 shadow-sm animate-fade-in">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center space-x-2 text-blue-700 dark:text-blue-300 font-bold text-xs uppercase tracking-wider">
              <Sparkles className="w-4 h-4 text-blue-600" />
              <span>AI Operations Summary</span>
            </div>
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-blue-100 dark:bg-blue-900/60 text-blue-700 dark:text-blue-300 font-mono">
              AI-generated
            </span>
          </div>
          <ul className="space-y-1.5 text-xs text-slate-700 dark:text-slate-300">
            {aiSummary.map((b, i) => (
              <li key={i} className="flex items-start space-x-2">
                <span className="text-blue-600 font-bold mt-0.5">•</span>
                <span>{b}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Top 5 KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 sm:gap-4">
        {/* Headcount */}
        <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs">
          <div className="text-slate-400 text-xs font-bold uppercase mb-1">Headcount</div>
          <div className="text-2xl font-black text-slate-900 dark:text-white">{kpis.headcount || 0}</div>
          <span className="text-[10px] text-slate-400">Active employees</span>
        </div>

        {/* Present Today */}
        <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs">
          <div className="text-emerald-500 text-xs font-bold uppercase mb-1">Present Today</div>
          <div className="text-2xl font-black text-emerald-600 dark:text-emerald-400">{kpis.presentToday || 0}</div>
          <span className="text-[10px] text-slate-400">On time check-in</span>
        </div>

        {/* Late Today */}
        <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs">
          <div className="text-amber-500 text-xs font-bold uppercase mb-1">Late Today</div>
          <div className="text-2xl font-black text-amber-600 dark:text-amber-400">{kpis.lateToday || 0}</div>
          <span className="text-[10px] text-slate-400">After 09:15 AM</span>
        </div>

        {/* On Leave Today */}
        <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs">
          <div className="text-blue-500 text-xs font-bold uppercase mb-1">On Leave Today</div>
          <div className="text-2xl font-black text-blue-600 dark:text-blue-400">{kpis.onLeaveToday || 0}</div>
          <span className="text-[10px] text-slate-400">Approved leaves</span>
        </div>

        {/* Pending Approvals */}
        <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs col-span-2 sm:col-span-1">
          <div className="text-purple-500 text-xs font-bold uppercase mb-1">Pending Approvals</div>
          <div className="text-2xl font-black text-purple-600 dark:text-purple-400">{kpis.pendingApprovals || 0}</div>
          <Link to="/leave/inbox" className="text-[10px] text-purple-600 dark:text-purple-400 hover:underline flex items-center space-x-0.5 mt-0.5">
            <span>Review inbox</span>
            <ChevronRight className="w-3 h-3" />
          </Link>
        </div>
      </div>

      {/* Attendance Trend Chart */}
      <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs">
        <h2 className="text-sm font-bold text-slate-900 dark:text-white mb-4">
          Attendance Trend (Last 7 Days)
        </h2>
        <div className="h-64">
          {data.attendanceTrend?.length > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={data.attendanceTrend} margin={{ top: 10, right: 10, left: -20, bottom: 20 }}>
                <CartesianGrid strokeDasharray="3 3" opacity={0.1} />
                <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
                <Tooltip />
                <Line type="monotone" dataKey="attended" stroke="#3b82f6" strokeWidth={3} name="Total Attended" />
                <Line type="monotone" dataKey="late" stroke="#f59e0b" strokeWidth={2} name="Late Arrivals" strokeDasharray="4 4" />
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
        <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-bold text-slate-900 dark:text-white">
              Top Late-Comers This Month
            </h2>
            <span className="text-[10px] px-2 py-0.5 rounded bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-300 font-bold">
              3 Lates = 0.5 Day Penalty
            </span>
          </div>

          <div className="space-y-2.5">
            {data.topLateComers?.length > 0 ? (
              data.topLateComers.map((item: any, idx: number) => (
                <div
                  key={item.id}
                  className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs"
                >
                  <div className="flex items-center space-x-3">
                    <span className="w-5 h-5 rounded-full bg-slate-200 dark:bg-slate-700 flex items-center justify-center font-bold text-[10px]">
                      {idx + 1}
                    </span>
                    <div>
                      <p className="font-bold text-slate-900 dark:text-white">{item.full_name}</p>
                      <p className="text-[11px] text-slate-400">{item.code} · {item.department || 'General'}</p>
                    </div>
                  </div>
                  <span className="px-2.5 py-1 rounded-lg bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-300 font-bold text-xs">
                    {item.late_count} Late{item.late_count > 1 ? 's' : ''}
                  </span>
                </div>
              ))
            ) : (
              <p className="text-xs text-slate-400 text-center py-6">No late records this month</p>
            )}
          </div>
        </div>

        {/* Bonus: Absence Anomaly & Attrition Risk */}
        <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center space-x-2">
              <Flame className="w-4 h-4 text-rose-500" />
              <h2 className="text-sm font-bold text-slate-900 dark:text-white">
                Attrition Risk & Absence Anomalies
              </h2>
            </div>
            <span className="text-[10px] uppercase font-bold text-rose-500 bg-rose-50 dark:bg-rose-950/40 px-2 py-0.5 rounded">
              Automated Detection
            </span>
          </div>

          <div className="space-y-2.5">
            {data.anomalyFlags?.length > 0 ? (
              data.anomalyFlags.map((item: any) => (
                <div
                  key={item.id}
                  className="p-3 rounded-xl bg-rose-50/50 dark:bg-rose-950/20 border border-rose-200/60 dark:border-rose-900/40 flex items-center justify-between text-xs"
                >
                  <div>
                    <div className="flex items-center space-x-2">
                      <span className="font-bold text-slate-900 dark:text-white">{item.full_name}</span>
                      <span className="px-1.5 py-0.2 rounded text-[10px] font-bold bg-rose-100 text-rose-700 dark:bg-rose-900 dark:text-rose-300">
                        {item.riskLevel} Risk
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">{item.reason}</p>
                  </div>
                  <Link
                    to={`/employees`}
                    className="text-xs text-blue-600 hover:underline font-semibold"
                  >
                    View 360
                  </Link>
                </div>
              ))
            ) : (
              <div className="p-6 text-center text-xs text-slate-400">
                <CheckCircle2 className="w-8 h-8 text-emerald-500 mx-auto mb-2 opacity-80" />
                <p>No high-risk attendance anomalies or attrition alerts flagged.</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

