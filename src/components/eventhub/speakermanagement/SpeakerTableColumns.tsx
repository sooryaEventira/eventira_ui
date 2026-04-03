import React, { useMemo, useRef, useEffect } from 'react'
import { Pencil01, Trash03 } from '@untitled-ui/icons-react'
import {
  Badge,
  type DividerLineTableColumn
} from '../../ui/untitled'
import type { SpeakerTableRowData } from './speakerTypes'

interface HeaderSelectAll {
  visibleIds: string[]
  onToggleAll: (checked: boolean) => void
  allSelected: boolean
  indeterminate: boolean
}

interface SpeakerTableColumnsProps {
  selectedSpeakerIds: Set<string>
  onToggleRow: (id: string, checked: boolean) => void
  headerSelectAll?: HeaderSelectAll
  onEditSpeaker?: (speakerId: string) => void
  onDeleteSpeaker?: (speakerId: string) => void
}

const getUserGroupVariant = (variant?: string): 'primary' | 'info' | 'muted' => {
  if (variant === 'primary') return 'primary'
  if (variant === 'info') return 'info'
  return 'muted'
}

function HeaderCheckbox({
  checked,
  indeterminate,
  onChange,
  label
}: {
  checked: boolean
  indeterminate: boolean
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void
  label: string
}) {
  const ref = useRef<HTMLInputElement>(null)
  useEffect(() => {
    if (ref.current) ref.current.indeterminate = indeterminate
  }, [indeterminate])
  return (
    <div className="flex items-center gap-3" onClick={(e) => e.stopPropagation()}>
      <input
        ref={ref}
        type="checkbox"
        className="h-4 w-4 rounded border-slate-300 text-primary focus:ring-primary/40"
        aria-label={`Select all ${label}`}
        checked={checked}
        onChange={onChange}
      />
      <span>{label}</span>
    </div>
  )
}

