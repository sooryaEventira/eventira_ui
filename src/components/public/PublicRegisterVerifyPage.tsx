import React from 'react'
import PublicAuthTopbar from './PublicAuthTopbar'

interface PublicRegisterVerifyPageProps {
  eventName?: string
}

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

const PublicRegisterVerifyPage: React.FC<PublicRegisterVerifyPageProps> = ({ eventName }) => {

  return (
    <div className="min-h-screen bg-white">
      <PublicAuthTopbar
        menuTitle="Verify email"
        menuItems={[{ label: 'Back to events', href: '/event-list' }]}
      />

      <main className="px-4 pb-12 pt-12 sm:px-6">
        <div className="flex items-start gap-2">
          <button
            type="button"
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-slate-200 bg-[#E0E0E0] text-slate-700"
            aria-label="Back"
          >
            <ArrowLeftIcon className="h-5 w-5" />
          </button>

          <div className="min-w-0 flex-1">
            <div className="mx-auto w-full max-w-md">
              <div className="relative z-10 mt-12">
                <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-md sm:p-8">
                  <h1 className="text-center text-lg font-bold leading-6 text-slate-700">
                    Verify your email {eventName ? `for ${eventName}` : ''}
                  </h1>
                  <p className="mt-1 text-center text-sm font-normal  leading-5 text-slate-500">
                    Enter the 6-digit code sent to your email.
                  </p>

                  <form
                    className="mt-6 space-y-6"
                    onSubmit={(e) => {
                      e.preventDefault()
                    }}
                  >
                    <div>
                      <label className="mb-2 block text-sm font-medium text-left text-slate-700">
                        Code verification
                      </label>
                      <div className="flex items-center justify-center  gap-6">
                        {Array.from({ length: 6 }).map((_, idx) => (
                          <input
                            key={idx}
                            type="text"
                            inputMode="numeric"
                            maxLength={1}
                            defaultValue=""
                            className="h-12 w-12 rounded-lg border border-slate-300 bg-white text-center text-xl font-semibold text-slate-900 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                          />
                        ))}
                      </div>
                    </div>

                    <button
                      type="submit"
                      className="w-full rounded-lg bg-primary px-4 py-2 text-base font-semibold text-white shadow-sm hover:opacity-95 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 disabled:opacity-70"
                    >
                      Verify code
                    </button>

                    <p className="text-center text-sm text-slate-600">
                      Didn&apos;t receive the code?{' '}
                      <button
                        type="button"
                        className="font-semibold text-primary hover:underline"
                      >
                        Resend
                      </button>
                    </p>
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

export default PublicRegisterVerifyPage

