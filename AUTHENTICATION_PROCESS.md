# Authentication Process Documentation

## Overview
This project implements a multi-step authentication flow with OTP verification, password creation, organization management, and JWT token-based API authorization.

---

## Authentication Flow Architecture

### 1. **User Registration Flow**

#### Step 1: Send Registration OTP
- **Endpoint**: `POST /api/v1/auth/register/send-otp/`
- **Location**: [authService.ts](src/services/authService.ts#L127)
- **Function**: `sendRegistrationOtp(email: string, otp?: string)`
- **Request Body**: `{ email: string }`
- **Response**: 
  ```typescript
  {
    status: 'success' | 'error',
    message: string,
    data: { email: string }
  }
  ```
- **Error Handling**: 
  - Shows toast notifications for success/error
  - Handles network errors via `handleNetworkError()`
  - Validates JSON parsing with `handleParseError()`

#### Step 2: Verify OTP (Registration)
- **Endpoint**: `POST /api/v1/auth/register/verify-otp/`
- **Location**: [authService.ts](src/services/authService.ts#L212)
- **Function**: `verifyRegistrationOtp(email: string, otp: string)`
- **Request Body**: `{ email: string, otp: string }`
- **Response**: 
  ```typescript
  {
    status: 'success' | 'error',
    message: string,
    data: string  // Empty data field
  }
  ```
- **UI Flow**: Located in [useAuth.ts](src/hooks/useAuth.ts#L114) → `handleEmailVerification()`

#### Step 3: Create Password
- **Endpoint**: `POST /api/v1/register/`
- **Location**: [authService.ts](src/services/authService.ts#L283)
- **Function**: `createPassword(email: string, password: string)`
- **Request Body**: `{ email: string, password: string }`
- **Response**:
  ```typescript
  {
    status: 'success' | 'error',
    message: string,
    data: {
      user: { email: string, first_name: string, last_name: string },
      access: string,        // JWT token
      refresh: string        // Refresh token
    }
  }
  ```
- **Credentials Handling**: 
  - Stores `accessToken` in localStorage
  - Stores `refreshToken` in localStorage
  - Stores `userEmail` in localStorage
- **UI Flow**: Located in [useAuth.ts](src/hooks/useAuth.ts#L126) → `handlePasswordCreation()`

---

### 2. **User Login Flow**

#### Sign In (Email + Password)
- **Endpoint**: `POST /api/v1/token/`
- **Location**: [authService.ts](src/services/authService.ts#L354)
- **Function**: `signIn(email: string, password: string)`
- **Request Body**: `{ email: string, password: string }`
- **Response**:
  ```typescript
  {
    status: 'success' | 'error',
    message: string,
    data: {
      access: string,           // JWT access token
      refresh: string,          // Refresh token
      organizations: Array<{
        organization_uuid: string,
        organization_name: string,
        uuid?: string,
        name?: string,
        id?: string,
        title?: string,
        role?: string
      }>
    }
  }
  ```
- **Token Storage**:
  - `accessToken` → Used for authenticated API requests
  - `refreshToken` → For token refresh (if implemented)
  - `userEmail` → Email of logged-in user
  - `organizationsFromToken` → JSON array of user's organizations
- **UI Flow**: Located in [useAuth.ts](src/hooks/useAuth.ts#L69) → `handleLogin()`

---

### 3. **Organization Management**

#### Create Organization (Eventspace)
- **Endpoint**: `POST /api/v1/admin/organizations/`
- **Location**: [authService.ts](src/services/authService.ts#L449)
- **Function**: `createOrganization(name: string)`
- **Authentication**: Requires `accessToken` in Authorization header
- **Request Body**: `{ name: string }`
- **Request Headers**:
  ```
  Content-Type: application/json
  Authorization: Bearer {accessToken}
  ```
- **Response**:
  ```typescript
  {
    status: 'success' | 'error',
    message: string,
    data: {
      uuid: string,
      name: string,
      registration_number?: string | null,
      tax_number?: string | null,
      affiliations?: any | null,
      email?: string | null,
      website_url?: string | null
    }
  }
  ```
- **UI Flow**: Located in [useAuth.ts](src/hooks/useAuth.ts#L136) → `handleEventspaceSetup()`

#### Select Organization
- **Function**: `handleOrganizationSelect()` in [useAuth.ts](src/hooks/useAuth.ts#L178)
- **Storage**: Sets localStorage values:
  - `organizationUuid` → UUID of selected organization
  - `organizationName` → Name of selected organization
  - `userRole` → User's role in the organization (optional)
- **UI Navigation**: Routes to dashboard after selection

---

## Token Management

### Token Storage
```typescript
// After successful authentication:
localStorage.setItem('accessToken', response.access)
localStorage.setItem('refreshToken', response.refresh)
localStorage.setItem('userEmail', email)
localStorage.setItem('isAuthenticated', 'true')
```

### Token Usage in API Calls
All authenticated requests include the bearer token:
```typescript
const accessToken = localStorage.getItem('accessToken')
const headers = {
  'Content-Type': 'application/json',
  'Authorization': `Bearer ${accessToken}`
}
```

**Services Using Token Authorization:**
- [websiteSettingsService.ts](src/services/websiteSettingsService.ts) - Lines 63-248
- [webpageService.ts](src/services/webpageService.ts) - Line 79

### Token Validation
- Tokens are validated before API calls
- If token is missing, error thrown: "Authentication required. Please login again."
- Currently no automatic token refresh mechanism visible (refresh token stored but not actively used)

---

## Authentication State Management

### useAuth Hook
- **Location**: [useAuth.ts](src/hooks/useAuth.ts)
- **Provider**: Used in main app shell for global auth state
- **State Management**:
  - `isAuthenticated` - Boolean flag from localStorage
  - `showRegistration` - UI state for registration view
  - `showEmailVerification` - UI state for OTP verification
  - `showCreatePassword` - UI state for password creation
  - `showEventspaceSetup` - UI state for organization creation
  - `showOrganizationSelect` - UI state for organization selection

### Organization Detection
```typescript
export function hasOrganization(): boolean {
  const orgUuid = localStorage.getItem('organizationUuid')
  const orgName = localStorage.getItem('organizationName')
  return !!(orgUuid && orgName)
}
```

### Authentication Check Effect
Located in [useAuth.ts](src/hooks/useAuth.ts#L237):
- Runs when `isAuthenticated` state changes
- Checks if organization exists
- Routes user to appropriate view:
  - Dashboard (if org selected)
  - Organization selection (if multiple orgs available)
  - Eventspace setup (if no org)

---

## Public Authentication Endpoints

These endpoints are used for public-facing event registration/login (no auth headers required):

### 1. Request Login or Register
- **Endpoint**: `POST /api/v1/public/auth/request-login-or-register/`
- **Location**: [authService.ts](src/services/authService.ts#L73)
- **Function**: `requestLoginOrRegister(email: string)`
- **Request Body**: `{ email: string }`
- **Use Case**: Public attendees requesting to log in or register

### 2. Verify OTP + Set Password
- **Endpoint**: `POST /api/v1/public/auth/verify-otp-set-password/`
- **Location**: [authService.ts](src/services/authService.ts#L96)
- **Function**: `verifyOtpSetPassword(email: string, otp: string, password: string)`
- **Request Body**: `{ email: string, otp: string, password: string }`
- **Use Case**: Public attendee verifying OTP and setting password

### 3. Fetch Public Event List
- **Endpoint**: `GET /api/v1/public/event/`
- **Location**: [authService.ts](src/services/authService.ts#L119)
- **Function**: `fetchPublicEventList()`
- **Use Case**: Fetch available events after public registration

---

## Error Handling

### Error Handling Utilities
- **Location**: [errorHandler.ts](src/utils/errorHandler.ts)
- **Functions**:
  - `handleApiError()` - Parse API error responses
  - `handleNetworkError()` - Handle network/connectivity issues
  - `handleParseError()` - Handle JSON parsing errors

### Error Types Handled
1. **Network Errors**: CORS, server down, timeout
2. **API Errors**: Invalid credentials, server errors, validation failures
3. **Parse Errors**: Invalid JSON responses
4. **Authentication Errors**: Missing/invalid tokens

### Toast Notifications
- **Location**: [toast.ts](src/utils/toast.ts) and [toastHelpers.tsx](src/utils/toastHelpers.tsx)
- Success messages shown on successful operations
- Error messages shown on failures
- Network errors logged to console for debugging

---

## API Configuration

### Environment Variables
- **Location**: [env.ts](src/config/env.ts)
- **Key Variables**:
  - `VITE_AUTH_API_URL` - Backend API base URL
  - `VITE_PUBLIC_API_URL` - Public API base URL
  - `VITE_USE_PROXY` - Use Vite proxy in development (avoids CORS)

### API Endpoints Definition
- **Location**: [env.ts](src/config/env.ts#L63-L110)
- **Endpoint Groups**:
  - `AUTH.*` - Admin/authenticated endpoints
  - `PUBLIC_AUTH.*` - Public endpoints (no auth needed)

---

## Logout Process

### Logout Function
- **Location**: [useAuth.ts](src/hooks/useAuth.ts#L202)
- **Function**: `handleLogout()`
- **Actions**:
  1. Sets `isAuthenticated` to `false`
  2. Clears all localStorage items:
     - `isAuthenticated`
     - `accessToken`
     - `refreshToken`
     - `userEmail`
     - `organizationUuid`
     - `organizationName`
     - `organizationsFromToken`
     - `userRole`
  3. Shows success toast notification

---

## Page-Based Authentication Routes

### Authentication Pages
- **Login Page**: [pages/LoginPage.tsx](src/pages/LoginPage.tsx)
- **Registration Page**: [pages/RegistrationPage.tsx](src/pages/RegistrationPage.tsx)
- **Email Verification Page**: [pages/EmailVerificationPage.tsx](src/pages/EmailVerificationPage.tsx)
- **Create Password Page**: [pages/CreatePasswordPage.tsx](src/pages/CreatePasswordPage.tsx)
- **Eventspace Setup Page**: [pages/EventspaceSetupPage.tsx](src/pages/EventspaceSetupPage.tsx)
- **Organization Select Page**: [pages/OrganizationSelectPage.tsx](src/pages/OrganizationSelectPage.tsx)

---

## Authentication Flow Summary

```
┌─────────────────────────────────────────────────────────────┐
│                   START                                      │
└──────────────────────┬──────────────────────────────────────┘
                       │
                       ▼
        ┌──────────────────────────────────┐
        │  User Provides Email             │
        │  requestLoginOrRegister()         │
        └──────────────────┬───────────────┘
                           │
                           ▼
        ┌──────────────────────────────────┐
        │  OTP Sent to Email               │
        │  User Enters OTP                 │
        │  verifyRegistrationOtp()         │
        └──────────────────┬───────────────┘
                           │
                           ▼
        ┌──────────────────────────────────┐
        │  User Creates Password           │
        │  createPassword()                │
        │  Receives: access + refresh      │
        │  token                           │
        └──────────────────┬───────────────┘
                           │
                ┌──────────┴──────────┐
                │                     │
                ▼                     ▼
    ┌─────────────────────┐  ┌─────────────────────┐
    │ Select Existing Org │  │ Create New Org      │
    │ handleOrganization  │  │ handleEventspace    │
    │ Select()            │  │ Setup()             │
    └────────┬────────────┘  └────────┬────────────┘
             │                        │
             └───────────┬────────────┘
                         │
                         ▼
        ┌──────────────────────────────────┐
        │  Route to Dashboard              │
        │  (organizationUuid set)          │
        └──────────────────────────────────┘
```

---

## Security Considerations

1. **Token Storage**: Tokens stored in localStorage (not HttpOnly cookies)
   - **Risk**: Vulnerable to XSS attacks
   - **Mitigation**: Sanitize all user inputs, use Content Security Policy headers

2. **Bearer Token**: Used in Authorization header for API requests
   - Follows standard JWT bearer token pattern
   - Token included in all authenticated requests

3. **Credentials Flag**: `credentials: 'include'` used in fetch requests
   - Allows cookies to be sent/received in cross-origin requests
   - Required for session-based authentication

4. **No Automatic Token Refresh**: Refresh token stored but not actively used
   - **TODO**: Implement token refresh mechanism before token expiry

5. **Password Requirements**: Enforced by backend API
   - Frontend should validate before submission

---

## Testing the Authentication Flow

### Registration Flow Test
```bash
1. Visit application
2. Click "Register"
3. Enter email → Send OTP
4. Check email for OTP code
5. Enter OTP → Verify
6. Create password
7. Create organization (eventspace)
8. Redirected to dashboard
```

### Login Flow Test
```bash
1. Visit application
2. Click "Login"
3. Enter email + password
4. If one org: Redirected to dashboard
5. If multiple orgs: Select organization → Redirected to dashboard
6. If no org: Create organization → Redirected to dashboard
```

### Logout Test
```bash
1. Click logout (in dashboard header)
2. All localStorage cleared
3. Redirected to login page
```

---

## Related Files Reference

| File | Purpose |
|------|---------|
| [authService.ts](src/services/authService.ts) | Core authentication API calls |
| [useAuth.ts](src/hooks/useAuth.ts) | Authentication hook and state management |
| [errorHandler.ts](src/utils/errorHandler.ts) | Error handling utilities |
| [env.ts](src/config/env.ts) | API configuration and endpoints |
| [LoginPage.tsx](src/pages/LoginPage.tsx) | Login UI |
| [RegistrationPage.tsx](src/pages/RegistrationPage.tsx) | Registration UI |
| [EmailVerificationPage.tsx](src/pages/EmailVerificationPage.tsx) | OTP verification UI |
| [CreatePasswordPage.tsx](src/pages/CreatePasswordPage.tsx) | Password creation UI |
| [EventspaceSetupPage.tsx](src/pages/EventspaceSetupPage.tsx) | Organization creation UI |
| [OrganizationSelectPage.tsx](src/pages/OrganizationSelectPage.tsx) | Organization selection UI |

