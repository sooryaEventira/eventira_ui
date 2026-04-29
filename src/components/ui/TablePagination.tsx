import React from 'react'

interface TablePaginationProps {
  currentPage: number
  totalPages: number
  onPageChange: (page: number) => void
  totalCount?: number
  itemsPerPage?: number
}

export const TablePagination: React.FC<TablePaginationProps> = ({
  currentPage,
  totalPages,
  onPageChange,
  totalCount,
  itemsPerPage = 10
}) => {
  if (totalPages === 0) return null

  const from = totalCount !== undefined ? (currentPage - 1) * itemsPerPage + 1 : undefined
  const to = totalCount !== undefined ? Math.min(currentPage * itemsPerPage, totalCount) : undefined

  const pageNumbers: (number | string)[] = []
  const maxVisiblePages = 7

  if (totalPages <= maxVisiblePages) {
    for (let i = 1; i <= totalPages; i++) {
      pageNumbers.push(i)
    }
  } else {
    if (currentPage <= 3) {
      for (let i = 1; i <= 3; i++) pageNumbers.push(i)
      pageNumbers.push('...')
      pageNumbers.push(totalPages - 1)
      pageNumbers.push(totalPages)
    } else if (currentPage >= totalPages - 2) {
      pageNumbers.push(1)
      pageNumbers.push(2)
      pageNumbers.push('...')
      for (let i = totalPages - 2; i <= totalPages; i++) pageNumbers.push(i)
    } else {
      pageNumbers.push(1)
      pageNumbers.push('...')
      for (let i = currentPage - 1; i <= currentPage + 1; i++) pageNumbers.push(i)
      pageNumbers.push('...')
      pageNumbers.push(totalPages)
    }
  }

  return (
    <div className="flex flex-col gap-3 border-t border-slate-200 px-3 py-3 sm:flex-row sm:items-center sm:justify-between sm:px-6 sm:py-4">
      {from !== undefined && to !== undefined && totalCount !== undefined ? (
        <span className="text-xs text-slate-500 sm:text-sm">
          Showing {from} to {to} of {totalCount} entries
        </span>
      ) : (
        <span />
      )}
      <div className="flex items-center gap-1 sm:gap-2">
        <button
          type="button"
          onClick={() => onPageChange(Math.max(1, currentPage - 1))}
          disabled={currentPage === 1}
          className="rounded-md border border-slate-200 bg-white px-2.5 py-2 text-xs font-medium text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50 sm:px-3 sm:text-sm"
        >
          <span className="sm:hidden">← Prev</span>
          <span className="hidden sm:inline">← Previous</span>
        </button>
        <div className="flex items-center gap-1 overflow-x-auto">
          {pageNumbers.map((page, idx) => {
            if (page === '...') {
              return (
                <span key={`ellipsis-${idx}`} className="px-1 text-xs text-slate-500 sm:px-2 sm:text-sm">
                  ...
                </span>
              )
            }
            const pageNum = page as number
            const isActive = currentPage === pageNum
            return (
              <button
                key={pageNum}
                type="button"
                onClick={() => onPageChange(pageNum)}
                className={`rounded-md px-2.5 py-2 text-xs font-medium transition sm:px-3 sm:text-sm ${
                  isActive
                    ? 'bg-primary text-white'
                    : 'border border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                }`}
              >
                {pageNum}
              </button>
            )
          })}
        </div>
        <button
          type="button"
          onClick={() => onPageChange(Math.min(totalPages, currentPage + 1))}
          disabled={currentPage === totalPages}
          className="rounded-md border border-slate-200 bg-white px-2.5 py-2 text-xs font-medium text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50 sm:px-3 sm:text-sm"
        >
          <span className="sm:hidden">Next →</span>
          <span className="hidden sm:inline">Next →</span>
        </button>
      </div>
    </div>
  )
}

