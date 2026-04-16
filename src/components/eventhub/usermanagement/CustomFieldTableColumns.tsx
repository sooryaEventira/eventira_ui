import { useMemo } from 'react'
import { Pencil01, Trash03 } from '@untitled-ui/icons-react'
import {
  type DividerLineTableColumn
} from '../../ui/untitled'
import type { CustomFieldTableRowData } from './participantTypes'

interface CustomFieldTableColumnsProps {
  selectedCustomFieldIds: Set<string>
  onToggleRow: (id: string, checked: boolean) => void
  onEditCustomField?: (customFieldId: string) => void
  onDeleteCustomField?: (customFieldId: string) => void
}

export const useCustomFieldTableColumns = ({
  selectedCustomFieldIds,
  onToggleRow,
  onEditCustomField,
  onDeleteCustomField
}: CustomFieldTableColumnsProps): DividerLineTableColumn<CustomFieldTableRowData>[] => {
  return useMemo<DividerLineTableColumn<CustomFieldTableRowData>[]>(
    () => [
      {
        id: 'fieldName',
        header: 'Field name',
        sortable: true,
        sortAccessor: ({ customField }) => customField?.fieldName || '',
        render: ({ customField }) => {
          if (!customField) return null
          return (
            <div className="flex items-center gap-3">
              <input
                type="checkbox"
                className="h-4 w-4 rounded border-slate-300 text-primary focus:ring-primary/40"
                aria-label={`Select ${customField.fieldName}`}
                checked={selectedCustomFieldIds.has(customField.id)}
                onChange={(event) => onToggleRow(customField.id, event.target.checked)}
              />
              <span className="text-sm font-medium text-slate-900">{customField.fieldName}</span>
            </div>
          )
        }
      },
      {
        id: 'users',
        header: 'Users',
        sortable: true,
        sortAccessor: ({ customField }) => customField?.users || 0,
        render: ({ customField }) => {
          if (!customField) return null
          return <span className="text-sm text-slate-600">{customField.users} Users</span>
        }
      },
      {
        id: 'fieldType',
        header: 'Field type',
        sortable: true,
        sortAccessor: ({ customField }) => customField?.fieldType || '',
        render: ({ customField }) => {
          if (!customField) return null
          return <span className="text-sm text-slate-600">{customField.fieldType}</span>
        }
      },
      {
        id: 'visibility',
        header: 'Visibility',
        sortable: true,
        sortAccessor: ({ customField }) => customField?.visibility || '',
        render: ({ customField }) => {
          if (!customField) return null
          return <span className="text-sm text-slate-600">{customField.visibility}</span>
        }
      },
      {
        id: 'actions',
        header: '',
        align: 'right',
        render: ({ customField }) => {
          if (!customField) return null
          return (
            <div className="flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => onDeleteCustomField?.(customField.id)}
                className="flex h-9 w-9 items-center justify-center text-slate-500 transition hover:border-rose-400 hover:text-rose-600 focus:outline-none focus-visible:ring-2 focus-visible:ring-rose-300/60"
                aria-label={`Delete ${customField.fieldName}`}
              >
                <Trash03 className="h-4 w-4" strokeWidth={1.8} />
              </button>
              <button
                type="button"
                onClick={() => onEditCustomField?.(customField.id)}
                className="flex h-9 w-9 items-center justify-center text-slate-500 transition hover:text-primary focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
                aria-label={`Edit ${customField.fieldName}`}
              >
                <Pencil01 className="h-4 w-4" strokeWidth={1.8} />
              </button>
            </div>
          )
        }
      }
    ],
    [selectedCustomFieldIds, onToggleRow, onEditCustomField, onDeleteCustomField]
  )
}
