/**
 * Resolve the current user's role for the selected organization using
 * login/token org list (organizationsFromToken) and localStorage (userRole).
 */

export function normalizeOrganizationRole(role: string | null | undefined): string {
  if (role == null) return ''
  return String(role).trim().toLowerCase().replace(/\s+/g, '_')
}

export function isEventAdminRole(role: string | null | undefined): boolean {
  return normalizeOrganizationRole(role) === 'event_admin'
}

export function getRoleForCurrentOrganization(): string | null {
  if (typeof window === 'undefined') return null
  const orgUuid = localStorage.getItem('organizationUuid')
  if (!orgUuid) return null

  try {
    const raw = localStorage.getItem('organizationsFromToken')
    if (raw) {
      const orgs = JSON.parse(raw) as Array<Record<string, unknown>>
      if (Array.isArray(orgs)) {
        for (const o of orgs) {
          const id = o.organization_uuid ?? o.uuid ?? o.id
          if (id != null && String(id) === orgUuid) {
            const r = o.role
            if (r != null && String(r).trim() !== '') return String(r)
          }
        }
      }
    }
  } catch {
    /* ignore */
  }

  const stored = localStorage.getItem('userRole')
  if (stored != null && stored.trim() !== '') return stored
  return null
}

export function canCreateEventsForCurrentOrganization(): boolean {
  return isEventAdminRole(getRoleForCurrentOrganization())
}