export const useSpeakerTableColumns = ({
  selectedSpeakerIds,
  onToggleRow,
  headerSelectAll,
  onEditSpeaker,
  onDeleteSpeaker
}: SpeakerTableColumnsProps): DividerLineTableColumn<SpeakerTableRowData>[] => {
  return useMemo<DividerLineTableColumn<SpeakerTableRowData>[]>(
    () => [
      {
        id: 'name',
        header: headerSelectAll ? (
          <HeaderCheckbox
            checked={headerSelectAll.allSelected}
            indeterminate={headerSelectAll.indeterminate}
            onChange={(e) => {
              e.stopPropagation()
              headerSelectAll.onToggleAll((e.target as HTMLInputElement).checked)
            }}
            label="Name"
          />
        ) : (
          'Name'
        ),
        sortable: true,
        sortAccessor: ({ speaker }) => speaker?.name || '',
        render: ({ speaker }) => {
          if (!speaker) return null
          return (
            <div className="flex items-center gap-3">
              <input
                type="checkbox"
                className="h-4 w-4 rounded border-slate-300 text-primary focus:ring-primary/40"
                aria-label={`Select ${speaker.name || 'speaker'}`}
                checked={selectedSpeakerIds.has(speaker.id)}
                onChange={(event) => {
                  event.stopPropagation()
                  onToggleRow(speaker.id, event.target.checked)
                }}
                onClick={(e) => e.stopPropagation()}
              />
              {speaker.avatarUrl ? (
                <img
                  src={speaker.avatarUrl}
                  alt={speaker.name}
                  className="h-8 w-8 rounded-full object-cover"
                />
              ) : (
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-200 text-xs font-medium text-slate-600">
                  {(speaker.name || 'U')
                    .split(' ')
                    .filter(Boolean)
                    .map((n) => n[0])
                    .join('')
                    .toUpperCase()
                    .slice(0, 2)}
                </div>
              )}
              <div className="min-w-0">
                <div
                  className="text-sm font-medium text-slate-900 cursor-pointer hover:text-primary transition-colors truncate"
                  onClick={() => onEditSpeaker?.(speaker.id)}
                >
                  {speaker.name || 'Unknown'}
                </div>
              
              </div>
            </div>
          )
        }
      },
      // {
      //   id: 'inviteCode',
      //   header: 'Invite code',
      //   sortable: true,
      //   sortAccessor: ({ speaker }) => speaker?.inviteCode || '',
      //   render: ({ speaker }) => {
      //     if (!speaker) return null
      //     return (
      //       <span className="text-sm text-slate-600">
      //         {speaker.inviteCode || '-'}
      //       </span>
      //     )
      //   }
      // },
      {
        id: 'email',
        header: 'Email',
        sortable: true,
        sortAccessor: ({ speaker }) => speaker?.email || '',
        render: ({ speaker }) => {
          if (!speaker) return null
          return (
            <span className="text-sm text-slate-600">
              {speaker.email || '-'}
            </span>
          )
        }
      },
      // {
      //   id: 'phoneNumber',
      //   header: 'Phone number',
      //   sortable: true,
      //   sortAccessor: ({ speaker }) => speaker?.phoneNumber || '',
      //   render: ({ speaker }) => {
      //     if (!speaker) return null
      //     return (
      //       <span className="text-sm text-slate-600">
      //         {speaker.phoneNumber || '-'}
      //       </span>
      //     )
      //   }
      // },
      {
        id: 'designation',
        header: 'Designation',
        sortable: true,
        sortAccessor: ({ speaker }) => speaker?.title || speaker?.role || '',
        render: ({ speaker }) => {
          if (!speaker) return null
          const designation = speaker.title || speaker.role
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
        sortAccessor: ({ speaker }) => speaker?.organization || '',
        render: ({ speaker }) => {
          if (!speaker) return null
          return (
            <span className="block max-w-[220px] truncate text-sm text-slate-600" title={speaker.organization || undefined}>
              {speaker.organization || '-'}
            </span>
          )
        }
      },
      {
        id: 'groups',
        header: 'Group',
        sortable: true,
        sortAccessor: ({ speaker }) =>
          speaker?.groups?.map((g) => g.name).join(', ') || '',
        render: ({ speaker }) => {
          if (!speaker) return null
          const groups = speaker.groups || []
          if (!groups.length) {
            return <span className="text-sm text-slate-600">-</span>
          }
          return (
            <div className="flex flex-wrap gap-1">
              {groups.slice(0, 2).map((g) => (
                <Badge key={g.id} variant={getUserGroupVariant(g.variant)}>
                  {g.name}
                </Badge>
              ))}
              {groups.length > 2 ? (
                <Badge variant="muted">+{groups.length - 2}</Badge>
              ) : null}
            </div>
          )
        }
      },
 
      {
        id: 'actions',
        header: '',
        align: 'right',
        render: ({ speaker }) => {
          if (!speaker) return null
          return (
            <div className="flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => onDeleteSpeaker?.(speaker.id)}
                className="flex h-9 w-9 items-center justify-center text-slate-500 transition hover:border-rose-400 hover:text-rose-600 focus:outline-none focus-visible:ring-2 focus-visible:ring-rose-300/60"
                aria-label={`Delete ${speaker.name}`}
              >
                <Trash03 className="h-4 w-4" strokeWidth={1.8} />
              </button>
              <button
                type="button"
                onClick={() => onEditSpeaker?.(speaker.id)}
                className="flex h-9 w-9 items-center justify-center text-slate-500 transition hover:text-primary focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
                aria-label={`Edit ${speaker.name}`}
              >
                <Pencil01 className="h-4 w-4" strokeWidth={1.8} />
              </button>
            </div>
          )
        }
      }
    ],
    [selectedSpeakerIds, onToggleRow, headerSelectAll, onEditSpeaker, onDeleteSpeaker]
  )
}
