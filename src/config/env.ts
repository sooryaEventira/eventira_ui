/**
 * Environment configuration
 * Centralizes all environment variables and provides defaults
 */

export const env = {
  /**
   * Use Vite proxy for API requests in development (avoids CORS issues)
   * When true, uses relative paths that go through Vite proxy
   * Override with: VITE_USE_PROXY environment variable
   */
  USE_PROXY: import.meta.env.VITE_USE_PROXY === 'true' || (import.meta.env.DEV && import.meta.env.VITE_USE_PROXY !== 'false'),

  /**
   * Auth API Base URL (for authentication endpoints)
   * Default: https://eventiracommon-event-api-dev-ci01-aaeddsh3hbdkcjfa.centralindia-01.azurewebsites.net
   * Override with: VITE_AUTH_API_URL environment variable
   * If USE_PROXY is true in dev, this will be ignored and relative paths will be used
   */
  AUTH_API_URL: import.meta.env.VITE_AUTH_API_URL || 'https://eventiracommon-event-api-dev-ci01-aaeddsh3hbdkcjfa.centralindia-01.azurewebsites.net',

  /**
   * Public API Base URL (for published/public website endpoints)
   * Override with: VITE_PUBLIC_API_URL environment variable
   *
   * NOTE: These endpoints are intended to be publicly accessible (no auth headers).
   */
  PUBLIC_API_URL:
    import.meta.env.VITE_PUBLIC_API_URL ||
    import.meta.env.VITE_AUTH_API_URL ||
    'https://eventiracommon-event-api-dev-ci01-aaeddsh3hbdkcjfa.centralindia-01.azurewebsites.net',

  /**
   * Page Management API Base URL (for page editor endpoints)
   * Default: https://eventiracommon-event-api-dev-ci01-aaeddsh3hbdkcjfa.centralindia-01.azurewebsites.net
   * Override with: VITE_PAGE_API_URL environment variable
   */
  PAGE_API_URL: import.meta.env.VITE_PAGE_API_URL || 'https://eventiracommon-event-api-dev-ci01-aaeddsh3hbdkcjfa.centralindia-01.azurewebsites.net',

  /**
   * Legacy API URL (for backward compatibility)
   * Default: same as PAGE_API_URL
   */
  API_URL: import.meta.env.VITE_API_URL || import.meta.env.VITE_PAGE_API_URL || 'https://eventiracommon-event-api-dev-ci01-aaeddsh3hbdkcjfa.centralindia-01.azurewebsites.net',

  /**
   * Is Development Mode
   */
  IS_DEV: import.meta.env.DEV,

  /**
   * Is Production Mode
   */
  IS_PROD: import.meta.env.PROD,

  /**
   * CometChat (session live chat) – optional
   * Set VITE_COMETCHAT_APP_ID, VITE_COMETCHAT_REGION, VITE_COMETCHAT_AUTH_KEY to enable.
   */
  COMETCHAT_APP_ID: import.meta.env.VITE_COMETCHAT_APP_ID || '',
  COMETCHAT_REGION: import.meta.env.VITE_COMETCHAT_REGION || '',
  COMETCHAT_AUTH_KEY: import.meta.env.VITE_COMETCHAT_AUTH_KEY || '',
}

/**
 * Common API base paths
 */
const ADMIN_API_BASE = '/api/v1/admin/'
const AUTH_API_BASE = '/api/v1/auth/'
const API_V1_BASE = '/api/v1/'
const PUBLIC_API_URL = env.PUBLIC_API_URL.replace(/\/+$/, '')
const PUBLIC_API_BASE = '/api/v1/public/'
// Support both forms:
// - PUBLIC_API_URL = "https://host"  (base host only)
// - PUBLIC_API_URL = "https://host/api/v1/public" (already includes the public base path)
const PUBLIC_API_ROOT = PUBLIC_API_URL.includes('/api/v1/public')
  ? `${PUBLIC_API_URL}/`
  : `${PUBLIC_API_URL}${PUBLIC_API_BASE}`

