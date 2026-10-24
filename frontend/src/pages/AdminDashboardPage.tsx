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
      <div className="flex items-center justify-center min-h-[60vh] text-slate-500">
        <RefreshCw className="w-6 h-6 animate-spin text-blue-600 mr-2" />
        <span>Loading Executive Company Analytics...</span>
      </div>
    );
  }

  const kpis = data?.kpis || {};

  return (
    <div className="space-y-6">
      {/* Title & AI Summarize Action */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black tracking-tight text-slate-900 dark:text-white">
            Executive Admin Dashboard
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Real-time workforce intelligence, payroll costs, and governance overview.
          </p>
        </div>

        <button
          onClick={handleSummarize}
          disabled={summarizing}
          className="inline-flex items-center space-x-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white font-semibold text-xs shadow-md transition disabled:opacity-50"
        >
          <Sparkles className="w-4 h-4" />
          <span>{summarizing ? 'Generating AI Summary...' : 'Summarize with AI'}</span>
        </button>
      </div>

      {/* AI Summary Card */}
      {aiSummary && (
        <div className="p-4 rounded-2xl bg-gradient-to-br from-indigo-50 to-blue-50 dark:from-slate-900 dark:to-indigo-950/40 border border-indigo-200 dark:border-indigo-800 shadow-sm animate-fade-in">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center space-x-2 text-indigo-700 dark:text-indigo-300 font-bold text-xs uppercase tracking-wider">
              <Sparkles className="w-4 h-4 text-indigo-600" />
              <span>AI Executive Summary</span>
            </div>
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-indigo-100 dark:bg-indigo-900/60 text-indigo-700 dark:text-indigo-300 font-mono">
              AI-generated
            </span>
          </div>
          <ul className="space-y-1.5 text-xs text-slate-700 dark:text-slate-300">
            {aiSummary.map((b, i) => (
              <li key={i} className="flex items-start space-x-2">
                <span className="text-indigo-600 font-bold mt-0.5">•</span>
                <span>{b}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Key Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Headcount */}
        <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-bold uppercase tracking-wider">Active Headcount</span>
            <div className="p-2 rounded-xl bg-blue-50 dark:bg-blue-900/30 text-blue-600">
              <Users className="w-5 h-5" />
            </div>
          </div>
          <div className="text-3xl font-black text-slate-900 dark:text-white">
            {kpis.headcount || 0}
          </div>
          <p className="text-[11px] text-slate-400 mt-1">Total active workforce registered</p>
        </div>

        {/* Attrition */}
        <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-bold uppercase tracking-wider">Attrition Rate (YTD)</span>
            <div className="p-2 rounded-xl bg-amber-50 dark:bg-amber-900/30 text-amber-600">
              <TrendingDown className="w-5 h-5" />
            </div>
          </div>
          <div className="text-3xl font-black text-slate-900 dark:text-white">
            {kpis.attritionRate || 0}%
          </div>
          <p className="text-[11px] text-slate-400 mt-1">Exits / Avg Headcount × 100</p>
        </div>

        {/* Monthly Payroll Cost */}
        <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-bold uppercase tracking-wider">Gross Payroll Cost</span>
            <div className="p-2 rounded-xl bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600">
              <DollarSign className="w-5 h-5" />
            </div>
          </div>
          <div className="text-2xl font-black text-slate-900 dark:text-white truncate">
            Rs. {Number(kpis.totalPayrollCost || 0).toLocaleString()}
          </div>
          <p className="text-[11px] text-slate-400 mt-1">Period: {kpis.lastPayrollMonth || 'Current'}</p>
        </div>

        {/* Average Salary */}
        <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-bold uppercase tracking-wider">Average Gross Salary</span>
            <div className="p-2 rounded-xl bg-purple-50 dark:bg-purple-900/30 text-purple-600">
              <Award className="w-5 h-5" />
            </div>
          </div>
          <div className="text-2xl font-black text-slate-900 dark:text-white truncate">
            Rs. {Number(kpis.avgSalary || 0).toLocaleString()}
          </div>
          <p className="text-[11px] text-slate-400 mt-1">Per employee / month</p>
        </div>
      </div>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Headcount by Department */}
        <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs">
          <h2 className="text-sm font-bold text-slate-900 dark:text-white mb-4">
            Headcount by Department
          </h2>
          <div className="h-64">
            {data.headcountByDepartment?.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={data.headcountByDepartment} margin={{ top: 10, right: 10, left: -20, bottom: 20 }}>
                  <CartesianGrid strokeDasharray="3 3" opacity={0.1} />
                  <XAxis dataKey="department" tick={{ fontSize: 11 }} />
                  <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
                  <Tooltip />
                  <Bar dataKey="count" fill="#3b82f6" radius={[6, 6, 0, 0]}>
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
        <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs">
          <h2 className="text-sm font-bold text-slate-900 dark:text-white mb-4">
            Gross Payroll Cost by Department (PKR)
          </h2>
          <div className="h-64">
            {data.payrollCostByDepartment?.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={data.payrollCostByDepartment} margin={{ top: 10, right: 10, left: 10, bottom: 20 }}>
                  <CartesianGrid strokeDasharray="3 3" opacity={0.1} />
                  <XAxis dataKey="department" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} tickFormatter={v => `${(v / 1000).toFixed(0)}k`} />
                  <Tooltip formatter={(v: any) => `Rs. ${Number(v).toLocaleString()}`} />
                  <Bar dataKey="total_cost" fill="#10b981" radius={[6, 6, 0, 0]} />
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
        <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs space-y-4">
          <h2 className="text-sm font-bold text-slate-900 dark:text-white">
            Workforce Demographics
          </h2>

          <div>
            <span className="text-xs font-semibold text-slate-500 block mb-2">Tenure Distribution:</span>
            <div className="space-y-2">
              {data.tenureDistribution?.map((t: any) => (
                <div key={t.label} className="flex items-center justify-between text-xs">
                  <span className="text-slate-600 dark:text-slate-400">{t.label}</span>
                  <span className="font-bold text-slate-900 dark:text-white">{t.count} employee(s)</span>
                </div>
              ))}
            </div>
          </div>

          <div className="pt-3 border-t border-slate-100 dark:border-slate-800">
            <span className="text-xs font-semibold text-slate-500 block mb-2">Gender Breakdown:</span>
            <div className="flex flex-wrap gap-2">
              {data.genderDistribution?.map((g: any) => (
                <span key={g.gender} className="px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 text-xs font-medium">
                  {g.gender}: <b>{g.count}</b>
                </span>
              ))}
            </div>
          </div>
        </div>

        {/* Recent Audit Feed */}
        <div className="lg:col-span-2 p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-bold text-slate-900 dark:text-white">
              Immutable Governance Audit Feed
            </h2>
            <span className="text-[11px] text-slate-400">Real-time System Audit</span>
          </div>

          <div className="space-y-2.5 max-h-72 overflow-y-auto">
            {data.auditFeed?.length > 0 ? (
              data.auditFeed.map((item: any) => (
                <div
                  key={item.id}
                  className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs"
                >
                  <div className="space-y-0.5">
                    <div className="flex items-center space-x-2">
                      <span className="px-1.5 py-0.5 rounded font-mono font-bold text-[10px] bg-slate-200 dark:bg-slate-700 text-slate-800 dark:text-slate-200">
                        {item.action}
                      </span>
                      <span className="font-semibold text-slate-900 dark:text-white">
                        {item.entity}
                      </span>
                      <span className="text-slate-400 text-[11px]">by {item.actor_email || 'System'}</span>
                    </div>
                  </div>
                  <span className="text-[10px] text-slate-400 whitespace-nowrap">
                    {new Date(item.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
              ))
            ) : (
              <p className="text-xs text-slate-400 text-center py-6">No audit actions recorded yet</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

