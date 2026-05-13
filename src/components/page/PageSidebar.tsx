import React from 'react'
import clsx from 'clsx'
import { ArrowNarrowLeft } from '@untitled-ui/icons-react'

interface PageSidebarProps {
  pages: Array<{ id: string; name: string }>
  currentPage: string
  currentPageName: string
  onPageSelect: (pageId: string) => void
  onAddPage?: () => void
  onManagePages: () => void
  onShowComponentSidebar?: () => void
  onBackClick?: () => void
  editorMode?: 'blank' | 'template'
}

const PageSidebar: React.FC<PageSidebarProps> = ({
  pages,
  currentPage,
  currentPageName,
  onPageSelect,
  onAddPage,
  onManagePages,
  onShowComponentSidebar,
  onBackClick,
  editorMode = 'template'
}) => {
  // Debug log
  React.useEffect(() => {
    console.log('📋 PageSidebar rendered - onBackClick:', typeof onBackClick, onBackClick ? 'provided' : 'missing')
  }, [onBackClick])

  // Show Add Page button only when editorMode is 'blank'
  const showAddPageButton = editorMode === 'blank' && onAddPage

  return (
  <aside className="flex h-full w-[280px] min-w-[280px] flex-shrink-0 flex-col border-r border-slate-200 bg-white">
    <header className="px-4 pb-3 pt-4 flex-shrink-0">
      <div className="flex items-center gap-2">
        {onBackClick && (
          <button
            type="button"
            onClick={(e) => {
              e.preventDefault()
              e.stopPropagation()
              onBackClick()
            }}
            className="flex h-6 w-6 items-center justify-center text-slate-600 hover:text-slate-900 transition-colors"
            aria-label="Go back"
          >
            <ArrowNarrowLeft className="h-5 w-5" />
          </button>
        )}
        {onShowComponentSidebar && (
          <button
            type="button"
            onClick={onShowComponentSidebar}
            className="flex h-6 w-6 items-center justify-center rounded border border-slate-200 bg-white text-slate-500 transition hover:bg-slate-100"
            aria-label="Show component sidebar"
          >
            <svg
              aria-hidden="true"
              className="h-3.5 w-3.5"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <polyline points="9 18 15 12 9 6" />
            </svg>
          </button>
        )}
        <h2 className="text-[13px] font-bold uppercase tracking-[0.05em] text-slate-700">
          Website Pages
        </h2>
      </div>
    </header>

    {/* Scrollable page list */}
    <div className="flex-1 overflow-y-auto px-3 min-h-0">
      {pages.map((page) => {
          // Check if page is active by ID or by name (case-insensitive)
          // This handles cases where:
          // 1. Page ID matches currentPage (exact match)
          // 2. Page name matches currentPageName (case-insensitive, handles "Welcome" vs "welcome")
          // 3. UUID-based pages where ID differs but name matches
          const isActive = 
            page.id === currentPage || 
            (currentPageName && page.name.toLowerCase() === currentPageName.toLowerCase())
          return (
            <button
              key={page.id}
              type="button"
              onClick={() => onPageSelect(page.id)}
              className={clsx(
                'mb-1 flex w-full items-center rounded-md px-3 py-2 text-sm relative overflow-hidden',
                'transition-all duration-300 ease-in-out',
                'transform',
                isActive
                  ? 'bg-[#6938EF]/10 font-semibold text-[#6938EF] shadow-sm scale-[1.02]'
                  : 'text-slate-700 hover:bg-slate-50 hover:text-slate-900 font-normal hover:scale-[1.01]'
              )}
            >
              {/* Active indicator bar */}
              {isActive && (
                <div className="absolute left-0 top-0 bottom-0 w-1 bg-[#6938EF] rounded-r-full transition-all duration-300 ease-in-out" />
              )}
              <span className={clsx(
                'truncate relative z-10 transition-all duration-300',
                isActive ? 'ml-1' : 'ml-0'
              )}>
                {page.name}
              </span>
            </button>
          )
        })}
      
      {/* Add Page Button - Only shown when editorMode is 'blank' */}
      {showAddPageButton && (
        <button
          type="button"
          onClick={onAddPage}
          className="mt-2 mb-1 flex w-full items-center justify-center gap-2 rounded-md border border-dashed border-slate-300 px-3 py-2 text-sm font-medium text-slate-600 hover:border-[#6938EF] hover:bg-[#6938EF]/5 hover:text-[#6938EF] transition-all duration-200"
          aria-label="Add new page"
        >
          <svg
            className="h-4 w-4"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 4v16m8-8H4"
            />
          </svg>
          <span>Add Page</span>
        </button>
      )}
    </div>

    {/* Footer - Always visible, pinned to bottom */}
    <footer className="flex-shrink-0 border-t border-slate-200 bg-white px-4 py-3">
      <button
        type="button"
        onClick={onManagePages}
        className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 hover:text-slate-900 transition-colors"
        aria-label="Manage pages"
      >
        <svg
          className="h-4 w-4 text-slate-500"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
          />
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
          />
        </svg>
        <span>Manage pages</span>
      </button>
    </footer>
  </aside>
  )
}

export default PageSidebar

