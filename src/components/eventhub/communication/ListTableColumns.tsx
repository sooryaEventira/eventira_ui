import { useMemo } from 'react'
import { Pencil01, Trash03, Mail01, Bell01, HelpCircle, RefreshCcw02 } from '@untitled-ui/icons-react'
import {
  Badge,
  type DividerLineTableColumn
} from '../../ui/untitled'
import type { TableRowData } from './types'
import { SelectAllCheckbox } from '../../ui'

interface ListTableColumnsProps {
  allVisibleSelected: boolean
  partiallySelected: boolean
  selectedCommunicationIds: Set<string>
  onToggleAllVisible: (checked: boolean) => void
  onToggleRow: (id: string, checked: boolean) => void
  onEditCommunication?: (communicationId: string) => void
  onDeleteCommunication?: (communicationId: string) => void
  onRecipientsClick?: (communicationId: string, communicationTitle: string, tab: 'received' | 'not_received') => void
  onResendCommunication?: (communicationId: string, communicationTitle: string) => void
  resendingCommunicationIds?: Set<string>
}

const getStatusBadgeVariant = (status: string) => {
  switch (status) {
    case 'sent':
      return 'success' as const
    case 'scheduled':
      return 'primary' as const
    case 'draft':
      return 'warning' as const
    default:
      return 'neutral' as const
  }
}

const getUserGroupVariant = (variant?: string): 'primary' | 'info' | 'muted' => {
  if (variant === 'primary') return 'primary'
  if (variant === 'secondary') return 'info'
  return 'muted'
}

