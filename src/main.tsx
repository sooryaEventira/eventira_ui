import React, { Suspense, lazy } from 'react'
import ReactDOM from 'react-dom/client'
import { Toaster } from 'react-hot-toast'
import { isPublicRoute } from './utils/routeUtils'
import ErrorBoundary from './components/shared/ErrorBoundary'
import { EventFormProvider } from './contexts/EventFormContext'
import { WebsitePagesProvider } from './contexts/WebsitePagesContext'
import '@fortawesome/fontawesome-free/css/all.min.css'
import './index.css'

// Lazy-load only the app for the current route (public vs dashboard) to avoid loading both
const App = lazy(() => import('./App'))
const PublicApp = lazy(() => import('./components/public/PublicApp').then((m) => ({ default: m.default })))
const Root = isPublicRoute() ? PublicApp : App

const RootFallback = () => (
  <div className="flex min-h-screen items-center justify-center">
    <div className="h-12 w-12 animate-spin rounded-full border-2 border-primary border-t-transparent" />
  </div>
)

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <ErrorBoundary>
      <EventFormProvider>
        <WebsitePagesProvider>
          <Suspense fallback={<RootFallback />}>
            <Root />
          </Suspense>
          <Toaster
            position="top-right"
            // Avoid overlapping fixed headers (e.g. TemplateSelectionPage)
            containerStyle={{ top: 80, right: 16 }}
            toastOptions={{
              // Default duration; specific toasts can still override
              duration: 2500,
            }}
          />
        </WebsitePagesProvider>
      </EventFormProvider>
    </ErrorBoundary>
  </React.StrictMode>,
)
