import React from 'react'
import {
  LoginPage,
  RegistrationPage,
  EmailVerificationPage,
  CreatePasswordPage,
  EventspaceSetupPage,
  OrganizationSelectPage,
  withSuspense
} from './lazyImports'
import type { UseAuthReturn } from '../../hooks/useAuth'
import { hasOrganization } from '../../hooks/useAuth'

interface AuthScreensProps {
  auth: UseAuthReturn
}

export function AuthScreens({ auth }: AuthScreensProps): React.ReactElement | null {
  const {
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
    handleResendCode,
    invitePreferLogin,
    setInvitePreferLogin
  } = auth

  const isLoginPath = typeof window !== 'undefined' && window.location.pathname === '/login'

  const inviteInUrl =
    Boolean(window.location.pathname.match(/\/invites\/[^/]+/)) ||
    Boolean(new URLSearchParams(window.location.search).get('invite'))

  const hasPendingInvites =
    Boolean(localStorage.getItem('pendingInvitesFromToken')) || inviteInUrl

  if (isAuthenticated && showOrganizationSelect && (!hasOrganization() || hasPendingInvites) && !showCreatePassword && !showEmailVerification && !showRegistration) {
    return withSuspense(
      <OrganizationSelectPage
        onSelect={handleOrganizationSelect}
        onNeedToCreateOrg={handleNeedToCreateOrg}
        onLogout={handleLogout}
      />
    )
  }

  if (showEventspaceSetup && (!isAuthenticated || !hasOrganization())) {
    return withSuspense(
      <EventspaceSetupPage
        onSubmit={handleEventspaceSetup}
        isLoading={isCreatingOrganization}
        error={organizationCreationError}
        onNameChange={() => setOrganizationCreationError(null)}
      />
    )
  }

  if (!isAuthenticated) {
    if (showCreatePassword && !isLoginPath) {
      return withSuspense(
        <CreatePasswordPage
          onSubmit={handlePasswordCreation}
          isLoading={isCreatingPassword}
          error={passwordCreationError}
          onPasswordChange={() => setPasswordCreationError(null)}
        />
      )
    }

    if (showEmailVerification && !isLoginPath) {
      return withSuspense(
        <EmailVerificationPage
          email={registrationEmail}
          onVerify={handleEmailVerification}
          onResendCode={handleResendCode}
          isLoading={isVerifyingOtp}
          error={otpVerificationError}
          onCodeChange={() => setOtpVerificationError(null)}
        />
      )
    }

    // Show RegistrationPage when: user clicked "Create account" OR arrived via invite link
    // (invite links default to signup since most invitees are new users)
    // Skip if the user explicitly chose to log in instead (invitePreferLogin flag)
    if ((showRegistration || (inviteInUrl && !invitePreferLogin)) && !isLoginPath) {
      return withSuspense(
        <RegistrationPage
          onSubmit={handleRegistration}
          onTermsClick={() => {}}
          onAlreadyHaveAccount={() => {
            setInvitePreferLogin(true)
            setShowRegistration(false)
          }}
          onClose={() => {
            setInvitePreferLogin(true)
            setShowRegistration(false)
          }}
        />
      )
    }

    return withSuspense(
      <LoginPage
        onSubmit={handleLogin}
        onGoogleSignIn={handleGoogleSignIn}
        onMicrosoftSignIn={handleMicrosoftSignIn}
        onMagicLinkSignIn={handleMagicLinkSignIn}
        onForgotPassword={() => {}}
        onNavigateToRegistration={() => setShowRegistration(true)}
      />
    )
  }

  if (isAuthenticated && !hasOrganization()) {
    return withSuspense(
      <EventspaceSetupPage
        onSubmit={handleEventspaceSetup}
        isLoading={isCreatingOrganization}
        error={organizationCreationError}
        onNameChange={() => setOrganizationCreationError(null)}
      />
    )
  }

  return null
}
