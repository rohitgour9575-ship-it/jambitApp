import AsyncStorage from '@react-native-async-storage/async-storage';
import { AuthSession, JambitUser } from '../types';

const sessionKey = 'jambit.auth.session.v1';

export async function readSession() {
  const raw = await AsyncStorage.getItem(sessionKey);
  if (!raw) return null;

  try {
    const session = JSON.parse(raw) as AuthSession;
    if (!session?.token || !session?.user) return null;

    const now = Date.now();
    return {
      ...session,
      client: session.client || 'app',
      savedAt: Number(session.savedAt || now),
      lastActiveAt: Number(session.lastActiveAt || now),
    };
  } catch {
    await clearSession();
    return null;
  }
}

export async function saveSession(token: string, user: JambitUser) {
  const now = Date.now();
  const session: AuthSession = {
    token,
    user,
    client: 'app',
    savedAt: now,
    lastActiveAt: now,
  };
  await AsyncStorage.setItem(sessionKey, JSON.stringify(session));
  return session;
}

export async function touchSession(session: AuthSession) {
  const nextSession = { ...session, lastActiveAt: Date.now() };
  await AsyncStorage.setItem(sessionKey, JSON.stringify(nextSession));
  return nextSession;
}

export function clearSession() {
  return AsyncStorage.removeItem(sessionKey);
}
