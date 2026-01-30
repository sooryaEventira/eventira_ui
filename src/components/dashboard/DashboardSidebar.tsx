import React, { useState } from 'react'
import { 
  Home01, 
  Users01, 
  File05, 
  BarChart03, 
  Settings01, 
  CreditCard01,
  ChevronDown,
  XClose
} from '@untitled-ui/icons-react'
import logoImage from '../../assets/images/Logo_text.png'

interface SidebarItem {
  id: string
  label: string
  icon: React.ReactNode
  path?: string
}

interface DashboardSidebarProps {
  organizationName?: string
  activeItemId?: string
  onItemClick?: (itemId: string, path?: string) => void
  onOrganizationChange?: () => void
  isOpen?: boolean
  onClose?: () => void
}

const sidebarItems: SidebarItem[] = [
  { id: 'events', label: 'Events', icon: <Home01 className="h-5 w-5" />, path: '/dashboard' },
  { id: 'team', label: 'Team', icon: <Users01 className="h-5 w-5" />, path: '/dashboard/team' },
  { id: 'templates', label: 'Templates', icon: <File05 className="h-5 w-5" /> },
  { id: 'reports', label: 'Reports', icon: <BarChart03 className="h-5 w-5" /> },
  { id: 'settings', label: 'Settings', icon: <Settings01 className="h-5 w-5" /> },
  { id: 'billing', label: 'Billing', icon: <CreditCard01 className="h-5 w-5" /> },
]

const DashboardSidebar: React.FC<DashboardSidebarProps> = ({
  organizationName = 'Web Summit',
  activeItemId = 'events',
  onItemClick,
  onOrganizationChange,
  isOpen = false,
  onClose
}) => {
  const [isDropdownOpen, setIsDropdownOpen] = useState(false)

  return (
    <>
      {/* Mobile Overlay */}
      {isOpen && (
        <div 
          className="fixed inset-0 z-[45] bg-black/50 backdrop-blur-sm lg:hidden"
          onClick={onClose}
          aria-hidden="true"
        />
      )}

      <aside 
        className={`fixed left-0 top-0 h-screen w-[250px] bg-[#1e1b4b] transform transition-transform duration-300 ease-in-out overflow-y-auto ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        } lg:translate-x-0 lg:z-40`}
        style={isOpen ? { zIndex: 60 } : undefined}
      >
      <div className="w-full min-h-full flex flex-col items-start">
        {/* Logo and Organization Section */}
        <div className="self-stretch px-5 pt-6 pb-4 flex flex-col items-start gap-6 flex-shrink-0">
          {/* Logo and Close Button Row */}
          <div className="w-full flex items-center justify-between gap-2">
            <div className="inline-flex items-center gap-2.5 flex-1 min-w-0">
              <img 
                src={logoImage} 
                alt="Eventira Logo" 
                className="h-10 w-auto max-w-[200px] object-contain"
                onError={() => {
                  console.error('Logo image failed to load:', logoImage)
                }}
              />
            </div>
            {/* Close Button for Mobile */}
            {onClose && (
              <button
                type="button"
                onClick={onClose}
                className="lg:hidden flex items-center justify-center text-white hover:bg-white/30 active:bg-white/40 transition-all -mt-10  shadow-lg bg-white/10 flex-shrink-0"
                aria-label="Close menu"
              >
                <XClose className="h-4 w-4" strokeWidth={2.5} />
              </button>
            )}
          </div>

          {/* Organization Dropdown Card */}
          <div
            className="self-stretch p-3 relative bg-gradient-to-br from-[#3E1C96] to-[#5925DC] rounded-xl outline outline-2 outline-[#4DEF8E] flex items-center justify-between cursor-pointer"
            style={{ outlineOffset: '-2px' }}
            onClick={() => setIsDropdownOpen(!isDropdownOpen)}
          >
            <div className="flex-1 flex items-center gap-2">
              <div className="flex flex-col items-start">
                <div className="text-white text-sm font-semibold leading-5" style={{ fontFamily: 'Inter' }}>
                  {organizationName}
                </div>
              </div>
            </div>
            <div className="p-1.5 overflow-hidden rounded-md flex items-center justify-center">
              <ChevronDown 
                className={`h-4 w-4 text-[#D9D6FE] transition-transform ${isDropdownOpen ? 'rotate-180' : ''}`}
              />
            </div>
          </div>

          {/* Dropdown Menu */}
          {isDropdownOpen && (
            <div className="self-stretch -mt-5 p-3 bg-[rgba(39,17,95,0.95)] rounded-xl border border-[rgba(77,239,142,0.3)]">
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation()
                  setIsDropdownOpen(false)
                  onOrganizationChange?.()
                }}
                className="w-full py-2 px-3 text-left text-white text-sm font-medium rounded-md bg-transparent border-none cursor-pointer hover:bg-white/10 transition-colors"
                style={{ fontFamily: 'Inter' }}
              >
                Switch organization
              </button>
            </div>
          )}
        </div>

        {/* Navigation Menu */}
        <div className="self-stretch px-4 py-4 flex flex-col items-start gap-1 flex-shrink-0">
          {sidebarItems.map((item) => {
            const isActive = item.id === activeItemId
            return (
              <div
                key={item.id}
                className="self-stretch py-0.5 overflow-hidden inline-flex items-center"
              >
                <button
                  type="button"
                  onClick={() => {
                    onItemClick?.(item.id, item.path)
                    onClose?.() // Close sidebar on mobile when item is clicked
                  }}
                  className={`flex-1 flex items-center gap-3 px-3 py-2 ${
                    isActive 
                      ? 'bg-[#4A1FB8] rounded-lg' 
                      : ' rounded-md hover:bg-white/10'
                  } border-none cursor-pointer transition-all duration-200`}
                >
                  <div className="flex-1 flex items-center gap-2">
                    <div className="w-5 h-5 relative overflow-hidden flex items-center justify-center flex-shrink-0">
                      <div className="text-white">
                        {item.icon}
                      </div>
                    </div>
                    <div className="text-white text-base font-semibold leading-6" style={{ fontFamily: 'Inter' }}>
                      {item.label}
                    </div>
                  </div>
                </button>
              </div>
            )
          })}
        </div>
      </div>
    </aside>
    </>
  )
}

export default DashboardSidebar
