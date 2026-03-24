import React, { useState } from 'react'
import logoImage from '../assets/images/Logo.png'
import { acceptTeamInvite, revokeTeamInvite } from '../services/teamService'
import { showToast } from '../utils/toast'

/** Org item from token response */
interface OrgItem {
  organization_uuid?: string
  organization_name?: string
  role?: string
  uuid?: string
  name?: string
  id?: string
  [key: string]: any
}

interface PendingInvite {
  invite_uuid: string
  organization_uuid: string
  organization_name: string
  role: string
  invited_by: string | null
  expires_at: string
}

interface OrganizationSelectPageProps {
  onSelect: (org: { uuid: string; name: string; role?: string }) => void
  onNeedToCreateOrg?: () => void
  onLogout?: () => void
}

const ROLE_LABELS: Record<string, string> = {
  team_manager: 'Team Manager',
  event_admin: 'Event Admin',
  organizer: 'Organizer',
}

const ORGANIZATIONS_KEY = 'organizationsFromToken'
const PENDING_INVITES_KEY = 'pendingInvitesFromToken'

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

  const loadPendingInvites = (): PendingInvite[] => {
    try {
      const raw = localStorage.getItem(PENDING_INVITES_KEY)
      if (raw) {
        const parsed = JSON.parse(raw)
        return Array.isArray(parsed) ? parsed : []
      }
    } catch {}
    return []
  }

  const [pendingInvites, setPendingInvites] = useState<PendingInvite[]>(loadPendingInvites)
  const [processingUuid, setProcessingUuid] = useState<string | null>(null)

  const removeInvite = (inviteUuid: string) => {
    setPendingInvites((prev) => {
      const next = prev.filter((i) => i.invite_uuid !== inviteUuid)
      if (next.length === 0) {
        localStorage.removeItem(PENDING_INVITES_KEY)
      } else {
        localStorage.setItem(PENDING_INVITES_KEY, JSON.stringify(next))
      }
      return next
    })
  }

  const handleAccept = async (invite: PendingInvite) => {
    setProcessingUuid(invite.invite_uuid)
    try {
      await acceptTeamInvite(invite.invite_uuid)
      removeInvite(invite.invite_uuid)
      showToast.success(`Joined "${invite.organization_name}" as ${ROLE_LABELS[invite.role] ?? invite.role}.`)
    } catch (error) {
      showToast.error(error instanceof Error ? error.message : 'Failed to accept invitation.')
    } finally {
      setProcessingUuid(null)
    }
  }

  const handleDecline = async (invite: PendingInvite) => {
    setProcessingUuid(invite.invite_uuid)
    try {
      await revokeTeamInvite(invite.invite_uuid)
      removeInvite(invite.invite_uuid)
      showToast.success('Invitation declined.')
    } catch (error) {
      showToast.error(error instanceof Error ? error.message : 'Failed to decline invitation.')
    } finally {
      setProcessingUuid(null)
    }
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

      {/* Pending invitation toasts — fixed top-right */}
      {pendingInvites.length > 0 && (
        <div className="fixed top-4 right-4 z-50 flex flex-col gap-3 w-80">
          {pendingInvites.map((invite) => {
            const isProcessing = processingUuid === invite.invite_uuid
            return (
              <div
                key={invite.invite_uuid}
                className="flex flex-col gap-3 rounded-xl border border-[#E4E7EC] bg-white px-4 py-3 shadow-lg"
              >
                <div className="flex items-start gap-3">
                  <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full bg-[#F5F3FF] text-sm font-bold text-[#6938EF]">
                    {invite.organization_name.charAt(0).toUpperCase()}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold text-[#181D27] truncate">
                      {invite.organization_name}
                    </p>
                    <p className="text-xs text-[#717680]">
                      Invited as{' '}
                      <span className="font-medium text-[#414651]">
                        {ROLE_LABELS[invite.role] ?? invite.role}
                      </span>
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    disabled={isProcessing}
                    onClick={() => handleAccept(invite)}
                    className="flex-1 inline-flex items-center justify-center rounded-lg bg-[#6938EF] px-3 py-1.5 text-xs font-semibold text-white hover:bg-[#5925DC] disabled:opacity-60 disabled:cursor-not-allowed transition-colors"
                  >
                    {isProcessing ? 'Processing…' : 'Accept'}
                  </button>
                  <button
                    type="button"
                    disabled={isProcessing}
                    onClick={() => handleDecline(invite)}
                    className="flex-1 inline-flex items-center justify-center rounded-lg border border-[#D5D7DA] bg-white px-3 py-1.5 text-xs font-semibold text-[#414651] hover:bg-[#F9FAFB] disabled:opacity-60 disabled:cursor-not-allowed transition-colors"
                  >
                    {isProcessing ? 'Processing…' : 'Decline'}
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      )}
      <div className="w-full max-w-md flex flex-col items-center justify-start gap-6 sm:gap-8 bg-white rounded-xl sm:rounded-2xl shadow-[3px_3px_3px_3px_rgba(10,12.67,18,0.04)] p-6 sm:p-8">
        <div className="relative h-12 w-12 sm:h-14 sm:w-14 overflow-hidden rounded-lg">
          <img src={logoImage} alt="Logo" className="h-full w-full object-cover" />
        </div>

        <div className="flex w-full flex-col items-center justify-start gap-2">
          <p className="text-sm sm:text-base font-normal leading-5 sm:leading-6 text-[#414651] text-center max-w-md">
            Select an organization to continue to the dashboard.
          </p>
        </div>

        {/* Organization list */}
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
      </div>
    </div>
  )
}

export default OrganizationSelectPage
