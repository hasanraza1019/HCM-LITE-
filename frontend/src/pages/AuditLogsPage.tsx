import React, { useState, useEffect } from 'react';
import { ClipboardList, ShieldAlert, RefreshCw, Eye, X, Filter } from 'lucide-react';
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
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black tracking-tight text-slate-900 dark:text-white">
            Immutable Audit Trail
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Admin-only compliance ledger recording every mutation, approval, and finalization.
          </p>
        </div>

        <span className="px-3 py-1 rounded-full text-xs font-bold bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300">
          Admin Governance Scope
        </span>
      </div>

      <div className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 dark:bg-slate-800/60 text-slate-500 uppercase font-bold text-[10px] tracking-wider border-b border-slate-200 dark:border-slate-800">
              <tr>
                <th className="px-4 py-3">Timestamp</th>
                <th className="px-4 py-3">Action</th>
                <th className="px-4 py-3">Entity</th>
                <th className="px-4 py-3">Actor</th>
                <th className="px-4 py-3">IP Address</th>
                <th className="px-4 py-3 text-right">Details</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 font-medium">
              {loading ? (
                <tr>
                  <td colSpan={6} className="text-center py-10 text-slate-400">
                    <RefreshCw className="w-5 h-5 animate-spin mx-auto mb-2 text-blue-500" />
                    <span>Loading audit records...</span>
                  </td>
                </tr>
              ) : logs.length === 0 ? (
                <tr>
                  <td colSpan={6} className="text-center py-10 text-slate-400">
                    No audit records logged yet.
                  </td>
                </tr>
              ) : (
                logs.map(log => (
                  <tr key={log.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition">
                    <td className="px-4 py-3 font-mono text-slate-500">
                      {new Date(log.created_at).toLocaleString()}
                    </td>
                    <td className="px-4 py-3">
                      <span className="px-2 py-0.5 rounded font-mono font-bold text-[10px] bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200">
                        {log.action}
                      </span>
                    </td>
                    <td className="px-4 py-3 font-bold text-slate-800 dark:text-slate-200">
                      {log.entity} {log.entity_id ? `#${log.entity_id}` : ''}
                    </td>
                    <td className="px-4 py-3">
                      <div>
                        <span className="text-slate-900 dark:text-white block font-semibold">
                          {log.actor_email || 'System'}
                        </span>
                        <span className="text-[10px] text-purple-600 font-bold uppercase">{log.actor_role || 'API'}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 font-mono text-slate-400">
                      {log.ip_address || '127.0.0.1'}
                    </td>
                    <td className="px-4 py-3 text-right">
                      {(log.before_json || log.after_json) && (
                        <button
                          onClick={() => setSelectedLog(log)}
                          className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-lg bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-300 font-bold hover:bg-blue-100 transition"
                        >
                          <Eye className="w-3.5 h-3.5" />
                          <span>Diff</span>
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
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs">
          <div className="max-w-2xl w-full bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden">
            <div className="p-4 bg-slate-900 text-white flex items-center justify-between">
              <div>
                <h3 className="font-bold text-sm">Audit Payload Diff #{selectedLog.id}</h3>
                <p className="text-[11px] text-slate-400">{selectedLog.action} on {selectedLog.entity}</p>
              </div>
              <button onClick={() => setSelectedLog(null)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-5 space-y-4 max-h-[70vh] overflow-y-auto font-mono text-xs">
              {selectedLog.before_json && (
                <div>
                  <span className="text-slate-400 font-bold uppercase text-[10px] block mb-1">State Before:</span>
                  <pre className="p-3 rounded-xl bg-slate-100 dark:bg-slate-800 text-rose-600 dark:text-rose-400 overflow-x-auto text-[11px]">
                    {JSON.stringify(JSON.parse(selectedLog.before_json), null, 2)}
                  </pre>
                </div>
              )}

              {selectedLog.after_json && (
                <div>
                  <span className="text-slate-400 font-bold uppercase text-[10px] block mb-1">State After:</span>
                  <pre className="p-3 rounded-xl bg-slate-100 dark:bg-slate-800 text-emerald-600 dark:text-emerald-400 overflow-x-auto text-[11px]">
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

