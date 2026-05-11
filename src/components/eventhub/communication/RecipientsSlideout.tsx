import React, { useState, useEffect } from 'react'
import { XClose, ChevronLeft, ChevronRight } from '@untitled-ui/icons-react'

export interface RecipientReceived {
  name: string
  email: string
}

export interface RecipientNotReceived {
  name: string
  email: string
  reason: string
  reasonCode?: string
}

interface RecipientsSlideoutProps {
  isOpen: boolean
  onClose: () => void
  communicationTitle: string
  initialTab?: 'received' | 'not_received'
  received: RecipientReceived[]
  notReceived: RecipientNotReceived[]
  onRetryAll?: () => void
}

const PAGE_SIZE = 10

const reasonBadgeClass = (code?: string) => {
  if (code === 'opt-out' || code === 'optout') return 'bg-orange-100 text-orange-700'
  return 'bg-red-100 text-red-600'
}

const RecipientsSlideout: React.FC<RecipientsSlideoutProps> = ({
  isOpen,
  onClose,
  communicationTitle,
  initialTab = 'received',
  received,
  notReceived,
  onRetryAll,
}) => {
  const [activeTab, setActiveTab] = useState<'received' | 'not_received'>(initialTab)
  const [receivedPage, setReceivedPage] = useState(1)
  const [notReceivedPage, setNotReceivedPage] = useState(1)
  const [isSlidingIn, setIsSlidingIn] = useState(false)

  useEffect(() => {
    if (isOpen) {
      setActiveTab(initialTab)
      setReceivedPage(1)
      setNotReceivedPage(1)
      const t = requestAnimationFrame(() => setIsSlidingIn(true))
      return () => cancelAnimationFrame(t)
    }
    setIsSlidingIn(false)
  }, [isOpen, initialTab])

  useEffect(() => {
    if (!isOpen) return
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [isOpen, onClose])

  if (!isOpen) return null

  const currentList = activeTab === 'received' ? received : notReceived
  const currentPage = activeTab === 'received' ? receivedPage : notReceivedPage
  const setCurrentPage = activeTab === 'received' ? setReceivedPage : setNotReceivedPage
  const totalPages = Math.max(1, Math.ceil(currentList.length / PAGE_SIZE))
  const startIdx = (currentPage - 1) * PAGE_SIZE
  const pageItems = currentList.slice(startIdx, startIdx + PAGE_SIZE)

  const tabLabel = (tab: 'received' | 'not_received') =>
    tab === 'received' ? 'Received' : 'Not received'

  const slideoutTitle =
    activeTab === 'received'
      ? `${communicationTitle} (Successes)`
      : `${communicationTitle} (Failures)`

  return (
    <>
      {/* Backdrop — starts below the navbar (top-16 = 64 px) */}
      <div
        className="fixed top-16 inset-x-0 bottom-0 z-[1005] bg-slate-900/20 backdrop-blur-sm"
        aria-hidden
        onClick={onClose}
      />

      {/* Panel */}
      <div
        className={`fixed top-16 right-0 bottom-0 z-[1010] w-full max-w-xl bg-white shadow-xl flex flex-col transition-transform duration-200 ease-out ${isSlidingIn ? 'translate-x-0' : 'translate-x-full'}`}
        role="dialog"
        aria-modal="true"
      >
        {/* Header */}
        <div className="shrink-0 flex items-start justify-between px-6 pt-6 pb-4">
          <div>
            <h2 className="text-base font-semibold text-slate-900">{slideoutTitle}</h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="ml-4 rounded-md p-1 text-slate-400 hover:text-slate-600"
          >
            <XClose className="h-5 w-5" />
          </button>
        </div>

        {/* Tabs */}
        <div className="shrink-0 flex border-b border-slate-200 px-6">
          {(['received', 'not_received'] as const).map((tab) => (
            <button
              key={tab}
              type="button"
              onClick={() => setActiveTab(tab)}
              className={`pb-3 mr-6 text-sm font-medium border-b-2 transition-colors ${
                activeTab === tab
                  ? 'border-primary text-primary'
                  : 'border-transparent text-slate-500 hover:text-slate-700'
              }`}
            >
              {tabLabel(tab)}
            </button>
          ))}
        </div>

        {/* Table */}
        <div className="flex-1 overflow-y-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50">
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wide w-1/3">Name</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wide w-1/3">Email</th>
                {activeTab === 'not_received' && (
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wide">Reason</th>
                )}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {pageItems.length === 0 ? (
                <tr>
                  <td
                    colSpan={activeTab === 'not_received' ? 3 : 2}
                    className="px-6 py-10 text-center text-sm text-slate-400"
                  >
                    No records found.
                  </td>
                </tr>
              ) : (
                pageItems.map((item, idx) => (
                  <tr key={idx} className="hover:bg-slate-50">
                    <td className="px-6 py-3.5 font-medium text-slate-900">{item.name}</td>
                    <td className="px-6 py-3.5 text-slate-600">{item.email}</td>
                    {activeTab === 'not_received' && (
                      <td className="px-6 py-3.5">
                        <div className="space-y-1">
                          <p className="text-slate-700">
                            {(item as RecipientNotReceived).reason}
                          </p>
                          {(item as RecipientNotReceived).reasonCode && (
                            <span className={`inline-block rounded px-1.5 py-0.5 text-xs font-medium ${reasonBadgeClass((item as RecipientNotReceived).reasonCode)}`}>
                              {(item as RecipientNotReceived).reasonCode}
                            </span>
                          )}
                        </div>
                      </td>
                    )}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div className="shrink-0 flex items-center justify-between px-6 py-3 border-t border-slate-200 text-sm text-slate-500">
          <span>
            Showing {currentList.length === 0 ? 0 : startIdx + 1}–{Math.min(startIdx + PAGE_SIZE, currentList.length)} of {currentList.length}
          </span>
          <div className="flex items-center gap-1">
            <button
              type="button"
              disabled={currentPage <= 1}
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              className="flex items-center gap-1 rounded-md border border-slate-300 px-3 py-1.5 text-sm text-slate-600 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <ChevronLeft className="h-3.5 w-3.5" />
              Previous
            </button>
            <button
              type="button"
              disabled={currentPage >= totalPages}
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              className="flex items-center gap-1 rounded-md border border-slate-300 px-3 py-1.5 text-sm text-slate-600 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              Next
              <ChevronRight className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>

        {/* Footer */}
        <div className="shrink-0 flex items-center justify-end gap-3 px-6 py-4 border-t border-slate-200 bg-white">
          {activeTab === 'not_received' ? (
            <>
              <button
                type="button"
                onClick={onClose}
                className="rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={onRetryAll}
                disabled={!onRetryAll || notReceived.length === 0}
                className="rounded-lg bg-primary px-4 py-2.5 text-sm font-medium text-white hover:opacity-95 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Retry all
              </button>
            </>
          ) : (
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg bg-primary px-4 py-2.5 text-sm font-medium text-white hover:opacity-95"
            >
              Close
            </button>
          )}
        </div>
      </div>
    </>
  )
}

export default RecipientsSlideout
