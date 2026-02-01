import React, { useMemo, useState } from 'react'
import type { PublicNavNode } from '../../types/navigation'
import { renderNavIcon } from '../../utils/navIcons'

interface PublicNavbarProps {
  eventName?: string
  logoUrl?: string | null
  items: PublicNavNode[]
  activePath?: string
  onNavigate: (path: string) => void
}

const PublicNavbar: React.FC<PublicNavbarProps> = ({
  eventName,
  logoUrl,
  items,
  activePath,
  onNavigate
}) => {
  void eventName

  const normalizePath = (p?: string) => {
    const s = (p || '').trim()
    if (!s) return ''
    return s.length > 1 && s.endsWith('/') ? s.slice(0, -1) : s
  }

  // Keep section nav highlighted for nested routes like:
  // /events/:uuid/attendees/:attendeeId  -> Attendees
  const isActiveForItem = (currentPath: string, itemPath: string) => {
    const cur = normalizePath(currentPath)
    const base = normalizePath(itemPath)
    return cur === base || (base && cur.startsWith(`${base}/`))
  }

  const isActiveForNode = useMemo(() => {
    const walk = (node: PublicNavNode): boolean => {
      if (node.type === 'page') return isActiveForItem(activePath || '', node.path)
      return (node.children || []).some(walk)
    }
    return walk
  }, [activePath])

  const [mobileOpen, setMobileOpen] = useState(false)
  const [openFolderId, setOpenFolderId] = useState<string | null>(null)
  const [mobileExpanded, setMobileExpanded] = useState<Record<string, boolean>>({})

  const ChevronDown = ({ className }: { className?: string }) => (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="m6 9 6 6 6-6" />
    </svg>
  )

  const Bars = ({ className }: { className?: string }) => (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M4 6h16" />
      <path d="M4 12h16" />
      <path d="M4 18h16" />
    </svg>
  )

  const X = ({ className }: { className?: string }) => (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M18 6 6 18" />
      <path d="M6 6l12 12" />
    </svg>
  )

  const renderDesktopNode = (node: PublicNavNode) => {
    if (node.type === 'page') {
      const isActive = isActiveForItem(activePath || '', node.path)
      return (
        <button
          key={node.id}
          type="button"
          onClick={() => onNavigate(node.path)}
          className={[
            'rounded-lg px-3 py-2 text-sm font-semibold transition-colors',
            isActive ? 'bg-slate-100 text-black' : 'text-white hover:bg-slate-100 hover:text-black'
          ].join(' ')}
        >
          <span className="inline-flex items-center gap-2">
            {renderNavIcon(node.iconKey, 'h-4 w-4')}
            <span>{node.label}</span>
          </span>
        </button>
      )
    }

    const isOpen = openFolderId === node.id
    const isActive = isActiveForNode(node)

    return (
      <div
        key={node.id}
        className="relative"
        onMouseEnter={() => setOpenFolderId(node.id)}
        onMouseLeave={() => setOpenFolderId((prev) => (prev === node.id ? null : prev))}
      >
        <button
          type="button"
          aria-haspopup="menu"
          aria-expanded={isOpen}
          onClick={() => setOpenFolderId((prev) => (prev === node.id ? null : node.id))}
          className={[
            'inline-flex items-center gap-1 rounded-lg px-3 py-2 text-sm font-semibold transition-colors',
            isActive ? 'bg-slate-100 text-black' : 'text-white hover:bg-slate-100 hover:text-black'
          ].join(' ')}
        >
          {node.label}
          <ChevronDown className="h-4 w-4" />
        </button>

        {isOpen ? (
          // Wrapper provides a "hover bridge" (no dead gap),
          // so moving from the folder button to the menu doesn't close it before click.
          <div className="absolute left-0 top-full z-[1100] pt-2">
            <div
              role="menu"
              className="min-w-[220px] rounded-xl border border-slate-200 bg-white p-1 shadow-lg"
            >
              {(node.children || []).map((child) => {
                if (child.type === 'page') {
                  const childActive = isActiveForItem(activePath || '', child.path)
                  return (
                    <button
                      key={child.id}
                      type="button"
                      role="menuitem"
                      onClick={() => {
                        setOpenFolderId(null)
                        onNavigate(child.path)
                      }}
                      className={[
                        'w-full rounded-lg px-3 py-2 text-left text-sm font-semibold transition-colors',
                        childActive ? 'bg-primary/10 text-primary' : 'text-slate-700 hover:bg-slate-50'
                      ].join(' ')}
                    >
                      <span className="inline-flex items-center gap-2">
                        {renderNavIcon(child.iconKey, 'h-4 w-4')}
                        <span>{child.label}</span>
                      </span>
                    </button>
                  )
                }

                // Nested folders (future): render as a section header for now.
                return (
                  <div
                    key={child.id}
                    className="px-3 py-2 text-xs font-semibold uppercase tracking-wide text-slate-400"
                  >
                    {child.label}
                  </div>
                )
              })}
            </div>
          </div>
        ) : null}
      </div>
    )
  }

  return (
    <header className="fixed top-0 left-0 z-[1000] w-full border-b border-slate-200 bg-primary-dark backdrop-blur">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-4 px-4 sm:px-6">
        <button
          type="button"
          onClick={() => {
            // Navigate to the first page node (skip folders).
            const firstPage = (() => {
              const walk = (list: PublicNavNode[]): string | null => {
                for (const it of list) {
                  if (it.type === 'page') return it.path
                  const nested = walk(it.children || [])
                  if (nested) return nested
                }
                return null
              }
              return walk(items) || '/'
            })()
            onNavigate(firstPage)
          }}
          className="flex min-w-0 items-center gap-3 text-left"
          aria-label="Go to home"
        >
          {logoUrl ? (
            <img
              src={logoUrl}
              alt="Event logo"
              className="h-9 w-9 rounded-md object-cover ring-1 ring-slate-200"
            />
          ) : (
            <div className="h-9 w-9 rounded-md bg-slate-100 ring-1 ring-slate-200" />
          )}
          {/* <div className="min-w-0">
            <div className="truncate text-md font-semibold text-white">
              {eventName || 'Event'}
            </div>
           
          </div> */}
        </button>

        <nav className="hidden items-center gap-1 md:flex" aria-label="Primary">
          {items.map(renderDesktopNode)}
        </nav>

        {/* Mobile: hamburger + accordion */}
        <div className="flex items-center gap-2 md:hidden">
          <button
            type="button"
            onClick={() => setMobileOpen((v) => !v)}
            className="inline-flex h-10 w-10 items-center justify-center rounded-lg bg-slate-100 text-slate-800 ring-1 ring-slate-200"
            aria-label={mobileOpen ? 'Close menu' : 'Open menu'}
            aria-expanded={mobileOpen}
          >
            {mobileOpen ? <X className="h-5 w-5" /> : <Bars className="h-5 w-5" />}
          </button>
        </div>
      </div>

      {mobileOpen ? (
        <div className="md:hidden border-t border-slate-200 bg-white">
          <div className="mx-auto max-w-7xl px-4 py-3 sm:px-6">
            <div className="flex flex-col gap-1">
              {items.map((node) => {
                if (node.type === 'page') {
                  const isActive = isActiveForItem(activePath || '', node.path)
                  return (
                    <button
                      key={node.id}
                      type="button"
                      onClick={() => {
                        setMobileOpen(false)
                        onNavigate(node.path)
                      }}
                      className={[
                        'w-full rounded-lg px-3 py-2 text-left text-sm font-semibold transition-colors',
                        isActive ? 'bg-primary/10 text-primary' : 'text-slate-800 hover:bg-slate-50'
                      ].join(' ')}
                    >
                      <span className="inline-flex items-center gap-2">
                        {renderNavIcon(node.iconKey, 'h-4 w-4')}
                        <span>{node.label}</span>
                      </span>
                    </button>
                  )
                }

                const expanded = Boolean(mobileExpanded[node.id])
                const folderActive = isActiveForNode(node)

                return (
                  <div key={node.id} className="rounded-lg border border-slate-200">
                    <button
                      type="button"
                      onClick={() =>
                        setMobileExpanded((prev) => ({ ...prev, [node.id]: !prev[node.id] }))
                      }
                      className={[
                        'flex w-full items-center justify-between gap-2 px-3 py-2 text-left text-sm font-semibold transition-colors',
                        folderActive ? 'bg-primary/10 text-primary' : 'text-slate-800 hover:bg-slate-50'
                      ].join(' ')}
                      aria-expanded={expanded}
                    >
                      <span>{node.label}</span>
                      <ChevronDown className={['h-4 w-4 transition-transform', expanded ? 'rotate-180' : ''].join(' ')} />
                    </button>
                    {expanded ? (
                      <div className="px-2 pb-2">
                        {(node.children || []).map((child) => {
                          if (child.type !== 'page') return null
                          const childActive = isActiveForItem(activePath || '', child.path)
                          return (
                            <button
                              key={child.id}
                              type="button"
                              onClick={() => {
                                setMobileOpen(false)
                                onNavigate(child.path)
                              }}
                              className={[
                                'mt-1 w-full rounded-lg px-3 py-2 text-left text-sm font-semibold transition-colors',
                                childActive ? 'bg-primary/10 text-primary' : 'text-slate-700 hover:bg-slate-50'
                              ].join(' ')}
                            >
                              <span className="inline-flex items-center gap-2">
                                {renderNavIcon(child.iconKey, 'h-4 w-4')}
                                <span>{child.label}</span>
                              </span>
                            </button>
                          )
                        })}
                      </div>
                    ) : null}
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      ) : null}
    </header>
  )
}

export default PublicNavbar

