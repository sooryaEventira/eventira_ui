import React, { Suspense, lazy } from 'react'

export const LoadingFallback = () => (
  <div className="flex min-h-screen items-center justify-center">
    <div className="h-12 w-12 animate-spin rounded-full border-b-2 border-primary" />
  </div>
)

export const EventHubPage = lazy(() =>
  import('../eventhub').then((m) => ({ default: m.EventHubPage }))
)
export const SchedulePage = lazy(() =>
  import('../eventhub/schedulesession/SchedulePage').then((m) => ({ default: m.default }))
)
export const CommunicationPage = lazy(() =>
  import('../eventhub/communication/CommunicationPage').then((m) => ({ default: m.default }))
)
export const ResourceManagementPage = lazy(() =>
  import('../eventhub/resourcemanagement/ResourceManagementPage').then((m) => ({ default: m.default }))
)
export const AnalyticsPage = lazy(() =>
  import('../eventhub/analytics/AnalyticsPage').then((m) => ({ default: m.default }))
)
export const EditorView = lazy(() =>
  import('../shared/EditorView').then((m) => ({ default: m.default }))
)
export const LoginPage = lazy(() =>
  import('../../pages').then((m) => ({ default: m.LoginPage }))
)
export const RegistrationPage = lazy(() =>
  import('../../pages').then((m) => ({ default: m.RegistrationPage }))
)
export const EmailVerificationPage = lazy(() =>
  import('../../pages').then((m) => ({ default: m.EmailVerificationPage }))
)
export const CreatePasswordPage = lazy(() =>
  import('../../pages').then((m) => ({ default: m.CreatePasswordPage }))
)
export const EventspaceSetupPage = lazy(() =>
  import('../../pages').then((m) => ({ default: m.EventspaceSetupPage }))
)
export const OrganizationSelectPage = lazy(() =>
  import('../../pages').then((m) => ({ default: m.OrganizationSelectPage }))
)
export const DashboardLayout = lazy(() =>
  import('../dashboard/DashboardLayout').then((m) => ({ default: m.default }))
)

export function withSuspense(children: React.ReactNode) {
  return <Suspense fallback={<LoadingFallback />}>{children}</Suspense>
}
