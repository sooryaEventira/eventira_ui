import React from 'react'
import { Plus } from '@untitled-ui/icons-react'
import Button from '../../ui/untitled/Button'
import type { WebsiteActiveTab } from './eventWebsiteTypes'

interface WebsiteTabsBarProps {
  activeTab: WebsiteActiveTab
  onTabChange: (tab: WebsiteActiveTab) => void
  onNewPage: () => void
  onAddMenuItem: () => void
  onAddGroupMenu: () => void
}

const tabClass = (active: boolean) =>
  [
    'relative h-auto rounded-none border-b-2 px-1 pb-3 transition-colors',
    active ? 'border-b-primary text-primary' : 'border-b-transparent text-slate-600 hover:text-slate-900',
  ].join(' ')

const WebsiteTabsBar: React.FC<WebsiteTabsBarProps> = ({
  activeTab,
  onTabChange,
  onNewPage,
  onAddMenuItem,
  onAddGroupMenu,
}) => (
  <div className="flex items-center justify-between border-b border-slate-200 pb-3">
    <div className="flex gap-6">
      <Button variant="tertiary" size="sm" onClick={() => onTabChange('website-pages')} className={tabClass(activeTab === 'website-pages')}>
        Website pages
      </Button>
      <Button variant="tertiary" size="sm" onClick={() => onTabChange('website-header')} className={tabClass(activeTab === 'website-header')}>
        Navigation
      </Button>
      <Button variant="tertiary" size="sm" onClick={() => onTabChange('website-config')} className={tabClass(activeTab === 'website-config')}>
        Configuration
      </Button>
    </div>
    {activeTab === 'website-header' ? (
      <div className="flex items-center gap-3">
        <Button
          variant="secondary"
          size="md"
          onClick={onAddMenuItem}
          iconLeading={<Plus className="h-4 w-4" />}
          className="border-primary bg-white text-primary hover:bg-primary/5"
        >
          Add menu item
        </Button>
        <Button variant="secondary" size="md" onClick={onAddGroupMenu} iconLeading={<Plus className="h-4 w-4" />}>
          Add group menu
        </Button>
      </div>
    ) : activeTab === 'website-pages' ? (
      <Button variant="primary" size="md" onClick={onNewPage} iconLeading={<Plus className="h-4 w-4" />}>
        New page
      </Button>
    ) : null}
  </div>
)

export default WebsiteTabsBar
