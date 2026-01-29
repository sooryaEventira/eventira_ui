import { useMemo } from 'react'
import { Pencil01, Trash03 } from '@untitled-ui/icons-react'
import type { DividerLineTableColumn } from '../../ui/untitled'
import { SelectAllCheckbox } from '../../ui'
import type { OrganizationTableRowData } from './organizationTypes'

interface OrganizationTableColumnsProps {
  allVisibleSelected: boolean
  partiallySelected: boolean
  selectedOrganizationIds: Set<string>
  onToggleAllVisible: (checked: boolean) => void
  onToggleRow: (id: string, checked: boolean) => void
  onEditOrganization?: (organizationId: string) => void
  onDeleteOrganization?: (organizationId: string) => void
}

export const useOrganizationTableColumns = ({
  allVisibleSelected,
  partiallySelected,
  selectedOrganizationIds,
  onToggleAllVisible,
  onToggleRow,
  onEditOrganization,
  onDeleteOrganization
}: OrganizationTableColumnsProps): DividerLineTableColumn<OrganizationTableRowData>[] => {
  return useMemo<DividerLineTableColumn<OrganizationTableRowData>[]>(
    () => [
      {
        id: 'name',
        header: (
          <div className="flex items-center gap-2">
            <SelectAllCheckbox
              checked={allVisibleSelected}
              indeterminate={partiallySelected}
              onChange={onToggleAllVisible}
              ariaLabel="Select all organizations"
            />
            <span>Name</span>
          </div>
        ),
        sortable: true,
        sortAccessor: ({ organization }) => organization?.name || '',
        render: ({ organization }) => {
          if (!organization) return null
          return (
            <div className="flex items-center gap-3">
              <input
                type="checkbox"
                className="h-4 w-4 rounded border-slate-300 text-primary focus:ring-primary/40"
                aria-label={`Select ${organization.name || 'organization'}`}
                checked={selectedOrganizationIds.has(organization.id)}
                onChange={(event) => {
                  event.stopPropagation()
                  onToggleRow(organization.id, event.target.checked)
                }}
                onClick={(e) => e.stopPropagation()}
              />
              <div className="min-w-0">
                <div
                  className="text-sm font-medium text-slate-900 cursor-pointer hover:text-primary transition-colors truncate"
                  onClick={() => onEditOrganization?.(organization.id)}
                >
                  {organization.name || 'Unknown'}
                </div>
              </div>
            </div>
          )
        }
      },
      {
        id: 'website',
        header: 'Website',
        sortable: true,
        sortAccessor: ({ organization }) => organization?.website || '',
        render: ({ organization }) => {
          if (!organization) return null
          const website = (organization.website || '').trim()
          if (!website) return <span className="text-sm text-slate-600">-</span>
          return (
            <a
              className="text-sm text-primary hover:underline truncate block max-w-[360px]"
              href={website}
              target="_blank"
              rel="noreferrer"
              onClick={(e) => e.stopPropagation()}
              title={website}
            >
              {website}
            </a>
          )
        }
      },
      {
        id: 'description',
        header: 'Description',
        sortable: true,
        sortAccessor: ({ organization }) => organization?.description || '',
        render: ({ organization }) => {
          if (!organization) return null
          return (
            <span className="block max-w-[520px] whitespace-normal break-words text-sm leading-5 text-slate-600">
              {organization.description?.trim() || '-'}
            </span>
          )
        }
      },
      {
        id: 'logoLink',
        header: 'Logo link',
        sortable: true,
        sortAccessor: ({ organization }) => organization?.logoLink || '',
        render: ({ organization }) => {
          if (!organization) return null
          const link = (organization.logoLink || '').trim()
          if (!link) return <span className="text-sm text-slate-600">-</span>
          return (
            <a
              className="text-sm text-primary hover:underline truncate block max-w-[360px]"
              href={link}
              target="_blank"
              rel="noreferrer"
              onClick={(e) => e.stopPropagation()}
              title={link}
            >
              {link}
            </a>
          )
        }
      },
      {
        id: 'actions',
        header: '',
        align: 'right',
        render: ({ organization }) => {
          if (!organization) return null
          return (
            <div className="flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation()
                  onDeleteOrganization?.(organization.id)
                }}
                className="flex h-9 w-9 items-center justify-center text-slate-500 transition hover:border-rose-400 hover:text-rose-600 focus:outline-none focus-visible:ring-2 focus-visible:ring-rose-300/60"
                aria-label={`Delete ${organization.name}`}
              >
                <Trash03 className="h-4 w-4" strokeWidth={1.8} />
              </button>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation()
                  onEditOrganization?.(organization.id)
                }}
                className="flex h-9 w-9 items-center justify-center text-slate-500 transition hover:text-primary focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
                aria-label={`Edit ${organization.name}`}
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
      selectedOrganizationIds,
      onToggleAllVisible,
      onToggleRow,
      onEditOrganization,
      onDeleteOrganization
    ]
  )
}

