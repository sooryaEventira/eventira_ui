import React from 'react'
import { InfoCircle, CodeBrowser, Globe01 } from '@untitled-ui/icons-react'
import Button from '../ui/untitled/Button'

interface SidebarItem {
  id: string
  label: string
  icon?: React.ReactNode
  subItems?: SidebarItem[]
}

interface EventHubSidebarProps {
  items?: SidebarItem[]
  activeItemId?: string
  onItemClick?: (itemId: string) => void
  isModalOpen?: boolean
}

const defaultItems: SidebarItem[] = [
  { id: 'summary', label: 'Summary', icon: <InfoCircle className="h-5 w-5" /> },
  { id: 'event-website', label: 'Event website', icon: <CodeBrowser className="h-5 w-5" /> },
  { id: 'event-hub', label: 'Event Hub', icon: <Globe01 className="h-5 w-5" /> }
]

const EventHubSidebar: React.FC<EventHubSidebarProps> = ({
  items = defaultItems,
  activeItemId = 'event-hub',
  onItemClick,
  isModalOpen = false
}) => {
  const [isMobileOpen, setIsMobileOpen] = React.useState(false)
  const [expandedItems, setExpandedItems] = React.useState<string[]>([])
  
  // Normalize activeItemId - use default if undefined or empty
  const normalizedActiveItemId = activeItemId || 'event-hub'

  // Keep parent items expanded if they are active or if any of their sub-items are active
  // Also clear expanded items that are no longer relevant
  React.useEffect(() => {
    const newExpandedItems: string[] = []
    
    items.forEach((item) => {
      if (item.subItems && item.subItems.length > 0) {
        const isParentActive = item.id === normalizedActiveItemId
        const hasActiveSubItem = item.subItems.some((subItem) => subItem.id === normalizedActiveItemId)
        if (isParentActive || hasActiveSubItem) {
          newExpandedItems.push(item.id)
        }
      }
    })
    
    setExpandedItems(newExpandedItems)
  }, [normalizedActiveItemId, items])

  const handleItemClick = (itemId: string, hasSubItems: boolean) => {
    if (hasSubItems) {
      // Toggle expansion for items with sub-items
      setExpandedItems((prev) =>
        prev.includes(itemId) ? prev.filter((id) => id !== itemId) : [...prev, itemId]
      )
    } else {
      if (onItemClick) {
        onItemClick(itemId)
      }
      setIsMobileOpen(false)
    }
  }

  const handleSubItemClick = (itemId: string) => {
    if (onItemClick) {
      onItemClick(itemId)
    }
    setIsMobileOpen(false)
  }

  const toggleMobileSidebar = () => {
    setIsMobileOpen((prev) => !prev)
  }

  const isExpanded = (itemId: string) => {
    return expandedItems.includes(itemId)
  }
  const hasSubItems = (item: SidebarItem): boolean => !!(item.subItems && item.subItems.length > 0)

  return (
    <>
      <button
        type="button"
        onClick={toggleMobileSidebar}
        className="fixed left-4 top-[65px] z-[1000] flex h-8 w-8 items-center justify-center rounded-md border border-slate-50 bg-white text-slate-600 shadow-md transition hover:bg-slate-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 md:hidden"
        aria-label="Toggle navigation"
      >
        <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M3 6H21" />
          <path d="M3 12H21" />
          <path d="M3 18H21" />
        </svg>
      </button>

      {isMobileOpen && (
        <div 
          className="fixed inset-0 z-[998] bg-black/20 backdrop-blur-sm md:hidden"
          onClick={() => setIsMobileOpen(false)}
          aria-hidden="true"
        />
      )}

      <aside
        className={`fixed left-0 top-0 z-[999] h-screen w-[250px] border-r border-slate-200 bg-white shadow-md pt-20 transition-all duration-300 md:translate-x-0 ${
          isMobileOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'
        } ${
          isModalOpen ? 'backdrop-blur-sm bg-white/80' : ''
        }`}
      >
        <div className="py-5">
          {items.map((item) => {
            // Check if this item itself is active
            const isActive = item.id === normalizedActiveItemId
            // Check if any of this item's sub-items are active
            const isActiveSubItem = item.subItems?.some((subItem) => subItem.id === normalizedActiveItemId)
            // Only highlight if this item is active OR it has an active sub-item
            const shouldHighlight = isActive || isActiveSubItem
            
            const hasSubs = hasSubItems(item)
            const isItemExpanded = isExpanded(item.id)

            return (
              <div key={item.id}>
                <button
                  type="button"
                  onClick={() => handleItemClick(item.id, hasSubs)}
                  className={`group flex w-full transform items-center gap-3 border-l-4 px-6 py-3.5 text-left transition-all duration-200 ease-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 ${
                    shouldHighlight
                      ? 'border-l-primary bg-slate-100 shadow-md translate-x-[2px] font-semibold text-slate-700'
                      : 'border-l-transparent text-slate-600 hover:border-l-slate-300 hover:bg-slate-100 hover:text-slate-700 hover:translate-x-[2px] hover:shadow-md'
                  }`}
                >
                  {item.icon && (
                    <span className="flex h-6 w-6 items-center justify-center rounded-md bg-white/60 text-slate-500 group-hover:text-primary" aria-hidden="true">
                      {item.icon}
                    </span>
                  )}
                  <span className="flex-1 justify-start text-base font-semibold font-['Inter'] leading-6 transition-colors duration-200 ease-out group-hover:text-slate-700">
                    {item.label}
                  </span>
                  {hasSubs && (
                    <svg
                      className={`h-4 w-4 text-slate-500 transition-transform duration-200 ${
                        isItemExpanded ? 'rotate-90' : ''
                      }`}
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  )}
                </button>
                {hasSubs && isItemExpanded && (
                  <div className="bg-slate-50/50">
                    {item.subItems!.map((subItem) => {
                      const isSubActive = subItem.id === normalizedActiveItemId
                      return (
                        <button
                          key={subItem.id}
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation()
                            handleSubItemClick(subItem.id)
                          }}
                          className={`group flex w-full transform items-center gap-3 border-l-4 pl-12 pr-6 py-2.5 text-left transition-all duration-200 ease-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 ${
                            isSubActive
                              ? 'border-l-primary bg-slate-100 shadow-sm translate-x-[2px] font-semibold text-slate-700'
                              : 'border-l-transparent text-slate-500 hover:border-l-slate-300 hover:bg-slate-100 hover:text-slate-700 hover:translate-x-[2px]'
                          }`}
                        >
                          {subItem.icon && (
                            <span className="flex h-5 w-5 items-center justify-center rounded-md bg-white/60 text-slate-400 group-hover:text-primary" aria-hidden="true">
                              {subItem.icon}
                            </span>
                          )}
                          <span className="justify-start text-sm font-medium font-['Inter'] leading-5 transition-colors duration-200 ease-out group-hover:text-slate-700">
                            {subItem.label}
                          </span>
                        </button>
                      )
                    })}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </aside>
    </>
  )
}

export default EventHubSidebar

