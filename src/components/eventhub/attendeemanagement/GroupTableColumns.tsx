import { useMemo } from 'react'
import { Pencil01, Trash03 } from '@untitled-ui/icons-react'
import {
  type DividerLineTableColumn
} from '../../ui/untitled'
import type { GroupTableRowData } from './attendeeTypes'

interface GroupTableColumnsProps {
  builtGroupIds?: Set<string>
  onToggleBuildPage?: (group: { id: string; name: string }, checked: boolean) => void
  onEditGroup?: (groupId: string) => void
  onDeleteGroup?: (groupId: string) => void
}

export const useGroupTableColumns = ({
  builtGroupIds,
  onToggleBuildPage,
  onEditGroup,
  onDeleteGroup
}: GroupTableColumnsProps): DividerLineTableColumn<GroupTableRowData>[] => {
  return useMemo<DividerLineTableColumn<GroupTableRowData>[]>(
    () => [
      {
        id: 'groupName',
        header: 'Group name',
        sortable: true,
        sortAccessor: ({ group }) => group?.name || '',
        render: ({ group }) => {
          if (!group) return null
          return (
            <span className="text-sm font-medium text-slate-900">{group.name}</span>
          )
        }
      },
      {
        id: 'attendeeCount',
        header: 'Attendee count',
        sortable: true,
        sortAccessor: ({ group }) => group?.attendeeCount || 0,
        render: ({ group }) => {
          if (!group) return null
          return <span className="text-sm text-slate-600">{group.attendeeCount}</span>
        }
      },
      {
        id: 'buildPage',
        header: 'Build page',
        align: 'center',
        sortable: false,
        render: ({ group }) => {
          if (!group) return null
          const isBuilt = Boolean(builtGroupIds?.has(group.id))
          return (
            <input
              type="checkbox"
              className="h-4 w-4 rounded border-slate-300 text-primary focus:ring-primary/40"
              aria-label={`Build page for ${group.name}`}
              checked={isBuilt}
              onChange={(event) =>
                onToggleBuildPage?.({ id: group.id, name: group.name }, event.target.checked)
              }
            />
          )
        }
      },
      {
        id: 'actions',
        header: '',
        align: 'right',
        render: ({ group }) => {
          if (!group) return null
          return (
            <div className="flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => onDeleteGroup?.(group.id)}
                className="flex h-9 w-9 items-center justify-center text-slate-500 transition hover:border-rose-400 hover:text-rose-600 focus:outline-none focus-visible:ring-2 focus-visible:ring-rose-300/60"
                aria-label={`Delete ${group.name}`}
              >
                <Trash03 className="h-4 w-4" strokeWidth={1.8} />
              </button>
              <button
                type="button"
                onClick={() => onEditGroup?.(group.id)}
                className="flex h-9 w-9 items-center justify-center text-slate-500 transition hover:text-primary focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
                aria-label={`Edit ${group.name}`}
              >
                <Pencil01 className="h-4 w-4" strokeWidth={1.8} />
              </button>
            </div>
          )
        }
      }
    ],
    [
      builtGroupIds,
      onToggleBuildPage,
      onEditGroup,
      onDeleteGroup
    ]
  )
}

