import React, { useEffect, useMemo, useState } from 'react'
import { Render } from '@measured/puck'
import { getPuckConfig } from '../../config/getPuckConfig'
import { fetchPublicWebpage, type PublicWebpageData } from '../../services/publicWebpageService'

type PageData = {
  content: any[]
  root: any
  zones: any
}

const extractPageData = (webpage: PublicWebpageData): PageData | null => {
  const webpageContent = webpage?.content
  if (!webpageContent || typeof webpageContent !== 'object') return null

  const pageKeys = Object.keys(webpageContent)
  if (pageKeys.length === 0) return null

  // Public GET by uuid is expected to contain exactly one top-level key
  const pageKey = pageKeys[0]
  const pageData = webpageContent[pageKey]
  if (!pageData || !pageData.data) return null

  const dataKeys = Object.keys(pageData.data)
  if (dataKeys.length === 0) return null

  const normalizedWebpageSlug = typeof webpage.slug === 'string' ? webpage.slug.toLowerCase() : undefined
  const normalizedPageSlug = typeof pageData.slug === 'string' ? pageData.slug.toLowerCase() : undefined

  let slugKey = dataKeys[0]
  if (normalizedWebpageSlug && dataKeys.includes(normalizedWebpageSlug)) slugKey = normalizedWebpageSlug
  else if (normalizedPageSlug && dataKeys.includes(normalizedPageSlug)) slugKey = normalizedPageSlug

  const slugData = pageData.data[slugKey]
  if (!slugData) return null

  return {
    content: slugData.content || [],
    root: slugData.root || {},
    zones: slugData.zones || {}
  }
}

interface PublicWebpageRendererProps {
  eventUuid: string
  webpageUuid: string
  /** If the webpage GET response includes brand_primary_color, it will be passed here so the shell can apply it. */
  onPrimaryColor?: (color: string | null) => void
}

const PublicWebpageRenderer: React.FC<PublicWebpageRendererProps> = ({
  eventUuid,
  webpageUuid,
  onPrimaryColor
}) => {
  const [webpage, setWebpage] = useState<PublicWebpageData | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    const run = async () => {
      setIsLoading(true)
      setError(null)
      try {
        const data = await fetchPublicWebpage(eventUuid, webpageUuid)
        if (!cancelled) {
          setWebpage(data)
          // If backend includes primary color in webpage GET response, use it for theme
          const color =
            (data as any)?.brand_primary_color?.trim() ||
            (data as any)?.website_settings?.brand_primary_color?.trim() ||
            (data as any)?.websiteSettings?.brand_primary_color?.trim() ||
            null
          if (color && onPrimaryColor) onPrimaryColor(color)
        }
      } catch (e) {
        const msg = e instanceof Error ? e.message : 'Failed to load page.'
        if (!cancelled) setError(msg)
      } finally {
        if (!cancelled) setIsLoading(false)
      }
    }
    run()
    return () => {
      cancelled = true
    }
  }, [eventUuid, webpageUuid, onPrimaryColor])

  const pageData = useMemo(() => (webpage ? extractPageData(webpage) : null), [webpage])
  const pageType = pageData?.root?.props?.pageType
  const pageName = webpage?.name
  const config = useMemo(() => getPuckConfig(pageType, pageName), [pageType, pageName])

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-16">
        <div className="text-sm font-medium text-slate-600">Loading page…</div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="rounded-xl border border-rose-200 bg-rose-50 p-6">
        <div className="text-lg font-semibold text-rose-900">Failed to load page</div>
        <div className="mt-1 text-sm text-rose-800">{error}</div>
      </div>
    )
  }

  if (!webpage || !pageData) {
    return (
      <div className="rounded-xl border border-slate-200 bg-white p-6">
        <div className="text-lg font-semibold text-slate-900">Page not available</div>
        <div className="mt-1 text-sm text-slate-600">
          This page is missing or the response format is unsupported.
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-[50vh]">
      <Render config={config as any} data={pageData as any} />
    </div>
  )
}

export default PublicWebpageRenderer

