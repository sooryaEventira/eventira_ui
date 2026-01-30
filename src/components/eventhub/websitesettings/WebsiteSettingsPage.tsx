import React, { useState } from 'react'
import BrandingTab from './BrandingTab'
import DomainUrlTab from './DomainUrlTab'
import SeoTab from './SeoTab'
import AccessControlTab from './AccessControlTab'

interface WebsiteSettingsPageProps {
  hideNavbarAndSidebar?: boolean
}

const WebsiteSettingsPage: React.FC<WebsiteSettingsPageProps> = () => {
  const [activeTab, setActiveTab] = useState<'branding' | 'domain' | 'seo' | 'access'>('branding')

  return (
    <div className="w-full">
      {/* Header */}
      <div className=" bg-white px-8 py-6">
        <h1 className="text-2xl font-bold text-slate-900">Website settings</h1>
      </div>

      {/* Tabs */}
      <div className="border-b border-slate-200 bg-white px-8">
        <div className="flex gap-8">
          <button
            onClick={() => setActiveTab('branding')}
            className={`pb-4 px-1 text-sm font-medium transition-colors ${
              activeTab === 'branding'
                ? 'text-primary border-b-2 border-primary'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Branding
          </button>
          <button
            onClick={() => setActiveTab('domain')}
            className={`pb-4 px-1 text-sm font-medium transition-colors ${
              activeTab === 'domain'
                ? 'text-primary border-b-2 border-primary'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Domain & URL
          </button>
          <button
            onClick={() => setActiveTab('seo')}
            className={`pb-4 px-1 text-sm font-medium transition-colors ${
              activeTab === 'seo'
                ? 'text-primary border-b-2 border-primary'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            SEO
          </button>
          <button
            onClick={() => setActiveTab('access')}
            className={`pb-4 px-1 text-sm font-medium transition-colors ${
              activeTab === 'access'
                ? 'text-primary border-b-2 border-primary'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Access control
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="bg-white px-8 py-8">
        {activeTab === 'branding' && <BrandingTab />}

        {activeTab === 'domain' && <DomainUrlTab />}

        {activeTab === 'seo' && <SeoTab />}

        {activeTab === 'access' && <AccessControlTab />}
      </div>
    </div>
  )
}

export default WebsiteSettingsPage
