import React, { useState, useRef, useEffect } from 'react'
import { Button } from '../../ui/untitled'
import { XClose, Upload01, ChevronDown } from '@untitled-ui/icons-react'
import { useEventForm } from '../../../contexts/EventFormContext'
import { showToast } from '../../../utils/toast'
import { fetchWebsiteSettings, updateWebsiteSettings, getWebsiteSettingsStorageKey, getBrandingStorageKey, type WebsiteSettingsBody } from '../../../services/websiteSettingsService'
import { API_ENDPOINTS } from '../../../config/env'

const BrandingTab: React.FC = () => {
  const { createdEvent } = useEventForm()
  const eventUuid = createdEvent?.uuid ?? (typeof window !== 'undefined' ? localStorage.getItem('currentEventUuid') : null) ?? null

  const [bannerUrl, setBannerUrl] = useState<string>('')
  const [logoUrl, setLogoUrl] = useState<string>('')
  const [logoFile, setLogoFile] = useState<File | null>(null)
  const [bannerFile, setBannerFile] = useState<File | null>(null)

  // Load logo/banner URLs from the API event object
  useEffect(() => {
    const bannerFromApi = createdEvent?.banner && typeof createdEvent.banner === 'string'
      ? (createdEvent.banner as string).replace(/^http:\/\//, 'https://')
      : ''
    const logoFromApi = createdEvent?.logo && typeof createdEvent.logo === 'string'
      ? (createdEvent.logo as string).replace(/^http:\/\//, 'https://')
      : ''
    if (bannerFromApi) setBannerUrl(bannerFromApi)
    if (logoFromApi) setLogoUrl(logoFromApi)
  }, [createdEvent?.banner, createdEvent?.logo])

  const [primaryColor, setPrimaryColor] = useState('#6366f1')
  const [headingFont, setHeadingFont] = useState('Inter')
  const [bodyFont, setBodyFont] = useState('Inter')
  const [showThemeDropdown, setShowThemeDropdown] = useState(false)
  const [isSaving, setIsSaving] = useState(false)

  // When event changes, load from event-scoped storage (or defaults) and refetch from API so we don't show another event's data
  useEffect(() => {
    if (!eventUuid) return
    const key = getBrandingStorageKey(eventUuid)
    const saved = typeof window !== 'undefined' ? localStorage.getItem(key) : null
    const parsed = saved ? (() => { try { return JSON.parse(saved) } catch { return null } })() : null
    if (parsed?.primaryColor) setPrimaryColor(parsed.primaryColor)
    else setPrimaryColor('#6366f1')
    if (parsed?.headingFont) setHeadingFont(parsed.headingFont)
    else setHeadingFont('Inter')
    if (parsed?.bodyFont) setBodyFont(parsed.bodyFont)
    else setBodyFont('Inter')
  }, [eventUuid])

  const resolveMediaUrl = (value: unknown): string => {
    if (!value || typeof value !== 'string') return ''
    const s = value.trim()
    if (!s) return ''
    if (s.startsWith('http://') || s.startsWith('https://')) return s.replace(/^http:\/\//, 'https://')
    if (s.startsWith('/')) {
      try {
        const base = API_ENDPOINTS.WEBSITE.SETTINGS(eventUuid || '').replace(/\/api\/.*/, '')
        return `${base}${s}`
      } catch {
        return s
      }
    }
    return s
  }

  // Fetch saved website settings from API each time Branding tab mounts/opened.
  useEffect(() => {
    if (!eventUuid) return
    let cancelled = false
    fetchWebsiteSettings(eventUuid).then((data) => {
      if (cancelled || !data) return
      if (data.brand_primary_color) setPrimaryColor(String(data.brand_primary_color))
      if (data.heading_font) setHeadingFont(String(data.heading_font))
      if (data.body_font) setBodyFont(String(data.body_font))
      const logo = resolveMediaUrl(data.logo)
      const banner = resolveMediaUrl(data.banner)
      if (logo) setLogoUrl(logo)
      if (banner) setBannerUrl(banner)

      const brandingKey = getBrandingStorageKey(eventUuid)
      localStorage.setItem(brandingKey, JSON.stringify({
        primaryColor: String(data.brand_primary_color ?? '#6366f1'),
        headingFont: String(data.heading_font ?? 'Inter'),
        bodyFont: String(data.body_font ?? 'Inter'),
      }))

      const settingsKey = getWebsiteSettingsStorageKey(eventUuid)
      const current = localStorage.getItem(settingsKey)
      const prev = current ? (() => { try { return JSON.parse(current) } catch { return {} } })() : {}
      localStorage.setItem(settingsKey, JSON.stringify({
        ...prev,
        visibility: data.visibility === 'public' || data.visibility === 'hidden' ? data.visibility : 'private',
        require_registration: Boolean(data.require_registration),
        domain_url: String(data.domain_url ?? ''),
      }))
    }).catch(() => { /* ignore */ })
    return () => { cancelled = true }
  }, [eventUuid])

  const bannerInputRef = useRef<HTMLInputElement>(null)
  const logoInputRef = useRef<HTMLInputElement>(null)
  const dropdownRef = useRef<HTMLDivElement>(null)

  // Color options for the theme picker
  const themeColors = [
    { name: 'Indigo', hex: '#6366f1' },
    { name: 'Purple', hex: '#8b5cf6' },
    { name: 'Blue', hex: '#3b82f6' },
    { name: 'Teal', hex: '#14b8a6' },
    { name: 'Green', hex: '#10b981' },
    { name: 'Emerald', hex: '#059669' },
    { name: 'Rose', hex: '#f43f5e' },
    { name: 'Pink', hex: '#ec4899' },
    { name: 'Orange', hex: '#f97316' },
    { name: 'Amber', hex: '#f59e0b' }
  ]

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowThemeDropdown(false)
      }
    }

    if (showThemeDropdown) {
      document.addEventListener('mousedown', handleClickOutside)
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [showThemeDropdown])

  const handleThemeSelect = (hex: string) => {
    setPrimaryColor(hex)
    setShowThemeDropdown(false)
  }

  const handleBannerUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      setBannerFile(file)
      const reader = new FileReader()
      reader.onload = () => setBannerUrl(reader.result as string)
      reader.readAsDataURL(file)
    }
  }

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      setLogoFile(file)
      const reader = new FileReader()
      reader.onload = () => setLogoUrl(reader.result as string)
      reader.readAsDataURL(file)
    }
  }

  const handleRemoveBanner = () => {
    setBannerUrl('')
    setBannerFile(null)
    if (bannerInputRef.current) bannerInputRef.current.value = ''
  }

  const handleRemoveLogo = () => {
    setLogoUrl('')
    setLogoFile(null)
    if (logoInputRef.current) logoInputRef.current.value = ''
  }

  const handleSave = async () => {
    if (!eventUuid) {
      showToast.error('No event selected')
      return
    }
    setIsSaving(true)
    try {
      const brandingKey = getBrandingStorageKey(eventUuid)
      const settingsKey = getWebsiteSettingsStorageKey(eventUuid)
      localStorage.setItem(brandingKey, JSON.stringify({
        primaryColor,
        headingFont,
        bodyFont
      }))

      const stored = typeof window !== 'undefined' ? localStorage.getItem(settingsKey) : null
      const parsed = stored ? (() => { try { return JSON.parse(stored) } catch { return null } })() : null
      const body: WebsiteSettingsBody = {
        heading_font: headingFont,
        body_font: bodyFont,
        brand_primary_color: primaryColor,
        visibility: parsed?.visibility ?? 'private',
        require_registration: parsed?.require_registration ?? true,
        domain_url: parsed?.domain_url ?? ''
      }
      const files: { logo?: File; banner?: File } = {}
      if (logoFile) files.logo = logoFile
      if (bannerFile) files.banner = bannerFile
      await updateWebsiteSettings(eventUuid, body, Object.keys(files).length ? files : undefined)
      showToast.success('Settings saved')
    } catch (e) {
      showToast.error(e instanceof Error ? e.message : 'Failed to save settings')
    } finally {
      setIsSaving(false)
    }
  }

  const fonts = ['Inter', 'Roboto', 'Open Sans', 'Lato', 'Montserrat', 'Poppins']

  return (
    <div className="space-y-8">
      {/* Banner Section */}
      <div className="space-y-4">
        <div>
          <label className="text-sm font-semibold text-slate-900">Banner</label>
        </div>
        {bannerUrl ? (
          <div className="relative w-full rounded-lg overflow-hidden border border-slate-200" style={{ aspectRatio: '1920/700' }}>
            <img
              src={bannerUrl}
              alt="Banner"
              className="absolute inset-0 w-full h-full object-cover"
            />
            <button
              onClick={handleRemoveBanner}
              className="absolute top-2 right-2 h-6 w-6 rounded-full bg-white/90 backdrop-blur-sm border border-slate-300 flex items-center justify-center hover:bg-white transition shadow-sm z-10"
            >
              <XClose className="h-4 w-4 text-slate-600" />
            </button>
            <div className="absolute bottom-2 right-2 rounded bg-black/40 px-2 py-0.5 text-[10px] text-white z-10">
              1920 × 700
            </div>
          </div>
        ) : (
          <div
            className="w-full border-2 border-dashed border-slate-300 rounded-lg flex flex-col items-center justify-center gap-3 bg-slate-50"
            style={{ aspectRatio: '1920/700' }}
          >
            <p className="text-sm text-slate-500">No banner uploaded</p>
            <p className="text-xs text-slate-400">Recommended: 1920 × 700 px</p>
            <Button
              variant="secondary"
              onClick={() => bannerInputRef.current?.click()}
              iconLeading={<Upload01 className="h-4 w-4" />}
            >
              Upload Banner
            </Button>
          </div>
        )}
        <input
          ref={bannerInputRef}
          type="file"
          accept="image/*"
          onChange={handleBannerUpload}
          className="hidden"
        />
      </div>

      {/* Logo Section */}
      <div className="space-y-4">
        <div>
          <label className="text-sm font-semibold text-slate-900">Logo</label>
          <p className="text-xs text-slate-500 mt-1">Recommended: 500 x 500 px</p>
        </div>
        {logoUrl ? (
          <div className="relative inline-block">
            <img
              src={logoUrl}
              alt="Logo"
              className="h-32 w-32 rounded-lg object-cover"
            />
            <button
              onClick={handleRemoveLogo}
              className="absolute -top-2 -right-2 h-6 w-6 rounded-full bg-white border border-slate-300 flex items-center justify-center hover:bg-slate-50 transition"
            >
              <XClose className="h-4 w-4 text-slate-600" />
            </button>
          </div>
        ) : (
          <div className="border-2 border-dashed border-slate-300 rounded-lg p-8 text-center w-32 h-32 flex flex-col items-center justify-center gap-2">
            <p className="text-xs text-slate-500">No logo</p>
            <Button
              variant="secondary"
              onClick={() => logoInputRef.current?.click()}
              iconLeading={<Upload01 className="h-4 w-4" />}
              size="sm"
            >
              Upload
            </Button>
          </div>
        )}
        <input
          ref={logoInputRef}
          type="file"
          accept="image/*"
          onChange={handleLogoUpload}
          className="hidden"
        />
      </div>

      {/* Brand Colors Section */}
      <div className="space-y-4">
        <label className="text-sm font-semibold text-slate-900">Brand Colors</label>
        <div className="flex items-start gap-4">
          {/* Color Swatch */}
          <div
            className="h-20 w-20 rounded-lg border-2 border-slate-300 flex-shrink-0 flex items-center justify-center"
            style={{ backgroundColor: primaryColor }}
          >
            <span className="text-white text-sm font-medium">{primaryColor}</span>
          </div>
          
          {/* Right side content */}
          <div className="flex-1 space-y-2">
            <div className="relative" ref={dropdownRef}>
              <label className="flex w-full flex-col gap-1">
                <span className="text-xs font-medium uppercase tracking-wide text-slate-500">Primary Color</span>
                <div className="relative">
                  <input
                    type="text"
                    value={primaryColor}
                    onChange={(e) => setPrimaryColor(e.target.value)}
                    className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 pr-32 text-sm text-slate-700 shadow-sm transition placeholder:text-slate-400 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                    placeholder="#6366f1"
                  />
                  <Button
                    variant="primary"
                    onClick={() => setShowThemeDropdown(!showThemeDropdown)}
                    iconTrailing={<ChevronDown className={`h-4 w-4 transition-transform ${showThemeDropdown ? 'rotate-180' : ''}`} />}
                    className="absolute right-1 top-1/2 -translate-y-1/2 h-8"
                    size="sm"
                  >
                    Pick theme
                  </Button>
                </div>
              </label>
              
              {/* Theme Dropdown */}
              {showThemeDropdown && (
                <div className="absolute right-0 top-full mt-1 w-64 rounded-lg border border-slate-200 bg-white shadow-lg z-50 max-h-80 overflow-y-auto">
                  <div className="p-2">
                    {themeColors.map((color) => (
                      <button
                        key={color.hex}
                        type="button"
                        onClick={() => handleThemeSelect(color.hex)}
                        className="w-full flex items-center gap-3 px-3 py-2 rounded-md hover:bg-slate-50 transition-colors text-left"
                      >
                        <div
                          className="h-8 w-8 rounded border border-slate-300 flex-shrink-0"
                          style={{ backgroundColor: color.hex }}
                        />
                        <div className="flex-1">
                          <div className="text-sm font-medium text-slate-900">{color.name}</div>
                          <div className="text-xs text-slate-500">{color.hex}</div>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
            <p className="text-xs text-slate-500">Used for links, buttons.</p>
          </div>
        </div>
      </div>

      {/* Typography Section */}
      <div className="space-y-6">
        <label className="text-sm font-semibold text-slate-900">Typography</label>
        
        {/* Heading Font */}
        <div className="space-y-3">
          <label className="text-sm font-medium text-slate-700">Heading Font</label>
          <select
            value={headingFont}
            onChange={(e) => setHeadingFont(e.target.value)}
            className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
          >
            {fonts.map((font) => (
              <option key={font} value={font}>
                {font}
              </option>
            ))}
          </select>
          <p className="text-sm text-slate-600" style={{ fontFamily: headingFont }}>
            Brown fox jumped through the loop
          </p>
        </div>

        {/* Body Font */}
        <div className="space-y-3">
          <label className="text-sm font-medium text-slate-700">Body Font</label>
          <select
            value={bodyFont}
            onChange={(e) => setBodyFont(e.target.value)}
            className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
          >
            {fonts.map((font) => (
              <option key={font} value={font}>
                {font}
              </option>
            ))}
          </select>
          <p className="text-sm text-slate-600" style={{ fontFamily: bodyFont }}>
            Brown fox jumped through the loop
          </p>
        </div>
      </div>

      {/* Save button */}
      <div className="pt-6 border-t border-slate-200">
        <Button
          variant="primary"
          onClick={handleSave}
          disabled={isSaving}
        >
          {isSaving ? 'Saving...' : 'Save'}
        </Button>
      </div>
    </div>
  )
}

export default BrandingTab

