import { useMemo } from 'react'
import { Pencil01, Trash03 } from '@untitled-ui/icons-react'
import {
  Badge,
  type DividerLineTableColumn
} from '../../ui/untitled'
import type { AttendeeTableRowData } from './attendeeTypes'
import { SelectAllCheckbox } from '../../ui'

interface AttendeeTableColumnsProps {
  allVisibleSelected: boolean
  partiallySelected: boolean
  selectedAttendeeIds: Set<string>
  onToggleAllVisible: (checked: boolean) => void
  onToggleRow: (id: string, checked: boolean) => void
  onEditAttendee?: (attendeeId: string) => void
  onDeleteAttendee?: (attendeeId: string) => void
}

const getUserGroupVariant = (variant?: string): 'primary' | 'info' | 'muted' => {
  if (variant === 'primary') return 'primary'
  if (variant === 'info') return 'info'
  return 'muted'
}

export const useAttendeeTableColumns = ({
  allVisibleSelected,
  partiallySelected,
  selectedAttendeeIds,
  onToggleAllVisible,
  onToggleRow,
  onEditAttendee,
  onDeleteAttendee
}: AttendeeTableColumnsProps): DividerLineTableColumn<AttendeeTableRowData>[] => {
  return useMemo<DividerLineTableColumn<AttendeeTableRowData>[]>(
    () => [
      {
        id: 'name',
        header: (
          <div className="flex items-center gap-2">
            <SelectAllCheckbox
              checked={allVisibleSelected}
              indeterminate={partiallySelected}
              onChange={onToggleAllVisible}
              ariaLabel="Select all attendees"
            />
            <span>Name</span>
          </div>
        ),
        sortable: true,
        sortAccessor: ({ attendee }) => attendee?.name || '',
        render: ({ attendee }) => {
          if (!attendee) return null
          return (
            <div className="flex items-center gap-3">
              <input
                type="checkbox"
                className="h-4 w-4 rounded border-slate-300 text-primary focus:ring-primary/40"
                aria-label={`Select ${attendee.name}`}
                checked={selectedAttendeeIds.has(attendee.id)}
                onChange={(event) => {
                  event.stopPropagation()
                  onToggleRow(attendee.id, event.target.checked)
                }}
                onClick={(e) => e.stopPropagation()}
              />
              {attendee.avatarUrl ? (
                <img
                  src={attendee.avatarUrl}
                  alt={attendee.name}
                  className="h-8 w-8 rounded-full object-cover"
                />
              ) : (
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-200 text-xs font-medium text-slate-600">
                  {attendee.name
                    .split(' ')
                    .map((n) => n[0])
                    .join('')
                    .toUpperCase()
                    .slice(0, 2)}
                </div>
              )}
              <span 
                className="text-sm font-medium text-slate-900 cursor-pointer hover:text-primary transition-colors"
                onClick={() => onEditAttendee?.(attendee.id)}
              >
                {attendee.name}
              </span>
            </div>
          )
        }
      },
      {
        id: 'email',
        header: 'Email address',
        sortable: true,
        sortAccessor: ({ attendee }) => attendee?.email || '',
        render: ({ attendee }) => {
          if (!attendee) return null
          return <span className="text-sm text-slate-600">{attendee.email}</span>
        }
      },
      {
        id: 'inviteCode',
        header: 'Invite code',
        sortable: true,
        sortAccessor: ({ attendee }) => attendee?.inviteCode || '',
        render: ({ attendee }) => {
          if (!attendee) return null
          return (
            <span className="text-sm text-slate-600">
              {attendee.inviteCode || '-'}
            </span>
          )
        }
      },
      {
        id: 'designation',
        header: 'Designation',
        sortable: true,
        sortAccessor: ({ attendee }) => attendee?.post || '',
        render: ({ attendee }) => {
          if (!attendee) return null
          const designation = (attendee.post || '').trim()
          return (
            <span className="block max-w-[220px] truncate text-sm text-slate-600" title={designation || undefined}>
              {designation || '-'}
            </span>
          )
        }
      },
      {
        id: 'organization',
        header: 'Organization',
        sortable: true,
        sortAccessor: ({ attendee }) => attendee?.organization || '',
        render: ({ attendee }) => {
          if (!attendee) return null
          const organization = (attendee.organization || '').trim()
          return (
            <span className="block max-w-[220px] truncate text-sm text-slate-600" title={organization || undefined}>
              {organization || '-'}
            </span>
          )
        }
      },
      {
        id: 'groups',
        header: 'Group',
        sortable: true,
        sortAccessor: ({ attendee }) => {
          // Sort by tags if available, otherwise by groups
          if (attendee?.tags && attendee.tags.length > 0) {
            return Array.isArray(attendee.tags) ? attendee.tags.join(' ') : attendee.tags
          }
          return attendee?.groups.map((g) => g.name).join(' ') || ''
        },
        render: ({ attendee }) => {
          if (!attendee) return null
          
          // Display tags if available, otherwise display groups
          if (attendee.tags && attendee.tags.length > 0) {
            const tagsArray = Array.isArray(attendee.tags) ? attendee.tags : [attendee.tags]
            return (
              <div className="flex flex-wrap items-center gap-2">
                {tagsArray.map((tag, idx) => (
                  <Badge key={idx} variant="muted">
                    {tag}
                  </Badge>
                ))}
              </div>
            )
          }
          
          // Fallback to groups if no tags
          return (
            <div className="flex flex-wrap items-center gap-2">
              {attendee.groups.slice(0, 3).map((group, idx) => (
                <Badge key={idx} variant={getUserGroupVariant(group.variant)}>
                  {group.name}
                </Badge>
              ))}
              {attendee.groups.length > 3 && (
                <Badge variant="muted">+{attendee.groups.length - 3}</Badge>
              )}
            </div>
          )
        }
      },
      {
        id: 'actions',
        header: '',
        align: 'right',
        render: ({ attendee }) => {
          if (!attendee) return null
          return (
            <div className="flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => onDeleteAttendee?.(attendee.id)}
                className="flex h-9 w-9 items-center justify-center text-slate-500 transition hover:border-rose-400 hover:text-rose-600 focus:outline-none focus-visible:ring-2 focus-visible:ring-rose-300/60"
                aria-label={`Delete ${attendee.name}`}
              >
                <Trash03 className="h-4 w-4" strokeWidth={1.8} />
              </button>
              <button
                type="button"
                onClick={() => onEditAttendee?.(attendee.id)}
                className="flex h-9 w-9 items-center justify-center text-slate-500 transition hover:text-primary focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
                aria-label={`Edit ${attendee.name}`}
              >
                <Pencil01 className="h-4 w-4" strokeWidth={1.8} />
              </button>
            </div>
          )
        }
      }
    ],
    [
      allVisibleSelected,
      partiallySelected,
      selectedAttendeeIds,
      onToggleAllVisible,
      onToggleRow,
      onEditAttendee,
      onDeleteAttendee
    ]
  )
}

