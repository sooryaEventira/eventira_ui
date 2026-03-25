import { useState, useEffect } from 'react'
import { showToast } from '../utils/toast'
import { verifyRegistrationOtp, createPassword, createOrganization, signIn } from '../services/authService'
import { fetchMyInvitations } from '../services/teamService'

export function hasOrganization(): boolean {
  const orgUuid = localStorage.getItem('organizationUuid')
  const orgName = localStorage.getItem('organizationName')
  return !!(orgUuid && orgName)
}

export interface UseAuthReturn {
  isAuthenticated: boolean
  showRegistration: boolean
  showEmailVerification: boolean
  showCreatePassword: boolean
  showEventspaceSetup: boolean
  showOrganizationSelect: boolean
  registrationEmail: string
  isVerifyingOtp: boolean
  otpVerificationError: string | null
  isCreatingPassword: boolean
  passwordCreationError: string | null
  isCreatingOrganization: boolean
  organizationCreationError: string | null
  setShowRegistration: (v: boolean) => void
  setOtpVerificationError: (v: string | null) => void
  setPasswordCreationError: (v: string | null) => void
  setOrganizationCreationError: (v: string | null) => void
  handleLogin: (email: string, password: string) => Promise<void>
  handleRegistration: (email: string) => void
  handleEmailVerification: (code: string) => Promise<void>
  handlePasswordCreation: (password: string) => Promise<void>
  handleEventspaceSetup: (eventspaceName: string) => Promise<void>
  handleOrganizationSelect: (org: { uuid: string; name: string; role?: string }) => void
  handleNeedToCreateOrg: () => void
  handleLogout: () => void
  handleGoogleSignIn: () => void
  handleMicrosoftSignIn: () => void
  handleMagicLinkSignIn: () => void
  handleResendCode: () => void
}

