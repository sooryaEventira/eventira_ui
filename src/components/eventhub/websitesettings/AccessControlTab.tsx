import React, { useState, useEffect } from 'react'
import { useEventForm } from '../../../contexts/EventFormContext'
import {
  getWebsiteSettingsStorageKey,
  buildWebsiteSettingsBodyFromStorage,
  updateWebsiteSettings,
} from '../../../services/websiteSettingsService'
import { showToast } from '../../../utils/toast'

const AccessControlTab: React.FC = () => {
  const { createdEvent } = useEventForm()
  const eventUuid = createdEvent?.uuid ?? (typeof window !== 'undefined' ? localStorage.getItem('currentEventUuid') : null) ?? null
  const settingsKey = getWebsiteSettingsStorageKey(eventUuid)
  const stored = typeof window !== 'undefined' ? localStorage.getItem(settingsKey) : null
  const parsed = stored ? (() => { try { return JSON.parse(stored) } catch { return null } })() : null
  const [visibility, setVisibility] = useState<'public' | 'private' | 'hidden'>(parsed?.visibility ?? 'public')
  const [pages, setPages] = useState({
    home: true,
    speakers: true,
    schedule: true,
    newPage: false
  })
  const [requireRegistration, setRequireRegistration] = useState(parsed?.require_registration ?? true)

  // When event changes, load from event-scoped storage so we don't show another event's data
  useEffect(() => {
    const current = typeof window !== 'undefined' ? localStorage.getItem(settingsKey) : null
    const prev = current ? (() => { try { return JSON.parse(current) } catch { return {} } })() : {}
    setVisibility(prev?.visibility === 'public' || prev?.visibility === 'hidden' ? prev.visibility : 'private')
    setRequireRegistration(prev?.require_registration ?? true)
  }, [eventUuid, settingsKey])

  useEffect(() => {
    const current = typeof window !== 'undefined' ? localStorage.getItem(settingsKey) : null
    const prev = current ? (() => { try { return JSON.parse(current) } catch { return {} } })() : {}
    const payload = { ...prev, visibility, require_registration: requireRegistration }
    localStorage.setItem(settingsKey, JSON.stringify(payload))
  }, [visibility, requireRegistration, settingsKey])

  const handlePageToggle = (page: keyof typeof pages) => {
    setPages(prev => ({
      ...prev,
      [page]: !prev[page]
    }))
  }

  const persistVisibilityToApi = (newVisibility: 'public' | 'private' | 'hidden') => {
    if (!eventUuid) return
    const body = buildWebsiteSettingsBodyFromStorage(eventUuid)
    body.visibility = newVisibility
    body.require_registration = requireRegistration
    updateWebsiteSettings(eventUuid, body).catch(() => showToast.error('Failed to save visibility'))
  }

  const persistRequireRegistrationToApi = (newValue: boolean) => {
    if (!eventUuid) return
    const body = buildWebsiteSettingsBodyFromStorage(eventUuid)
    body.visibility = visibility
    body.require_registration = newValue
    updateWebsiteSettings(eventUuid, body).catch(() => showToast.error('Failed to save setting'))
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
              onChange={(e) => {
              const v = e.target.value as 'public' | 'private' | 'hidden'
              setVisibility(v)
              persistVisibilityToApi(v)
            }}
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
              onChange={(e) => {
              const v = e.target.value as 'public' | 'private' | 'hidden'
              setVisibility(v)
              persistVisibilityToApi(v)
            }}
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
              onChange={(e) => {
              const v = e.target.value as 'public' | 'private' | 'hidden'
              setVisibility(v)
              persistVisibilityToApi(v)
            }}
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

      {/* Require Registration Section */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <label className="text-sm font-semibold text-slate-900 block mb-1">Require registration</label>
            <p className="text-xs text-slate-500">Attendees must register to view content</p>
          </div>
          <button
            type="button"
            onClick={() => {
              const next = !requireRegistration
              setRequireRegistration(next)
              persistRequireRegistrationToApi(next)
            }}
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

