import React, { useMemo } from 'react'
import { Pencil01, Trash03 } from '@untitled-ui/icons-react'
import {
  type DividerLineTableColumn
} from '../../ui/untitled'
import type { TableRowData } from './types'
import { SelectAllCheckbox } from '../../ui'

interface MacroTableColumnsProps {
  allVisibleSelected: boolean
  partiallySelected: boolean
  selectedMacroIds: Set<string>
  onToggleAllVisible: (checked: boolean) => void
  onToggleRow: (id: string, checked: boolean) => void
  onEditMacro?: (macroId: string) => void
  onDeleteMacro?: (macroId: string) => void
}

export const useMacroTableColumns = ({
  allVisibleSelected,
  partiallySelected,
  selectedMacroIds,
  onToggleAllVisible,
  onToggleRow,
  onEditMacro,
  onDeleteMacro
}: MacroTableColumnsProps): DividerLineTableColumn<TableRowData>[] => {
  return useMemo<DividerLineTableColumn<TableRowData>[]>(
    () => [
      {
        id: 'macro',
        header: (
          <div className="flex items-center gap-2">
            <SelectAllCheckbox
              checked={allVisibleSelected}
              indeterminate={partiallySelected}
              onChange={onToggleAllVisible}
              ariaLabel="Select all macros"
            />
            <span>Macro</span>
          </div>
        ),
        sortable: true,
        sortAccessor: ({ macro }) => macro?.macro || '',
        render: ({ macro }) => {
          if (!macro) return null
          return (
            <div className="flex items-center gap-3">
              <input
                type="checkbox"
                className="h-4 w-4 rounded border-slate-300 text-primary focus:ring-primary/40"
                aria-label={`Select ${macro.macro}`}
                checked={selectedMacroIds.has(macro.id)}
                onChange={(event) => onToggleRow(macro.id, event.target.checked)}
              />
              <span className="text-sm font-medium text-slate-900">{macro.macro}</span>
            </div>
          )
        }
      },
      {
        id: 'column',
        header: 'Columns',
        sortable: true,
        sortAccessor: ({ macro }) => macro?.column || '',
        render: ({ macro }) => {
          if (!macro) return null
          return <span className="text-sm text-slate-600">{macro.column}</span>
        }
      },
      {
        id: 'actions',
        header: 'Actions',
        align: 'right',
        render: ({ macro }) => {
          if (!macro) return null
          return (
            <div className="flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => onEditMacro?.(macro.id)}
                className="flex h-9 w-9 items-center justify-center text-slate-500 transition hover:text-primary focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
                aria-label={`Edit ${macro.macro}`}
              >
                <Pencil01 className="h-4 w-4" strokeWidth={1.8} />
              </button>
              <button
                type="button"
                onClick={() => onDeleteMacro?.(macro.id)}
                className="flex h-9 w-9 items-center justify-center text-slate-500 transition hover:border-rose-400 hover:text-rose-600 focus:outline-none focus-visible:ring-2 focus-visible:ring-rose-300/60"
                aria-label={`Delete ${macro.macro}`}
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
      selectedMacroIds,
      onToggleAllVisible,
      onToggleRow,
      onEditMacro,
      onDeleteMacro
    ]
  )
}