export function useAuth(
  setCurrentView: (view: string) => void
): UseAuthReturn {
  const [isAuthenticated, setIsAuthenticated] = useState(() => {
    const flag = localStorage.getItem('isAuthenticated') === 'true'
    const token = localStorage.getItem('accessToken')
    if (flag && !token) {
      // Stale auth flag with no token — clear it so invite links show signup
      localStorage.removeItem('isAuthenticated')
      return false
    }
    return flag
  })
  const [showRegistration, setShowRegistration] = useState(false)
  const [showEmailVerification, setShowEmailVerification] = useState(false)
  const [showCreatePassword, setShowCreatePassword] = useState(false)
  const [showEventspaceSetup, setShowEventspaceSetup] = useState(false)
  const [showOrganizationSelect, setShowOrganizationSelect] = useState(false)
  const [registrationEmail, setRegistrationEmail] = useState('')
  const [isVerifyingOtp, setIsVerifyingOtp] = useState(false)
  const [otpVerificationError, setOtpVerificationError] = useState<string | null>(null)
  const [isCreatingPassword, setIsCreatingPassword] = useState(false)
  const [passwordCreationError, setPasswordCreationError] = useState<string | null>(null)
  const [isCreatingOrganization, setIsCreatingOrganization] = useState(false)
  const [organizationCreationError, setOrganizationCreationError] = useState<string | null>(null)

  // On mount: if already authenticated (with a real token) and URL has ?invite= or pending invites exist,
  // fetch invite details from the API and show org select page.
  useEffect(() => {
    if (!isAuthenticated) return
    // Guard against stale isAuthenticated flag — require a real access token
    const accessToken = localStorage.getItem('accessToken')
    if (!accessToken) return

    const params = new URLSearchParams(window.location.search)
    const inviteFromUrl = params.get('invite')
    const hasPendingInStorage = Boolean(localStorage.getItem('pendingInvitesFromToken'))

    if (inviteFromUrl && !hasPendingInStorage) {
      // Invite UUID is in the URL but we have no invite data yet — fetch from API
      fetchMyInvitations()
        .then((invites) => {
          const pending = invites.filter((i) => i.status === 'pending')
          if (pending.length > 0) {
            const mapped = pending.map((i) => ({
              invite_uuid: i.uuid,
              organization_uuid: i.organization.uuid,
              organization_name: i.organization.name,
              role: i.role,
              invited_by: null,
              expires_at: i.expires_at,
            }))
            localStorage.setItem('pendingInvitesFromToken', JSON.stringify(mapped))
            setShowOrganizationSelect(true)
          }
        })
        .catch(() => {
          // API failed — do not force OrgSelectPage; let normal auth flow handle it
        })
    } else if (hasPendingInStorage) {
      setShowOrganizationSelect(true)
    }
  }, [isAuthenticated])

  const handleLogin = async (email: string, password: string) => {
    try {
      const response = await signIn(email, password)
      const organizations = response.data?.organizations

      if (response.data) {
        const { access, refresh } = response.data
        if (access) localStorage.setItem('accessToken', access)
        if (refresh) localStorage.setItem('refreshToken', refresh)
        localStorage.setItem('userEmail', email)

        const pendingInvites = response.data?.pending_invites
        if (Array.isArray(pendingInvites) && pendingInvites.length > 0) {
          localStorage.setItem('pendingInvitesFromToken', JSON.stringify(pendingInvites))
        } else {
          localStorage.removeItem('pendingInvitesFromToken')
        }

        if (organizations && organizations.length > 0) {
          localStorage.setItem('organizationsFromToken', JSON.stringify(organizations))
          if (organizations.length === 1) {
            const o = organizations[0]
            const uuid = o.organization_uuid ?? o.uuid ?? o.id
            const name = o.organization_name ?? o.name ?? o.title
            if (uuid) localStorage.setItem('organizationUuid', String(uuid))
            if (name) localStorage.setItem('organizationName', String(name))
            if (o.role) localStorage.setItem('userRole', String(o.role))
          } else {
            localStorage.removeItem('organizationUuid')
            localStorage.removeItem('organizationName')
            localStorage.removeItem('userRole')
          }
        } else {
          localStorage.removeItem('organizationsFromToken')
          localStorage.removeItem('organizationUuid')
          localStorage.removeItem('organizationName')
        }
      }

      setIsAuthenticated(true)
      localStorage.setItem('isAuthenticated', 'true')
      const hasOrg = hasOrganization()
      const hasPendingInvites = Array.isArray(response.data?.pending_invites) && response.data.pending_invites.length > 0

      if (hasPendingInvites) {
        // Always show org select page so invitee can see & act on pending invitations
        setShowOrganizationSelect(true)
      } else if (hasOrg) {
        setCurrentView('dashboard')
      } else if (organizations && organizations.length > 0) {
        setShowOrganizationSelect(true)
      } else {
        setShowEventspaceSetup(true)
      }
    } catch {
      // Error handled in authService
    }
  }

  const handleRegistration = (email: string) => {
    setRegistrationEmail(email)
    setShowRegistration(false)
    setShowEmailVerification(true)
  }

  const handleEmailVerification = async (code: string) => {
    setIsVerifyingOtp(true)
    setOtpVerificationError(null)
    try {
      const response = await verifyRegistrationOtp(registrationEmail, code)
      if (response.status === 'success') {
        setShowEmailVerification(false)
        setShowCreatePassword(true)
      }
    } catch (error) {
      setOtpVerificationError(
        error instanceof Error ? error.message : 'Failed to verify OTP. Please try again.'
      )
    } finally {
      setIsVerifyingOtp(false)
    }
  }

  const handlePasswordCreation = async (password: string) => {
    setIsCreatingPassword(true)
    setPasswordCreationError(null)
    try {
      const response = await createPassword(registrationEmail, password)
      if (response.data) {
        const { access, refresh, user } = response.data
        if (access) localStorage.setItem('accessToken', access)
        if (refresh) localStorage.setItem('refreshToken', refresh)
        if (user?.email) localStorage.setItem('userEmail', user.email)

        // Save pending invites so OrganizationSelectPage can show them
        const pendingInvites = response.data?.pending_invites
        if (Array.isArray(pendingInvites) && pendingInvites.length > 0) {
          localStorage.setItem('pendingInvitesFromToken', JSON.stringify(pendingInvites))
        } else {
          localStorage.removeItem('pendingInvitesFromToken')
        }

        // Save organizations from token
        const organizations = response.data?.organizations
        if (Array.isArray(organizations) && organizations.length > 0) {
          localStorage.setItem('organizationsFromToken', JSON.stringify(organizations))
        } else {
          localStorage.removeItem('organizationsFromToken')
        }

        setIsAuthenticated(true)
        localStorage.setItem('isAuthenticated', 'true')
        setShowCreatePassword(false)

        const hasPendingInvites = Array.isArray(pendingInvites) && pendingInvites.length > 0
        const hasOrgs = Array.isArray(organizations) && organizations.length > 0

        if (hasPendingInvites || hasOrgs) {
          // Show org select page so the new user can see & act on pending invitations
          setShowOrganizationSelect(true)
        } else {
          setShowEventspaceSetup(true)
        }
      } else {
        setShowCreatePassword(false)
        setShowEventspaceSetup(true)
      }
    } catch (error) {
      setPasswordCreationError(
        error instanceof Error ? error.message : 'Failed to create password. Please try again.'
      )
    } finally {
      setIsCreatingPassword(false)
    }
  }

  const handleEventspaceSetup = async (eventspaceName: string) => {
    setIsCreatingOrganization(true)
    setOrganizationCreationError(null)
    try {
      const organization = await createOrganization(eventspaceName)
      if (organization.uuid) {
        localStorage.setItem('organizationUuid', organization.uuid)
        localStorage.setItem('organizationName', organization.name)
      }
      setIsAuthenticated(true)
      localStorage.setItem('isAuthenticated', 'true')
      setShowEventspaceSetup(false)
      setCurrentView('dashboard')
      showToast.success('Organization created successfully!')
    } catch (error) {
      setOrganizationCreationError(
        error instanceof Error ? error.message : 'Failed to create organization. Please try again.'
      )
    } finally {
      setIsCreatingOrganization(false)
    }
  }

  const handleOrganizationSelect = (org: { uuid: string; name: string; role?: string }) => {
    localStorage.setItem('organizationUuid', org.uuid)
    localStorage.setItem('organizationName', org.name)
    if (org.role) localStorage.setItem('userRole', org.role)
    setShowOrganizationSelect(false)
    setCurrentView('dashboard')
    window.history.pushState({}, '', '/dashboard')
    window.dispatchEvent(new PopStateEvent('popstate'))
  }

  const handleNeedToCreateOrg = () => {
    setShowOrganizationSelect(false)
    setShowEventspaceSetup(true)
  }

  const handleLogout = () => {
    setIsAuthenticated(false)
    localStorage.removeItem('isAuthenticated')
    localStorage.removeItem('accessToken')
    localStorage.removeItem('refreshToken')
    localStorage.removeItem('userEmail')
    localStorage.removeItem('organizationUuid')
    localStorage.removeItem('organizationName')
    localStorage.removeItem('organizationsFromToken')
    localStorage.removeItem('pendingInvitesFromToken')
    localStorage.removeItem('userRole')
    showToast.success('Logged out successfully')
  }

  const handleGoogleSignIn = () => {
    setIsAuthenticated(true)
    localStorage.setItem('isAuthenticated', 'true')
  }

  const handleMicrosoftSignIn = () => {
    setIsAuthenticated(true)
    localStorage.setItem('isAuthenticated', 'true')
  }

  const handleMagicLinkSignIn = () => {
    // TODO
  }

  const handleResendCode = () => {
    // TODO
  }

  useEffect(() => {
    if (!isAuthenticated) return
    const hasOrg = hasOrganization()
    const inRegistrationFlow = showCreatePassword || showEmailVerification || showRegistration
    let orgsFromToken: any[] = []
    try {
      const raw = localStorage.getItem('organizationsFromToken')
      if (raw) orgsFromToken = JSON.parse(raw)
    } catch {
      /* ignore */
    }

    if (!hasOrg && !inRegistrationFlow && !showEventspaceSetup) {
      if (orgsFromToken.length > 0) {
        setShowOrganizationSelect(true)
      } else {
        setShowEventspaceSetup(true)
      }
    }
  }, [
    isAuthenticated,
    showEventspaceSetup,
    showCreatePassword,
    showEmailVerification,
    showRegistration
  ])

  return {
    isAuthenticated,
    showRegistration,
    showEmailVerification,
    showCreatePassword,
    showEventspaceSetup,
    showOrganizationSelect,
    registrationEmail,
    isVerifyingOtp,
    otpVerificationError,
    isCreatingPassword,
    passwordCreationError,
    isCreatingOrganization,
    organizationCreationError,
    setShowRegistration,
    setOtpVerificationError,
    setPasswordCreationError,
    setOrganizationCreationError,
    handleLogin,
    handleRegistration,
    handleEmailVerification,
    handlePasswordCreation,
    handleEventspaceSetup,
    handleOrganizationSelect,
    handleNeedToCreateOrg,
    handleLogout,
    handleGoogleSignIn,
    handleMicrosoftSignIn,
    handleMagicLinkSignIn,
    handleResendCode
  }
}
