import React from 'react'
import { Settings01 } from '@untitled-ui/icons-react'
import type { WebsitePageConfigItem } from '../../../services/webpageService'
import { renderNavIcon } from '../../../utils/navIcons'
import type { WebsiteConfigRow } from './eventWebsiteTypes'

interface WebsiteConfigurationTabProps {
  pageConfigs: WebsitePageConfigItem[]
  isLoading: boolean
  onConfigure: (configUuid: string, resourceId: string, type: WebsiteConfigRow['type']) => void
}

function toConfigRows(pageConfigs: WebsitePageConfigItem[]): WebsiteConfigRow[] {
  return pageConfigs.map((item) => ({
    configUuid: item.uuid,
    id: String(item.resource_uuid || item.uuid),
    name: String(item.resource_title || item.title || 'Untitled'),
    type:
      item.item_type === 'participant_group'
        ? ('user-group' as const)
        : item.item_type === 'schedule'
          ? ('schedule' as const)
          : ('webpage' as const),
    icon: item.icon?.trim() ? item.icon : '',
    browser: item.browser,
    feature_permission: item.feature_permission,
    visibility: item.visibility,
    hide_on_mobile: item.hide_on_mobile,
    show_in_mobile_menu_without_access: item.show_in_mobile_menu_without_access,
    is_desktop_home: item.is_desktop_home,
    is_mobile_home: item.is_mobile_home,
  }))
}

const WebsiteConfigurationTab: React.FC<WebsiteConfigurationTabProps> = ({
  pageConfigs,
  isLoading,
  onConfigure,
}) => {
  const configRows = toConfigRows(pageConfigs)

  return (
    <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white">
      <table className="min-w-full divide-y divide-slate-200 text-sm">
        <thead className="bg-slate-50">
          <tr>
            {['Page', 'Icon', 'Browser', 'Who has access', 'Visibility', 'Platform', 'Home page', ''].map((col) => (
              <th
                key={col}
                className="whitespace-nowrap px-4 py-3 text-left text-xs font-semibold tracking-wide text-primary"
              >
                {col}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-200">
          {isLoading ? (
            <tr>
              <td colSpan={8} className="px-4 py-8 text-center text-sm text-slate-400">
                Loading configuration...
              </td>
            </tr>
          ) : configRows.length === 0 ? (
            <tr>
              <td colSpan={8} className="px-4 py-8 text-center text-sm text-slate-400">
                No page configuration returned for this event.
              </td>
            </tr>
          ) : (
            configRows.map((item) => (
              <tr key={item.configUuid} className="transition-colors hover:bg-slate-50">
                <td className="whitespace-nowrap px-4 py-3 font-medium capitalize text-slate-900">
                  <div className="flex items-center gap-2">
                    <span>{item.name}</span>
                    {item.type !== 'webpage' && (
                      <span className="inline-flex items-center rounded-full border border-slate-200 bg-slate-50 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-slate-500">
                        {item.type === 'user-group' ? 'User Group' : 'Schedule'}
                      </span>
                    )}
                  </div>
                </td>
                <td className="px-4 py-3 text-slate-500">
                  {item.icon ? (
                    <span className="inline-flex items-center text-slate-700">
                      {renderNavIcon(item.icon, 'h-4 w-4')}
                    </span>
                  ) : (
                    <span className="text-xs text-slate-400">Not added</span>
                  )}
                </td>
                <td className="whitespace-nowrap px-4 py-3 text-slate-600">
                  {item.browser ? String(item.browser).replace(/_/g, ' ') : '-'}
                </td>
                <td className="whitespace-nowrap px-4 py-3 text-slate-600">
                  {item.feature_permission ? String(item.feature_permission).replace(/_/g, ' ') : '-'}
                </td>
                <td className="whitespace-nowrap px-4 py-3 text-slate-600">
                  {item.visibility ? String(item.visibility).replace(/_/g, ' ') : '-'}
                </td>
                <td className="whitespace-nowrap px-4 py-3 text-slate-600">
                  {item.hide_on_mobile ? 'Hide on mobile' : '-'}
                </td>
                <td className="whitespace-nowrap px-4 py-3 text-slate-600">
                  {item.is_desktop_home || item.is_mobile_home ? 'Yes' : '-'}
                </td>
                <td className="px-4 py-3 text-right">
                  <button
                    type="button"
                    onClick={() => onConfigure(item.configUuid, item.id, item.type)}
                    className="rounded p-1.5 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600"
                    aria-label="Configure page"
                  >
                    <Settings01 className="h-4 w-4" />
                  </button>
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  )
}

export default WebsiteConfigurationTab
