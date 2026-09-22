import { JambitFriend } from '../types';
import { apiRequest } from './client';

export function getFriends(token: string) {
  return apiRequest<{ friends: JambitFriend[] }>('/friends', { token });
}

export function getFriendRequests(token: string) {
  return apiRequest<{ requests: JambitFriend[] }>('/friends/requests', { token });
}

export function sendFriendRequest(token: string, recipientId: string) {
  return apiRequest<{ status: 'pending' | 'accepted'; friendship: { id?: string } }>('/friends/requests', {
    method: 'POST',
    token,
    body: { recipientId },
  });
}

export function acceptFriendRequest(token: string, requestId: string) {
  return apiRequest<{ status: 'accepted'; friendship: { id?: string } }>(
    `/friends/requests/${encodeURIComponent(requestId)}/accept`,
    { method: 'POST', token },
  );
}

export function declineFriendRequest(token: string, requestId: string) {
  return apiRequest<{ status: 'declined' }>(
    `/friends/requests/${encodeURIComponent(requestId)}/decline`,
    { method: 'POST', token },
  );
}
