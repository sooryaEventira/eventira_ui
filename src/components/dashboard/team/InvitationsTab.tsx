import React from 'react'
import type { MyInvitation } from '../../../services/teamService'
import { ROLE_LABELS } from './teamTypes'

interface InvitationsTabProps {
  tableHeaderLeading: React.ReactNode
  tableHeaderActions: React.ReactNode
  invitationsLoading: boolean
  invitations: MyInvitation[]
  filteredInvitations: MyInvitation[]
  processingInviteUuid: string | null
  onAccept: (inv: MyInvitation) => void
  onDecline: (inv: MyInvitation) => void
}

const InvitationsTab: React.FC<InvitationsTabProps> = ({
  tableHeaderLeading,
  tableHeaderActions,
  invitationsLoading,
  invitations,
  filteredInvitations,
  processingInviteUuid,
  onAccept,
  onDecline,
}) => {
  return (
    <div className="overflow-hidden bg-white">
      <div className="flex items-center justify-between border-b border-slate-200 px-6 py-6">
        {tableHeaderLeading}
        {tableHeaderActions}
      </div>

      {invitationsLoading ? (
        <div className="space-y-3 p-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-24 animate-pulse rounded-lg bg-slate-100" />
          ))}
        </div>
      ) : filteredInvitations.length === 0 ? (
        <div className="flex min-h-[200px] items-center justify-center text-sm text-slate-500">
          {invitations.length === 0
            ? 'No pending invitations.'
            : 'No invitations match your search.'}
        </div>
      ) : (
        <div className="divide-y divide-slate-200">
          {filteredInvitations.map((inv) => {
            const isProcessing = processingInviteUuid === inv.uuid
            const roleLabel = ROLE_LABELS[inv.role] ?? inv.role
            const expires = inv.expires_at
              ? new Intl.DateTimeFormat(undefined, { day: '2-digit', month: 'short', year: 'numeric' }).format(
                  new Date(inv.expires_at)
                )
              : null
            return (
              <div key={inv.uuid} className="flex items-center justify-between gap-4 px-4 py-4">
                <div className="flex min-w-0 items-center gap-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-violet-100 text-sm font-bold text-violet-700">
                    {inv.organization.name.charAt(0).toUpperCase()}
                  </div>
                  <div className="min-w-0">
                    <div className="truncate text-sm font-semibold text-slate-900">{inv.organization.name}</div>
                    <div className="mt-0.5 text-xs text-slate-500">
                      Role: <span className="font-medium text-slate-700">{roleLabel}</span>
                      {inv.events.length > 0 && (
                        <span className="ml-2">· {inv.events.map((e) => e.title).join(', ')}</span>
                      )}
                      {expires && <span className="ml-2">· Expires {expires}</span>}
                    </div>
                  </div>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  <button
                    type="button"
                    disabled={isProcessing}
                    onClick={() => onAccept(inv)}
                    className="inline-flex items-center rounded-lg bg-violet-600 px-3 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-violet-700 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {isProcessing ? 'Processing…' : 'Accept'}
                  </button>
                  <button
                    type="button"
                    disabled={isProcessing}
                    onClick={() => onDecline(inv)}
                    className="inline-flex items-center rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 transition-colors hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {isProcessing ? 'Processing…' : 'Decline'}
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

export default InvitationsTab
