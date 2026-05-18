import type { WebsitePageConfigItem } from '../../../services/webpageService'

export interface EventWebsitePageProps {
  onBackClick?: () => void
  userAvatarUrl?: string
  hideNavbarAndSidebar?: boolean
}

export type WebsiteActiveTab = 'website-pages' | 'website-header' | 'website-config'

export type WebsiteConfigRow = {
  configUuid: string
  id: string
  name: string
  type: 'webpage' | 'user-group' | 'schedule'
  icon: string
  browser: WebsitePageConfigItem['browser']
  feature_permission: WebsitePageConfigItem['feature_permission']
  visibility: WebsitePageConfigItem['visibility']
  hide_on_mobile: WebsitePageConfigItem['hide_on_mobile']
  show_in_mobile_menu_without_access: WebsitePageConfigItem['show_in_mobile_menu_without_access']
  is_desktop_home: WebsitePageConfigItem['is_desktop_home']
  is_mobile_home: WebsitePageConfigItem['is_mobile_home']
}
