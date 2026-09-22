import { appConfig } from '../config/appConfig';
import { JambitChatConversation, JambitChatMessage, JambitFriend } from '../types';
import { apiRequest } from './client';

export function getSocketBaseUrl() {
  return appConfig.apiBaseUrl.replace(/\/api\/?$/, '');
}

export function getChatConversations(token: string) {
  return apiRequest<{ conversations: JambitChatConversation[] }>('/chat/conversations', { token });
}

export function getChatMessages(
  token: string,
  friendId: string,
  options: { limit?: number; before?: string } = {},
) {
  const params = new URLSearchParams();
  params.set('limit', String(options.limit || 20));
  if (options.before) params.set('before', options.before);
  return apiRequest<{
    conversationId: string;
    friend: JambitFriend;
    messages: JambitChatMessage[];
    pagination: {
      limit: number;
      hasMore: boolean;
      nextCursor: string | null;
    };
  }>(`/chat/conversations/${encodeURIComponent(friendId)}/messages?${params.toString()}`, { token });
}

export function sendChatMessage(token: string, friendId: string, text: string, messageId: string) {
  return apiRequest<{ message: JambitChatMessage }>(
    `/chat/conversations/${encodeURIComponent(friendId)}/messages`,
    { method: 'POST', token, body: { text, messageId } },
  );
}

export function markChatRead(token: string, conversationId: string) {
  return apiRequest<{ ok: true }>(
    `/chat/conversations/${encodeURIComponent(conversationId)}/read`,
    { method: 'POST', token },
  );
}
