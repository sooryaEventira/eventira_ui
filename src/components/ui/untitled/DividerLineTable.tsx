import React, { useMemo, useState } from 'react'
import { twMerge } from 'tailwind-merge'

import Table, {
  TableCardRoot,
  TableCardHeader,
  TableCardHeading,
  TableCardActions,
  TableCardBody,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell
} from './Table'

type SortDirection = 'ascending' | 'descending'

export interface DividerLineTableSortDescriptor<TColumnKey extends string = string> {
  column: TColumnKey
  direction: SortDirection
}

export interface DividerLineTableColumn<TData> {
  id: string
  header: React.ReactNode
  sortable?: boolean
  align?: 'left' | 'center' | 'right'
  headerClassName?: string
  cellClassName?: string
  sortAccessor?: (item: TData) => string | number | boolean | Date | null | undefined
  render: (item: TData, index: number) => React.ReactNode
}

export interface DividerLineTableProps<TData> {
  data: TData[]
  columns: Array<DividerLineTableColumn<TData>>
  getRowKey: (item: TData, index: number) => string
  headerLeading?: React.ReactNode
  headerActions?: React.ReactNode
  subheader?: React.ReactNode
  emptyState?: React.ReactNode
  footer?: React.ReactNode
  bodyClassName?: string
  rootClassName?: string
  stickyHeader?: boolean
  size?: 'sm' | 'md'
  sortDescriptor?: DividerLineTableSortDescriptor
  onSortChange?: (descriptor: DividerLineTableSortDescriptor) => void
  initialSortDescriptor?: DividerLineTableSortDescriptor
  onRowClick?: (item: TData, index: number) => void
}

interface SortIconProps {
  direction?: SortDirection
  active: boolean
}

const SortIcon: React.FC<SortIconProps> = ({ direction, active }) => {
  const base = 'h-3.5 w-3.5 transition-colors'

  if (!active) {
    return (
      <svg
        className={twMerge(base, 'text-primary/50 group-hover:text-primary/70')}
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        <path d="m8 7 4-4 4 4" />
        <path d="m8 17 4 4 4-4" />
      </svg>
    )
  }

  if (direction === 'ascending') {
    return (
      <svg
        className={twMerge(base, 'text-primary')}
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        <path d="M12 19V5" />
        <path d="m6 11 6-6 6 6" />
      </svg>
    )
  }

  return (
    <svg
      className={twMerge(base, 'text-primary')}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M12 5v14" />
      <path d="m18 13-6 6-6-6" />
    </svg>
  )
}

function compareValues(
  aValue: string | number | boolean | Date | null | undefined,
  bValue: string | number | boolean | Date | null | undefined,
  direction: SortDirection
) {
  const normalize = (value: typeof aValue) => {
    if (value === null || typeof value === 'undefined') return ''
    if (value instanceof Date) return value.getTime()
    if (typeof value === 'boolean') return value ? 1 : 0
    return value
  }

  const first = normalize(aValue)
  const second = normalize(bValue)

  if (typeof first === 'number' && typeof second === 'number') {
    return direction === 'descending' ? second - first : first - second
  }

  return direction === 'descending'
    ? String(second).localeCompare(String(first))
    : String(first).localeCompare(String(second))
}

