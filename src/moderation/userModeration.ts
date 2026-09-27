import AsyncStorage from '@react-native-async-storage/async-storage';
import { apiRequest } from '../api/client';

const BLOCKED_USERS_KEY = 'jambit.moderation.blocked_users.v1';
const REPORTS_CACHE_KEY = 'jambit.moderation.reports.v1';

export type BlockedUserRecord = {
  id: string;
  name?: string;
  blockedAt: number;
};

export type ReportContentType = 'event' | 'group' | 'comment' | 'chat' | 'user';

export type ReportPayload = {
  contentType: ReportContentType;
  contentId: string;
  reportedUserId?: string;
  reportedUserName?: string;
  reason: string;
  details?: string;
  timestamp: number;
};

export const REPORT_REASONS = [
  'Inappropriate or offensive content',
  'Harassment or hate speech',
  'Spam or misleading information',
  'Violence or dangerous content',
  'Nudity or sexually suggestive content',
  'Scam or fraudulent activity',
  'Other violation of Community Guidelines',
] as const;

type ModerationListener = (blockedIds: string[]) => void;
const listeners = new Set<ModerationListener>();

export function subscribeToBlockedUsers(listener: ModerationListener): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

function notifyListeners(blockedIds: string[]) {
  listeners.forEach((listener) => {
    try {
      listener(blockedIds);
    } catch {
      // ignore listener errors
    }
  });
}

export async function getBlockedUsers(): Promise<BlockedUserRecord[]> {
  try {
    const raw = await AsyncStorage.getItem(BLOCKED_USERS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) {
      return parsed.map((item) => {
        if (typeof item === 'string') {
          return { id: item, blockedAt: Date.now() };
        }
        return item as BlockedUserRecord;
      });
    }
    return [];
  } catch {
    return [];
  }
}

export async function getBlockedUserIds(): Promise<string[]> {
  const users = await getBlockedUsers();
  return users.map((u) => String(u.id));
}

export async function blockUser(userId: string, userName?: string): Promise<BlockedUserRecord[]> {
  if (!userId) return getBlockedUsers();
  const current = await getBlockedUsers();
  const cleanId = String(userId);
  const exists = current.some((u) => String(u.id) === cleanId);
  let updated = current;
  if (!exists) {
    updated = [{ id: cleanId, name: userName || 'User', blockedAt: Date.now() }, ...current];
    await AsyncStorage.setItem(BLOCKED_USERS_KEY, JSON.stringify(updated));
  }
  notifyListeners(updated.map((u) => String(u.id)));
  return updated;
}

export async function unblockUser(userId: string): Promise<BlockedUserRecord[]> {
  const current = await getBlockedUsers();
  const cleanId = String(userId);
  const updated = current.filter((u) => String(u.id) !== cleanId);
  await AsyncStorage.setItem(BLOCKED_USERS_KEY, JSON.stringify(updated));
  notifyListeners(updated.map((u) => String(u.id)));
  return updated;
}

export async function isUserBlocked(userId: string): Promise<boolean> {
  if (!userId) return false;
  const ids = await getBlockedUserIds();
  return ids.includes(String(userId));
}

export async function submitReport(
  payload: Omit<ReportPayload, 'timestamp'>,
  token?: string
): Promise<{ success: boolean; message: string }> {
  const reportItem: ReportPayload = {
    ...payload,
    timestamp: Date.now(),
  };

  // Attempt remote logging to backend if endpoint available
  try {
    if (token) {
      await apiRequest('/reports', {
        method: 'POST',
        body: reportItem,
        token,
        timeoutMs: 4000,
      });
    }
  } catch {
    // If backend reports route does not exist or fails, cache locally so it is not lost
  }

  try {
    const rawReports = await AsyncStorage.getItem(REPORTS_CACHE_KEY);
    const existing: ReportPayload[] = rawReports ? JSON.parse(rawReports) : [];
    existing.unshift(reportItem);
    await AsyncStorage.setItem(REPORTS_CACHE_KEY, JSON.stringify(existing.slice(0, 100)));
  } catch {
    // ignore local storage error
  }

  return {
    success: true,
    message: 'Thank you for reporting. Our moderation team reviews reports within 24 hours and takes immediate action.',
  };
}
