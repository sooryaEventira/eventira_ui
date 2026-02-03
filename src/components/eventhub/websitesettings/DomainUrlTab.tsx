import React, { useState, useEffect } from 'react'
import { ChevronDown } from '@untitled-ui/icons-react'

const WEBSITE_SETTINGS_API_KEY = 'event-website-settings-api'

const DomainUrlTab: React.FC = () => {
  const stored = typeof window !== 'undefined' ? localStorage.getItem(WEBSITE_SETTINGS_API_KEY) : null
  const parsed = stored ? (() => { try { return JSON.parse(stored) } catch { return null } })() : null
  const [subdomain, setSubdomain] = useState(parsed?.subdomain ?? 'HIC2025')
  const [showAdvanced, setShowAdvanced] = useState(false)

  useEffect(() => {
    const current = typeof window !== 'undefined' ? localStorage.getItem(WEBSITE_SETTINGS_API_KEY) : null
    const prev = current ? (() => { try { return JSON.parse(current) } catch { return {} } })() : {}
    const domain_url = subdomain ? `https://${subdomain}.example.com` : ''
    const payload = { ...prev, subdomain, domain_url }
    localStorage.setItem(WEBSITE_SETTINGS_API_KEY, JSON.stringify(payload))
  }, [subdomain])

  return (
    <div className="space-y-8">
      {/* Subdomain Section */}
      <div className="space-y-4">
        <div>
          <label className="text-sm font-semibold text-slate-900">Subdomain</label>
        </div>
        <div>
          <label className="flex w-full flex-col gap-1">
            <span className="text-xs font-medium uppercase tracking-wide text-slate-500">Name</span>
            <div className="flex items-center border border-slate-300 rounded-lg bg-white shadow-sm focus-within:ring-2 focus-within:ring-primary/20 focus-within:border-primary transition">
              <span className="px-3 py-2 text-sm text-slate-500">eventira/</span>
              <input
                type="text"
                value={subdomain}
                onChange={(e) => setSubdomain(e.target.value)}
                className="flex-1 px-3 py-2 text-sm text-slate-700 focus:outline-none border-0 bg-transparent placeholder:text-slate-400"
                placeholder="HIC2025"
              />
              <span className="px-3 py-2 text-sm text-slate-500 bg-slate-200">.com</span>
            </div>
          </label>
        </div>
      </div>

      {/* Advanced Section */}
      <div className="space-y-4">
        <button
          onClick={() => setShowAdvanced(!showAdvanced)}
          className="flex items-center gap-2 text-sm font-medium text-slate-700 hover:text-slate-900 transition-colors"
        >
          Advanced
          <ChevronDown
            className={`h-4 w-4 text-slate-500 transition-transform ${
              showAdvanced ? 'rotate-180' : ''
            }`}
          />
        </button>
        
        {showAdvanced && (
          <div className="pl-4 border-l-2 border-slate-200 space-y-4">
            {/* Advanced options will go here */}
            <p className="text-sm text-slate-500">Advanced domain settings coming soon...</p>
          </div>
        )}
      </div>
    </div>
  )
}

export default DomainUrlTab

