import { useMemo } from 'react'
import { Pencil01, RefreshCcw02, Trash03 } from '@untitled-ui/icons-react'
import type { DividerLineTableColumn } from '../../ui/untitled'
import { showToast } from '../../../utils/toast'
import TeamAvatar from './TeamAvatar'
import TeamStatusBadge from './TeamStatusBadge'
import { ROLE_LABELS, type TeamMember, type TeamRow } from './teamTypes'

interface UseTeamTableColumnsParams {
  filtered: TeamMember[]
  loading: boolean
  selectedIds: Set<string>
  allVisibleSelected: boolean
  toggleAllVisible: () => void
  toggleOne: (id: string) => void
  openDrawerFor: (member: TeamMember) => void
  performRemove: (ids: string[]) => void
}

export function useTeamTableColumns({
  filtered,
  loading,
  selectedIds,
  allVisibleSelected,
  toggleAllVisible,
  toggleOne,
  openDrawerFor,
  performRemove,
}: UseTeamTableColumnsParams): Array<DividerLineTableColumn<TeamRow>> {
  return useMemo(
    () => [
      {
        id: 'select',
        header: (
          <input
            type="checkbox"
            checked={allVisibleSelected}
            onChange={() => {
              if (!loading) toggleAllVisible()
            }}
            disabled={loading || filtered.length === 0}
            aria-label="Select all"
          />
        ),
        sortable: false,
        render: (item) => {
          if (item.__skeleton) {
            return <div className="h-4 w-4 animate-pulse rounded bg-slate-100" />
          }
          return (
            <input
              type="checkbox"
              checked={selectedIds.has(item.id)}
              onClick={(e) => e.stopPropagation()}
              onChange={() => toggleOne(item.id)}
              aria-label={`Select ${item.name}`}
            />
          )
        },
      },
      {
        id: 'name',
        header: 'Name',
        sortable: false,
        render: (item) => {
          if (item.__skeleton) {
            return (
              <div className="flex items-center gap-3">
                <div className="h-8 w-8 animate-pulse rounded-full bg-slate-100" />
                <div className="h-4 w-40 animate-pulse rounded bg-slate-100" />
              </div>
            )
          }
          return (
            <div className="flex min-w-0 items-center gap-3">
              <TeamAvatar name={item.name} />
              <div className="truncate font-medium text-slate-900">{item.name}</div>
            </div>
          )
        },
      },
      {
        id: 'email',
        header: 'Email address',
        sortable: false,
        render: (item) => {
          if (item.__skeleton) return <div className="h-4 w-56 animate-pulse rounded bg-slate-100" />
          return <div className="text-slate-600">{item.email}</div>
        },
      },
      {
        id: 'status',
        header: 'Status',
        sortable: false,
        render: (item) => {
          if (item.__skeleton) return <div className="h-6 w-20 animate-pulse rounded-full bg-slate-100" />
          return <TeamStatusBadge status={item.status} />
        },
      },
      {
        id: 'role',
        header: 'Role',
        sortable: false,
        render: (item) => {
          if (item.__skeleton) return <div className="h-4 w-28 animate-pulse rounded bg-slate-100" />
          return (
            <span className="inline-flex items-center rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-medium text-slate-700">
              {ROLE_LABELS[item.role] ?? item.role}
            </span>
          )
        },
      },
      {
        id: 'actions',
        header: 'Actions',
        sortable: false,
        align: 'right',
        render: (item) => {
          if (item.__skeleton) return <div className="ml-auto h-8 w-8 animate-pulse rounded bg-slate-100" />
          const isPending = item.status === 'pending'
          return (
            <div className="flex items-center justify-end gap-3">
              {isPending ? (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation()
                    showToast.success('Invite resent.')
                  }}
                  className="text-slate-500 transition-colors hover:text-primary"
                  aria-label={`Resend invite to ${item.name}`}
                  title="Resend invite"
                >
                  <RefreshCcw02 className="h-4 w-4" />
                </button>
              ) : (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation()
                    openDrawerFor(item)
                  }}
                  className="text-slate-500 transition-colors hover:text-primary"
                  aria-label={`Edit ${item.name}`}
                  title="Edit"
                >
                  <Pencil01 className="h-4 w-4" strokeWidth={1.8} />
                </button>
              )}

              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation()
                  performRemove([item.id])
                }}
                className="text-slate-500 transition-colors hover:text-rose-600"
                aria-label={`Remove ${item.name}`}
                title="Remove"
              >
                <Trash03 className="h-4 w-4" strokeWidth={1.8} />
              </button>
            </div>
          )
        },
      },
    ],
    [
      allVisibleSelected,
      filtered.length,
      loading,
      openDrawerFor,
      performRemove,
      selectedIds,
      toggleAllVisible,
      toggleOne,
    ]
  )
}
