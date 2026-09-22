import { apiRequest } from './client';
import { JambitUser } from '../types';

type AuthResponse = {
  token: string;
  user: JambitUser;
  needsOnboarding?: boolean;
  accountDeletionCancelled?: boolean;
};

type SignupCity = {
  city?: string;
  name?: string;
  description?: string;
  placeId?: string;
  place_id?: string;
};

type StartEmailSignupBody = {
  name: string;
  email: string;
  password: string;
  city: SignupCity;
  ageConfirmed: boolean;
};

type StartEmailSignupResponse = {
  signupToken: string;
  email: string;
  expiresInSeconds: number;
  message: string;
};

type StartPasswordResetResponse = {
  resetToken?: string;
  email: string;
  expiresInSeconds: number;
  resendAfterSeconds: number;
  message: string;
};

type VerifyPasswordResetResponse = {
  resetToken: string;
  email: string;
  message: string;
};

type CompletePasswordResetResponse = {
  email: string;
  message: string;
};

export function loginWithEmail(email: string, password: string) {
  return apiRequest<AuthResponse>('/auth/login', {
    method: 'POST',
    body: { email, password },
  });
}

export function startEmailSignup(body: StartEmailSignupBody) {
  return apiRequest<StartEmailSignupResponse>('/auth/signup/start', {
    method: 'POST',
    body,
    timeoutMs: 20000,
  });
}

export function verifyEmailSignup(signupToken: string, otp: string) {
  return apiRequest<AuthResponse>('/auth/signup/verify', {
    method: 'POST',
    body: { signupToken, otp },
  });
}

export function startPasswordReset(email: string) {
  return apiRequest<StartPasswordResetResponse>('/auth/password/forgot', {
    method: 'POST',
    body: { email },
    timeoutMs: 20000,
  });
}

export function verifyPasswordResetCode(resetToken: string, otp: string) {
  return apiRequest<VerifyPasswordResetResponse>('/auth/password/verify', {
    method: 'POST',
    body: { resetToken, otp },
  });
}

export function completePasswordReset(resetToken: string, password: string) {
  return apiRequest<CompletePasswordResetResponse>('/auth/password/reset', {
    method: 'POST',
    body: { resetToken, password },
  });
}

export function loginWithGoogleAccessToken(accessToken: string) {
  return apiRequest<AuthResponse>('/auth/google', {
    method: 'POST',
    body: { accessToken },
  });
}

export function getCurrentUser(token: string) {
  return apiRequest<{ user: JambitUser }>('/auth/me', {
    token,
  });
}

export function updateCurrentUser(token: string, body: Partial<JambitUser>) {
  return apiRequest<{ user: JambitUser }>('/auth/me', {
    method: 'PATCH',
    token,
    body,
  });
}

export function changeCurrentPassword(token: string, currentPassword: string, password: string) {
  return apiRequest<{ user: JambitUser; message: string }>('/auth/password/change', {
    method: 'POST',
    token,
    body: { currentPassword, password },
  });
}

export function requestCurrentUserDeletion(token: string) {
  return apiRequest<{ message: string; scheduledFor: string }>('/auth/account-deletion', {
    method: 'POST',
    token,
  });
}
