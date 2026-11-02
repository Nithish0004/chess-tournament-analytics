import React, { useEffect, useState, useCallback } from 'react';
import {
  FileText,
  Search,
  Filter,
  RefreshCw,
  Loader2,
  Calendar,
  User,
  Activity,
  Layers,
  ChevronLeft,
  ChevronRight,
  Eye
} from 'lucide-react';
import { getAuditLogApi } from '../api';
import { useToast } from '../context/ToastContext';
import { PageHeader } from '../components/PageHeader';
import { Card } from '../components/Card';
import { Badge } from '../components/Badge';
import { Modal } from '../components/Modal';
import { EmptyState } from '../components/EmptyState';

const ENTITY_OPTIONS = [
  { value: '', label: 'All Entities' },
  { value: 'TOURNAMENT', label: 'Tournament' },
  { value: 'PLAYER', label: 'Player' },
  { value: 'ROUND', label: 'Round' },
  { value: 'GAME', label: 'Game' },
  { value: 'REGISTRATION', label: 'Registration' },
  { value: 'USER', label: 'User' },
  { value: 'ORGANIZER', label: 'Organizer' }
];

export const AuditLog = () => {
  const [logs, setLogs] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);

  // Filters
  const [entityFilter, setEntityFilter] = useState('');
  const [actorFilter, setActorFilter] = useState('');
  const [appliedActor, setAppliedActor] = useState('');

  // Pagination
  const [page, setPage] = useState(0);
  const limit = 25;

  // Detail Modal
  const [selectedLog, setSelectedLog] = useState(null);

  const { showToast } = useToast();

  const fetchLogs = useCallback(async () => {
    setLoading(true);
    try {
      const params = {
        limit,
        offset: page * limit
      };
      if (entityFilter) params.entity = entityFilter;
      if (appliedActor.trim()) params.actor = appliedActor.trim();

      const res = await getAuditLogApi(params);
      setLogs(res.logs || []);
      setTotal(res.total || 0);
    } catch (err) {
      showToast(err.userMessage || 'Failed to load audit logs', 'error');
    } finally {
      setLoading(false);
    }
  }, [page, entityFilter, appliedActor, limit, showToast]);

  useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

  const handleActorSearch = (e) => {
    e.preventDefault();
    setPage(0);
    setAppliedActor(actorFilter);
  };

  const getActionBadge = (action) => {
    const act = (action || '').toUpperCase();
    if (['START', 'APPROVE'].includes(act)) {
      return <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-black bg-emerald-100 text-emerald-800 border border-emerald-200">{act}</span>;
    }
    if (['CREATE', 'REGISTER'].includes(act)) {
      return <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-black bg-blue-100 text-blue-800 border border-blue-200">{act}</span>;
    }
    if (['UPDATE', 'REACTIVATE'].includes(act)) {
      return <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-black bg-amber-100 text-amber-800 border border-amber-200">{act}</span>;
    }
    if (['COMPLETE', 'RECORD_RESULT'].includes(act)) {
      return <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-black bg-purple-100 text-purple-800 border border-purple-200">{act}</span>;
    }
    if (['SUSPEND', 'REJECT_RATING_EDIT'].includes(act)) {
      return <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-black bg-rose-100 text-rose-800 border border-rose-200">{act}</span>;
    }
    return <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-black bg-slate-100 text-slate-700 border border-slate-200">{act}</span>;
  };

  const formatDetailsPreview = (details) => {
    if (!details) return <span className="text-slate-400 italic">None</span>;
    try {
      const obj = typeof details === 'string' ? JSON.parse(details) : details;
      const keys = Object.keys(obj);
      if (keys.length === 0) return <span className="text-slate-400 italic">Empty</span>;

      // Compact key-value summaries
      const summary = keys
        .slice(0, 3)
        .map((k) => `${k}: ${typeof obj[k] === 'object' ? '...' : obj[k]}`)
        .join(', ');

      return (
        <span className="font-mono text-[11px] text-slate-600 truncate max-w-xs block">
          {summary} {keys.length > 3 ? '...' : ''}
        </span>
      );
    } catch {
      return <span className="font-mono text-[11px] text-slate-600 truncate max-w-xs block">{String(details)}</span>;
    }
  };

  const totalPages = Math.ceil(total / limit);

  return (
    <div className="space-y-6 pb-8">
      <PageHeader
        title="Audit Log"
        subtitle="Security audit trail of administrative changes, status transitions, and data operations"
        actions={
          <button
            onClick={() => fetchLogs()}
            disabled={loading}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-white hover:bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 shadow-2xs transition-all disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-blue-600' : 'text-slate-500'}`} />
            <span>Refresh</span>
          </button>
        }
      />

      {/* Filters Card */}
      <Card padding="p-4" className="shadow-2xs">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
          <div className="flex flex-wrap items-center gap-3">
            {/* Entity Filter */}
            <div className="flex items-center gap-2">
              <Filter className="w-4 h-4 text-slate-400" />
              <select
                value={entityFilter}
                onChange={(e) => {
                  setEntityFilter(e.target.value);
                  setPage(0);
                }}
                className="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
              >
                {ENTITY_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Actor Filter Form */}
            <form onSubmit={handleActorSearch} className="flex items-center gap-2">
              <div className="relative">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  type="text"
                  value={actorFilter}
                  onChange={(e) => setActorFilter(e.target.value)}
                  placeholder="Filter by actor ID/email..."
                  className="pl-8 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm font-medium text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 w-48 sm:w-60"
                />
              </div>
              <button
                type="submit"
                className="px-3 py-1.5 bg-[#2563EB] hover:bg-blue-600 text-white rounded-xl text-xs font-bold transition-all shadow-2xs"
              >
                Search
              </button>
              {appliedActor && (
                <button
                  type="button"
                  onClick={() => {
                    setActorFilter('');
                    setAppliedActor('');
                    setPage(0);
                  }}
                  className="text-xs text-slate-400 hover:text-slate-600 font-semibold"
                >
                  Clear
                </button>
              )}
            </form>
          </div>

          <div className="text-xs font-semibold text-slate-500 text-right">
            Total logs: <span className="font-bold text-slate-900">{total}</span>
          </div>
        </div>
      </Card>

      {/* Table Card */}
      <Card padding="p-0" className="overflow-hidden shadow-2xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm border-collapse">
            <thead>
              <tr className="border-b border-slate-200/80 bg-slate-50/75 text-slate-600 text-xs font-semibold tracking-wider uppercase">
                <th className="py-3.5 px-4 w-44">Time</th>
                <th className="py-3.5 px-4">Actor</th>
                <th className="py-3.5 px-4">Action</th>
                <th className="py-3.5 px-4">Entity</th>
                <th className="py-3.5 px-4">Details</th>
                <th className="py-3.5 px-4 text-right">View</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={6} className="py-14 text-center text-slate-400">
                    <Loader2 className="w-7 h-7 animate-spin mx-auto text-blue-600 mb-2" />
                    <span className="text-xs font-semibold">Loading audit logs...</span>
                  </td>
                </tr>
              ) : logs.length === 0 ? (
                <tr>
                  <td colSpan={6} className="p-8">
                    <EmptyState
                      icon={FileText}
                      title="No audit log entries found"
                      description="No recorded audit actions match your filter criteria."
                    />
                  </td>
                </tr>
              ) : (
                logs.map((log) => (
                  <tr key={log.log_id} className="hover:bg-slate-50/80 transition-colors">
                    {/* Time */}
                    <td className="py-3.5 px-4 text-xs font-mono text-slate-600 whitespace-nowrap">
                      {log.created_at ? log.created_at.substring(0, 19).replace('T', ' ') : '—'}
                    </td>

                    {/* Actor */}
                    <td className="py-3.5 px-4">
                      <div className="min-w-[140px]">
                        <span className="font-bold text-slate-900 text-xs block truncate">
                          {log.actor_name || log.actor_email || (log.actor_user_id ? `User #${log.actor_user_id}` : 'System')}
                        </span>
                        {log.actor_email && log.actor_name && (
                          <span className="text-[10px] text-slate-400 font-mono block truncate">
                            {log.actor_email}
                          </span>
                        )}
                      </div>
                    </td>

                    {/* Action */}
                    <td className="py-3.5 px-4 whitespace-nowrap">
                      {getActionBadge(log.action)}
                    </td>

                    {/* Entity */}
                    <td className="py-3.5 px-4 whitespace-nowrap">
                      <span className="inline-flex items-center gap-1 text-xs font-semibold text-slate-700 bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
                        <span>{log.entity}</span>
                        {log.entity_id != null && (
                          <span className="font-mono text-slate-500 font-bold">#{log.entity_id}</span>
                        )}
                      </span>
                    </td>

                    {/* Details preview */}
                    <td className="py-3.5 px-4">
                      {formatDetailsPreview(log.details)}
                    </td>

                    {/* View Action */}
                    <td className="py-3.5 px-4 text-right">
                      <button
                        onClick={() => setSelectedLog(log)}
                        className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-bold text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded-lg transition-colors"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        <span>Inspect</span>
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Footer */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 bg-slate-50/75 border-t border-slate-200/80 text-xs font-semibold text-slate-600">
            <div>
              Showing {page * limit + 1}–{Math.min((page + 1) * limit, total)} of {total}
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setPage((p) => Math.max(0, p - 1))}
                disabled={page === 0}
                className="p-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <span>
                Page {page + 1} of {totalPages}
              </span>
              <button
                onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
                disabled={page >= totalPages - 1}
                className="p-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </Card>

      {/* Log Details Modal */}
      {selectedLog && (
        <Modal
          isOpen={Boolean(selectedLog)}
          onClose={() => setSelectedLog(null)}
          title={`Audit Event #${selectedLog.log_id}: ${selectedLog.action} ${selectedLog.entity}`}
        >
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3 p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs">
              <div>
                <span className="text-slate-400 block font-semibold uppercase text-[10px]">Timestamp</span>
                <span className="font-mono font-bold text-slate-800">{selectedLog.created_at}</span>
              </div>
              <div>
                <span className="text-slate-400 block font-semibold uppercase text-[10px]">Actor</span>
                <span className="font-bold text-slate-800">
                  {selectedLog.actor_name || selectedLog.actor_email || (selectedLog.actor_user_id ? `User #${selectedLog.actor_user_id}` : 'System')}
                </span>
              </div>
              <div>
                <span className="text-slate-400 block font-semibold uppercase text-[10px]">Action</span>
                <div>{getActionBadge(selectedLog.action)}</div>
              </div>
              <div>
                <span className="text-slate-400 block font-semibold uppercase text-[10px]">Target Entity</span>
                <span className="font-bold text-slate-800">
                  {selectedLog.entity} {selectedLog.entity_id != null ? `#${selectedLog.entity_id}` : ''}
                </span>
              </div>
            </div>

            <div>
              <span className="text-xs font-bold uppercase tracking-wider text-slate-600 block mb-1.5">
                Event Payload / Details
              </span>
              <pre className="p-3 bg-slate-900 text-slate-100 rounded-xl text-xs font-mono overflow-x-auto max-h-64">
                {JSON.stringify(
                  typeof selectedLog.details === 'string'
                    ? JSON.parse(selectedLog.details || '{}')
                    : selectedLog.details || {},
                  null,
                  2
                )}
              </pre>
            </div>

            <div className="flex justify-end pt-2">
              <button
                type="button"
                onClick={() => setSelectedLog(null)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};

export default AuditLog;
