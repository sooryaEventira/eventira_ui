import React, { useEffect, useState } from 'react'
import { Copy01, Mail01 } from '@untitled-ui/icons-react'
import { Button, Input, Select } from '../../ui/untitled'
import Slideout from '../../ui/untitled/Slideout'
import { showToast } from '../../../utils/toast'
import { ROLE_SELECT_OPTIONS } from './teamTypes'

function buildInviteLink(teamInviteUuid: string) {
  const origin = typeof window !== 'undefined' ? window.location.origin : ''
  return `${origin}/dashboard?invite=${teamInviteUuid}`
}

export interface InviteTeamSlideoutProps {
  isOpen: boolean
  onClose: () => void
  onInvite: (email: string, role: string, eventIds?: string[]) => Promise<string | void>
  eventOptions?: Array<{ id: string; name: string }>
}

const InviteTeamSlideout: React.FC<InviteTeamSlideoutProps> = ({
  isOpen,
  onClose,
  onInvite,
  eventOptions = [],
}) => {
  const [email, setEmail] = useState('')
  const [role, setRole] = useState('')
  const [eventIds, setEventIds] = useState<string[]>([])
  const [inviteLink, setInviteLink] = useState('')
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (isOpen) {
      setEmail('')
      setRole('')
      setEventIds([])
      setInviteLink('')
      setLoading(false)
    }
  }, [isOpen])

  const handleCopyLink = async () => {
    if (!inviteLink) return
    try {
      await navigator.clipboard.writeText(inviteLink)
      showToast.success('Link copied')
    } catch {
      showToast.error('Failed to copy link')
    }
  }

  const submit = async () => {
    if (!email.trim() || loading) return
    if (!role) return
    setLoading(true)
    try {
      const teamInviteUuid = await onInvite(email.trim(), role, eventIds.length ? eventIds : undefined)
      if (teamInviteUuid) {
        setInviteLink((current) => current.trim() || buildInviteLink(teamInviteUuid))
      }
      showToast.success('Invite sent.')
    } catch {
      // leave slideout open so user can retry
    } finally {
      setLoading(false)
    }
  }

  const eventSelectOptions = [
    { value: '', label: 'Select events' },
    ...eventOptions.map((e) => ({ value: e.id, label: e.name })),
  ]

  const canEditLink = Boolean(email.trim() && role)

  return (
    <Slideout
      isOpen={isOpen}
      onClose={() => {
        if (!loading) onClose()
      }}
      title="Invite member"
      topOffset={64}
      width={420}
      footer={
        <div className="flex w-full justify-end gap-3">
          <Button type="button" variant="secondary" onClick={onClose} disabled={loading}>
            Cancel
          </Button>
          <Button type="button" variant="primary" onClick={submit} disabled={!email.trim() || !role || loading}>
            {loading ? 'Inviting...' : 'Send invite'}
          </Button>
        </div>
      }
    >
      <div className="space-y-4 px-6 py-4">
        <div>
          <label className="mb-1.5 block text-sm font-medium text-slate-700">
            Email <span className="text-red-500">*</span>
          </label>
          <Input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="Enter email"
            icon={<Mail01 className="h-4 w-4" />}
            className="w-full rounded-md border border-slate-200 focus:border-primary focus:ring-2 focus:ring-primary/20"
          />
        </div>
        <div>
          <label className="mb-1.5 block text-sm font-medium text-slate-700">
            Access level <span className="text-red-500">*</span>
          </label>
          <Select
            value={role}
            onChange={(e) => setRole(e.target.value)}
            options={ROLE_SELECT_OPTIONS}
            className="w-full rounded-md border border-slate-200 focus:border-primary focus:ring-2 focus:ring-primary/20"
          />
        </div>
        <div>
          <label className="mb-1.5 block text-sm font-medium text-slate-700">Events</label>
          <Select
            value={eventIds[0] ?? ''}
            onChange={(e) => setEventIds(e.target.value ? [e.target.value] : [])}
            options={eventSelectOptions}
            className="w-full rounded-md border border-slate-200 focus:border-primary focus:ring-2 focus:ring-primary/20"
          />
        </div>
        <div>
          <label className="mb-1.5 block text-sm font-medium text-slate-700">Copy link</label>
          <div className="flex gap-2">
            <Input
              type="url"
              value={inviteLink}
              onChange={(e) => setInviteLink(e.target.value)}
              disabled={!canEditLink || loading}
              placeholder={
                canEditLink ? 'Enter or paste invite link' : 'Fill email and access level first'
              }
              className="min-w-0 flex-1 rounded-md border border-slate-200 focus:border-primary focus:ring-2 focus:ring-primary/20 disabled:bg-slate-50 disabled:text-slate-500"
            />
            <Button
              type="button"
              variant="secondary"
              onClick={handleCopyLink}
              disabled={!canEditLink || !inviteLink.trim()}
              iconLeading={<Copy01 className="h-4 w-4" />}
              className="shrink-0"
            >
              Copy
            </Button>
          </div>
        </div>
      </div>
    </Slideout>
  )
}

export default InviteTeamSlideout
