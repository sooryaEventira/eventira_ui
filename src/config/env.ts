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
    /** Login with email/password. POST {{url}}/api/v1/token/ */
    SIGNIN: `${env.AUTH_API_URL}${API_V1_BASE}token/`,
  },
  // Event endpoints
  EVENT: {
    CREATE: `${env.AUTH_API_URL}${ADMIN_API_BASE}event/`,
    LIST: `${env.AUTH_API_URL}${ADMIN_API_BASE}event/`,
    GET: (eventUuid: string) => `${env.AUTH_API_URL}${ADMIN_API_BASE}event/${eventUuid}/`,
    DELETE: (eventUuid: string) => `${env.AUTH_API_URL}${ADMIN_API_BASE}event/${eventUuid}/`,
    PUBLISH: (eventUuid: string) => `${env.AUTH_API_URL}${ADMIN_API_BASE}event/${eventUuid}/publish/`,
    /** Event hub overview: GET overview/?event_id={{event_uuid}} */
    OVERVIEW: (eventUuid: string) => `${env.AUTH_API_URL}${ADMIN_API_BASE}overview/?event_id=${eventUuid}`,
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
    /** Navigation tree for event website. GET {{admin_url}}navigation/?event_id={{event_uuid}} */
    NAVIGATION: (eventUuid: string) => `${env.AUTH_API_URL}${ADMIN_API_BASE}navigation/?event_id=${eventUuid}`,
    /** Create navigation folder. POST {{admin_url}}navigation/folders/?event_id={{event_uuid}} */
    NAVIGATION_FOLDERS: (eventUuid: string) => `${env.AUTH_API_URL}${ADMIN_API_BASE}navigation/folders/?event_id=${eventUuid}`,
    /** Delete navigation folder. DELETE {{admin_url}}navigation/folders/{{folderUuid}}/?event_id={{event_uuid}} */
    NAVIGATION_FOLDER_DELETE: (eventUuid: string, folderUuid: string) =>
      `${env.AUTH_API_URL}${ADMIN_API_BASE}navigation/folders/${folderUuid}/?event_id=${eventUuid}`,
    /** Available pages for navigation. GET {{admin_url}}navigation/available/?event_id={{event_uuid}} */
    NAVIGATION_AVAILABLE: (eventUuid: string) => `${env.AUTH_API_URL}${ADMIN_API_BASE}navigation/available/?event_id=${eventUuid}`,
    /** Update a nav item's icon. PATCH {{admin_url}}navigation/items/{{itemUuid}}/icon/?event_id={{event_uuid}} */
    NAVIGATION_ITEM_ICON: (eventUuid: string, navItemUuid: string) =>
      `${env.AUTH_API_URL}${ADMIN_API_BASE}navigation/items/${navItemUuid}/icon/?event_id=${eventUuid}`,
    /** Save navigation items (publish nav changes). POST {{admin_url}}navigation/save/?event_id={{event_uuid}} */
    NAVIGATION_SAVE: (eventUuid: string) =>
      `${env.AUTH_API_URL}${ADMIN_API_BASE}navigation/save/?event_id=${eventUuid}`,
    /** Website settings (branding, domain, visibility). PUT/PATCH with body. */
    SETTINGS: (eventUuid: string) => `${env.AUTH_API_URL}${ADMIN_API_BASE}website-settings/?event_id=${eventUuid}`,
  },
  // Public website endpoints (published pages + event details)
  PUBLIC: {
    /** Request login or register (sends OTP). POST {{url}}{{public_url}}auth/request-login-or-register/ */
    REQUEST_LOGIN_OR_REGISTER: `${PUBLIC_API_ROOT}auth/request-login-or-register/`,
    /** Verify OTP. POST {{url}}{{public_url}}auth/verify-otp/ Body: { email, otp } */
    VERIFY_OTP: `${PUBLIC_API_ROOT}auth/verify-otp/`,
    /** Set password after OTP verification. POST {{url}}{{public_url}}auth/set-password/ */
    SET_PASSWORD: `${PUBLIC_API_ROOT}auth/set-password/`,
    /** Login with email + password. POST {{url}}{{public_url}}auth/token/ Body: { email, password } */
    TOKEN: `${PUBLIC_API_ROOT}auth/token/`,
    EVENT: {
      // Public event endpoint (backend expects singular `event/`)
      GET: (eventUuid: string) => `${PUBLIC_API_ROOT}event/${eventUuid}`,
      /** List all events */
      LIST: () => `${PUBLIC_API_ROOT}event/`,
      /** List events by tag: .../events/?tag_id={{tag_uuid}} */
      LIST_BY_TAG: (tagId: string) =>
        `${PUBLIC_API_ROOT}events/?tag_id=${encodeURIComponent(tagId)}`,
    },
    WEBPAGES: {
      LIST: (eventUuid: string) =>
        `${PUBLIC_API_ROOT}events/${eventUuid}/webpages/`,
      GET: (eventUuid: string, webpageSlug: string) =>
        `${PUBLIC_API_ROOT}events/${eventUuid}/webpages/${webpageSlug}/`,
    },
    SPEAKERS: {
      LIST: (eventUuid: string) => `${PUBLIC_API_ROOT}events/${eventUuid}/speakers/`,
      LIST_BY_TAG: (eventUuid: string, tagUuid: string) => `${PUBLIC_API_ROOT}events/${eventUuid}/speakers/?tag_id=${tagUuid}`,
    },
    ATTENDEES: {
      /** List all attendees: .../attendees/ */
      LIST: (eventUuid: string) => `${PUBLIC_API_ROOT}events/${eventUuid}/attendees/`,
      /** List attendees by group/tag: .../attendees/?tag_id={{tag_uuid}} */
      LIST_BY_TAG: (eventUuid: string, tagUuid: string) =>
        `${PUBLIC_API_ROOT}events/${eventUuid}/attendees/?tag_id=${tagUuid}`,
    },
    SCHEDULES: {
      LIST: (eventUuid: string) => `${PUBLIC_API_ROOT}events/${eventUuid}/schedules/`,
    },
    SESSIONS: {
      /** List sessions for a schedule (minimal data). */
      LIST: (eventUuid: string, scheduleUuid: string) =>
        `${PUBLIC_API_ROOT}events/${eventUuid}/schedules/${scheduleUuid}/sessions/`,
      /** Retrieve single session with full details (sections, video, resources, speakers, text). */
      RETRIEVE: (eventUuid: string, _scheduleUuid: string, sessionUuid: string) =>
        `${PUBLIC_API_ROOT}events/${eventUuid}/sessions/${sessionUuid}/`,
    },
    SESSION_COMMENTS: {
      /** List comments for a session. GET .../events/{eventUuid}/sessions/{sessionUuid}/comments/ */
      LIST: (eventUuid: string, sessionUuid: string) =>
        `${PUBLIC_API_ROOT}events/${eventUuid}/sessions/${sessionUuid}/comments/`,
      /** Post a comment to a session. POST .../events/{eventUuid}/sessions/{sessionUuid}/comments/ */
      CREATE: (eventUuid: string, sessionUuid: string) =>
        `${PUBLIC_API_ROOT}events/${eventUuid}/sessions/${sessionUuid}/comments/`,
    },
    /** Website settings for published site (no auth). GET brand_primary_color etc. */
    WEBSITE_SETTINGS: (eventUuid: string) =>
      `${PUBLIC_API_ROOT}events/${eventUuid}/website-settings/`,
    /** Website index for published site (no auth). GET webpages + speaker_tags + attendee_tags for nav. */
    INDEX: (eventUuid: string) =>
      `${PUBLIC_API_ROOT}events/${eventUuid}/index/`,
  },
  // User Management endpoints
  ATTENDEE_MANAGEMENT: {
    UPLOAD_USER: `${env.AUTH_API_URL}${ADMIN_API_BASE}attendees/upload-excel/`,
    LIST: (eventUuid: string, page = 1) => `${env.AUTH_API_URL}${ADMIN_API_BASE}attendees/?event_id=${eventUuid}&page=${page}`,
    TAGS: (eventUuid: string) => `${env.AUTH_API_URL}${ADMIN_API_BASE}attendees/tags/?event_id=${eventUuid}`,
    CREATE: (eventUuid: string) => `${env.AUTH_API_URL}${ADMIN_API_BASE}attendees/?event_id=${eventUuid}`,
    UPDATE: (attendeeUuid: string) => `${env.AUTH_API_URL}${ADMIN_API_BASE}attendees/${attendeeUuid}/`,
    DELETE: (attendeeUuid: string) => `${env.AUTH_API_URL}${ADMIN_API_BASE}attendees/${attendeeUuid}/`,
    BULK_ADD_TAG: (eventUuid: string) =>
      `${env.AUTH_API_URL}${ADMIN_API_BASE}attendees/bulk-add-tag/?event_id=${eventUuid}`,
    BULK_DELETE: (eventUuid: string) =>
      `${env.AUTH_API_URL}${ADMIN_API_BASE}attendees/bulk-delete/?event_id=${eventUuid}`
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
    UPDATE: (eventUuid: string, scheduleUuid: string) =>
      `${env.AUTH_API_URL}${ADMIN_API_BASE}schedules/${scheduleUuid}/?event_id=${eventUuid}`,
    /** Delete schedule: DELETE .../schedules/{{schedule_uuid}}/?event_id={{event_uuid}} */
    DELETE: (scheduleUuid: string, eventUuid: string) =>
      `${env.AUTH_API_URL}${ADMIN_API_BASE}schedules/${scheduleUuid}/?event_id=${eventUuid}`,
  },
  // Sessions endpoints (schedule grid, create, delete, retrieve, bulk import)
  SESSIONS: {
    /** List sessions: GET .../sessions/?event_id=&schedule_uuid= */
    LIST: (eventUuid: string, scheduleUuid: string) =>
      `${env.AUTH_API_URL}${ADMIN_API_BASE}sessions/?event_id=${eventUuid}&schedule_uuid=${scheduleUuid}`,
    /** Create session: POST .../sessions/?event_id= */
    CREATE: (eventUuid: string) =>
      `${env.AUTH_API_URL}${ADMIN_API_BASE}sessions/?event_id=${eventUuid}`,
    /** Update session: PATCH .../sessions/{{session_uuid}}/?event_id=&schedule_uuid= */
    UPDATE: (sessionUuid: string, eventUuid: string, scheduleUuid: string) =>
      `${env.AUTH_API_URL}${ADMIN_API_BASE}sessions/${sessionUuid}/?event_id=${eventUuid}&schedule_uuid=${scheduleUuid}`,
    /** Delete session: DELETE .../sessions/{{session_uuid}}/?schedule_uuid= */
    DELETE: (sessionUuid: string, scheduleUuid: string) =>
      `${env.AUTH_API_URL}${ADMIN_API_BASE}sessions/${sessionUuid}/?schedule_uuid=${scheduleUuid}`,
    /** Retrieve single session: GET .../sessions/{{session_uuid}}/?event_id=&schedule_uuid= */
    RETRIEVE: (sessionUuid: string, eventUuid: string, scheduleUuid: string) =>
      `${env.AUTH_API_URL}${ADMIN_API_BASE}sessions/${sessionUuid}/?event_id=${eventUuid}&schedule_uuid=${scheduleUuid}`,
    /** Bulk import: POST {{url}}{{admin_url}}sessions/schedules/{{schedule_uuid}}/bulk-import/ — pass event_id in body (form-data). */
    BULK_IMPORT: (scheduleUuid: string) =>
      `${env.AUTH_API_URL}${ADMIN_API_BASE}sessions/schedules/${scheduleUuid}/bulk-import/`,
    /** List locations for sessions (add/edit session slideout). GET .../sessions/locations?event_id=&schedule_uuid= */
    LOCATIONS: (eventUuid: string, scheduleUuid: string) =>
      `${env.AUTH_API_URL}${ADMIN_API_BASE}sessions/locations?event_id=${eventUuid}&schedule_uuid=${scheduleUuid}`,
  },
  // Session tags (for session slideout tag select). GET .../session-tags/?event_id=
  SESSION_TAGS: {
    LIST: (eventUuid: string) =>
      `${env.AUTH_API_URL}${ADMIN_API_BASE}session-tags/?event_id=${eventUuid}`,
  },
  // Session sections (create + update + delete)
  SESSION_SECTIONS: {
    /** Create session section: POST .../session-sections/?event_id= — body: { session_uuid, section_type ("video"|"text"|"speakers"), order, content? } */
    CREATE: (eventUuid: string) =>
      `${env.AUTH_API_URL}${ADMIN_API_BASE}session-sections/?event_id=${eventUuid}`,
    /** Update session section: PATCH .../session-sections/{{session_section_id}}/?event_id={{event_uuid}} */
    UPDATE: (sessionSectionId: string, eventUuid: string) =>
      `${env.AUTH_API_URL}${ADMIN_API_BASE}session-sections/${sessionSectionId}/?event_id=${eventUuid}`,
    /** Delete session section: DELETE .../session-sections/{{session_section_id}}/?event_id={{event_uuid}} */
    DELETE: (sessionSectionId: string, eventUuid: string) =>
      `${env.AUTH_API_URL}${ADMIN_API_BASE}session-sections/${sessionSectionId}/?event_id=${eventUuid}`,
  },
  // Session resources (create + update + delete)
  SESSION_RESOURCES: {
    /** Create session resource: POST .../session-resources/?event_id= — FormData: file(s), session_uuid, event_uuid */
    CREATE: (eventUuid: string) =>
      `${env.AUTH_API_URL}${ADMIN_API_BASE}session-resources/?event_id=${eventUuid}`,
    /** Update session resource: PATCH .../session-resources/{{session_resource_id}}/?event_id={{event_uuid}} */
    UPDATE: (sessionResourceId: string, eventUuid: string) =>
      `${env.AUTH_API_URL}${ADMIN_API_BASE}session-resources/${sessionResourceId}/?event_id=${eventUuid}`,
    /** Delete session resource: DELETE .../session-resources/{{session_resource_id}}/?event_id={{event_uuid}} */
    DELETE: (sessionResourceId: string, eventUuid: string) =>
      `${env.AUTH_API_URL}${ADMIN_API_BASE}session-resources/${sessionResourceId}/?event_id=${eventUuid}`,
  },
  // Communication endpoints
  COMMUNICATION: {
    SEND: `${env.AUTH_API_URL}${ADMIN_API_BASE}event-communications/`,
    LIST: (eventUuid: string) => `${env.AUTH_API_URL}${ADMIN_API_BASE}event-communications/?event_uuid=${eventUuid}`,
  },
  // Speaker Management endpoints
  SPEAKER_MANAGEMENT: {
    UPLOAD_SPEAKER: `${env.AUTH_API_URL}${ADMIN_API_BASE}speakers/import/`,
    LIST: (eventUuid: string, page = 1) => `${env.AUTH_API_URL}${ADMIN_API_BASE}speakers/?event_id=${eventUuid}&page=${page}`,
    TAGS: (eventUuid: string) => `${env.AUTH_API_URL}${ADMIN_API_BASE}speakers/tags/?event_id=${eventUuid}`,
    CREATE: (eventUuid: string) => `${env.AUTH_API_URL}${ADMIN_API_BASE}speakers/?event_id=${eventUuid}`,
    UPDATE: (speakerUuid: string) => `${env.AUTH_API_URL}${ADMIN_API_BASE}speakers/${speakerUuid}/`,
    DELETE: (speakerUuid: string) => `${env.AUTH_API_URL}${ADMIN_API_BASE}speakers/${speakerUuid}/`,
    // Bulk operations for speakers table (multi-select)
    BULK_ADD_TAG: (eventUuid: string) =>
      `${env.AUTH_API_URL}${ADMIN_API_BASE}speakers/bulk-add-tag/?event_id=${eventUuid}`,
    BULK_DELETE: (eventUuid: string) =>
      `${env.AUTH_API_URL}${ADMIN_API_BASE}speakers/bulk-delete/?event_id=${eventUuid}`,
    SEARCH: (eventUuid: string, query: string, tagId?: string) => {
      let url = `${env.AUTH_API_URL}${ADMIN_API_BASE}speakers/search/?event_id=${eventUuid}&q=${encodeURIComponent(query)}`
      if (tagId) url += `&tag_id=${tagId}`
      return url
    },
  },
  // Organization/Exhibitors endpoints
  EXHIBITORS: {
    /** List exhibitors: {{url}}{{admin_url}}exhibitors/?event_id={{event_uuid}} */
    LIST: (eventUuid: string) => `${env.AUTH_API_URL}${ADMIN_API_BASE}exhibitors/?event_id=${eventUuid}`,
    /** Create exhibitor: POST {{url}}{{admin_url}}exhibitors/?event_uuid={{event_uuid}} */
    CREATE: (eventUuid: string) => `${env.AUTH_API_URL}${ADMIN_API_BASE}exhibitors/?event_uuid=${eventUuid}`,
    /** PATCH exhibitor: {{url}}{{admin_url}}exhibitors/{{exhibitor_uuid}}/?event_id={{event_uuid}} */
    UPDATE: (exhibitorUuid: string, eventUuid: string) =>
      `${env.AUTH_API_URL}${ADMIN_API_BASE}exhibitors/${exhibitorUuid}/?event_id=${eventUuid}`,
    DELETE: (exhibitorUuid: string) => `${env.AUTH_API_URL}${ADMIN_API_BASE}exhibitors/${exhibitorUuid}/`,
    IMPORT: (eventUuid: string) =>
      `${env.AUTH_API_URL}${ADMIN_API_BASE}exhibitors/import/?event_uuid=${eventUuid}`,
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
    /** Create a new resource tag: POST {{url}}{{admin_url}}resource-tags/create/ */
    TAGS_CREATE: (_eventUuid: string) =>
      `${env.AUTH_API_URL}${ADMIN_API_BASE}resource-tags/create/`,
  },

  TEAM: {
    INVITE: `${env.AUTH_API_URL}${ADMIN_API_BASE}invites/`,
    LIST: `${env.AUTH_API_URL}${ADMIN_API_BASE}list-invites/`,
    /** Accept team invite: POST invites/{{team_invite_uuid}}/accept/ */
    ACCEPT_INVITE: (teamInviteUuid: string) =>
      `${env.AUTH_API_URL}${ADMIN_API_BASE}invites/${teamInviteUuid}/accept/`,
    /** Revoke team invite: POST invites/{{team_invite_uuid}}/revoke/ */
    REVOKE_INVITE: (teamInviteUuid: string) =>
      `${env.AUTH_API_URL}${ADMIN_API_BASE}invites/${teamInviteUuid}/revoke/`,
  },
}

