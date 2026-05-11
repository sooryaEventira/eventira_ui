import React, { useMemo, useState } from 'react'
import { useEventForm } from '../../../contexts/EventFormContext'
import EventHubNavbar from '../EventHubNavbar'
import EventHubSidebar from '../EventHubSidebar'
import { defaultCards, ContentCard } from '../EventHubContent'
import { InfoCircle, CodeBrowser, Globe01, RefreshCw01, Download01 } from '@untitled-ui/icons-react'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, LineChart, Line, Legend,
} from 'recharts'

const fmtNumber = (v: unknown) => typeof v === 'number' ? v.toLocaleString() : String(v ?? '')
const fmtUsers = (v: unknown) => `${typeof v === 'number' ? v.toLocaleString() : v} users`
const fmtGB = (v: unknown) => `${v} GB`
import {
  ANALYTICS_TABS, AnalyticsTab,
  activeUsersData, engagementData, devicesData,
  pageViewData, sessionInsightsData, storageData,
} from './analyticsData'

interface AnalyticsPageProps {
  eventName?: string
  isDraft?: boolean
  onBackClick?: () => void
  userAvatarUrl?: string
  onCardClick?: (cardId: string) => void
  hideNavbarAndSidebar?: boolean
}

const AnalyticsPage: React.FC<AnalyticsPageProps> = ({
  eventName: propEventName,
  isDraft: propIsDraft,
  onBackClick,
  userAvatarUrl,
  onCardClick,
  hideNavbarAndSidebar = false,
}) => {
  const { eventData, createdEvent } = useEventForm()
  const eventName = createdEvent?.eventName || eventData?.eventName || propEventName || 'Highly important conference of 2025'
  const isDraft = propIsDraft !== undefined ? propIsDraft : true
  const eventStatus = (createdEvent as { status?: string } | null)?.status ?? (eventData as { status?: string } | null)?.status

  const [activeTab, setActiveTab] = useState<AnalyticsTab>('Active users')
  const [isExportOpen, setIsExportOpen] = useState(false)

  const sidebarItems = useMemo(() => {
    const eventHubSubItems = defaultCards.map((card: ContentCard) => ({
      id: card.id,
      label: card.title,
      icon: card.icon,
    }))
    return [
      { id: 'summary', label: 'Summary', icon: <InfoCircle className="h-5 w-5" /> },
      { id: 'event-website', label: 'Event website', icon: <CodeBrowser className="h-5 w-5" /> },
      { id: 'event-hub', label: 'Event Hub', icon: <Globe01 className="h-5 w-5" />, subItems: eventHubSubItems },
    ]
  }, [])

  const handleSidebarItemClick = (itemId: string) => {
    if (itemId === 'event-hub' && onBackClick) {
      onBackClick()
      return
    }
    if (itemId !== 'analytics' && onCardClick) {
      onCardClick(itemId)
    }
  }

  return (
    <div className={hideNavbarAndSidebar ? '' : 'min-h-screen overflow-x-hidden bg-white'}>
      {!hideNavbarAndSidebar && (
        <>
          <EventHubNavbar
            eventName={eventName}
            isDraft={isDraft}
            eventStatus={eventStatus}
            onBackClick={onBackClick}
            onSearchClick={() => {}}
            onNotificationClick={() => {}}
            onProfileClick={() => {}}
            userAvatarUrl={userAvatarUrl}
          />
          <EventHubSidebar
            items={sidebarItems}
            activeItemId="analytics"
            onItemClick={handleSidebarItemClick}
          />
        </>
      )}

      <div className={hideNavbarAndSidebar ? '' : 'md:pl-[250px]'}>
        <div className="px-8 py-8">
          {/* Header */}
          <div className="mb-6 flex items-center justify-between">
            <h1 className="text-[26px] font-bold text-primary-dark">Analytics</h1>
            <div className="flex items-center gap-3">
              <span className="text-sm text-gray-500">Refreshing in 60s</span>
              <button className="inline-flex items-center gap-2 rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50">
                <RefreshCw01 className="h-4 w-4" />
                Refresh
              </button>
              <div className="relative">
                <button
                  onClick={() => setIsExportOpen(!isExportOpen)}
                  className="inline-flex items-center gap-2 rounded-lg bg-[#6938EF] px-4 py-2 text-sm font-medium text-white hover:bg-[#5925DC]"
                >
                  <Download01 className="h-4 w-4" />
                  Export
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>
                {isExportOpen && (
                  <div className="absolute right-0 z-10 mt-2 w-40 rounded-lg border border-gray-200 bg-white py-1 shadow-lg">
                    <button className="block w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-50">Export as CSV</button>
                    <button className="block w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-50">Export as PDF</button>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Tabs */}
          <div className="mb-8 border-b border-gray-200">
            <nav className="-mb-px flex gap-6">
              {ANALYTICS_TABS.map((tab) => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`whitespace-nowrap border-b-2 pb-3 text-sm font-medium transition-colors ${
                    activeTab === tab
                      ? 'border-[#6938EF] text-[#6938EF]'
                      : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700'
                  }`}
                >
                  {tab}
                </button>
              ))}
            </nav>
          </div>

          {/* Tab Content */}
          {activeTab === 'Active users' && <ActiveUsersTab />}
          {activeTab === 'Engagement' && <EngagementTab />}
          {activeTab === 'Devices' && <DevicesTab />}
          {activeTab === 'Page view' && <PageViewTab />}
          {activeTab === 'Session insights' && <SessionInsightsTab />}
          {activeTab === 'Storage' && <StorageTab />}
        </div>
      </div>
    </div>
  )
}