export const useListTableColumns = ({
  allVisibleSelected,
  partiallySelected,
  selectedCommunicationIds,
  onToggleAllVisible,
  onToggleRow,
  onEditCommunication,
  onDeleteCommunication,
  onRecipientsClick,
  onResendCommunication,
  resendingCommunicationIds,
}: ListTableColumnsProps): DividerLineTableColumn<TableRowData>[] => {
  return useMemo<DividerLineTableColumn<TableRowData>[]>(
    () => [
      {
        id: 'title',
        header: (
          <div className="flex items-center gap-2">
            <SelectAllCheckbox
              checked={allVisibleSelected}
              indeterminate={partiallySelected}
              onChange={onToggleAllVisible}
              ariaLabel="Select all communications"
            />
            <span>Title</span>
          </div>
        ),
        sortable: true,
        sortAccessor: ({ communication }) => communication?.title || '',
        render: ({ communication }) => {
          if (!communication) return null
          return (
            <div className="flex items-center gap-3">
              <input
                type="checkbox"
                className="h-4 w-4 rounded border-slate-300 text-primary focus:ring-primary/40"
                aria-label={`Select ${communication.title}`}
                checked={selectedCommunicationIds.has(communication.id)}
                onChange={(event) => onToggleRow(communication.id, event.target.checked)}
              />
              <span className="text-sm font-medium text-slate-900">{communication.title}</span>
            </div>
          )
        }
      },
      {
        id: 'userGroups',
        header: 'Groups',
        sortable: true,
        sortAccessor: ({ communication }) => communication?.userGroups.map((g) => g.name).join(' ') || '',
        render: ({ communication }) => {
          if (!communication) return null
          
          // Display all groups that were selected when sending the mail
          if (communication.userGroups.length === 0) {
            return <span className="text-sm text-slate-400">No groups</span>
          }
          
          return (
            <div className="flex flex-wrap items-center gap-2">
              {communication.userGroups.slice(0, 3).map((group) => (
                <Badge key={group.id} variant={getUserGroupVariant(group.variant)}>
                  {group.name}
                </Badge>
              ))}
              {communication.userGroups.length > 3 && (
                <Badge variant="muted">+{communication.userGroups.length - 3}</Badge>
              )}
            </div>
          )
        }
      },
      {
        id: 'status',
        header: 'Status',
        sortable: true,
        sortAccessor: ({ communication }) => communication?.status || '',
        render: ({ communication }) => {
          if (!communication) return null
          return (
            <div className="flex items-center gap-2">
              <Badge variant={getStatusBadgeVariant(communication.status)}>
                {communication.status.charAt(0).toUpperCase() + communication.status.slice(1)}
              </Badge>
              {communication.status === 'scheduled' && communication.scheduledDate && (
                <div className="group relative">
                  <HelpCircle className="h-4 w-4 text-slate-500 cursor-help" />
                  <div className="absolute left-0 top-6 z-10 hidden w-48 rounded-md bg-slate-900 px-3 py-2 text-xs text-white shadow-lg group-hover:block">
                    {new Date(communication.scheduledDate).toLocaleDateString('en-US', {
                      year: 'numeric',
                      month: 'short',
                      day: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit'
                    })}
                  </div>
                </div>
              )}
            </div>
          )
        }
      },
      {
        id: 'type',
        header: 'Type',
        sortable: true,
        sortAccessor: ({ communication }) => communication?.type || '',
        render: ({ communication }) => {
          if (!communication) return null
          return (
            <div className="flex items-center">
              {communication.type === 'email' ? (
                <Mail01 className="h-5 w-5 text-slate-500" />
              ) : (
                <Bell01 className="h-5 w-5 text-slate-500" />
              )}
            </div>
          )
        }
      },
      {
        id: 'recipients',
        header: 'Recipients',
        sortable: true,
        sortAccessor: ({ communication }) => communication?.recipients.sent || 0,
        render: ({ communication }) => {
          if (!communication) return null
          const { sent, total } = communication.recipients
          const totalRed = sent > 0 && sent < total
          const canClick = communication.status === 'sent'
          return (
            <span className="text-sm font-medium">
              <span
                className={`text-green-600 ${canClick ? 'cursor-pointer underline-offset-2 hover:underline' : ''}`}
                onClick={canClick ? (e) => { e.stopPropagation(); onRecipientsClick?.(communication.id, communication.title, 'received') } : undefined}
              >
                {sent}
              </span>
              <span className="text-slate-400">/</span>
              <span
                className={`${totalRed ? 'text-red-500' : 'text-green-600'} ${totalRed && canClick ? 'cursor-pointer underline-offset-2 hover:underline' : ''}`}
                onClick={totalRed && canClick ? (e) => { e.stopPropagation(); onRecipientsClick?.(communication.id, communication.title, 'not_received') } : undefined}
              >
                {total}
              </span>
            </span>
          )
        }
      },
      {
        id: 'actions',
        header: '',
        align: 'right',
        render: ({ communication }) => {
          if (!communication) return null
          const isDraft = communication.status === 'draft'
          const { sent, total } = communication.recipients
          const hasFailures =
            communication.status === 'sent' && total > 0 && sent < total
          const isResending = !!resendingCommunicationIds?.has(communication.id)
          return (
            <div className="flex items-center justify-end gap-2">
              {hasFailures && (
                <button
                  type="button"
                  onClick={(event) => {
                    event.stopPropagation()
                    if (isResending) return
                    onResendCommunication?.(communication.id, communication.title)
                  }}
                  disabled={isResending}
                  className={[
                    'flex h-9 w-9 items-center justify-center transition focus:outline-none',
                    isResending
                      ? 'text-slate-300 cursor-not-allowed opacity-60'
                      : 'text-slate-500 hover:text-primary focus-visible:ring-2 focus-visible:ring-primary/40'
                  ].join(' ')}
                  aria-label={`Resend failed messages for ${communication.title}`}
                  title={
                    isResending
                      ? 'Resending failed messages…'
                      : `Resend failed messages (${total - sent})`
                  }
                >
                  <RefreshCcw02
                    className={`h-4 w-4 ${isResending ? 'animate-spin' : ''}`}
                    strokeWidth={1.8}
                  />
                </button>
              )}
              <button
                type="button"
                onClick={() => { if (!isDraft) return; onEditCommunication?.(communication.id) }}
                disabled={!isDraft}
                className={[
                  'flex h-9 w-9 items-center justify-center transition focus:outline-none',
                  isDraft
                    ? 'text-slate-500 hover:text-primary focus-visible:ring-2 focus-visible:ring-primary/40'
                    : 'text-slate-300 cursor-not-allowed opacity-60 pointer-events-none'
                ].join(' ')}
                aria-label={`Edit ${communication.title}`}
                title={isDraft ? `Edit ${communication.title}` : 'Only draft items can be edited'}
              >
                <Pencil01 className="h-4 w-4" strokeWidth={1.8} />
              </button>
              <button
                type="button"
                onClick={() => {
                  if (!isDraft) return
                  onDeleteCommunication?.(communication.id)
                }}
                disabled={!isDraft}
                className={[
                  'flex h-9 w-9 items-center justify-center transition focus:outline-none',
                  isDraft
                    ? 'text-slate-500 hover:border-rose-400 hover:text-rose-600 focus-visible:ring-2 focus-visible:ring-rose-300/60'
                    : 'text-slate-300 cursor-not-allowed opacity-60 pointer-events-none'
                ].join(' ')}
                aria-label={`Delete ${communication.title}`}
                title={isDraft ? `Delete ${communication.title}` : 'Only draft items can be deleted'}
              >
                <Trash03 className="h-4 w-4" strokeWidth={1.8} />
              </button>
            </div>
          )
        }
      }
    ],
    [
      allVisibleSelected,
      partiallySelected,
      selectedCommunicationIds,
      onToggleAllVisible,
      onToggleRow,
      onEditCommunication,
      onDeleteCommunication,
      onRecipientsClick,
      onResendCommunication,
      resendingCommunicationIds,
    ]
  )
}

