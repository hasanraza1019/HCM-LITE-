import React, { useState, useEffect } from 'react';
import {
  Users, DollarSign, TrendingDown, Award, Sparkles, Building2,
  PieChart as PieIcon, ShieldAlert, Clock, ArrowRight, RefreshCw
} from 'lucide-react';
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, Cell
} from 'recharts';
import { api } from '../services/api.js';

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899', '#06b6d4'];

export function AdminDashboardPage() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [summarizing, setSummarizing] = useState(false);
  const [aiSummary, setAiSummary] = useState<string[] | null>(null);

  const fetchData = async () => {
    try {
      setLoading(true);
      const res = await api.get('/analytics/admin');
      setData(res);
    } catch (err) {
      console.error('Failed to load admin analytics:', err);
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
        role: 'Admin'
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
        <div className="relative">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-600 animate-pulse flex items-center justify-center shadow-lg shadow-blue-500/25">
            <RefreshCw className="w-6 h-6 animate-spin text-white" />
          </div>
        </div>
        <span className="text-sm font-semibold text-slate-300">Loading Executive Analytics...</span>
      </div>
    );
  }

  const kpis = data?.kpis || {};

  return (
    <div className="space-y-7 pb-10">
      {/* Title & AI Summarize Action */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-6 rounded-3xl glass-panel relative overflow-hidden">
        <div className="absolute top-0 right-0 w-80 h-36 bg-blue-500/10 blur-3xl pointer-events-none" />
        <div className="relative z-10">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-bold bg-blue-500/15 text-blue-400 border border-blue-500/20 mb-2">
            <span className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-ping" />
            Executive Oversight Center
          </div>
          <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-slate-900 dark:text-white">
            Executive Admin Dashboard
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1 max-w-xl">
            Real-time workforce intelligence, organizational payroll metrics, and immutable governance audit log.
          </p>
        </div>

        <button
          onClick={handleSummarize}
          disabled={summarizing}
          className="relative z-10 inline-flex items-center space-x-2.5 px-5 py-3 rounded-2xl bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 text-white font-bold text-xs shadow-lg shadow-blue-500/25 transition-all transform hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 shrink-0"
        >
          <Sparkles className="w-4 h-4 animate-pulse text-amber-300" />
          <span>{summarizing ? 'Analyzing Company KPIs...' : 'Summarize with AI Copilot'}</span>
        </button>
      </div>

      {/* AI Summary Card */}
      {aiSummary && (
        <div className="p-6 rounded-3xl bg-gradient-to-br from-indigo-950/60 via-slate-900/90 to-blue-950/60 border border-indigo-500/30 shadow-2xl backdrop-blur-xl animate-fade-in relative overflow-hidden">
          <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />
          <div className="flex items-center justify-between mb-4 relative z-10">
            <div className="flex items-center space-x-2.5 text-indigo-400 font-bold text-xs uppercase tracking-wider">
              <div className="w-7 h-7 rounded-lg bg-indigo-500/20 flex items-center justify-center">
                <Sparkles className="w-4 h-4 text-indigo-300" />
              </div>
              <span className="text-white font-black text-sm">AI Executive Briefing</span>
            </div>
            <span className="text-[10px] px-3 py-1 rounded-full bg-indigo-500/20 text-indigo-300 font-mono border border-indigo-500/30 font-semibold">
              GPT-4 / Claude Analysis
            </span>
          </div>
          <ul className="space-y-2 text-xs sm:text-sm text-slate-200 relative z-10 leading-relaxed">
            {aiSummary.map((b, i) => (
              <li key={i} className="flex items-start space-x-3 p-2 rounded-xl hover:bg-white/5 transition">
                <span className="w-2 h-2 rounded-full bg-gradient-to-r from-blue-400 to-indigo-400 mt-2 shrink-0 shadow-sm shadow-blue-400" />
                <span className="flex-1 font-medium">{b}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Key Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        {/* Headcount */}
        <div className="p-6 rounded-3xl glass-card relative overflow-hidden group hover:border-blue-500/50 transition-all duration-300">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Active Headcount</span>
            <div className="w-11 h-11 rounded-2xl bg-blue-500/15 text-blue-400 flex items-center justify-center border border-blue-500/20 group-hover:scale-110 transition-transform">
              <Users className="w-5 h-5" />
            </div>
          </div>
          <div className="text-3xl sm:text-4xl font-black text-slate-900 dark:text-white tracking-tight">
            {kpis.headcount || 0}
          </div>
          <div className="flex items-center gap-1.5 text-xs text-blue-400 mt-2 font-medium">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span>Active registered personnel</span>
          </div>
        </div>

        {/* Attrition */}
        <div className="p-6 rounded-3xl glass-card relative overflow-hidden group hover:border-amber-500/50 transition-all duration-300">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Attrition Rate (YTD)</span>
            <div className="w-11 h-11 rounded-2xl bg-amber-500/15 text-amber-400 flex items-center justify-center border border-amber-500/20 group-hover:scale-110 transition-transform">
              <TrendingDown className="w-5 h-5" />
            </div>
          </div>
          <div className="text-3xl sm:text-4xl font-black text-slate-900 dark:text-white tracking-tight">
            {kpis.attritionRate || 0}%
          </div>
          <p className="text-xs text-slate-400 mt-2">
            Target benchmark: &lt; 8.0%
          </p>
        </div>

        {/* Monthly Payroll Cost */}
        <div className="p-6 rounded-3xl glass-card relative overflow-hidden group hover:border-emerald-500/50 transition-all duration-300">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Gross Payroll Cost</span>
            <div className="w-11 h-11 rounded-2xl bg-emerald-500/15 text-emerald-400 flex items-center justify-center border border-emerald-500/20 group-hover:scale-110 transition-transform">
              <DollarSign className="w-5 h-5" />
            </div>
          </div>
          <div className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white truncate tracking-tight">
            Rs. {Number(kpis.totalPayrollCost || 0).toLocaleString()}
          </div>
          <p className="text-xs text-slate-400 mt-2 font-medium">
            Month: <span className="text-emerald-400 font-semibold">{kpis.lastPayrollMonth || 'Current'}</span>
          </p>
        </div>

        {/* Average Salary */}
        <div className="p-6 rounded-3xl glass-card relative overflow-hidden group hover:border-purple-500/50 transition-all duration-300">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Avg Monthly Salary</span>
            <div className="w-11 h-11 rounded-2xl bg-purple-500/15 text-purple-400 flex items-center justify-center border border-purple-500/20 group-hover:scale-110 transition-transform">
              <Award className="w-5 h-5" />
            </div>
          </div>
          <div className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white truncate tracking-tight">
            Rs. {Number(kpis.avgSalary || 0).toLocaleString()}
          </div>
          <p className="text-xs text-slate-400 mt-2">Per employee / monthly base</p>
        </div>
      </div>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Headcount by Department */}
        <div className="p-6 rounded-3xl glass-card space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-blue-500" />
              Headcount by Department
            </h2>
            <span className="text-xs font-mono text-slate-400">Distribution</span>
          </div>
          <div className="h-68 pt-2">
            {data.headcountByDepartment?.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={data.headcountByDepartment} margin={{ top: 10, right: 10, left: -20, bottom: 20 }}>
                  <CartesianGrid strokeDasharray="3 3" opacity={0.08} />
                  <XAxis dataKey="department" tick={{ fontSize: 11, fill: '#94a3b8' }} stroke="#334155" />
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
                  <Bar dataKey="count" fill="#3b82f6" radius={[8, 8, 0, 0]}>
                    {data.headcountByDepartment.map((entry: any, index: number) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-xs text-slate-400">
                No departmental data registered yet
              </div>
            )}
          </div>
        </div>

        {/* Payroll Cost by Department */}
        <div className="p-6 rounded-3xl glass-card space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-500" />
              Gross Payroll Cost by Department (PKR)
            </h2>
            <span className="text-xs font-mono text-slate-400">Expense</span>
          </div>
          <div className="h-68 pt-2">
            {data.payrollCostByDepartment?.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={data.payrollCostByDepartment} margin={{ top: 10, right: 10, left: 10, bottom: 20 }}>
                  <CartesianGrid strokeDasharray="3 3" opacity={0.08} />
                  <XAxis dataKey="department" tick={{ fontSize: 11, fill: '#94a3b8' }} stroke="#334155" />
                  <YAxis tick={{ fontSize: 11, fill: '#94a3b8' }} tickFormatter={v => `${(v / 1000).toFixed(0)}k`} stroke="#334155" />
                  <Tooltip
                    formatter={(v: any) => `Rs. ${Number(v).toLocaleString()}`}
                    contentStyle={{
                      backgroundColor: 'rgba(15, 23, 42, 0.95)',
                      borderRadius: '16px',
                      border: '1px solid rgba(255,255,255,0.1)',
                      color: '#fff',
                      boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.5)'
                    }}
                  />
                  <Bar dataKey="total_cost" fill="#10b981" radius={[8, 8, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-xs text-slate-400">
                No payroll data calculated yet
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Demographics & Audit Feed */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Tenure & Gender */}
        <div className="p-6 rounded-3xl glass-card space-y-5">
          <h2 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-purple-500" />
            Workforce Demographics
          </h2>

          <div>
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400 block mb-3">Tenure Distribution</span>
            <div className="space-y-3">
              {data.tenureDistribution?.map((t: any) => (
                <div key={t.label} className="space-y-1">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-slate-300 font-medium">{t.label}</span>
                    <span className="font-bold text-white">{t.count} emp</span>
                  </div>
                  <div className="w-full bg-white/5 rounded-full h-1.5 overflow-hidden">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-blue-500 to-indigo-500"
                      style={{ width: `${Math.min(100, (t.count / (kpis.headcount || 1)) * 100)}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="pt-4 border-t border-white/10">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400 block mb-3">Gender Diversity</span>
            <div className="flex flex-wrap gap-2">
              {data.genderDistribution?.map((g: any) => (
                <span key={g.gender} className="px-3.5 py-1.5 rounded-xl bg-white/5 border border-white/10 text-xs font-semibold text-slate-200">
                  {g.gender}: <b className="text-blue-400 font-mono ml-1">{g.count}</b>
                </span>
              ))}
            </div>
          </div>
        </div>

        {/* Recent Audit Feed */}
        <div className="lg:col-span-2 p-6 rounded-3xl glass-card">
          <div className="flex items-center justify-between mb-5">
            <h2 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-rose-500 animate-ping" />
              Immutable Governance Audit Log
            </h2>
            <span className="text-xs font-mono text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2.5 py-1 rounded-full">
              Live Stream
            </span>
          </div>

          <div className="space-y-2.5 max-h-80 overflow-y-auto pr-1">
            {data.auditFeed?.length > 0 ? (
              data.auditFeed.map((item: any) => {
                const isCreate = item.action?.includes('CREATE');
                const isUpdate = item.action?.includes('UPDATE');
                const isDelete = item.action?.includes('DELETE');

                return (
                  <div
                    key={item.id}
                    className="p-3.5 rounded-2xl bg-white/[0.03] border border-white/5 hover:border-white/10 hover:bg-white/[0.06] transition flex items-center justify-between text-xs"
                  >
                    <div className="flex items-center space-x-3">
                      <span className={`px-2 py-0.5 rounded-lg font-mono font-bold text-[10px] uppercase border ${
                        isCreate
                          ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                          : isDelete
                          ? 'bg-rose-500/10 text-rose-400 border-rose-500/20'
                          : isUpdate
                          ? 'bg-blue-500/10 text-blue-400 border-blue-500/20'
                          : 'bg-purple-500/10 text-purple-400 border-purple-500/20'
                      }`}>
                        {item.action}
                      </span>
                      <div>
                        <span className="font-bold text-white mr-1.5">{item.entity}</span>
                        <span className="text-slate-400 text-[11px]">by {item.actor_email || 'System'}</span>
                      </div>
                    </div>
                    <span className="text-[10px] text-slate-400 font-mono">
                      {new Date(item.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                );
              })
            ) : (
              <p className="text-xs text-slate-400 text-center py-8">No audit actions recorded yet</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