/**
 * API Endpoints
 * All endpoints use full URLs to the Azure backend
 */
export const API_ENDPOINTS = {

  AUTH: {
    REGISTER_SEND_OTP: `${env.AUTH_API_URL}${AUTH_API_BASE}register/send-otp/`,
    REGISTER_VERIFY_OTP: `${env.AUTH_API_URL}${AUTH_API_BASE}register/verify-otp/`,
    CREATE_PASSWORD: `${env.AUTH_API_URL}${API_V1_BASE}register/`,
    CREATE_ORGANIZATION: `${env.AUTH_API_URL}${ADMIN_API_BASE}organizations/`,
    SIGNIN: `${env.AUTH_API_URL}${API_V1_BASE}token/`,
  },
  // Event endpoints
  EVENT: {
    CREATE: `${env.AUTH_API_URL}${ADMIN_API_BASE}event/`,
    LIST: `${env.AUTH_API_URL}${ADMIN_API_BASE}event/`,
    GET: (eventUuid: string) => `${env.AUTH_API_URL}${ADMIN_API_BASE}event/${eventUuid}/`,
    PUBLISH: (eventUuid: string) => `${env.AUTH_API_URL}${ADMIN_API_BASE}event/${eventUuid}/publish/`,
  },
  // Timezone endpoints
  TIMEZONE: {
    LIST: `${env.AUTH_API_URL}${ADMIN_API_BASE}timezones/`,
  },
  // Webpage endpoints
  WEBPAGE: {
    CREATE: (eventUuid: string) => `${env.AUTH_API_URL}${ADMIN_API_BASE}webpages/?event_id=${eventUuid}`,
    LIST: (eventUuid: string) => `${env.AUTH_API_URL}${ADMIN_API_BASE}webpages/?event_id=${eventUuid}`,
    GET: (webpageUuid: string, eventUuid: string) => `${env.AUTH_API_URL}${ADMIN_API_BASE}webpages/${webpageUuid}/?event_id=${eventUuid}`,
    UPDATE: (webpageUuid: string) => `${env.AUTH_API_URL}${ADMIN_API_BASE}webpages/${webpageUuid}/`,
    DELETE: (webpageUuid: string) => `${env.AUTH_API_URL}${ADMIN_API_BASE}webpages/${webpageUuid}/`,
  },
  // Event website index (navigation + webpages list for event website)
  WEBSITE: {
    INDEX: (eventUuid: string) => `${env.AUTH_API_URL}${ADMIN_API_BASE}website/index/?event_id=${eventUuid}`,
    /** Website settings (branding, domain, visibility). PUT/PATCH with body. */
    SETTINGS: (eventUuid: string) => `${env.AUTH_API_URL}${ADMIN_API_BASE}website-settings/?event_id=${eventUuid}`,
  },
  // Public website endpoints (published pages + event details)
  PUBLIC: {
    EVENT: {
      // Public event endpoint (backend expects singular `event/`)
      GET: (eventUuid: string) => `${PUBLIC_API_ROOT}event/${eventUuid}`,
    },
    WEBPAGES: {
      LIST: (eventUuid: string) =>
        `${PUBLIC_API_ROOT}events/${eventUuid}/webpages/`,
      GET: (eventUuid: string, webpageUuid: string) =>
        `${PUBLIC_API_ROOT}events/${eventUuid}/webpages/${webpageUuid}/`,
    },
    SPEAKERS: {
      LIST: (eventUuid: string) => `${PUBLIC_API_ROOT}events/${eventUuid}/speakers/`,
    },
    ATTENDEES: {
      LIST: (eventUuid: string) => `${PUBLIC_API_ROOT}events/${eventUuid}/attendees/`,
    },
    SCHEDULES: {
      LIST: (eventUuid: string) => `${PUBLIC_API_ROOT}events/${eventUuid}/schedules/`,
    },
    SESSIONS: {
      LIST: (eventUuid: string, scheduleUuid: string) =>
        `${PUBLIC_API_ROOT}events/${eventUuid}/schedules/${scheduleUuid}/sessions/`,
    },
  },
  // User Management endpoints
  ATTENDEE_MANAGEMENT: {
    UPLOAD_USER: `${env.AUTH_API_URL}${ADMIN_API_BASE}attendees/upload-excel/`,
    LIST: (eventUuid: string) => `${env.AUTH_API_URL}${ADMIN_API_BASE}attendees/?event_id=${eventUuid}`,
    /** Attendee tag/group listing: GET .../attendees/tags/?event_id={eventUuid} */
    TAGS: (eventUuid: string) => `${env.AUTH_API_URL}${ADMIN_API_BASE}attendees/tags/?event_id=${eventUuid}`,
    CREATE: (eventUuid: string) => `${env.AUTH_API_URL}${ADMIN_API_BASE}attendees/?event_id=${eventUuid}`,
    UPDATE: (attendeeUuid: string) => `${env.AUTH_API_URL}${ADMIN_API_BASE}attendees/${attendeeUuid}/`,
    DELETE: (attendeeUuid: string) => `${env.AUTH_API_URL}${ADMIN_API_BASE}attendees/${attendeeUuid}/`
  },
  // Tags/Groups endpoints
  TAGS: {
    // Used by Attendee/Speaker/Organization "Groups" creation
    CREATE: `${env.AUTH_API_URL}${ADMIN_API_BASE}user-tags/create/`,
    LIST: (eventUuid: string) => `${env.AUTH_API_URL}${ADMIN_API_BASE}user-tags/?event_id=${eventUuid}`,
  },
  // Event tags: publish/unpublish group page (Build page checkbox). Page listing from website index API only.
  EVENT_TAGS: {
    SET_PUBLISHED: (tagUuid: string, eventUuid: string) =>
      `${env.AUTH_API_URL}${ADMIN_API_BASE}event-tags/${tagUuid}/set-published/?event_id=${eventUuid}`,
    SET_UNPUBLISHED: (tagUuid: string, eventUuid: string) =>
      `${env.AUTH_API_URL}${ADMIN_API_BASE}event-tags/${tagUuid}/set-unpublished/?event_id=${eventUuid}`,
  },
  // Schedule session tags (creatable multiselect in ScheduleDetailsSlideout)
  SCHEDULE_TAGS: {
    CREATE: `${env.AUTH_API_URL}${ADMIN_API_BASE}tags/`,
    LIST: (eventUuid: string) => `${env.AUTH_API_URL}${ADMIN_API_BASE}tags/?event_id=${eventUuid}`,
  },
  // Schedule endpoints
  SCHEDULES: {
    CREATE: (eventUuid: string) => `${env.AUTH_API_URL}${ADMIN_API_BASE}schedules/?event_id=${eventUuid}`,
    LIST: (eventUuid: string) => `${env.AUTH_API_URL}${ADMIN_API_BASE}schedules/?event_id=${eventUuid}`,
  },
  // Sessions endpoints (schedule grid + bulk import)
  SESSIONS: {
    LIST: (eventUuid: string) => `${env.AUTH_API_URL}${ADMIN_API_BASE}sessions/?event_uuid=${eventUuid}`,
    BULK_IMPORT: (scheduleUuid: string) =>
      `${env.AUTH_API_URL}${ADMIN_API_BASE}sessions/schedules/${scheduleUuid}/bulk-import/`,
  },
  // Communication endpoints
  COMMUNICATION: {
    SEND: `${env.AUTH_API_URL}${ADMIN_API_BASE}event-communications/`,
    LIST: (eventUuid: string) => `${env.AUTH_API_URL}${ADMIN_API_BASE}event-communications/?event_id=${eventUuid}`,
  },
  // Speaker Management endpoints
  SPEAKER_MANAGEMENT: {
    UPLOAD_SPEAKER: `${env.AUTH_API_URL}${ADMIN_API_BASE}speakers/import/`,
    LIST: (eventUuid: string) => `${env.AUTH_API_URL}${ADMIN_API_BASE}speakers/?event_id=${eventUuid}`,
    /** Speaker tag/group listing: GET .../speakers/tags/?event_id={eventUuid} */
    TAGS: (eventUuid: string) => `${env.AUTH_API_URL}${ADMIN_API_BASE}speakers/tags/?event_id=${eventUuid}`,
    CREATE: (eventUuid: string) => `${env.AUTH_API_URL}${ADMIN_API_BASE}speakers/?event_id=${eventUuid}`,
    UPDATE: (speakerUuid: string) => `${env.AUTH_API_URL}${ADMIN_API_BASE}speakers/${speakerUuid}/`,
    DELETE: (speakerUuid: string) => `${env.AUTH_API_URL}${ADMIN_API_BASE}speakers/${speakerUuid}/`,
  },
  // Organization/Exhibitors endpoints
  EXHIBITORS: {
 
    LIST: (eventUuid: string) => `${env.AUTH_API_URL}${ADMIN_API_BASE}exhibitors/?event_id=${eventUuid}`,
 
    DELETE: (exhibitorUuid: string) => `${env.AUTH_API_URL}${ADMIN_API_BASE}exhibitors/${exhibitorUuid}/`,

    IMPORT: (eventUuid: string) =>
      `${env.AUTH_API_URL}${ADMIN_API_BASE}exhibitors/import/?event_id=${eventUuid}`,
  },
  // Resource Management endpoints
  RESOURCE: {
    CREATE_FOLDER: `${env.AUTH_API_URL}${ADMIN_API_BASE}resources/folders/`,
    DELETE_FOLDER: (uuid: string) => `${env.AUTH_API_URL}${ADMIN_API_BASE}resources/folders/${uuid}/`,
    LIST_FOLDERS: (eventUuid: string, parentFolderId?: string | null) => {
      let url = `${env.AUTH_API_URL}${ADMIN_API_BASE}resources/folders/?event_uuid=${eventUuid}`
      if (parentFolderId !== undefined && parentFolderId !== null) {
        url += `&parent=${parentFolderId}`
      }
      return url
    },
    UPLOAD_FILE: `${env.AUTH_API_URL}${ADMIN_API_BASE}resources/files/`,
    DELETE_FILE: (uuid: string) => `${env.AUTH_API_URL}${ADMIN_API_BASE}resources/files/${uuid}/`,
    LIST_FILES: (folderId?: string | null) => {
      let url = `${env.AUTH_API_URL}${ADMIN_API_BASE}resources/files/`
      if (folderId !== undefined && folderId !== null) {
        url += `?folder=${folderId}`
      }
      return url
    },
  },
  // Team Management endpoints (dashboard)
  // NOTE: If backend paths differ, override in the service via env vars later.
  TEAM: {
    // The backend (per 404 URLconf) exposes `/api/v1/users/`.
    // We keep invite/resend endpoints as placeholders; the service will try fallbacks and show friendly errors if missing.
    LIST: `${env.AUTH_API_URL}${API_V1_BASE}users/`,
    INVITE: `${env.AUTH_API_URL}${ADMIN_API_BASE}team-invites/`,
    UPDATE_MEMBER: (memberUuid: string) => `${env.AUTH_API_URL}${API_V1_BASE}users/${memberUuid}/`,
    REMOVE_MEMBER: (memberUuid: string) => `${env.AUTH_API_URL}${API_V1_BASE}users/${memberUuid}/`,
    RESEND_INVITE: (inviteUuid: string) => `${env.AUTH_API_URL}${ADMIN_API_BASE}team-invites/${inviteUuid}/resend/`,
  },
}

