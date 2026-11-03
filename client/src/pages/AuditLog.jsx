import React, { useEffect, useState, useCallback } from 'react';
import {
  FileText,
  Search,
  Filter,
  RefreshCw,
  Loader2,
  ChevronLeft,
  ChevronRight,
  Eye
} from 'lucide-react';
import { getAuditLogApi } from '../api';
import { useToast } from '../context/ToastContext';
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
      return <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">{act}</span>;
    }
    if (['CREATE', 'REGISTER'].includes(act)) {
      return <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-blue-500/20 text-blue-400 border border-blue-500/30">{act}</span>;
    }
    if (['UPDATE', 'REACTIVATE'].includes(act)) {
      return <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-500/20 text-amber-400 border border-amber-500/30">{act}</span>;
    }
    if (['SUSPEND', 'REJECT'].includes(act)) {
      return <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-rose-500/20 text-rose-400 border border-rose-500/30">{act}</span>;
    }
    return <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-white/5 text-zinc-300 border border-white/10">{act}</span>;
  };

  const totalPages = Math.ceil(total / limit);

  return (
    <div className="space-y-6 pb-8">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-condensed font-bold uppercase tracking-wider text-white">
            Audit Log
          </h1>
          <p className="text-xs text-zinc-400 mt-0.5">
            Security audit trail of administrative modifications, approvals, and data events
          </p>
        </div>

        <button
          onClick={() => fetchLogs()}
          disabled={loading}
          className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-[#202020] hover:bg-[#282828] border border-[#303030] rounded-xl text-xs font-bold text-zinc-300 transition-all"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-[#C6A15B]' : 'text-zinc-500'}`} />
          <span>Refresh</span>
        </button>
      </div>

      {/* Filter Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 bg-[#202020] border border-[#303030] p-3 rounded-2xl">
        <div className="flex flex-wrap items-center gap-3">
          <select
            value={entityFilter}
            onChange={(e) => {
              setEntityFilter(e.target.value);
              setPage(0);
            }}
            className="px-3 py-1.5 bg-[#171717] border border-[#303030] rounded-xl text-xs text-white focus:outline-none focus:border-[#C6A15B]"
          >
            {ENTITY_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>

          <form onSubmit={handleActorSearch} className="flex items-center gap-2">
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-zinc-500 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                value={actorFilter}
                onChange={(e) => setActorFilter(e.target.value)}
                placeholder="Search actor..."
                className="w-48 pl-8 pr-3 py-1.5 bg-[#171717] border border-[#303030] rounded-xl text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-[#C6A15B]"
              />
            </div>
            <button
              type="submit"
              className="px-3 py-1.5 bg-[#C6A15B] hover:bg-[#d8b167] text-black rounded-xl text-xs font-bold"
            >
              Filter
            </button>
          </form>
        </div>

        <span className="text-xs text-zinc-400">Total events: {total}</span>
      </div>

      {/* Table Card */}
      <div className="rounded-2xl bg-[#202020] border border-[#303030] overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-[#2d2d2d] bg-[#1a1a1a] text-zinc-400 font-condensed font-bold uppercase tracking-wider">
                <th className="py-3.5 px-4 w-40">Timestamp</th>
                <th className="py-3.5 px-4">Actor</th>
                <th className="py-3.5 px-4">Action</th>
                <th className="py-3.5 px-4">Entity</th>
                <th className="py-3.5 px-4 text-right">Details</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#262626]">
              {loading ? (
                <tr>
                  <td colSpan={5} className="py-14 text-center text-zinc-500">
                    <Loader2 className="w-7 h-7 animate-spin mx-auto text-[#C6A15B] mb-2" />
                    <span className="text-xs font-semibold text-zinc-400">Loading audit trail...</span>
                  </td>
                </tr>
              ) : logs.length === 0 ? (
                <tr>
                  <td colSpan={5} className="p-8">
                    <EmptyState
                      icon={FileText}
                      title="No audit entries"
                      description="No recorded audit actions match your filter criteria."
                    />
                  </td>
                </tr>
              ) : (
                logs.map((log) => (
                  <tr key={log.log_id} className="hover:bg-[#262626] transition-colors">
                    <td className="py-3.5 px-4 font-mono text-zinc-400">
                      {log.created_at ? log.created_at.substring(0, 19).replace('T', ' ') : '—'}
                    </td>
                    <td className="py-3.5 px-4 text-zinc-300 font-medium">
                      {log.actor_name || log.actor_email || `User #${log.actor_user_id || 'System'}`}
                    </td>
                    <td className="py-3.5 px-4">
                      {getActionBadge(log.action)}
                    </td>
                    <td className="py-3.5 px-4 text-zinc-300 font-mono">
                      {log.entity} #{log.entity_id}
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <button
                        onClick={() => setSelectedLog(log)}
                        className="px-2.5 py-1 bg-[#282828] hover:bg-[#333333] text-zinc-200 text-xs font-semibold rounded-lg border border-[#383838]"
                      >
                        Inspect
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Detail Modal */}
      <Modal
        isOpen={Boolean(selectedLog)}
        onClose={() => setSelectedLog(null)}
        title="Audit Log Entry Details"
      >
        {selectedLog && (
          <div className="space-y-3 text-xs">
            <div className="p-3 bg-[#171717] rounded-xl border border-[#2d2d2d] space-y-1.5">
              <div className="flex justify-between">
                <span className="text-zinc-500">Action:</span>
                <span className="font-bold text-white">{selectedLog.action}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-zinc-500">Target Entity:</span>
                <span className="font-mono text-zinc-300">{selectedLog.entity} #{selectedLog.entity_id}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-zinc-500">Actor:</span>
                <span className="text-zinc-300">{selectedLog.actor_name || selectedLog.actor_email || selectedLog.actor_user_id}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-zinc-500">Timestamp:</span>
                <span className="font-mono text-zinc-400">{selectedLog.created_at}</span>
              </div>
            </div>

            <div>
              <span className="font-bold text-zinc-400 block mb-1">Payload / Details:</span>
              <pre className="p-3 bg-[#141414] rounded-xl border border-[#262626] font-mono text-[11px] text-zinc-300 overflow-x-auto max-h-60">
                {typeof selectedLog.details === 'object'
                  ? JSON.stringify(selectedLog.details, null, 2)
                  : String(selectedLog.details || 'No additional details payload recorded.')}
              </pre>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};

export default AuditLog;
