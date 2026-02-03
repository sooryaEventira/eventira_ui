import React, { useState, useEffect } from 'react'

const WEBSITE_SETTINGS_API_KEY = 'event-website-settings-api'

const AccessControlTab: React.FC = () => {
  const stored = typeof window !== 'undefined' ? localStorage.getItem(WEBSITE_SETTINGS_API_KEY) : null
  const parsed = stored ? (() => { try { return JSON.parse(stored) } catch { return null } })() : null
  const [visibility, setVisibility] = useState<'public' | 'private' | 'hidden'>(parsed?.visibility ?? 'public')
  const [pages, setPages] = useState({
    home: true,
    speakers: true,
    schedule: true,
    newPage: false
  })
  const [requireRegistration, setRequireRegistration] = useState(parsed?.require_registration ?? true)

  useEffect(() => {
    const current = typeof window !== 'undefined' ? localStorage.getItem(WEBSITE_SETTINGS_API_KEY) : null
    const prev = current ? (() => { try { return JSON.parse(current) } catch { return {} } })() : {}
    const payload = { ...prev, visibility, require_registration: requireRegistration }
    localStorage.setItem(WEBSITE_SETTINGS_API_KEY, JSON.stringify(payload))
  }, [visibility, requireRegistration])

  const handlePageToggle = (page: keyof typeof pages) => {
    setPages(prev => ({
      ...prev,
      [page]: !prev[page]
    }))
  }

  return (
    <div className="space-y-8">
      {/* Visibility Section */}
      <div className="space-y-4">
        <label className="text-sm font-semibold text-slate-900">Visibility</label>
        <div className="flex flex-col ">
          <label className="flex items-center cursor-pointer">
            <input
              type="radio"
              name="visibility"
              value="public"
              checked={visibility === 'public'}
              onChange={(e) => setVisibility(e.target.value as 'public' | 'private' | 'hidden')}
              className="h-4 w-4 text-primary focus:ring-2 focus:ring-primary/20 "
            />
            <span className={`text-sm font-medium px-4 py-2 rounded-lg transition ${
              visibility === 'public'
                ? 'text-primary '
                : 'text-slate-700 hover:border-slate-300'
            }`}>
              Public
            </span>
          </label>
          
          <label className="flex items-center cursor-pointer">
            <input
              type="radio"
              name="visibility"
              value="private"
              checked={visibility === 'private'}
              onChange={(e) => setVisibility(e.target.value as 'public' | 'private' | 'hidden')}
              className="h-4 w-4 text-primary focus:ring-2 focus:ring-primary/20"
            />
            <span className={`text-sm font-medium px-4 py-2 rounded-lg transition ${
              visibility === 'private'
                ? ' text-primary '
                : 'text-slate-700'
            }`}>
              Private
            </span>
          </label>
          
          <label className="flex items-center cursor-pointer">
            <input
              type="radio"
              name="visibility"
              value="hidden"
              checked={visibility === 'hidden'}
              onChange={(e) => setVisibility(e.target.value as 'public' | 'private' | 'hidden')}
              className="h-4 w-4 text-primary focus:ring-2 focus:ring-primary/20 border-slate-300"
            />
            <span className={`text-sm font-medium px-4 py-2 rounded-lg transition ${
              visibility === 'hidden'
                ? 'text-primary'
                : 'border-slate-200 text-slate-700 hover:border-slate-300'
            }`}>
              Hidden
            </span>
          </label>
        </div>
      </div>

      {/* Pages Section */}
      <div className="space-y-4">
        <label className="text-sm font-semibold text-slate-900">Pages</label>
        <div className="flex flex-col ">
          <label className="flex items-center cursor-pointer">
            <input
              type="checkbox"
              checked={pages.home}
              onChange={() => handlePageToggle('home')}
              className="h-4 w-4 rounded border-slate-300 text-primary focus:ring-2 focus:ring-primary/20"
            />
            <span className={`text-sm font-medium px-4 py-2 rounded-lg transition ${
              pages.home
                ? ' text-primary'
                : ' text-slate-700 '
            }`}>
              Home
            </span>
          </label>
          
          <label className="flex items-center cursor-pointer">
            <input
              type="checkbox"
              checked={pages.speakers}
              onChange={() => handlePageToggle('speakers')}
              className="h-4 w-4 rounded border-slate-300 text-primary focus:ring-2 focus:ring-primary/20"
            />
            <span className={`text-sm font-medium px-4 py-2 transition ${
              pages.speakers
                ? 'text-primary '
                : 'text-slate-700 '
            }`}>
              Speakers
            </span>
          </label>
          
          <label className="flex items-center cursor-pointer">
            <input
              type="checkbox"
              checked={pages.schedule}
              onChange={() => handlePageToggle('schedule')}
              className="h-4 w-4 rounded border-slate-300 text-primary focus:ring-2 focus:ring-primary/20"
            />
            <span className={`text-sm font-medium px-4 py-2 transition ${
              pages.schedule
                ? 'text-primary '
                : 'text-slate-700 '
            }`}>
              Schedule
            </span>
          </label>
          
          <label className="flex items-center cursor-pointer">
            <input
              type="checkbox"
              checked={pages.newPage}
              onChange={() => handlePageToggle('newPage')}
              className="h-4 w-4 rounded border-slate-300 text-primary focus:ring-2 focus:ring-primary/20"
            />
            <span className={`text-sm font-medium px-4 py-2 transition ${
              pages.newPage
                ? 'text-primary'
                : ' text-slate-700 '
            }`}>
              New Page
            </span>
          </label>
        </div>
      </div>

      {/* Require Registration Section */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <label className="text-sm font-semibold text-slate-900 block mb-1">Require registration</label>
            <p className="text-xs text-slate-500">Attendees must register to view content</p>
          </div>
          <button
            type="button"
            onClick={() => setRequireRegistration(!requireRegistration)}
            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-primary/20 focus:ring-offset-2 ${
              requireRegistration ? 'bg-primary' : 'bg-slate-300'
            }`}
          >
            <span
              className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                requireRegistration ? 'translate-x-6' : 'translate-x-1'
              }`}
            />
          </button>
        </div>
      </div>
    </div>
  )
}

export default AccessControlTab