/* ─── Shared Components ──────────────────────────────────────────── */

function KpiCard({ title, value, subtitle, change }: { title: string; value: string; subtitle?: string; change?: string }) {
  return (
    <div className="rounded-xl border border-gray-200 p-5">
      <p className="text-sm font-medium text-gray-600">{title}</p>
      <p className="mt-2 text-3xl font-semibold text-gray-900">{value}</p>
      {subtitle && <p className="mt-1 text-sm text-[#6938EF]">{subtitle}</p>}
      {change && <p className="mt-1 text-sm text-green-600">{change}</p>}
    </div>
  )
}

function HorizontalBarChart({ title, data }: { title: string; data: { name: string; value: number }[] }) {
  return (
    <div className="rounded-xl border border-gray-200 p-6">
      <h3 className="mb-6 text-base font-medium text-gray-900">{title}</h3>
      <ResponsiveContainer width="100%" height={data.length * 45 + 40}>
        <BarChart data={data} layout="vertical" margin={{ left: 100, right: 30, top: 0, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" horizontal={false} />
          <XAxis type="number" tickFormatter={(v) => v.toLocaleString()} />
          <YAxis type="category" dataKey="name" width={100} tick={{ fontSize: 13 }} />
          <Tooltip formatter={fmtNumber} />
          <Bar dataKey="value" fill="#6938EF" radius={[0, 4, 4, 0]} barSize={20} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}

function DataTable({ title, headers, rows, pagination }: { title: string; headers: string[]; rows: string[][]; pagination?: boolean }) {
  const [currentPage, setCurrentPage] = useState(1)
  const rowsPerPage = 10
  const totalPages = Math.ceil(rows.length / rowsPerPage)
  const displayedRows = pagination ? rows.slice((currentPage - 1) * rowsPerPage, currentPage * rowsPerPage) : rows

  return (
    <div className="rounded-xl border border-gray-200">
      <div className="px-6 py-4">
        <h3 className="text-base font-medium text-gray-900">{title}</h3>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-t border-gray-200 bg-gray-50">
              {headers.map((header) => (
                <th key={header} className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                  {header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {displayedRows.map((row, i) => (
              <tr key={i} className="hover:bg-gray-50">
                {row.map((cell, j) => (
                  <td key={j} className="whitespace-nowrap px-6 py-4 text-sm text-gray-900">
                    {cell}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {pagination && totalPages > 1 && (
        <div className="flex items-center justify-between border-t border-gray-200 px-6 py-3">
          <button
            onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
            disabled={currentPage === 1}
            className="inline-flex items-center gap-1 rounded-lg border border-gray-300 px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
            Previous
          </button>
          <div className="flex gap-2">
            {Array.from({ length: totalPages }, (_, i) => (
              <button
                key={i}
                onClick={() => setCurrentPage(i + 1)}
                className={`h-8 w-8 rounded-lg text-sm font-medium ${currentPage === i + 1 ? 'bg-[#6938EF] text-white' : 'text-gray-700 hover:bg-gray-100'}`}
              >
                {i + 1}
              </button>
            ))}
          </div>
          <button
            onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
            disabled={currentPage === totalPages}
            className="inline-flex items-center gap-1 rounded-lg border border-gray-300 px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
          >
            Next
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
          </button>
        </div>
      )}
    </div>
  )
}

/* ─── Tab Components ─────────────────────────────────────────────── */

function ActiveUsersTab() {
  const d = activeUsersData
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        {d.kpis.map((kpi) => <KpiCard key={kpi.title} title={kpi.title} value={kpi.value} change={kpi.change} />)}
      </div>
      <div className="rounded-xl border border-gray-200 p-6">
        <h3 className="mb-6 text-base font-medium text-gray-900">{d.chartTitle}</h3>
        <ResponsiveContainer width="100%" height={280}>
          <BarChart data={d.chartData} margin={{ left: 20, right: 30, top: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} />
            <XAxis dataKey="month" />
            <YAxis tickFormatter={(v) => v.toLocaleString()} />
            <Tooltip formatter={fmtNumber} />
            <Bar dataKey="users" fill="#6938EF" radius={[4, 4, 0, 0]} barSize={40} />
          </BarChart>
        </ResponsiveContainer>
      </div>
      <DataTable title={d.tableTitle} headers={d.tableHeaders} rows={d.tableRows} />
    </div>
  )
}

function EngagementTab() {
  const d = engagementData
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        {d.kpis.map((kpi) => <KpiCard key={kpi.title} title={kpi.title} value={kpi.value} subtitle={kpi.subtitle} />)}
      </div>
      <HorizontalBarChart title={d.engagementByGroup.title} data={d.engagementByGroup.data} />
      <HorizontalBarChart title={d.commentsBySessions.title} data={d.commentsBySessions.data} />
    </div>
  )
}

function DonutChart({ title, data }: { title: string; data: { name: string; value: number; percentage: string; color: string }[] }) {
  const total = data.reduce((s, d) => s + d.value, 0)
  return (
    <div className="rounded-xl border border-gray-200 p-6">
      <h3 className="mb-6 text-base font-medium text-gray-900">{title}</h3>
      <div className="flex flex-col items-center">
        <ResponsiveContainer width="100%" height={160}>
          <PieChart>
            <Pie data={data} cx="50%" cy="50%" innerRadius={45} outerRadius={65} dataKey="value" paddingAngle={2}>
              {data.map((entry) => <Cell key={entry.name} fill={entry.color} />)}
            </Pie>
            <Tooltip formatter={fmtUsers} />
          </PieChart>
        </ResponsiveContainer>
        <div className="mt-4 w-full space-y-3">
          {data.map((item) => (
            <div key={item.name} className="flex items-center gap-3">
              <div className="flex items-center gap-2 w-24">
                <span className="h-2 w-2 rounded-full" style={{ backgroundColor: item.color }} />
                <span className="text-sm text-gray-600">{item.name}</span>
              </div>
              <div className="flex-1">
                <div className="h-2 w-full rounded-full bg-gray-100">
                  <div className="h-2 rounded-full" style={{ width: `${(item.value / total) * 100}%`, backgroundColor: item.color }} />
                </div>
              </div>
              <span className="w-10 text-right text-sm font-medium text-gray-900">{item.value.toLocaleString()}</span>
              <span className="w-10 text-right text-sm text-gray-500">{item.percentage}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

function DevicesTab() {
  const d = devicesData
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        {d.kpis.map((kpi) => <KpiCard key={kpi.title} title={kpi.title} value={kpi.value} subtitle={kpi.subtitle} />)}
      </div>
      <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
        <DonutChart title={d.platformOS.title} data={d.platformOS.data} />
        <DonutChart title={d.sessionType.title} data={d.sessionType.data} />
      </div>
    </div>
  )
}

function PageViewTab() {
  const d = pageViewData
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        {d.kpis.map((kpi) => <KpiCard key={kpi.title} title={kpi.title} value={kpi.value} subtitle={kpi.subtitle} />)}
      </div>
      <HorizontalBarChart title={d.viewsByPage.title} data={d.viewsByPage.data} />
      <DataTable title={d.tableTitle} headers={d.tableHeaders} rows={d.tableRows} pagination />
    </div>
  )
}

function SessionInsightsTab() {
  const d = sessionInsightsData
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        {d.kpis.map((kpi) => <KpiCard key={kpi.title} title={kpi.title} value={kpi.value} subtitle={kpi.subtitle} />)}
      </div>
      <HorizontalBarChart title={d.sessionEngagement.title} data={d.sessionEngagement.data} />
      <DataTable title={d.tableTitle} headers={d.tableHeaders} rows={d.tableRows} pagination />
    </div>
  )
}

function StorageTab() {
  const d = storageData
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        {d.kpis.map((kpi) => <KpiCard key={kpi.title} title={kpi.title} value={kpi.value} subtitle={kpi.subtitle} />)}
      </div>
      <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
        <DonutChart title={d.storageByType.title} data={d.storageByType.data} />
        <div className="rounded-xl border border-gray-200 p-6">
          <h3 className="mb-6 text-base font-medium text-gray-900">{d.storageOverTime.title}</h3>
          <ResponsiveContainer width="100%" height={240}>
            <LineChart data={d.storageOverTime.data} margin={{ left: 20, right: 30, top: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="month" />
              <YAxis tickFormatter={(v) => `${v} GB`} />
              <Tooltip formatter={fmtGB} />
              <Legend />
              <Line type="monotone" dataKey="storage" stroke="#6938EF" strokeWidth={2} dot={{ fill: '#6938EF', r: 4 }} name="Storage used" />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  )
}

export default AnalyticsPage
