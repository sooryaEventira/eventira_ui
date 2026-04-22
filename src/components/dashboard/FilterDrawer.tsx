import React, { useState, useRef, useEffect } from 'react'
import { X } from '@untitled-ui/icons-react'

interface FilterDrawerProps {
  isOpen: boolean
  onClose: () => void
  onApply: (filters: FilterState) => void
  createdByOptions?: Array<{ name: string; id: string; avatar?: string }>
  currentFilters?: FilterState
}

export interface FilterState {
  status?: string
  attendanceType?: string
  registrationCount?: string
  userCount?: string
  createdBy?: string[]
}

const FilterDrawer: React.FC<FilterDrawerProps> = ({
  isOpen,
  onClose,
  onApply,
  createdByOptions = [],
  currentFilters = {}
}) => {
  const [position, setPosition] = useState({ x: 50, y: 50 })
  const [isDragging, setIsDragging] = useState(false)
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 })
  const drawerRef = useRef<HTMLDivElement>(null)
  const headerRef = useRef<HTMLDivElement>(null)

  // Filter state
  const [filters, setFilters] = useState<FilterState>(currentFilters)
  const [searchTerm, setSearchTerm] = useState('')

  useEffect(() => {
    setFilters(currentFilters)
  }, [currentFilters])

  // Handle dragging
  const handleMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!headerRef.current?.contains(e.currentTarget)) return
    
    setIsDragging(true)
    if (drawerRef.current) {
      const rect = drawerRef.current.getBoundingClientRect()
      setDragOffset({
        x: e.clientX - rect.left,
        y: e.clientY - rect.top
      })
    }
  }

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isDragging) return
      
      setPosition({
        x: e.clientX - dragOffset.x,
        y: e.clientY - dragOffset.y
      })
    }

    const handleMouseUp = () => {
      setIsDragging(false)
    }

    if (isDragging) {
      document.addEventListener('mousemove', handleMouseMove)
      document.addEventListener('mouseup', handleMouseUp)
    }

    return () => {
      document.removeEventListener('mousemove', handleMouseMove)
      document.removeEventListener('mouseup', handleMouseUp)
    }
  }, [isDragging, dragOffset])

  const handleStatusChange = (value: string) => {
    setFilters({ ...filters, status: value === 'all' ? undefined : value })
  }

  const handleAttendanceTypeChange = (value: string) => {
    setFilters({ ...filters, attendanceType: value === 'all' ? undefined : value })
  }

  const handleCreatedByToggle = (userId: string) => {
    const current = filters.createdBy || []
    const updated = current.includes(userId)
      ? current.filter(id => id !== userId)
      : [...current, userId]
    setFilters({ ...filters, createdBy: updated.length > 0 ? updated : undefined })
  }

  const handleClearAll = () => {
    setFilters({})
    setSearchTerm('')
  }

  const handleApply = () => {
    onApply(filters)
    onClose()
  }

  if (!isOpen) return null

  const filteredUsers = createdByOptions.filter(user =>
    user.name.toLowerCase().includes(searchTerm.toLowerCase())
  )

  return (
    <>
      {/* Overlay */}
      <div
        className="fixed inset-0 bg-black/20 z-40"
        onClick={onClose}
      />

      {/* Draggable Filter Panel */}
      <div
        ref={drawerRef}
        style={{
          position: 'fixed',
          right: `${position.x}px`,
          top: `${position.y}px`,
          cursor: isDragging ? 'grabbing' : 'grab',
          zIndex: 50
        }}
        className="w-60 bg-white rounded-xl shadow-2xl border border-gray-200"
      >
        {/* Header */}
        <div
          ref={headerRef}
          onMouseDown={handleMouseDown}
          className="flex items-center justify-between p-4 border-b border-gray-200 cursor-grab active:cursor-grabbing"
        >
          <h3 className="text-lg font-semibold text-slate-900">Filters</h3>
          <button
            onClick={onClose}
            className="p-1 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="h-5 w-5 text-slate-500" />
          </button>
        </div>

        {/* Content */}
        <div className="max-h-[500px] overflow-y-auto p-4 space-y-6">
          {/* Status */}
          <div>
            <label className="block text-sm font-semibold text-slate-900 mb-3">
              Status
            </label>
            <div className="space-y-2">
              {['All', 'Live', 'Draft'].map((status) => (
                <label key={status} className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="radio"
                    name="status"
                    value={status.toLowerCase()}
                    checked={
                      (status === 'All' && !filters.status) ||
                      filters.status === status.toLowerCase()
                    }
                    onChange={(e) => handleStatusChange(e.target.value)}
                    className="w-4 h-4 text-blue-600 rounded-full"
                  />
                  <span className="text-sm text-slate-700">{status}</span>
                </label>
              ))}
            </div>
          </div>

          {/* Attendance Type */}
          <div>
            <label className="block text-sm font-semibold text-slate-900 mb-3">
              Attendance Type
            </label>
            <div className="space-y-2">
              {['All', 'Virtual', 'In-person', 'Hybrid'].map((type) => (
                <label key={type} className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="radio"
                    name="attendance"
                    value={type.toLowerCase()}
                    checked={
                      (type === 'All' && !filters.attendanceType) ||
                      filters.attendanceType === type.toLowerCase()
                    }
                    onChange={(e) => handleAttendanceTypeChange(e.target.value)}
                    className="w-4 h-4 text-blue-600 rounded-full"
                  />
                  <span className="text-sm text-slate-700">{type}</span>
                </label>
              ))}
            </div>
          </div>

          {/* Registrations */}
          <div>
            <label className="block text-sm font-semibold text-slate-900 mb-2">
              Registrations
            </label>
            <select
              value={filters.registrationCount || ''}
              onChange={(e) => setFilters({ ...filters, registrationCount: e.target.value || undefined })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm text-gray-600 appearance-none bg-white cursor-pointer hover:border-gray-400"
              style={{
                backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='8' viewBox='0 0 12 8'%3E%3Cpath fill='%23666' d='M1 1l5 5 5-5'/%3E%3C/svg%3E")`,
                backgroundRepeat: 'no-repeat',
                backgroundPosition: 'right 8px center',
                paddingRight: '28px'
              }}
            >
              <option value="">Select registrant count</option>
              <option value="1-10">1-10</option>
              <option value="11-50">11-50</option>
              <option value="51-100">51-100</option>
              <option value="100+">100+</option>
            </select>
          </div>

          {/* Total user count */}
          <div>
            <label className="block text-sm font-semibold text-slate-900 mb-2">
              Total user count
            </label>
            <select
              value={filters.userCount || ''}
              onChange={(e) => setFilters({ ...filters, userCount: e.target.value || undefined })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm text-gray-600 appearance-none bg-white cursor-pointer hover:border-gray-400"
              style={{
                backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='8' viewBox='0 0 12 8'%3E%3Cpath fill='%23666' d='M1 1l5 5 5-5'/%3E%3C/svg%3E")`,
                backgroundRepeat: 'no-repeat',
                backgroundPosition: 'right 8px center',
                paddingRight: '28px'
              }}
            >
              <option value="">Select user count</option>
              <option value="1-50">1-50</option>
              <option value="51-200">51-200</option>
              <option value="201-500">201-500</option>
              <option value="500+">500+</option>
            </select>
          </div>

          {/* Created by */}
          <div>
            <label className="block text-sm font-semibold text-slate-900 mb-3">
              Created by
            </label>
            <div className="relative mb-3">
              <input
                type="text"
                placeholder="Search"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm placeholder:text-gray-400"
              />
            </div>
            <div className="space-y-2 max-h-48 overflow-y-auto">
              {filteredUsers.length > 0 ? (
                filteredUsers.map((user) => (
                  <label key={user.id} className="flex items-center gap-3 cursor-pointer hover:bg-gray-50 p-2 rounded-lg">
                    <input
                      type="checkbox"
                      checked={filters.createdBy?.includes(user.id) || false}
                      onChange={() => handleCreatedByToggle(user.id)}
                      className="w-4 h-4 text-blue-600 rounded"
                    />
                    {user.avatar && (
                      <img src={user.avatar} alt={user.name} className="w-6 h-6 rounded-full" />
                    )}
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium text-slate-900 truncate">{user.name}</div>
                    </div>
                  </label>
                ))
              ) : (
                <div className="text-sm text-gray-500 py-4 text-center">No users found</div>
              )}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between gap-3 p-4 border-t border-gray-200 bg-gray-50">
          <button
            onClick={handleClearAll}
            className="px-4 py-2 text-sm font-medium text-slate-700 hover:bg-gray-200 rounded-lg transition-colors"
          >
            Clear all
          </button>
          <button
            onClick={handleApply}
            className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors"
          >
            Apply
          </button>
        </div>
      </div>
    </>
  )
}

export default FilterDrawer
