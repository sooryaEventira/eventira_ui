import React, { useMemo, useRef, useEffect, useState } from 'react'
import { Pencil01, Trash03 } from '@untitled-ui/icons-react'
import {
  Badge,
  type DividerLineTableColumn
} from '../../ui/untitled'
import type { ParticipantTableRowData } from './participantTypes'

interface HeaderSelectAll {
  visibleIds: string[]
  onToggleAll: (checked: boolean) => void
  allSelected: boolean
  indeterminate: boolean
}

interface ParticipantTableColumnsProps {
  selectedParticipantIds: Set<string>
  onToggleRow: (id: string, checked: boolean) => void
  headerSelectAll?: HeaderSelectAll
  onEditParticipant?: (participantId: string) => void
  onDeleteParticipant?: (participantId: string) => void
}

const getGroupVariant = (variant?: string): 'primary' | 'info' | 'muted' => {
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

function GroupBadges<T>({
  visible,
  hidden,
  renderBadge,
  hiddenLabels,
}: {
  visible: T[]
  hidden: T[]
  renderBadge: (item: T) => React.ReactNode
  hiddenLabels?: string[]
}) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    const fn = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', fn)
    return () => document.removeEventListener('mousedown', fn)
  }, [open])

  return (
    <div className="flex items-center gap-1.5">
      {visible.map((item, idx) => (
        <React.Fragment key={idx}>{renderBadge(item)}</React.Fragment>
      ))}
      {hidden.length > 0 && (
        <div className="relative" ref={ref}>
          <button
            type="button"
            onMouseEnter={() => setOpen(true)}
            onMouseLeave={() => setOpen(false)}
            onClick={(e) => { e.stopPropagation(); setOpen((v) => !v) }}
            className="inline-flex items-center rounded-full border border-slate-300 bg-white px-2 py-0.5 text-xs font-medium text-slate-600 hover:bg-slate-50"
          >
            +{hidden.length}
          </button>
          {open && (
            <div
              className="absolute left-0 top-full z-50 mt-1 flex flex-wrap gap-1.5 rounded-lg border border-slate-200 bg-white p-2 shadow-lg"
              style={{ minWidth: '140px', maxWidth: '260px' }}
              onMouseEnter={() => setOpen(true)}
              onMouseLeave={() => setOpen(false)}
            >
              {(hiddenLabels ?? (hidden as string[])).map((label, idx) => (
                <Badge key={idx} variant="muted">{label}</Badge>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

export const useParticipantTableColumns = ({
  selectedParticipantIds,
  onToggleRow,
  headerSelectAll,
  onEditParticipant,
  onDeleteParticipant
}: ParticipantTableColumnsProps): DividerLineTableColumn<ParticipantTableRowData>[] => {
  return useMemo<DividerLineTableColumn<ParticipantTableRowData>[]>(
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
        sortAccessor: ({ participant }) => participant?.name || '',
        render: ({ participant }) => {
          if (!participant) return null
          return (
            <div className="flex items-center gap-3">
              <input
                type="checkbox"
                className="h-4 w-4 rounded border-slate-300 text-primary focus:ring-primary/40"
                aria-label={`Select ${participant.name}`}
                checked={selectedParticipantIds.has(participant.id)}
                onChange={(event) => {
                  event.stopPropagation()
                  onToggleRow(participant.id, event.target.checked)
                }}
                onClick={(e) => e.stopPropagation()}
              />
              {participant.avatarUrl ? (
                <img
                  src={participant.avatarUrl}
                  alt={participant.name}
                  className="h-8 w-8 rounded-full object-cover"
                />
              ) : (
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-200 text-xs font-medium text-slate-600">
                  {participant.name
                    .split(' ')
                    .map((n) => n[0])
                    .join('')
                    .toUpperCase()
                    .slice(0, 2)}
                </div>
              )}
              <span
                className="text-sm font-medium text-slate-900 cursor-pointer hover:text-primary transition-colors"
                onClick={() => onEditParticipant?.(participant.id)}
              >
                {participant.name}
              </span>
            </div>
          )
        }
      },
      {
        id: 'email',
        header: 'Email address',
        sortable: true,
        sortAccessor: ({ participant }) => participant?.email || '',
        render: ({ participant }) => {
          if (!participant) return null
          return <span className="text-sm text-slate-600">{participant.email}</span>
        }
      },
      {
        id: 'designation',
        header: 'Designation',
        sortable: true,
        sortAccessor: ({ participant }) => participant?.post || '',
        render: ({ participant }) => {
          if (!participant) return null
          const designation = (participant.post || '').trim()
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
        sortAccessor: ({ participant }) => participant?.organization || '',
        render: ({ participant }) => {
          if (!participant) return null
          const organization = (participant.organization || '').trim()
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
        sortable: false,
        render: ({ participant }) => {
          if (!participant) return null

          if (participant.tags && participant.tags.length > 0) {
            const tagsArray = Array.isArray(participant.tags) ? participant.tags : [participant.tags]
            const visible = tagsArray.slice(0, 2)
            const hidden = tagsArray.slice(2)
            return <GroupBadges visible={visible} hidden={hidden} renderBadge={(t: string) => <Badge variant="muted">{t}</Badge>} />
          }

          const visible = participant.groups.slice(0, 2)
          const hidden = participant.groups.slice(2)
          return (
            <GroupBadges
              visible={visible}
              hidden={hidden}
              renderBadge={(g: { id: string; name: string; variant?: string }) => <Badge variant={getGroupVariant(g.variant)}>{g.name}</Badge>}
              hiddenLabels={hidden.map((g) => g.name)}
            />
          )
        }
      },
      {
        id: 'actions',
        header: '',
        align: 'right',
        render: ({ participant }) => {
          if (!participant) return null
          return (
            <div className="flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => onDeleteParticipant?.(participant.id)}
                className="flex h-9 w-9 items-center justify-center text-slate-500 transition hover:border-rose-400 hover:text-rose-600 focus:outline-none focus-visible:ring-2 focus-visible:ring-rose-300/60"
                aria-label={`Delete ${participant.name}`}
              >
                <Trash03 className="h-4 w-4" strokeWidth={1.8} />
              </button>
              <button
                type="button"
                onClick={() => onEditParticipant?.(participant.id)}
                className="flex h-9 w-9 items-center justify-center text-slate-500 transition hover:text-primary focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
                aria-label={`Edit ${participant.name}`}
              >
                <Pencil01 className="h-4 w-4" strokeWidth={1.8} />
              </button>
            </div>
          )
        }
      }
    ],
    [
      selectedParticipantIds,
      onToggleRow,
      headerSelectAll,
      onEditParticipant,
      onDeleteParticipant
    ]
  )
}
