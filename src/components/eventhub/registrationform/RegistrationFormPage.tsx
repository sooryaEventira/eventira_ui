import React, { useMemo, useState } from 'react'
import registrationBanner from '../../../assets/images/registrationform-banner.png'
import { InfoCircle } from '@untitled-ui/icons-react'
import { showToast } from '../../../utils/toast'

interface RegistrationFormPageProps {
  hideNavbarAndSidebar?: boolean
}

const RegistrationFormPage: React.FC<RegistrationFormPageProps> = ({ hideNavbarAndSidebar = false }) => {
  // This page is currently used inside EventHubPage with navbar/sidebar already shown.
  // If needed elsewhere, this flag keeps it consistent with other embedded pages.
  void hideNavbarAndSidebar

  const [bannerLink, setBannerLink] = useState('')
  const [pageDescription, setPageDescription] = useState('')

  const linkToCopy = useMemo(() => {
    if (typeof window === 'undefined') return ''
    const origin = window.location.origin
    const path = window.location.pathname || '/event/hub'
    if (path.includes('/event/hub')) {
      return `${origin}${path}?section=registration-form`
    }
    return `${origin}/event/hub?section=registration-form`
  }, [])

  const handleCopyLink = async () => {
    try {
      if (navigator?.clipboard?.writeText) {
        await navigator.clipboard.writeText(linkToCopy)
      } else {
        const el = document.createElement('textarea')
        el.value = linkToCopy
        el.setAttribute('readonly', 'true')
        el.style.position = 'fixed'
        el.style.left = '-9999px'
        document.body.appendChild(el)
        el.select()
        document.execCommand('copy')
        document.body.removeChild(el)
      }
      showToast.success('Link copied')
    } catch {
      showToast.error('Failed to copy link')
    }
  }

  return (
    <div className="space-y-8 px-4 pb-12 pt-8 md:px-10 lg:px-16">
      <div className="flex items-center justify-between gap-4">
        <h1 className="text-[26px] font-bold text-primary-dark">Registration Form</h1>
        <button
          type="button"
          onClick={handleCopyLink}
          className="inline-flex items-center justify-center rounded-md bg-[#6938EF] px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-[#5925DC] focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
        >
          Copy link
        </button>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Left: Preview */}
        <div className="rounded-xl border border-slate-200 bg-white p-6">
          <div className="mx-auto w-full max-w-[520px] rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="overflow-hidden rounded-xl">
              <img
                src={bannerLink || registrationBanner}
                onError={(e) => {
                  ;(e.currentTarget as HTMLImageElement).src = registrationBanner
                }}
                alt="Registration banner"
                className="h-[88px] w-full object-cover"
              />
            </div>

            <h2 className="mt-4 text-center text-base font-semibold text-slate-900">Registration Form</h2>

            <form className="mt-4 space-y-4">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-slate-700">
                    First name <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    placeholder="First name"
                    className="w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:border-[#6938EF] focus:outline-none focus:ring-2 focus:ring-[#6938EF]/15"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-slate-700">
                    Last name <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    placeholder="Last name"
                    className="w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:border-[#6938EF] focus:outline-none focus:ring-2 focus:ring-[#6938EF]/15"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-medium text-slate-700">
                  Email <span className="text-rose-500">*</span>
                </label>
                <input
                  type="email"
                  placeholder="Email"
                  className="w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:border-[#6938EF] focus:outline-none focus:ring-2 focus:ring-[#6938EF]/15"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-medium text-slate-700">Affiliation</label>
                <input
                  type="text"
                  placeholder="Affiliation"
                  className="w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:border-[#6938EF] focus:outline-none focus:ring-2 focus:ring-[#6938EF]/15"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-medium text-slate-700">Country</label>
                <input
                  type="text"
                  placeholder="Country"
                  className="w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:border-[#6938EF] focus:outline-none focus:ring-2 focus:ring-[#6938EF]/15"
                />
              </div>

              <button
                type="button"
                className="mt-2 inline-flex w-full items-center justify-center rounded-md bg-[#6938EF] px-4 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-[#5925DC] focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
              >
                Register
              </button>
            </form>

            <button
              type="button"
              className="mt-6 inline-flex w-full items-center justify-center gap-2 rounded-md border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
            >
              Add a new field <span className="text-lg leading-none text-slate-500">+</span>
            </button>
          </div>
        </div>

        {/* Right: Settings */}
        <div className="rounded-xl border border-slate-200 bg-white p-6">
          <div className="space-y-5">
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-slate-700">Banner link</label>
              <input
                type="url"
                value={bannerLink}
                onChange={(e) => setBannerLink(e.target.value)}
                placeholder="https://banner-link"
                className="w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:border-[#6938EF] focus:outline-none focus:ring-2 focus:ring-[#6938EF]/15"
              />
            </div>

            <div className="space-y-1.5">
              <div className="flex items-center gap-1.5">
                <label className="text-xs font-medium text-slate-700">Page description</label>
                <InfoCircle className="h-4 w-4 text-slate-400" aria-hidden="true" />
              </div>
              <textarea
                value={pageDescription}
                onChange={(e) => setPageDescription(e.target.value)}
                placeholder="Page description"
                rows={6}
                className="w-full resize-none rounded-md border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:border-[#6938EF] focus:outline-none focus:ring-2 focus:ring-[#6938EF]/15"
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default RegistrationFormPage

