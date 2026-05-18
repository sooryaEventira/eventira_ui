import React from 'react'
import type { NavigationContentData, WebpageData } from '../../../services/webpageService'
import WebsitePagesList from './WebsitePagesList'
import WebsiteTabsBar from './WebsiteTabsBar'
import WebsiteConfigurationTab from './WebsiteConfigurationTab'
import WebsiteNavigationPanel from './WebsiteNavigationPanel'
import type { WebsitePageConfigItem } from '../../../services/webpageService'
import type { WebsiteActiveTab } from './eventWebsiteTypes'
import type { WebsiteNavigationPanelProps } from './WebsiteNavigationPanel'

interface EventWebsitePageBodyProps {
  activeTab: WebsiteActiveTab
  onTabChange: (tab: WebsiteActiveTab) => void
  onNewPage: () => void
  onAddMenuItem: () => void
  onAddGroupMenu: () => void
  webpages: WebpageData[]
  navContent: NavigationContentData
  isLoadingWebpages: boolean
  onPageAction: (pageId: string, action: string) => void
  openDropdownId: string | null
  setOpenDropdownId: (id: string | null) => void
  pageConfigs: WebsitePageConfigItem[]
  isLoadingPageConfigs: boolean
  onConfigurePage: (configUuid: string, resourceId: string, type: 'webpage' | 'user-group' | 'schedule') => void
  navigationPanelProps: WebsiteNavigationPanelProps
  contentClassName?: string
}

const EventWebsitePageBody: React.FC<EventWebsitePageBodyProps> = ({
  activeTab,
  onTabChange,
  onNewPage,
  onAddMenuItem,
  onAddGroupMenu,
  webpages,
  navContent,
  isLoadingWebpages,
  onPageAction,
  openDropdownId,
  setOpenDropdownId,
  pageConfigs,
  isLoadingPageConfigs,
  onConfigurePage,
  navigationPanelProps,
  contentClassName = '',
}) => (
  <>
    <WebsiteTabsBar
      activeTab={activeTab}
      onTabChange={onTabChange}
      onNewPage={onNewPage}
      onAddMenuItem={onAddMenuItem}
      onAddGroupMenu={onAddGroupMenu}
    />

    <div className={contentClassName}>
      {activeTab === 'website-pages' && (
        <div className="mt-3 pb-96">
          <div className="overflow-visible rounded-lg border border-slate-200 bg-white">
            <WebsitePagesList
              webpages={webpages}
              navContent={navContent}
              isLoading={isLoadingWebpages}
              onAction={onPageAction}
              openDropdownId={openDropdownId}
              setOpenDropdownId={setOpenDropdownId}
              enableRowClickEdit
            />
          </div>
        </div>
      )}

      {activeTab === 'website-header' && <WebsiteNavigationPanel {...navigationPanelProps} />}

      {activeTab === 'website-config' && (
        <WebsiteConfigurationTab
          pageConfigs={pageConfigs}
          isLoading={isLoadingPageConfigs}
          onConfigure={onConfigurePage}
        />
      )}
    </div>
  </>
)

export default EventWebsitePageBody
