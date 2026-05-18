import React from 'react'
import { XClose } from '@untitled-ui/icons-react'
import { Button } from '../../ui/untitled'
import Slideout from '../../ui/untitled/Slideout'
import { showToast } from '../../../utils/toast'
import TeamStatusBadge from './TeamStatusBadge'
import { formatDateRange, splitName } from './teamUtils'
import { ROLE_LABELS, ROLE_OPTIONS, type EventAccess, type TeamMember } from './teamTypes'

interface TeamMemberSlideoutProps {
  isOpen: boolean
  onClose: () => void
  drawerLoading: boolean
  activeMember: TeamMember | null
  draftRole: string
  onDraftRoleChange: (role: string) => void
  activeEvents: EventAccess[]
  onSave: () => void
  onRemove: () => void
}

const TeamMemberSlideout: React.FC<TeamMemberSlideoutProps> = ({
  isOpen,
  onClose,
  drawerLoading,
  activeMember,
  draftRole,
  onDraftRoleChange,
  activeEvents,
  onSave,
  onRemove,
}) => {
  return (
    <Slideout
      isOpen={isOpen}
      onClose={onClose}
      topOffset={64}
      width={460}
      header={
        <div className="sticky top-0 bg-white">
          <div className="relative">
            <div className="h-28 w-full bg-gradient-to-r from-indigo-200 via-purple-200 to-pink-200" />
            <button
              type="button"
              onClick={onClose}
              className="absolute right-4 top-4 inline-flex h-9 w-9 items-center justify-center rounded-md bg-white/70 text-slate-600 shadow-sm transition hover:bg-white"
              aria-label="Close"
            >
              <XClose className="h-5 w-5" />
            </button>

            <div className="absolute left-0 right-0 -bottom-8 flex items-center justify-center">
              <div className="relative">
                <div className="h-16 w-16 rounded-full bg-white p-1 shadow-sm">
                  <div className="flex h-full w-full items-center justify-center rounded-full bg-slate-100 text-sm font-semibold text-slate-600 ring-1 ring-slate-200">
                    {activeMember?.name ? splitName(activeMember.name).firstName.slice(0, 1).toUpperCase() : 'U'}
                  </div>
                </div>
                {activeMember ? (
                  <div className="absolute right-0 bottom-0 translate-x-2 translate-y-1">
                    <TeamStatusBadge status={activeMember.status} />
                  </div>
                ) : null}
              </div>
            </div>
          </div>

          <div className="border-b border-slate-200 px-6 pb-4 pt-12 text-center">
            {drawerLoading ? (
              <div className="mx-auto h-5 w-40 animate-pulse rounded bg-slate-100" />
            ) : (
              <div className="text-lg font-semibold text-slate-900">{activeMember?.name || '—'}</div>
            )}
            <div className="mt-1 text-sm text-slate-500">
              {drawerLoading ? ' ' : activeMember?.role ? (ROLE_LABELS[activeMember.role] ?? activeMember.role) : ''}
            </div>
          </div>
        </div>
      }
      footer={
        <div className="flex w-full items-center justify-between">
          <div>
            <Button variant="destructive" onClick={onRemove} disabled={!activeMember}>
              Remove
            </Button>
          </div>
          <div className="flex items-center gap-2">
            {activeMember?.status === 'pending' ? (
              <Button
                variant="secondary"
                onClick={() => showToast.success('Invite resent.')}
                disabled={!activeMember}
              >
                Resend invite
              </Button>
            ) : null}
            <Button variant="primary" onClick={onSave} disabled={!activeMember || drawerLoading}>
              Save
            </Button>
          </div>
        </div>
      }
    >
      <div className="space-y-6 px-6 py-5">
        <div>
          <div className="mb-3 text-sm font-semibold text-slate-900">Details</div>
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2">
              <label className="mb-1 block text-xs font-medium text-slate-600">Email</label>
              <input
                value={activeMember?.email || ''}
                readOnly
                className="w-full rounded-md border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700"
              />
            </div>
            <div className="col-span-2">
              <label className="mb-1 block text-xs font-medium text-slate-600">Role</label>
              <select
                value={draftRole}
                onChange={(e) => onDraftRoleChange(e.target.value)}
                className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                disabled={drawerLoading}
              >
                {ROLE_OPTIONS.map((r) => (
                  <option key={r} value={r}>
                    {ROLE_LABELS[r] ?? r}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        <div>
          <div className="mb-3 text-sm font-semibold text-slate-900">Events</div>
          {drawerLoading ? (
            <div className="space-y-2">
              <div className="h-16 animate-pulse rounded-lg bg-slate-100" />
              <div className="h-16 animate-pulse rounded-lg bg-slate-100" />
            </div>
          ) : activeEvents.length === 0 ? (
            <div className="rounded-lg border border-slate-200 bg-white p-4 text-sm text-slate-600">
              No events assigned.
            </div>
          ) : (
            <div className="space-y-2">
              {activeEvents.map((ev) => (
                <div key={ev.id} className="rounded-lg border border-slate-200 bg-white p-3">
                  <div className="flex items-start gap-3">
                    <div
                      className="flex h-9 w-9 items-center justify-center rounded-full text-xs font-bold text-white"
                      style={{ backgroundColor: ev.color }}
                      aria-hidden="true"
                    >
                      ↗
                    </div>
                    <div className="min-w-0">
                      <div className="truncate text-sm font-semibold text-slate-900">{ev.name}</div>
                      <div className="mt-0.5 text-xs text-slate-500">{formatDateRange(ev.startDate, ev.endDate)}</div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </Slideout>
  )
}

export default TeamMemberSlideout
