import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { Pencil01, Trash03 } from '@untitled-ui/icons-react'
import type { DividerLineTableColumn } from '../../ui/untitled'
import type { OrganizationTableRowData } from './organizationTypes'

interface OrganizationTableColumnsProps {
  selectedOrganizationIds: Set<string>
  onToggleRow: (id: string, checked: boolean) => void
  onEditOrganization?: (organizationId: string) => void
  onDeleteOrganization?: (organizationId: string) => void
}
const tooltipStyle = {
  ul: { listStyleType: 'disc', paddingLeft: '1.5rem', marginBottom: '0.5rem' },
  ol: { listStyleType: 'decimal', paddingLeft: '1.5rem', marginBottom: '0.5rem' },
  p: { marginBottom: '0.5rem' },
  strong: { fontWeight: '600' }
};

const DescriptionTooltipCell: React.FC<{ description: string }> = ({ description }) => {
  const plainText = useMemo(() => {
    if (!description) return '';
    
    return description
      .replace(/<[^>]*>?/gm, '') // Strip actual HTML tags
      .replace(/&nbsp;/g, ' ')   // Replace non-breaking spaces
      .replace(/&[a-z0-9]+;/gi, '') // Strip other HTML entities like &amp;
      .trim();
  }, [description]);
  const anchorRef = useRef<HTMLSpanElement | null>(null)
  const closeTimerRef = useRef<number | null>(null)
  const [open, setOpen] = useState(false)
  const [pos, setPos] = useState<{ top: number; left: number; width: number; place: 'above' | 'below' } | null>(
    null
  )

  const computePos = useCallback(() => {
    const el = anchorRef.current
    if (!el) return

    const rect = el.getBoundingClientRect()
    const margin = 12
    const maxWidth = Math.min(640, Math.max(240, window.innerWidth - margin * 2))

    let left = rect.left
    if (left + maxWidth > window.innerWidth - margin) {
      left = window.innerWidth - margin - maxWidth
    }
    if (left < margin) left = margin

    // If there isn't enough space below, render above the cell.
    const estimatedTooltipHeight = 320
    const place: 'above' | 'below' =
      rect.bottom + 8 + estimatedTooltipHeight > window.innerHeight - margin ? 'above' : 'below'
    const top = place === 'below' ? rect.bottom + 8 : rect.top - 8

    setPos({ top, left, width: maxWidth, place })
  }, [])

  const handleEnter = useCallback(() => {
    if (!plainText) return
    if (closeTimerRef.current) {
      window.clearTimeout(closeTimerRef.current)
      closeTimerRef.current = null
    }
    computePos()
    setOpen(true)
  }, [computePos, plainText])

  const handleLeave = useCallback(() => {
    if (closeTimerRef.current) {
      window.clearTimeout(closeTimerRef.current)
      closeTimerRef.current = null
    }
    closeTimerRef.current = window.setTimeout(() => {
      setOpen(false)
      closeTimerRef.current = null
    }, 160)
  }, [])

  useEffect(() => {
    if (!open) return
    const onWindowChange = () => computePos()
    window.addEventListener('scroll', onWindowChange, true)
    window.addEventListener('resize', onWindowChange)
    return () => {
      window.removeEventListener('scroll', onWindowChange, true)
      window.removeEventListener('resize', onWindowChange)
    }
  }, [open, computePos])

  return (
    <>
      <span
        ref={anchorRef}
        className="block max-w-[420px] whitespace-normal break-words text-sm leading-5 text-slate-600 overflow-hidden"
        style={{
          display: '-webkit-box',
          WebkitLineClamp: 3,
          WebkitBoxOrient: 'vertical'
        }}
        onMouseEnter={handleEnter}
        onMouseLeave={handleLeave}
        onFocus={handleEnter}
        onBlur={handleLeave}
        tabIndex={plainText ? 0 : -1}
      >
        {plainText || '-'}
      </span>

      {open && description && pos
        ? createPortal(
            <div
              className="fixed z-[9999] rounded-md border border-slate-200 bg-white px-3 py-2 text-sm leading-5 text-slate-700 shadow-lg"
              style={{
                top: pos.top,
                left: pos.left,
                width: pos.width,
                transform: pos.place === 'above' ? 'translateY(-100%)' : undefined,
                maxHeight: 'min(480px, 65vh)',
                overflow: 'auto',
                pointerEvents: 'auto'
              }}
              role="tooltip"
              onMouseEnter={handleEnter}
              onMouseLeave={handleLeave}
            >
              <div className="rich-text-content prose prose-sm max-w-none" dangerouslySetInnerHTML={{ __html: description }}/>
            </div>,
            document.body
          )
        : null}
    </>
  )
}

export const useOrganizationTableColumns = ({
  selectedOrganizationIds,
  onToggleRow,
  onEditOrganization,
  onDeleteOrganization
}: OrganizationTableColumnsProps): DividerLineTableColumn<OrganizationTableRowData>[] => {
  return useMemo<DividerLineTableColumn<OrganizationTableRowData>[]>(
    () => [
      {
        id: 'name',
        header: 'Name',
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
          const description = (organization.description || '').trim()
          return <DescriptionTooltipCell description={description} />
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
    [selectedOrganizationIds, onToggleRow, onEditOrganization, onDeleteOrganization]
  )
}