export function DividerLineTable<TData>({
  data,
  columns,
  getRowKey,
  headerLeading,
  headerActions,
  subheader,
  emptyState,
  footer,
  bodyClassName,
  rootClassName,
  stickyHeader,
  size = 'md',
  sortDescriptor: controlledSortDescriptor,
  onSortChange,
  initialSortDescriptor,
  onRowClick
}: DividerLineTableProps<TData>) {
  const isControlled = typeof controlledSortDescriptor !== 'undefined'
  const [internalSort, setInternalSort] = useState<DividerLineTableSortDescriptor | undefined>(
    initialSortDescriptor
  )

  const sortDescriptor = isControlled ? controlledSortDescriptor : internalSort

  const sortedData = useMemo(() => {
    if (!sortDescriptor) return data
    const column = columns.find(
      (col) => col.id === sortDescriptor.column && col.sortable && col.sortAccessor
    )
    if (!column || !column.sortAccessor) return data

    return [...data].sort((a, b) =>
      compareValues(column.sortAccessor?.(a), column.sortAccessor?.(b), sortDescriptor.direction)
    )
  }, [columns, data, sortDescriptor])

  const handleSortClick = (column: DividerLineTableColumn<TData>) => {
    if (!column.sortable) return

    const nextSort: DividerLineTableSortDescriptor = (() => {
      if (!sortDescriptor || sortDescriptor.column !== column.id) {
        return { column: column.id, direction: 'ascending' }
      }

      return {
        column: column.id,
        direction: sortDescriptor.direction === 'ascending' ? 'descending' : 'ascending'
      }
    })()

    if (!isControlled) {
      setInternalSort(nextSort)
    }
    onSortChange?.(nextSort)
  }

  const renderHeaderCell = (column: DividerLineTableColumn<TData>) => {
    const isSorted = sortDescriptor?.column === column.id

    if (!column.sortable) {
      return column.header
    }

    return (
      <button
        type="button"
        onClick={() => handleSortClick(column)}
        className="group inline-flex items-center gap-1 text-xs font-semibold uppercase tracking-wide text-primary"
      >
        <span>{column.header}</span>
        <SortIcon active={isSorted} direction={isSorted ? sortDescriptor?.direction : undefined} />
      </button>
    )
  }

  return (
    <TableCardRoot size={size} className={twMerge('border-0', rootClassName)}>
      {(headerLeading || headerActions) && (
        <TableCardHeader className="md:flex-row-reverse">
          {headerActions && (
            <TableCardActions className="w-full justify-end md:w-auto">{headerActions}</TableCardActions>
          )}
          {headerLeading && <TableCardHeading className="gap-2">{headerLeading}</TableCardHeading>}
        </TableCardHeader>
      )}

      {subheader}
      <TableCardBody className={twMerge(
        sortedData.length === 0 ? '' : 'border border-slate-200',
        bodyClassName
      )}>
        <Table className={sortedData.length === 0 ? 'border-collapse' : ''}>
          <TableHeader className={stickyHeader ? 'sticky top-0 z-[1]' : undefined}>
            <TableRow>
              {columns.map((column, index) => (
                <TableHead
                  key={column.id}
                  scope="col"
                  className={twMerge(
                    'px-2 sm:px-4 py-1.5 sm:py-2 text-xs font-semibold uppercase tracking-wide text-primary border-b border-slate-200',
                    sortedData.length === 0 && index === 0 ? 'border-l border-slate-200 rounded-tl-lg' : '',
                    sortedData.length === 0 && index === columns.length - 1 ? 'border-r border-slate-200 rounded-tr-lg' : '',
                    sortedData.length === 0 ? 'border-t border-slate-200' : '',
                    column.align === 'right' ? 'text-right' : column.align === 'center' ? 'text-center' : '',
                    column.headerClassName
                  )}
                  onClick={() => column.sortable && handleSortClick(column)}
                >
                  {renderHeaderCell(column)}
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody className={sortedData.length === 0 ? 'divide-y-0' : ''}>
            {sortedData.length === 0 ? (
              <TableRow className="border-0">
                <TableCell
                  colSpan={columns.length}
                  className="px-6 py-10 border-0"
                >
                  {emptyState ?? (
                    <div className="flex min-h-[200px] items-center justify-center text-sm text-slate-500">
                      No data available.
                    </div>
                  )}
                </TableCell>
              </TableRow>
            ) : (
              sortedData.map((item, index) => (
                <TableRow
                  key={getRowKey(item, index)}
                  {...(onRowClick
                    ? {
                        onClick: (e: React.MouseEvent<HTMLTableRowElement>) => {
                          const target = e.target as HTMLElement
                          if (target.closest('button, input, a, [role="button"], [role="checkbox"]')) {
                            return
                          }
                          onRowClick(item, index)
                        },
                        className: 'cursor-pointer'
                      }
                    : { className: '' })}
                >
                  {columns.map((column) => (
                    <TableCell
                      key={column.id}
                      className={twMerge(
                        column.align === 'right'
                          ? 'px-2 sm:px-4 py-1.5 sm:py-2 text-right'
                          : column.align === 'center'
                          ? 'px-2 sm:px-4 py-1.5 sm:py-2 text-center'
                          : 'px-2 sm:px-4 py-1.5 sm:py-2',
                        column.cellClassName
                      )}
                    >
                      {column.render(item, index)}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </TableCardBody>

      {footer}
    </TableCardRoot>
  )
}

export default DividerLineTable

