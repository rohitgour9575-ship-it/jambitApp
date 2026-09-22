import { apiRequest } from './client';
import {
  EventVerificationPayload,
  HostVerificationCheckType,
  InterestCategory,
  JambitEvent,
  JambitEventAttendee,
  JambitEventComment,
  JambitGroup,
  JambitPayment,
  JambitTicket,
  PublicUserProfilePayload,
} from '../types';

export function getEvents(token?: string) {
  return apiRequest<{ events: JambitEvent[] }>('/events?excludeHosted=true', { token });
}

export function getEventComments(eventId: string, token?: string) {
  return apiRequest<{ comments: JambitEventComment[] }>(
    `/events/${encodeURIComponent(eventId)}/comments`,
    { token },
  );
}

export function getEventAttendees(eventId: string, token: string) {
  return apiRequest<{ attendees: JambitEventAttendee[]; total: number }>(
    `/events/${encodeURIComponent(eventId)}/attendees`,
    { token },
  );
}

export function createEventComment(
  token: string,
  eventId: string,
  body: { body: string; parentId?: string },
) {
  return apiRequest<{ comment: JambitEventComment }>(
    `/events/${encodeURIComponent(eventId)}/comments`,
    {
      method: 'POST',
      token,
      body,
    },
  );
}

export function updateEventRsvp(token: string, eventId: string, status: 'going' | 'not-going') {
  return apiRequest<{ event: JambitEvent; rsvp: { status: string } }>(
    `/events/${encodeURIComponent(eventId)}/rsvp`,
    {
      method: 'POST',
      token,
      body: { status },
    },
  );
}

export function getPaymentConfiguration(platform: 'ios' | 'android') {
  return apiRequest<{
    payment: {
      platform: 'ios' | 'android' | 'web';
      paidBookingEnabled: boolean;
      provider: 'razorpay' | null;
    };
  }>(`/payments/configuration?platform=${encodeURIComponent(platform)}`);
}

export function createEventPaymentOrder(
  token: string,
  eventId: string,
  customerPhone: string,
  platform: 'ios' | 'android',
) {
  return apiRequest<{ payment: JambitPayment }>(
    `/payments/events/${encodeURIComponent(eventId)}/orders`,
    {
      method: 'POST',
      token,
      body: { customerPhone, platform },
      timeoutMs: 30000,
    },
  );
}

export function verifyEventPaymentOrder(
  token: string,
  orderId: string,
  verification: {
    razorpayPaymentId: string;
    razorpayOrderId: string;
    razorpaySignature: string;
  },
) {
  return apiRequest<{ payment: JambitPayment }>(
    `/payments/orders/${encodeURIComponent(orderId)}/verify`,
    {
      method: 'POST',
      token,
      body: verification,
      timeoutMs: 30000,
    },
  );
}

export function getPublicUserProfile(userId: string, token?: string) {
  return apiRequest<PublicUserProfilePayload>(`/users/${encodeURIComponent(userId)}/public`, { token });
}

export function getMyTickets(token: string) {
  return apiRequest<{ tickets: JambitTicket[] }>('/events/my-tickets', { token });
}

export function cancelEventTicket(token: string, eventId: string) {
  return apiRequest<{
    event: JambitEvent;
    cancelled: boolean;
    refundPending: boolean;
    message: string;
  }>(`/events/${encodeURIComponent(eventId)}/ticket`, {
    method: 'DELETE',
    token,
  });
}

export function getGroups(token?: string) {
  return apiRequest<{ groups: JambitGroup[] }>('/groups?excludeHosted=true', { token });
}

export function getTrendingGroups(token: string, page = 1, limit = 10) {
  const query = new URLSearchParams({
    page: String(page),
    limit: String(limit),
    excludeHosted: 'true',
  });
  return apiRequest<{
    groups: JambitGroup[];
    page: number;
    limit: number;
    total: number;
    hasMore: boolean;
  }>(`/groups/trending?${query.toString()}`, { token });
}

export function getMyGroups(token: string) {
  return apiRequest<{ groups: JambitGroup[] }>('/groups/mine', { token });
}

export function createGroup(
  token: string,
  body: {
    name: string;
    description: string;
    topics: string[];
    location: { city?: string; description: string };
    image?: string;
  },
) {
  return apiRequest<{ group: JambitGroup }>('/groups', {
    method: 'POST',
    token,
    body,
    timeoutMs: 20000,
  });
}

export function getEventVerificationRequirement(token: string, estimatedPoolAmount = 0) {
  return apiRequest<EventVerificationPayload>(
    `/events/verification-requirements?estimatedPoolAmount=${encodeURIComponent(estimatedPoolAmount)}`,
    { token },
  );
}

export function submitHostVerification(
  token: string,
  body: {
    type: HostVerificationCheckType;
    estimatedPoolAmount: number;
    value?: string;
    aadhaar_number?: string;
    pan_number?: string;
    bank_account_number?: string;
    accountNumber?: string;
    ifsc?: string;
    account_holder?: string;
    phone_number?: string;
    gstin?: string;
  },
) {
  return apiRequest<EventVerificationPayload>('/events/host-verification', {
    method: 'POST',
    token,
    body,
    timeoutMs: 30000,
  });
}

export function createEvent(
  token: string,
  body: {
    groupSlug?: string;
    groupName?: string;
    category?: string;
    topics?: string[];
    title: string;
    description: string;
    type: 'Online' | 'In person';
    date: string;
    time: string;
    endDate?: string;
    endTime?: string;
    location?: string;
    venue?: string;
    onlineUrl?: string;
    ticketAmount?: number;
    estimatedPoolAmount?: number;
    price?: string;
    capacity?: number;
    image?: string;
    status?: 'published' | 'draft';
  },
) {
  return apiRequest<{ event: JambitEvent }>('/events', {
    method: 'POST',
    token,
    body,
    timeoutMs: 30000,
  });
}

export function getInterestCategories() {
  return apiRequest<{ categories: InterestCategory[] }>('/interests/categories');
}

export function getWorkIndustries() {
  return apiRequest<{ industries: Array<{ id?: string; label: string }> }>('/interests/work-industries');
}
