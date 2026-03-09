import React from 'react'
import PublicAuthTopbar from './PublicAuthTopbar'

const ArrowLeftIcon = ({ className }: { className?: string }) => (
  <svg
    className={className}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden
  >
    <path d="m12 19-7-7 7-7" />
    <path d="M19 12H5" />
  </svg>
)

const EyeIcon = ({ className }: { className?: string }) => (
  <svg
    className={className}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden
  >
    <path d="M1.5 12C3.25 7.75 7.25 5 12 5s8.75 2.75 10.5 7c-1.75 4.25-5.75 7-10.5 7S3.25 16.25 1.5 12Z" />
    <circle cx="12" cy="12" r="3" />
  </svg>
)

const PublicCreatePasswordPage: React.FC = () => {
  return (
    <div className="min-h-screen bg-white">
      <PublicAuthTopbar
        menuTitle="Create password"
        menuItems={[{ label: 'Back to events', href: '/event-list' }]}
      />

      <main className="px-4 pb-12 pt-12 sm:px-6">
        <div className="flex items-start gap-2">
          {/* <button
            type="button"
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-slate-200 bg-[#E0E0E0] text-slate-700"
            aria-label="Back"
          >
            <ArrowLeftIcon className="h-5 w-5" />
          </button> */}

          <div className="min-w-0 flex-1">
            <div className="mx-auto w-full max-w-md">
              <div className="relative z-10 mt-12">
                <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-md sm:p-8">
                  <h1 className="text-center text-lg font-bold leading-6 text-slate-700">
                    Create your password
                  </h1>
                  <p className="mt-1 text-center text-sm font-normal leading-5 text-slate-500">
                    Set a secure password to finish creating your account.
                  </p>

                  <form
                    className="mt-6 space-y-4"
                    onSubmit={(e) => {
                      e.preventDefault()
                    }}
                  >
                    <div>
                      <label className="mb-1 block text-sm font-medium text-black">
                        Password
                      </label>
                      <div className="relative">
                        <input
                          type="password"
                          className="mt-1 block w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 pr-10 text-black placeholder:text-slate-400 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                          placeholder="Enter password"
                        />
                        <button
                          type="button"
                          className="absolute inset-y-0 right-0 flex items-center pr-3 text-slate-400"
                          aria-label="Toggle password visibility"
                        >
                          <EyeIcon className="h-4 w-4" />
                        </button>
                      </div>
                      <p className="mt-1 text-xs text-slate-500">
                        Must be at least 8 characters
                      </p>
                    </div>

                    <button
                      type="submit"
                      className="w-full rounded-lg bg-primary px-4 py-2 text-base font-semibold text-white shadow-sm hover:opacity-95 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2"
                    >
                      Create account
                    </button>
                  </form>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}

export default PublicCreatePasswordPage

