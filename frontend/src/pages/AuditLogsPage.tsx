import React, { useState, useEffect } from 'react';
import { ClipboardList, ShieldAlert, RefreshCw, Eye, X, Filter, ShieldCheck, Database } from 'lucide-react';
import { api } from '../services/api.js';

export function AuditLogsPage() {
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [selectedLog, setSelectedLog] = useState<any>(null);

  const fetchLogs = async () => {
    try {
      setLoading(true);
      const res = await api.get(`/comms/audit-logs?page=${page}&limit=20`);
      setLogs(res.logs || []);
      setTotalPages(res.pagination?.totalPages || 1);
    } catch (err) {
      console.error('Failed to load audit logs:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, [page]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-6 rounded-3xl glass-panel relative overflow-hidden border border-slate-200/80 dark:border-slate-800/80">
        <div className="absolute top-0 right-0 w-80 h-32 bg-purple-500/10 dark:bg-purple-500/5 blur-3xl pointer-events-none" />
        <div className="relative z-10">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-bold bg-purple-500/10 text-purple-600 dark:text-purple-400 border border-purple-500/20 mb-2">
            <Database className="w-3.5 h-3.5" />
            <span>Compliance & Forensics</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-slate-900 dark:text-white">
            Immutable Audit Trail
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
            Admin-only compliance ledger recording every mutation, approval, and finalization.
          </p>
        </div>

        <span className="px-3.5 py-1.5 rounded-full text-xs font-extrabold uppercase tracking-wider bg-purple-500/10 text-purple-600 dark:text-purple-400 border border-purple-500/20 relative z-10 self-start sm:self-center">
          Admin Governance Scope
        </span>
      </div>

      <div className="rounded-3xl glass-panel border border-slate-200/80 dark:border-slate-800/80 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-100/70 dark:bg-slate-800/70 text-slate-500 dark:text-slate-400 uppercase font-bold text-[10px] tracking-wider border-b border-slate-200/80 dark:border-slate-800/80">
              <tr>
                <th className="px-5 py-3.5">Timestamp</th>
                <th className="px-5 py-3.5">Action</th>
                <th className="px-5 py-3.5">Entity</th>
                <th className="px-5 py-3.5">Actor</th>
                <th className="px-5 py-3.5">IP Address</th>
                <th className="px-5 py-3.5 text-right">Details</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 font-medium">
              {loading ? (
                <tr>
                  <td colSpan={6} className="text-center py-16 text-slate-400">
                    <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-purple-500" />
                    <span className="text-sm font-semibold">Loading audit records...</span>
                  </td>
                </tr>
              ) : logs.length === 0 ? (
                <tr>
                  <td colSpan={6} className="text-center py-16 text-slate-400 text-sm">
                    No audit records logged yet.
                  </td>
                </tr>
              ) : (
                logs.map(log => (
                  <tr key={log.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40 transition">
                    <td className="px-5 py-3.5 font-mono text-slate-500 dark:text-slate-400">
                      {new Date(log.created_at).toLocaleString()}
                    </td>
                    <td className="px-5 py-3.5">
                      <span className="px-2.5 py-1 rounded-lg font-mono font-bold text-[10px] bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-500/20">
                        {log.action}
                      </span>
                    </td>
                    <td className="px-5 py-3.5 font-bold text-slate-900 dark:text-white">
                      {log.entity} {log.entity_id ? `#${log.entity_id}` : ''}
                    </td>
                    <td className="px-5 py-3.5">
                      <div>
                        <span className="text-slate-900 dark:text-white block font-bold">
                          {log.actor_email || 'System'}
                        </span>
                        <span className="text-[10px] text-purple-600 dark:text-purple-400 font-extrabold uppercase">{log.actor_role || 'API'}</span>
                      </div>
                    </td>
                    <td className="px-5 py-3.5 font-mono text-slate-400">
                      {log.ip_address || '127.0.0.1'}
                    </td>
                    <td className="px-5 py-3.5 text-right">
                      {(log.before_json || log.after_json) && (
                        <button
                          onClick={() => setSelectedLog(log)}
                          className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-xl bg-purple-500/10 hover:bg-purple-500/20 text-purple-600 dark:text-purple-400 font-bold border border-purple-500/20 transition active:scale-95"
                        >
                          <Eye className="w-3.5 h-3.5" />
                          <span>Payload Diff</span>
                        </button>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* JSON Diff Modal */}
      {selectedLog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-md animate-in fade-in duration-200">
          <div className="max-w-2xl w-full glass-panel bg-white/95 dark:bg-slate-900/95 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden">
            <div className="p-5 bg-gradient-to-r from-purple-900 to-indigo-900 text-white flex items-center justify-between">
              <div>
                <h3 className="font-bold text-sm">Audit Payload Diff #{selectedLog.id}</h3>
                <p className="text-[11px] text-purple-200">{selectedLog.action} on {selectedLog.entity}</p>
              </div>
              <button onClick={() => setSelectedLog(null)} className="text-purple-200 hover:text-white transition">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-4 max-h-[70vh] overflow-y-auto font-mono text-xs">
              {selectedLog.before_json && (
                <div>
                  <span className="text-slate-400 font-bold uppercase text-[10px] block mb-1">State Before Mutation:</span>
                  <pre className="p-3.5 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-600 dark:text-rose-400 overflow-x-auto text-[11px]">
                    {JSON.stringify(JSON.parse(selectedLog.before_json), null, 2)}
                  </pre>
                </div>
              )}

              {selectedLog.after_json && (
                <div>
                  <span className="text-slate-400 font-bold uppercase text-[10px] block mb-1">State After Mutation:</span>
                  <pre className="p-3.5 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 overflow-x-auto text-[11px]">
                    {JSON.stringify(JSON.parse(selectedLog.after_json), null, 2)}
                  </pre>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

