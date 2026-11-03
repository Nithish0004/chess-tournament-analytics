import React from 'react';
import { Clock, AlertTriangle } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export const ApprovalBanner = () => {
  const { user } = useAuth();

  if (!user || user.role === 'ADMIN' || user.approval_status === 'APPROVED') {
    return null;
  }

  const isPending = user.approval_status === 'PENDING';
  const isRejected = user.approval_status === 'REJECTED';

  if (!isPending && !isRejected) {
    return null;
  }

  if (isPending) {
    const text =
      user.role === 'ORGANIZER'
        ? 'Your account is waiting for admin approval. You can explore tournaments and players, but you cannot create tournaments yet.'
        : 'Your account is waiting for admin approval. You can explore tournaments and players, but you cannot join or play yet.';

    return (
      <div className="bg-[#241c10] border-b border-[#4d3618] px-4 py-2.5 sm:px-6">
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-3 text-amber-200 text-xs sm:text-sm">
          <div className="flex items-center gap-2.5">
            <div className="w-6 h-6 rounded-full bg-amber-500/20 border border-amber-500/30 flex items-center justify-center shrink-0">
              <Clock className="w-3.5 h-3.5 text-amber-400" />
            </div>
            <p className="font-medium leading-relaxed">
              <span className="font-bold mr-1.5 uppercase tracking-wider text-[11px] bg-amber-500/20 text-amber-300 px-2 py-0.5 rounded-md border border-amber-500/30">
                Pending Approval
              </span>
              {text}
            </p>
          </div>
          <span className="text-[11px] text-amber-400/80 font-semibold hidden md:inline shrink-0">
            Read-only mode
          </span>
        </div>
      </div>
    );
  }

  // REJECTED
  return (
    <div className="bg-[#261317] border-b border-[#521c25] px-4 py-2.5 sm:px-6">
      <div className="max-w-7xl mx-auto flex items-center justify-between gap-3 text-rose-200 text-xs sm:text-sm">
        <div className="flex items-center gap-2.5">
          <div className="w-6 h-6 rounded-full bg-rose-500/20 border border-rose-500/30 flex items-center justify-center shrink-0">
            <AlertTriangle className="w-3.5 h-3.5 text-rose-400" />
          </div>
          <p className="font-medium leading-relaxed">
            <span className="font-bold mr-1.5 uppercase tracking-wider text-[11px] bg-rose-500/20 text-rose-300 px-2 py-0.5 rounded-md border border-rose-500/30">
              Account Rejected
            </span>
            Your account was not approved by an administrator.
            {user.approval_note && (
              <span className="ml-1 text-rose-300 italic">
                Reason: &ldquo;{user.approval_note}&rdquo;
              </span>
            )}
          </p>
        </div>
        <span className="text-[11px] text-rose-400/80 font-semibold hidden md:inline shrink-0">
          Suspended
        </span>
      </div>
    </div>
  );
};
