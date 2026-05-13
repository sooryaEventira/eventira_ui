import React, { useState, useEffect, useCallback } from 'react'
import { XClose, ChevronLeft, ChevronRight } from '@untitled-ui/icons-react'
import {
  fetchCommunicationRecipients,
  fetchRecipientsPage,
  type RecipientItem,
} from '../../../services/communicationService'

interface RecipientsSlideoutProps {
  isOpen: boolean
  onClose: () => void
  communicationTitle: string
  initialTab?: 'received' | 'not_received'
  communicationId: string
  eventUuid: string
  onRetryAll?: () => void
}

const reasonBadgeClass = (code?: string) => {
  if (code === 'opt-out' || code === 'optout') return 'bg-orange-100 text-orange-700'
  return 'bg-red-100 text-red-600'
}

const RecipientsSlideout: React.FC<RecipientsSlideoutProps> = ({
  isOpen,
  onClose,
  communicationTitle,
  initialTab = 'received',
  communicationId,
  eventUuid,
  onRetryAll,
}) => {
  const [activeTab, setActiveTab] = useState<'received' | 'not_received'>(initialTab)
  const [isSlidingIn, setIsSlidingIn] = useState(false)

  const [data, setData] = useState<RecipientItem[]>([])
  const [count, setCount] = useState(0)
  const [nextUrl, setNextUrl] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [startIndex, setStartIndex] = useState(0)
  const [pageStack, setPageStack] = useState<Array<{ url: string; startIndex: number }>>([])
  const [currentUrl, setCurrentUrl] = useState('')

  const loadPage = useCallback(async (fetchFn: () => Promise<Awaited<ReturnType<typeof fetchRecipientsPage>>>) => {
    setIsLoading(true)
    setError(null)
    try {
      const result = await fetchFn()
      setData(result.data)
      setCount(result.count)
      setNextUrl(result.next)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load recipients.')
    } finally {
      setIsLoading(false)
    }
  }, [])

  const resetAndFetch = useCallback((tab: 'received' | 'not_received') => {
    if (!communicationId || !eventUuid) return
    setStartIndex(0)
    setPageStack([])
    setCurrentUrl('')
    loadPage(() => fetchCommunicationRecipients(communicationId, eventUuid, tab))
  }, [communicationId, eventUuid, loadPage])

  useEffect(() => {
    if (isOpen) {
      setActiveTab(initialTab)
      const t = requestAnimationFrame(() => setIsSlidingIn(true))
      return () => cancelAnimationFrame(t)
    }
    setIsSlidingIn(false)
  }, [isOpen, initialTab])

  useEffect(() => {
    if (isOpen && communicationId && eventUuid) {
      resetAndFetch(activeTab)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, activeTab, communicationId, eventUuid])

  useEffect(() => {
    if (!isOpen) return
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [isOpen, onClose])

  const handleTabChange = (tab: 'received' | 'not_received') => {
    if (tab === activeTab) return
    setActiveTab(tab)
  }

  const handleNext = async () => {
    if (!nextUrl) return
    const prevEntry = { url: currentUrl, startIndex }
    setPageStack((s) => [...s, prevEntry])
    const newStart = startIndex + data.length
    setStartIndex(newStart)
    const url = nextUrl
    setCurrentUrl(url)
    await loadPage(() => fetchRecipientsPage(url))
  }

  const handlePrev = async () => {
    if (pageStack.length === 0) return
    const stack = [...pageStack]
    const prev = stack.pop()!
    setPageStack(stack)
    setStartIndex(prev.startIndex)
    setCurrentUrl(prev.url)
    if (!prev.url) {
      await loadPage(() => fetchCommunicationRecipients(communicationId, eventUuid, activeTab))
    } else {
      await loadPage(() => fetchRecipientsPage(prev.url))
    }
  }

  if (!isOpen) return null

  const slideoutTitle =
    activeTab === 'received'
      ? `${communicationTitle} (Successes)`
      : `${communicationTitle} (Failures)`

  const showingFrom = count === 0 ? 0 : startIndex + 1
  const showingTo = startIndex + data.length
  const hasPrev = pageStack.length > 0
  const hasNext = !!nextUrl

  return (
    <>
      <div
        className="fixed top-16 inset-x-0 bottom-0 z-[1005] bg-slate-900/20 backdrop-blur-sm"
        aria-hidden
        onClick={onClose}
      />

      <div
        className={`fixed top-16 right-0 bottom-0 z-[1010] w-full max-w-xl bg-white shadow-xl flex flex-col transition-transform duration-200 ease-out ${isSlidingIn ? 'translate-x-0' : 'translate-x-full'}`}
        role="dialog"
        aria-modal="true"
      >
        {/* Header */}
        <div className="shrink-0 flex items-start justify-between px-6 pt-6 pb-4">
          <h2 className="text-base font-semibold text-slate-900">{slideoutTitle}</h2>
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
              onClick={() => handleTabChange(tab)}
              className={`pb-3 mr-6 text-sm font-medium border-b-2 transition-colors ${
                activeTab === tab
                  ? 'border-primary text-primary'
                  : 'border-transparent text-slate-500 hover:text-slate-700'
              }`}
            >
              {tab === 'received' ? 'Received' : 'Not received'}
            </button>
          ))}
        </div>

        {/* Table */}
        <div className="flex-1 overflow-y-auto">
          {isLoading ? (
            <div className="flex items-center justify-center py-16">
              <div className="inline-block animate-spin rounded-full h-7 w-7 border-b-2 border-primary" />
            </div>
          ) : error ? (
            <div className="px-6 py-10 text-center text-sm text-red-500">{error}</div>
          ) : (
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
                {data.length === 0 ? (
                  <tr>
                    <td
                      colSpan={activeTab === 'not_received' ? 3 : 2}
                      className="px-6 py-10 text-center text-sm text-slate-400"
                    >
                      No records found.
                    </td>
                  </tr>
                ) : (
                  data.map((item, idx) => (
                    <tr key={item.id ?? idx} className="hover:bg-slate-50">
                      <td className="px-6 py-3.5 font-medium text-slate-900">{item.name}</td>
                      <td className="px-6 py-3.5 text-slate-600">{item.email}</td>
                      {activeTab === 'not_received' && (
                        <td className="px-6 py-3.5">
                          <div className="space-y-1">
                            {item.error && (
                              <p className="text-slate-700">{item.error}</p>
                            )}
                            {item.status && (
                              <span className={`inline-block rounded px-1.5 py-0.5 text-xs font-medium ${reasonBadgeClass(item.status)}`}>
                                {item.status}
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
          )}
        </div>

        {/* Pagination */}
        <div className="shrink-0 flex items-center justify-between px-6 py-3 border-t border-slate-200 text-sm text-slate-500">
          <span>
            Showing {showingFrom}–{showingTo} of {count}
          </span>
          <div className="flex items-center gap-1">
            <button
              type="button"
              disabled={!hasPrev || isLoading}
              onClick={handlePrev}
              className="flex items-center gap-1 rounded-md border border-slate-300 px-3 py-1.5 text-sm text-slate-600 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <ChevronLeft className="h-3.5 w-3.5" />
              Previous
            </button>
            <button
              type="button"
              disabled={!hasNext || isLoading}
              onClick={handleNext}
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
                disabled={!onRetryAll || count === 0}
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
