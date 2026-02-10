import React from 'react'
import logoImage from '../assets/images/Logo.png'

/** Org item from token response: organization_uuid, organization_name, role */
interface OrgItem {
  organization_uuid?: string
  organization_name?: string
  role?: string
  uuid?: string
  name?: string
  id?: string
  [key: string]: any
}

interface OrganizationSelectPageProps {
  onSelect: (org: { uuid: string; name: string; role?: string }) => void
  onNeedToCreateOrg?: () => void
  onLogout?: () => void
}

const ORGANIZATIONS_KEY = 'organizationsFromToken'

const OrganizationSelectPage: React.FC<OrganizationSelectPageProps> = ({
  onSelect,
  onNeedToCreateOrg,
  onLogout
}) => {
  let organizations: OrgItem[] = []
  try {
    const raw = localStorage.getItem(ORGANIZATIONS_KEY)
    if (raw) {
      const parsed = JSON.parse(raw)
      organizations = Array.isArray(parsed) ? parsed : []
    }
  } catch {
    organizations = []
  }

  const handleSelect = (org: OrgItem) => {
    const uuid = org.organization_uuid ?? org.uuid ?? org.id
    const name = org.organization_name ?? org.name ?? org.title ?? 'Organization'
    if (uuid) {
      onSelect({
        uuid: String(uuid),
        name: String(name),
        role: org.role ? String(org.role) : undefined
      })
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-white p-4 sm:p-6 lg:p-8">
      <div className="w-full max-w-md flex flex-col items-center justify-start gap-6 sm:gap-8 bg-white rounded-xl sm:rounded-2xl shadow-[3px_3px_3px_3px_rgba(10,12.67,18,0.04)] p-6 sm:p-8">
        <div className="relative h-12 w-12 sm:h-14 sm:w-14 overflow-hidden rounded-lg">
          <img src={logoImage} alt="Logo" className="h-full w-full object-cover" />
        </div>

        <div className="flex w-full flex-col items-center justify-start gap-2">
          <p className="text-sm sm:text-base font-normal leading-5 sm:leading-6 text-[#414651] text-center max-w-md">
            Select an organization to continue to the dashboard.
          </p>
        </div>

        <div className="flex w-full flex-col items-stretch gap-3">
          {organizations.length === 0 ? (
            <div className="flex flex-col items-center gap-4 py-6">
              <p className="text-center text-sm text-[#717680]">No organizations found. Create one to get started.</p>
              {onNeedToCreateOrg && (
                <button
                  type="button"
                  onClick={onNeedToCreateOrg}
                  className="inline-flex items-center justify-center rounded-lg bg-[#6938EF] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#5925DC]"
                >
                  Create organization
                </button>
              )}
            </div>
          ) : (
            <>
              {organizations.map((org) => {
                const uuid = org.organization_uuid ?? org.uuid ?? org.id
                const name = org.organization_name ?? org.name ?? org.title ?? 'Organization'
                const role = org.role ?? ''
                return (
                  <button
                    key={uuid}
                    type="button"
                    onClick={() => handleSelect(org)}
                    className="flex flex-col items-start gap-0.5 rounded-lg border border-[#D5D7DA] bg-white px-4 py-3 text-left transition-colors hover:border-[#6938EF] hover:bg-[#F5F3FF] focus:outline-none focus:ring-2 focus:ring-[#6938EF]/20"
                  >
                    <span className="text-sm font-semibold text-[#181D27]">{name}</span>
                    {role && <span className="text-xs text-[#717680]">{role}</span>}
                  </button>
                )
              })}
              {onNeedToCreateOrg && (
                <button
                  type="button"
                  onClick={onNeedToCreateOrg}
                  className="mt-2 inline-flex w-full items-center justify-center rounded-lg border-2 border-[#6938EF] bg-white px-4 py-2.5 text-sm font-semibold text-[#6938EF] hover:bg-[#F5F3FF]"
                >
                  + Create new organization
                </button>
              )}
            </>
          )}
        </div>
{/* 
        {onLogout && (
          <button
            type="button"
            onClick={onLogout}
            className="text-sm text-[#717680] hover:text-[#181D27] underline"
          >
            Sign out
          </button>
        )} */}
      </div>
    </div>
  )
}

export default OrganizationSelectPage
