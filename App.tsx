import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Animated,
  BackHandler,
  Easing,
  FlatList,
  Image,
  ImageBackground,
  Keyboard,
  KeyboardAvoidingView,
  Linking,
  Modal,
  NativeModules,
  Pressable,
  PermissionsAndroid,
  Platform,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text as NativeText,
  TextInput as NativeTextInput,
  View,
} from 'react-native';
import type { StyleProp, ViewStyle } from 'react-native';
import {
  Bell,
  BookOpen,
  BriefcaseBusiness,
  CalendarHeart,
  CalendarDays,
  CreditCard,
  Clock,
  Check,
  CheckCheck,
  ChevronDown,
  ChevronRight,
  Compass,
  Drama,
  Dumbbell,
  ArrowLeft,
  Eye,
  EyeOff,
  Flag,
  Gamepad2,
  GraduationCap,
  HandHeart,
  Heart,
  Home,
  Languages,
  Laptop,
  Lock,
  LogOut,
  Mail,
  Map,
  MapPin,
  MessageCircle,
  MoreHorizontal,
  Music2,
  Palette,
  PartyPopper,
  PawPrint,
  Plane,
  Phone,
  Plus,
  Search,
  Send,
  Settings,
  Share2,
  Sparkles,
  TentTree,
  TicketCheck,
  Trees,
  Trophy,
  Trash2,
  User,
  UserCheck,
  UserPlus,
  Users,
  UsersRound,
  X,
} from 'lucide-react-native';
import { GoogleSignin, isErrorWithCode } from '@react-native-google-signin/google-signin';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createNavigationContainerRef, NavigationContainer, useIsFocused } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { enableScreens } from 'react-native-screens';
import { SafeAreaProvider, useSafeAreaInsets } from 'react-native-safe-area-context';
import { TamaguiProvider } from '@tamagui/core';
import RazorpayCheckout from 'react-native-razorpay';
import QRCode from 'react-native-qrcode-svg';
import { io, type Socket } from 'socket.io-client';
import Svg, { Path } from 'react-native-svg';
import Reanimated, {
  FadeInLeft,
  FadeInRight,
  FadeOutLeft,
  FadeOutRight,
} from 'react-native-reanimated';

import { appConfig } from './src/config/appConfig';
import tamaguiConfig from './src/tamagui.config';
import { ApiError } from './src/api/client';
import {
  completePasswordReset,
  getCurrentUser,
  loginWithEmail,
  loginWithGoogleAccessToken,
  requestCurrentUserDeletion,
  startEmailSignup,
  startPasswordReset,
  verifyPasswordResetCode,
  verifyEmailSignup,
} from './src/api/auth';
import {
  createEventComment,
  cancelEventTicket,
  createEventPaymentOrder,
  createEvent,
  createGroup,
  getEventAttendees,
  getEventComments,
  getEventVerificationRequirement,
  getPaymentConfiguration,
  getEvents,
  getGroups,
  getInterestCategories,
  getMyGroups,
  getMyTickets,
  getPublicUserProfile,
  getTrendingGroups,
  submitHostVerification,
  updateEventRsvp,
  verifyEventPaymentOrder,
} from './src/api/content';
import {
  getChatConversations,
  getChatMessages,
  getSocketBaseUrl,
  markChatRead,
  sendChatMessage,
} from './src/api/chat';
import {
  acceptFriendRequest,
  declineFriendRequest,
  getFriendRequests,
  sendFriendRequest,
} from './src/api/friends';
import { PlaceSuggestion, searchCities, searchPlaces } from './src/api/locations';
import {
  getNotifications,
  markAllNotificationsRead,
  markNotificationRead,
  registerPushDevice,
  removePushDevice,
} from './src/api/notifications';
import {
  getCurrentPushToken,
  requestPushPermission,
  subscribeToForegroundPushes,
  subscribeToOpenedPushes,
  subscribeToPushTokenRefresh,
} from './src/notifications/pushNotifications';
import { clearSession, readSession, saveSession, touchSession } from './src/storage/session';
import { colors, fonts, radius, shadow, spacing, typography, type } from './src/theme';
import { ProfileSettingsPanel, type ProfileSettingsPanelName } from './src/screens/ProfileSettingsPanels';
import {
  AuthSession,
  EventVerificationPayload,
  HostVerificationCheckType,
  InterestCategory,
  JambitEvent,
  JambitEventAttendee,
  JambitEventComment,
  JambitChatConversation,
  JambitChatMessage,
  JambitFriend,
  JambitGroup,
  JambitNotification,
  JambitTicket,
  JambitUser,
  PublicUserProfilePayload,
} from './src/types';

const showVisualBackButton = Platform.OS === 'ios';

const Text = React.forwardRef<any, React.ComponentProps<typeof NativeText>>(({ style, ...props }, ref) => (
  <NativeText ref={ref} {...props} style={[typography.defaultTextStyle, style]} />
));
Text.displayName = 'JambitText';

const TextInput = React.forwardRef<any, React.ComponentProps<typeof NativeTextInput>>(({ style, ...props }, ref) => (
  <NativeTextInput ref={ref} {...props} style={[typography.defaultInputStyle, style]} />
));
TextInput.displayName = 'JambitTextInput';

enableScreens(true);

type RouteName = 'home' | 'explore' | 'groups' | 'messages' | 'notifications' | 'profile' | 'createGroup' | 'groupDetail' | 'createEvent';
type AuthStep = 'entry' | 'login' | 'signup' | 'signupVerify' | 'forgotEmail' | 'forgotOtp' | 'forgotPassword';
type AppStackParamList = {
  Auth: undefined;
  Main: undefined;
  EventDetail: undefined;
  EventAttendees: { eventId: string; eventTitle: string; attendeeCount: number };
  TrendingGroups: undefined;
  MyTickets: undefined;
  PublicProfile: { userId: string };
};

const AppStack = createNativeStackNavigator<AppStackParamList>();
const appNavigationRef = createNavigationContainerRef<AppStackParamList>();
const transitionOrder: Record<string, number> = {
  'auth-entry': 0,
  'auth-login': 1,
  'auth-signup': 1,
  'auth-forgotEmail': 1,
  'auth-signupVerify': 2,
  'auth-forgotOtp': 2,
  'auth-forgotPassword': 3,
  'route-home': 0,
  'route-explore': 1,
  'route-groups': 2,
  'route-messages': 3,
  'route-notifications': 4,
  'route-profile': 5,
  'route-createGroup': 6,
  'route-groupDetail': 7,
  'route-createEvent': 8,
};
type ToastState = {
  message: string;
  tone: 'success' | 'error' | 'info';
};

type NativeLocationResponse = {
  latitude: number;
  longitude: number;
  city?: string;
  description?: string;
};

type HomeAddress = {
  id: string;
  label: string;
  detail?: string;
  placeId?: string;
  source: 'device' | 'manual' | 'profile';
};

type LocationSheetMode = 'choose' | 'add' | 'all';

type BottomTabItem = {
  route: RouteName;
  label: string;
  Icon: React.ComponentType<{ size?: number; color?: string }>;
  primary?: boolean;
};

type CreationDraftType = 'group' | 'event';

type CreationDraft = {
  id: string;
  type: CreationDraftType;
  userKey: string;
  title: string;
  subtitle: string;
  stepIndex?: number;
  stepKey?: string;
  payload: Record<string, any>;
  createdAt: string;
  updatedAt: string;
};

type RouteOptions = {
  draft?: CreationDraft | null;
};

const creationDraftsKey = 'jambit.creation.drafts.v1';

function creationDraftUserKey(user?: JambitUser | null) {
  return user?.id || user?.email || 'guest';
}

function createCreationDraftId(draftType: CreationDraftType) {
  return `${draftType}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

async function readCreationDrafts() {
  try {
    const raw = await AsyncStorage.getItem(creationDraftsKey);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed as CreationDraft[] : [];
  } catch {
    return [];
  }
}

async function writeCreationDrafts(drafts: CreationDraft[]) {
  await AsyncStorage.setItem(creationDraftsKey, JSON.stringify(drafts));
}

async function getCreationDraftsForUser(userKey: string) {
  const drafts = await readCreationDrafts();
  return drafts
    .filter((draft) => draft.userKey === userKey)
    .sort((first, second) => new Date(second.updatedAt || 0).getTime() - new Date(first.updatedAt || 0).getTime());
}

async function upsertCreationDraft(draft: Omit<CreationDraft, 'createdAt' | 'updatedAt'> & { createdAt?: string }) {
  const now = new Date().toISOString();
  const existing = await readCreationDrafts();
  const previous = existing.find((item) => item.id === draft.id);
  const nextDraft: CreationDraft = {
    ...draft,
    createdAt: draft.createdAt || previous?.createdAt || now,
    updatedAt: now,
  };

  await writeCreationDrafts([nextDraft, ...existing.filter((item) => item.id !== nextDraft.id)]);
  return nextDraft;
}

async function removeCreationDraftById(draftId: string) {
  const drafts = await readCreationDrafts();
  await writeCreationDrafts(drafts.filter((draft) => draft.id !== draftId));
}

function creationDraftDateLabel(value?: string) {
  const date = value ? new Date(value) : null;
  if (!date || Number.isNaN(date.getTime())) return 'Just now';
  return new Intl.DateTimeFormat('en-IN', {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  }).format(date);
}

const eventHero =
  'https://images.unsplash.com/photo-1517048676732-d65bc937f952?auto=format&fit=crop&w=1200&q=80';
const authPeopleHero = require('./src/assets/auth-people-hero.png');
const jambitAppIcon = require('./src/assets/jambit-app-icon.png');
const jambitSplashLogo = require('./src/assets/jambit-splash-logo.png');
const googleSignInAndroidSetupMessage =
  'Google sign-in is not configured for this Android build. Add OAuth Android client package com.jambit with the debug SHA-1.';
const googleSignInIosClientId =
  '585462712555-33htrgfok9urbnsp48pca150pli1aml9.apps.googleusercontent.com';
const savedHomeAddressesKey = 'jambit.home.addresses.v1';
const selectedHomeAddressKey = 'jambit.home.selectedAddress.v1';
const jambitLocationModule = NativeModules.JambitLocation as
  | undefined
  | {
      getCurrentLocation: () => Promise<NativeLocationResponse>;
      openLocationSettings?: () => Promise<void>;
    };
const dayMs = 24 * 60 * 60 * 1000;

const bottomTabs: BottomTabItem[] = [
  { route: 'home', label: 'Home', Icon: Home },
  { route: 'explore', label: 'Explore', Icon: Search },
  { route: 'groups', label: 'Create', Icon: Plus, primary: true },
  { route: 'messages', label: 'Chats', Icon: MessageCircle },
  { route: 'profile', label: 'Profile', Icon: User },
];

const darkDateFilters = ['Upcoming', 'Today', 'Tomorrow', 'Weekend'] as const;
type DarkDateFilter = (typeof darkDateFilters)[number];

const defaultDarkCategories = ['All Events', 'New groups'];
const fallbackExploreCategories = ['Social Activities', 'Hobbies & Passions', 'Sports & Fitness'];
const exploreCategoryPalette = [
  { background: '#fff0d7', foreground: '#ed8b00' },
  { background: '#ffe7ec', foreground: '#ef476f' },
  { background: '#e1f7eb', foreground: '#20a866' },
  { background: '#e6efff', foreground: '#3478e5' },
  { background: '#eee9ff', foreground: '#7557df' },
  { background: '#fff0ea', foreground: '#ff5c3d' },
] as const;

function exploreCategoryIcon(category: string) {
  const name = category.toLowerCase();

  if (name.includes('all event')) return CalendarHeart;
  if (name.includes('new group')) return UsersRound;
  if (name.includes('art') || name.includes('culture')) return Palette;
  if (name.includes('career') || name.includes('business')) return BriefcaseBusiness;
  if (name.includes('environment')) return Trees;
  if (name.includes('danc')) return Drama;
  if (name.includes('game')) return Gamepad2;
  if (name.includes('health') || name.includes('fitness') || name.includes('sport')) return Dumbbell;
  if (name.includes('hobb') || name.includes('passion')) return Sparkles;
  if (name.includes('identity') || name.includes('language')) return Languages;
  if (name.includes('social') || name.includes('communit')) return Users;
  if (name.includes('tech')) return Laptop;
  if (name.includes('travel') || name.includes('outdoor')) return TentTree;
  if (name.includes('music')) return Music2;
  if (name.includes('education') || name.includes('science') || name.includes('study')) return GraduationCap;
  if (name.includes('support') || name.includes('volunteer')) return HandHeart;
  if (name.includes('pet') || name.includes('animal')) return PawPrint;
  if (name.includes('book') || name.includes('writing')) return BookOpen;
  if (name.includes('party')) return PartyPopper;
  if (name.includes('travel')) return Plane;
  return Compass;
}

const oneDayMs = 24 * 60 * 60 * 1000;
const starterScreenMinMs = 3200;

function startOfLocalDay(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function parseEventDate(value?: string) {
  if (!value) {
    return null;
  }
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function isSameLocalDay(value: Date, reference: Date) {
  return startOfLocalDay(value).getTime() === startOfLocalDay(reference).getTime();
}

function eventMatchesDateFilter(event: JambitEvent, filter: DarkDateFilter) {
  const eventDate = parseEventDate(event.startAt);
  const today = new Date();

  if (!eventDate) {
    return filter === 'Upcoming';
  }

  if (filter === 'Today') {
    return isSameLocalDay(eventDate, today);
  }

  if (filter === 'Tomorrow') {
    return isSameLocalDay(eventDate, new Date(today.getTime() + oneDayMs));
  }

  if (filter === 'Weekend') {
    const daysAway = Math.floor((startOfLocalDay(eventDate).getTime() - startOfLocalDay(today).getTime()) / oneDayMs);
    return daysAway >= 0 && daysAway <= 7 && (eventDate.getDay() === 0 || eventDate.getDay() === 6);
  }

  return eventDate.getTime() >= startOfLocalDay(today).getTime();
}

function eventMatchesCategory(event: JambitEvent, category: string) {
  if (category === 'All Events') {
    return true;
  }

  const haystack = `${event.title} ${event.groupName || ''} ${event.type || ''} ${event.description || ''} ${eventLocationLabel(event)}`.toLowerCase();
  const normalized = category.toLowerCase();

  if (normalized.includes('social')) {
    return /social|friend|conversation|community|network|boardroom/.test(haystack);
  }
  if (normalized.includes('hobbies')) {
    return /hobby|writing|creative|book|art|music|photo|dance|workshop/.test(haystack);
  }
  if (normalized.includes('sport')) {
    return /sport|fitness|football|run|yoga|wellbeing/.test(haystack);
  }

  return haystack.includes(normalized);
}

function groupToFeedEvent(group: JambitGroup, index: number): JambitEvent {
  const members = group.memberCount ?? group.memberIds?.length ?? 0;
  const city = group.location?.city || group.location?.description || 'JambIt group';

  return {
    id: `group-${group.id || group._id || group.slug || index}`,
    title: group.name || 'JambIt group',
    groupName: city,
    image: group.image || eventHero,
    type: 'New group',
    startAt: new Date(Date.now() + (index + 1) * oneDayMs).toISOString(),
    attendees: members,
    description: group.description,
    location: { description: city },
  };
}

function eventKey(event: JambitEvent) {
  return String(event.id || event._id || event.title);
}

function isDiscoverableEvent(event: JambitEvent) {
  return event.canAttend !== false && !event.canEdit;
}

function eventLocationLabel(event: JambitEvent) {
  if (typeof event.location === 'string') return event.location;
  return event.location?.description || event.location?.venue || event.venue || '';
}

function eventVenueLabel(event: JambitEvent) {
  if (typeof event.location === 'string') return event.venue || event.location;
  return event.location?.venue || event.venue || event.location?.description || '';
}

function formatHomeLocationLabel(address: HomeAddress | null, fallback: string) {
  if (!address) return fallback;
  const label = address.label.trim();
  const detail = address.detail?.trim();
  if (!detail || /^-?\d+(\.\d+)?,\s*-?\d+(\.\d+)?$/.test(detail)) return label;

  const parts = detail.split(',').map((part) => part.trim()).filter(Boolean);
  const labelIndex = parts.findIndex((part) => part.toLowerCase() === label.toLowerCase());
  if (labelIndex >= 0) {
    return parts.slice(labelIndex, labelIndex + 3).join(', ');
  }

  return parts.slice(0, 3).join(', ') || label;
}

function withTimeout<T>(promise: Promise<T>, timeoutMs = appConfig.apiTimeoutMs + 1500): Promise<T> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error('Operation timed out.')), timeoutMs);
    promise.then(
      value => {
        clearTimeout(timer);
        resolve(value);
      },
      error => {
        clearTimeout(timer);
        reject(error);
      },
    );
  });
}

async function requestDeviceLocationPermission() {
  if (Platform.OS !== 'android') {
    return true;
  }

  const permissions = [
    PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
    PermissionsAndroid.PERMISSIONS.ACCESS_COARSE_LOCATION,
  ];
  const alreadyGranted = await Promise.all(
    permissions.map((permission) => PermissionsAndroid.check(permission)),
  );

  if (alreadyGranted.some(Boolean)) {
    return true;
  }

  const result = await PermissionsAndroid.requestMultiple(permissions);
  return permissions.some((permission) => result[permission] === PermissionsAndroid.RESULTS.GRANTED);
}

function makeDeviceAddress(location: NativeLocationResponse): HomeAddress {
  const coordinates = `${location.latitude.toFixed(5)}, ${location.longitude.toFixed(5)}`;
  const label = location.city || location.description || coordinates;
  const detail = location.description && location.description !== label ? location.description : coordinates;

  return {
    id: 'current-device-location',
    label,
    detail,
    source: 'device',
  };
}

function makeProfileAddress(user: JambitUser): HomeAddress | null {
  const label = user.location?.city || user.location?.description;
  if (!label) return null;

  return {
    id: 'profile-location',
    label,
    detail: user.location?.description && user.location.description !== label ? user.location.description : undefined,
    source: 'profile',
  };
}

function App() {
  return (
    <TamaguiProvider config={tamaguiConfig} defaultTheme="light">
      <SafeAreaProvider>
        <StatusBar barStyle="dark-content" backgroundColor={colors.bg} />
        <AppContent />
      </SafeAreaProvider>
    </TamaguiProvider>
  );
}

function ScreenTransition({
  transitionKey,
  children,
  style,
  enabled = true,
}: {
  transitionKey: string;
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  enabled?: boolean;
}) {
  const previousKeyRef = useRef(transitionKey);
  const previousOrder = transitionOrder[previousKeyRef.current] ?? 0;
  const nextOrder = transitionOrder[transitionKey] ?? previousOrder;
  const movingBack = nextOrder < previousOrder;

  useEffect(() => {
    previousKeyRef.current = transitionKey;
  }, [transitionKey]);

  if (!enabled) {
    return <View style={[styles.screenTransition, style]}>{children}</View>;
  }

  const entering = movingBack
    ? FadeInLeft.duration(500)
    : FadeInRight.duration(500);
  const exiting = movingBack
    ? FadeOutRight.duration(350)
    : FadeOutLeft.duration(350);

  return (
    <View style={[styles.screenTransition, style]}>
      <Reanimated.View
        key={transitionKey}
        entering={entering}
        exiting={exiting}
        style={[styles.screenTransitionLayer, styles.screenTransitionLayerAbsolute]}>
        {children}
      </Reanimated.View>
    </View>
  );
}

function useKeyboardLift(active: boolean) {
  const lift = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!active) {
      lift.stopAnimation();
      lift.setValue(0);
      return undefined;
    }

    const showEvent = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const hideEvent = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';
    const animateTo = (toValue: number, duration = 260) => {
      Animated.timing(lift, {
        toValue,
        duration: Math.max(180, Math.min(duration, 340)),
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }).start();
    };

    const showSubscription = Keyboard.addListener(showEvent, (event) => {
      const keyboardHeight = event.endCoordinates?.height ?? 0;
      const liftAmount = Math.min(
        keyboardHeight * (Platform.OS === 'android' ? 0.24 : 0.16),
        Platform.OS === 'android' ? 118 : 96,
      );
      animateTo(liftAmount, event.duration ?? 260);
    });
    const hideSubscription = Keyboard.addListener(hideEvent, (event) => {
      animateTo(0, event.duration ?? 220);
    });

    return () => {
      showSubscription.remove();
      hideSubscription.remove();
    };
  }, [active, lift]);

  return lift;
}

function SkeletonBlock({ style }: { style?: StyleProp<ViewStyle> }) {
  const opacity = useRef(new Animated.Value(0.62)).current;

  useEffect(() => {
    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, {
          toValue: 1,
          duration: 780,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: true,
        }),
        Animated.timing(opacity, {
          toValue: 0.62,
          duration: 780,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: true,
        }),
      ]),
    );

    animation.start();
    return () => animation.stop();
  }, [opacity]);

  return <Animated.View style={[styles.skeletonBlock, style, { opacity }]} />;
}

function BootSplash({ topInset }: { topInset: number }) {
  const logoOpacity = useRef(new Animated.Value(1)).current;
  const logoScale = useRef(new Animated.Value(0.96)).current;
  const logoLift = useRef(new Animated.Value(8)).current;
  const loader = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const loaderAnimation = Animated.loop(
      Animated.sequence([
        Animated.timing(loader, {
          toValue: 1,
          duration: 850,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: true,
        }),
        Animated.timing(loader, {
          toValue: 0,
          duration: 850,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: true,
        }),
      ]),
    );

    loaderAnimation.start();
    Animated.parallel([
      Animated.timing(logoScale, {
        toValue: 1,
        duration: 640,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.timing(logoOpacity, {
        toValue: 1,
        duration: 520,
        easing: Easing.out(Easing.quad),
        useNativeDriver: true,
      }),
      Animated.timing(logoLift, {
        toValue: 0,
        duration: 640,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
    ]).start();

    Animated.sequence([
      Animated.delay(720),
      Animated.spring(logoScale, {
        toValue: 1.02,
        friction: 7,
        tension: 34,
        useNativeDriver: true,
      }),
      Animated.spring(logoScale, {
        toValue: 1,
        friction: 7,
        tension: 34,
        useNativeDriver: true,
      }),
    ]).start();

    return () => {
      loaderAnimation.stop();
    };
  }, [loader, logoLift, logoOpacity, logoScale]);

  const loaderTranslate = loader.interpolate({
    inputRange: [0, 1],
    outputRange: [-42, 42],
  });

  return (
    <View style={[styles.bootScreen, { paddingTop: topInset }]}>
      <LightBackgroundDecor />
      <View style={styles.bootStage}>
        <Animated.View
          style={[
            styles.bootBrand,
            {
              opacity: logoOpacity,
              transform: [{ translateY: logoLift }, { scale: logoScale }],
            },
          ]}>
          <Image source={jambitSplashLogo} style={styles.bootBrandLogo} />
        </Animated.View>
      </View>
      <Animated.View style={styles.bootLoaderTrack}>
        <Animated.View style={[styles.bootLoaderDot, { transform: [{ translateX: loaderTranslate }] }]} />
      </Animated.View>
    </View>
  );
}

function AppContent() {
  const insets = useSafeAreaInsets();
  const [booting, setBooting] = useState(true);
  const [contentLoading, setContentLoading] = useState(true);
  const [session, setSession] = useState<AuthSession | null>(null);
  const [activeRoute, setActiveRoute] = useState<RouteName>('home');
  const [routeSettling, setRouteSettling] = useState(false);
  const activeRouteRef = useRef<RouteName>('home');
  const routeHistoryRef = useRef<RouteName[]>(['home']);
  const routeSettleTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [events, setEvents] = useState<JambitEvent[]>([]);
  const [groups, setGroups] = useState<JambitGroup[]>([]);
  const [discoveryGroups, setDiscoveryGroups] = useState<JambitGroup[]>([]);
  const [categories, setCategories] = useState<InterestCategory[]>([]);
  const [selectedEvent, setSelectedEvent] = useState<JambitEvent | null>(null);
  const [selectedGroup, setSelectedGroup] = useState<JambitGroup | null>(null);
  const [activeCreationDraft, setActiveCreationDraft] = useState<CreationDraft | null>(null);
  const [creationDrafts, setCreationDrafts] = useState<CreationDraft[]>([]);
  const [sharedEvent, setSharedEvent] = useState<JambitEvent | null>(null);
  const [wishlistedEventIds, setWishlistedEventIds] = useState<Set<string>>(() => new Set());
  const [notifications, setNotifications] = useState<JambitNotification[]>([]);
  const [unreadNotificationCount, setUnreadNotificationCount] = useState(0);
  const [unreadChatCount, setUnreadChatCount] = useState(0);
  const [chatTargetUserId, setChatTargetUserId] = useState('');
  const [toast, setToast] = useState<ToastState | null>(null);
  const sessionUserRef = useRef<JambitUser | null>(null);
  const pushNavigationRef = useRef<(data?: Record<string, string>) => Promise<void>>(async () => undefined);

  const showToast = useCallback((message: string, tone: ToastState['tone'] = 'info') => {
    setToast({ message, tone });
  }, []);

  const signedInUser = session?.user || null;
  const discoverableEvents = useMemo(() => events.filter(isDiscoverableEvent), [events]);

  const refreshNotifications = useCallback(async (activeToken?: string) => {
    if (!activeToken) {
      setNotifications([]);
      setUnreadNotificationCount(0);
      return;
    }

    const payload = await getNotifications(activeToken);
    setNotifications(payload.notifications || []);
    setUnreadNotificationCount(Number(payload.unreadCount || 0));
  }, []);

  const refreshUnreadChats = useCallback(async (activeToken?: string) => {
    if (!activeToken) {
      setUnreadChatCount(0);
      return;
    }
    const payload = await getChatConversations(activeToken);
    setUnreadChatCount(
      (payload.conversations || []).reduce(
        (total, conversation) => total + Number(conversation.unreadCount || 0),
        0,
      ),
    );
  }, []);

  useEffect(() => {
    const activeToken = session?.token;
    if (!activeToken) {
      setUnreadChatCount(0);
      return undefined;
    }

    const syncUnread = () => refreshUnreadChats(activeToken).catch(() => undefined);
    const socket = io(getSocketBaseUrl(), {
      auth: { token: activeToken },
      transports: ['websocket', 'polling'],
      reconnection: true,
    });
    socket.on('connect', syncUnread);
    socket.on('chat:message', syncUnread);
    socket.on('chat:read', syncUnread);
    syncUnread();
    const interval = setInterval(syncUnread, 30000);

    return () => {
      clearInterval(interval);
      socket.disconnect();
    };
  }, [refreshUnreadChats, session?.token]);

  useEffect(() => {
    sessionUserRef.current = session?.user || null;
  }, [session?.user]);

  const refreshCreationDrafts = useCallback(async (userOverride?: JambitUser | null) => {
    const activeUser = userOverride || sessionUserRef.current;
    if (!activeUser) {
      setCreationDrafts([]);
      return;
    }

    const drafts = await getCreationDraftsForUser(creationDraftUserKey(activeUser));
    setCreationDrafts(drafts);
  }, []);

  const loadContent = useCallback(
    async (activeSession?: AuthSession | null) => {
      setContentLoading(true);
      try {
        const results = await Promise.allSettled([
          getEvents(activeSession?.token),
          getGroups(activeSession?.token),
          activeSession?.token ? getMyGroups(activeSession.token) : Promise.resolve({ groups: [] }),
          getInterestCategories(),
        ]);

        const eventResult = results[0];
        if (eventResult.status === 'fulfilled') {
          setEvents(eventResult.value.events || []);
        }

        const discoveryGroupResult = results[1];
        if (discoveryGroupResult.status === 'fulfilled') {
          setDiscoveryGroups(
            (discoveryGroupResult.value.groups || []).filter((group) => group.canEdit !== true),
          );
        }

        const groupResult = results[2];
        if (groupResult.status === 'fulfilled') {
          setGroups(groupResult.value.groups || []);
        }

        const categoryResult = results[3];
        if (categoryResult.status === 'fulfilled') {
          setCategories(categoryResult.value.categories || []);
        }
      } finally {
        setContentLoading(false);
      }
    },
    [],
  );

  useEffect(() => {
    GoogleSignin.configure({
      scopes: ['email', 'profile'],
      offlineAccess: false,
      iosClientId: googleSignInIosClientId,
    });

    let mounted = true;
    let starterTimer: ReturnType<typeof setTimeout> | null = null;
    const bootStartedAt = Date.now();

    const finishBoot = () => {
      const elapsed = Date.now() - bootStartedAt;
      starterTimer = setTimeout(() => {
        if (mounted) setBooting(false);
      }, Math.max(0, starterScreenMinMs - elapsed));
    };

    async function boot() {
      const storedSession = await readSession();
      if (!storedSession) {
        finishBoot();
        setCreationDrafts([]);
        loadContent(null).catch(() => undefined);
        return;
      }

      try {
        if (mounted) {
          setSession(storedSession);
        }
        refreshNotifications(storedSession.token).catch(() => undefined);
        refreshCreationDrafts(storedSession.user).catch(() => undefined);
        loadContent(storedSession).catch(() => undefined);

        const payload = await withTimeout(getCurrentUser(storedSession.token));
        const nextSession = await saveSession(storedSession.token, payload.user);
        if (mounted) {
          setSession(nextSession);
        }
        refreshCreationDrafts(nextSession.user).catch(() => undefined);
      } catch (error) {
        if (error instanceof ApiError && (error.status === 401 || error.status === 403)) {
          await clearSession();
          if (mounted) {
            setSession(null);
            setCreationDrafts([]);
          }
          loadContent(null).catch(() => undefined);
        }
      } finally {
        finishBoot();
      }
    }

    boot();
    return () => {
      mounted = false;
      if (starterTimer) clearTimeout(starterTimer);
    };
  }, [loadContent, refreshCreationDrafts, refreshNotifications]);

  const handleAuthenticated = useCallback(
    async (token: string, user: JambitUser) => {
      const nextSession = await saveSession(token, user);
      setSession(nextSession);
      sessionUserRef.current = user;
      activeRouteRef.current = 'home';
      routeHistoryRef.current = ['home'];
      setActiveRoute('home');
      showToast('Signed in successfully.', 'success');
      refreshCreationDrafts(user).catch(() => undefined);
      refreshNotifications(token).catch(() => undefined);
      loadContent(nextSession).catch(() => undefined);
    },
    [loadContent, refreshCreationDrafts, refreshNotifications, showToast],
  );

  const handleUserUpdated = useCallback(
    async (updatedUser: JambitUser) => {
      if (!session?.token) return;
      const nextSession = await saveSession(session.token, updatedUser);
      sessionUserRef.current = updatedUser;
      setSession((current) => (current?.token === session.token ? nextSession : current));
    },
    [session?.token],
  );

  const settleRouteContent = useCallback(() => {
    if (routeSettleTimerRef.current) {
      clearTimeout(routeSettleTimerRef.current);
    }

    setRouteSettling(true);
    routeSettleTimerRef.current = setTimeout(() => {
      setRouteSettling(false);
      routeSettleTimerRef.current = null;
    }, 180);
  }, []);

  useEffect(
    () => () => {
      if (routeSettleTimerRef.current) {
        clearTimeout(routeSettleTimerRef.current);
      }
    },
    [],
  );

  const touchActiveSession = useCallback(() => {
    if (!session) return;

    setTimeout(() => {
      touchSession(session)
        .then((nextSession) => {
          setSession((current) => (current?.token === session.token ? nextSession : current));
        })
        .catch(() => undefined);
    }, 0);
  }, [session]);

  const handleMainRoute = useCallback(
    (nextRoute: RouteName, options?: RouteOptions) => {
      setActiveCreationDraft(options?.draft || null);

      if (nextRoute !== activeRouteRef.current) {
        activeRouteRef.current = nextRoute;
        routeHistoryRef.current = [...routeHistoryRef.current, nextRoute].slice(-16);
        settleRouteContent();
        setActiveRoute(nextRoute);
      }

      touchActiveSession();
    },
    [settleRouteContent, touchActiveSession],
  );

  const handleMainBackRoute = useCallback(() => {
    const history = routeHistoryRef.current;

    if (history.length > 1) {
      const nextHistory = history.slice(0, -1);
      const nextRoute = nextHistory[nextHistory.length - 1] || 'home';
      routeHistoryRef.current = nextHistory;
      activeRouteRef.current = nextRoute;
      settleRouteContent();
      setActiveRoute(nextRoute);
      return true;
    }

    if (activeRouteRef.current !== 'home') {
      routeHistoryRef.current = ['home'];
      activeRouteRef.current = 'home';
      settleRouteContent();
      setActiveRoute('home');
      return true;
    }

    return false;
  }, [settleRouteContent]);

  const handleLogout = useCallback(async () => {
    const activeToken = session?.token;
    if (activeToken) {
      const pushToken = await getCurrentPushToken().catch(() => '');
      await removePushDevice(activeToken, pushToken || undefined).catch(() => undefined);
    }
    await clearSession();
    setSession(null);
    sessionUserRef.current = null;
    setCreationDrafts([]);
    setActiveCreationDraft(null);
    activeRouteRef.current = 'home';
    routeHistoryRef.current = ['home'];
    setActiveRoute('home');
    setNotifications([]);
    setUnreadNotificationCount(0);
    showToast('Logged out.', 'info');
  }, [session?.token, showToast]);

  const handlePushNavigation = useCallback(
    async (data?: Record<string, string>) => {
      if (!session?.token) return;

      if (data?.notificationId) {
        await markNotificationRead(session.token, data.notificationId).catch(() => undefined);
      }
      refreshNotifications(session.token).catch(() => undefined);

      if (data?.route === 'event' && data.eventId) {
        const matchingEvent = events.find((event) => eventKey(event) === data.eventId);
        if (matchingEvent && appNavigationRef.isReady()) {
          setSelectedEvent(matchingEvent);
          appNavigationRef.navigate('EventDetail');
          return;
        }
      }

      const destination: RouteName = data?.route === 'messages' ? 'messages' : 'notifications';
      handleMainRoute(destination);
      if (appNavigationRef.isReady()) {
        appNavigationRef.navigate('Main');
      }
    },
    [events, handleMainRoute, refreshNotifications, session?.token],
  );

  const handleNotificationPress = useCallback(
    async (notification: JambitNotification) => {
      if (!session?.token) return;
      if (!notification.readAt) {
        setNotifications((current) =>
          current.map((item) => item.id === notification.id ? { ...item, readAt: new Date().toISOString() } : item),
        );
        setUnreadNotificationCount((current) => Math.max(0, current - 1));
        await markNotificationRead(session.token, notification.id).catch(() => undefined);
      }
      await handlePushNavigation({ ...notification.data, notificationId: notification.id });
    },
    [handlePushNavigation, session?.token],
  );

  useEffect(() => {
    pushNavigationRef.current = handlePushNavigation;
  }, [handlePushNavigation]);

  const handleMarkAllNotificationsRead = useCallback(async () => {
    if (!session?.token || unreadNotificationCount === 0) return;
    setNotifications((current) =>
      current.map((item) => ({ ...item, readAt: item.readAt || new Date().toISOString() })),
    );
    setUnreadNotificationCount(0);
    await markAllNotificationsRead(session.token).catch(() => {
      refreshNotifications(session.token).catch(() => undefined);
    });
  }, [refreshNotifications, session?.token, unreadNotificationCount]);

  useEffect(() => {
    const activeToken = session?.token;
    if (!activeToken) return undefined;

    let mounted = true;
    const registerToken = async (pushToken: string) => {
      if (!mounted || !pushToken) return;
      await registerPushDevice(activeToken, {
        token: pushToken,
        platform: Platform.OS === 'ios' ? 'ios' : 'android',
        deviceName: Platform.OS === 'ios' ? 'iPhone' : 'Android device',
        appVersion: '1.0',
      });
    };

    requestPushPermission()
      .then(async (granted) => {
        if (!granted || !mounted) return;
        const pushToken = await getCurrentPushToken();
        await registerToken(pushToken);
      })
      .catch((error) => console.warn('Unable to register push notifications:', error));

    refreshNotifications(activeToken).catch(() => undefined);
    const unsubscribeForeground = subscribeToForegroundPushes(() => {
      refreshNotifications(activeToken).catch(() => undefined);
    });
    const unsubscribeRefresh = subscribeToPushTokenRefresh((pushToken) => {
      registerToken(pushToken).catch(() => undefined);
    });
    const unsubscribeOpened = subscribeToOpenedPushes((data) => {
      pushNavigationRef.current(data as Record<string, string> | undefined).catch(() => undefined);
    });

    return () => {
      mounted = false;
      unsubscribeForeground();
      unsubscribeRefresh();
      unsubscribeOpened();
    };
  }, [refreshNotifications, session?.token]);

  const handleToggleWishlist = useCallback((event: JambitEvent) => {
    const key = eventKey(event);
    const isSaved = wishlistedEventIds.has(key);
    setWishlistedEventIds((current) => {
      const next = new Set(current);
      if (next.has(key)) {
        next.delete(key);
      } else {
        next.add(key);
      }
      return next;
    });
    showToast(isSaved ? 'Event removed from saved.' : 'Event saved.', isSaved ? 'info' : 'success');
  }, [showToast, wishlistedEventIds]);

  const handleGroupCreated = useCallback((group: JambitGroup) => {
    const nextKey = group.id || group._id || group.slug || group.name;
    const addOrReplaceGroup = (current: JambitGroup[]) => [
        group,
        ...current.filter((item) => (item.id || item._id || item.slug || item.name) !== nextKey),
      ];
    setGroups(addOrReplaceGroup);
    setDiscoveryGroups(addOrReplaceGroup);
  }, []);

  const handleEventCreated = useCallback((event: JambitEvent) => {
    const nextKey = eventKey(event);
    setEvents((current) => [
      event,
      ...current.filter((item) => eventKey(item) !== nextKey),
    ]);
  }, []);

  const handleOpenGroup = useCallback(
    (group: JambitGroup) => {
      setSelectedGroup(group);
      handleMainRoute('groupDetail');
    },
    [handleMainRoute],
  );

  const handleStartCreateEvent = useCallback(
    (group: JambitGroup) => {
      setSelectedGroup(group);
      handleMainRoute('createEvent', { draft: null });
    },
    [handleMainRoute],
  );

  const handleResumeCreationDraft = useCallback(
    (draft: CreationDraft) => {
      if (draft.type === 'event') {
        const draftGroupSlug = String(draft.payload?.groupSlug || draft.payload?.group?.slug || '');
        const draftGroupName = String(draft.payload?.groupName || draft.payload?.group?.name || '');
        const matchingGroup = groups.find((item) => {
          const itemSlug = String(item.slug || item.id || item._id || '');
          return (draftGroupSlug && itemSlug === draftGroupSlug) || (draftGroupName && item.name === draftGroupName);
        });
        const fallbackGroup = draft.payload?.group && typeof draft.payload.group === 'object'
          ? draft.payload.group as JambitGroup
          : null;

        setSelectedGroup(matchingGroup || fallbackGroup || selectedGroup || groups[0] || null);
        handleMainRoute('createEvent', { draft });
        return;
      }

      handleMainRoute('createGroup', { draft });
    },
    [groups, handleMainRoute, selectedGroup],
  );

  const handleRemoveCreationDraft = useCallback(
    async (draftId: string) => {
      await removeCreationDraftById(draftId);
      refreshCreationDrafts().catch(() => undefined);
      showToast('Draft removed.', 'info');
    },
    [refreshCreationDrafts, showToast],
  );

  useEffect(() => {
    if (Platform.OS !== 'android') return undefined;

    const subscription = BackHandler.addEventListener('hardwareBackPress', () => {
      if (sharedEvent) {
        setSharedEvent(null);
        return true;
      }

      return false;
    });

    return () => subscription.remove();
  }, [sharedEvent]);

  if (booting) {
    return <BootSplash topInset={insets.top} />;
  }

  const rootInsetStyle = { paddingTop: signedInUser ? insets.top : 0 };
  const commonScreenOptions = {
    headerShown: false,
    animation: Platform.OS === 'android' ? 'slide_from_right' as const : 'default' as const,
    animationDuration: 500,
    fullScreenGestureEnabled: true,
    gestureEnabled: true,
    contentStyle: {
      backgroundColor: colors.bg,
    },
  };

  return (
    <View
      style={[
        styles.screen,
        !signedInUser ? styles.authScreen : null,
        rootInsetStyle,
      ]}>
      <NavigationContainer ref={appNavigationRef} key={signedInUser ? 'signed-in' : 'signed-out'}>
        <AppStack.Navigator
          initialRouteName={signedInUser ? 'Main' : 'Auth'}
          screenOptions={commonScreenOptions}>
          {!signedInUser ? (
            <AppStack.Screen name="Auth">
              {() => (
                <AuthFlow
                  standalone
                  onAuthenticated={handleAuthenticated}
                  onToast={showToast}
                />
              )}
            </AppStack.Screen>
          ) : (
            <>
              <AppStack.Screen name="Main">
                {({ navigation }) => (
                  <MainShell
                    user={signedInUser}
                    route={activeRoute}
                    events={events}
                    groups={groups}
                    discoveryGroups={discoveryGroups}
                    selectedGroup={selectedGroup}
                    creationDrafts={creationDrafts}
                    activeCreationDraft={activeCreationDraft}
                    categories={categories}
                    sessionToken={session?.token || ''}
                    notifications={notifications}
                    unreadNotificationCount={unreadNotificationCount}
                    unreadChatCount={unreadChatCount}
                    loading={contentLoading}
                    settling={routeSettling}
                    onRoute={handleMainRoute}
                    onBackRoute={handleMainBackRoute}
                    onOpenGroup={handleOpenGroup}
                    onOpenTrendingGroups={() => navigation.push('TrendingGroups')}
                    onOpenTickets={() => navigation.push('MyTickets')}
                    onGroupCreated={handleGroupCreated}
                    onEventCreated={handleEventCreated}
                    onCreateEvent={handleStartCreateEvent}
                    onResumeCreationDraft={handleResumeCreationDraft}
                    onRemoveCreationDraft={handleRemoveCreationDraft}
                    onDraftsChanged={() => refreshCreationDrafts().catch(() => undefined)}
                    onLogout={handleLogout}
                    onUserUpdated={handleUserUpdated}
                    onToast={showToast}
                    onShare={setSharedEvent}
                    onOpenEvent={(event) => {
                      setSelectedEvent(event);
                      navigation.push('EventDetail');
                    }}
                    onNotificationPress={handleNotificationPress}
                    onMarkAllNotificationsRead={handleMarkAllNotificationsRead}
                    onUnreadChatCountChange={setUnreadChatCount}
                    chatTargetUserId={chatTargetUserId}
                    onChatTargetHandled={() => setChatTargetUserId('')}
                    onOpenUser={(userId) => {
                      if (String(userId) === String(signedInUser.id || '')) {
                        handleMainRoute('profile');
                        return;
                      }
                      navigation.push('PublicProfile', { userId });
                    }}
                  />
                )}
              </AppStack.Screen>
              <AppStack.Screen name="EventDetail">
                {({ navigation }) => {
                  const event = selectedEvent || events[0];
                  return event ? (
                    <EventDetailScreen
                      event={event}
                      events={discoverableEvents}
                      categories={categories}
                      currentUser={signedInUser}
                      sessionToken={session?.token || ''}
                      isWishlisted={wishlistedEventIds.has(eventKey(event))}
                      onBack={() => navigation.goBack()}
                      onOpenEvent={(nextEvent) => {
                        setSelectedEvent(nextEvent);
                        navigation.push('EventDetail');
                      }}
                      onShare={() => setSharedEvent(event)}
                      onToggleWishlist={() => handleToggleWishlist(event)}
                      onOpenAttendees={() => navigation.push('EventAttendees', {
                        eventId: String(event.id || event._id || ''),
                        eventTitle: event.title,
                        attendeeCount: Math.max(0, Number(event.attendees || 0)),
                      })}
                      onOpenUser={(userId) => {
                        if (String(userId) === String(signedInUser.id || '')) {
                          handleMainRoute('profile');
                          navigation.goBack();
                          return;
                        }
                        navigation.push('PublicProfile', { userId });
                      }}
                      onEventUpdated={(updatedEvent) => {
                        setSelectedEvent(updatedEvent);
                        setEvents((current) => current.map((item) => (
                          eventKey(item) === eventKey(updatedEvent) ? updatedEvent : item
                        )));
                      }}
                      onToast={showToast}
                    />
                  ) : (
                    <SimpleScreenSkeleton />
                  );
                }}
              </AppStack.Screen>
              <AppStack.Screen name="EventAttendees">
                {({ navigation, route }) => (
                  <EventAttendeesScreen
                    eventId={route.params.eventId}
                    eventTitle={route.params.eventTitle}
                    initialCount={route.params.attendeeCount}
                    sessionToken={session?.token || ''}
                    onBack={() => navigation.goBack()}
                    onOpenUser={(userId) => {
                      if (String(userId) === String(signedInUser.id || '')) {
                        handleMainRoute('profile');
                        navigation.navigate('Main');
                        return;
                      }
                      navigation.push('PublicProfile', { userId });
                    }}
                  />
                )}
              </AppStack.Screen>
              <AppStack.Screen name="TrendingGroups">
                {({ navigation }) => (
                  <TrendingGroupsScreen
                    sessionToken={session?.token || ''}
                    onBack={() => navigation.goBack()}
                    onOpenGroup={(group) => {
                      handleOpenGroup(group);
                      navigation.navigate('Main');
                    }}
                  />
                )}
              </AppStack.Screen>
              <AppStack.Screen name="MyTickets">
                {({ navigation }) => (
                  <MyTicketsScreen
                    sessionToken={session?.token || ''}
                    onBack={() => navigation.goBack()}
                    onOpenEvent={(event) => {
                      setSelectedEvent(event);
                      navigation.push('EventDetail');
                    }}
                    onToast={showToast}
                  />
                )}
              </AppStack.Screen>
              <AppStack.Screen name="PublicProfile">
                {({ navigation, route }) => (
                  <PublicProfileScreen
                    userId={route.params.userId}
                    currentUser={signedInUser}
                    sessionToken={session?.token || ''}
                    onBack={() => navigation.goBack()}
                    onOpenOwnProfile={() => {
                      handleMainRoute('profile');
                      navigation.goBack();
                    }}
                    onOpenEvent={(event) => {
                      setSelectedEvent(event);
                      navigation.push('EventDetail');
                    }}
                    onChat={(userId) => {
                      setChatTargetUserId(userId);
                      handleMainRoute('messages');
                      navigation.navigate('Main');
                    }}
                    onToast={showToast}
                  />
                )}
              </AppStack.Screen>
            </>
          )}
        </AppStack.Navigator>
      </NavigationContainer>

      <ShareSheet event={sharedEvent} onClose={() => setSharedEvent(null)} onToast={showToast} />

      <Toast
        toast={toast}
        onDismiss={() => setToast(null)}
        bottom={insets.bottom + (signedInUser ? 104 : 16)}
      />
    </View>
  );
}

function MainShell({
  user,
  route,
  events,
  groups,
  discoveryGroups,
  selectedGroup,
  creationDrafts,
  activeCreationDraft,
  categories,
  sessionToken,
  notifications,
  unreadNotificationCount,
  unreadChatCount,
  loading,
  settling,
  onRoute,
  onBackRoute,
  onOpenGroup,
  onOpenTrendingGroups,
  onOpenTickets,
  onGroupCreated,
  onEventCreated,
  onCreateEvent,
  onResumeCreationDraft,
  onRemoveCreationDraft,
  onDraftsChanged,
  onLogout,
  onUserUpdated,
  onToast,
  onShare,
  onOpenEvent,
  onNotificationPress,
  onMarkAllNotificationsRead,
  onUnreadChatCountChange,
  chatTargetUserId,
  onChatTargetHandled,
  onOpenUser,
}: {
  user: JambitUser;
  route: RouteName;
  events: JambitEvent[];
  groups: JambitGroup[];
  discoveryGroups: JambitGroup[];
  selectedGroup: JambitGroup | null;
  creationDrafts: CreationDraft[];
  activeCreationDraft: CreationDraft | null;
  categories: InterestCategory[];
  sessionToken: string;
  notifications: JambitNotification[];
  unreadNotificationCount: number;
  unreadChatCount: number;
  loading: boolean;
  settling: boolean;
  onRoute: (route: RouteName, options?: RouteOptions) => void;
  onBackRoute: () => boolean;
  onOpenGroup: (group: JambitGroup) => void;
  onOpenTrendingGroups: () => void;
  onOpenTickets: () => void;
  onGroupCreated: (group: JambitGroup) => void;
  onEventCreated: (event: JambitEvent) => void;
  onCreateEvent: (group: JambitGroup) => void;
  onResumeCreationDraft: (draft: CreationDraft) => void;
  onRemoveCreationDraft: (draftId: string) => void;
  onDraftsChanged: () => void;
  onLogout: () => void;
  onUserUpdated: (user: JambitUser) => Promise<void>;
  onToast: (message: string, tone?: ToastState['tone']) => void;
  onShare: (event: JambitEvent) => void;
  onOpenEvent: (event: JambitEvent) => void;
  onNotificationPress: (notification: JambitNotification) => void;
  onMarkAllNotificationsRead: () => void;
  onUnreadChatCountChange: (count: number) => void;
  chatTargetUserId: string;
  onChatTargetHandled: () => void;
  onOpenUser: (userId: string) => void;
}) {
  const isFocused = useIsFocused();
  const isHomeRoute = route === 'home';
  const isExploreRoute = route === 'explore';
  const isChromeLightRoute = isHomeRoute || isExploreRoute;
  const hideSharedHeader =
    isChromeLightRoute || route === 'profile' || route === 'groups' || route === 'messages' || route === 'notifications' || route === 'createGroup' || route === 'groupDetail' || route === 'createEvent';
  const hideBottomTabs = route === 'createGroup' || route === 'groupDetail' || route === 'createEvent';
  const showSkeleton = loading || settling;
  const discoverableEvents = useMemo(() => events.filter(isDiscoverableEvent), [events]);

  useEffect(() => {
    if (Platform.OS !== 'android' || !isFocused) return undefined;

    const subscription = BackHandler.addEventListener('hardwareBackPress', () => onBackRoute());
    return () => subscription.remove();
  }, [isFocused, onBackRoute]);

  return (
    <View style={[styles.screen, isChromeLightRoute && styles.darkShell]}>
      {!hideSharedHeader && <AppHeader route={route} user={user} onRoute={onRoute} />}
      <ScreenTransition
        transitionKey={`route-${route}`}
        style={[styles.mainBody, isChromeLightRoute && styles.darkMainBody]}>
        {isHomeRoute && (showSkeleton ? (
          <HomeSkeletonScreen />
        ) : (
          <HomeDashboardScreen
            user={user}
            events={discoverableEvents}
            groups={discoveryGroups}
            onRoute={onRoute}
            onOpenEvent={onOpenEvent}
            onOpenGroup={onOpenGroup}
            onOpenTrendingGroups={onOpenTrendingGroups}
            unreadNotificationCount={unreadNotificationCount}
          />
        ))}
        {isExploreRoute && (showSkeleton ? (
          <ExploreSkeletonScreen />
        ) : (
          <DarkFeedScreen
            categories={categories}
            events={discoverableEvents}
            groups={discoveryGroups}
            onShare={onShare}
            onOpenEvent={onOpenEvent}
          />
        ))}
        {route === 'groups' && (
          showSkeleton ? <SimpleScreenSkeleton /> : <GroupsScreen groups={groups} onRoute={onRoute} onOpenGroup={onOpenGroup} />
        )}
        {route === 'messages' && (showSkeleton ? <SimpleScreenSkeleton /> : (
          <MessagesScreen
            sessionToken={sessionToken}
            currentUser={user}
            initialFriendId={chatTargetUserId}
            onInitialFriendHandled={onChatTargetHandled}
            onRoute={onRoute}
            onOpenUser={onOpenUser}
            onToast={onToast}
            onUnreadCountChange={onUnreadChatCountChange}
          />
        ))}
        {route === 'notifications' && (
          showSkeleton ? <SimpleScreenSkeleton /> : (
            <NotificationsScreen
              notifications={notifications}
              unreadCount={unreadNotificationCount}
              onRoute={onRoute}
              onPress={onNotificationPress}
              onMarkAllRead={onMarkAllNotificationsRead}
            />
          )
        )}
        {route === 'profile' && (
          showSkeleton ? (
            <SimpleScreenSkeleton />
          ) : (
            <ProfileScreen
              user={user}
              groups={groups}
              creationDrafts={creationDrafts}
              categories={categories}
              sessionToken={sessionToken}
              onRoute={onRoute}
              onResumeDraft={onResumeCreationDraft}
              onRemoveDraft={onRemoveCreationDraft}
              onLogout={onLogout}
              onUserUpdated={onUserUpdated}
              onToast={onToast}
              onOpenTickets={onOpenTickets}
            />
          )
        )}
        {route === 'createGroup' && (
          showSkeleton ? (
            <SimpleScreenSkeleton />
          ) : (
            <CreateGroupScreen
              user={user}
              token={sessionToken}
              categories={categories}
              draft={activeCreationDraft?.type === 'group' ? activeCreationDraft : null}
              onRoute={onRoute}
              onCreated={onGroupCreated}
              onDraftsChanged={onDraftsChanged}
              onToast={onToast}
            />
          )
        )}
        {route === 'createEvent' && (
          showSkeleton ? (
            <SimpleScreenSkeleton />
          ) : (
            <CreateEventScreen
              group={selectedGroup || groups[0]}
              user={user}
              token={sessionToken}
              draft={activeCreationDraft?.type === 'event' ? activeCreationDraft : null}
              onBack={onBackRoute}
              onCreated={(event) => {
                onEventCreated(event);
                onRoute('groupDetail');
              }}
              onDraftsChanged={onDraftsChanged}
              onToast={onToast}
            />
          )
        )}
        {route === 'groupDetail' && (
          showSkeleton ? (
            <SimpleScreenSkeleton />
          ) : (
            <GroupDetailScreen
              group={selectedGroup || groups[0]}
              events={events}
              onBack={onBackRoute}
              onCreateEvent={onCreateEvent}
              onOpenEvent={onOpenEvent}
            />
          )
        )}
      </ScreenTransition>
      {!hideBottomTabs && (
        <BottomTabs route={route} unreadChatCount={unreadChatCount} onRoute={onRoute} />
      )}
    </View>
  );
}

function HomeSkeletonScreen() {
  return (
    <View style={styles.homeRoot}>
      <ScrollView style={styles.homeScreen} contentContainerStyle={styles.homeContent} showsVerticalScrollIndicator={false}>
        <View style={styles.homeTopBar}>
          <SkeletonBlock style={styles.skeletonLocation} />
          <SkeletonBlock style={styles.skeletonRoundSmall} />
        </View>
        <SkeletonBlock style={styles.skeletonGreetingLine} />
        <SkeletonBlock style={styles.skeletonGreetingShort} />
        <SkeletonBlock style={styles.skeletonSearch} />
        <View style={styles.skeletonShortcutRow}>
          {[0, 1, 2, 3, 4, 5].map((item) => (
            <View key={item} style={styles.skeletonShortcutItem}>
              <SkeletonBlock style={styles.skeletonShortcutCircle} />
              <SkeletonBlock style={styles.skeletonTinyLabel} />
            </View>
          ))}
        </View>
        <View style={styles.skeletonSectionHeader}>
          <SkeletonBlock style={styles.skeletonSectionTitle} />
          <SkeletonBlock style={styles.skeletonSeeAll} />
        </View>
        <View style={styles.skeletonCardRow}>
          {[0, 1, 2].map((item) => (
            <View key={item} style={styles.skeletonEventMini}>
              <SkeletonBlock style={styles.skeletonEventImage} />
              <SkeletonBlock style={styles.skeletonEventTitle} />
              <SkeletonBlock style={styles.skeletonEventMeta} />
            </View>
          ))}
        </View>
        <View style={styles.skeletonSectionHeader}>
          <SkeletonBlock style={styles.skeletonSectionTitle} />
          <SkeletonBlock style={styles.skeletonSeeAll} />
        </View>
        {[0, 1, 2].map((item) => (
          <View key={item} style={styles.skeletonListRow}>
            <SkeletonBlock style={styles.skeletonListIcon} />
            <View style={styles.flex1}>
              <SkeletonBlock style={styles.skeletonListTitle} />
              <SkeletonBlock style={styles.skeletonListMeta} />
            </View>
            <SkeletonBlock style={styles.skeletonAddButton} />
          </View>
        ))}
      </ScrollView>
    </View>
  );
}

function ExploreSkeletonScreen() {
  return (
    <View style={styles.darkFeed}>
      <ScrollView contentContainerStyle={styles.darkFeedContent} showsVerticalScrollIndicator={false}>
        <SkeletonBlock style={styles.skeletonExploreKicker} />
        <SkeletonBlock style={styles.skeletonExploreTitle} />
        <SkeletonBlock style={styles.skeletonExploreSubTitle} />
        <SkeletonBlock style={styles.skeletonExploreSearch} />
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.darkDateList}>
          {[0, 1, 2, 3].map((item) => (
            <SkeletonBlock key={item} style={styles.skeletonDatePill} />
          ))}
        </ScrollView>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.darkCategoryList}>
          {[0, 1, 2, 3, 4].map((item) => (
            <View key={item} style={styles.skeletonExploreCategory}>
              <SkeletonBlock style={styles.skeletonShortcutCircle} />
              <SkeletonBlock style={styles.skeletonCategoryLabel} />
            </View>
          ))}
        </ScrollView>
        {[0, 1, 2].map((item) => (
          <View key={item} style={styles.skeletonExploreCard}>
            <SkeletonBlock style={styles.skeletonExploreImage} />
            <SkeletonBlock style={styles.skeletonExploreCardTitle} />
            <SkeletonBlock style={styles.skeletonExploreCardMeta} />
            <SkeletonBlock style={styles.skeletonExploreCardMetaShort} />
          </View>
        ))}
      </ScrollView>
    </View>
  );
}

function SimpleScreenSkeleton() {
  return (
    <ScrollView contentContainerStyle={[styles.content, styles.profileContent]} showsVerticalScrollIndicator={false}>
      <SkeletonBlock style={styles.skeletonSimpleKicker} />
      <SkeletonBlock style={styles.skeletonSimpleTitle} />
      {[0, 1, 2, 3].map((item) => (
        <View key={item} style={styles.skeletonPanel}>
          <SkeletonBlock style={styles.skeletonPanelTitle} />
          <SkeletonBlock style={styles.skeletonPanelLine} />
          <SkeletonBlock style={styles.skeletonPanelShortLine} />
        </View>
      ))}
    </ScrollView>
  );
}

function AppHeader({
  route,
  user,
  onRoute,
}: {
  route: RouteName;
  user: JambitUser;
  onRoute: (route: RouteName) => void;
}) {
  const isCreate = route === 'groups';
  const isChats = route === 'messages';
  const headerCopy = isCreate
      ? {
        kicker: 'Create',
        title: 'Groups',
        subtitle: 'Host meetups and build your people list.',
        Icon: Plus,
        accent: colors.coral,
        tint: '#fff0e9',
      }
    : isChats
      ? {
          kicker: 'Chats',
          title: 'Messages',
          subtitle: 'Keep up with your event conversations.',
          Icon: MessageCircle,
          accent: colors.purple,
          tint: colors.purpleSoft,
        }
      : {
          kicker: 'Updates',
          title: 'Notifications',
          subtitle: 'Activity from your groups and events.',
          Icon: Bell,
          accent: colors.orange,
          tint: '#fff3d6',
        };
  const HeaderIcon = headerCopy.Icon;

  return (
    <View style={styles.appHeader}>
      <View style={[styles.appHeaderAccent, { backgroundColor: headerCopy.tint }]}>
        <HeaderIcon color={headerCopy.accent} size={22} strokeWidth={2.8} />
      </View>
      <View style={styles.appHeaderCopy}>
        <Text style={styles.appHeaderKicker}>{headerCopy.kicker}</Text>
        <Text style={styles.appHeaderTitle}>{headerCopy.title}</Text>
        <Text numberOfLines={1} style={styles.appHeaderSubtitle}>
          {headerCopy.subtitle}
        </Text>
      </View>
      <View style={styles.headerIconRow}>
        <Pressable style={styles.headerSearchButton} onPress={() => onRoute('explore')}>
          <Search color={colors.ink} size={19} strokeWidth={2.7} />
        </Pressable>
        <Pressable style={styles.avatarSmall} onPress={() => onRoute('profile')}>
          <Text style={styles.avatarSmallText}>{initials(user.name)}</Text>
        </Pressable>
      </View>
    </View>
  );
}

function HomeDashboardScreen({
  user,
  events,
  groups,
  onRoute,
  onOpenEvent,
  onOpenGroup,
  onOpenTrendingGroups,
  unreadNotificationCount,
}: {
  user: JambitUser;
  events: JambitEvent[];
  groups: JambitGroup[];
  onRoute: (route: RouteName) => void;
  onOpenEvent: (event: JambitEvent) => void;
  onOpenGroup: (group: JambitGroup) => void;
  onOpenTrendingGroups: () => void;
  unreadNotificationCount: number;
}) {
  const shortcutItems = [
    { label: 'All', Icon: Users, bg: '#fff0d2', color: colors.orange },
    { label: 'Friends', Icon: Users, bg: '#ffe8ec', color: colors.coral },
    { label: 'Sports', Icon: Trophy, bg: '#e8f8ee', color: colors.green },
    { label: 'Business', Icon: BriefcaseBusiness, bg: '#e9f1ff', color: '#2f80ed' },
    { label: 'Travel', Icon: Plane, bg: '#eeeaff', color: colors.purple },
    { label: 'More', Icon: MoreHorizontal, bg: '#f5efff', color: colors.purple },
  ];
  const profileAddress = useMemo(() => makeProfileAddress(user), [user]);
  const locationStorageScope = useMemo(
    () => encodeURIComponent(String(user.id || user.email || 'anonymous').toLowerCase()),
    [user.email, user.id],
  );
  const savedAddressesStorageKey = `${savedHomeAddressesKey}.${locationStorageScope}`;
  const selectedAddressStorageKey = `${selectedHomeAddressKey}.${locationStorageScope}`;
  const [deviceLocation, setDeviceLocation] = useState<HomeAddress | null>(null);
  const [selectedAddress, setSelectedAddress] = useState<HomeAddress | null>(null);
  const [manualAddresses, setManualAddresses] = useState<HomeAddress[]>([]);
  const [hasHydratedHomeLocation, setHasHydratedHomeLocation] = useState(false);
  const [locationSheetVisible, setLocationSheetVisible] = useState(false);
  const [locationSheetMode, setLocationSheetMode] = useState<LocationSheetMode>('choose');
  const [locationStatus, setLocationStatus] = useState<'idle' | 'loading' | 'error'>('idle');
  const [newAddress, setNewAddress] = useState('');

  const activeHomeAddress = selectedAddress || deviceLocation || profileAddress;
  const locationLabel = formatHomeLocationLabel(
    activeHomeAddress,
    locationStatus === 'loading' ? 'Finding your location...' : 'Use current location',
  );

  const persistSelectedHomeAddress = useCallback((address: HomeAddress) => {
    AsyncStorage.setItem(selectedAddressStorageKey, JSON.stringify(address)).catch(() => undefined);
  }, [selectedAddressStorageKey]);

  const refreshDeviceLocation = useCallback(async () => {
    setLocationStatus('loading');
    try {
      const permissionGranted = await requestDeviceLocationPermission();
      if (!permissionGranted) {
        throw new Error('Location permission denied.');
      }
      if (!jambitLocationModule?.getCurrentLocation) {
        throw new Error('Location is not available in this build.');
      }

      const location = await withTimeout(jambitLocationModule.getCurrentLocation(), 15000);
      const nextAddress = makeDeviceAddress(location);
      setDeviceLocation(nextAddress);
      setLocationStatus('idle');
    } catch {
      setLocationStatus('error');
    }
  }, []);

  useEffect(() => {
    let mounted = true;
    setManualAddresses([]);
    setSelectedAddress(null);
    setHasHydratedHomeLocation(false);

    Promise.all([AsyncStorage.getItem(savedAddressesStorageKey), AsyncStorage.getItem(selectedAddressStorageKey)])
      .then(([rawAddresses, rawSelectedAddress]) => {
        if (!mounted) return;

        if (rawAddresses) {
          try {
            const parsed = JSON.parse(rawAddresses) as HomeAddress[];
            if (Array.isArray(parsed)) {
              setManualAddresses(parsed.filter((address) => address?.label).slice(0, 5));
            }
          } catch {
            // Ignore malformed local cache and keep the app usable.
          }
        }

        if (rawSelectedAddress) {
          try {
            const parsed = JSON.parse(rawSelectedAddress) as HomeAddress;
            if (parsed?.label && parsed?.source) {
              setSelectedAddress(parsed);
            }
          } catch {
            // Ignore malformed local cache and fall back to device/profile location.
          }
        }
      })
      .catch(() => undefined)
      .then(() => {
        if (mounted) setHasHydratedHomeLocation(true);
      });

    return () => {
      mounted = false;
    };
  }, [savedAddressesStorageKey, selectedAddressStorageKey]);

  useEffect(() => {
    if (!hasHydratedHomeLocation || !deviceLocation) return;

    setSelectedAddress((currentAddress) => {
      if (currentAddress && currentAddress.id !== deviceLocation.id) {
        return currentAddress;
      }

      persistSelectedHomeAddress(deviceLocation);
      return deviceLocation;
    });
  }, [deviceLocation, hasHydratedHomeLocation, persistSelectedHomeAddress]);

  useEffect(() => {
    refreshDeviceLocation().catch(() => undefined);
  }, [refreshDeviceLocation]);

  const addressOptions = useMemo(() => {
    const options = [selectedAddress, deviceLocation, profileAddress, ...manualAddresses].filter(Boolean) as HomeAddress[];
    const seen = new Set<string>();
    return options.filter((address) => {
      const key = `${address.source}-${address.label}`.toLowerCase();
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }, [deviceLocation, manualAddresses, profileAddress, selectedAddress]);

  const savePlaceAddress = useCallback((place: PlaceSuggestion) => {
    const description = place.description.trim();
    if (!description) return;
    const label = (place.label || place.city || description.split(',')[0] || description).trim();
    const nextAddress: HomeAddress = {
      id: `place-${place.placeId || Date.now()}`,
      label,
      detail: description,
      placeId: place.placeId,
      source: 'manual',
    };
    const nextAddresses = [nextAddress, ...manualAddresses].slice(0, 5);
    setManualAddresses(nextAddresses);
    AsyncStorage.setItem(savedAddressesStorageKey, JSON.stringify(nextAddresses)).catch(() => undefined);
    setSelectedAddress(nextAddress);
    persistSelectedHomeAddress(nextAddress);
    setNewAddress('');
    setLocationSheetMode('choose');
    setLocationSheetVisible(false);
  }, [manualAddresses, persistSelectedHomeAddress, savedAddressesStorageKey]);

  const recommendedEvents = useMemo(() => {
    const primaryLocationTerm = (
      activeHomeAddress?.label || activeHomeAddress?.detail?.split(',')[0] || ''
    ).trim().toLowerCase();
    if (!primaryLocationTerm) return events.slice(0, 3);

    return events.filter((event) => {
      if (!eventMatchesDateFilter(event, 'Upcoming')) return false;
      const eventLocation = `${eventLocationLabel(event)} ${eventVenueLabel(event)}`.toLowerCase();
      const eventType = `${event.type || ''} ${eventLocation}`.toLowerCase();
      if (primaryLocationTerm === 'online') {
        return eventType.includes('online');
      }
      return eventLocation.includes(primaryLocationTerm);
    })
      .slice(0, 3);
  }, [activeHomeAddress, events]);

  const trendingGroups = useMemo(() => {
    const seen = new Set<string>();
    return [...groups]
      .filter((group) => {
        const key = group.id || group._id || group.slug || group.name;
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      })
      .sort((left, right) => groupMemberCount(right) - groupMemberCount(left))
      .slice(0, 3);
  }, [groups]);

  return (
    <View style={styles.homeRoot}>
      <ScrollView style={styles.homeScreen} contentContainerStyle={styles.homeContent} showsVerticalScrollIndicator={false}>
      <View style={styles.homeTopBar}>
        <Pressable
          style={styles.homeLocationButton}
          onPress={() => {
            setLocationSheetMode('choose');
            setLocationSheetVisible(true);
          }}>
          <MapPin color={colors.coral} size={16} strokeWidth={2.6} />
          <Text numberOfLines={1} style={styles.homeLocationText}>
            {locationLabel}
          </Text>
          <ChevronDown color={colors.muted} size={14} strokeWidth={2.6} />
        </Pressable>
        <Pressable style={styles.homeBellButton} onPress={() => onRoute('notifications')}>
          <Bell color={colors.ink} size={18} strokeWidth={2.4} />
          {unreadNotificationCount > 0 && <View style={styles.homeBellDot} />}
        </Pressable>
      </View>

      <Text style={styles.homeGreeting}>
        {greetingLabel()}
        {'\n'}
        {firstNameForGreeting(user)}!
      </Text>

      <Pressable style={styles.homeSearchBar} onPress={() => onRoute('explore')}>
        <Search color={colors.muted} size={16} strokeWidth={2.5} />
        <Text numberOfLines={1} style={styles.homeSearchPlaceholder}>
          Search people, groups or activities...
        </Text>
      </Pressable>

      <View style={styles.homeShortcutRow}>
        {shortcutItems.map((item) => (
          <HomeCategoryShortcut
            key={item.label}
            label={item.label}
            Icon={item.Icon}
            bg={item.bg}
            color={item.color}
            onPress={() => onRoute('explore')}
          />
        ))}
      </View>

      <View style={styles.homeSectionHeader}>
        <Text numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.9} style={styles.homeSectionTitle}>
          Recommended for you
        </Text>
        <Pressable style={styles.homeSeeAllButton} onPress={() => onRoute('explore')}>
          <Text numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.8} style={styles.homeSeeAll}>
            See all
          </Text>
        </Pressable>
      </View>

      {recommendedEvents.length ? (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.homeCardsRow}>
          {recommendedEvents.map((event) => (
            <HomeEventCard
              key={event.id || event._id || event.title}
              event={event}
              onPress={() => onOpenEvent(event)}
            />
          ))}
        </ScrollView>
      ) : (
        <View style={styles.homeEmptyState}>
          <Text style={styles.homeEmptyStateText}>No events are available near this location yet.</Text>
        </View>
      )}

      <View style={styles.homeSectionHeader}>
        <Text numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.9} style={styles.homeSectionTitle}>
          Trending Groups
        </Text>
        <Pressable style={styles.homeSeeAllButton} onPress={onOpenTrendingGroups}>
          <Text numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.8} style={styles.homeSeeAll}>
            See all
          </Text>
        </Pressable>
      </View>

      {trendingGroups.length ? (
        <View style={styles.homeGroupList}>
          {trendingGroups.map((group) => (
            <TrendingGroupRow
              key={group.id || group._id || group.slug || group.name}
              group={group}
              onPress={() => onOpenGroup(group)}
            />
          ))}
        </View>
      ) : (
        <View style={styles.homeEmptyState}>
          <Text style={styles.homeEmptyStateText}>No active groups are available yet.</Text>
        </View>
      )}
      </ScrollView>

      <HomeLocationSheet
        visible={locationSheetVisible}
        mode={locationSheetMode}
        deviceLocation={deviceLocation}
        selectedAddress={selectedAddress}
        addressOptions={addressOptions}
        newAddress={newAddress}
        onChangeAddress={setNewAddress}
        onClose={() => {
          setNewAddress('');
          setLocationSheetMode('choose');
          setLocationSheetVisible(false);
        }}
        onSelectAddress={(address) => {
          setSelectedAddress(address);
          persistSelectedHomeAddress(address);
          setLocationSheetVisible(false);
        }}
        onStartAdd={() => setLocationSheetMode('add')}
        onViewAll={() => setLocationSheetMode('all')}
        onBackToChoose={() => {
          setNewAddress('');
          setLocationSheetMode('choose');
        }}
        onSaveAddress={savePlaceAddress}
      />
    </View>
  );
}

function HomeLocationSheet({
  visible,
  mode,
  deviceLocation,
  selectedAddress,
  addressOptions,
  newAddress,
  onChangeAddress,
  onClose,
  onSelectAddress,
  onStartAdd,
  onViewAll,
  onBackToChoose,
  onSaveAddress,
}: {
  visible: boolean;
  mode: LocationSheetMode;
  deviceLocation: HomeAddress | null;
  selectedAddress: HomeAddress | null;
  addressOptions: HomeAddress[];
  newAddress: string;
  onChangeAddress: (value: string) => void;
  onClose: () => void;
  onSelectAddress: (address: HomeAddress) => void;
  onStartAdd: () => void;
  onViewAll: () => void;
  onBackToChoose: () => void;
  onSaveAddress: (place: PlaceSuggestion) => void;
}) {
  const insets = useSafeAreaInsets();
  const sheetProgress = useRef(new Animated.Value(0)).current;
  const [locationSearch, setLocationSearch] = useState('');
  const [placeSuggestions, setPlaceSuggestions] = useState<PlaceSuggestion[]>([]);
  const [placeSearchStatus, setPlaceSearchStatus] = useState<'idle' | 'loading' | 'error'>('idle');
  const normalizedLocationSearch = locationSearch.trim().toLowerCase();
  const filteredAddressOptions = useMemo(() => {
    if (!normalizedLocationSearch) {
      return addressOptions;
    }

    return addressOptions.filter((address) =>
      `${address.label} ${address.detail || ''}`.toLowerCase().includes(normalizedLocationSearch),
    );
  }, [addressOptions, normalizedLocationSearch]);

  useEffect(() => {
    if (!visible) return undefined;

    sheetProgress.setValue(0);
    Animated.spring(sheetProgress, {
      toValue: 1,
      useNativeDriver: true,
      damping: 19,
      stiffness: 170,
      mass: 0.9,
    }).start();
    return undefined;
  }, [sheetProgress, visible]);

  useEffect(() => {
    if (visible) return;
    setLocationSearch('');
    setPlaceSuggestions([]);
    setPlaceSearchStatus('idle');
  }, [visible]);

  useEffect(() => {
    if (mode !== 'add') {
      setPlaceSuggestions([]);
      setPlaceSearchStatus('idle');
      return undefined;
    }

    const query = newAddress.trim();
    if (query.length < 2) {
      setPlaceSuggestions([]);
      setPlaceSearchStatus('idle');
      return undefined;
    }

    const controller = new AbortController();
    const timer = setTimeout(() => {
      setPlaceSearchStatus('loading');
      searchPlaces(query, { signal: controller.signal })
        .then((places) => {
          setPlaceSuggestions(places);
          setPlaceSearchStatus('idle');
        })
        .catch((error) => {
          if (error instanceof Error && error.name === 'AbortError') return;
          setPlaceSuggestions([]);
          setPlaceSearchStatus('error');
        });
    }, 260);

    return () => {
      controller.abort();
      clearTimeout(timer);
    };
  }, [mode, newAddress]);

  if (!visible) {
    return null;
  }

  const sheetTranslateY = sheetProgress.interpolate({
    inputRange: [0, 1],
    outputRange: [440, 0],
  });
  const backdropOpacity = sheetProgress.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 1],
  });
  const savedAddressOptions = addressOptions.filter((address) => address.source !== 'device');
  const isAllMode = mode === 'all';
  const locationSheetAnimatedStyle = {
    paddingTop: isAllMode ? insets.top + spacing.lg : 6,
    paddingBottom: Math.max(insets.bottom, spacing.md),
    transform: [{ translateY: sheetTranslateY }],
  };

  return (
    <Modal
      visible
      transparent
      animationType="none"
      onRequestClose={mode === 'choose' ? onClose : onBackToChoose}>
      <View style={styles.locationSheetRoot}>
        {!isAllMode && <Animated.View style={[styles.locationSheetBackdrop, { opacity: backdropOpacity }]} />}
        {!isAllMode && <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />}
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          pointerEvents="box-none"
          style={styles.locationSheetKeyboard}>
          <Animated.View
            style={[
              isAllMode ? styles.locationAllScreen : styles.locationSheetCard,
              locationSheetAnimatedStyle,
            ]}>
            {!isAllMode && <View style={styles.locationSheetGrabber} />}

            {mode === 'all' ? (
              <>
                <View style={styles.locationAllHeader}>
                  {showVisualBackButton && (
                    <Pressable
                      accessibilityRole="button"
                      accessibilityLabel="Back to location options"
                      style={styles.locationAllBack}
                      onPress={onBackToChoose}>
                      <ArrowLeft color={colors.ink} size={25} strokeWidth={2.6} />
                    </Pressable>
                  )}
                  <Text style={styles.locationAllTitle}>Select your location</Text>
                </View>

                <View style={styles.locationAllSearchBox}>
                  <TextInput
                    value={locationSearch}
                    onChangeText={setLocationSearch}
                    placeholder="Search an area or address"
                    placeholderTextColor="#8e8782"
                    style={styles.locationAllSearchInput}
                  />
                  <Search color={colors.muted} size={23} strokeWidth={2.4} />
                </View>

                <View style={styles.locationAllActionSingleRow}>
                  <Pressable style={styles.locationAllAddCard} onPress={onStartAdd}>
                    <View style={styles.locationAllActionIcon}>
                      <Plus color={colors.coral} size={19} strokeWidth={3} />
                    </View>
                    <View style={styles.locationAllAddCopy}>
                      <Text style={styles.locationAllActionText}>Add New Address</Text>
                      <Text style={styles.locationAllActionHint}>Search with Places and pick from recommendations</Text>
                    </View>
                  </Pressable>
                </View>

                <Text style={styles.locationAllSectionLabel}>SAVED ADDRESSES</Text>

                <ScrollView
                  style={styles.locationAllSavedCard}
                  contentContainerStyle={styles.locationAllSavedContent}
                  showsVerticalScrollIndicator={false}
                  keyboardShouldPersistTaps="handled">
                  {filteredAddressOptions.length ? (
                    filteredAddressOptions.map((address, index) => {
                      const isSelected = selectedAddress?.id === address.id;
                      const isLast = index === filteredAddressOptions.length - 1;
                      return (
                        <Pressable
                          key={address.id}
                          style={[styles.locationAllAddressRow, isLast && styles.locationAllAddressRowLast]}
                          onPress={() => onSelectAddress(address)}>
                          <View style={styles.locationAllAddressIconBox}>
                            {address.source === 'profile' ? (
                              <Home color={colors.ink} size={22} strokeWidth={2.3} />
                            ) : address.source === 'device' ? (
                              <MapPin color={colors.coral} size={23} strokeWidth={2.6} />
                            ) : (
                              <Compass color={colors.ink} size={22} strokeWidth={2.3} />
                            )}
                          </View>
                          <View style={styles.locationAllAddressCopy}>
                            <View style={styles.locationAllAddressTitleRow}>
                              <Text numberOfLines={1} style={styles.locationAllAddressName}>
                                {address.label}
                              </Text>
                              {isSelected && (
                                <View style={styles.locationSelectedPill}>
                                  <Text style={styles.locationSelectedPillText}>SELECTED</Text>
                                </View>
                              )}
                            </View>
                            <Text numberOfLines={2} style={styles.locationAllAddressDetail}>
                              {address.detail ||
                                (address.source === 'device'
                                  ? 'Current device location'
                                  : address.source === 'profile'
                                    ? 'Saved on your profile'
                                    : 'Custom saved address')}
                            </Text>
                          </View>
                          <View style={styles.locationAllMenuDots}>
                            <View style={styles.locationAllMenuDot} />
                            <View style={styles.locationAllMenuDot} />
                            <View style={styles.locationAllMenuDot} />
                          </View>
                        </Pressable>
                      );
                    })
                  ) : (
                    <View style={styles.locationAllEmpty}>
                      <MapPin color={colors.coral} size={24} strokeWidth={2.6} />
                      <Text style={styles.locationAllEmptyText}>No saved address matches this search.</Text>
                    </View>
                  )}
                </ScrollView>
              </>
            ) : mode === 'choose' ? (
              <>
                <View style={styles.locationAddressPanel}>
                  <View style={styles.locationAddressHeader}>
                    <Text style={styles.locationAddressTitle}>Select Address</Text>
                    <View style={styles.locationHeaderActions}>
                      <Pressable onPress={onViewAll}>
                        <Text style={styles.locationAddressAction}>VIEW ALL</Text>
                      </Pressable>
                      <Pressable style={styles.locationSheetClose} onPress={onClose}>
                        <X color={colors.muted} size={18} strokeWidth={2.7} />
                      </Pressable>
                    </View>
                  </View>

                  {deviceLocation && (
                    <Pressable style={styles.locationAddressRow} onPress={() => onSelectAddress(deviceLocation)}>
                      <View style={styles.locationAddressIcon}>
                        <MapPin color={colors.coral} size={21} strokeWidth={2.4} />
                      </View>
                      <View style={styles.locationAddressCopy}>
                        <Text numberOfLines={1} style={styles.locationAddressName}>
                          {deviceLocation.label}
                        </Text>
                        <Text numberOfLines={1} style={styles.locationAddressDetail}>
                          {deviceLocation.detail || 'Current device location'}
                        </Text>
                      </View>
                      {selectedAddress?.id === deviceLocation.id && (
                        <Check color={colors.green} size={20} strokeWidth={3} />
                      )}
                    </Pressable>
                  )}

                  {savedAddressOptions.map((address) => (
                    <Pressable key={address.id} style={styles.locationAddressRow} onPress={() => onSelectAddress(address)}>
                      <View style={styles.locationAddressIcon}>
                        {address.source === 'profile' ? (
                          <Home color={colors.muted} size={21} strokeWidth={2.3} />
                        ) : (
                          <MapPin color={colors.muted} size={21} strokeWidth={2.3} />
                        )}
                      </View>
                      <View style={styles.locationAddressCopy}>
                        <Text numberOfLines={1} style={styles.locationAddressName}>
                          {address.label}
                        </Text>
                        <Text numberOfLines={1} style={styles.locationAddressDetail}>
                          {address.detail || (address.source === 'profile' ? 'Saved on your profile' : 'Custom saved address')}
                        </Text>
                      </View>
                      {selectedAddress?.id === address.id && <Check color={colors.green} size={20} strokeWidth={3} />}
                    </Pressable>
                  ))}

                  <Pressable style={styles.locationManualRow} onPress={onStartAdd}>
                    <View style={styles.locationAddMiniIcon}>
                      <Plus color={colors.coral} size={18} strokeWidth={3} />
                    </View>
                    <View style={styles.locationAddMiniCopy}>
                      <Text style={styles.locationManualText}>Add New Address</Text>
                      <Text style={styles.locationAddMiniHint}>Search and select a place from recommendations</Text>
                    </View>
                  </Pressable>
                </View>
              </>
            ) : (
              <View style={styles.locationManualPanel}>
                <View style={styles.locationManualHeader}>
                  <View>
                    <Text style={styles.locationAddressTitle}>Add a new address</Text>
                    <Text style={styles.locationManualHint}>Search an area, landmark, or full address.</Text>
                  </View>
                  <Pressable style={styles.locationSheetClose} onPress={onClose}>
                    <X color={colors.muted} size={18} strokeWidth={2.7} />
                  </Pressable>
                </View>

                <View style={styles.locationInputWrap}>
                  <Search color={colors.coral} size={21} strokeWidth={2.5} />
                  <TextInput
                    value={newAddress}
                    onChangeText={onChangeAddress}
                    autoFocus
                    placeholder="Search an area or address"
                    placeholderTextColor={colors.muted}
                    style={styles.locationSheetInput}
                  />
                </View>

                <View style={styles.placeSuggestionPanel}>
                  {placeSearchStatus === 'loading' ? (
                    <View style={styles.placeSuggestionState}>
                      <ActivityIndicator color={colors.coral} />
                      <Text style={styles.placeSuggestionStateText}>Finding places...</Text>
                    </View>
                  ) : placeSuggestions.length ? (
                    <ScrollView keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
                      {placeSuggestions.map((place) => (
                        <Pressable
                          key={place.placeId || place.description}
                          style={styles.placeSuggestionRow}
                          onPress={() => onSaveAddress(place)}>
                          <View style={styles.placeSuggestionIcon}>
                            <MapPin color={colors.coral} size={21} strokeWidth={2.6} />
                          </View>
                          <View style={styles.placeSuggestionCopy}>
                            <Text numberOfLines={1} style={styles.placeSuggestionName}>
                              {place.label || place.city || place.description}
                            </Text>
                            <Text numberOfLines={2} style={styles.placeSuggestionDetail}>
                              {place.description}
                            </Text>
                          </View>
                          <ChevronRight color={colors.muted} size={20} strokeWidth={2.5} />
                        </Pressable>
                      ))}
                    </ScrollView>
                  ) : newAddress.trim().length >= 2 ? (
                    <View style={styles.placeSuggestionState}>
                      <MapPin color={colors.coral} size={22} strokeWidth={2.6} />
                      <Text style={styles.placeSuggestionStateText}>
                        {placeSearchStatus === 'error' ? 'Could not load recommendations.' : 'No recommendations found.'}
                      </Text>
                    </View>
                  ) : (
                    <View style={styles.placeSuggestionState}>
                      <Search color={colors.coral} size={22} strokeWidth={2.6} />
                      <Text style={styles.placeSuggestionStateText}>Start typing to see recommendations.</Text>
                    </View>
                  )}
                </View>

                <Pressable
                  style={styles.locationSheetSecondaryButton}
                  onPress={() => {
                    onChangeAddress('');
                    onBackToChoose();
                  }}>
                  <Text style={styles.locationSheetSecondaryText}>Back to saved addresses</Text>
                </Pressable>
              </View>
            )}
          </Animated.View>
        </KeyboardAvoidingView>
      </View>
    </Modal>
  );
}

function HomeCategoryShortcut({
  label,
  Icon,
  bg,
  color,
  onPress,
}: {
  label: string;
  Icon: React.ComponentType<{ size?: number; color?: string; strokeWidth?: number }>;
  bg: string;
  color: string;
  onPress: () => void;
}) {
  return (
    <Pressable style={styles.homeShortcut} onPress={onPress}>
      <View style={[styles.homeShortcutCircle, { backgroundColor: bg }]}>
        <Icon color={color} size={17} strokeWidth={2.6} />
      </View>
      <Text numberOfLines={1} style={styles.homeShortcutLabel}>
        {label}
      </Text>
    </Pressable>
  );
}

function HomeEventCard({ event, onPress }: { event: JambitEvent; onPress: () => void }) {
  const attendeeCount = Math.max(0, Number(event.attendees || 0));
  const attendeeProfiles = (event.attendeeProfiles || []).slice(0, 3);

  return (
    <Pressable style={styles.homeEventCard} onPress={onPress}>
      <ImageBackground
        source={{ uri: event.image || eventHero }}
        style={styles.homeEventImage}
        imageStyle={styles.homeEventImageRadius}>
        <View style={styles.homeEventEye}>
          <Eye color={colors.orange} size={11} strokeWidth={2.8} />
        </View>
      </ImageBackground>
      <Text numberOfLines={2} style={styles.homeEventTitle}>
        {event.title || 'JambIt event'}
      </Text>
      <Text numberOfLines={1} style={styles.homeEventMeta}>
        {formatHomeDate(event.startAt)}
      </Text>
      <View style={styles.homeEventLocationRow}>
        <MapPin color={colors.coral} size={10} strokeWidth={2.6} />
        <Text numberOfLines={1} style={styles.homeEventLocationText}>
          {eventVenueLabel(event) || event.groupName || 'Local event'}
        </Text>
      </View>
      {attendeeCount > 0 && (
        <View style={styles.homeGoingRow}>
          {attendeeProfiles.length > 0 && (
            <View style={styles.homeTinyAvatarStack}>
              {attendeeProfiles.map((attendee, index) => (
                attendee.image ? (
                  <Image
                    key={attendee.id || `${attendee.name}-${index}`}
                    source={{ uri: attendee.image }}
                    style={[styles.homeTinyAvatar, index > 0 && styles.homeTinyAvatarOverlap]}
                  />
                ) : (
                  <View
                    key={attendee.id || `${attendee.name}-${index}`}
                    style={[styles.homeTinyAvatar, index > 0 && styles.homeTinyAvatarOverlap]}>
                    <Text style={styles.homeTinyAvatarText}>{initials(attendee.name || 'J')}</Text>
                  </View>
                )
              ))}
            </View>
          )}
          <Text numberOfLines={1} style={styles.homeGoingText}>
            {formatMemberCount(attendeeCount)} going
          </Text>
        </View>
      )}
    </Pressable>
  );
}

function TrendingGroupRow({ group, onPress }: { group: JambitGroup; onPress: () => void }) {
  const memberCount = groupMemberCount(group);

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`Open ${group.name}`}
      style={({ pressed }) => [styles.homeGroupRow, pressed && styles.homeGroupRowPressed]}
      onPress={onPress}>
      <Image source={{ uri: group.image || eventHero }} style={styles.homeGroupIcon} />
      <View style={styles.homeGroupInfo}>
        <Text numberOfLines={1} style={styles.homeGroupTitle}>
          {group.name}
        </Text>
        <Text numberOfLines={1} style={styles.homeGroupMeta}>
          {formatMemberCount(memberCount)} {memberCount === 1 ? 'member' : 'members'}
        </Text>
      </View>
      <View style={styles.homeGroupAdd}>
        <Plus color={colors.coral} size={16} strokeWidth={2.8} />
      </View>
    </Pressable>
  );
}

const trendingGroupsPageSize = 10;
const trendingGroupsSkeletonItems = [0, 1, 2, 3, 4];

function TrendingGroupsScreen({
  sessionToken,
  onBack,
  onOpenGroup,
}: {
  sessionToken: string;
  onBack: () => void;
  onOpenGroup: (group: JambitGroup) => void;
}) {
  const [groups, setGroups] = useState<JambitGroup[]>([]);
  const [page, setPage] = useState(0);
  const [total, setTotal] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [initialLoading, setInitialLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const requestInFlight = useRef(false);

  const loadGroupsPage = useCallback(async (nextPage: number, replace = false) => {
    if (requestInFlight.current) return;
    requestInFlight.current = true;
    setError('');
    if (nextPage > 1) setLoadingMore(true);

    try {
      const response = await getTrendingGroups(sessionToken, nextPage, trendingGroupsPageSize);
      setGroups((current) => {
        const candidates = replace ? response.groups : [...current, ...response.groups];
        const seen = new Set<string>();
        return candidates.filter((group) => {
          const key = String(group.id || group._id || group.slug || group.name);
          if (seen.has(key)) return false;
          seen.add(key);
          return true;
        });
      });
      setPage(response.page);
      setTotal(response.total);
      setHasMore(response.hasMore);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'Trending groups could not be loaded.');
    } finally {
      requestInFlight.current = false;
      setInitialLoading(false);
      setLoadingMore(false);
      setRefreshing(false);
    }
  }, [sessionToken]);

  useEffect(() => {
    loadGroupsPage(1, true).catch(() => undefined);
  }, [loadGroupsPage]);

  const refresh = useCallback(() => {
    setRefreshing(true);
    setHasMore(true);
    loadGroupsPage(1, true).catch(() => undefined);
  }, [loadGroupsPage]);

  const loadMore = useCallback(() => {
    if (!initialLoading && !loadingMore && hasMore && !error) {
      loadGroupsPage(page + 1).catch(() => undefined);
    }
  }, [error, hasMore, initialLoading, loadGroupsPage, loadingMore, page]);

  return (
    <View style={styles.trendingGroupsScreen}>
      <FlatList
        data={groups}
        keyExtractor={(group) => String(group.id || group._id || group.slug || group.name)}
        contentContainerStyle={styles.trendingGroupsContent}
        showsVerticalScrollIndicator={false}
        refreshing={refreshing}
        onRefresh={refresh}
        onEndReached={loadMore}
        onEndReachedThreshold={0.35}
        ListHeaderComponent={(
          <View style={styles.trendingGroupsHeader}>
            {showVisualBackButton && (
              <Pressable accessibilityRole="button" accessibilityLabel="Go back" style={styles.trendingGroupsBack} onPress={onBack}>
                <ArrowLeft color={colors.ink} size={22} strokeWidth={2.6} />
              </Pressable>
            )}
            <View style={styles.trendingGroupsHeaderIcon}>
              <Trophy color={colors.orange} size={22} strokeWidth={2.7} />
            </View>
            <Text style={styles.trendingGroupsKicker}>COMMUNITIES PEOPLE LOVE</Text>
            <Text style={styles.trendingGroupsTitle}>Trending groups</Text>
            <Text style={styles.trendingGroupsSubtitle}>
              Active communities ranked by the people joining them.
            </Text>
            {!initialLoading && !error && (
              <View style={styles.trendingGroupsCountPill}>
                <UsersRound color={colors.purple} size={15} strokeWidth={2.6} />
                <Text style={styles.trendingGroupsCountText}>
                  {total} {total === 1 ? 'group' : 'groups'}
                </Text>
              </View>
            )}
          </View>
        )}
        renderItem={({ item, index }) => (
          <TrendingGroupListCard group={item} rank={index + 1} onPress={() => onOpenGroup(item)} />
        )}
        ListEmptyComponent={(
          initialLoading ? (
            <View style={styles.trendingGroupsSkeletonList}>
              {trendingGroupsSkeletonItems.map((index) => (
                <View key={index} style={styles.trendingGroupsSkeletonCard}>
                  <SkeletonBlock style={styles.trendingGroupsSkeletonImage} />
                  <View style={styles.trendingGroupsSkeletonCopy}>
                    <SkeletonBlock style={styles.trendingGroupsSkeletonTitle} />
                    <SkeletonBlock style={styles.trendingGroupsSkeletonMeta} />
                    <SkeletonBlock style={styles.trendingGroupsSkeletonShort} />
                  </View>
                </View>
              ))}
            </View>
          ) : error ? (
            <View style={styles.trendingGroupsState}>
              <Text style={styles.trendingGroupsStateTitle}>Could not load groups</Text>
              <Text style={styles.trendingGroupsStateText}>{error}</Text>
              <Pressable style={styles.trendingGroupsRetryButton} onPress={() => loadGroupsPage(1, true)}>
                <Text style={styles.trendingGroupsRetryText}>Try again</Text>
              </Pressable>
            </View>
          ) : (
            <View style={styles.trendingGroupsState}>
              <UsersRound color={colors.purple} size={34} strokeWidth={2.4} />
              <Text style={styles.trendingGroupsStateTitle}>No trending groups yet</Text>
              <Text style={styles.trendingGroupsStateText}>Active groups will appear here as communities grow.</Text>
            </View>
          )
        )}
        ListFooterComponent={(
          groups.length ? (
            <View style={styles.trendingGroupsFooter}>
              {loadingMore ? (
                <ActivityIndicator color={colors.coral} size="small" />
              ) : error ? (
                <Pressable style={styles.trendingGroupsLoadMoreRetry} onPress={() => loadGroupsPage(page + 1)}>
                  <Text style={styles.trendingGroupsLoadMoreRetryText}>Could not load more. Tap to retry.</Text>
                </Pressable>
              ) : !hasMore ? (
                <Text style={styles.trendingGroupsEndText}>You have reached the end.</Text>
              ) : null}
            </View>
          ) : null
        )}
      />
    </View>
  );
}

function TrendingGroupListCard({
  group,
  rank,
  onPress,
}: {
  group: JambitGroup;
  rank: number;
  onPress: () => void;
}) {
  const memberCount = groupMemberCount(group);
  const location = group.location?.description || group.location?.city || group.city || 'Jambit';

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`Open ${group.name}`}
      style={({ pressed }) => [styles.trendingGroupsCard, pressed && styles.trendingGroupsCardPressed]}
      onPress={onPress}>
      <Image source={{ uri: group.image || eventHero }} style={styles.trendingGroupsImage} />
      <View style={styles.trendingGroupsCardBody}>
        <View style={styles.trendingGroupsRankPill}>
          <Text style={styles.trendingGroupsRankText}>#{rank}</Text>
        </View>
        <Text numberOfLines={2} style={styles.trendingGroupsCardTitle}>{group.name}</Text>
        <View style={styles.trendingGroupsMetaRow}>
          <MapPin color={colors.coral} size={14} strokeWidth={2.6} />
          <Text numberOfLines={1} style={styles.trendingGroupsMetaText}>{location}</Text>
        </View>
        <View style={styles.trendingGroupsMetaRow}>
          <Users color={colors.purple} size={14} strokeWidth={2.6} />
          <Text style={styles.trendingGroupsMetaText}>
            {formatMemberCount(memberCount)} {memberCount === 1 ? 'member' : 'members'}
          </Text>
        </View>
      </View>
      <ChevronRight color={colors.muted} size={21} strokeWidth={2.5} />
    </Pressable>
  );
}

function DarkFeedScreen({
  categories,
  events,
  groups,
  onShare,
  onOpenEvent,
}: {
  categories: InterestCategory[];
  events: JambitEvent[];
  groups: JambitGroup[];
  onShare: (event: JambitEvent) => void;
  onOpenEvent: (event: JambitEvent) => void;
}) {
  const [activeDateFilter, setActiveDateFilter] = useState<DarkDateFilter>('Upcoming');
  const [activeCategory, setActiveCategory] = useState(defaultDarkCategories[0]);
  const normalizedCategories = useMemo(() => {
    const existing = new Set(defaultDarkCategories.map((name) => name.toLowerCase()));
    const dynamicCategories = categories
      .map((category) => category.name)
      .filter((name) => name && !existing.has(name.toLowerCase()));

    return [
      ...defaultDarkCategories,
      ...(dynamicCategories.length ? dynamicCategories : fallbackExploreCategories),
    ];
  }, [categories]);
  const groupEvents = useMemo(
    () => groups.map((group, index) => groupToFeedEvent(group, index)),
    [groups],
  );
  const visibleEvents = useMemo(() => {
    const source = activeCategory === 'New groups' ? groupEvents : events;
    const byDate = source.filter((event) => eventMatchesDateFilter(event, activeDateFilter));
    const byCategory =
      activeCategory === 'New groups'
        ? byDate
        : byDate.filter((event) => eventMatchesCategory(event, activeCategory));

    return byCategory;
  }, [activeCategory, activeDateFilter, events, groupEvents]);
  return (
    <View style={styles.darkFeed}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.darkFeedContent}
      >
        <View style={styles.darkFeedHero}>
          <Text style={styles.darkFeedKicker}>Explore</Text>
          <Text style={styles.darkFeedTitle}>Find events and groups</Text>
          <Text style={styles.darkFeedSubtitle}>Fresh plans, communities, and meetups around your circle.</Text>
        </View>

        <View style={styles.darkSearchRow}>
          <View style={styles.darkSearchPill}>
            <Search color={colors.muted} size={20} strokeWidth={2.6} />
            <Text numberOfLines={1} style={styles.darkSearchText}>
              Search events or groups...
            </Text>
          </View>
        </View>

        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.darkDateList}>
          {darkDateFilters.map((filter) => (
            <Pressable
              key={filter}
              style={[styles.darkDatePill, activeDateFilter === filter && styles.darkDatePillActive]}
              onPress={() => setActiveDateFilter(filter)}
            >
              <Text style={[styles.darkDateText, activeDateFilter !== filter && styles.darkDateTextMuted]}>{filter}</Text>
            </Pressable>
          ))}
        </ScrollView>

        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.darkCategoryList}>
          {normalizedCategories.map((category, index) => {
            const Icon = exploreCategoryIcon(category);
            const palette = exploreCategoryPalette[index % exploreCategoryPalette.length];
            const active = activeCategory === category;
            return (
              <Pressable
                key={`${category}-${index}`}
                style={[styles.darkCategoryItem, active && styles.darkCategoryItemActive]}
                onPress={() => setActiveCategory(category)}
              >
                <View
                  style={[
                    styles.darkCategoryIconWell,
                    { backgroundColor: palette.background },
                    active && styles.darkCategoryIconWellActive,
                  ]}
                >
                  <Icon color={palette.foreground} size={23} strokeWidth={2.5} />
                </View>
                <Text numberOfLines={2} style={[styles.darkCategoryText, active && styles.darkCategoryTextActive]}>
                  {category}
                </Text>
                {active && <View style={styles.darkCategoryItemLine} />}
              </Pressable>
            );
          })}
        </ScrollView>
        <View style={styles.darkDivider} />

        <View style={styles.darkEventList}>
          {visibleEvents.length ? (
            visibleEvents.map((event) => (
              <DarkEventCard
                key={event.id || event._id || event.title}
                event={event}
                onPress={() => onOpenEvent(event)}
                onShare={() => onShare(event)}
              />
            ))
          ) : (
            <View style={styles.darkEmptyState}>
              <Sparkles color={colors.purple} size={32} />
              <Text style={styles.darkEmptyTitle}>No matching items yet</Text>
              <Text style={styles.darkEmptyBody}>Try another date or category.</Text>
            </View>
          )}
        </View>
      </ScrollView>
    </View>
  );
}

function DarkEventCard({
  event,
  onPress,
  onShare,
}: {
  event: JambitEvent;
  onPress: () => void;
  onShare: () => void;
}) {
  const scale = useRef(new Animated.Value(1)).current;
  const attendeeCount = Math.max(0, Number(event.attendees || 0));

  const animateTo = (value: number) => {
    Animated.spring(scale, { toValue: value, useNativeDriver: true, friction: 7 }).start();
  };

  return (
    <Animated.View style={[styles.darkEventCard, { transform: [{ scale }] }]}>
      <Pressable onPress={onPress} onPressIn={() => animateTo(0.985)} onPressOut={() => animateTo(1)}>
        <ImageBackground
          source={{ uri: event.image || eventHero }}
          style={styles.darkEventImage}
          imageStyle={styles.darkEventImageRadius}>
          <View style={styles.darkEventActions}>
            <Pressable style={styles.darkIconCircle} onPress={onShare}>
              <Share2 color={colors.ink} size={20} />
            </Pressable>
            <View style={styles.darkIconCircle}>
              <Heart color={colors.brand} size={20} />
            </View>
          </View>
        </ImageBackground>

        <Text numberOfLines={2} style={styles.darkEventTitle}>
          {event.title || 'JambIt event'}
        </Text>
        <View style={styles.darkMetaRow}>
          <Text numberOfLines={1} style={styles.darkEventMeta}>
            {formatEventDate(event.startAt)}
          </Text>
          <Text style={styles.darkEventMeta}>•</Text>
          <View style={styles.darkOnlineBadge}>
            <View style={styles.darkOnlineDot} />
            <Text style={styles.darkOnlineText}>{event.type || 'Online'}</Text>
          </View>
        </View>
        <Text numberOfLines={1} style={styles.darkGroupMeta}>
          by {event.groupName || 'JambIt group'}
        </Text>
        {attendeeCount > 0 && (
          <View style={styles.darkGoingRow}>
          <Text style={styles.darkGoingText}>
            {attendeeCount} {event.type === 'New group' ? (attendeeCount === 1 ? 'member' : 'members') : 'going'}
          </Text>
          </View>
        )}
      </Pressable>
    </Animated.View>
  );
}

type GroupScreenTab = 'your' | 'member';

function GroupsScreen({
  groups,
  onRoute,
  onOpenGroup,
}: {
  groups: JambitGroup[];
  onRoute: (route: RouteName) => void;
  onOpenGroup: (group: JambitGroup) => void;
}) {
  const [activeTab, setActiveTab] = useState<GroupScreenTab>('your');
  const hostedGroups = groups.filter((group) => group.canEdit === true);
  const memberGroups = groups.filter((group) => group.canEdit !== true);
  const visibleGroups = activeTab === 'your' ? hostedGroups : memberGroups;
  const activeCopy =
    activeTab === 'your'
      ? 'Groups you host or manage on Jambit.'
      : 'Groups where you are joining the community.';

  return (
    <ScrollView contentContainerStyle={styles.groupsScreenContent} showsVerticalScrollIndicator={false}>
      <View style={styles.groupsHero}>
        <View style={styles.groupsHeroTopRow}>
          <View style={styles.groupsHeroBadge}>
            <Sparkles color={colors.coral} size={18} strokeWidth={2.8} />
            <Text style={styles.groupsHeroBadgeText}>Host mode</Text>
          </View>
        </View>
        <View style={styles.groupsHeroActions}>
          <Pressable style={styles.groupsPrimaryButton} onPress={() => onRoute('createGroup')}>
            <Text style={styles.groupsPrimaryButtonText}>Create group</Text>
          </Pressable>
        </View>
      </View>

      <View style={styles.groupsTabs}>
        <GroupsTabButton
          label="My groups"
          count={hostedGroups.length}
          active={activeTab === 'your'}
          onPress={() => setActiveTab('your')}
        />
        <GroupsTabButton
          label="Joined groups"
          count={memberGroups.length}
          active={activeTab === 'member'}
          onPress={() => setActiveTab('member')}
        />
      </View>

      <Reanimated.View
        key={activeTab}
        entering={activeTab === 'your' ? FadeInLeft.duration(260) : FadeInRight.duration(260)}
        exiting={activeTab === 'your' ? FadeOutRight.duration(180) : FadeOutLeft.duration(180)}>
        <View style={styles.groupsListHeader}>
          <View style={styles.flex1}>
            <Text style={styles.groupsListTitle}>{activeTab === 'your' ? 'My groups' : 'Joined groups'}</Text>
            <Text style={styles.groupsListMeta}>{activeCopy}</Text>
          </View>
        </View>

        {visibleGroups.length ? (
          visibleGroups.map((group, index) => (
            <Reanimated.View
              key={group.id || group._id || group.slug || group.name}
              entering={FadeInRight.delay(index * 45).duration(260)}>
              <HostGroupCard group={group} onPress={() => onOpenGroup(group)} />
            </Reanimated.View>
          ))
        ) : activeTab === 'your' ? (
          <GroupsCreateEmptyState onCreate={() => onRoute('createGroup')} />
        ) : (
          <View style={styles.groupsEmptyPanel}>
            <View style={styles.groupsEmptyIcon}>
              <Users color={colors.purple} size={36} strokeWidth={2.7} />
            </View>
            <Text style={styles.groupsEmptyTitle}>No member groups yet</Text>
            <Text style={styles.groupsEmptyBody}>
              When you join another host&apos;s group, it will show up here.
            </Text>
            <Pressable style={styles.groupsEmptySecondaryButton} onPress={() => onRoute('explore')}>
              <Text style={styles.groupsEmptySecondaryText}>Browse groups</Text>
            </Pressable>
          </View>
        )}
      </Reanimated.View>
    </ScrollView>
  );
}

function GroupsTabButton({
  label,
  count,
  active,
  onPress,
}: {
  label: string;
  count: number;
  active: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable style={[styles.groupsTabButton, active && styles.groupsTabButtonActive]} onPress={onPress}>
      <Text style={[styles.groupsTabText, active && styles.groupsTabTextActive]}>{label}</Text>
      <View style={[styles.groupsTabCount, active && styles.groupsTabCountActive]}>
        <Text style={[styles.groupsTabCountText, active && styles.groupsTabCountTextActive]}>{count}</Text>
      </View>
    </Pressable>
  );
}

function groupMemberCount(group: JambitGroup) {
  return Math.max(0, Number(group.members ?? group.memberCount ?? group.memberIds?.length ?? 0));
}

function HostGroupCard({ group, onPress }: { group: JambitGroup; onPress: () => void }) {
  const members = groupMemberCount(group);
  const location = group.location?.description || group.city || group.location?.city || 'Jambit';
  const topics = group.topics || [];

  return (
    <Pressable style={styles.hostGroupCard} onPress={onPress}>
      <ImageBackground source={{ uri: group.image || eventHero }} style={styles.hostGroupImage} imageStyle={styles.hostGroupImageRadius}>
        <View style={styles.hostGroupImageOverlay} />
        <View style={styles.hostGroupStatusPill}>
          <Check color={colors.green} size={14} strokeWidth={3} />
          <Text style={styles.hostGroupStatusText}>{group.canEdit === false ? 'Member' : 'Host'}</Text>
        </View>
      </ImageBackground>
      <View style={styles.hostGroupBody}>
        <Text numberOfLines={2} style={styles.hostGroupName}>{group.name}</Text>
        <View style={styles.hostGroupMetaRow}>
          <MapPin color={colors.coral} size={15} strokeWidth={2.7} />
          <Text numberOfLines={1} style={styles.hostGroupMetaText}>{location}</Text>
        </View>
        <View style={styles.hostGroupMetaRow}>
          <Users color={colors.purple} size={15} strokeWidth={2.7} />
          <Text style={styles.hostGroupMetaText}>{members} {members === 1 ? 'member' : 'members'}</Text>
        </View>
        {topics.length ? (
          <View style={styles.hostGroupTopicRow}>
            {topics.slice(0, 3).map((topic) => (
              <View key={topic} style={styles.hostGroupTopicChip}>
                <Text style={styles.hostGroupTopicText}>{topic}</Text>
              </View>
            ))}
          </View>
        ) : null}
      </View>
    </Pressable>
  );
}

function GroupsCreateEmptyState({ onCreate }: { onCreate: () => void }) {
  return (
    <View style={styles.groupsEmptyPanel}>
      <View style={styles.groupsEmptyBurst}>
        <Sparkles color={colors.orange} size={26} strokeWidth={2.8} />
      </View>
      <Text style={styles.groupsEmptyTitle}>Create your first group</Text>
      <Text style={styles.groupsEmptyBody}>
        Pick a place, choose topics, add your group story, and start hosting on Jambit.
      </Text>
      <Pressable style={styles.groupsEmptyCreateButton} onPress={onCreate}>
        <Text style={styles.groupsEmptyCreateText}>Create a group</Text>
      </Pressable>
    </View>
  );
}

const groupStarterTopics = [
  'New In Town',
  'Social',
  'Fun Times',
  'Fitness Boot Camp',
  'People Helping People',
  'Personal Development',
  'Art Galleries',
  'Intellectual Discussions',
  'Culture',
  'Spirituality',
  'Technology',
  'Local Politics',
  'Eco-Conscious',
  'Entrepreneurship',
];

const createGroupSteps = [
  { key: 'location', label: 'Place' },
  { key: 'topics', label: 'Topics' },
  { key: 'name', label: 'Name' },
  { key: 'description', label: 'Story' },
  { key: 'review', label: 'Review' },
] as const;

type CreateGroupStepKey = (typeof createGroupSteps)[number]['key'];

const defaultGroupCoverImage =
  'https://images.unsplash.com/photo-1511632765486-a01980e01a18?auto=format&fit=crop&w=1200&h=760&q=88';

type EventPoolKey = 'unpaid' | 'lt25' | 'lt50' | 'gt50';
type CreateEventStepKey = 'pool' | 'verify' | 'basics' | 'schedule' | 'location' | 'details' | 'settings' | 'review';

const eventPoolOptions: Array<{ key: EventPoolKey; label: string; amount: number; note: string }> = [
  { key: 'unpaid', label: 'Unpaid', amount: 0, note: 'Best for free community events.' },
  { key: 'lt25', label: 'Less than INR 25,000', amount: 25000, note: 'For small paid experiences.' },
  { key: 'lt50', label: 'Less than INR 50,000', amount: 50000, note: 'For growing paid experiences.' },
  { key: 'gt50', label: 'More than INR 50,000', amount: 50001, note: 'For larger paid experiences.' },
];

const jambitTermsUrl = 'https://jambit.in/terms-and-conditions';

const createEventSteps: Array<{ key: CreateEventStepKey; label: string }> = [
  { key: 'pool', label: 'Pool' },
  { key: 'verify', label: 'Checks' },
  { key: 'basics', label: 'Basics' },
  { key: 'schedule', label: 'Time' },
  { key: 'location', label: 'Place' },
  { key: 'details', label: 'Details' },
  { key: 'settings', label: 'Tickets' },
  { key: 'review', label: 'Review' },
];

function placeCity(place: PlaceSuggestion | null, fallback = '') {
  if (!place) return fallback.split(',')[0]?.trim() || fallback.trim();
  return place.city || place.label || place.description.split(',')[0]?.trim() || fallback.trim();
}

function buildGroupDescription(name: string, location: string, topics: string[]) {
  const groupName = name.trim() || 'Your Jambit group';
  const place = location.trim() || 'your city';
  const topicText = topics.length ? topics.slice(0, 4).join(', ') : 'meaningful local experiences';
  return `${groupName} is a friendly group in ${place} for people interested in ${topicText}. We will bring members together through welcoming events, useful conversations and experiences that make it easy to meet people, learn from each other and build a consistent local community.`;
}

function initialGroupLocation(user: JambitUser): PlaceSuggestion | null {
  const description = user.location?.description || user.location?.city || '';
  if (!description.trim()) return null;
  return {
    city: user.location?.city || description.split(',')[0]?.trim(),
    description,
  };
}

function interestLabel(value: unknown) {
  if (typeof value === 'string') return value.trim();
  if (value && typeof value === 'object') {
    const option = value as { label?: unknown; name?: unknown; title?: unknown; value?: unknown; slug?: unknown };
    return String(option.label || option.name || option.title || option.value || option.slug || '').trim();
  }
  return '';
}

function categoryTopicOptions(categories: InterestCategory[]) {
  const seen = new Set<string>();
  categories.forEach((category) => {
    [category.name, ...(category.options || []), ...(category.interests || [])].forEach((item) => {
      const label = interestLabel(item);
      if (label) seen.add(label);
    });
  });
  return seen.size ? Array.from(seen) : groupStarterTopics;
}

function CreateGroupScreen({
  user,
  token,
  categories,
  draft,
  onRoute,
  onCreated,
  onDraftsChanged,
  onToast,
}: {
  user: JambitUser;
  token: string;
  categories: InterestCategory[];
  draft?: CreationDraft | null;
  onRoute: (route: RouteName) => void;
  onCreated: (group: JambitGroup) => void;
  onDraftsChanged: () => void;
  onToast: (message: string, tone?: ToastState['tone']) => void;
}) {
  const savedLocation = useMemo(() => initialGroupLocation(user), [user]);
  const groupDraft = draft?.type === 'group' ? draft : null;
  const groupDraftForm = groupDraft?.payload?.form || {};
  const groupDraftTopics = Array.isArray(groupDraftForm.topics) ? groupDraftForm.topics as string[] : [];
  const topicOptions = useMemo(() => categoryTopicOptions(categories), [categories]);
  const [draftId] = useState(() => groupDraft?.id || createCreationDraftId('group'));
  const [stepIndex, setStepIndex] = useState(() => Math.min(Number(groupDraft?.stepIndex || 0), createGroupSteps.length - 1));
  const [form, setForm] = useState({
    location: String(groupDraftForm.location || savedLocation?.description || ''),
    topics: groupDraftTopics,
    name: String(groupDraftForm.name || ''),
    description: String(groupDraftForm.description || ''),
  });
  const [selectedLocation, setSelectedLocation] = useState<PlaceSuggestion | null>(
    (groupDraft?.payload?.selectedLocation as PlaceSuggestion | null) || savedLocation,
  );
  const [locationSuggestions, setLocationSuggestions] = useState<PlaceSuggestion[]>([]);
  const [locationStatus, setLocationStatus] = useState<'idle' | 'loading' | 'error'>('idle');
  const [topicQuery, setTopicQuery] = useState(String(groupDraft?.payload?.topicQuery || ''));
  const [saving, setSaving] = useState(false);
  const [stepSkeleton, setStepSkeleton] = useState(false);
  const stepSkeletonTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const activeStep = createGroupSteps[stepIndex].key as CreateGroupStepKey;
  const filteredTopics = useMemo(() => {
    const query = topicQuery.trim().toLowerCase();
    if (!query) return topicOptions;
    return topicOptions.filter((topic) => topic.toLowerCase().includes(query));
  }, [topicOptions, topicQuery]);

  const canContinue = useMemo(() => {
    if (activeStep === 'location') return Boolean(selectedLocation && form.location.trim().length >= 2);
    if (activeStep === 'topics') return true;
    if (activeStep === 'name') return form.name.trim().length >= 5;
    if (activeStep === 'description') return form.description.trim().length >= 50;
    return true;
  }, [activeStep, form.description, form.location, form.name, selectedLocation]);

  const groupDraftHasProgress = useMemo(
    () =>
      stepIndex > 0 ||
      topicQuery.trim().length > 0 ||
      form.topics.length > 0 ||
      form.name.trim().length > 0 ||
      form.description.trim().length > 0,
    [form.description, form.name, form.topics.length, stepIndex, topicQuery],
  );

  useEffect(() => {
    if (!groupDraftHasProgress) return undefined;

    const timer = setTimeout(() => {
      upsertCreationDraft({
        id: draftId,
        type: 'group',
        userKey: creationDraftUserKey(user),
        title: form.name.trim() || 'Untitled group',
        subtitle: form.location.trim() || 'Group draft',
        stepIndex,
        stepKey: activeStep,
        payload: {
          form,
          selectedLocation,
          topicQuery,
        },
      })
        .then(() => onDraftsChanged())
        .catch(() => undefined);
    }, 450);

    return () => clearTimeout(timer);
  }, [activeStep, draftId, form, groupDraftHasProgress, onDraftsChanged, selectedLocation, stepIndex, topicQuery, user]);

  useEffect(() => {
    if (activeStep !== 'location') return undefined;
    const query = form.location.trim();
    if (selectedLocation?.description === query || query.length < 2) {
      setLocationSuggestions([]);
      setLocationStatus('idle');
      return undefined;
    }

    const controller = new AbortController();
    const timer = setTimeout(() => {
      setLocationStatus('loading');
      searchCities(query, { signal: controller.signal })
        .then((places) => {
          setLocationSuggestions(places);
          setLocationStatus('idle');
        })
        .catch(() => {
          if (!controller.signal.aborted) setLocationStatus('error');
        });
    }, 220);

    return () => {
      controller.abort();
      clearTimeout(timer);
    };
  }, [activeStep, form.location, selectedLocation]);

  useEffect(() => () => {
    if (stepSkeletonTimerRef.current) clearTimeout(stepSkeletonTimerRef.current);
  }, []);

  const updateLocation = (value: string) => {
    setForm((current) => ({ ...current, location: value }));
    setSelectedLocation(null);
  };

  const toggleTopic = (topic: string) => {
    setForm((current) => {
      const exists = current.topics.includes(topic);
      return {
        ...current,
        topics: exists ? current.topics.filter((item) => item !== topic) : [...current.topics, topic],
      };
    });
  };

  const useTemplate = () => {
    setForm((current) => ({
      ...current,
      description: buildGroupDescription(current.name, current.location, current.topics),
    }));
  };

  const moveToStep = useCallback((nextIndex: number) => {
    Keyboard.dismiss();
    setLocationSuggestions([]);
    setStepSkeleton(true);
    setStepIndex(nextIndex);

    if (stepSkeletonTimerRef.current) clearTimeout(stepSkeletonTimerRef.current);
    stepSkeletonTimerRef.current = setTimeout(() => {
      setStepSkeleton(false);
      stepSkeletonTimerRef.current = null;
    }, 120);
  }, []);

  const goBack = useCallback(() => {
    if (stepIndex > 0) {
      moveToStep(stepIndex - 1);
      return;
    }
    onRoute('groups');
  }, [moveToStep, onRoute, stepIndex]);

  useEffect(() => {
    if (Platform.OS !== 'android') return undefined;
    const subscription = BackHandler.addEventListener('hardwareBackPress', () => {
      goBack();
      return true;
    });
    return () => subscription.remove();
  }, [goBack]);

  const submitGroup = async () => {
    if (!token) {
      onToast('Please log in again before creating a group.', 'error');
      return;
    }
    if (!selectedLocation) {
      onToast('Select a place from the suggestions to continue.', 'error');
      return;
    }

    setSaving(true);
    try {
      const result = await createGroup(token, {
        name: form.name.trim(),
        description: form.description.trim(),
        topics: form.topics,
        location: {
          city: placeCity(selectedLocation, form.location),
          description: selectedLocation.description,
        },
        image: defaultGroupCoverImage,
      });
      onCreated(result.group);
      await removeCreationDraftById(draftId);
      onDraftsChanged();
      onToast('Group created. You can now host events from it.', 'success');
      onRoute('groups');
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Could not create group.';
      onToast(message, 'error');
    } finally {
      setSaving(false);
    }
  };

  const goNext = () => {
    if (!canContinue || saving) return;
    if (stepIndex === createGroupSteps.length - 1) {
      submitGroup().catch(() => undefined);
      return;
    }
    moveToStep(Math.min(stepIndex + 1, createGroupSteps.length - 1));
  };

  return (
    <KeyboardAvoidingView
      style={styles.createGroupShell}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <View style={styles.createGroupHeader}>
        {showVisualBackButton && (
          <Pressable style={styles.screenHeaderButton} onPress={goBack}>
            <ArrowLeft color={colors.ink} size={20} strokeWidth={2.8} />
          </Pressable>
        )}
        <View style={styles.flex1}>
          <Text style={styles.profileTopKicker}>New group</Text>
          <Text style={styles.profileTopTitle}>Create group</Text>
        </View>
      </View>

      <View style={styles.createGroupProgress}>
        {createGroupSteps.map((step, index) => (
          <View
            key={step.key}
            style={[
              styles.createGroupProgressPill,
              index <= stepIndex && styles.createGroupProgressPillActive,
            ]}>
            <Text
              numberOfLines={1}
              style={[
                styles.createGroupProgressText,
                index <= stepIndex && styles.createGroupProgressTextActive,
              ]}>
              {step.label}
            </Text>
          </View>
        ))}
      </View>

      <ScrollView
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={styles.createGroupContent}
        showsVerticalScrollIndicator={false}>
        {stepSkeleton ? (
          <CreateGroupStepSkeleton />
        ) : (
          <Reanimated.View key={activeStep} entering={FadeInRight.duration(140)}>
            {activeStep === 'location' && (
              <View>
                <Text style={styles.createGroupTitle}>First, set your location for your group</Text>
                <Text style={styles.createGroupHint}>Select a city from the suggestions so members can find the right group.</Text>
                <View style={styles.createGroupInputShell}>
                  <MapPin color={colors.coral} size={22} strokeWidth={2.7} />
                  <TextInput
                    value={form.location}
                    onChangeText={updateLocation}
                    placeholder="Search your city"
                    placeholderTextColor="#a99d96"
                    style={styles.createGroupInput}
                  />
                  {form.location ? (
                    <Pressable onPress={() => updateLocation('')} hitSlop={8}>
                      <X color={colors.muted} size={20} strokeWidth={2.6} />
                    </Pressable>
                  ) : null}
                </View>
                {!selectedLocation && form.location.trim().length >= 2 ? (
                  <Text style={styles.createGroupFieldNote}>Choose one result below to continue.</Text>
                ) : null}
                {locationStatus === 'loading' ? (
                  <View style={styles.createGroupInlineStatus}>
                    <ActivityIndicator color={colors.coral} />
                    <Text style={styles.mutedText}>Finding places...</Text>
                  </View>
                ) : null}
                {locationStatus === 'error' ? (
                  <Text style={styles.createGroupErrorText}>Places search is not reachable right now.</Text>
                ) : null}
                {!selectedLocation && locationSuggestions.length ? (
                  <View style={styles.createGroupSuggestionPanel}>
                    {locationSuggestions.map((place) => (
                      <Pressable
                        key={place.placeId || place.description}
                        style={styles.createGroupSuggestionRow}
                        onPress={() => {
                          setSelectedLocation(place);
                          setForm((current) => ({ ...current, location: place.description }));
                          setLocationSuggestions([]);
                        }}>
                        <MapPin color={colors.purple} size={21} strokeWidth={2.7} />
                        <Text style={styles.createGroupSuggestionText}>{place.description}</Text>
                      </Pressable>
                    ))}
                  </View>
                ) : null}
                {selectedLocation ? (
                  <View style={styles.createGroupSelectedPlace}>
                    <Check color={colors.green} size={18} strokeWidth={3} />
                    <Text style={styles.createGroupSelectedPlaceText}>{selectedLocation.description}</Text>
                  </View>
                ) : null}
              </View>
            )}

            {activeStep === 'topics' && (
              <View>
                <Text style={styles.createGroupTitle}>What will your group be about?</Text>
                <Text style={styles.createGroupHint}>Pick any number of topics. Super admin topics show here automatically.</Text>
                <View style={styles.createGroupInputShell}>
                  <Search color={colors.coral} size={21} strokeWidth={2.7} />
                  <TextInput
                    value={topicQuery}
                    onChangeText={setTopicQuery}
                    placeholder="Search for topics"
                    placeholderTextColor="#a99d96"
                    style={styles.createGroupInput}
                  />
                </View>
                <View style={styles.createGroupTopicGrid}>
                  {filteredTopics.map((topic) => {
                    const selected = form.topics.includes(topic);
                    return (
                      <Pressable
                        key={topic}
                        style={[styles.createTopicChip, selected && styles.createTopicChipSelected]}
                        onPress={() => toggleTopic(topic)}>
                        <Text style={[styles.createTopicChipText, selected && styles.createTopicChipTextSelected]}>
                          {topic}
                        </Text>
                        {selected ? (
                          <Check color={colors.purple} size={17} strokeWidth={3} />
                        ) : (
                          <Plus color={colors.ink} size={17} strokeWidth={3} />
                        )}
                      </Pressable>
                    );
                  })}
                </View>
              </View>
            )}

            {activeStep === 'name' && (
              <View>
                <Text style={styles.createGroupTitle}>Give your group a name</Text>
                <Text style={styles.createGroupHint}>Make it clear, friendly, and easy to remember.</Text>
                <View style={styles.createGroupInputShell}>
                  <Users color={colors.coral} size={21} strokeWidth={2.7} />
                  <TextInput
                    value={form.name}
                    onChangeText={(value) => setForm((current) => ({ ...current, name: value }))}
                    placeholder="Example: Gwalior Music Circle"
                    placeholderTextColor="#a99d96"
                    style={styles.createGroupInput}
                  />
                </View>
                <Text style={styles.createGroupFieldNote}>Minimum 5 characters.</Text>
              </View>
            )}

            {activeStep === 'description' && (
              <View>
                <Text style={styles.createGroupTitle}>Tell people why they should join</Text>
                <Text style={styles.createGroupHint}>Describe the vibe, who it is for, and what members can expect.</Text>
                <Pressable style={styles.templateButton} onPress={useTemplate}>
                  <Sparkles color={colors.purple} size={18} strokeWidth={2.6} />
                  <Text style={styles.templateButtonText}>Use starter template</Text>
                </Pressable>
                <TextInput
                  value={form.description}
                  onChangeText={(value) => setForm((current) => ({ ...current, description: value }))}
                  placeholder="Write your group description"
                  placeholderTextColor="#a99d96"
                  multiline
                  textAlignVertical="top"
                  style={[styles.createGroupInput, styles.createGroupTextarea]}
                />
                <Text style={styles.createGroupFieldNote}>Minimum 50 characters.</Text>
              </View>
            )}

            {activeStep === 'review' && (
              <View>
                <Text style={styles.createGroupTitle}>Ready to start your group?</Text>
                <Text style={styles.createGroupHint}>Review the details before your group goes live.</Text>
                <View style={styles.createGroupReviewCard}>
                  <Image source={{ uri: defaultGroupCoverImage }} style={styles.createGroupReviewImage} />
                  <CreateGroupReviewRow label="Name" value={form.name || 'Untitled group'} />
                  <CreateGroupReviewRow label="Location" value={selectedLocation?.description || form.location} />
                  <CreateGroupReviewRow label="Topics" value={form.topics.length ? form.topics.join(', ') : 'Open to all topics'} />
                  <CreateGroupReviewRow label="Description" value={form.description} />
                </View>
              </View>
            )}
          </Reanimated.View>
        )}
      </ScrollView>

      <View style={styles.createGroupFooter}>
        <Pressable style={styles.createGroupBackButton} onPress={goBack} disabled={saving}>
          <Text style={styles.createGroupBackButtonText}>{stepIndex === 0 ? 'Cancel' : 'Back'}</Text>
        </Pressable>
        <Pressable
          style={[styles.createGroupNextButton, (!canContinue || saving) && styles.createGroupNextButtonDisabled]}
          onPress={goNext}
          disabled={!canContinue || saving}>
          {saving ? (
            <ActivityIndicator color={colors.surface} />
          ) : (
            <Text style={styles.createGroupNextButtonText}>
              {stepIndex === createGroupSteps.length - 1 ? 'Create group' : 'Next'}
            </Text>
          )}
        </Pressable>
      </View>
    </KeyboardAvoidingView>
  );
}

function CreateGroupStepSkeleton() {
  return (
    <Reanimated.View entering={FadeInRight.duration(90)} style={styles.createGroupStepSkeleton}>
      <SkeletonBlock style={styles.createGroupSkeletonTitle} />
      <SkeletonBlock style={styles.createGroupSkeletonHint} />
      <SkeletonBlock style={styles.createGroupSkeletonInput} />
      <View style={styles.createGroupSkeletonChipRow}>
        {[0, 1, 2, 3, 4, 5].map((item) => (
          <SkeletonBlock key={item} style={styles.createGroupSkeletonChip} />
        ))}
      </View>
      <SkeletonBlock style={styles.createGroupSkeletonPanel} />
    </Reanimated.View>
  );
}

function CreateGroupReviewRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.createGroupReviewRow}>
      <Text style={styles.createGroupReviewLabel}>{label}</Text>
      <Text style={styles.createGroupReviewValue}>{value}</Text>
    </View>
  );
}

function defaultEventDate() {
  return new Date(Date.now() + dayMs * 2).toISOString().slice(0, 10);
}

function createEventDescriptionTemplate(group: JambitGroup, title: string) {
  const eventTitle = title.trim() || 'this Jambit event';
  const groupName = group.name || 'our community';
  return `${eventTitle} is hosted by ${groupName}. We will bring people together for a welcoming experience with clear activities, friendly conversations and useful moments to connect. Come ready to participate, meet new people and be part of a circle that keeps growing beyond this event.`;
}

function verificationLabel(checkType: HostVerificationCheckType, payload: EventVerificationPayload | null) {
  return payload?.labels?.[checkType] || {
    aadhaar: 'Aadhaar',
    pan: 'PAN',
    bank: 'Bank account',
    gst: 'GST',
  }[checkType];
}

function digitsOnly(value = '') {
  return String(value || '').replace(/\D/g, '');
}

function formatAadhaarInput(value = '') {
  return digitsOnly(value)
    .slice(0, 12)
    .replace(/(\d{4})(?=\d)/g, '$1-');
}

function isBasicAadhaarValid(value = '') {
  const digits = digitsOnly(value);
  return /^[2-9]\d{11}$/.test(digits) && !/^(\d)\1{11}$/.test(digits);
}

function CreateEventScreen({
  group,
  user,
  token,
  draft,
  onBack,
  onCreated,
  onDraftsChanged,
  onToast,
}: {
  group?: JambitGroup;
  user: JambitUser;
  token: string;
  draft?: CreationDraft | null;
  onBack: () => boolean;
  onCreated: (event: JambitEvent) => void;
  onDraftsChanged: () => void;
  onToast: (message: string, tone?: ToastState['tone']) => void;
}) {
  const eventDraft = draft?.type === 'event' ? draft : null;
  const eventDraftForm = eventDraft?.payload?.form || {};
  const eventDraftStep = createEventSteps.find((step) => step.key === eventDraft?.stepKey)?.key
    || createEventSteps[Math.min(Number(eventDraft?.stepIndex || 0), createEventSteps.length - 1)]?.key
    || 'pool';
  const eventDraftPoolKey = eventPoolOptions.some((option) => option.key === eventDraft?.payload?.poolKey)
    ? eventDraft?.payload?.poolKey as EventPoolKey
    : 'unpaid';
  const [draftId] = useState(() => eventDraft?.id || createCreationDraftId('event'));
  const [activeStep, setActiveStep] = useState<CreateEventStepKey>(eventDraftStep);
  const [poolKey, setPoolKey] = useState<EventPoolKey>(eventDraftPoolKey);
  const [poolOpen, setPoolOpen] = useState(false);
  const [verificationConsent, setVerificationConsent] = useState(Boolean(eventDraft?.payload?.verificationConsent));
  const [verification, setVerification] = useState<EventVerificationPayload | null>(
    (eventDraft?.payload?.verification as EventVerificationPayload | null) || null,
  );
  const [verificationForm, setVerificationForm] = useState({
    aadhaar: String(eventDraft?.payload?.verificationForm?.aadhaar || ''),
    pan: String(eventDraft?.payload?.verificationForm?.pan || ''),
    bankAccount: String(eventDraft?.payload?.verificationForm?.bankAccount || ''),
    ifsc: String(eventDraft?.payload?.verificationForm?.ifsc || ''),
    accountHolder: String(eventDraft?.payload?.verificationForm?.accountHolder || ''),
    phone: String(eventDraft?.payload?.verificationForm?.phone || ''),
    gst: String(eventDraft?.payload?.verificationForm?.gst || ''),
  });
  const [form, setForm] = useState({
    title: String(eventDraftForm.title || ''),
    type: eventDraftForm.type === 'Online' ? 'Online' as const : 'In person' as const,
    date: String(eventDraftForm.date || defaultEventDate()),
    time: String(eventDraftForm.time || '18:00'),
    endDate: String(eventDraftForm.endDate || eventDraftForm.date || defaultEventDate()),
    endTime: String(eventDraftForm.endTime || '20:00'),
    location: String(eventDraftForm.location || group?.location?.description || group?.city || ''),
    venue: String(eventDraftForm.venue || ''),
    onlineUrl: String(eventDraftForm.onlineUrl || ''),
    description: String(eventDraftForm.description || ''),
    ticketAmount: String(eventDraftForm.ticketAmount || ''),
    capacity: String(eventDraftForm.capacity || '50'),
    status: eventDraftForm.status === 'draft' ? 'draft' as const : 'published' as const,
  });
  const [busy, setBusy] = useState(false);

  const selectedPool = eventPoolOptions.find((option) => option.key === poolKey) || eventPoolOptions[0];
  const activeStepIndex = Math.max(0, createEventSteps.findIndex((step) => step.key === activeStep));
  const currentCheck = verification?.missingChecks?.[0] || null;
  const isOwner = Boolean(group && group.canEdit !== false);
  const titleLength = form.title.trim().length;
  const descriptionLength = form.description.trim().length;

  const updateForm = <K extends keyof typeof form>(key: K, value: (typeof form)[K]) => {
    setForm((current) => ({ ...current, [key]: value }));
  };

  const updateVerificationField = (key: keyof typeof verificationForm, value: string) => {
    setVerificationForm((current) => ({ ...current, [key]: value }));
  };

  const canVerifyCurrentCheck = useMemo(() => {
    if (!currentCheck) return true;
    if (currentCheck === 'aadhaar') return isBasicAadhaarValid(verificationForm.aadhaar);
    if (currentCheck === 'pan') return /^[A-Za-z]{5}\d{4}[A-Za-z]$/.test(verificationForm.pan.trim());
    if (currentCheck === 'gst') {
      return /^[0-9]{2}[A-Za-z]{5}[0-9]{4}[A-Za-z][1-9A-Za-z]Z[0-9A-Za-z]$/.test(verificationForm.gst.trim());
    }
    return (
      /^\d{6,18}$/.test(verificationForm.bankAccount.trim()) &&
      /^[A-Za-z]{4}0[A-Za-z0-9]{6}$/.test(verificationForm.ifsc.trim()) &&
      verificationForm.accountHolder.trim().length >= 2 &&
      /^[6-9]\d{9}$/.test(verificationForm.phone.trim())
    );
  }, [currentCheck, verificationForm]);

  const canContinue = useMemo(() => {
    if (!isOwner || busy) return false;
    if (activeStep === 'pool') return selectedPool.amount <= 0 || verificationConsent;
    if (activeStep === 'verify') return canVerifyCurrentCheck;
    if (activeStep === 'basics') return titleLength >= 5;
    if (activeStep === 'schedule') {
      const start = new Date(`${form.date.trim()}T${form.time.trim()}:00`);
      const end = new Date(`${form.endDate.trim()}T${form.endTime.trim()}:00`);
      return Number.isFinite(start.getTime()) && Number.isFinite(end.getTime()) && end > start;
    }
    if (activeStep === 'location') {
      return form.type === 'Online' ? form.onlineUrl.trim().length >= 5 : form.location.trim().length >= 2;
    }
    if (activeStep === 'details') return descriptionLength >= 50;
    if (activeStep === 'settings') {
      return Number(form.capacity) > 0 && (selectedPool.amount <= 0 || Number(form.ticketAmount) > 0);
    }
    return true;
  }, [activeStep, busy, canVerifyCurrentCheck, descriptionLength, form, isOwner, selectedPool.amount, titleLength, verificationConsent]);

  const eventDraftHasProgress = useMemo(
    () =>
      activeStep !== 'pool' ||
      poolKey !== 'unpaid' ||
      verificationConsent ||
      form.title.trim().length > 0 ||
      form.description.trim().length > 0 ||
      form.venue.trim().length > 0 ||
      form.onlineUrl.trim().length > 0 ||
      form.ticketAmount.trim().length > 0 ||
      form.type !== 'In person',
    [activeStep, form.description, form.onlineUrl, form.ticketAmount, form.title, form.type, form.venue, poolKey, verificationConsent],
  );

  useEffect(() => {
    if (!group || !eventDraftHasProgress) return undefined;

    const timer = setTimeout(() => {
      upsertCreationDraft({
        id: draftId,
        type: 'event',
        userKey: creationDraftUserKey(user),
        title: form.title.trim() || 'Untitled event',
        subtitle: group.name ? `${group.name} - ${form.date}` : 'Event draft',
        stepIndex: activeStepIndex,
        stepKey: activeStep,
        payload: {
          groupSlug: group.slug || '',
          groupName: group.name,
          group: {
            id: group.id,
            _id: group._id,
            slug: group.slug,
            name: group.name,
            image: group.image,
            topics: group.topics || [],
            canEdit: group.canEdit,
            city: group.city,
            location: group.location,
          },
          poolKey,
          verificationConsent,
          verification,
          verificationForm,
          form,
        },
      })
        .then(() => onDraftsChanged())
        .catch(() => undefined);
    }, 450);

    return () => clearTimeout(timer);
  }, [activeStep, activeStepIndex, draftId, eventDraftHasProgress, form, group, onDraftsChanged, poolKey, user, verification, verificationConsent, verificationForm]);

  const moveToStep = useCallback((step: CreateEventStepKey) => {
    Keyboard.dismiss();
    setActiveStep(step);
  }, []);

  const goBack = useCallback(() => {
    if (activeStep === 'pool') {
      onBack();
      return;
    }
    if (activeStep === 'verify') {
      moveToStep('pool');
      return;
    }
    if (activeStep === 'basics') {
      moveToStep(verification?.requiredChecks?.length ? 'verify' : 'pool');
      return;
    }
    const index = createEventSteps.findIndex((step) => step.key === activeStep);
    const previous = createEventSteps[Math.max(0, index - 1)]?.key || 'pool';
    moveToStep(previous);
  }, [activeStep, moveToStep, onBack, verification?.requiredChecks?.length]);

  useEffect(() => {
    if (Platform.OS !== 'android') return undefined;
    const subscription = BackHandler.addEventListener('hardwareBackPress', () => {
      goBack();
      return true;
    });
    return () => subscription.remove();
  }, [goBack]);

  const prepareVerification = async () => {
    if (!token) {
      onToast('Please log in again before creating an event.', 'error');
      return;
    }
    if (selectedPool.amount <= 0) {
      setVerification(null);
      moveToStep('basics');
      return;
    }

    setBusy(true);
    try {
      const result = await getEventVerificationRequirement(token, selectedPool.amount);
      setVerification(result);
      moveToStep(result.missingChecks.length ? 'verify' : 'basics');
      if (!result.missingChecks.length) {
        onToast('Host verification already complete for this event pool.', 'success');
      }
    } catch (error) {
      onToast(error instanceof Error ? error.message : 'Verification checks could not be loaded.', 'error');
    } finally {
      setBusy(false);
    }
  };

  const submitVerification = async () => {
    if (!currentCheck || !canVerifyCurrentCheck) return;

    const payload =
      currentCheck === 'aadhaar'
        ? { type: currentCheck, estimatedPoolAmount: selectedPool.amount, aadhaar_number: digitsOnly(verificationForm.aadhaar) }
        : currentCheck === 'pan'
          ? { type: currentCheck, estimatedPoolAmount: selectedPool.amount, pan_number: verificationForm.pan.trim().toUpperCase() }
          : currentCheck === 'gst'
            ? { type: currentCheck, estimatedPoolAmount: selectedPool.amount, gstin: verificationForm.gst.trim().toUpperCase() }
            : {
                type: currentCheck,
                estimatedPoolAmount: selectedPool.amount,
                bank_account_number: verificationForm.bankAccount.trim(),
                ifsc: verificationForm.ifsc.trim().toUpperCase(),
                account_holder: verificationForm.accountHolder.trim(),
                phone_number: verificationForm.phone.trim(),
              };

    setBusy(true);
    try {
      const result = await submitHostVerification(token, payload);
      setVerification(result);
      onToast(`${verificationLabel(currentCheck, result)} verified.`, 'success');
      if (!result.missingChecks.length) {
        moveToStep('basics');
      }
    } catch (error) {
      onToast(error instanceof Error ? error.message : `${verificationLabel(currentCheck, verification)} could not be verified.`, 'error');
    } finally {
      setBusy(false);
    }
  };

  const useEventTemplate = () => {
    if (!group) return;
    updateForm('description', createEventDescriptionTemplate(group, form.title));
  };

  const publishEvent = async () => {
    if (!group?.slug) {
      onToast('This group is missing its server slug. Refresh and try again.', 'error');
      return;
    }

    setBusy(true);
    try {
      const ticketAmount = selectedPool.amount > 0 ? Number(form.ticketAmount || 0) : 0;
      const result = await createEvent(token, {
        groupSlug: group.slug,
        groupName: group.name,
        topics: group.topics || [],
        title: form.title.trim(),
        description: form.description.trim(),
        type: form.type,
        date: form.date.trim(),
        time: form.time.trim(),
        endDate: form.endDate.trim(),
        endTime: form.endTime.trim(),
        location: form.type === 'Online' ? 'Online event' : form.location.trim(),
        venue: form.type === 'Online' ? 'Online' : form.venue.trim() || form.location.trim(),
        onlineUrl: form.type === 'Online' ? form.onlineUrl.trim() : '',
        estimatedPoolAmount: selectedPool.amount,
        ticketAmount,
        price: ticketAmount > 0 ? `INR ${ticketAmount}` : 'Free',
        capacity: Number(form.capacity) || 50,
        image: group.image || eventHero,
        status: form.status,
      });
      onCreated(result.event);
      await removeCreationDraftById(draftId);
      onDraftsChanged();
      onToast(form.status === 'draft' ? 'Event saved as draft.' : 'Event published.', 'success');
    } catch (error) {
      onToast(error instanceof Error ? error.message : 'Event could not be created.', 'error');
    } finally {
      setBusy(false);
    }
  };

  const goNext = () => {
    if (!canContinue) return;
    if (activeStep === 'pool') {
      prepareVerification().catch(() => undefined);
      return;
    }
    if (activeStep === 'verify') {
      submitVerification().catch(() => undefined);
      return;
    }
    if (activeStep === 'basics') return moveToStep('schedule');
    if (activeStep === 'schedule') return moveToStep('location');
    if (activeStep === 'location') return moveToStep('details');
    if (activeStep === 'details') return moveToStep('settings');
    if (activeStep === 'settings') return moveToStep('review');
    publishEvent().catch(() => undefined);
  };

  if (!group) {
    return (
      <View style={styles.groupDetailEmptyScreen}>
        <EmptyScreen
          compact
          icon={<CalendarDays color={colors.coral} size={38} />}
          title="Group not found"
          body="Go back and choose a group before creating an event."
        />
      </View>
    );
  }

  if (!isOwner) {
    return (
      <View style={styles.groupDetailEmptyScreen}>
        <EmptyScreen
          compact
          icon={<Lock color={colors.coral} size={38} />}
          title="Host access only"
          body="Only the group owner can create events for this group."
        />
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={styles.createGroupShell}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <View style={styles.createGroupHeader}>
        {showVisualBackButton && (
          <Pressable style={styles.screenHeaderButton} onPress={goBack}>
            <ArrowLeft color={colors.ink} size={20} strokeWidth={2.8} />
          </Pressable>
        )}
        <View style={styles.flex1}>
          <Text style={styles.profileTopKicker}>{group.name}</Text>
          <Text style={styles.profileTopTitle}>Create event</Text>
        </View>
      </View>

      <ScrollView
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={styles.createGroupContent}
        showsVerticalScrollIndicator={false}>
        <Reanimated.View key={activeStep} entering={FadeInRight.duration(140)}>
          {activeStep === 'pool' && (
            <View>
              <Text style={styles.createGroupTitle}>Estimated event pool</Text>
              <Text style={styles.createGroupHint}>Choose the expected money pool first.</Text>
              <Pressable style={styles.createEventSelectButton} onPress={() => setPoolOpen((current) => !current)}>
                <BriefcaseBusiness color={colors.coral} size={21} strokeWidth={2.7} />
                <View style={styles.flex1}>
                  <Text style={styles.createEventSelectLabel}>Event pool</Text>
                  <Text style={styles.createEventSelectValue}>{selectedPool.label}</Text>
                </View>
                <ChevronDown color={colors.ink} size={20} strokeWidth={2.8} />
              </Pressable>
              {poolOpen ? (
                <View style={styles.createEventDropdown}>
                  {eventPoolOptions.map((option) => (
                    <Pressable
                      key={option.key}
                      style={[styles.createEventDropdownOption, option.key === poolKey && styles.createEventDropdownOptionActive]}
                      onPress={() => {
                        setPoolKey(option.key);
                        setPoolOpen(false);
                        if (option.amount <= 0) {
                          updateForm('ticketAmount', '');
                        }
                      }}>
                      <View style={styles.flex1}>
                        <Text style={styles.createEventDropdownTitle}>{option.label}</Text>
                        <Text style={styles.createEventDropdownNote}>{option.note}</Text>
                      </View>
                      {option.key === poolKey ? <Check color={colors.purple} size={19} strokeWidth={3} /> : null}
                    </Pressable>
                  ))}
                </View>
              ) : null}
              {selectedPool.amount > 0 ? (
                <Pressable
                  style={styles.createEventConsentCard}
                  onPress={() => setVerificationConsent((current) => !current)}>
                  <View style={[styles.createEventConsentBox, verificationConsent && styles.createEventConsentBoxActive]}>
                    {verificationConsent ? <Check color={colors.surface} size={15} strokeWidth={3} /> : null}
                  </View>
                  <Text style={styles.createEventConsentText}>
                    I confirm that I am sharing these details with my own consent and allow Jambit to verify and store them as required for hosting.
                    {' '}
                    <Text
                      style={styles.createEventTermsLink}
                      onPress={(event) => {
                        event.stopPropagation();
                        Linking.openURL(jambitTermsUrl).catch(() => onToast('Terms page could not be opened.', 'error'));
                      }}>
                      Terms and Conditions
                    </Text>
                  </Text>
                </Pressable>
              ) : null}
            </View>
          )}

          {activeStep === 'verify' && (
            <View>
              <Text style={styles.createGroupTitle}>
                {currentCheck ? `Verify ${verificationLabel(currentCheck, verification)}` : 'Verification complete'}
              </Text>
              <Text style={styles.createGroupHint}>
                {currentCheck ? 'Enter the details below to continue.' : 'All required checks are already verified.'}
              </Text>
              {verification?.verifiedChecks?.length ? (
                <View style={styles.createEventVerifiedRow}>
                  {verification.verifiedChecks.map((item) => (
                    <View key={item} style={styles.createEventVerifiedPill}>
                      <Check color={colors.green} size={15} strokeWidth={3} />
                      <Text style={styles.createEventVerifiedText}>{verificationLabel(item, verification)}</Text>
                    </View>
                  ))}
                </View>
              ) : null}
              {currentCheck ? (
                <View style={styles.createEventCheckCard}>
                  <Text style={styles.createEventCheckTitle}>{verificationLabel(currentCheck, verification)}</Text>
                  {currentCheck === 'aadhaar' ? (
                    <>
                      <View style={styles.createGroupInputShell}>
                        <Lock color={colors.coral} size={21} strokeWidth={2.7} />
                        <TextInput
                          value={verificationForm.aadhaar}
                          onChangeText={(value) => updateVerificationField('aadhaar', formatAadhaarInput(value))}
                          placeholder="1234-5678-9012"
                          placeholderTextColor="#a99d96"
                          keyboardType="number-pad"
                          style={styles.createGroupInput}
                        />
                      </View>
                      <Text
                        style={[
                          styles.createGroupFieldNote,
                          verificationForm.aadhaar && !isBasicAadhaarValid(verificationForm.aadhaar) && styles.createGroupErrorText,
                        ]}>
                        Aadhaar must be 12 digits, cannot start with 0 or 1, and cannot use the same digit throughout.
                      </Text>
                    </>
                  ) : null}
                  {currentCheck === 'pan' ? (
                    <View style={styles.createGroupInputShell}>
                      <BriefcaseBusiness color={colors.coral} size={21} strokeWidth={2.7} />
                      <TextInput
                        value={verificationForm.pan}
                        onChangeText={(value) => updateVerificationField('pan', value.toUpperCase().slice(0, 10))}
                        placeholder="ABCDE1234F"
                        placeholderTextColor="#a99d96"
                        autoCapitalize="characters"
                        style={styles.createGroupInput}
                      />
                    </View>
                  ) : null}
                  {currentCheck === 'bank' ? (
                    <View style={styles.createEventStack}>
                      <View style={styles.createGroupInputShell}>
                        <User color={colors.coral} size={21} strokeWidth={2.7} />
                        <TextInput
                          value={verificationForm.accountHolder}
                          onChangeText={(value) => updateVerificationField('accountHolder', value.slice(0, 100))}
                          placeholder="Account holder name"
                          placeholderTextColor="#a99d96"
                          style={styles.createGroupInput}
                        />
                      </View>
                      <View style={styles.createGroupInputShell}>
                        <BriefcaseBusiness color={colors.coral} size={21} strokeWidth={2.7} />
                        <TextInput
                          value={verificationForm.bankAccount}
                          onChangeText={(value) => updateVerificationField('bankAccount', value.replace(/\D/g, '').slice(0, 18))}
                          placeholder="Bank account number"
                          placeholderTextColor="#a99d96"
                          keyboardType="number-pad"
                          style={styles.createGroupInput}
                        />
                      </View>
                      <View style={styles.createGroupInputShell}>
                        <Map color={colors.coral} size={21} strokeWidth={2.7} />
                        <TextInput
                          value={verificationForm.ifsc}
                          onChangeText={(value) => updateVerificationField('ifsc', value.toUpperCase().slice(0, 11))}
                          placeholder="IFSC code"
                          placeholderTextColor="#a99d96"
                          autoCapitalize="characters"
                          style={styles.createGroupInput}
                        />
                      </View>
                      <View style={styles.createGroupInputShell}>
                        <Phone color={colors.coral} size={21} strokeWidth={2.7} />
                        <TextInput
                          value={verificationForm.phone}
                          onChangeText={(value) => updateVerificationField('phone', value.replace(/\D/g, '').slice(0, 10))}
                          placeholder="Bank account phone number"
                          placeholderTextColor="#a99d96"
                          keyboardType="phone-pad"
                          style={styles.createGroupInput}
                        />
                      </View>
                    </View>
                  ) : null}
                  {currentCheck === 'gst' ? (
                    <View style={styles.createGroupInputShell}>
                      <BriefcaseBusiness color={colors.coral} size={21} strokeWidth={2.7} />
                      <TextInput
                        value={verificationForm.gst}
                        onChangeText={(value) => updateVerificationField('gst', value.toUpperCase().slice(0, 15))}
                        placeholder="27ABCDE1234F1Z5"
                        placeholderTextColor="#a99d96"
                        autoCapitalize="characters"
                        style={styles.createGroupInput}
                      />
                    </View>
                  ) : null}
                </View>
              ) : (
                <View style={styles.createEventInfoCard}>
                  <Check color={colors.green} size={22} strokeWidth={3} />
                  <Text style={styles.createEventInfoText}>All required host checks are complete for this pool.</Text>
                </View>
              )}
            </View>
          )}

          {activeStep === 'basics' && (
            <View>
              <Text style={styles.createGroupTitle}>What are you hosting?</Text>
              <Text style={styles.createGroupHint}>Start with a clear title and choose how people will attend.</Text>
              <View style={styles.createGroupInputShell}>
                <Sparkles color={colors.coral} size={21} strokeWidth={2.7} />
                <TextInput
                  value={form.title}
                  onChangeText={(value) => updateForm('title', value)}
                  placeholder="Weekend music jam"
                  placeholderTextColor="#a99d96"
                  style={styles.createGroupInput}
                />
              </View>
              <Text style={styles.createGroupFieldNote}>{titleLength >= 5 ? 'Title looks good.' : 'Minimum 5 characters.'}</Text>
              <View style={styles.createEventToggleRow}>
                {(['In person', 'Online'] as const).map((attendanceType) => (
                  <Pressable
                    key={attendanceType}
                    style={[styles.createEventToggleButton, form.type === attendanceType && styles.createEventToggleButtonActive]}
                    onPress={() => updateForm('type', attendanceType)}>
                    {attendanceType === 'Online' ? <Compass color={form.type === attendanceType ? colors.surface : colors.ink} size={18} /> : <MapPin color={form.type === attendanceType ? colors.surface : colors.ink} size={18} />}
                    <Text style={[styles.createEventToggleText, form.type === attendanceType && styles.createEventToggleTextActive]}>{attendanceType}</Text>
                  </Pressable>
                ))}
              </View>
            </View>
          )}

          {activeStep === 'schedule' && (
            <View>
              <Text style={styles.createGroupTitle}>When will it happen?</Text>
              <Text style={styles.createGroupHint}>Set the start and end using 24-hour time.</Text>
              <View style={styles.createEventStack}>
                <View style={styles.createGroupInputShell}>
                  <CalendarDays color={colors.coral} size={21} strokeWidth={2.7} />
                  <TextInput
                    value={form.date}
                    onChangeText={(value) => updateForm('date', value)}
                    placeholder="YYYY-MM-DD"
                    placeholderTextColor="#a99d96"
                    style={styles.createGroupInput}
                  />
                </View>
                <View style={styles.createGroupInputShell}>
                  <Clock color={colors.coral} size={21} strokeWidth={2.7} />
                  <TextInput
                    value={form.time}
                    onChangeText={(value) => updateForm('time', value)}
                    placeholder="18:00"
                    placeholderTextColor="#a99d96"
                    style={styles.createGroupInput}
                  />
                </View>
                <View style={styles.createGroupInputShell}>
                  <CalendarDays color={colors.coral} size={21} strokeWidth={2.7} />
                  <TextInput
                    value={form.endDate}
                    onChangeText={(value) => updateForm('endDate', value)}
                    placeholder="End date (YYYY-MM-DD)"
                    placeholderTextColor="#a99d96"
                    style={styles.createGroupInput}
                  />
                </View>
                <View style={styles.createGroupInputShell}>
                  <Clock color={colors.coral} size={21} strokeWidth={2.7} />
                  <TextInput
                    value={form.endTime}
                    onChangeText={(value) => updateForm('endTime', value)}
                    placeholder="End time (20:00)"
                    placeholderTextColor="#a99d96"
                    style={styles.createGroupInput}
                  />
                </View>
              </View>
            </View>
          )}

          {activeStep === 'location' && (
            <View>
              <Text style={styles.createGroupTitle}>{form.type === 'Online' ? 'Add the online link' : 'Where will people meet?'}</Text>
              <Text style={styles.createGroupHint}>{form.type === 'Online' ? 'Attendees will see this link after they book.' : 'Add city and venue or meeting point.'}</Text>
              {form.type === 'Online' ? (
                <View style={styles.createGroupInputShell}>
                  <Compass color={colors.coral} size={21} strokeWidth={2.7} />
                  <TextInput
                    value={form.onlineUrl}
                    onChangeText={(value) => updateForm('onlineUrl', value)}
                    placeholder="https://meet.google.com/..."
                    placeholderTextColor="#a99d96"
                    autoCapitalize="none"
                    style={styles.createGroupInput}
                  />
                </View>
              ) : (
                <View style={styles.createEventStack}>
                  <View style={styles.createGroupInputShell}>
                    <MapPin color={colors.coral} size={21} strokeWidth={2.7} />
                    <TextInput
                      value={form.location}
                      onChangeText={(value) => updateForm('location', value)}
                      placeholder="City or area"
                      placeholderTextColor="#a99d96"
                      style={styles.createGroupInput}
                    />
                  </View>
                  <View style={styles.createGroupInputShell}>
                    <Map color={colors.coral} size={21} strokeWidth={2.7} />
                    <TextInput
                      value={form.venue}
                      onChangeText={(value) => updateForm('venue', value)}
                      placeholder="Venue or meeting point"
                      placeholderTextColor="#a99d96"
                      style={styles.createGroupInput}
                    />
                  </View>
                </View>
              )}
            </View>
          )}

          {activeStep === 'details' && (
            <View>
              <Text style={styles.createGroupTitle}>Describe the event</Text>
              <Text style={styles.createGroupHint}>Tell members what will happen, who should come, and what they can expect.</Text>
              <Pressable style={styles.templateButton} onPress={useEventTemplate}>
                <Sparkles color={colors.purple} size={18} strokeWidth={2.6} />
                <Text style={styles.templateButtonText}>Use starter template</Text>
              </Pressable>
              <TextInput
                value={form.description}
                onChangeText={(value) => updateForm('description', value)}
                placeholder="Write the event description"
                placeholderTextColor="#a99d96"
                multiline
                textAlignVertical="top"
                style={[styles.createGroupInput, styles.createGroupTextarea]}
              />
              <Text style={styles.createGroupFieldNote}>{descriptionLength >= 50 ? 'Description looks good.' : 'Minimum 50 characters.'}</Text>
            </View>
          )}

          {activeStep === 'settings' && (
            <View>
              <Text style={styles.createGroupTitle}>Tickets and capacity</Text>
              <Text style={styles.createGroupHint}>Unpaid events stay free. Paid event checkout will connect with Razorpay later.</Text>
              <View style={styles.createEventStack}>
                <View style={styles.createGroupInputShell}>
                  <BriefcaseBusiness color={colors.coral} size={21} strokeWidth={2.7} />
                  <TextInput
                    value={selectedPool.amount <= 0 ? 'Free' : form.ticketAmount}
                    editable={selectedPool.amount > 0}
                    onChangeText={(value) => updateForm('ticketAmount', value.replace(/[^\d]/g, ''))}
                    placeholder="Ticket amount in INR"
                    placeholderTextColor="#a99d96"
                    keyboardType="number-pad"
                    style={styles.createGroupInput}
                  />
                </View>
                <View style={styles.createGroupInputShell}>
                  <Users color={colors.coral} size={21} strokeWidth={2.7} />
                  <TextInput
                    value={form.capacity}
                    onChangeText={(value) => updateForm('capacity', value.replace(/[^\d]/g, ''))}
                    placeholder="Capacity"
                    placeholderTextColor="#a99d96"
                    keyboardType="number-pad"
                    style={styles.createGroupInput}
                  />
                </View>
              </View>
              <View style={styles.createEventToggleRow}>
                {(['published', 'draft'] as const).map((status) => (
                  <Pressable
                    key={status}
                    style={[styles.createEventToggleButton, form.status === status && styles.createEventToggleButtonActive]}
                    onPress={() => updateForm('status', status)}>
                    <Text style={[styles.createEventToggleText, form.status === status && styles.createEventToggleTextActive]}>
                      {status === 'published' ? 'Publish now' : 'Save draft'}
                    </Text>
                  </Pressable>
                ))}
              </View>
            </View>
          )}

          {activeStep === 'review' && (
            <View>
              <Text style={styles.createGroupTitle}>Ready to publish?</Text>
              <Text style={styles.createGroupHint}>Review the event before it goes live for your group.</Text>
              <View style={styles.createGroupReviewCard}>
                <Image source={{ uri: group.image || eventHero }} style={styles.createGroupReviewImage} />
                <CreateGroupReviewRow label="Event" value={form.title} />
                <CreateGroupReviewRow label="Group" value={group.name} />
                <CreateGroupReviewRow label="Pool" value={selectedPool.label} />
                <CreateGroupReviewRow label="When" value={`${form.date} ${form.time} to ${form.endDate} ${form.endTime}`} />
                <CreateGroupReviewRow label="Where" value={form.type === 'Online' ? 'Online event' : form.venue || form.location} />
                <CreateGroupReviewRow label="Ticket" value={selectedPool.amount > 0 ? `INR ${form.ticketAmount}` : 'Free'} />
                <CreateGroupReviewRow label="Description" value={form.description} />
              </View>
            </View>
          )}
        </Reanimated.View>
      </ScrollView>

      <View style={styles.createGroupFooter}>
        <Pressable style={styles.createGroupBackButton} onPress={goBack} disabled={busy}>
          <Text style={styles.createGroupBackButtonText}>{activeStep === 'pool' ? 'Cancel' : 'Back'}</Text>
        </Pressable>
        <Pressable
          style={[styles.createGroupNextButton, (!canContinue || busy) && styles.createGroupNextButtonDisabled]}
          onPress={goNext}
          disabled={!canContinue || busy}>
          {busy ? (
            <ActivityIndicator color={colors.surface} />
          ) : (
            <Text style={styles.createGroupNextButtonText}>
              {activeStep === 'verify'
                ? 'Verify'
                : activeStep === 'review'
                  ? form.status === 'draft' ? 'Save draft' : 'Publish event'
                  : 'Next'}
            </Text>
          )}
        </Pressable>
      </View>
    </KeyboardAvoidingView>
  );
}

function mergeChatMessage(messages: JambitChatMessage[], nextMessage?: JambitChatMessage | null) {
  if (!nextMessage?.id || messages.some((message) => message.id === nextMessage.id)) return messages;
  return [...messages, nextMessage];
}

function formatChatTime(value?: string) {
  const date = value ? new Date(value) : null;
  if (!date || Number.isNaN(date.getTime())) return '';
  return new Intl.DateTimeFormat('en-IN', { hour: 'numeric', minute: '2-digit' }).format(date);
}

function chatDateKey(value?: string) {
  const date = value ? new Date(value) : null;
  if (!date || Number.isNaN(date.getTime())) return '';
  return `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`;
}

function formatChatDate(value?: string) {
  const date = value ? new Date(value) : null;
  if (!date || Number.isNaN(date.getTime())) return '';
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(today.getDate() - 1);
  if (chatDateKey(value) === chatDateKey(today.toISOString())) return 'Today';
  if (chatDateKey(value) === chatDateKey(yesterday.toISOString())) return 'Yesterday';
  return new Intl.DateTimeFormat('en-IN', {
    day: 'numeric',
    month: 'short',
    year: date.getFullYear() === today.getFullYear() ? undefined : 'numeric',
  }).format(date);
}

function ChatThreadSkeleton() {
  return (
    <View style={styles.chatThreadSkeleton}>
      <View style={styles.chatDateSkeleton} />
      {[0, 1, 2, 3, 4, 5].map((item) => (
        <View
          key={item}
          style={[
            styles.chatBubbleSkeleton,
            item % 2 === 1 && styles.chatBubbleSkeletonMine,
            item % 3 === 0 && styles.chatBubbleSkeletonShort,
          ]}>
          <View style={styles.chatBubbleSkeletonLine} />
          <View style={styles.chatBubbleSkeletonTime} />
        </View>
      ))}
    </View>
  );
}

function ChatAvatar({
  user,
  size = 48,
  online = false,
}: {
  user?: Partial<JambitFriend> | null;
  size?: number;
  online?: boolean;
}) {
  return (
    <View style={[styles.chatAvatarWrap, { width: size, height: size }]}>
      <View style={[styles.chatAvatar, { width: size, height: size, borderRadius: size / 2 }]}>
        {user?.avatarUrl ? (
          <Image source={{ uri: user.avatarUrl }} style={styles.chatAvatarImage} />
        ) : (
          <Text style={[styles.chatAvatarText, { fontSize: Math.max(14, size * 0.34) }]}>{initials(user?.name || 'J')}</Text>
        )}
      </View>
      {online && <View style={styles.chatAvatarOnlineDot} />}
    </View>
  );
}

function MessagesScreen({
  sessionToken,
  currentUser,
  initialFriendId,
  onInitialFriendHandled,
  onRoute,
  onOpenUser,
  onToast,
  onUnreadCountChange,
}: {
  sessionToken: string;
  currentUser: JambitUser;
  initialFriendId: string;
  onInitialFriendHandled: () => void;
  onRoute: (route: RouteName) => void;
  onOpenUser: (userId: string) => void;
  onToast: (message: string, tone?: ToastState['tone']) => void;
  onUnreadCountChange: (count: number) => void;
}) {
  const insets = useSafeAreaInsets();
  const isFocused = useIsFocused();
  const [tab, setTab] = useState<'friends' | 'requests'>('friends');
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading');
  const [conversations, setConversations] = useState<JambitChatConversation[]>([]);
  const [requests, setRequests] = useState<JambitFriend[]>([]);
  const [activeFriendId, setActiveFriendId] = useState('');
  const [activeConversationId, setActiveConversationId] = useState('');
  const [messages, setMessages] = useState<JambitChatMessage[]>([]);
  const [threadStatus, setThreadStatus] = useState<'idle' | 'loading' | 'ready' | 'error'>('idle');
  const [messageHasMore, setMessageHasMore] = useState(false);
  const [messageCursor, setMessageCursor] = useState('');
  const [loadingOlderMessages, setLoadingOlderMessages] = useState(false);
  const [messageDraft, setMessageDraft] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [typingConversationIds, setTypingConversationIds] = useState<Set<string>>(() => new Set());
  const [onlineUserIds, setOnlineUserIds] = useState<Set<string>>(() => new Set());
  const [socketState, setSocketState] = useState<'connecting' | 'connected' | 'offline'>('connecting');
  const [requestBusyId, setRequestBusyId] = useState('');
  const socketRef = useRef<Socket | null>(null);
  const activeConversationRef = useRef('');
  const typingTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const typingRecipientRef = useRef('');
  const incomingTypingTimersRef = useRef<globalThis.Map<string, ReturnType<typeof setTimeout>>>(
    new globalThis.Map(),
  );
  const loadingOlderMessagesRef = useRef(false);
  const shouldScrollThreadToEndRef = useRef(false);
  const userScrolledThreadRef = useRef(false);
  const threadRef = useRef<FlatList<JambitChatMessage> | null>(null);
  const currentUserId = String(currentUser.id || '');
  const activeConversation = conversations.find((item) => item.friend.id === activeFriendId) || null;
  const activeFriend = activeConversation?.friend || null;
  const activeFriendOnline = onlineUserIds.has(String(activeFriendId));

  const openConversation = useCallback((friendId: string) => {
    setMessages([]);
    setThreadStatus('loading');
    setMessageHasMore(false);
    setMessageCursor('');
    setActiveFriendId(friendId);
  }, []);

  const filteredConversations = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    return query
      ? conversations.filter((item) => `${item.friend.name} ${item.friend.city || ''}`.toLowerCase().includes(query))
      : conversations;
  }, [conversations, searchQuery]);
  const filteredRequests = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    return query
      ? requests.filter((item) => `${item.name} ${item.city || ''}`.toLowerCase().includes(query))
      : requests;
  }, [requests, searchQuery]);
  const totalUnread = useMemo(
    () => conversations.reduce((total, item) => total + Number(item.unreadCount || 0), 0),
    [conversations],
  );

  useEffect(() => {
    onUnreadCountChange(totalUnread);
  }, [onUnreadCountChange, totalUnread]);

  const refreshChat = useCallback(async () => {
    if (!sessionToken) return;
    setStatus('loading');
    try {
      const [conversationPayload, requestPayload] = await Promise.all([
        getChatConversations(sessionToken),
        getFriendRequests(sessionToken),
      ]);
      setConversations(conversationPayload.conversations || []);
      setRequests(requestPayload.requests || []);
      setStatus('ready');
    } catch (error) {
      setStatus('error');
      onToast(error instanceof Error ? error.message : 'Please try again.', 'error');
    }
  }, [onToast, sessionToken]);

  useEffect(() => {
    refreshChat().catch(() => undefined);
  }, [refreshChat]);

  useEffect(() => {
    if (!initialFriendId || status !== 'ready') return;
    const match = conversations.find((item) => String(item.friend.id) === String(initialFriendId));
    if (match) {
      setTab('friends');
      openConversation(match.friend.id);
    } else {
      onToast('Chat is available only to members of the same group or event.', 'info');
    }
    onInitialFriendHandled();
  }, [conversations, initialFriendId, onInitialFriendHandled, onToast, openConversation, status]);

  useEffect(() => {
    activeConversationRef.current = activeConversationId;
  }, [activeConversationId]);

  useEffect(() => {
    if (!sessionToken) return undefined;
    const incomingTypingTimers = incomingTypingTimersRef.current;
    const socket = io(getSocketBaseUrl(), {
      auth: { token: sessionToken },
      transports: ['websocket', 'polling'],
      reconnection: true,
    });
    socketRef.current = socket;
    setSocketState('connecting');
    socket.on('connect', () => setSocketState('connected'));
    socket.on('disconnect', () => {
      setSocketState('offline');
      setOnlineUserIds(new Set());
      setTypingConversationIds(new Set());
    });
    socket.on('connect_error', () => {
      setSocketState('offline');
      setOnlineUserIds(new Set());
    });
    socket.on('chat:presence:snapshot', ({ onlineUserIds: nextOnlineUserIds }) => {
      setOnlineUserIds(new Set((nextOnlineUserIds || []).map(String)));
    });
    socket.on('chat:presence', ({ userId, online }) => {
      const normalizedUserId = String(userId || '');
      if (!normalizedUserId) return;
      setOnlineUserIds((current) => {
        const next = new Set(current);
        if (online) next.add(normalizedUserId);
        else next.delete(normalizedUserId);
        return next;
      });
    });
    socket.on('chat:message', ({ conversationId, message }) => {
      const nextMessage = message as JambitChatMessage;
      setTypingConversationIds((current) => {
        const next = new Set(current);
        next.delete(String(conversationId));
        return next;
      });
      setConversations((current) => current.map((conversation) => (
        conversation.id === conversationId
          ? {
              ...conversation,
              latestMessage: nextMessage,
              unreadCount: activeConversationRef.current === conversationId
                ? 0
                : Number(conversation.unreadCount || 0) + 1,
            }
          : conversation
      )));
      if (activeConversationRef.current === conversationId) {
        shouldScrollThreadToEndRef.current = true;
        setMessages((current) => mergeChatMessage(current, nextMessage));
        socket.emit('chat:read', { conversationId });
      }
    });
    socket.on('chat:typing', ({ conversationId, typing }) => {
      const normalizedConversationId = String(conversationId || '');
      if (!normalizedConversationId) return;
      const existingTimer = incomingTypingTimersRef.current.get(normalizedConversationId);
      if (existingTimer) clearTimeout(existingTimer);
      incomingTypingTimersRef.current.delete(normalizedConversationId);
      setTypingConversationIds((current) => {
        const next = new Set(current);
        if (typing) next.add(normalizedConversationId);
        else next.delete(normalizedConversationId);
        return next;
      });
      if (typing) {
        const timer = setTimeout(() => {
          incomingTypingTimersRef.current.delete(normalizedConversationId);
          setTypingConversationIds((current) => {
            const next = new Set(current);
            next.delete(normalizedConversationId);
            return next;
          });
        }, 3000);
        incomingTypingTimersRef.current.set(normalizedConversationId, timer);
      }
    });
    socket.on('chat:read', ({ conversationId, userId }) => {
      setMessages((current) => current.map((message) => {
        if (message.conversationId !== conversationId) return message;
        const readBy = new Set((message.readBy || []).map(String));
        readBy.add(String(userId));
        return { ...message, readBy: [...readBy] };
      }));
    });

    return () => {
      if (typingTimerRef.current) clearTimeout(typingTimerRef.current);
      incomingTypingTimers.forEach((timer) => clearTimeout(timer));
      incomingTypingTimers.clear();
      socket.disconnect();
      socketRef.current = null;
    };
  }, [sessionToken]);

  useEffect(() => {
    if (socketState !== 'connected' || !conversations.length) return;
    socketRef.current?.timeout(5000).emit(
      'chat:presence:get',
      { userIds: conversations.map((conversation) => conversation.friend.id) },
      (error: Error | null, response?: { ok?: boolean; onlineUserIds?: string[] }) => {
        if (!error && response?.ok) {
          setOnlineUserIds(new Set((response.onlineUserIds || []).map(String)));
        }
      },
    );
  }, [conversations, socketState]);

  useEffect(() => {
    if (!activeFriendId || !sessionToken) {
      setMessages([]);
      setActiveConversationId('');
      setThreadStatus('idle');
      setMessageHasMore(false);
      setMessageCursor('');
      return undefined;
    }

    let active = true;
    setMessages([]);
    setThreadStatus('loading');
    setMessageHasMore(false);
    setMessageCursor('');
    getChatMessages(sessionToken, activeFriendId, { limit: 20 })
      .then((payload) => {
        if (!active) return;
        shouldScrollThreadToEndRef.current = true;
        setMessages(payload.messages || []);
        setMessageHasMore(Boolean(payload.pagination?.hasMore));
        setMessageCursor(String(payload.pagination?.nextCursor || ''));
        setThreadStatus('ready');
        setActiveConversationId(payload.conversationId);
        setConversations((current) => current.map((conversation) => (
          conversation.friend.id === activeFriendId
            ? { ...conversation, id: payload.conversationId, unreadCount: 0 }
            : conversation
        )));
        socketRef.current?.emit('chat:join', { conversationId: payload.conversationId });
        socketRef.current?.emit('chat:read', { conversationId: payload.conversationId });
        markChatRead(sessionToken, payload.conversationId).catch(() => undefined);
      })
      .catch((error) => {
        if (active) {
          setThreadStatus('error');
          onToast(error instanceof Error ? error.message : 'Please try again.', 'error');
        }
      });
    return () => {
      active = false;
      if (typingRecipientRef.current === String(activeFriendId)) {
        socketRef.current?.emit('chat:typing', { recipientId: activeFriendId, typing: false });
        typingRecipientRef.current = '';
      }
      if (typingTimerRef.current) clearTimeout(typingTimerRef.current);
    };
  }, [activeFriendId, onToast, sessionToken]);

  useEffect(() => {
    if (Platform.OS !== 'android' || !isFocused || !activeFriendId) return undefined;
    const subscription = BackHandler.addEventListener('hardwareBackPress', () => {
      setActiveFriendId('');
      return true;
    });
    return () => subscription.remove();
  }, [activeFriendId, isFocused]);

  useEffect(() => {
    if (threadStatus !== 'ready' || !shouldScrollThreadToEndRef.current) return undefined;
    const delays = [0, 100, 280, 600];
    const timers = delays.map((delay, index) => setTimeout(() => {
      threadRef.current?.scrollToEnd({ animated: false });
      if (index === delays.length - 1) shouldScrollThreadToEndRef.current = false;
    }, delay));
    return () => timers.forEach((timer) => clearTimeout(timer));
  }, [messages.length, threadStatus]);

  const loadOlderMessages = useCallback(async () => {
    if (
      !activeFriendId ||
      !messageHasMore ||
      !messageCursor ||
      loadingOlderMessagesRef.current
    ) return;

    loadingOlderMessagesRef.current = true;
    userScrolledThreadRef.current = false;
    setLoadingOlderMessages(true);
    try {
      const payload = await getChatMessages(sessionToken, activeFriendId, {
        limit: 20,
        before: messageCursor,
      });
      setMessages((current) => {
        const existingIds = new Set(current.map((message) => message.id));
        const olderMessages = (payload.messages || []).filter((message) => !existingIds.has(message.id));
        return [...olderMessages, ...current];
      });
      setMessageHasMore(Boolean(payload.pagination?.hasMore));
      setMessageCursor(String(payload.pagination?.nextCursor || ''));
    } catch (error) {
      onToast(error instanceof Error ? error.message : 'Please try again.', 'error');
    } finally {
      loadingOlderMessagesRef.current = false;
      setLoadingOlderMessages(false);
    }
  }, [activeFriendId, messageCursor, messageHasMore, onToast, sessionToken]);

  const updateDraft = useCallback((value: string) => {
    setMessageDraft(value);
    if (!activeFriendId || !socketRef.current?.connected) return;
    const typing = Boolean(value.trim());
    socketRef.current.emit('chat:typing', { recipientId: activeFriendId, typing });
    typingRecipientRef.current = typing ? String(activeFriendId) : '';
    if (typingTimerRef.current) clearTimeout(typingTimerRef.current);
    if (typing) {
      typingTimerRef.current = setTimeout(() => {
        socketRef.current?.emit('chat:typing', { recipientId: activeFriendId, typing: false });
        typingRecipientRef.current = '';
      }, 900);
    }
  }, [activeFriendId]);

  const submitMessage = useCallback(() => {
    const text = messageDraft.trim();
    if (!text || !activeFriendId) return;
    setMessageDraft('');
    socketRef.current?.emit('chat:typing', { recipientId: activeFriendId, typing: false });
    typingRecipientRef.current = '';
    if (typingTimerRef.current) clearTimeout(typingTimerRef.current);

    const messageId = `${currentUserId}-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
    sendChatMessage(sessionToken, activeFriendId, text, messageId)
      .then((payload) => {
        shouldScrollThreadToEndRef.current = true;
        setMessages((current) => mergeChatMessage(current, payload.message));
      })
      .catch((error) => {
        setMessageDraft(text);
        onToast(error instanceof Error ? error.message : 'Please try again.', 'error');
      });
  }, [activeFriendId, currentUserId, messageDraft, onToast, sessionToken]);

  const handleRequest = useCallback(async (request: JambitFriend, action: 'accept' | 'decline') => {
    if (!request.friendshipId) return;
    setRequestBusyId(request.friendshipId);
    try {
      if (action === 'accept') {
        await acceptFriendRequest(sessionToken, request.friendshipId);
        await refreshChat();
        setTab('friends');
        onToast('Friend request accepted.', 'success');
      } else {
        await declineFriendRequest(sessionToken, request.friendshipId);
        setRequests((current) => current.filter((item) => item.friendshipId !== request.friendshipId));
        onToast('Friend request declined.', 'info');
      }
    } catch (error) {
      onToast(error instanceof Error ? error.message : 'Please try again.', 'error');
    } finally {
      setRequestBusyId('');
    }
  }, [onToast, refreshChat, sessionToken]);

  if (activeFriend) {
    return (
      <KeyboardAvoidingView
        style={styles.chatScreen}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? insets.top : 0}>
        <View style={[styles.chatThreadHeader, { paddingTop: spacing.md }]}>
          {showVisualBackButton && (
            <Pressable style={styles.chatBackButton} onPress={() => setActiveFriendId('')}>
              <ArrowLeft color={colors.ink} size={22} strokeWidth={2.6} />
            </Pressable>
          )}
          <Pressable style={styles.chatThreadPerson} onPress={() => onOpenUser(activeFriend.id)}>
            <ChatAvatar user={activeFriend} size={44} online={activeFriendOnline} />
            <View style={styles.flex1}>
              <Text numberOfLines={1} style={styles.chatThreadName}>{activeFriend.name}</Text>
              <Text
                numberOfLines={1}
                style={[styles.chatThreadStatus, activeFriendOnline && styles.chatThreadStatusOnline]}>
                {activeConversationId && typingConversationIds.has(activeConversationId)
                  ? 'Typing...'
                  : activeFriendOnline
                    ? 'Online now'
                    : activeFriend.city || 'Offline'}
              </Text>
            </View>
          </Pressable>
        </View>

        <FlatList
          ref={threadRef}
          data={messages}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.chatThreadList}
          keyboardShouldPersistTaps="handled"
          maintainVisibleContentPosition={{ minIndexForVisible: 0 }}
          scrollEventThrottle={16}
          onScrollBeginDrag={() => {
            userScrolledThreadRef.current = true;
          }}
          onScroll={({ nativeEvent }) => {
            if (userScrolledThreadRef.current && nativeEvent.contentOffset.y <= 32) {
              loadOlderMessages().catch(() => undefined);
            }
          }}
          onContentSizeChange={() => {
            if (!shouldScrollThreadToEndRef.current) return;
            threadRef.current?.scrollToEnd({ animated: false });
          }}
          ListHeaderComponent={loadingOlderMessages ? (
            <View style={styles.chatOlderLoading}>
              <View style={styles.chatOlderLoadingLine} />
            </View>
          ) : null}
          ListEmptyComponent={threadStatus === 'loading' ? (
            <ChatThreadSkeleton />
          ) : (
            <View style={styles.chatThreadEmpty}>
              <MessageCircle color={colors.purple} size={42} strokeWidth={2.2} />
              <Text style={styles.chatThreadEmptyTitle}>
                {threadStatus === 'error' ? 'Messages could not load' : 'Start the conversation'}
              </Text>
              <Text style={styles.chatThreadEmptyBody}>
                {threadStatus === 'error'
                  ? 'Please return to Chats and open this conversation again.'
                  : 'Say hello and connect around your shared interests.'}
              </Text>
            </View>
          )}
          renderItem={({ item, index }) => {
            const mine = String(item.senderId) === currentUserId;
            const isRead = mine && (item.readBy || []).some((id) => String(id) === String(activeFriend.id));
            const showDate = index === 0 || chatDateKey(messages[index - 1]?.createdAt) !== chatDateKey(item.createdAt);
            return (
              <View>
                {showDate && (
                  <View style={styles.chatDateSeparator}>
                    <Text style={styles.chatDateSeparatorText}>{formatChatDate(item.createdAt)}</Text>
                  </View>
                )}
                <View style={[styles.chatBubbleWrap, mine && styles.chatBubbleWrapMine]}>
                  <View style={[styles.chatBubble, mine && styles.chatBubbleMine]}>
                    <Text style={[styles.chatBubbleText, mine && styles.chatBubbleTextMine]}>{item.text}</Text>
                    <View style={styles.chatBubbleMeta}>
                      <Text style={[styles.chatBubbleTime, mine && styles.chatBubbleTimeMine]}>{formatChatTime(item.createdAt)}</Text>
                      {mine && (
                        <View style={styles.chatReadState}>
                          <CheckCheck color={isRead ? colors.green : colors.surface} size={13} strokeWidth={2.7} />
                          <Text style={[styles.chatBubbleTime, styles.chatReadText, isRead && styles.chatReadTextActive]}>
                            {isRead ? 'Read' : 'Sent'}
                          </Text>
                        </View>
                      )}
                    </View>
                  </View>
                </View>
              </View>
            );
          }}
        />

        <View style={[styles.chatComposer, { paddingBottom: Math.max(insets.bottom, spacing.sm) }]}>
          <TextInput
            value={messageDraft}
            onChangeText={updateDraft}
            onSubmitEditing={submitMessage}
            placeholder={`Message ${activeFriend.name}`}
            placeholderTextColor={colors.muted}
            returnKeyType="send"
            multiline
            style={styles.chatComposerInput}
          />
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Send message"
            style={[styles.chatSendButton, !messageDraft.trim() && styles.chatSendButtonDisabled]}
            onPress={submitMessage}
            disabled={!messageDraft.trim()}>
            <Send color={colors.surface} size={19} strokeWidth={2.7} />
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    );
  }

  return (
    <ScrollView
      style={styles.chatScreen}
      contentContainerStyle={[styles.content, styles.chatInboxContent, { paddingTop: insets.top + spacing.md }]}
      keyboardShouldPersistTaps="handled"
      showsVerticalScrollIndicator={false}>
      <View style={styles.profileTopBar}>
        <View style={styles.flex1}>
          <Text style={styles.profileTopKicker}>{socketState === 'connected' ? 'LIVE NOW' : 'YOUR CIRCLE'}</Text>
          <Text style={styles.profileTopTitle}>Chats</Text>
        </View>
        <Pressable style={styles.screenHeaderButton} onPress={() => onRoute('explore')}>
          <Search color={colors.ink} size={19} strokeWidth={2.7} />
        </Pressable>
      </View>

      <View style={styles.chatTabs}>
        <Pressable style={[styles.chatTab, tab === 'friends' && styles.chatTabActive]} onPress={() => setTab('friends')}>
          <UsersRound color={tab === 'friends' ? colors.surface : colors.ink} size={17} strokeWidth={2.6} />
          <Text style={[styles.chatTabText, tab === 'friends' && styles.chatTabTextActive]}>Chats</Text>
          {totalUnread > 0 && <Text style={styles.chatTabBadge}>{totalUnread}</Text>}
        </Pressable>
        <Pressable style={[styles.chatTab, tab === 'requests' && styles.chatTabActive]} onPress={() => setTab('requests')}>
          <UserPlus color={tab === 'requests' ? colors.surface : colors.ink} size={17} strokeWidth={2.6} />
          <Text style={[styles.chatTabText, tab === 'requests' && styles.chatTabTextActive]}>Requests</Text>
          {requests.length > 0 && <Text style={styles.chatTabBadge}>{requests.length}</Text>}
        </Pressable>
      </View>

      <View style={styles.chatSearch}>
        <Search color={colors.muted} size={18} strokeWidth={2.5} />
        <TextInput
          value={searchQuery}
          onChangeText={setSearchQuery}
          placeholder={tab === 'friends' ? 'Search chats' : 'Search requests'}
          placeholderTextColor={colors.muted}
          style={styles.chatSearchInput}
        />
      </View>

      {status === 'loading' ? (
        <View style={styles.chatLoadingList}>
          {[0, 1, 2].map((item) => <View key={item} style={styles.chatLoadingRow} />)}
        </View>
      ) : tab === 'friends' ? (
        filteredConversations.length ? (
          <View style={styles.chatList}>
            {filteredConversations.map((conversation) => (
              <Pressable
                key={conversation.friend.id}
                style={styles.chatListRow}
                onPress={() => openConversation(conversation.friend.id)}>
                <ChatAvatar
                  user={conversation.friend}
                  online={onlineUserIds.has(String(conversation.friend.id))}
                />
                <View style={styles.chatListCopy}>
                  <Text numberOfLines={1} style={styles.chatListName}>{conversation.friend.name}</Text>
                  <Text
                    numberOfLines={1}
                    style={[
                      styles.chatListPreview,
                      typingConversationIds.has(conversation.id) && styles.chatListPreviewLive,
                    ]}>
                    {typingConversationIds.has(conversation.id)
                      ? 'Typing...'
                      : conversation.latestMessage?.text || conversation.friend.city || 'Start the chat'}
                  </Text>
                </View>
                <View style={styles.chatListAside}>
                  <Text style={styles.chatListTime}>{formatChatTime(conversation.latestMessage?.createdAt)}</Text>
                  {Number(conversation.unreadCount || 0) > 0 && (
                    <Text style={styles.chatUnreadBadge}>{conversation.unreadCount}</Text>
                  )}
                </View>
              </Pressable>
            ))}
          </View>
        ) : (
          <EmptyScreen
            icon={<MessageCircle color={colors.purple} size={38} />}
            title={status === 'error' ? 'Messages could not load' : 'No chats available'}
            body="Join a group or event to chat with its members."
            actionLabel={status === 'error' ? 'Try again' : 'Discover events'}
            onAction={status === 'error' ? refreshChat : () => onRoute('explore')}
          />
        )
      ) : filteredRequests.length ? (
        <View style={styles.chatList}>
          {filteredRequests.map((request) => (
            <View key={request.friendshipId || request.id} style={styles.chatRequestRow}>
              <Pressable onPress={() => onOpenUser(request.id)}><ChatAvatar user={request} /></Pressable>
              <View style={styles.chatListCopy}>
                <Text numberOfLines={1} style={styles.chatListName}>{request.name}</Text>
                <Text numberOfLines={1} style={styles.chatListPreview}>{request.city || 'Wants to connect'}</Text>
                <View style={styles.chatRequestActions}>
                  <Pressable
                    style={styles.chatAcceptButton}
                    onPress={() => handleRequest(request, 'accept')}
                    disabled={requestBusyId === request.friendshipId}>
                    <Text style={styles.chatAcceptText}>Accept</Text>
                  </Pressable>
                  <Pressable
                    style={styles.chatDeclineButton}
                    onPress={() => handleRequest(request, 'decline')}
                    disabled={requestBusyId === request.friendshipId}>
                    <Text style={styles.chatDeclineText}>Decline</Text>
                  </Pressable>
                </View>
              </View>
            </View>
          ))}
        </View>
      ) : (
        <EmptyScreen
          icon={<UserCheck color={colors.green} size={38} />}
          title="No new requests"
          body="New friend requests will appear here."
          compact
        />
      )}
    </ScrollView>
  );
}

function notificationTimeLabel(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  const seconds = Math.max(0, Math.floor((Date.now() - date.getTime()) / 1000));
  if (seconds < 60) return 'Just now';
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return date.toLocaleDateString(undefined, { day: 'numeric', month: 'short' });
}

function NotificationsScreen({
  notifications,
  unreadCount,
  onRoute,
  onPress,
  onMarkAllRead,
}: {
  notifications: JambitNotification[];
  unreadCount: number;
  onRoute: (route: RouteName) => void;
  onPress: (notification: JambitNotification) => void;
  onMarkAllRead: () => void;
}) {
  return (
    <ScrollView
      contentContainerStyle={[styles.content, styles.profileContent, styles.notificationsContent]}
      showsVerticalScrollIndicator={false}>
      <View style={styles.profileTopBar}>
        <View style={styles.flex1}>
          <Text style={styles.profileTopKicker}>Updates</Text>
          <Text style={styles.profileTopTitle}>Notifications</Text>
        </View>
        <View style={styles.screenHeaderActions}>
          {unreadCount > 0 && (
            <Pressable style={styles.notificationMarkAllButton} onPress={onMarkAllRead}>
              <Check color={colors.purple} size={16} strokeWidth={2.8} />
              <Text style={styles.notificationMarkAllText}>Read all</Text>
            </Pressable>
          )}
          <Pressable style={styles.screenHeaderButton} onPress={() => onRoute('explore')}>
            <Search color={colors.ink} size={19} strokeWidth={2.7} />
          </Pressable>
          <View style={[styles.screenHeaderButton, styles.notificationHeaderIcon]}>
            <Bell color={colors.orange} size={20} strokeWidth={2.8} />
          </View>
        </View>
      </View>

      {notifications.length ? (
        <View style={styles.notificationList}>
          {notifications.map((notification) => {
            const NotificationIcon = notification.type.startsWith('friend')
              ? Users
              : notification.type.startsWith('event')
                ? CalendarDays
                : Bell;
            const unread = !notification.readAt;
            return (
              <Pressable
                key={notification.id}
                style={[styles.notificationRow, unread && styles.notificationRowUnread]}
                onPress={() => onPress(notification)}>
                <View style={[styles.notificationRowIcon, unread && styles.notificationRowIconUnread]}>
                  <NotificationIcon
                    color={unread ? colors.coral : colors.muted}
                    size={21}
                    strokeWidth={2.6}
                  />
                </View>
                <View style={styles.notificationRowCopy}>
                  <View style={styles.notificationRowHeading}>
                    <Text numberOfLines={1} style={styles.notificationRowTitle}>{notification.title}</Text>
                    <Text style={styles.notificationRowTime}>{notificationTimeLabel(notification.createdAt)}</Text>
                  </View>
                  <Text numberOfLines={2} style={styles.notificationRowBody}>{notification.body}</Text>
                </View>
                {unread && <View style={styles.notificationUnreadDot} />}
              </Pressable>
            );
          })}
        </View>
      ) : (
        <View style={styles.notificationEmptyPanel}>
          <View style={styles.notificationEmptyIcon}>
            <Bell color={colors.purple} size={36} strokeWidth={2.4} />
          </View>
          <Text style={styles.notificationEmptyKicker}>YOU'RE ALL CAUGHT UP</Text>
          <Text style={styles.notificationEmptyTitle}>No new notifications</Text>
          <Text style={styles.notificationEmptyBody}>
            Group updates, event reminders and activity from your circle will appear here.
          </Text>
          <Pressable style={styles.notificationExploreButton} onPress={() => onRoute('explore')}>
            <Search color={colors.surface} size={17} strokeWidth={2.6} />
            <Text style={styles.notificationExploreButtonText}>Explore events</Text>
          </Pressable>
        </View>
      )}
    </ScrollView>
  );
}

function ProfileScreen({
  user,
  groups,
  creationDrafts,
  categories,
  sessionToken,
  onRoute,
  onResumeDraft,
  onRemoveDraft,
  onLogout,
  onUserUpdated,
  onToast,
  onOpenTickets,
}: {
  user: JambitUser;
  groups: JambitGroup[];
  creationDrafts: CreationDraft[];
  categories: InterestCategory[];
  sessionToken: string;
  onRoute: (route: RouteName) => void;
  onResumeDraft: (draft: CreationDraft) => void;
  onRemoveDraft: (draftId: string) => void;
  onLogout: () => void;
  onUserUpdated: (user: JambitUser) => Promise<void>;
  onToast: (message: string, tone?: ToastState['tone']) => void;
  onOpenTickets: () => void;
}) {
  const insets = useSafeAreaInsets();
  const isFocused = useIsFocused();
  const interests = user.onboarding?.interests || [];
  const myGroups = groups.filter((group) => group.canEdit === true);
  const joinedGroups = groups.filter((group) => group.canEdit !== true);
  const [activePanel, setActivePanel] = useState<ProfileSettingsPanelName | null>(null);
  const [showDeleteConfirmation, setShowDeleteConfirmation] = useState(false);
  const [deletingAccount, setDeletingAccount] = useState(false);

  const confirmAccountDeletion = async () => {
    if (deletingAccount) return;
    setDeletingAccount(true);
    try {
      await requestCurrentUserDeletion(sessionToken);
      setShowDeleteConfirmation(false);
      await Promise.resolve(onLogout());
      onToast('Your account will be deleted in 30 days. Sign in before then to cancel.', 'info');
    } catch (error) {
      onToast(error instanceof Error ? error.message : 'Account deletion could not be scheduled.', 'error');
    } finally {
      setDeletingAccount(false);
    }
  };

  useEffect(() => {
    if (Platform.OS !== 'android' || !isFocused || !activePanel) return undefined;
    const subscription = BackHandler.addEventListener('hardwareBackPress', () => {
      setActivePanel(null);
      return true;
    });
    return () => subscription.remove();
  }, [activePanel, isFocused]);

  if (activePanel) {
    return (
      <ProfileSettingsPanel
        panel={activePanel}
        user={user}
        token={sessionToken}
        categories={categories}
        onBack={() => setActivePanel(null)}
        onUserUpdated={onUserUpdated}
        onToast={onToast}
      />
    );
  }

  return (
    <View style={styles.flex1}>
      <ScrollView
        contentContainerStyle={[
          styles.content,
          styles.profileContent,
          { paddingTop: insets.top + spacing.md },
        ]}>
      <View style={styles.profileTopBar}>
        <View>
          <Text style={styles.profileTopKicker}>Your space</Text>
          <Text style={styles.profileTopTitle}>Profile</Text>
        </View>
      </View>

      <View style={styles.profileHero}>
        <Avatar user={user} size={108} />
        <Text style={styles.profileName}>{user.name}</Text>
        <Text style={styles.mutedText}>{user.email}</Text>
        <Pressable onPress={() => setActivePanel('personal')}>
          <Text style={styles.profileLink}>Edit profile</Text>
        </Pressable>
        <View style={styles.profileStats}>
          <ProfileStat value={String(myGroups.length)} label="My groups" />
          <ProfileStat value={String(joinedGroups.length)} label="Joined" />
          <ProfileStat value={String(interests.length)} label="Interests" />
        </View>
      </View>

      <View style={styles.sectionBlock}>
        <Text style={styles.sectionHeading}>My groups</Text>
        <SettingsRow
          icon={<Users size={20} color={colors.coral} />}
          label={`${myGroups.length ? myGroups.length : 'No'} group${myGroups.length === 1 ? '' : 's'} you host`}
          onPress={() => onRoute('groups')}
        />
      </View>

      <View style={styles.sectionBlock}>
        <Text style={styles.sectionHeading}>Joined groups</Text>
        <SettingsRow
          icon={<UsersRound size={20} color={colors.purple} />}
          label={`${joinedGroups.length ? joinedGroups.length : 'No'} joined group${joinedGroups.length === 1 ? '' : 's'}`}
          onPress={() => onRoute('groups')}
        />
      </View>

      <View style={styles.sectionBlock}>
        <View style={styles.sectionHeadingRow}>
          <Text style={styles.sectionHeading}>My events drafts</Text>
          <Text style={styles.sectionHeadingCount}>{creationDrafts.length}</Text>
        </View>
        {creationDrafts.length ? (
          <View style={styles.creationDraftList}>
            {creationDrafts.map((draft) => (
              <CreationDraftCard
                key={draft.id}
                draft={draft}
                onResume={() => onResumeDraft(draft)}
                onRemove={() => onRemoveDraft(draft.id)}
              />
            ))}
          </View>
        ) : (
          <View style={styles.creationDraftEmpty}>
            <CalendarDays color={colors.purple} size={24} strokeWidth={2.6} />
            <Text style={styles.creationDraftEmptyText}>Group and event drafts you start will show here.</Text>
          </View>
        )}
      </View>

      <View style={styles.sectionBlock}>
        <Text style={styles.sectionHeading}>My interests</Text>
        <View style={styles.chipRow}>
          {interests.map((interest) => (
            <Chip key={interest} label={interest} />
          ))}
        </View>
      </View>

      <View style={styles.sectionBlock}>
        <Text style={styles.sectionHeading}>Account</Text>
        <SettingsRow icon={<TicketCheck size={20} color={colors.orange} />} label="My tickets" onPress={onOpenTickets} />
        <SettingsRow icon={<Settings size={20} color={colors.muted} />} label="Account management" onPress={() => setActivePanel('account')} />
        <SettingsRow icon={<User size={20} color={colors.muted} />} label="Personal info" onPress={() => setActivePanel('personal')} />
        <SettingsRow icon={<Heart size={20} color={colors.muted} />} label="Interests" onPress={() => setActivePanel('interests')} />
        {Platform.OS === 'ios' ? (
          <SettingsRow
            destructive
            icon={<Trash2 size={20} color={colors.coral} />}
            label="Delete account"
            onPress={() => setShowDeleteConfirmation(true)}
          />
        ) : null}
        <SettingsRow icon={<LogOut size={20} color={colors.muted} />} label="Log out" onPress={onLogout} />
      </View>
      </ScrollView>

      <Modal
        visible={Platform.OS === 'ios' && showDeleteConfirmation}
        transparent
        animationType="fade"
        onRequestClose={() => !deletingAccount && setShowDeleteConfirmation(false)}>
        <View style={styles.ticketModalBackdrop}>
          <View style={styles.ticketConfirmCard}>
            <View style={styles.accountDeleteIcon}>
              <Trash2 color={colors.coral} size={28} strokeWidth={2.5} />
            </View>
            <Text style={styles.ticketConfirmTitle}>Delete your account?</Text>
            <Text style={styles.ticketConfirmBody}>
              Your account will be deleted in 30 days. If you sign in before then, the deletion request will be cancelled.
            </Text>
            <View style={styles.ticketConfirmActions}>
              <Pressable
                style={styles.ticketKeepButton}
                onPress={() => setShowDeleteConfirmation(false)}
                disabled={deletingAccount}>
                <Text style={styles.ticketKeepButtonText}>Cancel</Text>
              </Pressable>
              <Pressable
                style={styles.ticketConfirmCancelButton}
                onPress={confirmAccountDeletion}
                disabled={deletingAccount}>
                {deletingAccount ? (
                  <ActivityIndicator color={colors.surface} />
                ) : (
                  <Text style={styles.ticketConfirmCancelText}>Confirm deletion</Text>
                )}
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

function CreationDraftCard({
  draft,
  onResume,
  onRemove,
}: {
  draft: CreationDraft;
  onResume: () => void;
  onRemove: () => void;
}) {
  const isGroupDraft = draft.type === 'group';

  return (
    <View style={styles.creationDraftCard}>
      <View style={styles.creationDraftIcon}>
        {isGroupDraft ? (
          <Users color={colors.coral} size={20} strokeWidth={2.7} />
        ) : (
          <CalendarDays color={colors.purple} size={20} strokeWidth={2.7} />
        )}
      </View>
      <View style={styles.flex1}>
        <Text style={styles.creationDraftType}>{isGroupDraft ? 'Group draft' : 'Event draft'}</Text>
        <Text numberOfLines={2} style={styles.creationDraftTitle}>{draft.title}</Text>
        <Text numberOfLines={1} style={styles.creationDraftMeta}>
          {draft.subtitle || 'Draft'} - saved {creationDraftDateLabel(draft.updatedAt)}
        </Text>
        <View style={styles.creationDraftActions}>
          <Pressable style={styles.creationDraftContinueButton} onPress={onResume}>
            <Text style={styles.creationDraftContinueText}>Continue</Text>
          </Pressable>
          <Pressable style={styles.creationDraftRemoveButton} onPress={onRemove}>
            <Text style={styles.creationDraftRemoveText}>Remove</Text>
          </Pressable>
        </View>
      </View>
    </View>
  );
}

type AuthFlowProps = {
  onClose?: () => void;
  onAuthenticated: (token: string, user: JambitUser) => void;
  onToast: (message: string, tone?: ToastState['tone']) => void;
  standalone?: boolean;
};

function AuthFooterAction({
  label,
  actionLabel,
  onPress,
  disabled,
}: {
  label: string;
  actionLabel: string;
  onPress: () => void;
  disabled?: boolean;
}) {
  const wideLabel = label.length > 18;

  return (
    <View style={styles.authFooter}>
      <Text numberOfLines={1} style={[styles.authFooterMuted, wideLabel && styles.authFooterMutedWide]}>
        {label}
      </Text>
      <Pressable style={[styles.authFooterLinkButton, wideLabel && styles.authFooterLinkButtonWide]} onPress={onPress} disabled={disabled}>
        <Text numberOfLines={1} style={[styles.authFooterLink, disabled && styles.authFooterLinkDisabled]}>
          {actionLabel}
        </Text>
      </Pressable>
    </View>
  );
}

function PasswordVisibilityButton({
  visible,
  onPress,
}: {
  visible: boolean;
  onPress: () => void;
}) {
  const Icon = visible ? EyeOff : Eye;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={visible ? 'Hide password' : 'Show password'}
      hitSlop={8}
      style={({ pressed }) => [
        styles.passwordVisibilityButton,
        pressed ? styles.passwordVisibilityButtonPressed : null,
      ]}
      onPress={onPress}>
      <Icon color="#777782" size={20} strokeWidth={2.4} />
    </Pressable>
  );
}

function AuthFlow({
  onClose,
  onAuthenticated,
  onToast,
  standalone,
}: AuthFlowProps) {
  const insets = useSafeAreaInsets();
  const [step, setStep] = useState<AuthStep>('entry');
  const stepRef = useRef<AuthStep>('entry');
  const authHistoryRef = useRef<AuthStep[]>([]);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [signupName, setSignupName] = useState('');
  const [signupEmail, setSignupEmail] = useState('');
  const [signupPassword, setSignupPassword] = useState('');
  const [signupCityQuery, setSignupCityQuery] = useState('');
  const [signupCity, setSignupCity] = useState<PlaceSuggestion | null>(null);
  const [signupPlaceSuggestions, setSignupPlaceSuggestions] = useState<PlaceSuggestion[]>([]);
  const [signupPlaceStatus, setSignupPlaceStatus] = useState<'idle' | 'loading' | 'error'>('idle');
  const [signupAgeConfirmed, setSignupAgeConfirmed] = useState(false);
  const [signupToken, setSignupToken] = useState('');
  const [signupVerificationEmail, setSignupVerificationEmail] = useState('');
  const [signupOtp, setSignupOtp] = useState('');
  const [resetEmail, setResetEmail] = useState('');
  const [resetToken, setResetToken] = useState('');
  const [resetOtp, setResetOtp] = useState('');
  const [resetPassword, setResetPassword] = useState('');
  const [resetConfirmPassword, setResetConfirmPassword] = useState('');
  const [resetCooldown, setResetCooldown] = useState(0);
  const [showLoginPassword, setShowLoginPassword] = useState(false);
  const [showSignupPassword, setShowSignupPassword] = useState(false);
  const [showResetPassword, setShowResetPassword] = useState(false);
  const [showResetConfirmPassword, setShowResetConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const keyboardLift = useKeyboardLift(step !== 'entry');
  const keyboardTranslateY = useMemo(
    () =>
      keyboardLift.interpolate({
        inputRange: [0, 1],
        outputRange: [0, -1],
        extrapolate: 'extend',
      }),
    [keyboardLift],
  );

  useEffect(() => {
    stepRef.current = step;
  }, [step]);

  useEffect(() => {
    setShowLoginPassword(false);
    setShowSignupPassword(false);
    setShowResetPassword(false);
    setShowResetConfirmPassword(false);
  }, [step]);

  const goToAuthStep = useCallback((nextStep: AuthStep, options?: { replace?: boolean }) => {
    const currentStep = stepRef.current;
    if (currentStep === nextStep) return;

    authHistoryRef.current = options?.replace
      ? []
      : [...authHistoryRef.current, currentStep].slice(-12);
    stepRef.current = nextStep;
    setStep(nextStep);
  }, []);

  const goBackAuthStep = useCallback(() => {
    const history = authHistoryRef.current;

    if (history.length) {
      const previousStep = history[history.length - 1];
      authHistoryRef.current = history.slice(0, -1);
      stepRef.current = previousStep;
      setStep(previousStep);
      return true;
    }

    if (stepRef.current !== 'entry') {
      stepRef.current = 'entry';
      setStep('entry');
      return true;
    }

    if (onClose) {
      onClose();
      return true;
    }

    return false;
  }, [onClose]);

  useEffect(() => {
    if (Platform.OS !== 'android') return undefined;

    const subscription = BackHandler.addEventListener('hardwareBackPress', goBackAuthStep);
    return () => subscription.remove();
  }, [goBackAuthStep]);

  useEffect(() => {
    if (resetCooldown <= 0) return undefined;

    const timer = setInterval(() => {
      setResetCooldown((value) => Math.max(value - 1, 0));
    }, 1000);

    return () => clearInterval(timer);
  }, [resetCooldown]);

  useEffect(() => {
    if (step !== 'signup') {
      setSignupPlaceSuggestions([]);
      setSignupPlaceStatus('idle');
      return undefined;
    }

    const query = signupCityQuery.trim();
    const selectedDescription = signupCity?.description.trim();
    if (selectedDescription && query === selectedDescription) {
      setSignupPlaceSuggestions([]);
      setSignupPlaceStatus('idle');
      return undefined;
    }

    if (query.length < 2) {
      setSignupPlaceSuggestions([]);
      setSignupPlaceStatus('idle');
      return undefined;
    }

    const controller = new AbortController();
    const timer = setTimeout(() => {
      setSignupPlaceStatus('loading');
      searchCities(query, { signal: controller.signal })
        .then((cities) => {
          setSignupPlaceSuggestions(cities);
          setSignupPlaceStatus('idle');
        })
        .catch((error) => {
          if (error instanceof Error && error.name === 'AbortError') return;
          setSignupPlaceSuggestions([]);
          setSignupPlaceStatus('error');
        });
    }, 260);

    return () => {
      controller.abort();
      clearTimeout(timer);
    };
  }, [signupCity, signupCityQuery, step]);

  const handleEmailLogin = async () => {
    if (!email.trim() || !password) {
      onToast('Enter your email and password.', 'error');
      return;
    }

    setLoading(true);
    try {
      const payload = await loginWithEmail(email, password);
      await onAuthenticated(payload.token, payload.user);
      if (payload.accountDeletionCancelled) {
        onToast('Your account deletion request has been cancelled.', 'success');
      }
    } catch (error) {
      onToast(error instanceof Error ? error.message : 'Login failed.', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    setLoading(true);
    try {
      await GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true });
      const result = await GoogleSignin.signIn();
      const tokens = await GoogleSignin.getTokens();
      const accessToken = tokens.accessToken || ('serverAuthCode' in result ? String(result.serverAuthCode || '') : '');
      if (!accessToken) {
        throw new ApiError('Google sign-in did not return an access token.');
      }
      const payload = await loginWithGoogleAccessToken(accessToken);
      await onAuthenticated(payload.token, payload.user);
      if (payload.accountDeletionCancelled) {
        onToast('Your account deletion request has been cancelled.', 'success');
      }
    } catch (error) {
      const message =
        isErrorWithCode(error) &&
        (error.code === '10' ||
          error.code === 'DEVELOPER_ERROR' ||
          error.message.includes('DEVELOPER_ERROR'))
          ? googleSignInAndroidSetupMessage
          : error instanceof Error
            ? error.message
            : 'Google sign-in failed.';
      onToast(message, 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleEmailSignup = () => {
    goToAuthStep('signup');
  };

  const handleSelectSignupCity = (place: PlaceSuggestion) => {
    setSignupCity(place);
    setSignupCityQuery(place.description);
    setSignupPlaceSuggestions([]);
    setSignupPlaceStatus('idle');
    Keyboard.dismiss();
  };

  const handleStartEmailSignup = async () => {
    const name = signupName.trim();
    const nextEmail = signupEmail.trim().toLowerCase();
    const selectedCityName = (signupCity?.city || signupCity?.label || signupCity?.description.split(',')[0] || '').trim();

    if (!name || !nextEmail || !signupPassword) {
      onToast('Name, email and password are required.', 'error');
      return;
    }

    if (!signupCity || !selectedCityName) {
      onToast('Select your city from the suggestions.', 'error');
      return;
    }

    if (!signupAgeConfirmed) {
      onToast('Confirm that you are at least 18 years old.', 'error');
      return;
    }

    setLoading(true);
    try {
      const payload = await startEmailSignup({
        name,
        email: nextEmail,
        password: signupPassword,
        city: {
          city: selectedCityName,
          description: signupCity.description,
          placeId: signupCity.placeId,
        },
        ageConfirmed: true,
      });
      setSignupToken(payload.signupToken);
      setSignupVerificationEmail(payload.email);
      setSignupOtp('');
      goToAuthStep('signupVerify');
      onToast('Verification code sent to your email.', 'success');
    } catch (error) {
      onToast(error instanceof Error ? error.message : 'Signup failed.', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyEmailSignup = async () => {
    if (!signupToken || !signupOtp.trim()) {
      onToast('Enter the verification code.', 'error');
      return;
    }

    setLoading(true);
    try {
      const payload = await verifyEmailSignup(signupToken, signupOtp);
      await onAuthenticated(payload.token, payload.user);
    } catch (error) {
      onToast(error instanceof Error ? error.message : 'Verification failed.', 'error');
    } finally {
      setLoading(false);
    }
  };

  const openForgotPassword = () => {
    setResetEmail(email.trim().toLowerCase());
    setResetToken('');
    setResetOtp('');
    setResetPassword('');
    setResetConfirmPassword('');
    setResetCooldown(0);
    goToAuthStep('forgotEmail');
  };

  const handleStartPasswordReset = async () => {
    const nextEmail = resetEmail.trim().toLowerCase();
    if (!nextEmail) {
      onToast('Enter your email address.', 'error');
      return;
    }

    setLoading(true);
    try {
      const payload = await startPasswordReset(nextEmail);
      if (!payload.resetToken) {
        onToast(payload.message || 'If this email is associated with an account, reset instructions will be sent.', 'info');
        return;
      }

      setResetEmail(payload.email || nextEmail);
      setResetToken(payload.resetToken);
      setResetOtp('');
      setResetPassword('');
      setResetConfirmPassword('');
      setResetCooldown(payload.resendAfterSeconds || 30);
      goToAuthStep('forgotOtp');
      onToast('Password reset code sent to your email.', 'success');
    } catch (error) {
      onToast(error instanceof Error ? error.message : 'Could not send reset code.', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyPasswordReset = async () => {
    if (!resetToken || resetOtp.trim().length !== 6) {
      onToast('Enter the 6-digit reset code.', 'error');
      return;
    }

    setLoading(true);
    try {
      const payload = await verifyPasswordResetCode(resetToken, resetOtp);
      setResetToken(payload.resetToken || resetToken);
      setResetEmail(payload.email || resetEmail);
      goToAuthStep('forgotPassword');
      onToast('Code verified. Create a new password.', 'success');
    } catch (error) {
      onToast(error instanceof Error ? error.message : 'Could not verify reset code.', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleCompletePasswordReset = async () => {
    if (!resetPassword || !resetConfirmPassword) {
      onToast('Enter and confirm your new password.', 'error');
      return;
    }

    if (resetPassword.length < 10) {
      onToast('Password must be at least 10 characters.', 'error');
      return;
    }

    if (resetPassword !== resetConfirmPassword) {
      onToast('Passwords do not match.', 'error');
      return;
    }

    setLoading(true);
    try {
      const payload = await completePasswordReset(resetToken, resetPassword);
      setEmail(payload.email || resetEmail);
      setPassword('');
      setResetToken('');
      setResetOtp('');
      setResetPassword('');
      setResetConfirmPassword('');
      setResetCooldown(0);
      goToAuthStep('login', { replace: true });
      onToast('Password updated. Log in with your new password.', 'success');
    } catch (error) {
      onToast(error instanceof Error ? error.message : 'Could not update password.', 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
      <View
        style={[
          styles.authScreen,
          standalone ? styles.authStandaloneScreen : null,
          { paddingTop: insets.top + (standalone ? 0 : 18), paddingBottom: insets.bottom + 22 },
        ]}>
        <LightBackgroundDecor />
        {step !== 'entry' ? (
        onClose ? <Pressable style={[styles.authClose, { top: insets.top + 16 }]} onPress={onClose}>
          <X color={colors.ink} size={30} />
        </Pressable> : null
        ) : null}

        <Animated.View style={[styles.authKeyboardFrame, { transform: [{ translateY: keyboardTranslateY }] }]}>
        <ScreenTransition transitionKey={`auth-${step}`} style={styles.authStepTransition}>
        {step === 'entry' ? (
          <>
          <View pointerEvents="none" style={styles.authBottomShade} />
          <View pointerEvents="none" style={styles.authDoodleChat}>
            <MessageCircle color="rgba(255,92,61,0.25)" size={38} strokeWidth={1.8} />
          </View>
          <View pointerEvents="none" style={styles.authDoodleSparkle}>
            <Sparkles color="rgba(255,46,122,0.24)" size={42} strokeWidth={1.65} />
          </View>
          <View pointerEvents="none" style={styles.authDoodleMusic}>
            <AuthMusicDoodle />
          </View>
          <View pointerEvents="none" style={styles.authDoodleUser}>
            <User color="rgba(107,92,255,0.22)" size={42} strokeWidth={1.7} />
          </View>
          <View style={styles.authEntryContent}>
            <View style={styles.authLogoWrap}>
              <AuthBrandLogo />
            </View>

            <View style={styles.authHeroStage}>
              <View style={styles.authPurpleBlob} />
              <Image source={authPeopleHero} style={styles.authPeopleCluster} />
            </View>

            <Text style={styles.authEntryTitle}>The people platform.</Text>

            <View style={styles.authActionStack}>
              <Pressable style={styles.authSocialButton} onPress={handleGoogleLogin} disabled={loading}>
                {loading ? <ActivityIndicator color={colors.coral} /> : <GoogleIcon size={22} />}
                <Text style={styles.authSocialButtonText}>Continue with Google</Text>
              </Pressable>

              <View style={styles.authDividerRow}>
                <View style={styles.authDividerLine} />
                <Text style={styles.authDividerLabel}>or</Text>
                <View style={styles.authDividerLine} />
              </View>

              <Pressable style={styles.authEmailSignupButton} onPress={handleEmailSignup} disabled={loading}>
                <Text style={styles.authEmailSignupText}>Sign up with email</Text>
              </Pressable>
              <Pressable style={styles.authEmailLoginLink} onPress={() => goToAuthStep('login')} disabled={loading}>
                <Text style={styles.authEmailLoginText}>Log in with email</Text>
              </Pressable>
            </View>
          </View>
          </>
        ) : step === 'login' ? (
          <ScrollView
            style={styles.authEmailScroll}
            contentContainerStyle={styles.authEmailContent}
            keyboardShouldPersistTaps="handled">
            {showVisualBackButton && (
              <Pressable style={styles.authBackButton} onPress={goBackAuthStep}>
                <ArrowLeft color={colors.ink} size={24} />
                <Text style={styles.authBackText}>Back</Text>
              </Pressable>
            )}

            <View style={styles.authEmailLogo}>
              <BrandLogo size="medium" />
            </View>
            <Text style={styles.authEmailTitle}>Log in with email</Text>

            <Text style={styles.authLabel}>Email address</Text>
            <View style={styles.authInputShell}>
              <Mail color="#9a9aa3" size={20} />
              <TextInput
                value={email}
                onChangeText={setEmail}
                autoCapitalize="none"
                keyboardType="email-address"
                placeholder="you@example.com"
                placeholderTextColor="#777782"
                style={styles.authInput}
              />
            </View>

            <Text style={styles.authLabel}>Password</Text>
            <View style={styles.authInputShell}>
              <Lock color="#9a9aa3" size={20} />
              <TextInput
                value={password}
                onChangeText={setPassword}
                secureTextEntry={!showLoginPassword}
                placeholder="At least 10 characters"
                placeholderTextColor="#777782"
                style={styles.authInput}
              />
              <PasswordVisibilityButton
                visible={showLoginPassword}
                onPress={() => setShowLoginPassword((value) => !value)}
              />
            </View>

            <Pressable style={styles.authDarkPrimaryButton} onPress={handleEmailLogin} disabled={loading}>
              {loading ? <ActivityIndicator color={colors.surface} /> : <Text style={styles.authDarkPrimaryText}>Log in with email</Text>}
            </Pressable>

            <Pressable onPress={openForgotPassword}>
              <Text style={styles.authForgotLink}>Forgot password?</Text>
            </Pressable>

            <View style={styles.authDividerRow}>
              <View style={styles.authDividerLine} />
              <Text style={styles.authDividerLabel}>or</Text>
              <View style={styles.authDividerLine} />
            </View>

            <Pressable style={styles.authSocialButton} onPress={handleGoogleLogin} disabled={loading}>
              <GoogleIcon size={22} />
              <Text style={styles.authSocialButtonText}>Continue with Google</Text>
            </Pressable>

            <AuthFooterAction label="New here?" actionLabel="Sign up" onPress={handleEmailSignup} />

          </ScrollView>
        ) : step === 'signup' ? (
          <ScrollView
            style={styles.authEmailScroll}
            contentContainerStyle={[styles.authEmailContent, styles.authSignupContent]}
            keyboardShouldPersistTaps="handled">
            {showVisualBackButton && (
              <Pressable style={styles.authBackButton} onPress={goBackAuthStep}>
                <ArrowLeft color={colors.ink} size={24} />
                <Text style={styles.authBackText}>Back</Text>
              </Pressable>
            )}

            <View style={styles.authEmailLogo}>
              <BrandLogo size="medium" />
            </View>
            <Text style={styles.authEmailTitle}>Sign up with email</Text>
            <Text style={styles.authHelperText}>Create your JambIt account and find your circle.</Text>

            <Text style={styles.authLabel}>Full name</Text>
            <View style={styles.authInputShell}>
              <User color="#9a9aa3" size={20} />
              <TextInput
                value={signupName}
                onChangeText={setSignupName}
                autoCapitalize="words"
                placeholder="Utkarsh Tushar"
                placeholderTextColor="#777782"
                style={styles.authInput}
              />
            </View>

            <Text style={styles.authLabel}>Email address</Text>
            <View style={styles.authInputShell}>
              <Mail color="#9a9aa3" size={20} />
              <TextInput
                value={signupEmail}
                onChangeText={setSignupEmail}
                autoCapitalize="none"
                keyboardType="email-address"
                placeholder="you@example.com"
                placeholderTextColor="#777782"
                style={styles.authInput}
              />
            </View>

            <Text style={styles.authLabel}>City</Text>
            <View style={styles.authInputShell}>
              <MapPin color="#9a9aa3" size={20} />
              <TextInput
                value={signupCityQuery}
                onChangeText={(value) => {
                  setSignupCityQuery(value);
                  setSignupCity(null);
                }}
                placeholder="Search your city"
                placeholderTextColor="#777782"
                style={styles.authInput}
              />
            </View>

            <View style={styles.authSuggestionPanel}>
              {signupPlaceStatus === 'loading' ? (
                <View style={styles.authSuggestionState}>
                  <ActivityIndicator color={colors.coral} />
                  <Text style={styles.authSuggestionStateText}>Finding cities...</Text>
                </View>
              ) : signupPlaceSuggestions.length ? (
                signupPlaceSuggestions.slice(0, 5).map((place) => (
                  <Pressable
                    key={place.placeId || place.description}
                    style={styles.authSuggestionRow}
                    onPress={() => handleSelectSignupCity(place)}>
                    <MapPin color={colors.coral} size={19} strokeWidth={2.6} />
                    <View style={styles.authSuggestionCopy}>
                      <Text numberOfLines={1} style={styles.authSuggestionTitle}>
                        {place.label || place.city || place.description}
                      </Text>
                      <Text numberOfLines={2} style={styles.authSuggestionDetail}>
                        {place.description}
                      </Text>
                    </View>
                    <ChevronRight color={colors.muted} size={18} strokeWidth={2.6} />
                  </Pressable>
                ))
              ) : signupCity ? (
                <View style={styles.authSuggestionState}>
                  <Check color={colors.green} size={18} strokeWidth={3} />
                  <Text style={styles.authSuggestionStateText}>Selected from city recommendations.</Text>
                </View>
              ) : signupCityQuery.trim().length >= 2 ? (
                <View style={styles.authSuggestionState}>
                  <MapPin color={colors.coral} size={18} strokeWidth={2.6} />
                  <Text style={styles.authSuggestionStateText}>
                    {signupPlaceStatus === 'error' ? 'Could not load cities.' : 'Select a city from recommendations.'}
                  </Text>
                </View>
              ) : null}
            </View>

            <Text style={styles.authLabel}>Password</Text>
            <View style={styles.authInputShell}>
              <Lock color="#9a9aa3" size={20} />
              <TextInput
                value={signupPassword}
                onChangeText={setSignupPassword}
                secureTextEntry={!showSignupPassword}
                placeholder="At least 10 characters"
                placeholderTextColor="#777782"
                style={styles.authInput}
              />
              <PasswordVisibilityButton
                visible={showSignupPassword}
                onPress={() => setShowSignupPassword((value) => !value)}
              />
            </View>

            <Pressable style={styles.authCheckboxRow} onPress={() => setSignupAgeConfirmed((value) => !value)}>
              <View style={[styles.authCheckbox, signupAgeConfirmed && styles.authCheckboxActive]}>
                {signupAgeConfirmed && <Check color={colors.surface} size={16} strokeWidth={3} />}
              </View>
              <Text style={styles.authCheckboxText}>I am at least 18 years old.</Text>
            </Pressable>

            <Pressable style={styles.authDarkPrimaryButton} onPress={handleStartEmailSignup} disabled={loading}>
              {loading ? <ActivityIndicator color={colors.surface} /> : <Text style={styles.authDarkPrimaryText}>Send verification code</Text>}
            </Pressable>

            <AuthFooterAction label="Already joined?" actionLabel="Log in" onPress={() => goToAuthStep('login')} />
          </ScrollView>
        ) : step === 'signupVerify' ? (
          <ScrollView
            style={styles.authEmailScroll}
            contentContainerStyle={[styles.authEmailContent, styles.authSignupContent]}
            keyboardShouldPersistTaps="handled">
            {showVisualBackButton && (
              <Pressable style={styles.authBackButton} onPress={goBackAuthStep}>
                <ArrowLeft color={colors.ink} size={24} />
                <Text style={styles.authBackText}>Back</Text>
              </Pressable>
            )}

            <View style={styles.authEmailLogo}>
              <BrandLogo size="medium" />
            </View>
            <Text style={styles.authEmailTitle}>Verify your email</Text>
            <Text style={styles.authHelperText}>Enter the 6-digit code sent to {signupVerificationEmail || signupEmail}.</Text>

            <Text style={styles.authLabel}>Verification code</Text>
            <View style={styles.authInputShell}>
              <Mail color="#9a9aa3" size={20} />
              <TextInput
                value={signupOtp}
                onChangeText={(value) => setSignupOtp(value.replace(/\D/g, '').slice(0, 6))}
                keyboardType="number-pad"
                placeholder="123456"
                placeholderTextColor="#777782"
                style={[styles.authInput, styles.authOtpInput]}
              />
            </View>

            <Pressable style={styles.authDarkPrimaryButton} onPress={handleVerifyEmailSignup} disabled={loading}>
              {loading ? <ActivityIndicator color={colors.surface} /> : <Text style={styles.authDarkPrimaryText}>Create account</Text>}
            </Pressable>

            <AuthFooterAction label="Need a different email?" actionLabel="Edit signup" onPress={goBackAuthStep} />
          </ScrollView>
        ) : step === 'forgotEmail' ? (
          <ScrollView
            style={styles.authEmailScroll}
            contentContainerStyle={[styles.authEmailContent, styles.authSignupContent]}
            keyboardShouldPersistTaps="handled">
            {showVisualBackButton && (
              <Pressable style={styles.authBackButton} onPress={goBackAuthStep}>
                <ArrowLeft color={colors.ink} size={24} />
                <Text style={styles.authBackText}>Back</Text>
              </Pressable>
            )}

            <View style={styles.authEmailLogo}>
              <BrandLogo size="medium" />
            </View>
            <Text style={styles.authEmailTitle}>Reset password</Text>
            <Text style={styles.authHelperText}>Enter your email and we will send a 6-digit reset code.</Text>

            <Text style={styles.authLabel}>Email address</Text>
            <View style={styles.authInputShell}>
              <Mail color="#9a9aa3" size={20} />
              <TextInput
                value={resetEmail}
                onChangeText={setResetEmail}
                autoCapitalize="none"
                keyboardType="email-address"
                placeholder="you@example.com"
                placeholderTextColor="#777782"
                style={styles.authInput}
              />
            </View>

            <Pressable style={styles.authDarkPrimaryButton} onPress={handleStartPasswordReset} disabled={loading}>
              {loading ? <ActivityIndicator color={colors.surface} /> : <Text style={styles.authDarkPrimaryText}>Send reset code</Text>}
            </Pressable>

            <AuthFooterAction label="Remembered it?" actionLabel="Log in" onPress={() => goToAuthStep('login')} />
          </ScrollView>
        ) : step === 'forgotOtp' ? (
          <ScrollView
            style={styles.authEmailScroll}
            contentContainerStyle={[styles.authEmailContent, styles.authSignupContent]}
            keyboardShouldPersistTaps="handled">
            {showVisualBackButton && (
              <Pressable style={styles.authBackButton} onPress={goBackAuthStep}>
                <ArrowLeft color={colors.ink} size={24} />
                <Text style={styles.authBackText}>Back</Text>
              </Pressable>
            )}

            <View style={styles.authEmailLogo}>
              <BrandLogo size="medium" />
            </View>
            <Text style={styles.authEmailTitle}>Enter reset code</Text>
            <Text style={styles.authHelperText}>Enter the 6-digit code sent to {resetEmail}. It expires in 10 minutes.</Text>

            <Text style={styles.authLabel}>Reset code</Text>
            <View style={styles.authInputShell}>
              <Mail color="#9a9aa3" size={20} />
              <TextInput
                value={resetOtp}
                onChangeText={(value) => setResetOtp(value.replace(/\D/g, '').slice(0, 6))}
                keyboardType="number-pad"
                placeholder="123456"
                placeholderTextColor="#777782"
                style={[styles.authInput, styles.authOtpInput]}
              />
            </View>

            <Pressable style={styles.authDarkPrimaryButton} onPress={handleVerifyPasswordReset} disabled={loading}>
              {loading ? <ActivityIndicator color={colors.surface} /> : <Text style={styles.authDarkPrimaryText}>Verify code</Text>}
            </Pressable>

            <AuthFooterAction
              label={resetCooldown > 0 ? `Resend in ${resetCooldown}s` : 'Did not get it?'}
              actionLabel="Resend"
              onPress={handleStartPasswordReset}
              disabled={loading || resetCooldown > 0}
            />
          </ScrollView>
        ) : (
          <ScrollView
            style={styles.authEmailScroll}
            contentContainerStyle={[styles.authEmailContent, styles.authSignupContent]}
            keyboardShouldPersistTaps="handled">
            {showVisualBackButton && (
              <Pressable style={styles.authBackButton} onPress={goBackAuthStep}>
                <ArrowLeft color={colors.ink} size={24} />
                <Text style={styles.authBackText}>Back</Text>
              </Pressable>
            )}

            <View style={styles.authEmailLogo}>
              <BrandLogo size="medium" />
            </View>
            <Text style={styles.authEmailTitle}>New password</Text>
            <Text style={styles.authHelperText}>Create a new password for {resetEmail}.</Text>

            <Text style={styles.authLabel}>New password</Text>
            <View style={styles.authInputShell}>
              <Lock color="#9a9aa3" size={20} />
              <TextInput
                value={resetPassword}
                onChangeText={setResetPassword}
                secureTextEntry={!showResetPassword}
                placeholder="At least 10 characters"
                placeholderTextColor="#777782"
                style={styles.authInput}
              />
              <PasswordVisibilityButton
                visible={showResetPassword}
                onPress={() => setShowResetPassword((value) => !value)}
              />
            </View>

            <Text style={styles.authLabel}>Confirm password</Text>
            <View style={styles.authInputShell}>
              <Lock color="#9a9aa3" size={20} />
              <TextInput
                value={resetConfirmPassword}
                onChangeText={setResetConfirmPassword}
                secureTextEntry={!showResetConfirmPassword}
                placeholder="Repeat new password"
                placeholderTextColor="#777782"
                style={styles.authInput}
              />
              <PasswordVisibilityButton
                visible={showResetConfirmPassword}
                onPress={() => setShowResetConfirmPassword((value) => !value)}
              />
            </View>

            <Pressable style={styles.authDarkPrimaryButton} onPress={handleCompletePasswordReset} disabled={loading}>
              {loading ? <ActivityIndicator color={colors.surface} /> : <Text style={styles.authDarkPrimaryText}>Update password</Text>}
            </Pressable>
          </ScrollView>
        )}
        </ScreenTransition>
        </Animated.View>
      </View>
  );
}

function GoogleIcon({ size = 22 }: { size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 48 48">
      <Path
        fill="#FFC107"
        d="M43.611 20.083H42V20H24v8h11.303c-1.649 4.657-6.08 8-11.303 8-7.18 0-13-5.82-13-13S16.82 10 24 10c3.311 0 6.329 1.235 8.623 3.266l5.657-5.657C34.705 4.275 29.895 2 24 2 12.954 2 4 10.954 4 22s8.954 20 20 20 20-8.954 20-20c0-1.341-.138-2.65-.389-3.917z"
      />
      <Path
        fill="#FF3D00"
        d="m6.306 12.691 6.571 4.819C14.655 13.108 18.961 10 24 10c3.311 0 6.329 1.235 8.623 3.266l5.657-5.657C34.705 4.275 29.895 2 24 2 16.318 2 9.656 6.337 6.306 12.691z"
      />
      <Path
        fill="#4CAF50"
        d="M24 42c5.791 0 10.522-1.93 14.069-5.235l-6.175-5.225C29.823 33.114 27.125 34 24 34c-5.202 0-9.619-3.317-11.283-7.946l-6.522 5.025C9.505 37.556 16.227 42 24 42z"
      />
      <Path
        fill="#1976D2"
        d="M43.611 20.083H42V20H24v8h11.303a12.042 12.042 0 0 1-4.103 5.557l.003-.002 6.175 5.225C36.94 39.178 44 34 44 22c0-1.341-.138-2.65-.389-3.917z"
      />
    </Svg>
  );
}

function EventDetailScreen({
  event,
  events,
  categories,
  currentUser,
  sessionToken,
  isWishlisted,
  onBack,
  onOpenEvent,
  onShare,
  onToggleWishlist,
  onOpenAttendees,
  onOpenUser,
  onEventUpdated,
  onToast,
}: {
  event: JambitEvent;
  events: JambitEvent[];
  categories: InterestCategory[];
  currentUser: JambitUser;
  sessionToken: string;
  isWishlisted: boolean;
  onBack: () => void;
  onOpenEvent: (event: JambitEvent) => void;
  onShare: () => void;
  onToggleWishlist: () => void;
  onOpenAttendees: () => void;
  onOpenUser: (userId: string) => void;
  onEventUpdated: (event: JambitEvent) => void;
  onToast: (message: string, tone?: ToastState['tone']) => void;
}) {
  const insets = useSafeAreaInsets();
  const attendees = Math.max(0, Number(event.attendees || 0));
  const currentKey = eventKey(event);
  const eventId = String(event.id || event._id || '');
  const [comments, setComments] = useState<JambitEventComment[]>([]);
  const [commentBody, setCommentBody] = useState('');
  const [commentsLoading, setCommentsLoading] = useState(false);
  const [commentsError, setCommentsError] = useState('');
  const [commentSubmitting, setCommentSubmitting] = useState(false);
  const [replyingTo, setReplyingTo] = useState<JambitEventComment | null>(null);
  const [isGoing, setIsGoing] = useState(Boolean(event.isGoing));
  const [paymentSheetOpen, setPaymentSheetOpen] = useState(false);
  const [paymentPhone, setPaymentPhone] = useState('');
  const [paymentBusy, setPaymentBusy] = useState(false);
  const [iosPaidBookingEnabled, setIosPaidBookingEnabled] = useState<boolean | null>(
    Platform.OS === 'ios' ? null : true,
  );
  const [attendanceBusy, setAttendanceBusy] = useState(false);
  const remainingSpots = Math.max(0, Number(event.remainingSpots ?? Math.max(0, Number(event.capacity || 0) - attendees)));
  const isHost = event.canAttend === false;
  const isPaid = Boolean(event.isPaid || Number(event.ticketAmount || 0) > 0);
  const isSoldOut = remainingSpots <= 0 && !isGoing;
  const hasStarted = Boolean(event.startAt && new Date(event.startAt).getTime() <= Date.now());
  const paidBookingUnavailable = isPaid && Platform.OS === 'ios' && iosPaidBookingEnabled === false;
  const eventDescription =
    event.description ||
    `${event.title} brings people together through useful conversations, practical moments, and a friendly JambIt community experience. Come ready to meet new people, ask questions, and build your circle.`;
  const upcomingEvents = useMemo(
    () =>
      events
        .filter((item) => eventKey(item) !== currentKey)
        .filter((item, index, source) => source.findIndex((candidate) => eventKey(candidate) === eventKey(item)) === index)
        .slice(0, 4),
    [currentKey, events],
  );
  const similarEvents = useMemo(() => {
    const currentType = (event.type || '').toLowerCase();
    const currentLocation = eventLocationLabel(event).toLowerCase();
    const source = events.filter((item) => eventKey(item) !== currentKey);
    const similar = source.filter((item) => {
      const itemType = (item.type || '').toLowerCase();
      const itemLocation = eventLocationLabel(item).toLowerCase();
      return (currentType && itemType === currentType) || (currentLocation && itemLocation.includes(currentLocation.split(',')[0]));
    });
    const combined = similar.length ? similar : source;
    return combined
      .filter((item, index, list) => list.findIndex((candidate) => eventKey(candidate) === eventKey(item)) === index)
      .slice(0, 4);
  }, [currentKey, event, events]);
  const relatedTopics = useMemo(() => {
    const dynamic = categories.flatMap((category) => [category.name, ...(category.interests || []), ...(category.options || [])]);
    const fallback = [
      event.type || 'Events',
      event.groupName || 'Community',
      eventLocationLabel(event) || 'Local event',
      'Meet new people',
      'Networking',
    ];
    const seen = new Set<string>();
    return [...fallback, ...dynamic]
      .map((topic) => interestLabel(topic))
      .filter((topic) => {
        if (!topic || seen.has(topic.toLowerCase())) return false;
        seen.add(topic.toLowerCase());
        return true;
      })
      .slice(0, 8);
  }, [categories, event]);

  const commentTree = useMemo(() => buildEventCommentTree(comments), [comments]);

  useEffect(() => {
    if (Platform.OS !== 'ios' || !isPaid) {
      setIosPaidBookingEnabled(true);
      return undefined;
    }

    let active = true;
    setIosPaidBookingEnabled(null);
    getPaymentConfiguration('ios')
      .then(({ payment }) => {
        if (active) setIosPaidBookingEnabled(payment.paidBookingEnabled);
      })
      .catch(() => {
        if (active) setIosPaidBookingEnabled(null);
      });
    return () => {
      active = false;
    };
  }, [eventId, isPaid]);

  const loadComments = useCallback(async () => {
    setComments([]);
    setCommentsError('');

    if (!eventId) return;

    setCommentsLoading(true);
    try {
      const payload = await getEventComments(eventId, sessionToken);
      setComments(payload.comments || []);
    } catch (error) {
      setCommentsError(error instanceof Error ? error.message : 'Comments could not be loaded.');
    } finally {
      setCommentsLoading(false);
    }
  }, [eventId, sessionToken]);

  useEffect(() => {
    setIsGoing(Boolean(event.isGoing));
    setCommentBody('');
    setReplyingTo(null);
    loadComments().catch(() => undefined);
  }, [event.isGoing, loadComments]);

  const applyPaymentEventSummary = useCallback((summary?: { id: string; attendees: number; remainingSpots: number }) => {
    if (!summary) return;
    onEventUpdated({
      ...event,
      isGoing: true,
      attendees: summary.attendees,
      remainingSpots: summary.remainingSpots,
    });
  }, [event, onEventUpdated]);

  const startPaidCheckout = async () => {
    const phone = paymentPhone.replace(/\D/g, '').replace(/^91(?=\d{10}$)/, '');
    if (!/^[6-9]\d{9}$/.test(phone)) {
      onToast('Enter a valid 10-digit Indian mobile number.', 'error');
      return;
    }
    if (!eventId || paymentBusy) return;

    setPaymentBusy(true);
    try {
      const paymentPlatform = Platform.OS === 'ios' ? 'ios' : 'android';
      const payload = await createEventPaymentOrder(sessionToken, eventId, phone, paymentPlatform);
      const payment = payload.payment;
      if (!payment.keyId || !payment.providerOrderId) {
        throw new Error(Platform.OS === 'ios' ? 'Secure checkout could not be started.' : 'Razorpay did not create a checkout order.');
      }

      setPaymentSheetOpen(false);
      const checkoutResult = await RazorpayCheckout.open({
        key: payment.keyId,
        amount: payment.amountSubunits,
        currency: payment.currency,
        name: 'JambIt',
        description: `Ticket for ${payment.event?.title || event.title}, hosted by ${payment.event?.hostName || event.groupName || 'the event host'}`,
        order_id: payment.providerOrderId,
        prefill: {
          name: payment.customer?.name || currentUser.name,
          email: payment.customer?.email || currentUser.email,
          contact: `+91${payment.customer?.phone || phone}`,
        },
        theme: { color: colors.brand },
        retry: { enabled: true, max_count: 4 },
      });
      const verified = await verifyEventPaymentOrder(sessionToken, payment.orderId, {
        razorpayPaymentId: checkoutResult.razorpay_payment_id,
        razorpayOrderId: checkoutResult.razorpay_order_id,
        razorpaySignature: checkoutResult.razorpay_signature,
      });
      if (!verified.payment.booked || verified.payment.status !== 'paid') {
        throw new Error(verified.payment.failureReason || 'Payment has not been confirmed yet.');
      }

      setIsGoing(true);
      applyPaymentEventSummary(verified.payment.event as { id: string; attendees: number; remainingSpots: number });
      onToast('Payment confirmed. Your ticket is booked.', 'success');
    } catch (error) {
      const checkoutError = error as { description?: string; reason?: string };
      onToast(
        error instanceof Error
          ? error.message
          : checkoutError?.description || checkoutError?.reason || 'The payment was not completed.',
        'error',
      );
    } finally {
      setPaymentBusy(false);
    }
  };

  const attendFreeEvent = async () => {
    if (!eventId || attendanceBusy) return;
    setAttendanceBusy(true);
    try {
      const payload = await updateEventRsvp(sessionToken, eventId, 'going');
      setIsGoing(true);
      onEventUpdated(payload.event);
      onToast('You are going to this event.', 'success');
    } catch (error) {
      onToast(error instanceof Error ? error.message : 'Your attendance could not be updated.', 'error');
    } finally {
      setAttendanceBusy(false);
    }
  };

  const attendButtonLabel = isHost
    ? "You're hosting"
    : isGoing
      ? "You're going"
      : hasStarted
        ? 'Event started'
        : isSoldOut
          ? 'Sold out'
          : isPaid
            ? paidBookingUnavailable
              ? 'Paid booking unavailable'
              : `Pay INR ${Number(event.ticketAmount || 0).toLocaleString('en-IN')}`
            : 'Attend';

  const attendDisabled = isHost || isGoing || hasStarted || isSoldOut || paidBookingUnavailable || paymentBusy || attendanceBusy;

  const submitComment = async () => {
    const body = commentBody.trim();
    if (!body || !eventId || commentSubmitting) return;

    setCommentSubmitting(true);
    try {
      const payload = await createEventComment(sessionToken, eventId, {
        body,
        ...(replyingTo?.id ? { parentId: replyingTo.id } : {}),
      });
      setComments((current) => [...current, payload.comment]);
      setCommentBody('');
      setReplyingTo(null);
      Keyboard.dismiss();
    } catch (error) {
      onToast(error instanceof Error ? error.message : 'Comment could not be posted.', 'error');
    } finally {
      setCommentSubmitting(false);
    }
  };

  return (
    <View style={styles.eventDetailScreen}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.eventDetailContent}>
        <ImageBackground
          source={{ uri: event.image || eventHero }}
          style={styles.eventDetailHeroImage}
          imageStyle={styles.eventDetailHeroRadius}>
          <View style={styles.eventDetailTopActions}>
            {showVisualBackButton && (
              <Pressable style={styles.eventDetailRoundButton} onPress={onBack}>
                <ArrowLeft color={colors.ink} size={21} strokeWidth={2.8} />
              </Pressable>
            )}
            <View style={styles.eventDetailActionCluster}>
              <Pressable style={styles.eventDetailRoundButton} onPress={onShare}>
                <Share2 color={colors.ink} size={19} strokeWidth={2.7} />
              </Pressable>
              <Pressable
                style={[styles.eventDetailRoundButton, isWishlisted && styles.eventDetailRoundButtonActive]}
                onPress={onToggleWishlist}>
                <Heart
                  color={isWishlisted ? colors.surface : colors.brand}
                  fill={isWishlisted ? colors.surface : 'transparent'}
                  size={20}
                  strokeWidth={2.7}
                />
              </Pressable>
            </View>
          </View>
          <View style={styles.eventDetailHeroMeta}>
            <View style={styles.eventDetailHeroMetaRow}>
              <CalendarDays color={colors.surface} size={16} strokeWidth={2.6} />
              <Text numberOfLines={1} style={styles.eventDetailHeroMetaText}>{formatEventDate(event.startAt)}</Text>
            </View>
            <View style={styles.eventDetailHeroMetaRow}>
              <MapPin color={colors.surface} size={16} strokeWidth={2.6} />
              <Text numberOfLines={1} style={styles.eventDetailHeroMetaText}>
                {eventVenueLabel(event) || event.groupName || 'Local event'}
              </Text>
            </View>
          </View>
        </ImageBackground>

        <View style={styles.eventDetailBodyScreen}>
          <Text style={styles.eventDetailTitle}>{event.title || 'JambIt event'}</Text>

          <Text style={styles.eventDetailDescription}>{eventDescription}</Text>

          <View style={styles.eventDetailSection}>
            <View style={styles.eventDetailSectionHeader}>
              <Text style={styles.eventDetailSectionTitle}>Learn more about attendees</Text>
              {attendees > 0 && eventId ? (
                <Pressable accessibilityRole="button" hitSlop={8} onPress={onOpenAttendees}>
                  <Text style={styles.eventDetailSectionAction}>See all</Text>
                </Pressable>
              ) : null}
            </View>
            <View style={styles.attendeeInsightCard}>
              {attendees > 0 && (event.attendeeProfiles || []).length ? (
                <View style={styles.attendeeAvatarStackLarge}>
                  {(event.attendeeProfiles || []).slice(0, 3).map((profile, index) => (
                    <Pressable
                      accessibilityRole="button"
                      accessibilityLabel={`Open ${profile.name || 'attendee'}'s profile`}
                      disabled={!profile.id}
                      key={profile.id || `${profile.name}-${index}`}
                      style={[styles.attendeeAvatarLarge, index > 0 && styles.attendeeAvatarLargeOverlap]}
                      onPress={() => profile.id && onOpenUser(profile.id)}>
                      {profile.image ? (
                        <Image source={{ uri: profile.image }} style={styles.attendeeAvatarImageLarge} />
                      ) : (
                        <Text style={styles.attendeeAvatarText}>{initials(profile.name || 'JambIt member')}</Text>
                      )}
                    </Pressable>
                  ))}
                </View>
              ) : null}
              <View style={styles.attendeeInsightCopy}>
                <Text style={styles.attendeeInsightTitle}>{formatMemberCount(attendees)} people are going</Text>
                <Text style={styles.attendeeInsightText}>See shared interests, first-timers, and people from this community.</Text>
              </View>
            </View>
          </View>

          <View style={styles.eventDetailSection}>
            <Text style={styles.eventDetailSectionTitle}>
              Comments{comments.length ? ` (${comments.length})` : ''}
            </Text>
            {replyingTo && (
              <View style={styles.commentReplyingRow}>
                <Text numberOfLines={1} style={styles.commentReplyingText}>
                  Replying to {replyingTo.author.name}
                </Text>
                <Pressable hitSlop={8} onPress={() => setReplyingTo(null)}>
                  <Text style={styles.commentReplyingCancel}>Cancel</Text>
                </Pressable>
              </View>
            )}
            <View style={styles.commentInputRow}>
              <Avatar user={currentUser} size={38} />
              <TextInput
                value={commentBody}
                onChangeText={setCommentBody}
                placeholder={replyingTo ? `Reply to ${replyingTo.author.name}...` : 'Start a comment...'}
                placeholderTextColor="#8e8782"
                style={styles.commentInput}
                maxLength={2000}
                returnKeyType="send"
                onSubmitEditing={submitComment}
              />
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Post comment"
                disabled={!commentBody.trim() || commentSubmitting}
                style={[
                  styles.commentSendButton,
                  (!commentBody.trim() || commentSubmitting) && styles.commentSendButtonDisabled,
                ]}
                onPress={submitComment}>
                {commentSubmitting ? (
                  <ActivityIndicator color={colors.surface} size="small" />
                ) : (
                  <Send color={colors.surface} size={16} strokeWidth={2.8} />
                )}
              </Pressable>
            </View>
            {commentsLoading ? (
              <View style={styles.commentStatusRow}>
                <ActivityIndicator color={colors.brand} />
                <Text style={styles.commentStatusText}>Loading comments...</Text>
              </View>
            ) : commentsError ? (
              <Pressable style={styles.commentStatusRow} onPress={loadComments}>
                <Text style={styles.commentErrorText}>{commentsError} Tap to retry.</Text>
              </Pressable>
            ) : commentTree.length ? (
              commentTree.map((comment) => (
                <EventComment
                  key={comment.id}
                  comment={comment}
                  onOpenUser={onOpenUser}
                  onReply={setReplyingTo}
                />
              ))
            ) : (
              <View style={styles.commentEmptyState}>
                <MessageCircle color={colors.purple} size={22} strokeWidth={2.5} />
                <Text style={styles.commentEmptyTitle}>No comments yet</Text>
                <Text style={styles.commentEmptyText}>Start the conversation for this event.</Text>
              </View>
            )}
          </View>

          <EventHorizontalSection title="Upcoming events" events={upcomingEvents} onOpenEvent={onOpenEvent} />
          <EventHorizontalSection title="Similar events near you" events={similarEvents} onOpenEvent={onOpenEvent} />

          <View style={styles.eventDetailSection}>
            <Text style={styles.eventDetailSectionTitle}>Related topics</Text>
            <View style={styles.eventTopicWrap}>
              {relatedTopics.map((topic) => (
                <Chip key={topic} label={topic} />
              ))}
            </View>
          </View>

          <Pressable style={styles.reportEventRow}>
            <Flag color={colors.muted} size={20} strokeWidth={2.5} />
            <Text style={styles.reportEventText}>Report event</Text>
            <ChevronRight color={colors.muted} size={18} strokeWidth={2.6} />
          </Pressable>
        </View>
      </ScrollView>

      <View style={[styles.eventAttendBar, { paddingBottom: Math.max(insets.bottom, spacing.md) }]}>
        <View style={styles.eventAttendSummary}>
          <Text style={styles.eventAttendPrice}>{isPaid ? `INR ${Number(event.ticketAmount || 0).toLocaleString('en-IN')}` : 'Free'}</Text>
          <Text style={styles.eventAttendSpots}>{remainingSpots} {remainingSpots === 1 ? 'spot' : 'spots'} left</Text>
        </View>
        <Pressable
          accessibilityRole="button"
          disabled={attendDisabled}
          style={[styles.eventAttendButton, attendDisabled && styles.eventAttendButtonDisabled]}
          onPress={() => {
            if (isPaid) setPaymentSheetOpen(true);
            else attendFreeEvent().catch(() => undefined);
          }}>
          {paymentBusy || attendanceBusy ? (
            <ActivityIndicator color={colors.surface} size="small" />
          ) : (
            <Text style={styles.eventAttendButtonText}>{attendButtonLabel}</Text>
          )}
        </Pressable>
      </View>

      <Modal
        animationType="slide"
        transparent
        visible={paymentSheetOpen}
        onRequestClose={() => !paymentBusy && setPaymentSheetOpen(false)}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={styles.paymentSheetOverlay}>
          <Pressable style={StyleSheet.absoluteFill} onPress={() => !paymentBusy && setPaymentSheetOpen(false)} />
          <View style={[styles.paymentSheet, { paddingBottom: Math.max(insets.bottom, spacing.xl) }]}>
            <View style={styles.paymentSheetHandle} />
            <View style={styles.paymentSheetHeader}>
              <View style={styles.paymentSheetIcon}>
                <CreditCard color={colors.brand} size={22} strokeWidth={2.6} />
              </View>
              <View style={styles.flex1}>
                <Text style={styles.paymentSheetTitle}>Book your ticket</Text>
                <Text style={styles.paymentSheetAmount}>INR {Number(event.ticketAmount || 0).toLocaleString('en-IN')}</Text>
              </View>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Close payment"
                disabled={paymentBusy}
                style={styles.paymentSheetClose}
                onPress={() => setPaymentSheetOpen(false)}>
                <X color={colors.ink} size={20} strokeWidth={2.5} />
              </Pressable>
            </View>
            <Text style={styles.paymentSheetLabel}>Mobile number</Text>
            <View style={styles.paymentPhoneField}>
              <Text style={styles.paymentPhonePrefix}>+91</Text>
              <TextInput
                autoFocus
                keyboardType="phone-pad"
                maxLength={10}
                placeholder="10-digit mobile number"
                placeholderTextColor={colors.muted}
                style={styles.paymentPhoneInput}
                value={paymentPhone}
                onChangeText={(value) => setPaymentPhone(value.replace(/\D/g, '').slice(0, 10))}
              />
            </View>
            <Text style={styles.paymentSheetNote}>{Platform.OS === 'ios' ? 'Secure checkout will open.' : 'Razorpay will open secure checkout.'} This event is delivered by {event.groupName || 'the event host'}, and JambIt never receives your card or UPI credentials.</Text>
            <Pressable
              accessibilityRole="button"
              disabled={paymentBusy}
              style={[styles.paymentContinueButton, paymentBusy && styles.eventAttendButtonDisabled]}
              onPress={() => startPaidCheckout().catch(() => undefined)}>
              {paymentBusy ? (
                <ActivityIndicator color={colors.surface} size="small" />
              ) : (
                <Text style={styles.paymentContinueText}>Continue to payment</Text>
              )}
            </Pressable>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}

function EventAttendeesScreen({
  eventId,
  eventTitle,
  initialCount,
  sessionToken,
  onBack,
  onOpenUser,
}: {
  eventId: string;
  eventTitle: string;
  initialCount: number;
  sessionToken: string;
  onBack: () => void;
  onOpenUser: (userId: string) => void;
}) {
  const insets = useSafeAreaInsets();
  const [attendees, setAttendees] = useState<JambitEventAttendee[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const loadAttendees = useCallback(async () => {
    if (!eventId || !sessionToken) {
      setError('Attendees could not be loaded.');
      setLoading(false);
      return;
    }

    setLoading(true);
    setError('');
    try {
      const payload = await getEventAttendees(eventId, sessionToken);
      setAttendees(payload.attendees || []);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'Attendees could not be loaded.');
    } finally {
      setLoading(false);
    }
  }, [eventId, sessionToken]);

  useEffect(() => {
    loadAttendees().catch(() => undefined);
  }, [loadAttendees]);

  return (
    <View style={[styles.eventAttendeesScreen, { paddingTop: Math.max(insets.top, spacing.md) }]}>
      <View style={styles.eventAttendeesHeader}>
        {showVisualBackButton ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Back"
            style={styles.eventAttendeesBackButton}
            onPress={onBack}>
            <ArrowLeft color={colors.ink} size={21} strokeWidth={2.7} />
          </Pressable>
        ) : <View style={styles.eventAttendeesHeaderSpacer} />}
        <View style={styles.eventAttendeesHeaderCopy}>
          <Text style={styles.eventAttendeesKicker}>EVENT ATTENDEES</Text>
          <Text style={styles.eventAttendeesTitle}>People going</Text>
        </View>
        <View style={styles.eventAttendeesCountBadge}>
          <Text style={styles.eventAttendeesCountText}>{loading ? initialCount : attendees.length}</Text>
        </View>
      </View>

      <Text numberOfLines={2} style={styles.eventAttendeesEventTitle}>{eventTitle}</Text>

      {loading ? (
        <View style={styles.eventAttendeesStatus}>
          <ActivityIndicator color={colors.coral} size="small" />
          <Text style={styles.eventAttendeesStatusText}>Loading attendees...</Text>
        </View>
      ) : error ? (
        <Pressable style={styles.eventAttendeesStatus} onPress={() => loadAttendees().catch(() => undefined)}>
          <Text style={styles.eventAttendeesErrorText}>{error}</Text>
          <Text style={styles.eventAttendeesRetryText}>Tap to retry</Text>
        </Pressable>
      ) : attendees.length ? (
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={[styles.eventAttendeesList, { paddingBottom: Math.max(insets.bottom, spacing.xl) }]}>
          {attendees.map((attendee) => (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={`Open ${attendee.name}'s profile`}
              key={attendee.id}
              style={styles.eventAttendeeRow}
              onPress={() => onOpenUser(attendee.id)}>
              <View style={styles.eventAttendeeAvatar}>
                {attendee.avatarUrl ? (
                  <Image source={{ uri: attendee.avatarUrl }} style={styles.eventAttendeeAvatarImage} />
                ) : (
                  <Text style={styles.eventAttendeeAvatarText}>{initials(attendee.name || 'JambIt member')}</Text>
                )}
              </View>
              <View style={styles.flex1}>
                <Text numberOfLines={1} style={styles.eventAttendeeName}>{attendee.name || 'JambIt member'}</Text>
                <Text style={styles.eventAttendeeMeta}>JambIt member</Text>
              </View>
              <ChevronRight color={colors.muted} size={19} strokeWidth={2.6} />
            </Pressable>
          ))}
        </ScrollView>
      ) : (
        <View style={styles.eventAttendeesStatus}>
          <Users color={colors.purple} size={28} strokeWidth={2.4} />
          <Text style={styles.eventAttendeesEmptyTitle}>No attendees yet</Text>
          <Text style={styles.eventAttendeesStatusText}>The attendee list will appear after someone joins.</Text>
        </View>
      )}
    </View>
  );
}

type EventCommentNode = JambitEventComment & { replies: EventCommentNode[] };

function buildEventCommentTree(comments: JambitEventComment[]) {
  const nodes = new globalThis.Map<string, EventCommentNode>();
  const roots: EventCommentNode[] = [];

  comments.forEach((comment) => nodes.set(comment.id, { ...comment, replies: [] }));
  comments.forEach((comment) => {
    const node = nodes.get(comment.id);
    if (!node) return;
    const parent = comment.parentId ? nodes.get(comment.parentId) : null;
    if (parent) parent.replies.push(node);
    else roots.push(node);
  });

  return roots;
}

function EventComment({
  comment,
  onOpenUser,
  onReply,
  depth = 0,
}: {
  comment: EventCommentNode;
  onOpenUser: (userId: string) => void;
  onReply: (comment: JambitEventComment) => void;
  depth?: number;
}) {
  const openAuthor = () => {
    if (comment.author.id) onOpenUser(comment.author.id);
  };

  return (
    <View style={[styles.commentThread, depth > 0 && { marginLeft: Math.min(depth, 3) * 18 }]}>
      <View style={styles.commentRow}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`Open ${comment.author.name}'s profile`}
          style={styles.commentAvatar}
          onPress={openAuthor}>
          {comment.author.avatarUrl ? (
            <Image source={{ uri: comment.author.avatarUrl }} style={styles.commentAvatarImage} />
          ) : (
            <Text style={styles.commentAvatarText}>{initials(comment.author.name)}</Text>
          )}
        </Pressable>
        <View style={styles.commentBubble}>
          <Pressable accessibilityRole="button" onPress={openAuthor}>
            <Text style={styles.commentName}>{comment.author.name}</Text>
          </Pressable>
          <Text style={styles.commentBody}>{comment.body}</Text>
          <Pressable hitSlop={6} onPress={() => onReply(comment)}>
            <Text style={styles.commentReplyAction}>Reply</Text>
          </Pressable>
        </View>
      </View>
      {comment.replies.map((reply) => (
        <EventComment
          key={reply.id}
          comment={reply}
          depth={depth + 1}
          onOpenUser={onOpenUser}
          onReply={onReply}
        />
      ))}
    </View>
  );
}

function MyTicketsScreen({
  sessionToken,
  onBack,
  onOpenEvent,
  onToast,
}: {
  sessionToken: string;
  onBack: () => void;
  onOpenEvent: (event: JambitEvent) => void;
  onToast: (message: string, tone?: ToastState['tone']) => void;
}) {
  const insets = useSafeAreaInsets();
  const [tickets, setTickets] = useState<JambitTicket[]>([]);
  const [selectedTicket, setSelectedTicket] = useState<JambitTicket | null>(null);
  const [cancelTarget, setCancelTarget] = useState<JambitTicket | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  const [error, setError] = useState('');

  const loadTickets = useCallback(async (refresh = false) => {
    refresh ? setRefreshing(true) : setLoading(true);
    setError('');
    try {
      const payload = await getMyTickets(sessionToken);
      setTickets(payload.tickets || []);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'Please try again.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [sessionToken]);

  useEffect(() => {
    loadTickets().catch(() => undefined);
  }, [loadTickets]);

  const confirmCancellation = useCallback(async () => {
    if (!cancelTarget) return;
    const eventId = eventKey(cancelTarget.event);
    setCancelling(true);
    try {
      const payload = await cancelEventTicket(sessionToken, eventId);
      setTickets((current) => current.filter((ticket) => ticket.id !== cancelTarget.id));
      setSelectedTicket((current) => current?.id === cancelTarget.id ? null : current);
      setCancelTarget(null);
      onToast(payload.message || 'Ticket cancelled.', payload.refundPending ? 'info' : 'success');
    } catch (cancelError) {
      onToast(cancelError instanceof Error ? cancelError.message : 'Please try again.', 'error');
    } finally {
      setCancelling(false);
    }
  }, [cancelTarget, onToast, sessionToken]);

  return (
    <View style={styles.ticketScreen}>
      <View style={[styles.ticketHeader, { paddingTop: spacing.md }]}>
        {showVisualBackButton && (
          <Pressable style={styles.ticketBackButton} onPress={onBack}>
            <ArrowLeft color={colors.ink} size={22} strokeWidth={2.7} />
          </Pressable>
        )}
        <View style={styles.flex1}>
          <Text style={styles.profileTopKicker}>YOUR BOOKINGS</Text>
          <Text style={styles.profileTopTitle}>My tickets</Text>
        </View>
        <View style={styles.ticketHeaderIcon}>
          <TicketCheck color={colors.coral} size={23} strokeWidth={2.7} />
        </View>
      </View>

      {loading ? (
        <SimpleScreenSkeleton />
      ) : error ? (
        <View style={styles.ticketEmptyWrap}>
          <EmptyScreen
            icon={<TicketCheck color={colors.purple} size={40} strokeWidth={2.3} />}
            title="Tickets could not load"
            body={error}
            actionLabel="Try again"
            onAction={() => loadTickets().catch(() => undefined)}
          />
        </View>
      ) : (
        <FlatList
          data={tickets}
          keyExtractor={(item) => item.id}
          contentContainerStyle={[styles.ticketList, { paddingBottom: insets.bottom + spacing.xxl }]}
          refreshing={refreshing}
          onRefresh={() => loadTickets(true).catch(() => undefined)}
          ListEmptyComponent={(
            <EmptyScreen
              icon={<TicketCheck color={colors.purple} size={40} strokeWidth={2.3} />}
              title="No active tickets"
              body="Events you book will appear here with your personal QR ticket."
              compact
            />
          )}
          renderItem={({ item }) => {
            const location = item.event.type?.toLowerCase().includes('online')
              ? 'Online event'
              : eventLocationLabel(item.event) || 'Venue coming soon';
            return (
              <View style={styles.ticketCard}>
                <Pressable style={styles.ticketEventRow} onPress={() => onOpenEvent(item.event)}>
                  <Image source={{ uri: item.event.image || eventHero }} style={styles.ticketEventImage} />
                  <View style={styles.ticketEventCopy}>
                    <Text numberOfLines={2} style={styles.ticketEventTitle}>{item.event.title}</Text>
                    <Text numberOfLines={1} style={styles.ticketEventDate}>{formatEventDate(item.event.startAt)}</Text>
                    <View style={styles.ticketLocationRow}>
                      <MapPin color={colors.coral} size={14} strokeWidth={2.5} />
                      <Text numberOfLines={1} style={styles.ticketEventLocation}>{location}</Text>
                    </View>
                  </View>
                  <ChevronRight color={colors.muted} size={20} strokeWidth={2.5} />
                </Pressable>
                <View style={styles.ticketCardFooter}>
                  <View>
                    <Text style={styles.ticketCodeLabel}>TICKET ID</Text>
                    <Text numberOfLines={1} style={styles.ticketCodeValue}>{item.ticketId}</Text>
                  </View>
                  <Pressable style={styles.ticketViewButton} onPress={() => setSelectedTicket(item)}>
                    <TicketCheck color={colors.surface} size={17} strokeWidth={2.6} />
                    <Text style={styles.ticketViewButtonText}>View ticket</Text>
                  </Pressable>
                </View>
              </View>
            );
          }}
        />
      )}

      <Modal visible={Boolean(selectedTicket)} transparent animationType="fade" onRequestClose={() => setSelectedTicket(null)}>
        <View style={styles.ticketModalBackdrop}>
          {selectedTicket && (
            <View style={styles.ticketModalCard}>
              <Pressable style={styles.ticketModalClose} onPress={() => setSelectedTicket(null)}>
                <X color={colors.ink} size={21} strokeWidth={2.7} />
              </Pressable>
              <View style={styles.ticketModalNotch} />
              <Text style={styles.ticketModalKicker}>JAMBIT ENTRY PASS</Text>
              <View style={styles.ticketQrWrap}>
                <QRCode
                  value={selectedTicket.qrPayload}
                  size={216}
                  logo={jambitAppIcon}
                  logoSize={44}
                  logoBackgroundColor={colors.surface}
                  logoMargin={5}
                  ecl="H"
                />
              </View>
              <View style={styles.ticketModalDivider} />
              <Text numberOfLines={2} style={styles.ticketModalTitle}>{selectedTicket.event.title}</Text>
              <Text style={styles.ticketModalDate}>{formatEventDate(selectedTicket.event.startAt)}</Text>
              <View style={styles.ticketModalCodeRow}>
                <Text style={styles.ticketCodeLabel}>TICKET ID</Text>
                <Text selectable style={styles.ticketModalCode}>{selectedTicket.ticketId}</Text>
              </View>
              <Pressable style={styles.ticketCancelButton} onPress={() => setCancelTarget(selectedTicket)}>
                <Text style={styles.ticketCancelButtonText}>Cancel attendance</Text>
              </Pressable>
            </View>
          )}
        </View>
      </Modal>

      <Modal visible={Boolean(cancelTarget)} transparent animationType="fade" onRequestClose={() => !cancelling && setCancelTarget(null)}>
        <View style={styles.ticketModalBackdrop}>
          <View style={styles.ticketConfirmCard}>
            <View style={styles.ticketConfirmIcon}>
              <CalendarHeart color={colors.coral} size={28} strokeWidth={2.5} />
            </View>
            <Text style={styles.ticketConfirmTitle}>Cancel this ticket?</Text>
            <Text style={styles.ticketConfirmBody}>
              Your spot will be released. Paid ticket refunds are sent for payment review.
            </Text>
            <View style={styles.ticketConfirmActions}>
              <Pressable style={styles.ticketKeepButton} onPress={() => setCancelTarget(null)} disabled={cancelling}>
                <Text style={styles.ticketKeepButtonText}>Keep ticket</Text>
              </Pressable>
              <Pressable style={styles.ticketConfirmCancelButton} onPress={confirmCancellation} disabled={cancelling}>
                {cancelling ? <ActivityIndicator color={colors.surface} /> : <Text style={styles.ticketConfirmCancelText}>Cancel ticket</Text>}
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

function PublicProfileScreen({
  userId,
  currentUser,
  sessionToken,
  onBack,
  onOpenOwnProfile,
  onOpenEvent,
  onChat,
  onToast,
}: {
  userId: string;
  currentUser: JambitUser;
  sessionToken: string;
  onBack: () => void;
  onOpenOwnProfile: () => void;
  onOpenEvent: (event: JambitEvent) => void;
  onChat: (userId: string) => void;
  onToast: (message: string, tone?: ToastState['tone']) => void;
}) {
  const insets = useSafeAreaInsets();
  const [profile, setProfile] = useState<PublicUserProfilePayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [friendStatus, setFriendStatus] = useState<'none' | 'pending-sent' | 'pending-received' | 'accepted'>('none');
  const [friendBusy, setFriendBusy] = useState(false);
  const isOwnProfile = String(currentUser.id || '') === String(userId);

  const loadProfile = useCallback(async () => {
    if (!userId || isOwnProfile) return;

    setLoading(true);
    setError('');
    try {
      const payload = await getPublicUserProfile(userId, sessionToken);
      setProfile(payload);
      setFriendStatus(payload.friendship?.status || 'none');
    } catch (loadError) {
      setProfile(null);
      setError(loadError instanceof Error ? loadError.message : 'Profile could not be loaded.');
    } finally {
      setLoading(false);
    }
  }, [isOwnProfile, sessionToken, userId]);

  useEffect(() => {
    if (isOwnProfile) {
      onOpenOwnProfile();
      return;
    }
    loadProfile().catch(() => undefined);
  }, [isOwnProfile, loadProfile, onOpenOwnProfile]);

  if (isOwnProfile) return <SimpleScreenSkeleton />;

  if (loading) {
    return (
      <View style={[styles.publicProfileScreen, { paddingTop: insets.top + spacing.lg }]}>
        <SimpleScreenSkeleton />
      </View>
    );
  }

  if (error || !profile?.user) {
    return (
      <View style={[styles.publicProfileScreen, styles.publicProfileErrorScreen, { paddingTop: insets.top + spacing.lg }]}>
        {showVisualBackButton && (
          <Pressable style={styles.publicProfileBackButton} onPress={onBack}>
            <ArrowLeft color={colors.ink} size={22} strokeWidth={2.7} />
          </Pressable>
        )}
        <User color={colors.purple} size={38} strokeWidth={2.3} />
        <Text style={styles.publicProfileErrorTitle}>Member not found</Text>
        <Text style={styles.publicProfileErrorText}>{error || 'This member profile is not available.'}</Text>
        <Pressable style={styles.publicProfileRetryButton} onPress={loadProfile}>
          <Text style={styles.publicProfileRetryText}>Try again</Text>
        </Pressable>
      </View>
    );
  }

  const { user, visibility = {}, hostedGroups = [], memberGroups = [], hostedEvents = [] } = profile;
  const canChat = profile.chatEligibility?.canChat === true;
  const interests = visibility.showInterests === false ? [] : user.interests || [];
  const groups = visibility.showGroups === false ? [] : (hostedGroups.length ? hostedGroups : memberGroups);
  const joinedDate = user.joinedAt ? new Date(user.joinedAt) : null;
  const joinedLabel = joinedDate && !Number.isNaN(joinedDate.getTime())
    ? `Joined ${new Intl.DateTimeFormat('en', { month: 'short', year: 'numeric' }).format(joinedDate)}`
    : 'JambIt member';
  const handleFriendAction = async () => {
    if (friendStatus === 'accepted') {
      onToast('You are already friends.', 'info');
      return;
    }
    if (friendStatus === 'pending-sent' || friendBusy) return;

    setFriendBusy(true);
    try {
      if (friendStatus === 'pending-received' && profile.friendship?.id) {
        await acceptFriendRequest(sessionToken, profile.friendship.id);
        setFriendStatus('accepted');
        onToast('Friend request accepted.', 'success');
      } else {
        const result = await sendFriendRequest(sessionToken, user.id);
        const nextStatus = result.status === 'accepted' ? 'accepted' : 'pending-sent';
        setFriendStatus(nextStatus);
        onToast(result.status === 'accepted' ? 'You are now friends.' : 'Friend request sent.', 'success');
      }
    } catch (actionError) {
      onToast(actionError instanceof Error ? actionError.message : 'Please try again.', 'error');
    } finally {
      setFriendBusy(false);
    }
  };

  return (
    <ScrollView
      style={styles.publicProfileScreen}
      showsVerticalScrollIndicator={false}
      contentContainerStyle={[styles.publicProfileContent, { paddingTop: insets.top + spacing.lg }]}>
      <View style={styles.publicProfileTopRow}>
        {showVisualBackButton ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Back"
            style={styles.publicProfileBackButton}
            onPress={onBack}>
            <ArrowLeft color={colors.ink} size={22} strokeWidth={2.7} />
          </Pressable>
        ) : (
          <View />
        )}
        <Text style={styles.publicProfileKicker}>MEMBER PROFILE</Text>
      </View>

      <View style={styles.publicProfileHero}>
        <View style={styles.publicProfileAvatar}>
          {user.avatarUrl ? (
            <Image source={{ uri: user.avatarUrl }} style={styles.publicProfileAvatarImage} />
          ) : (
            <Text style={styles.publicProfileAvatarText}>{initials(user.name)}</Text>
          )}
        </View>
        <Text style={styles.publicProfileName}>{user.name}</Text>
        <Text style={styles.publicProfileMemberLabel}>JambIt member</Text>

        {canChat && (
          <Pressable
            style={styles.publicProfileFriendButton}
            onPress={() => onChat(user.id)}>
            <MessageCircle color={colors.surface} size={19} strokeWidth={2.7} />
            <Text style={styles.publicProfileFriendButtonText}>Chat</Text>
          </Pressable>
        )}

        {friendStatus !== 'accepted' && (friendStatus === 'pending-received' || user.allowFriendRequests !== false) && (
          <Pressable
            style={[
              styles.publicProfileFriendButton,
              friendStatus === 'pending-sent' && styles.publicProfileFriendButtonPending,
            ]}
            onPress={handleFriendAction}
            disabled={friendBusy || friendStatus === 'pending-sent'}>
            {friendBusy ? (
              <ActivityIndicator color={colors.surface} />
            ) : friendStatus === 'pending-received' ? (
              <UserCheck color={colors.surface} size={19} strokeWidth={2.7} />
            ) : (
              <UserPlus color={friendStatus === 'pending-sent' ? colors.muted : colors.surface} size={19} strokeWidth={2.7} />
            )}
            <Text style={[
              styles.publicProfileFriendButtonText,
              friendStatus === 'pending-sent' && styles.publicProfileFriendButtonTextPending,
            ]}>
              {friendStatus === 'pending-received'
                  ? 'Accept request'
                  : friendStatus === 'pending-sent'
                    ? 'Request sent'
                    : 'Send friend request'}
            </Text>
          </Pressable>
        )}

        <View style={styles.publicProfileMeta}>
          {user.city ? (
            <View style={styles.publicProfileMetaRow}>
              <MapPin color={colors.coral} size={17} strokeWidth={2.5} />
              <Text style={styles.publicProfileMetaText}>{user.city}</Text>
            </View>
          ) : null}
          <View style={styles.publicProfileMetaRow}>
            <CalendarDays color={colors.purple} size={17} strokeWidth={2.5} />
            <Text style={styles.publicProfileMetaText}>{joinedLabel}</Text>
          </View>
        </View>

        <View style={styles.publicProfileStats}>
          {visibility.showGroups !== false && <ProfileStat value={String(groups.length)} label="Groups" />}
          {visibility.showInterests !== false && <ProfileStat value={String(interests.length)} label="Interests" />}
          <ProfileStat value={String(hostedEvents.length)} label="Hosted" />
        </View>
      </View>

      <View style={styles.publicProfileSection}>
        <Text style={styles.publicProfileSectionTitle}>About</Text>
        <Text style={styles.publicProfileBody}>
          {user.bio || 'This member has not added a bio yet.'}
        </Text>
        {user.work ? (
          <View style={styles.publicProfileInfoRow}>
            <BriefcaseBusiness color={colors.purple} size={18} strokeWidth={2.4} />
            <Text style={styles.publicProfileInfoText}>{user.work}</Text>
          </View>
        ) : null}
        {interests.length ? (
          <View style={styles.eventTopicWrap}>
            {interests.map((interest) => <Chip key={interest} label={interest} />)}
          </View>
        ) : null}
      </View>

      {visibility.showGroups !== false ? (
        <View style={styles.publicProfileSection}>
          <Text style={styles.publicProfileSectionTitle}>
            {hostedGroups.length ? 'Groups hosted' : 'Groups'} ({groups.length})
          </Text>
          {groups.length ? (
            groups.map((group) => (
              <View key={group.slug || group.id || group.name} style={styles.publicProfileGroupRow}>
                <View style={styles.publicProfileGroupImageWrap}>
                  {group.image ? (
                    <Image source={{ uri: group.image }} style={styles.publicProfileGroupImage} />
                  ) : (
                    <Text style={styles.publicProfileGroupFallback}>{initials(group.name)}</Text>
                  )}
                </View>
                <View style={styles.flex1}>
                  <Text style={styles.publicProfileGroupName}>{group.name}</Text>
                  <Text style={styles.publicProfileGroupMeta}>
                    {[group.city, formatMemberCount(Number(group.members || 0))].filter(Boolean).join(' - ')}
                  </Text>
                </View>
              </View>
            ))
          ) : (
            <Text style={styles.publicProfileEmptyText}>No public groups yet.</Text>
          )}
        </View>
      ) : null}

      <View style={styles.publicProfileSection}>
        <Text style={styles.publicProfileSectionTitle}>Hosted events ({hostedEvents.length})</Text>
        {hostedEvents.length ? (
          hostedEvents.map((event) => (
            <Pressable
              key={event.id || event._id || event.title}
              style={styles.publicProfileEventRow}
              onPress={() => onOpenEvent(event)}>
              {event.image ? (
                <Image source={{ uri: event.image }} style={styles.publicProfileEventImage} />
              ) : (
                <View style={styles.publicProfileEventImageFallback}>
                  <CalendarHeart color={colors.coral} size={22} strokeWidth={2.5} />
                </View>
              )}
              <View style={styles.flex1}>
                <Text numberOfLines={2} style={styles.publicProfileEventTitle}>{event.title}</Text>
                <Text style={styles.publicProfileEventMeta}>{event.date || formatEventDate(event.startAt)}</Text>
              </View>
              <ChevronRight color={colors.muted} size={18} strokeWidth={2.5} />
            </Pressable>
          ))
        ) : (
          <Text style={styles.publicProfileEmptyText}>No public hosted events yet.</Text>
        )}
      </View>
    </ScrollView>
  );
}

function EventHorizontalSection({
  title,
  events,
  onOpenEvent,
}: {
  title: string;
  events: JambitEvent[];
  onOpenEvent: (event: JambitEvent) => void;
}) {
  if (!events.length) return null;

  return (
    <View style={styles.eventDetailSection}>
      <View style={styles.eventDetailSectionHeader}>
        <Text style={styles.eventDetailSectionTitle}>{title}</Text>
        <Text style={styles.eventDetailSectionAction}>See all</Text>
      </View>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.eventDetailMiniList}>
        {events.map((item) => (
          <Pressable key={eventKey(item)} style={styles.eventDetailMiniCard} onPress={() => onOpenEvent(item)}>
            <Image source={{ uri: item.image || eventHero }} style={styles.eventDetailMiniImage} />
            <Text numberOfLines={2} style={styles.eventDetailMiniTitle}>{item.title}</Text>
            <Text numberOfLines={1} style={styles.eventDetailMiniMeta}>{formatHomeDate(item.startAt)}</Text>
          </Pressable>
        ))}
      </ScrollView>
    </View>
  );
}

function GroupDetailScreen({
  group,
  events,
  onBack,
  onCreateEvent,
  onOpenEvent,
}: {
  group?: JambitGroup;
  events: JambitEvent[];
  onBack: () => boolean;
  onCreateEvent: (group: JambitGroup) => void;
  onOpenEvent: (event: JambitEvent) => void;
}) {
  if (!group) {
    return (
      <View style={styles.groupDetailEmptyScreen}>
        <EmptyScreen
          compact
          icon={<Users color={colors.coral} size={38} />}
          title="Group not found"
          body="Go back and choose a group again."
        />
      </View>
    );
  }

  const members = groupMemberCount(group);
  const location = group.location?.description || group.city || group.location?.city || 'Jambit';
  const description =
    group.description ||
    group.summary ||
    `${group.name} is a Jambit group for people who want to meet, host, learn, and build meaningful plans together.`;
  const topics = group.topics || [];
  const groupEvents = events
    .filter((event, index, list) => list.findIndex((candidate) => eventKey(candidate) === eventKey(event)) === index)
    .filter((event) => {
      const haystack = `${event.groupName || ''} ${event.title || ''} ${eventLocationLabel(event)}`.toLowerCase();
      return haystack.includes(group.name.toLowerCase()) || haystack.includes(location.split(',')[0]?.trim().toLowerCase() || '');
    })
    .slice(0, 4);

  return (
    <View style={styles.groupDetailScreen}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.groupDetailContent}>
        <ImageBackground
          source={{ uri: group.image || eventHero }}
          style={styles.groupDetailHeroImage}
          imageStyle={styles.groupDetailHeroRadius}>
          <View style={styles.eventDetailTopActions}>
            {showVisualBackButton && (
              <Pressable style={styles.eventDetailRoundButton} onPress={onBack}>
                <ArrowLeft color={colors.ink} size={21} strokeWidth={2.8} />
              </Pressable>
            )}
            <View style={styles.eventDetailActionCluster}>
              {group.canEdit !== false ? (
                <Pressable style={styles.eventDetailRoundButton}>
                  <Settings color={colors.ink} size={19} strokeWidth={2.7} />
                </Pressable>
              ) : null}
              <Pressable style={styles.eventDetailRoundButton}>
                <Share2 color={colors.ink} size={19} strokeWidth={2.7} />
              </Pressable>
            </View>
          </View>
        </ImageBackground>

        <View style={styles.groupDetailTitleCard}>
          <Text style={styles.groupDetailKicker}>{group.canEdit === false ? 'Member group' : 'Your group'}</Text>
          <Text style={styles.groupDetailTitle}>{group.name}</Text>
          <Text style={styles.groupDetailDescription}>{description}</Text>
          <View style={styles.groupDetailStatsRow}>
            <View style={styles.groupDetailStat}>
              <Text style={styles.groupDetailStatValue}>{members}</Text>
              <Text style={styles.groupDetailStatLabel}>{members === 1 ? 'Member' : 'Members'}</Text>
            </View>
            <View style={styles.groupDetailStat}>
              <Text style={styles.groupDetailStatValue}>{groupEvents.length}</Text>
              <Text style={styles.groupDetailStatLabel}>Events</Text>
            </View>
            <View style={styles.groupDetailStat}>
              <Text style={styles.groupDetailStatValue}>{topics.length || 1}</Text>
              <Text style={styles.groupDetailStatLabel}>Topics</Text>
            </View>
          </View>
        </View>

        {group.canEdit !== false ? (
          <Pressable style={styles.groupDetailCreateEventButton} onPress={() => onCreateEvent(group)}>
            <CalendarDays color={colors.surface} size={19} strokeWidth={2.8} />
            <Text style={styles.groupDetailCreateEventText}>Create event</Text>
            <ChevronRight color={colors.surface} size={18} strokeWidth={2.8} />
          </Pressable>
        ) : null}

        <View style={styles.groupDetailBody}>
          <View style={styles.groupDetailInfoCard}>
            <View style={styles.groupDetailInfoRow}>
              <MapPin color={colors.coral} size={20} strokeWidth={2.8} />
              <View style={styles.flex1}>
                <Text style={styles.groupDetailInfoTitle}>Location</Text>
                <Text style={styles.groupDetailInfoText}>{location}</Text>
              </View>
            </View>
            <View style={styles.groupDetailInfoRow}>
              <Users color={colors.purple} size={20} strokeWidth={2.8} />
              <View style={styles.flex1}>
                <Text style={styles.groupDetailInfoTitle}>Community</Text>
                <Text style={styles.groupDetailInfoText}>{members} {members === 1 ? 'member' : 'members'} in this group</Text>
              </View>
            </View>
          </View>

          <View style={styles.eventDetailSection}>
            <Text style={styles.eventDetailSectionTitle}>About this group</Text>
            <Text style={styles.groupDetailBodyText}>{description}</Text>
          </View>

          <View style={styles.eventDetailSection}>
            <Text style={styles.eventDetailSectionTitle}>Topics</Text>
            <View style={styles.eventTopicWrap}>
              {(topics.length ? topics : ['Community']).map((topic) => (
                <Chip key={topic} label={topic} />
              ))}
            </View>
          </View>

          <EventHorizontalSection title="Upcoming events" events={groupEvents} onOpenEvent={onOpenEvent} />

          <View style={styles.eventDetailSection}>
            <Text style={styles.eventDetailSectionTitle}>Discussion</Text>
            <View style={styles.commentEmptyState}>
              <MessageCircle color={colors.purple} size={22} strokeWidth={2.5} />
              <Text style={styles.commentEmptyTitle}>No discussions yet</Text>
              <Text style={styles.commentEmptyText}>Group conversations will appear here.</Text>
            </View>
          </View>

          <Pressable style={styles.reportEventRow}>
            <Flag color={colors.muted} size={20} strokeWidth={2.5} />
            <Text style={styles.reportEventText}>Report group</Text>
            <ChevronRight color={colors.muted} size={18} strokeWidth={2.6} />
          </Pressable>
        </View>
      </ScrollView>
    </View>
  );
}

function ShareSheet({
  event,
  onClose,
  onToast,
}: {
  event: JambitEvent | null;
  onClose: () => void;
  onToast: (message: string, tone?: ToastState['tone']) => void;
}) {
  if (!event) return null;

  return (
    <Modal visible transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.modalBackdrop}>
        <View style={styles.shareCard}>
          <View style={styles.shareHeader}>
            <Text style={styles.shareTitle}>Share</Text>
            <Pressable onPress={onClose}>
              <X color={colors.muted} size={26} />
            </Pressable>
          </View>
          <View style={styles.shareOptions}>
            {['Copy link', 'Facebook', 'LinkedIn', 'X', 'Email'].map((item) => (
              <Pressable
                key={item}
                style={styles.shareOption}
                onPress={() => onToast(`${item} ready for ${event.title}.`, 'success')}>
                <Share2 color={colors.purple} size={20} />
                <Text style={styles.shareOptionText}>{item}</Text>
              </Pressable>
            ))}
          </View>
          <Text style={styles.dividerText}>or share a flyer</Text>
          <View style={styles.flyerPreview}>
            <Image source={{ uri: event.image || eventHero }} style={styles.flyerImage} />
            <Text style={styles.flyerTitle}>{event.title}</Text>
            <Text style={styles.mutedText}>{formatEventDate(event.startAt)}</Text>
            <Text style={styles.mutedText}>By {event.groupName || 'JambIt group'}</Text>
            <Pressable style={styles.saveFlyerButton} onPress={() => onToast('Flyer saved.', 'success')}>
              <Text style={styles.saveFlyerText}>Save</Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}

function BottomTabs({
  route,
  unreadChatCount,
  onRoute,
}: {
  route: RouteName;
  unreadChatCount: number;
  onRoute: (route: RouteName) => void;
}) {
  const activeRoute = route === 'createGroup' || route === 'groupDetail' || route === 'createEvent' ? 'groups' : route;

  return (
    <View style={styles.bottomTabs}>
      {bottomTabs.map((tab) => {
        const active = activeRoute === tab.route;
        const Icon = tab.Icon;
        if (tab.primary) {
          return (
            <Pressable key={tab.route} style={[styles.tabItem, styles.tabItemPrimary]} onPress={() => onRoute(tab.route)}>
              <View style={styles.tabPrimaryButton}>
                <Icon size={27} color={colors.surface} />
              </View>
            </Pressable>
          );
        }

        return (
          <Pressable key={tab.route} style={styles.tabItem} onPress={() => onRoute(tab.route)}>
            <View style={styles.tabIconWrap}>
              <Icon size={26} color={active ? colors.coral : '#a98f82'} />
              {tab.route === 'messages' && unreadChatCount > 0 && (
                <Text style={styles.tabUnreadBadge}>
                  {unreadChatCount > 99 ? '99+' : unreadChatCount}
                </Text>
              )}
            </View>
            <Text
              numberOfLines={1}
              adjustsFontSizeToFit
              minimumFontScale={0.85}
              style={[styles.tabLabel, active && styles.tabLabelActive]}>
              {tab.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

function BrandLogo({ size = 'small' }: { size?: 'small' | 'medium' | 'large' }) {
  const markSize = size === 'large' ? 62 : size === 'medium' ? 42 : 34;
  return (
    <View style={styles.brandRow}>
      <Image
        source={jambitAppIcon}
        style={[styles.logoMark, { width: markSize, height: markSize, borderRadius: markSize * 0.32 }]}
      />
      {size !== 'small' && <Text style={styles.brandText}>{appConfig.brandName}</Text>}
    </View>
  );
}

function AuthBrandLogo() {
  return (
    <View style={styles.authBrandRow}>
      <Image source={jambitAppIcon} style={styles.authLogoMark} />
      <Text style={styles.authBrandText}>{appConfig.brandName}</Text>
    </View>
  );
}

function LightBackgroundDecor() {
  return (
    <View pointerEvents="none" style={styles.lightDecor}>
      <View style={styles.lightDecorOrbTopLeft} />
      <View style={styles.lightDecorOrbTopRight} />
      <View style={styles.lightDecorOrbBottomRight} />
      <View style={styles.lightDecorWave} />
    </View>
  );
}

function AuthMusicDoodle() {
  return (
    <Svg width={56} height={58} viewBox="0 0 56 58">
      <Path
        d="M12 42c-5 0-8 3-8 7s3 7 8 7 8-3 8-7V18l24-7v23c-1.5-.9-3.2-1.3-5-1.3-5 0-8 3-8 7s3 7 8 7 8-3 8-7V4L17 12v31c-1.4-.7-3.1-1-5-1z"
        fill="none"
        stroke="rgba(255,186,0,0.28)"
        strokeWidth={3.2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

function Avatar({ user, size }: { user: JambitUser; size: number }) {
  if (user.avatarUrl) {
    return <Image source={{ uri: user.avatarUrl }} style={{ width: size, height: size, borderRadius: size / 2 }} />;
  }

  return (
    <View style={[styles.avatar, { width: size, height: size, borderRadius: size / 2 }]}>
      <Text style={[styles.avatarText, { fontSize: size * 0.42 }]}>{initials(user.name)}</Text>
    </View>
  );
}

function EmptyScreen({
  icon,
  title,
  body,
  compact,
  actionLabel = 'Discover events',
  onAction,
}: {
  icon: React.ReactNode;
  title: string;
  body: string;
  compact?: boolean;
  actionLabel?: string;
  onAction?: () => void;
}) {
  return (
    <View style={[styles.emptyState, compact && styles.emptyStateCompact]}>
      <View style={styles.emptyIcon}>{icon}</View>
      <Text style={styles.emptyTitle}>{title}</Text>
      <Text style={styles.emptyBody}>{body}</Text>
      {!compact && (
        <Pressable style={styles.smallDarkButton} onPress={onAction} disabled={!onAction}>
          <Text style={styles.smallDarkButtonText}>{actionLabel}</Text>
        </Pressable>
      )}
    </View>
  );
}

function Chip({ label, selected }: { label: string; selected?: boolean }) {
  return (
    <Pressable style={[styles.chip, selected && styles.chipSelected]}>
      <Text style={[styles.chipText, selected && styles.chipTextSelected]}>{label}</Text>
    </Pressable>
  );
}

function SettingsRow({
  icon,
  label,
  onPress,
  destructive = false,
}: {
  icon: React.ReactNode;
  label: string;
  onPress?: () => void;
  destructive?: boolean;
}) {
  return (
    <Pressable style={styles.settingsRow} onPress={onPress}>
      {icon}
      <Text style={[styles.settingsLabel, destructive && styles.settingsLabelDestructive]}>{label}</Text>
      <ChevronRight color={destructive ? colors.coral : colors.muted} size={20} />
    </Pressable>
  );
}

function ProfileStat({ value, label }: { value: string; label: string }) {
  return (
    <View style={styles.profileStat}>
      <Text style={styles.profileStatValue}>{value}</Text>
      <Text style={styles.profileStatLabel}>{label}</Text>
    </View>
  );
}

function Toast({ toast, bottom, onDismiss }: { toast: ToastState | null; bottom: number; onDismiss: () => void }) {
  useEffect(() => {
    if (!toast) return undefined;
    const timeout = setTimeout(onDismiss, 10000);
    return () => clearTimeout(timeout);
  }, [onDismiss, toast]);

  if (!toast) return null;

  const toneStyle =
    toast.tone === 'success' ? styles.toastSuccess : toast.tone === 'error' ? styles.toastError : styles.toastInfo;

  return (
    <View style={[styles.toast, toneStyle, { bottom }]}>
      {toast.tone === 'success' ? <Check color={colors.surface} size={20} /> : <Sparkles color={colors.surface} size={20} />}
      <Text style={styles.toastText}>{toast.message}</Text>
      <Pressable onPress={onDismiss}>
        <X color={colors.surface} size={20} />
      </Pressable>
    </View>
  );
}

function formatEventDate(value?: string) {
  if (!value) return 'Date coming soon';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Date coming soon';

  return new Intl.DateTimeFormat('en-IN', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  }).format(date);
}

function formatHomeDate(value?: string) {
  if (!value) return 'Date coming soon';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Date coming soon';

  return new Intl.DateTimeFormat('en-IN', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  }).format(date);
}

function greetingLabel() {
  const hour = new Date().getHours();
  if (hour < 5) return 'Good Night,';
  if (hour < 12) return 'Good Morning,';
  if (hour < 17) return 'Good Afternoon,';
  if (hour < 21) return 'Good Evening,';
  return 'Good Night,';
}

function firstNameForGreeting(user: Pick<JambitUser, 'name' | 'email'>) {
  const displaySource = user.name?.trim() || user.email?.split('@')[0] || 'there';
  const [name] = displaySource.trim().split(/[\s._-]+/);
  if (!name) return 'there';
  return name.charAt(0).toUpperCase() + name.slice(1);
}

function formatMemberCount(value: number) {
  if (value >= 1000) {
    const compact = value / 1000;
    const rounded = compact >= 10 ? Math.round(compact).toString() : compact.toFixed(1).replace(/\.0$/, '');
    return `${rounded}k`;
  }
  return `${value}`;
}

function initials(value = 'J') {
  return value.trim().charAt(0).toUpperCase() || 'J';
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  screenTransition: {
    flex: 1,
    position: 'relative',
    overflow: 'hidden',
  },
  screenTransitionLayer: {
    flex: 1,
    width: '100%',
  },
  screenTransitionLayerAbsolute: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
  },
  screenTransitionLayerEntering: {
    zIndex: 2,
  },
  screenTransitionLayerExiting: {
    zIndex: 1,
  },
  transitionSkeletonOverlay: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    backgroundColor: 'rgba(255, 248, 240, 0.72)',
  },
  transitionSkeletonContent: {
    flex: 1,
    paddingHorizontal: 18,
    paddingTop: 26,
    backgroundColor: 'rgba(255, 248, 240, 0.72)',
  },
  transitionSkeletonTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 18,
  },
  transitionSkeletonLocation: {
    width: 176,
    height: 24,
    borderRadius: 12,
  },
  transitionSkeletonIcon: {
    width: 42,
    height: 42,
    borderRadius: 21,
  },
  transitionSkeletonTitle: {
    width: '72%',
    height: 30,
    borderRadius: 15,
    marginBottom: 10,
  },
  transitionSkeletonSubtitle: {
    width: '54%',
    height: 18,
    borderRadius: 9,
    marginBottom: 18,
  },
  transitionSkeletonSearch: {
    width: '100%',
    height: 48,
    borderRadius: 24,
    marginBottom: 18,
  },
  transitionSkeletonChipRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 20,
  },
  transitionSkeletonChip: {
    width: 72,
    height: 34,
    borderRadius: 17,
  },
  transitionSkeletonCardGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 14,
  },
  transitionSkeletonCard: {
    width: '47%',
    marginBottom: 14,
  },
  transitionSkeletonImage: {
    width: '100%',
    height: 118,
    borderRadius: 22,
    marginBottom: 10,
  },
  transitionSkeletonCardTitle: {
    width: '92%',
    height: 18,
    borderRadius: 9,
    marginBottom: 8,
  },
  transitionSkeletonCardMeta: {
    width: '64%',
    height: 14,
    borderRadius: 7,
  },
  skeletonBlock: {
    overflow: 'hidden',
    borderRadius: 14,
    backgroundColor: '#f1dfd3',
  },
  bootScreen: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.bg,
    paddingHorizontal: spacing.xl,
  },
  bootStage: {
    width: 250,
    height: 230,
    alignItems: 'center',
    justifyContent: 'center',
  },
  bootBrand: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  bootBrandLogo: {
    width: 214,
    height: 224,
    resizeMode: 'contain',
  },
  bootLoaderTrack: {
    marginTop: spacing.lg,
    width: 118,
    height: 4,
    borderRadius: 999,
    overflow: 'hidden',
    backgroundColor: colors.peachSoft,
  },
  bootLoaderDot: {
    width: 38,
    height: 4,
    borderRadius: 999,
    backgroundColor: colors.coral,
  },
  lightDecor: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    overflow: 'hidden',
  },
  lightDecorOrbTopLeft: {
    position: 'absolute',
    top: -52,
    left: -44,
    width: 150,
    height: 150,
    borderRadius: 75,
    backgroundColor: 'rgba(255,92,61,0.18)',
  },
  lightDecorOrbTopRight: {
    position: 'absolute',
    top: 72,
    right: -42,
    width: 112,
    height: 112,
    borderRadius: 56,
    backgroundColor: 'rgba(255,46,122,0.16)',
  },
  lightDecorOrbBottomRight: {
    position: 'absolute',
    right: -48,
    bottom: 36,
    width: 172,
    height: 172,
    borderRadius: 86,
    backgroundColor: 'rgba(255,46,122,0.18)',
  },
  lightDecorWave: {
    position: 'absolute',
    left: -80,
    bottom: 22,
    width: 260,
    height: 108,
    borderRadius: 80,
    backgroundColor: 'rgba(255,186,0,0.12)',
    transform: [{ rotate: '-16deg' }],
  },
  publicContent: {
    paddingHorizontal: spacing.lg,
    paddingBottom: 120,
  },
  publicHeader: {
    minHeight: 72,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  brandRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  logoMark: {
    resizeMode: 'cover',
    backgroundColor: colors.surface,
    ...shadow.card,
  },
  brandText: {
    color: colors.brand,
    fontSize: type.h2,
    fontWeight: '900',
    minWidth: 112,
  },
  headerPillButton: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderRadius: radius.pill,
    backgroundColor: colors.blackButton,
  },
  headerPillText: {
    color: colors.surface,
    fontSize: type.small,
    fontWeight: '800',
  },
  heroCard: {
    minHeight: 420,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xl,
    marginTop: spacing.lg,
    marginBottom: spacing.xxl,
    borderRadius: radius.lg,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.softLine,
    ...shadow.card,
  },
  heroBlobLeft: {
    position: 'absolute',
    left: -45,
    top: 58,
    width: 130,
    height: 92,
    borderRadius: 48,
    backgroundColor: '#ff7fa5',
    opacity: 0.72,
    transform: [{ rotate: '-18deg' }],
  },
  heroBlobRight: {
    position: 'absolute',
    right: -32,
    bottom: 70,
    width: 138,
    height: 92,
    borderRadius: 48,
    backgroundColor: '#a98cff',
    opacity: 0.7,
    transform: [{ rotate: '14deg' }],
  },
  heroTitle: {
    color: colors.ink,
    fontSize: type.h1,
    lineHeight: 36,
    fontWeight: '900',
    textAlign: 'center',
  },
  heroBody: {
    maxWidth: 320,
    marginTop: spacing.lg,
    color: colors.muted,
    fontSize: type.body,
    lineHeight: 23,
    textAlign: 'center',
  },
  primaryButton: {
    marginTop: spacing.xl,
    paddingHorizontal: spacing.xxl,
    paddingVertical: spacing.md,
    borderRadius: radius.pill,
    backgroundColor: colors.blackButton,
    ...shadow.strong,
  },
  primaryButtonFull: {
    width: '100%',
    minHeight: 56,
    marginTop: spacing.lg,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.pill,
    backgroundColor: colors.blackButton,
    ...shadow.card,
  },
  primaryButtonText: {
    color: colors.surface,
    fontSize: type.body,
    fontWeight: '900',
  },
  appHeader: {
    minHeight: 78,
    marginHorizontal: spacing.lg,
    marginTop: spacing.sm,
    marginBottom: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    borderRadius: 26,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.softLine,
    ...shadow.card,
  },
  appHeaderAccent: {
    width: 48,
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 18,
  },
  appHeaderCopy: {
    flex: 1,
    minWidth: 0,
  },
  appHeaderKicker: {
    color: colors.coral,
    fontFamily: fonts.family,
    fontSize: 11,
    lineHeight: 14,
    fontWeight: '900',
    textTransform: 'uppercase',
    letterSpacing: 0,
  },
  appHeaderTitle: {
    color: colors.ink,
    fontFamily: fonts.family,
    fontSize: 22,
    lineHeight: 27,
    fontWeight: '900',
    includeFontPadding: true,
  },
  appHeaderSubtitle: {
    color: colors.muted,
    fontFamily: fonts.family,
    fontSize: 12,
    lineHeight: 16,
    fontWeight: '700',
    includeFontPadding: true,
  },
  headerSearchButton: {
    width: 38,
    height: 38,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 16,
    backgroundColor: '#fff7f0',
    borderWidth: 1,
    borderColor: colors.softLine,
  },
  headerIconRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  iconButton: {
    width: 38,
    height: 38,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 19,
  },
  avatarSmall: {
    width: 38,
    height: 38,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 16,
    backgroundColor: colors.orange,
    borderWidth: 1,
    borderColor: '#ffe0a3',
  },
  avatarSmallText: {
    color: '#573300',
    fontSize: type.small,
    fontWeight: '900',
  },
  mainBody: {
    flex: 1,
  },
  skeletonLocation: {
    width: 168,
    height: 22,
    borderRadius: 11,
  },
  skeletonRoundSmall: {
    width: 34,
    height: 34,
    borderRadius: 17,
  },
  skeletonGreetingLine: {
    width: 186,
    height: 28,
    marginTop: 18,
    borderRadius: 12,
  },
  skeletonGreetingShort: {
    width: 124,
    height: 28,
    marginTop: 6,
    borderRadius: 12,
  },
  skeletonSearch: {
    height: 42,
    marginTop: 16,
    borderRadius: radius.pill,
  },
  skeletonShortcutRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 8,
    marginTop: 16,
    marginBottom: 22,
  },
  skeletonShortcutItem: {
    width: 50,
    alignItems: 'center',
    gap: 7,
  },
  skeletonShortcutCircle: {
    width: 38,
    height: 38,
    borderRadius: 19,
  },
  skeletonTinyLabel: {
    width: 42,
    height: 9,
    borderRadius: 5,
  },
  skeletonSectionHeader: {
    minHeight: 28,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  skeletonSectionTitle: {
    width: 156,
    height: 20,
    borderRadius: 10,
  },
  skeletonSeeAll: {
    width: 48,
    height: 16,
    borderRadius: 8,
  },
  skeletonCardRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 22,
  },
  skeletonEventMini: {
    flex: 1,
    minWidth: 0,
  },
  skeletonEventImage: {
    height: 92,
    borderRadius: 16,
  },
  skeletonEventTitle: {
    height: 16,
    marginTop: 10,
    borderRadius: 8,
  },
  skeletonEventMeta: {
    width: '72%',
    height: 12,
    marginTop: 7,
    borderRadius: 6,
  },
  skeletonListRow: {
    minHeight: 72,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.softLine,
  },
  skeletonListIcon: {
    width: 50,
    height: 50,
    borderRadius: 15,
  },
  skeletonListTitle: {
    width: '82%',
    height: 17,
    borderRadius: 9,
  },
  skeletonListMeta: {
    width: '55%',
    height: 12,
    marginTop: 8,
    borderRadius: 6,
  },
  skeletonAddButton: {
    width: 30,
    height: 30,
    borderRadius: 15,
  },
  skeletonExploreKicker: {
    width: 74,
    height: 14,
    marginBottom: 7,
    borderRadius: 7,
  },
  skeletonExploreTitle: {
    width: '78%',
    height: 31,
    borderRadius: 14,
  },
  skeletonExploreSubTitle: {
    width: '68%',
    height: 16,
    marginTop: 8,
    marginBottom: 18,
    borderRadius: 8,
  },
  skeletonExploreSearch: {
    height: 44,
    marginBottom: 16,
    borderRadius: radius.pill,
  },
  skeletonDatePill: {
    width: 92,
    height: 38,
    borderRadius: radius.pill,
  },
  skeletonExploreCategory: {
    width: 82,
    alignItems: 'center',
    gap: 8,
  },
  skeletonCategoryLabel: {
    width: 64,
    height: 10,
    borderRadius: 5,
  },
  skeletonExploreCard: {
    marginTop: 18,
  },
  skeletonExploreImage: {
    height: 154,
    borderRadius: 18,
  },
  skeletonExploreCardTitle: {
    width: '88%',
    height: 20,
    marginTop: 12,
    borderRadius: 10,
  },
  skeletonExploreCardMeta: {
    width: '66%',
    height: 14,
    marginTop: 9,
    borderRadius: 7,
  },
  skeletonExploreCardMetaShort: {
    width: '42%',
    height: 14,
    marginTop: 8,
    borderRadius: 7,
  },
  skeletonSimpleKicker: {
    width: 82,
    height: 14,
    marginTop: 4,
    borderRadius: 7,
  },
  skeletonSimpleTitle: {
    width: '62%',
    height: 30,
    marginTop: 9,
    marginBottom: 18,
    borderRadius: 14,
  },
  skeletonPanel: {
    gap: 10,
    marginBottom: 14,
    padding: spacing.lg,
    borderRadius: 24,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.softLine,
    ...shadow.card,
  },
  skeletonPanelTitle: {
    width: '70%',
    height: 18,
    borderRadius: 9,
  },
  skeletonPanelLine: {
    width: '92%',
    height: 13,
    borderRadius: 7,
  },
  skeletonPanelShortLine: {
    width: '54%',
    height: 13,
    borderRadius: 7,
  },
  darkShell: {
    backgroundColor: colors.bg,
  },
  darkMainBody: {
    backgroundColor: colors.bg,
  },
  homeRoot: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  homeScreen: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  homeContent: {
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 116,
  },
  homeTopBar: {
    minHeight: 34,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.md,
  },
  homeLocationButton: {
    flex: 1,
    minHeight: 32,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  homeLocationText: {
    flexShrink: 1,
    color: colors.ink,
    fontSize: 12,
    fontWeight: '800',
  },
  homeBellButton: {
    width: 34,
    height: 34,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 17,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.softLine,
  },
  homeBellDot: {
    position: 'absolute',
    top: 8,
    right: 9,
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.brand,
  },
  locationSheetRoot: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  locationSheetBackdrop: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    backgroundColor: 'rgba(19,10,34,0.5)',
  },
  locationSheetKeyboard: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  locationSheetCard: {
    overflow: 'hidden',
    paddingTop: 6,
    paddingHorizontal: 0,
    maxHeight: '66%',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    backgroundColor: colors.surface,
    ...shadow.strong,
  },
  locationSheetGrabber: {
    alignSelf: 'center',
    width: 38,
    height: 4,
    marginBottom: 5,
    borderRadius: 3,
    backgroundColor: '#eadbd0',
  },
  locationAllScreen: {
    flex: 1,
    width: '100%',
    paddingHorizontal: spacing.lg,
    backgroundColor: '#fbf8f6',
  },
  locationAllHeader: {
    minHeight: 40,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  locationAllBack: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 18,
  },
  locationAllTitle: {
    color: colors.ink,
    fontFamily: fonts.family,
    fontSize: 18,
    lineHeight: 22,
    fontWeight: '900',
  },
  locationAllSearchBox: {
    minHeight: 54,
    marginTop: spacing.lg,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#ddd4ce',
    backgroundColor: colors.surface,
  },
  locationAllSearchInput: {
    flex: 1,
    minHeight: 52,
    paddingVertical: 0,
    color: colors.ink,
    fontFamily: fonts.family,
    fontSize: 15,
    fontWeight: '800',
  },
  locationAllActionRow: {
    marginTop: spacing.lg,
    flexDirection: 'row',
    gap: spacing.sm,
  },
  locationAllActionSingleRow: {
    marginTop: spacing.lg,
  },
  locationAllActionCard: {
    flex: 1,
    minHeight: 104,
    justifyContent: 'space-between',
    padding: spacing.md,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#eaded8',
    backgroundColor: colors.surface,
    ...shadow.card,
  },
  locationAllAddCard: {
    minHeight: 76,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    padding: spacing.md,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#eaded8',
    backgroundColor: colors.surface,
    ...shadow.card,
  },
  locationAllSwitch: {
    width: 39,
    height: 23,
    justifyContent: 'center',
    paddingHorizontal: 3,
    borderRadius: 12,
    backgroundColor: '#e2e0df',
  },
  locationAllSwitchActive: {
    alignItems: 'flex-end',
    backgroundColor: '#ffd6c8',
  },
  locationAllSwitchKnob: {
    width: 17,
    height: 17,
    borderRadius: 9,
    backgroundColor: colors.surface,
  },
  locationAllSwitchKnobActive: {
    backgroundColor: colors.coral,
  },
  locationAllActionIcon: {
    width: 25,
    height: 25,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 8,
    borderWidth: 1.5,
    borderColor: colors.coral,
    backgroundColor: '#fff3ee',
  },
  locationAllActionIconGreen: {
    borderColor: '#bdf1d2',
    backgroundColor: '#eafff2',
  },
  locationAllAddCopy: {
    flex: 1,
    minWidth: 0,
  },
  locationAllActionText: {
    color: colors.ink,
    fontFamily: fonts.family,
    fontSize: 13,
    lineHeight: 16,
    fontWeight: '900',
  },
  locationAllActionHint: {
    marginTop: 3,
    color: colors.muted,
    fontFamily: fonts.family,
    fontSize: 11,
    lineHeight: 14,
    fontWeight: '700',
  },
  locationAllSectionLabel: {
    marginTop: spacing.xl,
    marginBottom: spacing.md,
    color: colors.muted,
    fontFamily: fonts.family,
    fontSize: 12,
    fontWeight: '900',
  },
  locationAllSavedCard: {
    flex: 1,
    borderRadius: 18,
    backgroundColor: colors.surface,
  },
  locationAllSavedContent: {
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.md,
  },
  locationAllAddressRow: {
    minHeight: 92,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: '#ede5df',
  },
  locationAllAddressRowLast: {
    borderBottomWidth: 0,
  },
  locationAllAddressIconBox: {
    width: 53,
    height: 53,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 12,
    backgroundColor: '#f1efef',
  },
  locationAllAddressCopy: {
    flex: 1,
    minWidth: 0,
  },
  locationAllAddressTitleRow: {
    minHeight: 24,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  locationAllAddressName: {
    flexShrink: 1,
    color: colors.ink,
    fontFamily: fonts.family,
    fontSize: 15,
    lineHeight: 19,
    fontWeight: '900',
  },
  locationSelectedPill: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: radius.pill,
    backgroundColor: '#bff4dd',
  },
  locationSelectedPillText: {
    color: '#087a45',
    fontFamily: fonts.family,
    fontSize: 9,
    fontWeight: '900',
  },
  locationAllAddressDetail: {
    marginTop: 2,
    color: colors.muted,
    fontFamily: fonts.family,
    fontSize: 13,
    lineHeight: 17,
    fontWeight: '700',
  },
  locationAllMenuDots: {
    width: 22,
    height: 34,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 3,
  },
  locationAllMenuDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#9b948f',
  },
  locationAllEmpty: {
    minHeight: 160,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
  },
  locationAllEmptyText: {
    color: colors.muted,
    fontFamily: fonts.family,
    fontSize: 13,
    fontWeight: '800',
    textAlign: 'center',
  },
  locationSheetHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: spacing.md,
  },
  locationSheetTitleRow: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  locationSheetBadge: {
    width: 52,
    height: 52,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 26,
    backgroundColor: colors.coral,
  },
  locationSheetBadgeGlow: {
    position: 'absolute',
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: 'rgba(255,186,0,0.34)',
  },
  locationSheetTitleCopy: {
    flex: 1,
  },
  locationSheetTitle: {
    color: colors.ink,
    fontSize: 21,
    lineHeight: 25,
    fontWeight: '900',
  },
  locationSheetSubtitle: {
    marginTop: 3,
    color: colors.muted,
    fontSize: 12,
    lineHeight: 16,
    fontWeight: '700',
  },
  locationSheetClose: {
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 16,
    backgroundColor: '#f6f2ef',
    borderWidth: 1,
    borderColor: colors.softLine,
  },
  locationSheetBody: {
    paddingTop: spacing.lg,
  },
  locationPrimaryCard: {
    minHeight: 86,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    padding: spacing.md,
    borderRadius: 24,
    backgroundColor: '#fff0dc',
    borderWidth: 1,
    borderColor: '#ffddbc',
  },
  locationPrimaryIconWrap: {
    width: 46,
    height: 46,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 23,
    backgroundColor: colors.coral,
  },
  locationPrimaryCopy: {
    flex: 1,
  },
  locationPrimaryTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  locationPrimaryTitle: {
    flexShrink: 1,
    color: colors.ink,
    fontSize: 14,
    fontWeight: '900',
  },
  locationLivePill: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 3,
    borderRadius: radius.pill,
    backgroundColor: '#ffe0ea',
  },
  locationLivePillText: {
    color: colors.brand,
    fontSize: 9,
    fontWeight: '900',
  },
  locationPrimaryDetail: {
    marginTop: 5,
    color: colors.muted,
    fontSize: 11,
    fontWeight: '700',
  },
  locationSheetNotice: {
    minHeight: 40,
    marginTop: spacing.sm,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: 16,
    backgroundColor: '#fff3ee',
  },
  locationSheetNoticeText: {
    flex: 1,
    color: colors.warning,
    fontSize: 11,
    fontWeight: '900',
  },
  locationSavedHeader: {
    marginTop: spacing.lg,
    marginBottom: spacing.sm,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  locationSavedTitle: {
    color: colors.ink,
    fontSize: 14,
    fontWeight: '900',
  },
  locationTinyAdd: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    paddingHorizontal: spacing.sm,
    paddingVertical: 5,
    borderRadius: radius.pill,
    backgroundColor: '#fff0ea',
  },
  locationTinyAddText: {
    color: colors.coral,
    fontSize: 11,
    fontWeight: '900',
  },
  locationSavedList: {
    gap: spacing.sm,
  },
  locationSavedOption: {
    minHeight: 62,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingHorizontal: spacing.md,
    borderRadius: 19,
    backgroundColor: colors.bg,
    borderWidth: 1,
    borderColor: colors.softLine,
  },
  locationSavedOptionAlt: {
    backgroundColor: '#f8f2ff',
  },
  locationSavedOptionActive: {
    borderColor: colors.green,
  },
  locationSavedIcon: {
    width: 38,
    height: 38,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 19,
  },
  locationSavedIconProfile: {
    backgroundColor: colors.purpleSoft,
  },
  locationSavedIconManual: {
    backgroundColor: '#fff2cd',
  },
  locationSavedCopy: {
    flex: 1,
  },
  locationSavedLabel: {
    color: colors.ink,
    fontSize: 13,
    fontWeight: '900',
  },
  locationSavedDetail: {
    marginTop: 3,
    color: colors.muted,
    fontSize: 10,
    fontWeight: '700',
  },
  locationEmptySaved: {
    minHeight: 58,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    borderRadius: 18,
    backgroundColor: '#fff0ea',
    borderWidth: 1,
    borderColor: '#ffd8ca',
  },
  locationEmptySavedText: {
    color: colors.coral,
    fontSize: 13,
    fontWeight: '900',
  },
  locationAddFullButton: {
    minHeight: 52,
    marginTop: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    borderRadius: radius.pill,
    backgroundColor: colors.coral,
  },
  locationAddFullButtonText: {
    color: colors.surface,
    fontSize: 14,
    fontWeight: '900',
  },
  locationSheetInput: {
    flex: 1,
    minHeight: 52,
    paddingVertical: 0,
    color: colors.ink,
    fontFamily: fonts.family,
    fontSize: 15,
    fontWeight: '900',
  },
  locationQuickRow: {
    marginTop: spacing.md,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  locationQuickChip: {
    minHeight: 36,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: spacing.md,
    borderRadius: radius.pill,
    backgroundColor: '#fff1e8',
    borderWidth: 1,
    borderColor: '#ffd6c3',
  },
  locationQuickChipText: {
    color: colors.coral,
    fontFamily: fonts.family,
    fontSize: 12,
    fontWeight: '900',
  },
  locationSheetActions: {
    marginTop: spacing.lg,
    flexDirection: 'row',
    gap: spacing.sm,
  },
  locationSheetSecondaryButton: {
    flex: 1,
    minHeight: 50,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.pill,
    backgroundColor: '#f6f2ef',
  },
  locationSheetSecondaryText: {
    color: colors.muted,
    fontFamily: fonts.family,
    fontSize: 13,
    fontWeight: '900',
  },
  locationSheetSaveButton: {
    flex: 1.4,
    minHeight: 50,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.pill,
    backgroundColor: colors.coral,
  },
  locationSheetSaveButtonDisabled: {
    opacity: 0.48,
  },
  locationSheetSaveText: {
    color: colors.surface,
    fontFamily: fonts.family,
    fontSize: 13,
    fontWeight: '900',
  },
  locationDeviceBanner: {
    minHeight: 70,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginHorizontal: spacing.lg,
    marginTop: 2,
    marginBottom: 2,
    paddingHorizontal: spacing.md,
    paddingVertical: 7,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#ffd8c6',
    backgroundColor: '#fff7ef',
  },
  locationDeviceIcon: {
    width: 28,
    height: 28,
    borderRadius: 14,
    borderWidth: 2,
    borderColor: '#ffb29b',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surface,
  },
  locationDeviceCopy: {
    flex: 1,
    paddingRight: spacing.xs,
  },
  locationDeviceTitle: {
    color: colors.ink,
    fontFamily: fonts.family,
    fontSize: 14,
    lineHeight: 17,
    fontWeight: '900',
  },
  locationDeviceText: {
    marginTop: 2,
    color: colors.muted,
    fontFamily: fonts.family,
    fontSize: 10,
    lineHeight: 13,
    fontWeight: '700',
  },
  locationDeviceButton: {
    minWidth: 66,
    minHeight: 32,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 10,
    borderRadius: 12,
    backgroundColor: colors.coral,
  },
  locationDeviceButtonDisabled: {
    opacity: 0.72,
  },
  locationDeviceButtonText: {
    color: colors.surface,
    fontFamily: fonts.family,
    fontSize: 10,
    fontWeight: '900',
  },
  locationAddressPanel: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: 6,
    backgroundColor: colors.surface,
  },
  locationAddressHeader: {
    minHeight: 30,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.md,
    marginBottom: spacing.xs,
  },
  locationAddressTitle: {
    color: colors.ink,
    fontFamily: fonts.family,
    fontSize: 16,
    lineHeight: 20,
    fontWeight: '900',
  },
  locationHeaderActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  locationAddressAction: {
    color: colors.coral,
    fontFamily: fonts.family,
    fontSize: 12,
    fontWeight: '900',
  },
  locationAddressRow: {
    minHeight: 54,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: '#efe7e1',
  },
  locationAddressIcon: {
    width: 28,
    height: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
  locationAddressCopy: {
    flex: 1,
    minWidth: 0,
  },
  locationAddressName: {
    color: colors.ink,
    fontFamily: fonts.family,
    fontSize: 13,
    lineHeight: 16,
    fontWeight: '900',
  },
  locationAddressDetail: {
    marginTop: 2,
    color: colors.muted,
    fontFamily: fonts.family,
    fontSize: 11,
    lineHeight: 14,
    fontWeight: '700',
  },
  locationManualRow: {
    minHeight: 62,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: '#efe7e1',
  },
  locationAddMiniIcon: {
    width: 38,
    height: 38,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#ffd0c2',
    backgroundColor: '#fff1eb',
  },
  locationAddMiniCopy: {
    flex: 1,
    minWidth: 0,
  },
  locationManualText: {
    color: colors.ink,
    fontFamily: fonts.family,
    fontSize: 13,
    fontWeight: '900',
  },
  locationAddMiniHint: {
    marginTop: 2,
    color: colors.muted,
    fontFamily: fonts.family,
    fontSize: 11,
    lineHeight: 14,
    fontWeight: '700',
  },
  locationManualPanel: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: spacing.lg,
    backgroundColor: colors.surface,
  },
  locationManualHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  locationManualHint: {
    marginTop: 4,
    color: colors.muted,
    fontFamily: fonts.family,
    fontSize: 13,
    lineHeight: 17,
    fontWeight: '700',
  },
  locationInputWrap: {
    minHeight: 58,
    marginTop: spacing.lg,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: colors.line,
    backgroundColor: '#fffaf5',
  },
  placeSuggestionPanel: {
    minHeight: 190,
    maxHeight: 330,
    marginTop: spacing.md,
    overflow: 'hidden',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colors.softLine,
    backgroundColor: '#fffaf5',
  },
  placeSuggestionState: {
    minHeight: 150,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    padding: spacing.lg,
  },
  placeSuggestionStateText: {
    color: colors.muted,
    fontFamily: fonts.family,
    fontSize: 13,
    lineHeight: 17,
    fontWeight: '800',
    textAlign: 'center',
  },
  placeSuggestionRow: {
    minHeight: 74,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: '#efe4dc',
  },
  placeSuggestionIcon: {
    width: 38,
    height: 38,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 14,
    backgroundColor: '#fff0e9',
  },
  placeSuggestionCopy: {
    flex: 1,
    minWidth: 0,
  },
  placeSuggestionName: {
    color: colors.ink,
    fontFamily: fonts.family,
    fontSize: 14,
    lineHeight: 18,
    fontWeight: '900',
  },
  placeSuggestionDetail: {
    marginTop: 2,
    color: colors.muted,
    fontFamily: fonts.family,
    fontSize: 11,
    lineHeight: 15,
    fontWeight: '700',
  },
  homeGreeting: {
    marginTop: 14,
    color: colors.ink,
    fontFamily: fonts.family,
    fontSize: 24,
    lineHeight: 30,
    fontWeight: '900',
  },
  homeSearchBar: {
    minHeight: 42,
    marginTop: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: radius.pill,
    backgroundColor: '#f3eee9',
  },
  homeSearchPlaceholder: {
    flex: 1,
    color: colors.muted,
    fontSize: 13,
    fontWeight: '700',
  },
  homeShortcutRow: {
    marginTop: 18,
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
  },
  homeShortcut: {
    width: 50,
    alignItems: 'center',
    gap: 6,
  },
  homeShortcutCircle: {
    width: 39,
    height: 39,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 20,
  },
  homeShortcutLabel: {
    width: 58,
    color: colors.ink,
    fontSize: 10,
    fontWeight: '800',
    textAlign: 'center',
  },
  homeSectionHeader: {
    marginTop: 22,
    marginBottom: 9,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  homeSectionTitle: {
    flex: 1,
    color: colors.ink,
    fontFamily: fonts.family,
    fontSize: 15,
    fontWeight: '900',
  },
  homeSeeAllButton: {
    width: 74,
    minHeight: 24,
    alignItems: 'flex-end',
    justifyContent: 'center',
  },
  homeSeeAll: {
    width: 64,
    color: colors.coral,
    fontSize: 10,
    fontWeight: '900',
    includeFontPadding: false,
    textAlign: 'right',
  },
  homeCardsRow: {
    gap: spacing.md,
    paddingRight: spacing.lg,
  },
  homeEmptyState: {
    minHeight: 62,
    justifyContent: 'center',
    paddingHorizontal: spacing.md,
    borderRadius: radius.md,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.softLine,
  },
  homeEmptyStateText: {
    color: colors.muted,
    fontFamily: fonts.family,
    fontSize: 12,
    fontWeight: '700',
  },
  homeEventCard: {
    width: 106,
  },
  homeEventImage: {
    height: 78,
    overflow: 'hidden',
    justifyContent: 'flex-end',
  },
  homeEventImageRadius: {
    borderRadius: 11,
  },
  homeEventEye: {
    position: 'absolute',
    right: 7,
    bottom: 7,
    width: 20,
    height: 20,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 10,
    backgroundColor: 'rgba(31,41,55,0.72)',
  },
  homeEventTitle: {
    minHeight: 42,
    marginTop: 7,
    color: colors.ink,
    fontFamily: fonts.family,
    fontSize: 12,
    lineHeight: 17,
    fontWeight: '900',
  },
  homeEventMeta: {
    marginTop: 4,
    color: colors.text,
    fontFamily: fonts.family,
    fontSize: 10,
    fontWeight: '700',
  },
  homeEventLocationRow: {
    marginTop: 4,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  homeEventLocationText: {
    flex: 1,
    color: colors.muted,
    fontFamily: fonts.family,
    fontSize: 9,
    fontWeight: '700',
  },
  homeGoingRow: {
    marginTop: 7,
    flexDirection: 'row',
    alignItems: 'center',
  },
  homeTinyAvatarStack: {
    width: 43,
    flexDirection: 'row',
  },
  homeTinyAvatar: {
    width: 18,
    height: 18,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 9,
    borderWidth: 1,
    borderColor: colors.bg,
    backgroundColor: colors.purple,
  },
  homeTinyAvatarOverlap: {
    marginLeft: -6,
  },
  homeTinyAvatarText: {
    color: colors.surface,
    fontFamily: fonts.family,
    fontSize: 8,
    fontWeight: '900',
  },
  homeGoingText: {
    flex: 1,
    color: colors.ink,
    fontFamily: fonts.family,
    fontSize: 10,
    fontWeight: '900',
  },
  homeGroupList: {
    gap: spacing.sm,
  },
  homeGroupRow: {
    minHeight: 54,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingHorizontal: spacing.md,
    borderRadius: 15,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.softLine,
    ...shadow.card,
  },
  homeGroupRowPressed: {
    opacity: 0.72,
    transform: [{ scale: 0.99 }],
  },
  homeGroupIcon: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: colors.peachSoft,
  },
  homeGroupInfo: {
    flex: 1,
  },
  homeGroupTitle: {
    color: colors.ink,
    fontFamily: fonts.family,
    fontSize: 14,
    fontWeight: '900',
  },
  homeGroupMeta: {
    marginTop: 3,
    color: colors.muted,
    fontFamily: fonts.family,
    fontSize: 11,
    fontWeight: '700',
  },
  homeGroupAdd: {
    width: 30,
    height: 30,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 15,
    backgroundColor: '#fff0ea',
  },
  trendingGroupsScreen: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  trendingGroupsContent: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: 48,
  },
  trendingGroupsHeader: {
    paddingBottom: spacing.xl,
  },
  trendingGroupsBack: {
    width: 42,
    height: 42,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.lg,
    borderRadius: 15,
    borderWidth: 1,
    borderColor: colors.softLine,
    backgroundColor: colors.surface,
  },
  trendingGroupsHeaderIcon: {
    width: 48,
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.md,
    borderRadius: 17,
    backgroundColor: '#fff0d7',
  },
  trendingGroupsKicker: {
    color: colors.coral,
    fontFamily: fonts.family,
    fontSize: 11,
    fontWeight: '900',
  },
  trendingGroupsTitle: {
    marginTop: spacing.xs,
    color: colors.ink,
    fontFamily: fonts.family,
    fontSize: 30,
    lineHeight: 36,
    fontWeight: '900',
  },
  trendingGroupsSubtitle: {
    maxWidth: 330,
    marginTop: spacing.sm,
    color: colors.muted,
    fontFamily: fonts.family,
    fontSize: 14,
    lineHeight: 20,
    fontWeight: '600',
  },
  trendingGroupsCountPill: {
    alignSelf: 'flex-start',
    minHeight: 34,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    marginTop: spacing.md,
    paddingHorizontal: spacing.md,
    borderRadius: radius.pill,
    backgroundColor: colors.purpleSoft,
  },
  trendingGroupsCountText: {
    color: colors.purple,
    fontFamily: fonts.family,
    fontSize: 12,
    fontWeight: '900',
  },
  trendingGroupsCard: {
    minHeight: 116,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    marginBottom: spacing.md,
    padding: spacing.sm,
    paddingRight: spacing.md,
    borderRadius: 19,
    borderWidth: 1,
    borderColor: colors.softLine,
    backgroundColor: colors.surface,
    ...shadow.card,
  },
  trendingGroupsCardPressed: {
    opacity: 0.78,
    transform: [{ scale: 0.99 }],
  },
  trendingGroupsImage: {
    width: 92,
    height: 92,
    borderRadius: 15,
    backgroundColor: colors.peachSoft,
  },
  trendingGroupsCardBody: {
    flex: 1,
    minWidth: 0,
  },
  trendingGroupsRankPill: {
    alignSelf: 'flex-start',
    minHeight: 22,
    justifyContent: 'center',
    marginBottom: 4,
    paddingHorizontal: spacing.sm,
    borderRadius: radius.pill,
    backgroundColor: '#fff0d7',
  },
  trendingGroupsRankText: {
    color: colors.orange,
    fontFamily: fonts.family,
    fontSize: 10,
    fontWeight: '900',
  },
  trendingGroupsCardTitle: {
    color: colors.ink,
    fontFamily: fonts.family,
    fontSize: 15,
    lineHeight: 19,
    fontWeight: '900',
  },
  trendingGroupsMetaRow: {
    minWidth: 0,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginTop: 5,
  },
  trendingGroupsMetaText: {
    flexShrink: 1,
    color: colors.muted,
    fontFamily: fonts.family,
    fontSize: 11,
    fontWeight: '700',
  },
  trendingGroupsSkeletonList: {
    gap: spacing.md,
  },
  trendingGroupsSkeletonCard: {
    minHeight: 116,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    padding: spacing.sm,
    borderRadius: 19,
    borderWidth: 1,
    borderColor: colors.softLine,
    backgroundColor: colors.surface,
  },
  trendingGroupsSkeletonImage: {
    width: 92,
    height: 92,
    borderRadius: 15,
  },
  trendingGroupsSkeletonCopy: {
    flex: 1,
    gap: spacing.sm,
  },
  trendingGroupsSkeletonTitle: {
    width: '78%',
    height: 17,
    borderRadius: 6,
  },
  trendingGroupsSkeletonMeta: {
    width: '64%',
    height: 12,
    borderRadius: 6,
  },
  trendingGroupsSkeletonShort: {
    width: '42%',
    height: 12,
    borderRadius: 6,
  },
  trendingGroupsState: {
    minHeight: 240,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.xl,
  },
  trendingGroupsStateTitle: {
    marginTop: spacing.md,
    color: colors.ink,
    fontFamily: fonts.family,
    fontSize: 18,
    fontWeight: '900',
    textAlign: 'center',
  },
  trendingGroupsStateText: {
    marginTop: spacing.sm,
    color: colors.muted,
    fontFamily: fonts.family,
    fontSize: 13,
    lineHeight: 19,
    fontWeight: '600',
    textAlign: 'center',
  },
  trendingGroupsRetryButton: {
    minHeight: 44,
    justifyContent: 'center',
    marginTop: spacing.lg,
    paddingHorizontal: spacing.xl,
    borderRadius: radius.pill,
    backgroundColor: colors.ink,
  },
  trendingGroupsRetryText: {
    color: colors.surface,
    fontFamily: fonts.family,
    fontSize: 13,
    fontWeight: '900',
  },
  trendingGroupsFooter: {
    minHeight: 62,
    alignItems: 'center',
    justifyContent: 'center',
  },
  trendingGroupsLoadMoreRetry: {
    padding: spacing.md,
  },
  trendingGroupsLoadMoreRetryText: {
    color: colors.coral,
    fontFamily: fonts.family,
    fontSize: 12,
    fontWeight: '800',
  },
  trendingGroupsEndText: {
    color: colors.muted,
    fontFamily: fonts.family,
    fontSize: 12,
    fontWeight: '700',
  },
  homeAddressModal: {
    width: '88%',
    maxWidth: 420,
    padding: spacing.lg,
    borderRadius: 24,
    backgroundColor: colors.surface,
    ...shadow.strong,
  },
  homeAddressModalTitle: {
    color: colors.ink,
    fontSize: 18,
    fontWeight: '900',
  },
  homeAddressModalBody: {
    marginTop: spacing.xs,
    color: colors.muted,
    fontSize: 12,
    lineHeight: 17,
    fontWeight: '700',
  },
  homeAddressInput: {
    minHeight: 52,
    marginTop: spacing.lg,
    paddingHorizontal: spacing.md,
    color: colors.ink,
    fontSize: 14,
    fontWeight: '800',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.line,
    backgroundColor: colors.bg,
  },
  homeAddressActions: {
    marginTop: spacing.lg,
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: spacing.sm,
  },
  homeAddressCancel: {
    minHeight: 42,
    justifyContent: 'center',
    paddingHorizontal: spacing.lg,
    borderRadius: radius.pill,
    backgroundColor: colors.bg,
  },
  homeAddressCancelText: {
    color: colors.muted,
    fontSize: 13,
    fontWeight: '900',
  },
  homeAddressSave: {
    minHeight: 42,
    justifyContent: 'center',
    paddingHorizontal: spacing.lg,
    borderRadius: radius.pill,
    backgroundColor: colors.coral,
  },
  homeAddressSaveDisabled: {
    opacity: 0.45,
  },
  homeAddressSaveText: {
    color: colors.surface,
    fontSize: 13,
    fontWeight: '900',
  },
  darkFeed: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  darkFeedContent: {
    paddingHorizontal: 16,
    paddingTop: spacing.lg,
    paddingBottom: 156,
  },
  darkFeedHero: {
    marginBottom: spacing.lg,
  },
  darkFeedKicker: {
    color: colors.coral,
    fontFamily: fonts.family,
    fontSize: 12,
    lineHeight: 16,
    fontWeight: '900',
    textTransform: 'uppercase',
  },
  darkFeedTitle: {
    marginTop: 2,
    color: colors.ink,
    fontFamily: fonts.family,
    fontSize: 25,
    lineHeight: 31,
    fontWeight: '900',
  },
  darkFeedSubtitle: {
    marginTop: 5,
    maxWidth: 310,
    color: colors.muted,
    fontFamily: fonts.family,
    fontSize: 13,
    lineHeight: 18,
    fontWeight: '700',
  },
  darkSearchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  darkSearchPill: {
    flex: 1,
    minHeight: 44,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: radius.pill,
    backgroundColor: '#f3eee9',
  },
  darkSearchText: {
    flex: 1,
    color: colors.muted,
    fontFamily: fonts.family,
    fontSize: 13,
    fontWeight: '700',
  },
  darkDateList: {
    gap: spacing.sm,
    paddingRight: 28,
    paddingBottom: spacing.lg,
  },
  darkDatePill: {
    minHeight: 36,
    justifyContent: 'center',
    paddingHorizontal: 14,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.softLine,
    backgroundColor: colors.surface,
  },
  darkDatePillActive: {
    backgroundColor: colors.coral,
    borderColor: colors.coral,
  },
  darkDateText: {
    color: colors.surface,
    fontFamily: fonts.family,
    fontSize: 12,
    fontWeight: '800',
  },
  darkDateTextMuted: {
    color: colors.ink,
  },
  darkCategoryList: {
    gap: 10,
    paddingRight: 40,
    paddingBottom: 4,
  },
  darkCategoryItem: {
    width: 70,
    minHeight: 88,
    alignItems: 'center',
    justifyContent: 'flex-start',
    gap: 7,
    paddingTop: 2,
    paddingHorizontal: 2,
    paddingBottom: 10,
  },
  darkCategoryItemActive: {
    transform: [{ translateY: -1 }],
  },
  darkCategoryIconWell: {
    width: 52,
    height: 52,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 26,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.7)',
  },
  darkCategoryIconWellActive: {
    borderWidth: 2,
    borderColor: colors.coral,
  },
  darkCategoryItemLine: {
    position: 'absolute',
    bottom: 3,
    width: 18,
    height: 3,
    borderRadius: 2,
    backgroundColor: colors.coral,
  },
  darkCategoryText: {
    color: colors.ink,
    fontFamily: fonts.family,
    fontSize: 10,
    lineHeight: 13,
    fontWeight: '800',
    textAlign: 'center',
  },
  darkCategoryTextActive: {
    color: colors.coral,
  },
  darkCategoryActiveLine: {
    width: 78,
    height: 3,
    marginTop: spacing.sm,
    marginLeft: -14,
    backgroundColor: colors.coral,
  },
  darkDivider: {
    height: 1,
    marginHorizontal: -16,
    marginBottom: spacing.lg,
    backgroundColor: colors.softLine,
  },
  darkEventList: {
    gap: spacing.lg,
  },
  darkEmptyState: {
    minHeight: 260,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.lg,
  },
  darkEmptyTitle: {
    color: colors.ink,
    fontSize: 17,
    fontWeight: '900',
    textAlign: 'center',
  },
  darkEmptyBody: {
    color: colors.muted,
    fontSize: 14,
    lineHeight: 19,
    textAlign: 'center',
  },
  darkEventCard: {
    width: '100%',
    padding: spacing.md,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colors.softLine,
    backgroundColor: colors.surface,
    ...shadow.card,
  },
  darkEventImage: {
    height: 136,
    overflow: 'hidden',
    borderRadius: 16,
  },
  darkEventImageRadius: {
    borderRadius: 16,
  },
  darkEventActions: {
    position: 'absolute',
    top: spacing.md,
    right: spacing.md,
    flexDirection: 'row',
    gap: spacing.sm,
  },
  darkIconCircle: {
    width: 34,
    height: 34,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 17,
    backgroundColor: 'rgba(255,255,255,0.92)',
    ...shadow.card,
  },
  darkEventTitle: {
    marginTop: spacing.md,
    color: colors.ink,
    fontFamily: fonts.family,
    fontSize: 17,
    lineHeight: 22,
    fontWeight: '900',
  },
  darkMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: spacing.sm,
    marginTop: spacing.sm,
  },
  darkEventMeta: {
    color: colors.muted,
    fontFamily: fonts.family,
    fontSize: 12,
    lineHeight: 17,
    fontWeight: '700',
  },
  darkOnlineBadge: {
    minWidth: 92,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: radius.pill,
    backgroundColor: colors.peachSoft,
  },
  darkOnlineDot: {
    width: 10,
    height: 8,
    marginRight: 6,
    borderRadius: 2,
    backgroundColor: colors.coral,
  },
  darkOnlineText: {
    width: 48,
    color: colors.ink,
    fontSize: 11,
    fontWeight: '900',
    textAlign: 'center',
  },
  darkGroupMeta: {
    marginTop: spacing.xs,
    color: colors.muted,
    fontFamily: fonts.family,
    fontSize: 12,
    lineHeight: 17,
    fontWeight: '700',
  },
  darkStar: {
    color: colors.brand,
  },
  darkGoingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    marginTop: spacing.md,
  },
  darkAvatarStack: {
    flexDirection: 'row',
  },
  darkGoingAvatar: {
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: -10,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.surface,
    backgroundColor: colors.peachSoft,
  },
  darkGoingAvatarAccent: {
    backgroundColor: '#dff8e8',
  },
  darkGoingAvatarText: {
    color: colors.ink,
    fontSize: 13,
    fontWeight: '900',
  },
  darkGoingText: {
    color: colors.ink,
    fontFamily: fonts.family,
    fontSize: 13,
    fontWeight: '900',
  },
  content: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.xl,
    paddingBottom: 112,
  },
  profileContent: {
    paddingTop: spacing.md,
  },
  profileTopBar: {
    minHeight: 54,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.md,
  },
  profileTopKicker: {
    color: colors.coral,
    fontFamily: fonts.family,
    fontSize: 12,
    lineHeight: 15,
    fontWeight: '900',
    textTransform: 'uppercase',
  },
  profileTopTitle: {
    marginTop: 2,
    color: colors.ink,
    fontFamily: fonts.family,
    fontSize: 27,
    lineHeight: 32,
    fontWeight: '900',
  },
  screenHeaderActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  screenHeaderButton: {
    width: 42,
    height: 42,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.softLine,
    backgroundColor: colors.surface,
    ...shadow.card,
  },
  screenHeaderButtonPrimary: {
    borderColor: '#ff8f78',
    backgroundColor: colors.coral,
  },
  screenHeaderButtonSoft: {
    borderColor: '#ded8ff',
    backgroundColor: colors.purpleSoft,
  },
  notificationsContent: {
    flexGrow: 1,
  },
  notificationHeaderIcon: {
    borderColor: '#ffe3b0',
    backgroundColor: '#fff6df',
  },
  notificationMarkAllButton: {
    minHeight: 40,
    paddingHorizontal: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: '#ded8ff',
    backgroundColor: colors.purpleSoft,
  },
  notificationMarkAllText: {
    color: colors.purple,
    fontFamily: fonts.family,
    fontSize: type.tiny,
    fontWeight: '900',
  },
  notificationList: {
    gap: spacing.sm,
  },
  notificationRow: {
    minHeight: 88,
    padding: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.softLine,
    backgroundColor: colors.surface,
  },
  notificationRowUnread: {
    borderColor: '#ffd5ca',
    backgroundColor: '#fffaf7',
  },
  notificationRowIcon: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 15,
    backgroundColor: colors.bg,
  },
  notificationRowIconUnread: {
    backgroundColor: '#fff0e8',
  },
  notificationRowCopy: {
    flex: 1,
    minWidth: 0,
  },
  notificationRowHeading: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  notificationRowTitle: {
    flex: 1,
    color: colors.ink,
    fontFamily: fonts.family,
    fontSize: type.small,
    fontWeight: '900',
  },
  notificationRowTime: {
    color: colors.muted,
    fontFamily: fonts.family,
    fontSize: type.tiny,
    fontWeight: '600',
  },
  notificationRowBody: {
    marginTop: 4,
    color: colors.muted,
    fontFamily: fonts.family,
    fontSize: type.small,
    lineHeight: 19,
    fontWeight: '500',
  },
  notificationUnreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.coral,
  },
  notificationEmptyPanel: {
    flex: 1,
    minHeight: 430,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.xxl,
    borderRadius: 28,
    borderWidth: 1,
    borderColor: colors.softLine,
    backgroundColor: colors.surface,
    ...shadow.card,
  },
  notificationEmptyIcon: {
    position: 'relative',
    width: 80,
    height: 80,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 26,
    backgroundColor: colors.purpleSoft,
  },
  notificationEmptyDot: {
    position: 'absolute',
    top: 14,
    right: 15,
    width: 12,
    height: 12,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: colors.purpleSoft,
    backgroundColor: colors.coral,
  },
  notificationEmptyKicker: {
    marginTop: spacing.xl,
    color: colors.coral,
    fontFamily: fonts.family,
    fontSize: type.tiny,
    lineHeight: 15,
    fontWeight: '900',
  },
  notificationEmptyTitle: {
    marginTop: spacing.sm,
    color: colors.ink,
    fontFamily: fonts.family,
    fontSize: type.h3,
    lineHeight: 25,
    fontWeight: '900',
    textAlign: 'center',
  },
  notificationEmptyBody: {
    maxWidth: 310,
    marginTop: spacing.sm,
    color: colors.muted,
    fontFamily: fonts.family,
    fontSize: type.small,
    lineHeight: 20,
    fontWeight: '500',
    textAlign: 'center',
  },
  notificationExploreButton: {
    minHeight: 50,
    marginTop: spacing.xl,
    paddingHorizontal: spacing.xl,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    borderRadius: radius.pill,
    backgroundColor: colors.blackButton,
    ...shadow.card,
  },
  notificationExploreButtonText: {
    color: colors.surface,
    fontFamily: fonts.family,
    fontSize: type.small,
    fontWeight: '900',
  },
  profileSummary: {
    minHeight: 82,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    padding: spacing.md,
    borderRadius: radius.lg,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.softLine,
    ...shadow.card,
  },
  flex1: {
    flex: 1,
  },
  profileSummaryName: {
    color: colors.ink,
    fontSize: type.body,
    fontWeight: '900',
  },
  mutedText: {
    color: colors.muted,
    fontSize: type.small,
    lineHeight: 19,
  },
  sectionTitleRow: {
    marginTop: spacing.xxl,
    marginBottom: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  sectionTitle: {
    color: colors.ink,
    fontSize: type.h2,
    fontWeight: '900',
  },
  sectionAction: {
    color: colors.purple,
    fontSize: type.small,
    fontWeight: '900',
  },
  horizontalList: {
    gap: spacing.lg,
    paddingRight: spacing.xl,
  },
  eventCardWrap: {
    width: '100%',
    marginBottom: spacing.xl,
  },
  eventCardHorizontal: {
    width: 300,
  },
  eventCard: {
    borderRadius: radius.lg,
  },
  eventImage: {
    height: 150,
    overflow: 'hidden',
    justifyContent: 'space-between',
    borderRadius: radius.lg,
  },
  eventImageRadius: {
    borderRadius: radius.lg,
  },
  priceBadge: {
    alignSelf: 'flex-start',
    margin: spacing.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.pill,
    backgroundColor: colors.surface,
  },
  priceBadgeText: {
    color: colors.ink,
    fontSize: type.small,
    fontWeight: '900',
  },
  cardShareButton: {
    position: 'absolute',
    top: spacing.md,
    right: spacing.md,
    width: 38,
    height: 38,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 19,
    backgroundColor: 'rgba(24, 25, 31, 0.6)',
  },
  eventTitle: {
    marginTop: spacing.md,
    color: colors.ink,
    fontSize: type.h3,
    lineHeight: 25,
    fontWeight: '900',
  },
  eventMeta: {
    marginTop: spacing.xs,
    color: colors.muted,
    fontSize: type.small,
    lineHeight: 19,
  },
  attendees: {
    marginTop: spacing.sm,
    color: colors.ink,
    fontSize: type.small,
    fontWeight: '900',
  },
  sectionBlock: {
    marginTop: spacing.xl,
  },
  sectionHeading: {
    color: colors.ink,
    fontSize: type.h3,
    fontWeight: '900',
    marginBottom: spacing.md,
  },
  sectionHeadingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.md,
    marginBottom: spacing.md,
  },
  sectionHeadingCount: {
    minWidth: 28,
    overflow: 'hidden',
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: radius.pill,
    backgroundColor: colors.peachSoft,
    color: colors.coral,
    fontFamily: fonts.family,
    fontSize: type.small,
    fontWeight: '900',
    textAlign: 'center',
  },
  creationDraftList: {
    gap: spacing.sm,
  },
  creationDraftCard: {
    flexDirection: 'row',
    gap: spacing.md,
    padding: spacing.md,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colors.softLine,
    backgroundColor: colors.surface,
    ...shadow.card,
  },
  creationDraftIcon: {
    width: 42,
    height: 42,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 15,
    backgroundColor: colors.peachSoft,
  },
  creationDraftType: {
    color: colors.purple,
    fontFamily: fonts.family,
    fontSize: 10,
    fontWeight: '900',
    textTransform: 'uppercase',
  },
  creationDraftTitle: {
    marginTop: 3,
    color: colors.ink,
    fontFamily: fonts.family,
    fontSize: type.body,
    lineHeight: 20,
    fontWeight: '900',
  },
  creationDraftMeta: {
    marginTop: 4,
    color: colors.muted,
    fontFamily: fonts.family,
    fontSize: type.small,
    fontWeight: '700',
  },
  creationDraftActions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    marginTop: spacing.sm,
  },
  creationDraftContinueButton: {
    minHeight: 34,
    justifyContent: 'center',
    paddingHorizontal: spacing.md,
    borderRadius: radius.pill,
    backgroundColor: colors.ink,
  },
  creationDraftContinueText: {
    color: colors.surface,
    fontFamily: fonts.family,
    fontSize: type.small,
    fontWeight: '900',
  },
  creationDraftRemoveButton: {
    minHeight: 34,
    justifyContent: 'center',
    paddingHorizontal: spacing.md,
    borderRadius: radius.pill,
    backgroundColor: colors.bg,
  },
  creationDraftRemoveText: {
    color: colors.muted,
    fontFamily: fonts.family,
    fontSize: type.small,
    fontWeight: '900',
  },
  creationDraftEmpty: {
    minHeight: 84,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    padding: spacing.md,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colors.softLine,
    backgroundColor: colors.surface,
  },
  creationDraftEmptyText: {
    flex: 1,
    color: colors.muted,
    fontFamily: fonts.family,
    fontSize: type.small,
    lineHeight: 18,
    fontWeight: '700',
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  chip: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.line,
    backgroundColor: colors.surface,
  },
  chipSelected: {
    borderColor: colors.purple,
    backgroundColor: colors.purple,
  },
  chipText: {
    color: colors.ink,
    fontSize: type.small,
    fontWeight: '800',
  },
  chipTextSelected: {
    color: colors.surface,
  },
  pageTitle: {
    color: colors.ink,
    fontSize: type.h1,
    lineHeight: 36,
    fontWeight: '900',
    marginBottom: spacing.lg,
  },
  inputShell: {
    minHeight: 54,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.line,
    backgroundColor: colors.surface,
  },
  input: {
    flex: 1,
    color: colors.ink,
    fontSize: type.body,
    paddingVertical: 0,
  },
  eventGrid: {
    marginTop: spacing.xl,
  },
  groupsScreenContent: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
    paddingBottom: 124,
  },
  groupsHero: {
    overflow: 'hidden',
    padding: spacing.md,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: '#ffd8c9',
    backgroundColor: '#fff0e6',
    ...shadow.strong,
  },
  groupsHeroTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.md,
  },
  groupsHeroBadge: {
    minHeight: 34,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingHorizontal: spacing.md,
    borderRadius: radius.pill,
    backgroundColor: colors.surface,
  },
  groupsHeroBadgeText: {
    color: colors.coral,
    fontFamily: fonts.family,
    fontSize: 12,
    fontWeight: '900',
    textTransform: 'uppercase',
  },
  groupsHeroIconButton: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 17,
    backgroundColor: colors.coral,
    ...shadow.card,
  },
  groupsHeroTitle: {
    marginTop: spacing.lg,
    color: colors.ink,
    fontFamily: fonts.family,
    fontSize: 34,
    lineHeight: 39,
    fontWeight: '900',
  },
  groupsHeroBody: {
    marginTop: spacing.sm,
    color: colors.text,
    fontFamily: fonts.family,
    fontSize: 14,
    lineHeight: 20,
    fontWeight: '700',
  },
  groupsHeroActions: {
    marginTop: spacing.md,
  },
  groupsPrimaryButton: {
    width: '100%',
    minHeight: 48,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.lg,
    borderRadius: radius.pill,
    backgroundColor: colors.blackButton,
  },
  groupsPrimaryButtonText: {
    color: colors.surface,
    fontFamily: fonts.family,
    fontSize: 14,
    fontWeight: '900',
  },
  groupsSecondaryButton: {
    minHeight: 48,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.lg,
    borderRadius: radius.pill,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: '#ffd8c9',
  },
  groupsSecondaryButtonText: {
    color: colors.coral,
    fontFamily: fonts.family,
    fontSize: 14,
    fontWeight: '900',
  },
  groupsHeroStats: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: spacing.lg,
  },
  groupsHeroStat: {
    flex: 1,
    minHeight: 68,
    justifyContent: 'center',
    paddingHorizontal: spacing.md,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.72)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.86)',
  },
  groupsHeroStatValue: {
    color: colors.ink,
    fontFamily: fonts.family,
    fontSize: 21,
    lineHeight: 26,
    fontWeight: '900',
  },
  groupsHeroStatLabel: {
    marginTop: 2,
    color: colors.muted,
    fontFamily: fonts.family,
    fontSize: 10,
    fontWeight: '900',
    textTransform: 'uppercase',
  },
  groupsTabs: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: spacing.lg,
    padding: 5,
    borderRadius: radius.pill,
    backgroundColor: '#f4ece5',
  },
  groupsTabButton: {
    flex: 1,
    minHeight: 46,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    borderRadius: radius.pill,
  },
  groupsTabButtonActive: {
    backgroundColor: colors.surface,
    ...shadow.card,
  },
  groupsTabText: {
    color: colors.muted,
    fontFamily: fonts.family,
    fontSize: 13,
    fontWeight: '900',
  },
  groupsTabTextActive: {
    color: colors.ink,
  },
  groupsTabCount: {
    minWidth: 24,
    height: 24,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 7,
    borderRadius: 12,
    backgroundColor: colors.surface,
  },
  groupsTabCountActive: {
    backgroundColor: '#fff0ea',
  },
  groupsTabCountText: {
    color: colors.muted,
    fontFamily: fonts.family,
    fontSize: 11,
    fontWeight: '900',
  },
  groupsTabCountTextActive: {
    color: colors.coral,
  },
  groupsListHeader: {
    minHeight: 64,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.md,
    marginTop: spacing.lg,
    marginBottom: spacing.md,
  },
  groupsListTitle: {
    color: colors.ink,
    fontFamily: fonts.family,
    fontSize: 21,
    lineHeight: 26,
    fontWeight: '900',
  },
  groupsListMeta: {
    marginTop: 2,
    color: colors.muted,
    fontFamily: fonts.family,
    fontSize: 12,
    lineHeight: 17,
    fontWeight: '700',
  },
  groupsListHeaderButton: {
    width: 42,
    height: 42,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 16,
    backgroundColor: '#fff0ea',
    borderWidth: 1,
    borderColor: '#ffd6c7',
  },
  hostGroupCard: {
    overflow: 'hidden',
    marginBottom: spacing.lg,
    borderRadius: 26,
    borderWidth: 1,
    borderColor: colors.softLine,
    backgroundColor: colors.surface,
    ...shadow.card,
  },
  hostGroupImage: {
    height: 136,
    justifyContent: 'flex-start',
  },
  hostGroupImageRadius: {
    borderTopLeftRadius: 26,
    borderTopRightRadius: 26,
  },
  hostGroupImageOverlay: {
    ...StyleSheet.absoluteFill,
    backgroundColor: 'rgba(31,41,55,0.16)',
  },
  hostGroupStatusPill: {
    alignSelf: 'flex-start',
    minHeight: 32,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    margin: spacing.md,
    paddingHorizontal: spacing.md,
    borderRadius: radius.pill,
    backgroundColor: 'rgba(255,255,255,0.94)',
  },
  hostGroupStatusText: {
    color: colors.ink,
    fontFamily: fonts.family,
    fontSize: 12,
    fontWeight: '900',
  },
  hostGroupBody: {
    padding: spacing.lg,
  },
  hostGroupName: {
    color: colors.ink,
    fontFamily: fonts.family,
    fontSize: 19,
    lineHeight: 24,
    fontWeight: '900',
  },
  hostGroupMetaRow: {
    minHeight: 23,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginTop: spacing.sm,
  },
  hostGroupMetaText: {
    flex: 1,
    color: colors.muted,
    fontFamily: fonts.family,
    fontSize: 12,
    lineHeight: 17,
    fontWeight: '800',
  },
  hostGroupTopicRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    marginTop: spacing.md,
  },
  hostGroupTopicChip: {
    paddingHorizontal: spacing.md,
    paddingVertical: 6,
    borderRadius: radius.pill,
    backgroundColor: colors.purpleSoft,
  },
  hostGroupTopicText: {
    color: colors.purple,
    fontFamily: fonts.family,
    fontSize: 11,
    fontWeight: '900',
  },
  groupsEmptyPanel: {
    minHeight: 330,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xl,
    borderRadius: 30,
    borderWidth: 1,
    borderColor: '#ffe0d3',
    backgroundColor: colors.surface,
    ...shadow.card,
  },
  groupsEmptyBurst: {
    width: 76,
    height: 76,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 26,
    backgroundColor: '#fff4d8',
    transform: [{ rotate: '8deg' }],
  },
  groupsEmptyIcon: {
    width: 76,
    height: 76,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 26,
    backgroundColor: colors.purpleSoft,
  },
  groupsEmptyTitle: {
    marginTop: spacing.lg,
    color: colors.ink,
    fontFamily: fonts.family,
    fontSize: 22,
    lineHeight: 28,
    fontWeight: '900',
    textAlign: 'center',
  },
  groupsEmptyBody: {
    marginTop: spacing.sm,
    maxWidth: 280,
    color: colors.muted,
    fontFamily: fonts.family,
    fontSize: 13,
    lineHeight: 19,
    fontWeight: '700',
    textAlign: 'center',
  },
  groupsEmptyCreateButton: {
    minHeight: 54,
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    marginTop: spacing.lg,
    paddingHorizontal: spacing.xl,
    borderRadius: radius.pill,
    backgroundColor: colors.blackButton,
  },
  groupsEmptyCreateText: {
    color: colors.surface,
    fontFamily: fonts.family,
    fontSize: 15,
    fontWeight: '900',
  },
  groupsEmptySecondaryButton: {
    minHeight: 48,
    justifyContent: 'center',
    marginTop: spacing.lg,
    paddingHorizontal: spacing.xl,
    borderRadius: radius.pill,
    backgroundColor: '#fff0ea',
    borderWidth: 1,
    borderColor: '#ffd6c7',
  },
  groupsEmptySecondaryText: {
    color: colors.coral,
    fontFamily: fonts.family,
    fontSize: 14,
    fontWeight: '900',
  },
  segmented: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginBottom: spacing.xl,
  },
  segment: {
    overflow: 'hidden',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderRadius: radius.pill,
    backgroundColor: '#ededf0',
    color: colors.ink,
    fontSize: type.small,
    fontWeight: '900',
  },
  segmentActive: {
    color: colors.surface,
    backgroundColor: colors.purple,
  },
  groupRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.softLine,
  },
  groupRowImage: {
    width: 62,
    height: 62,
    borderRadius: radius.md,
  },
  promoBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.md,
    padding: spacing.lg,
    borderRadius: radius.lg,
    backgroundColor: colors.purpleSoft,
  },
  promoTitle: {
    color: colors.ink,
    fontSize: type.body,
    fontWeight: '900',
  },
  smallDarkButton: {
    alignSelf: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderRadius: radius.pill,
    backgroundColor: colors.blackButton,
  },
  smallDarkButtonText: {
    color: colors.surface,
    fontSize: type.small,
    fontWeight: '900',
  },
  emptyState: {
    minHeight: 340,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xl,
  },
  emptyStateCompact: {
    minHeight: 180,
  },
  emptyIcon: {
    width: 92,
    height: 76,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.lg,
    backgroundColor: colors.purpleSoft,
    marginBottom: spacing.lg,
  },
  emptyTitle: {
    color: colors.ink,
    fontSize: type.body,
    fontWeight: '900',
    textAlign: 'center',
  },
  emptyBody: {
    marginTop: spacing.sm,
    marginBottom: spacing.lg,
    color: colors.muted,
    fontSize: type.small,
    lineHeight: 20,
    textAlign: 'center',
  },
  profileHero: {
    alignItems: 'center',
    padding: spacing.xl,
    borderRadius: radius.lg,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.softLine,
    ...shadow.card,
  },
  avatar: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.gold,
  },
  avatarText: {
    color: '#573300',
    fontWeight: '900',
  },
  profileName: {
    marginTop: spacing.md,
    color: colors.ink,
    fontSize: type.h2,
    fontWeight: '900',
  },
  profileLink: {
    color: colors.purple,
    fontSize: type.body,
    fontWeight: '900',
  },
  profileStats: {
    width: '100%',
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginTop: spacing.xl,
    paddingTop: spacing.lg,
    borderTopWidth: 1,
    borderTopColor: colors.softLine,
  },
  profileStat: {
    alignItems: 'center',
  },
  profileStatValue: {
    color: colors.ink,
    fontSize: type.h3,
    fontWeight: '900',
  },
  profileStatLabel: {
    color: colors.muted,
    fontSize: type.tiny,
  },
  settingsRow: {
    minHeight: 56,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.softLine,
  },
  settingsLabel: {
    flex: 1,
    color: colors.ink,
    fontSize: type.body,
    fontWeight: '600',
  },
  settingsLabelDestructive: {
    color: colors.coral,
  },
  createGroupShell: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  createGroupHeader: {
    minHeight: 66,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
  },
  createGroupProgress: {
    flexDirection: 'row',
    gap: spacing.xs,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
    paddingBottom: spacing.md,
  },
  createGroupProgressPill: {
    flex: 1,
    minHeight: 30,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.pill,
    backgroundColor: '#f2ebe5',
  },
  createGroupProgressPillActive: {
    backgroundColor: colors.coral,
  },
  createGroupProgressText: {
    color: colors.muted,
    fontFamily: fonts.family,
    fontSize: 10,
    fontWeight: '900',
  },
  createGroupProgressTextActive: {
    color: colors.surface,
  },
  createGroupContent: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
    paddingBottom: 132,
  },
  createGroupStepSkeleton: {
    paddingTop: 2,
  },
  createGroupSkeletonTitle: {
    width: '78%',
    height: 34,
    borderRadius: 17,
  },
  createGroupSkeletonHint: {
    width: '92%',
    height: 18,
    marginTop: spacing.md,
    marginBottom: spacing.lg,
    borderRadius: 9,
  },
  createGroupSkeletonInput: {
    width: '100%',
    height: 58,
    borderRadius: 22,
  },
  createGroupSkeletonChipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    marginTop: spacing.lg,
  },
  createGroupSkeletonChip: {
    width: 112,
    height: 42,
    borderRadius: radius.pill,
  },
  createGroupSkeletonPanel: {
    width: '100%',
    height: 130,
    marginTop: spacing.xl,
    borderRadius: 24,
  },
  createGroupTitle: {
    color: colors.ink,
    fontFamily: fonts.family,
    fontSize: 30,
    lineHeight: 36,
    fontWeight: '900',
  },
  createGroupHint: {
    marginTop: spacing.sm,
    marginBottom: spacing.lg,
    color: colors.muted,
    fontFamily: fonts.family,
    fontSize: 14,
    lineHeight: 20,
    fontWeight: '700',
  },
  createGroupInputShell: {
    minHeight: 58,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingHorizontal: spacing.lg,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: colors.line,
    backgroundColor: colors.surface,
  },
  createGroupInput: {
    flex: 1,
    color: colors.ink,
    fontFamily: fonts.family,
    fontSize: 16,
    fontWeight: '800',
    paddingVertical: 0,
  },
  createGroupFieldNote: {
    marginTop: spacing.sm,
    color: colors.muted,
    fontFamily: fonts.family,
    fontSize: 12,
    lineHeight: 17,
    fontWeight: '800',
  },
  createGroupInlineStatus: {
    minHeight: 52,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.sm,
  },
  createGroupErrorText: {
    marginTop: spacing.md,
    color: colors.warning,
    fontFamily: fonts.family,
    fontSize: 13,
    fontWeight: '900',
  },
  createGroupSuggestionPanel: {
    overflow: 'hidden',
    marginTop: spacing.md,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: colors.softLine,
    backgroundColor: colors.surface,
    ...shadow.card,
  },
  createGroupSuggestionRow: {
    minHeight: 62,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingHorizontal: spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: colors.softLine,
  },
  createGroupSuggestionText: {
    flex: 1,
    color: colors.ink,
    fontFamily: fonts.family,
    fontSize: 15,
    lineHeight: 20,
    fontWeight: '900',
  },
  createGroupSelectedPlace: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginTop: spacing.md,
    padding: spacing.md,
    borderRadius: 18,
    backgroundColor: '#eafff1',
  },
  createGroupSelectedPlaceText: {
    flex: 1,
    color: colors.ink,
    fontFamily: fonts.family,
    fontSize: 13,
    lineHeight: 18,
    fontWeight: '800',
  },
  createGroupTopicGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    marginTop: spacing.lg,
  },
  createTopicChip: {
    minHeight: 46,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.lg,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.line,
    backgroundColor: colors.surface,
  },
  createTopicChipSelected: {
    borderColor: colors.purple,
    backgroundColor: colors.purpleSoft,
  },
  createTopicChipText: {
    color: colors.ink,
    fontFamily: fonts.family,
    fontSize: 14,
    fontWeight: '900',
  },
  createTopicChipTextSelected: {
    color: colors.purple,
  },
  templateButton: {
    alignSelf: 'flex-start',
    minHeight: 46,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.md,
    paddingHorizontal: spacing.lg,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: '#d8d2ff',
    backgroundColor: colors.purpleSoft,
  },
  templateButtonText: {
    color: colors.purple,
    fontFamily: fonts.family,
    fontSize: 14,
    fontWeight: '900',
  },
  createGroupTextarea: {
    minHeight: 190,
    padding: spacing.lg,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: colors.line,
    backgroundColor: colors.surface,
    lineHeight: 23,
  },
  createGroupReviewCard: {
    overflow: 'hidden',
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.softLine,
    backgroundColor: colors.surface,
    ...shadow.card,
  },
  createGroupReviewImage: {
    width: '100%',
    height: 150,
  },
  createGroupReviewRow: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.softLine,
  },
  createGroupReviewLabel: {
    color: colors.coral,
    fontFamily: fonts.family,
    fontSize: 11,
    fontWeight: '900',
    textTransform: 'uppercase',
  },
  createGroupReviewValue: {
    marginTop: 4,
    color: colors.ink,
    fontFamily: fonts.family,
    fontSize: 14,
    lineHeight: 20,
    fontWeight: '800',
  },
  createEventSelectButton: {
    minHeight: 72,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingHorizontal: spacing.lg,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: colors.line,
    backgroundColor: colors.surface,
  },
  createEventSelectLabel: {
    color: colors.muted,
    fontFamily: fonts.family,
    fontSize: 11,
    fontWeight: '900',
    textTransform: 'uppercase',
  },
  createEventSelectValue: {
    marginTop: 2,
    color: colors.ink,
    fontFamily: fonts.family,
    fontSize: 17,
    fontWeight: '900',
  },
  createEventDropdown: {
    overflow: 'hidden',
    marginTop: spacing.md,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: colors.softLine,
    backgroundColor: colors.surface,
    ...shadow.card,
  },
  createEventDropdownOption: {
    minHeight: 74,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.softLine,
  },
  createEventDropdownOptionActive: {
    backgroundColor: colors.purpleSoft,
  },
  createEventDropdownTitle: {
    color: colors.ink,
    fontFamily: fonts.family,
    fontSize: 15,
    fontWeight: '900',
  },
  createEventDropdownNote: {
    marginTop: 4,
    color: colors.muted,
    fontFamily: fonts.family,
    fontSize: 12,
    lineHeight: 17,
    fontWeight: '700',
  },
  createEventInfoCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.md,
    marginTop: spacing.lg,
    padding: spacing.lg,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: '#eadfff',
    backgroundColor: colors.purpleSoft,
  },
  createEventInfoText: {
    flex: 1,
    color: colors.ink,
    fontFamily: fonts.family,
    fontSize: 13,
    lineHeight: 19,
    fontWeight: '800',
  },
  createEventConsentCard: {
    minHeight: 84,
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.md,
    marginTop: spacing.lg,
    padding: spacing.lg,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: '#eadfff',
    backgroundColor: colors.purpleSoft,
  },
  createEventConsentBox: {
    width: 24,
    height: 24,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 8,
    borderWidth: 2,
    borderColor: colors.purple,
    backgroundColor: colors.surface,
  },
  createEventConsentBoxActive: {
    backgroundColor: colors.purple,
  },
  createEventConsentText: {
    flex: 1,
    color: colors.ink,
    fontFamily: fonts.family,
    fontSize: 13,
    lineHeight: 19,
    fontWeight: '800',
  },
  createEventTermsLink: {
    color: colors.purple,
    fontFamily: fonts.family,
    fontSize: 13,
    lineHeight: 19,
    fontWeight: '900',
    textDecorationLine: 'underline',
  },
  createEventVerifiedRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    marginBottom: spacing.lg,
  },
  createEventVerifiedPill: {
    minHeight: 34,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingHorizontal: spacing.md,
    borderRadius: radius.pill,
    backgroundColor: '#eafff1',
  },
  createEventVerifiedText: {
    color: colors.ink,
    fontFamily: fonts.family,
    fontSize: 12,
    fontWeight: '900',
  },
  createEventCheckCard: {
    gap: spacing.md,
    padding: spacing.lg,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: colors.softLine,
    backgroundColor: colors.surface,
    ...shadow.card,
  },
  createEventCheckTitle: {
    color: colors.ink,
    fontFamily: fonts.family,
    fontSize: 18,
    fontWeight: '900',
  },
  createEventStack: {
    gap: spacing.md,
  },
  createEventToggleRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: spacing.lg,
  },
  createEventToggleButton: {
    flex: 1,
    minHeight: 48,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.line,
    backgroundColor: colors.surface,
  },
  createEventToggleButtonActive: {
    borderColor: colors.coral,
    backgroundColor: colors.coral,
  },
  createEventToggleText: {
    color: colors.ink,
    fontFamily: fonts.family,
    fontSize: 13,
    fontWeight: '900',
  },
  createEventToggleTextActive: {
    color: colors.surface,
  },
  createGroupFooter: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: spacing.lg,
    borderTopWidth: 1,
    borderTopColor: colors.softLine,
    backgroundColor: 'rgba(255,248,240,0.96)',
  },
  createGroupBackButton: {
    minHeight: 52,
    minWidth: 92,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.lg,
    borderRadius: radius.pill,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.line,
  },
  createGroupBackButtonText: {
    color: colors.ink,
    fontFamily: fonts.family,
    fontSize: 14,
    fontWeight: '900',
  },
  createGroupNextButton: {
    flex: 1,
    minHeight: 52,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.lg,
    borderRadius: radius.pill,
    backgroundColor: colors.blackButton,
  },
  createGroupNextButtonDisabled: {
    opacity: 0.42,
  },
  createGroupNextButtonText: {
    color: colors.surface,
    fontFamily: fonts.family,
    fontSize: 15,
    fontWeight: '900',
  },
  bottomTabs: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 30,
    elevation: 12,
    minHeight: 78,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    paddingTop: 8,
    paddingBottom: 10,
    backgroundColor: 'rgba(255,255,255,0.96)',
    borderTopWidth: 1,
    borderTopColor: colors.softLine,
  },
  tabItem: {
    flex: 1,
    minWidth: 58,
    alignItems: 'center',
    gap: 4,
  },
  tabItemPrimary: {
    justifyContent: 'center',
  },
  tabIconWrap: {
    position: 'relative',
    width: 34,
    height: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabUnreadBadge: {
    position: 'absolute',
    top: -7,
    right: -8,
    minWidth: 19,
    height: 19,
    overflow: 'hidden',
    paddingHorizontal: 4,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: colors.surface,
    backgroundColor: colors.coral,
    color: colors.surface,
    fontFamily: fonts.bold,
    fontSize: 9,
    lineHeight: 15,
    fontWeight: '900',
    textAlign: 'center',
  },
  tabPrimaryButton: {
    width: 52,
    height: 52,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 26,
    backgroundColor: colors.coral,
    ...shadow.strong,
  },
  tabLabel: {
    color: '#a98f82',
    maxWidth: 54,
    textAlign: 'center',
    fontSize: 9,
    fontWeight: '800',
  },
  tabLabelActive: {
    color: colors.coral,
  },
  authScreen: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  authStepTransition: {
    flex: 1,
    width: '100%',
  },
  authKeyboardFrame: {
    flex: 1,
    width: '100%',
  },
  authStandaloneScreen: {
    width: '100%',
  },
  authTextureTop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 374,
    overflow: 'hidden',
    backgroundColor: colors.bg,
  },
  authTextureImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  authTextureStrokeOne: {
    position: 'absolute',
    width: 460,
    height: 140,
    left: -120,
    top: 44,
    borderRadius: 90,
    backgroundColor: 'rgba(255,255,255,0.12)',
    transform: [{ rotate: '-16deg' }],
  },
  authTextureStrokeTwo: {
    position: 'absolute',
    width: 470,
    height: 168,
    right: -120,
    top: 94,
    borderRadius: 96,
    backgroundColor: 'rgba(22,20,34,0.24)',
    transform: [{ rotate: '18deg' }],
  },
  authTextureStrokeThree: {
    position: 'absolute',
    width: 330,
    height: 110,
    left: 50,
    bottom: 40,
    borderRadius: 70,
    backgroundColor: 'rgba(255,255,255,0.11)',
    transform: [{ rotate: '10deg' }],
  },
  authTextureStrokeFour: {
    position: 'absolute',
    width: 260,
    height: 88,
    right: 26,
    bottom: 92,
    borderRadius: 54,
    backgroundColor: 'rgba(255,255,255,0.08)',
    transform: [{ rotate: '-13deg' }],
  },
  authBottomShade: {
    position: 'absolute',
    top: 356,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(255,255,255,0.82)',
    borderTopLeftRadius: 72,
    borderTopRightRadius: 72,
  },
  authDoodleChat: {
    position: 'absolute',
    top: 168,
    left: 86,
    zIndex: 5,
    transform: [{ rotate: '-11deg' }],
  },
  authDoodleSparkle: {
    position: 'absolute',
    top: 180,
    right: 82,
    zIndex: 5,
    transform: [{ rotate: '4deg' }],
  },
  authDoodleMusic: {
    position: 'absolute',
    top: 300,
    left: 30,
    zIndex: 5,
    transform: [{ rotate: '-8deg' }],
  },
  authDoodleUser: {
    position: 'absolute',
    top: 306,
    right: 56,
    zIndex: 5,
  },
  authClose: {
    position: 'absolute',
    right: spacing.xl,
    zIndex: 10,
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 22,
    borderWidth: 1,
    borderColor: colors.softLine,
    backgroundColor: 'rgba(255,255,255,0.88)',
  },
  authEntryContent: {
    flex: 1,
    paddingHorizontal: 24,
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: 62,
  },
  authLogoWrap: {
    position: 'absolute',
    top: 14,
    left: 0,
    right: 0,
    zIndex: 4,
    alignItems: 'center',
  },
  authBrandRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    minHeight: 44,
    width: 214,
    paddingHorizontal: spacing.sm,
  },
  authLogoMark: {
    width: 34,
    height: 34,
    borderRadius: 12,
    resizeMode: 'cover',
  },
  authBrandText: {
    color: colors.ink,
    fontSize: 23,
    lineHeight: 34,
    fontWeight: '900',
    minWidth: 108,
    textAlign: 'left',
    includeFontPadding: true,
  },
  authHeroStage: {
    alignSelf: 'center',
    width: '100%',
    maxWidth: 282,
    aspectRatio: 1.0,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 10,
    marginBottom: 24,
  },
  authPurpleBlob: {
    position: 'absolute',
    width: '80%',
    height: '70%',
    top: '13%',
    left: '10%',
    borderRadius: 96,
    backgroundColor: 'rgba(107,92,255,0.18)',
    transform: [{ rotate: '-7deg' }],
    zIndex: 1,
  },
  authPinkBlob: {
    position: 'absolute',
    width: '78%',
    height: '40%',
    right: 8,
    bottom: 40,
    borderRadius: 74,
    backgroundColor: 'rgba(255,46,122,0.16)',
    opacity: 1,
    transform: [{ rotate: '7deg' }],
  },
  authPeopleCluster: {
    position: 'absolute',
    width: '110%',
    height: '84%',
    left: '-5%',
    bottom: 6,
    resizeMode: 'contain',
    zIndex: 3,
  },
  authScribbleOne: {
    position: 'absolute',
    left: 14,
    top: 26,
    width: 46,
    height: 46,
    borderTopWidth: 4,
    borderLeftWidth: 4,
    borderColor: 'rgba(255,92,61,0.24)',
    borderRadius: 32,
    transform: [{ rotate: '-24deg' }],
  },
  authScribbleTwo: {
    position: 'absolute',
    right: 18,
    bottom: 18,
    width: 54,
    height: 22,
    borderBottomWidth: 4,
    borderColor: 'rgba(255,186,0,0.28)',
    borderRadius: 24,
    transform: [{ rotate: '14deg' }],
  },
  authEntryTitle: {
    width: '100%',
    color: colors.ink,
    fontSize: 27,
    lineHeight: 38,
    fontWeight: '900',
    textAlign: 'center',
    marginBottom: 20,
    maxWidth: '100%',
    includeFontPadding: true,
  },
  authActionStack: {
    width: '100%',
    gap: 10,
  },
  authSocialButton: {
    minHeight: 58,
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.md,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.softLine,
    backgroundColor: colors.surface,
    ...shadow.card,
  },
  authSocialButtonText: {
    color: colors.ink,
    fontSize: 16,
    lineHeight: 23,
    fontWeight: '900',
    minWidth: 214,
    textAlign: 'center',
    includeFontPadding: true,
  },
  authDividerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    marginVertical: 7,
  },
  authDividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: colors.line,
  },
  authDividerLabel: {
    color: colors.muted,
    fontSize: 15,
    lineHeight: 22,
    minWidth: 28,
    textAlign: 'center',
    includeFontPadding: true,
  },
  authEmailSignupButton: {
    minHeight: 58,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderRadius: radius.pill,
    backgroundColor: colors.coral,
    ...shadow.card,
  },
  authEmailSignupText: {
    color: colors.surface,
    fontSize: 16,
    lineHeight: 23,
    fontWeight: '900',
    minWidth: 194,
    textAlign: 'center',
    includeFontPadding: true,
  },
  authEmailLoginLink: {
    alignSelf: 'center',
    minHeight: 38,
    justifyContent: 'center',
    paddingTop: 8,
    paddingBottom: 2,
  },
  authEmailLoginText: {
    color: colors.ink,
    fontSize: 16,
    lineHeight: 24,
    fontWeight: '800',
    minWidth: 154,
    textAlign: 'center',
    textDecorationLine: 'underline',
    includeFontPadding: true,
  },
  authEmailScroll: {
    flex: 1,
  },
  authEmailContent: {
    minHeight: '100%',
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.xxl,
    paddingBottom: spacing.xxl,
    justifyContent: 'center',
  },
  authSignupContent: {
    justifyContent: 'flex-start',
    paddingTop: 88,
  },
  authBackButton: {
    position: 'absolute',
    top: spacing.xl,
    left: spacing.xl,
    zIndex: 11,
    minWidth: 92,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  authBackText: {
    color: colors.ink,
    fontSize: 15,
    lineHeight: 22,
    fontWeight: '800',
    minWidth: 48,
    includeFontPadding: true,
  },
  authEmailLogo: {
    alignSelf: 'center',
    marginBottom: spacing.xl,
  },
  authEmailTitle: {
    color: colors.ink,
    fontSize: 32,
    lineHeight: 44,
    fontWeight: '900',
    textAlign: 'center',
    marginBottom: spacing.md,
    includeFontPadding: true,
  },
  authHelperText: {
    color: colors.muted,
    fontSize: 15,
    lineHeight: 22,
    textAlign: 'center',
    marginBottom: spacing.xl,
    includeFontPadding: true,
  },
  authLabel: {
    color: colors.ink,
    fontSize: 14,
    lineHeight: 20,
    fontWeight: '900',
    marginBottom: spacing.sm,
    includeFontPadding: true,
  },
  authInputShell: {
    minHeight: 58,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingHorizontal: spacing.lg,
    marginBottom: spacing.lg,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.softLine,
    backgroundColor: colors.surface,
    elevation: 0,
    shadowOpacity: 0,
    shadowRadius: 0,
    shadowOffset: { width: 0, height: 0 },
  },
  authInput: {
    flex: 1,
    color: colors.ink,
    fontSize: 16,
    lineHeight: 22,
    paddingVertical: 0,
    includeFontPadding: true,
  },
  passwordVisibilityButton: {
    width: 34,
    height: 34,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 17,
  },
  passwordVisibilityButtonPressed: {
    backgroundColor: '#fff0ea',
  },
  authOtpInput: {
    letterSpacing: 6,
    fontWeight: '900',
  },
  authDarkPrimaryButton: {
    minHeight: 58,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderRadius: radius.pill,
    backgroundColor: colors.coral,
    marginTop: spacing.sm,
    ...shadow.strong,
  },
  authDarkPrimaryText: {
    color: colors.surface,
    fontSize: 16,
    lineHeight: 23,
    fontWeight: '900',
    minWidth: 260,
    textAlign: 'center',
    includeFontPadding: true,
  },
  authForgotLink: {
    alignSelf: 'center',
    color: colors.brand,
    fontSize: 15,
    lineHeight: 22,
    fontWeight: '900',
    minWidth: 156,
    textAlign: 'center',
    marginTop: spacing.lg,
    marginBottom: spacing.sm,
    includeFontPadding: true,
  },
  authFooterMuted: {
    flexShrink: 0,
    width: 148,
    color: colors.muted,
    fontSize: 15,
    lineHeight: 22,
    textAlign: 'right',
    includeFontPadding: true,
  },
  authFooterMutedWide: {
    width: 214,
  },
  authFooterLinkButton: {
    flexShrink: 0,
    width: 96,
    marginLeft: 5,
  },
  authFooterLinkButtonWide: {
    width: 116,
  },
  authFooterLink: {
    flexShrink: 0,
    color: colors.brand,
    fontSize: 15,
    lineHeight: 22,
    fontWeight: '900',
    textAlign: 'left',
    includeFontPadding: true,
  },
  authFooterLinkDisabled: {
    color: colors.muted,
    opacity: 0.55,
  },
  authSuggestionPanel: {
    marginTop: -spacing.sm,
    marginBottom: spacing.md,
    borderRadius: radius.lg,
    overflow: 'hidden',
    backgroundColor: 'rgba(255,255,255,0.7)',
  },
  authSuggestionRow: {
    minHeight: 62,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.softLine,
  },
  authSuggestionCopy: {
    flex: 1,
  },
  authSuggestionTitle: {
    color: colors.ink,
    fontSize: 15,
    lineHeight: 21,
    fontWeight: '900',
    includeFontPadding: true,
  },
  authSuggestionDetail: {
    marginTop: 2,
    color: colors.muted,
    fontSize: 12,
    lineHeight: 17,
    includeFontPadding: true,
  },
  authSuggestionState: {
    minHeight: 42,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
  },
  authSuggestionStateText: {
    flex: 1,
    color: colors.muted,
    fontSize: 12,
    lineHeight: 18,
    includeFontPadding: true,
  },
  authCheckboxRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    marginTop: spacing.xs,
    marginBottom: spacing.md,
  },
  authCheckbox: {
    width: 26,
    height: 26,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 13,
    borderWidth: 2,
    borderColor: colors.line,
    backgroundColor: colors.surface,
  },
  authCheckboxActive: {
    borderColor: colors.coral,
    backgroundColor: colors.coral,
  },
  authCheckboxText: {
    flex: 1,
    color: colors.ink,
    fontSize: 14,
    lineHeight: 21,
    fontWeight: '800',
    includeFontPadding: true,
  },
  modalBackdrop: {
    flex: 1,
    justifyContent: 'center',
    backgroundColor: 'rgba(17, 19, 26, 0.42)',
    padding: spacing.lg,
  },
  authCard: {
    padding: spacing.xl,
    borderRadius: radius.lg,
    backgroundColor: colors.surface,
    ...shadow.strong,
  },
  modalClose: {
    position: 'absolute',
    top: spacing.lg,
    right: spacing.lg,
    zIndex: 2,
  },
  modalTitle: {
    marginBottom: spacing.xl,
    color: colors.ink,
    fontSize: type.h1,
    fontWeight: '900',
    textAlign: 'center',
  },
  label: {
    marginTop: spacing.md,
    marginBottom: spacing.sm,
    color: colors.ink,
    fontSize: type.small,
    fontWeight: '900',
  },
  dividerText: {
    marginVertical: spacing.lg,
    color: colors.muted,
    fontSize: type.body,
    textAlign: 'center',
  },
  googleButton: {
    minHeight: 54,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.md,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.line,
    backgroundColor: colors.surface,
  },
  googleMark: {
    color: '#4285f4',
    fontSize: type.h3,
    fontWeight: '900',
  },
  googleButtonText: {
    color: colors.text,
    fontSize: type.body,
    fontWeight: '900',
  },
  authFooter: {
    width: '100%',
    marginTop: spacing.lg,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.md,
  },
  devLoginButton: {
    marginTop: spacing.md,
    minHeight: 42,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.pill,
    backgroundColor: colors.purpleSoft,
    borderWidth: 1,
    borderColor: '#e2d7ff',
  },
  devLoginText: {
    color: colors.purple,
    fontSize: type.small,
    fontWeight: '800',
  },
  eventDetail: {
    maxHeight: '92%',
    overflow: 'hidden',
    borderRadius: radius.lg,
    backgroundColor: colors.surface,
  },
  eventDetailImage: {
    height: 230,
  },
  eventDetailImageRadius: {
    borderTopLeftRadius: radius.lg,
    borderTopRightRadius: radius.lg,
  },
  floatingClose: {
    position: 'absolute',
    top: spacing.lg,
    right: spacing.lg,
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 20,
    backgroundColor: 'rgba(17, 19, 26, 0.55)',
  },
  floatingShare: {
    position: 'absolute',
    right: spacing.lg,
    bottom: spacing.lg,
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 20,
    backgroundColor: 'rgba(17, 19, 26, 0.55)',
  },
  eventDetailBody: {
    padding: spacing.xl,
  },
  bodyText: {
    color: colors.text,
    fontSize: type.body,
    lineHeight: 23,
  },
  eventAttendeesScreen: {
    flex: 1,
    paddingHorizontal: spacing.lg,
    backgroundColor: colors.bg,
  },
  eventAttendeesHeader: {
    minHeight: 72,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  eventAttendeesBackButton: {
    width: 42,
    height: 42,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.softLine,
    backgroundColor: colors.surface,
  },
  eventAttendeesHeaderSpacer: {
    width: 4,
  },
  eventAttendeesHeaderCopy: {
    flex: 1,
    minWidth: 0,
  },
  eventAttendeesKicker: {
    color: colors.coral,
    fontFamily: fonts.family,
    fontSize: 10,
    lineHeight: 14,
    fontWeight: '900',
  },
  eventAttendeesTitle: {
    marginTop: 2,
    color: colors.ink,
    fontFamily: fonts.family,
    fontSize: 24,
    lineHeight: 30,
    fontWeight: '900',
  },
  eventAttendeesCountBadge: {
    minWidth: 42,
    height: 42,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.sm,
    borderRadius: 16,
    backgroundColor: colors.peachSoft,
  },
  eventAttendeesCountText: {
    color: colors.coral,
    fontFamily: fonts.family,
    fontSize: 15,
    fontWeight: '900',
  },
  eventAttendeesEventTitle: {
    marginTop: spacing.xs,
    paddingBottom: spacing.lg,
    color: colors.text,
    fontFamily: fonts.family,
    fontSize: 13,
    lineHeight: 19,
    fontWeight: '700',
    borderBottomWidth: 1,
    borderBottomColor: colors.softLine,
  },
  eventAttendeesList: {
    paddingTop: spacing.sm,
  },
  eventAttendeeRow: {
    minHeight: 78,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.softLine,
  },
  eventAttendeeAvatar: {
    width: 52,
    height: 52,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 20,
    backgroundColor: colors.purpleSoft,
  },
  eventAttendeeAvatarImage: {
    width: '100%',
    height: '100%',
  },
  eventAttendeeAvatarText: {
    color: colors.purple,
    fontFamily: fonts.family,
    fontSize: 16,
    fontWeight: '900',
  },
  eventAttendeeName: {
    color: colors.ink,
    fontFamily: fonts.family,
    fontSize: 15,
    lineHeight: 20,
    fontWeight: '900',
  },
  eventAttendeeMeta: {
    marginTop: 2,
    color: colors.muted,
    fontFamily: fonts.family,
    fontSize: 12,
    lineHeight: 17,
    fontWeight: '700',
  },
  eventAttendeesStatus: {
    flex: 1,
    minHeight: 260,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    padding: spacing.xl,
  },
  eventAttendeesStatusText: {
    color: colors.muted,
    fontFamily: fonts.family,
    fontSize: 13,
    lineHeight: 19,
    fontWeight: '700',
    textAlign: 'center',
  },
  eventAttendeesErrorText: {
    color: colors.warning,
    fontFamily: fonts.family,
    fontSize: 13,
    lineHeight: 19,
    fontWeight: '800',
    textAlign: 'center',
  },
  eventAttendeesRetryText: {
    color: colors.coral,
    fontFamily: fonts.family,
    fontSize: 12,
    fontWeight: '900',
  },
  eventAttendeesEmptyTitle: {
    color: colors.ink,
    fontFamily: fonts.family,
    fontSize: 17,
    lineHeight: 22,
    fontWeight: '900',
  },
  eventDetailScreen: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  eventDetailContent: {
    paddingBottom: 150,
  },
  eventDetailHeroImage: {
    height: 270,
    justifyContent: 'flex-start',
  },
  eventDetailHeroRadius: {
    borderBottomLeftRadius: 28,
    borderBottomRightRadius: 28,
  },
  eventDetailTopActions: {
    minHeight: 58,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
  },
  eventDetailActionCluster: {
    marginLeft: 'auto',
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  eventDetailHeroMeta: {
    position: 'absolute',
    left: spacing.lg,
    right: spacing.lg,
    bottom: spacing.lg,
    gap: spacing.xs,
    padding: spacing.md,
    borderRadius: 20,
    backgroundColor: 'rgba(31,41,55,0.62)',
  },
  eventDetailHeroMetaRow: {
    minHeight: 22,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  eventDetailHeroMetaText: {
    flex: 1,
    color: colors.surface,
    fontFamily: fonts.family,
    fontSize: 12,
    lineHeight: 16,
    fontWeight: '900',
    includeFontPadding: true,
  },
  eventDetailRoundButton: {
    width: 42,
    height: 42,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.72)',
    backgroundColor: 'rgba(255,255,255,0.9)',
    ...shadow.card,
  },
  eventDetailRoundButtonActive: {
    borderColor: '#ffb6ca',
    backgroundColor: colors.brand,
  },
  eventDetailBodyScreen: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.xl,
  },
  eventDetailTitle: {
    color: colors.ink,
    fontFamily: fonts.family,
    fontSize: 28,
    lineHeight: 34,
    fontWeight: '900',
    includeFontPadding: true,
  },
  eventDetailMetaPanel: {
    marginTop: spacing.md,
    gap: spacing.sm,
    padding: spacing.md,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colors.softLine,
    backgroundColor: colors.surface,
    ...shadow.card,
  },
  eventDetailMetaRow: {
    minHeight: 26,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  eventDetailMetaText: {
    flex: 1,
    color: colors.text,
    fontFamily: fonts.family,
    fontSize: 13,
    lineHeight: 18,
    fontWeight: '800',
    includeFontPadding: true,
  },
  eventDetailDescription: {
    marginTop: spacing.lg,
    color: colors.text,
    fontFamily: fonts.family,
    fontSize: 15,
    lineHeight: 23,
    fontWeight: '600',
    includeFontPadding: true,
  },
  eventDetailSection: {
    marginTop: spacing.xxl,
  },
  eventDetailSectionHeader: {
    minHeight: 30,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.md,
    marginBottom: spacing.md,
  },
  eventDetailSectionTitle: {
    flex: 1,
    color: colors.ink,
    fontFamily: fonts.family,
    fontSize: 19,
    lineHeight: 24,
    fontWeight: '900',
    includeFontPadding: true,
  },
  eventDetailSectionAction: {
    color: colors.coral,
    fontFamily: fonts.family,
    fontSize: 12,
    lineHeight: 16,
    fontWeight: '900',
    includeFontPadding: true,
  },
  attendeeInsightCard: {
    minHeight: 92,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    padding: spacing.md,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: colors.softLine,
    backgroundColor: colors.surface,
    ...shadow.card,
  },
  attendeeAvatarStackLarge: {
    width: 96,
    flexDirection: 'row',
  },
  attendeeAvatarLarge: {
    width: 38,
    height: 38,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 19,
    borderWidth: 2,
    borderColor: colors.surface,
    backgroundColor: colors.peachSoft,
  },
  attendeeAvatarLargeOverlap: {
    marginLeft: -16,
  },
  attendeeAvatarText: {
    color: colors.ink,
    fontFamily: fonts.family,
    fontSize: 13,
    fontWeight: '900',
  },
  attendeeAvatarImageLarge: {
    width: '100%',
    height: '100%',
    borderRadius: 19,
  },
  eventAttendBar: {
    position: 'absolute',
    left: spacing.md,
    right: spacing.md,
    bottom: 0,
    minHeight: 82,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingHorizontal: spacing.md,
    paddingTop: spacing.md,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderWidth: 1,
    borderBottomWidth: 0,
    borderColor: colors.line,
    backgroundColor: colors.surface,
    ...shadow.strong,
  },
  eventAttendSummary: {
    flex: 1,
    minWidth: 0,
  },
  eventAttendPrice: {
    color: colors.ink,
    fontFamily: fonts.bold,
    fontSize: 15,
    lineHeight: 20,
  },
  eventAttendSpots: {
    marginTop: 2,
    color: colors.coral,
    fontFamily: fonts.semibold,
    fontSize: 11,
    lineHeight: 15,
  },
  eventAttendButton: {
    minWidth: 164,
    minHeight: 50,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.lg,
    borderRadius: radius.pill,
    backgroundColor: colors.blackButton,
  },
  eventAttendButtonDisabled: {
    opacity: 0.48,
  },
  eventAttendButtonText: {
    color: colors.surface,
    fontFamily: fonts.bold,
    fontSize: 14,
    lineHeight: 19,
  },
  paymentSheetOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(31,41,55,0.42)',
  },
  paymentSheet: {
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.sm,
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
    backgroundColor: colors.surface,
  },
  paymentSheetHandle: {
    alignSelf: 'center',
    width: 44,
    height: 5,
    borderRadius: radius.pill,
    backgroundColor: colors.line,
  },
  paymentSheetHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    marginTop: spacing.lg,
    marginBottom: spacing.xl,
  },
  paymentSheetIcon: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 16,
    backgroundColor: colors.pinkSoft,
  },
  paymentSheetTitle: {
    color: colors.ink,
    fontFamily: fonts.bold,
    fontSize: 20,
    lineHeight: 25,
  },
  paymentSheetAmount: {
    marginTop: 2,
    color: colors.coral,
    fontFamily: fonts.semibold,
    fontSize: 13,
    lineHeight: 18,
  },
  paymentSheetClose: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 15,
    backgroundColor: colors.cream,
  },
  paymentSheetLabel: {
    marginBottom: spacing.sm,
    color: colors.ink,
    fontFamily: fonts.semibold,
    fontSize: 13,
    lineHeight: 18,
  },
  paymentPhoneField: {
    minHeight: 56,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: 18,
    backgroundColor: colors.bg,
  },
  paymentPhonePrefix: {
    paddingHorizontal: spacing.md,
    color: colors.ink,
    fontFamily: fonts.semibold,
    fontSize: 15,
  },
  paymentPhoneInput: {
    flex: 1,
    minHeight: 54,
    paddingHorizontal: spacing.md,
    borderLeftWidth: 1,
    borderLeftColor: colors.line,
    color: colors.ink,
    fontFamily: fonts.medium,
    fontSize: 15,
  },
  paymentSheetNote: {
    marginTop: spacing.md,
    color: colors.muted,
    fontFamily: fonts.regular,
    fontSize: 11,
    lineHeight: 17,
  },
  paymentContinueButton: {
    minHeight: 54,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: spacing.xl,
    borderRadius: radius.pill,
    backgroundColor: colors.brand,
  },
  paymentContinueText: {
    color: colors.surface,
    fontFamily: fonts.bold,
    fontSize: 14,
    lineHeight: 19,
  },
  attendeeInsightCopy: {
    flex: 1,
    minWidth: 0,
  },
  attendeeInsightTitle: {
    color: colors.ink,
    fontFamily: fonts.family,
    fontSize: 15,
    lineHeight: 20,
    fontWeight: '900',
    includeFontPadding: true,
  },
  attendeeInsightText: {
    marginTop: 3,
    color: colors.muted,
    fontFamily: fonts.family,
    fontSize: 12,
    lineHeight: 17,
    fontWeight: '700',
    includeFontPadding: true,
  },
  commentInputRow: {
    minHeight: 54,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: colors.softLine,
    backgroundColor: colors.surface,
  },
  commentAvatar: {
    width: 34,
    height: 34,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 17,
    backgroundColor: colors.peachSoft,
  },
  commentReplyAvatar: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: colors.purpleSoft,
  },
  commentAvatarText: {
    color: colors.ink,
    fontFamily: fonts.family,
    fontSize: 13,
    fontWeight: '900',
  },
  commentAvatarImage: {
    width: '100%',
    height: '100%',
    borderRadius: 17,
  },
  commentInput: {
    flex: 1,
    minHeight: 40,
    color: colors.ink,
    fontFamily: fonts.family,
    fontSize: 13,
    fontWeight: '700',
    paddingVertical: 0,
  },
  commentSendButton: {
    width: 34,
    height: 34,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 14,
    backgroundColor: colors.coral,
  },
  commentSendButtonDisabled: {
    opacity: 0.42,
  },
  commentReplyingRow: {
    minHeight: 32,
    marginTop: spacing.sm,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.md,
    paddingHorizontal: spacing.sm,
  },
  commentReplyingText: {
    flex: 1,
    color: colors.muted,
    fontFamily: fonts.family,
    fontSize: 12,
    lineHeight: 16,
    fontWeight: '700',
  },
  commentReplyingCancel: {
    color: colors.coral,
    fontFamily: fonts.family,
    fontSize: 12,
    lineHeight: 16,
    fontWeight: '900',
  },
  commentStatusRow: {
    minHeight: 64,
    marginTop: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    padding: spacing.md,
  },
  commentStatusText: {
    color: colors.muted,
    fontFamily: fonts.family,
    fontSize: 12,
    fontWeight: '700',
  },
  commentErrorText: {
    color: colors.warning,
    fontFamily: fonts.family,
    fontSize: 12,
    lineHeight: 18,
    fontWeight: '700',
    textAlign: 'center',
  },
  commentEmptyState: {
    minHeight: 112,
    marginTop: spacing.md,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.lg,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.softLine,
    backgroundColor: colors.surface,
  },
  commentEmptyTitle: {
    marginTop: spacing.sm,
    color: colors.ink,
    fontFamily: fonts.family,
    fontSize: 14,
    lineHeight: 19,
    fontWeight: '900',
  },
  commentEmptyText: {
    marginTop: 2,
    color: colors.muted,
    fontFamily: fonts.family,
    fontSize: 12,
    lineHeight: 17,
    fontWeight: '600',
    textAlign: 'center',
  },
  commentThread: {
    marginTop: spacing.md,
    gap: spacing.sm,
  },
  commentRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
  },
  commentReplyRow: {
    marginLeft: 34,
  },
  commentBubble: {
    flex: 1,
    minWidth: 0,
    padding: spacing.md,
    borderRadius: 18,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.softLine,
  },
  commentName: {
    color: colors.ink,
    fontFamily: fonts.family,
    fontSize: 13,
    lineHeight: 17,
    fontWeight: '900',
  },
  commentBody: {
    marginTop: 3,
    color: colors.text,
    fontFamily: fonts.family,
    fontSize: 12,
    lineHeight: 18,
    fontWeight: '700',
  },
  commentReplyAction: {
    marginTop: spacing.sm,
    color: colors.coral,
    fontFamily: fonts.family,
    fontSize: 11,
    lineHeight: 14,
    fontWeight: '900',
  },
  publicProfileScreen: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  publicProfileContent: {
    paddingHorizontal: spacing.lg,
    paddingBottom: 48,
  },
  publicProfileTopRow: {
    minHeight: 44,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.md,
  },
  publicProfileBackButton: {
    width: 42,
    height: 42,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.softLine,
    backgroundColor: colors.surface,
  },
  publicProfileKicker: {
    color: colors.coral,
    fontFamily: fonts.family,
    fontSize: 11,
    lineHeight: 15,
    fontWeight: '900',
  },
  publicProfileHero: {
    alignItems: 'center',
    padding: spacing.xl,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.softLine,
    backgroundColor: colors.surface,
    ...shadow.card,
  },
  publicProfileAvatar: {
    width: 92,
    height: 92,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    borderRadius: 46,
    borderWidth: 4,
    borderColor: colors.peachSoft,
    backgroundColor: colors.purpleSoft,
  },
  publicProfileAvatarImage: {
    width: '100%',
    height: '100%',
  },
  publicProfileAvatarText: {
    color: colors.ink,
    fontFamily: fonts.family,
    fontSize: 26,
    fontWeight: '900',
  },
  publicProfileName: {
    marginTop: spacing.md,
    color: colors.ink,
    fontFamily: fonts.family,
    fontSize: 24,
    lineHeight: 30,
    fontWeight: '900',
    textAlign: 'center',
  },
  publicProfileMemberLabel: {
    marginTop: 2,
    color: colors.muted,
    fontFamily: fonts.family,
    fontSize: 13,
    lineHeight: 18,
    fontWeight: '700',
  },
  publicProfileMeta: {
    width: '100%',
    marginTop: spacing.lg,
    gap: spacing.sm,
  },
  publicProfileMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
  },
  publicProfileMetaText: {
    flexShrink: 1,
    color: colors.text,
    fontFamily: fonts.family,
    fontSize: 13,
    lineHeight: 18,
    fontWeight: '700',
    textAlign: 'center',
  },
  publicProfileStats: {
    width: '100%',
    marginTop: spacing.xl,
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  publicProfileSection: {
    marginTop: spacing.lg,
    padding: spacing.lg,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.softLine,
    backgroundColor: colors.surface,
  },
  publicProfileSectionTitle: {
    color: colors.ink,
    fontFamily: fonts.family,
    fontSize: 18,
    lineHeight: 23,
    fontWeight: '900',
  },
  publicProfileBody: {
    marginTop: spacing.md,
    color: colors.text,
    fontFamily: fonts.family,
    fontSize: 14,
    lineHeight: 22,
    fontWeight: '600',
  },
  publicProfileInfoRow: {
    marginTop: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  publicProfileInfoText: {
    flex: 1,
    color: colors.text,
    fontFamily: fonts.family,
    fontSize: 13,
    lineHeight: 18,
    fontWeight: '700',
  },
  publicProfileGroupRow: {
    minHeight: 72,
    marginTop: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  publicProfileGroupImageWrap: {
    width: 60,
    height: 60,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 18,
    backgroundColor: colors.peachSoft,
  },
  publicProfileGroupImage: {
    width: '100%',
    height: '100%',
  },
  publicProfileGroupFallback: {
    color: colors.ink,
    fontFamily: fonts.family,
    fontSize: 16,
    fontWeight: '900',
  },
  publicProfileGroupName: {
    color: colors.ink,
    fontFamily: fonts.family,
    fontSize: 14,
    lineHeight: 19,
    fontWeight: '900',
  },
  publicProfileGroupMeta: {
    marginTop: 3,
    color: colors.muted,
    fontFamily: fonts.family,
    fontSize: 12,
    lineHeight: 17,
    fontWeight: '600',
  },
  publicProfileEventRow: {
    minHeight: 78,
    marginTop: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  publicProfileEventImage: {
    width: 72,
    height: 62,
    borderRadius: 16,
    backgroundColor: colors.peachSoft,
  },
  publicProfileEventImageFallback: {
    width: 72,
    height: 62,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 16,
    backgroundColor: colors.peachSoft,
  },
  publicProfileEventTitle: {
    color: colors.ink,
    fontFamily: fonts.family,
    fontSize: 14,
    lineHeight: 19,
    fontWeight: '900',
  },
  publicProfileEventMeta: {
    marginTop: 3,
    color: colors.muted,
    fontFamily: fonts.family,
    fontSize: 12,
    lineHeight: 17,
    fontWeight: '600',
  },
  publicProfileEmptyText: {
    marginTop: spacing.md,
    color: colors.muted,
    fontFamily: fonts.family,
    fontSize: 13,
    lineHeight: 19,
    fontWeight: '600',
  },
  publicProfileErrorScreen: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xl,
  },
  publicProfileErrorTitle: {
    marginTop: spacing.md,
    color: colors.ink,
    fontFamily: fonts.family,
    fontSize: 20,
    lineHeight: 26,
    fontWeight: '900',
  },
  publicProfileErrorText: {
    marginTop: spacing.sm,
    color: colors.muted,
    fontFamily: fonts.family,
    fontSize: 13,
    lineHeight: 19,
    fontWeight: '600',
    textAlign: 'center',
  },
  publicProfileRetryButton: {
    marginTop: spacing.lg,
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
    borderRadius: radius.pill,
    backgroundColor: colors.ink,
  },
  publicProfileRetryText: {
    color: colors.surface,
    fontFamily: fonts.family,
    fontSize: 13,
    fontWeight: '900',
  },
  eventDetailMiniList: {
    gap: spacing.md,
    paddingRight: spacing.lg,
  },
  eventDetailMiniCard: {
    width: 176,
  },
  eventDetailMiniImage: {
    width: 176,
    height: 104,
    borderRadius: 18,
    backgroundColor: colors.peachSoft,
  },
  eventDetailMiniTitle: {
    marginTop: spacing.sm,
    color: colors.ink,
    fontFamily: fonts.family,
    fontSize: 13,
    lineHeight: 18,
    fontWeight: '900',
  },
  eventDetailMiniMeta: {
    marginTop: 2,
    color: colors.muted,
    fontFamily: fonts.family,
    fontSize: 11,
    lineHeight: 15,
    fontWeight: '700',
  },
  eventTopicWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  reportEventRow: {
    minHeight: 58,
    marginTop: spacing.xxl,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingHorizontal: spacing.md,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colors.softLine,
    backgroundColor: colors.surface,
  },
  reportEventText: {
    flex: 1,
    color: colors.muted,
    fontFamily: fonts.family,
    fontSize: 14,
    fontWeight: '900',
  },
  groupDetailScreen: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  groupDetailEmptyScreen: {
    flex: 1,
    backgroundColor: colors.bg,
    justifyContent: 'center',
  },
  groupDetailContent: {
    paddingBottom: 42,
  },
  groupDetailHeroImage: {
    height: 292,
    justifyContent: 'flex-start',
  },
  groupDetailHeroRadius: {
    borderBottomLeftRadius: 30,
    borderBottomRightRadius: 30,
  },
  groupDetailTitleCard: {
    marginHorizontal: spacing.lg,
    marginTop: -58,
    padding: spacing.lg,
    borderRadius: 26,
    borderWidth: 1,
    borderColor: colors.softLine,
    backgroundColor: colors.surface,
    ...shadow.strong,
  },
  groupDetailKicker: {
    color: colors.coral,
    fontFamily: fonts.family,
    fontSize: 11,
    lineHeight: 15,
    fontWeight: '900',
    textTransform: 'uppercase',
  },
  groupDetailTitle: {
    marginTop: spacing.xs,
    color: colors.ink,
    fontFamily: fonts.family,
    fontSize: 29,
    lineHeight: 35,
    fontWeight: '900',
  },
  groupDetailDescription: {
    marginTop: spacing.sm,
    color: colors.text,
    fontFamily: fonts.family,
    fontSize: 14,
    lineHeight: 21,
    fontWeight: '700',
  },
  groupDetailStatsRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: spacing.lg,
  },
  groupDetailStat: {
    flex: 1,
    minHeight: 66,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 18,
    backgroundColor: colors.bg,
    borderWidth: 1,
    borderColor: colors.softLine,
  },
  groupDetailStatValue: {
    color: colors.ink,
    fontFamily: fonts.family,
    fontSize: 21,
    lineHeight: 26,
    fontWeight: '900',
  },
  groupDetailStatLabel: {
    marginTop: 2,
    color: colors.muted,
    fontFamily: fonts.family,
    fontSize: 10,
    fontWeight: '900',
    textTransform: 'uppercase',
  },
  groupDetailCreateEventButton: {
    minHeight: 56,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    marginHorizontal: spacing.lg,
    marginTop: spacing.md,
    paddingHorizontal: spacing.lg,
    borderRadius: radius.pill,
    backgroundColor: colors.blackButton,
    ...shadow.card,
  },
  groupDetailCreateEventText: {
    color: colors.surface,
    fontFamily: fonts.family,
    fontSize: 15,
    fontWeight: '900',
  },
  groupDetailBody: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.xl,
  },
  groupDetailInfoCard: {
    gap: spacing.md,
    padding: spacing.md,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: colors.softLine,
    backgroundColor: colors.surface,
    ...shadow.card,
  },
  groupDetailInfoRow: {
    minHeight: 46,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  groupDetailInfoTitle: {
    color: colors.ink,
    fontFamily: fonts.family,
    fontSize: 14,
    lineHeight: 18,
    fontWeight: '900',
  },
  groupDetailInfoText: {
    marginTop: 2,
    color: colors.muted,
    fontFamily: fonts.family,
    fontSize: 12,
    lineHeight: 17,
    fontWeight: '700',
  },
  groupDetailBodyText: {
    color: colors.text,
    fontFamily: fonts.family,
    fontSize: 15,
    lineHeight: 23,
    fontWeight: '700',
  },
  chatScreen: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  chatInboxContent: {
    paddingBottom: 120,
  },
  chatAvatarWrap: {
    position: 'relative',
  },
  chatAvatar: {
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.peachSoft,
    borderWidth: 2,
    borderColor: colors.surface,
  },
  chatAvatarImage: {
    width: '100%',
    height: '100%',
  },
  chatAvatarText: {
    color: colors.coral,
    fontFamily: fonts.bold,
    fontWeight: '900',
  },
  chatAvatarOnlineDot: {
    position: 'absolute',
    right: -1,
    bottom: -1,
    width: 13,
    height: 13,
    borderRadius: 7,
    borderWidth: 2,
    borderColor: colors.surface,
    backgroundColor: colors.green,
  },
  chatTabs: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: spacing.lg,
    padding: 5,
    borderRadius: radius.pill,
    backgroundColor: colors.cream,
  },
  chatTab: {
    flex: 1,
    minHeight: 44,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingHorizontal: spacing.md,
    borderRadius: radius.pill,
  },
  chatTabActive: {
    backgroundColor: colors.ink,
  },
  chatTabText: {
    color: colors.ink,
    fontFamily: fonts.semibold,
    fontSize: 13,
    fontWeight: '800',
  },
  chatTabTextActive: {
    color: colors.surface,
  },
  chatTabBadge: {
    minWidth: 19,
    height: 19,
    overflow: 'hidden',
    paddingHorizontal: 5,
    borderRadius: 10,
    backgroundColor: colors.coral,
    color: colors.surface,
    fontFamily: fonts.bold,
    fontSize: 10,
    lineHeight: 19,
    fontWeight: '900',
    textAlign: 'center',
  },
  chatSearch: {
    minHeight: 50,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginTop: spacing.md,
    paddingHorizontal: spacing.lg,
    borderRadius: radius.md,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.line,
  },
  chatSearchInput: {
    flex: 1,
    paddingVertical: 0,
    color: colors.ink,
    fontFamily: fonts.medium,
    fontSize: 14,
  },
  chatList: {
    overflow: 'hidden',
    marginTop: spacing.md,
    borderRadius: radius.lg,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.softLine,
  },
  chatListRow: {
    minHeight: 82,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.line,
  },
  chatListCopy: {
    flex: 1,
    minWidth: 0,
  },
  chatListName: {
    color: colors.ink,
    fontFamily: fonts.bold,
    fontSize: 15,
    fontWeight: '900',
  },
  chatListPreview: {
    marginTop: 3,
    color: colors.muted,
    fontFamily: fonts.regular,
    fontSize: 12,
    lineHeight: 17,
  },
  chatListPreviewLive: {
    color: colors.green,
    fontFamily: fonts.medium,
  },
  chatListAside: {
    minWidth: 42,
    alignItems: 'flex-end',
    gap: 7,
  },
  chatListTime: {
    color: colors.muted,
    fontFamily: fonts.medium,
    fontSize: 10,
  },
  chatUnreadBadge: {
    minWidth: 21,
    height: 21,
    overflow: 'hidden',
    paddingHorizontal: 5,
    borderRadius: 11,
    backgroundColor: colors.brand,
    color: colors.surface,
    fontFamily: fonts.bold,
    fontSize: 10,
    lineHeight: 21,
    fontWeight: '900',
    textAlign: 'center',
  },
  chatRequestRow: {
    minHeight: 104,
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.md,
    padding: spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.line,
  },
  chatRequestActions: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: spacing.sm,
  },
  chatAcceptButton: {
    minHeight: 34,
    justifyContent: 'center',
    paddingHorizontal: spacing.lg,
    borderRadius: radius.pill,
    backgroundColor: colors.ink,
  },
  chatAcceptText: {
    color: colors.surface,
    fontFamily: fonts.bold,
    fontSize: 12,
    fontWeight: '900',
  },
  chatDeclineButton: {
    minHeight: 34,
    justifyContent: 'center',
    paddingHorizontal: spacing.lg,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.line,
  },
  chatDeclineText: {
    color: colors.muted,
    fontFamily: fonts.semibold,
    fontSize: 12,
    fontWeight: '800',
  },
  chatLoadingList: {
    gap: spacing.sm,
    marginTop: spacing.md,
  },
  chatLoadingRow: {
    height: 78,
    borderRadius: radius.md,
    backgroundColor: colors.cream,
  },
  chatThreadHeader: {
    minHeight: 68,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.md,
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.line,
  },
  chatBackButton: {
    width: 42,
    height: 42,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.pill,
    backgroundColor: colors.cream,
  },
  chatThreadPerson: {
    flex: 1,
    minWidth: 0,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  chatThreadName: {
    color: colors.ink,
    fontFamily: fonts.bold,
    fontSize: 16,
    fontWeight: '900',
  },
  chatThreadStatus: {
    marginTop: 1,
    color: colors.muted,
    fontFamily: fonts.medium,
    fontSize: 11,
  },
  chatThreadStatusOnline: {
    color: colors.green,
  },
  chatThreadList: {
    flexGrow: 1,
    justifyContent: 'flex-end',
    gap: spacing.sm,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.xl,
  },
  chatThreadSkeleton: {
    flex: 1,
    justifyContent: 'flex-end',
    gap: spacing.md,
    paddingVertical: spacing.sm,
  },
  chatDateSkeleton: {
    width: 72,
    height: 22,
    alignSelf: 'center',
    borderRadius: radius.pill,
    backgroundColor: colors.cream,
  },
  chatBubbleSkeleton: {
    width: '62%',
    minHeight: 64,
    gap: spacing.sm,
    padding: spacing.md,
    borderRadius: radius.lg,
    backgroundColor: colors.cream,
  },
  chatBubbleSkeletonMine: {
    alignSelf: 'flex-end',
    backgroundColor: colors.line,
  },
  chatBubbleSkeletonShort: {
    width: '43%',
  },
  chatBubbleSkeletonLine: {
    width: '78%',
    height: 11,
    borderRadius: radius.pill,
    backgroundColor: colors.surface,
  },
  chatBubbleSkeletonTime: {
    width: 44,
    height: 8,
    alignSelf: 'flex-end',
    borderRadius: radius.pill,
    backgroundColor: colors.surface,
  },
  chatOlderLoading: {
    height: 34,
    alignItems: 'center',
    justifyContent: 'center',
  },
  chatOlderLoadingLine: {
    width: 88,
    height: 8,
    borderRadius: radius.pill,
    backgroundColor: colors.cream,
  },
  chatDateSeparator: {
    alignItems: 'center',
    marginVertical: spacing.md,
  },
  chatDateSeparatorText: {
    overflow: 'hidden',
    paddingHorizontal: spacing.md,
    paddingVertical: 5,
    borderRadius: radius.pill,
    backgroundColor: colors.cream,
    color: colors.muted,
    fontFamily: fonts.semibold,
    fontSize: 10,
  },
  chatThreadEmpty: {
    flex: 1,
    minHeight: 360,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xl,
  },
  chatThreadEmptyTitle: {
    marginTop: spacing.md,
    color: colors.ink,
    fontFamily: fonts.bold,
    fontSize: 19,
    fontWeight: '900',
  },
  chatThreadEmptyBody: {
    maxWidth: 280,
    marginTop: spacing.sm,
    color: colors.muted,
    fontFamily: fonts.regular,
    fontSize: 13,
    lineHeight: 19,
    textAlign: 'center',
  },
  chatBubbleWrap: {
    alignItems: 'flex-start',
  },
  chatBubbleWrapMine: {
    alignItems: 'flex-end',
  },
  chatBubble: {
    maxWidth: '82%',
    paddingHorizontal: spacing.md,
    paddingVertical: 10,
    borderRadius: 18,
    borderBottomLeftRadius: 5,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.line,
  },
  chatBubbleMine: {
    borderBottomLeftRadius: 18,
    borderBottomRightRadius: 5,
    backgroundColor: colors.ink,
    borderColor: colors.ink,
  },
  chatBubbleText: {
    color: colors.ink,
    fontFamily: fonts.regular,
    fontSize: 14,
    lineHeight: 20,
  },
  chatBubbleTextMine: {
    color: colors.surface,
  },
  chatBubbleMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: spacing.sm,
    marginTop: 4,
  },
  chatBubbleTime: {
    color: colors.muted,
    fontFamily: fonts.medium,
    fontSize: 9,
  },
  chatBubbleTimeMine: {
    color: '#ddd8d4',
  },
  chatReadState: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  chatReadText: {
    color: '#ddd8d4',
  },
  chatReadTextActive: {
    color: colors.green,
  },
  chatComposer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: spacing.sm,
    marginBottom: 78,
    paddingHorizontal: spacing.md,
    paddingTop: spacing.sm,
    backgroundColor: colors.surface,
    borderTopWidth: 1,
    borderTopColor: colors.line,
  },
  chatComposerInput: {
    flex: 1,
    maxHeight: 112,
    minHeight: 46,
    paddingHorizontal: spacing.lg,
    paddingTop: 12,
    paddingBottom: 10,
    borderRadius: 23,
    color: colors.ink,
    fontFamily: fonts.regular,
    fontSize: 14,
    backgroundColor: colors.cream,
  },
  chatSendButton: {
    width: 46,
    height: 46,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 23,
    backgroundColor: colors.brand,
  },
  chatSendButtonDisabled: {
    opacity: 0.4,
  },
  ticketScreen: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  ticketHeader: {
    minHeight: 76,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.md,
  },
  ticketBackButton: {
    width: 42,
    height: 42,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.pill,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.line,
  },
  ticketHeaderIcon: {
    width: 46,
    height: 46,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 17,
    backgroundColor: colors.peachSoft,
  },
  ticketList: {
    gap: spacing.md,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
  },
  ticketEmptyWrap: {
    flex: 1,
    paddingHorizontal: spacing.lg,
  },
  ticketCard: {
    overflow: 'hidden',
    borderRadius: radius.lg,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.line,
    ...shadow.card,
  },
  ticketEventRow: {
    minHeight: 112,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    padding: spacing.md,
  },
  ticketEventImage: {
    width: 92,
    height: 92,
    borderRadius: 18,
    backgroundColor: colors.cream,
  },
  ticketEventCopy: {
    flex: 1,
    minWidth: 0,
  },
  ticketEventTitle: {
    color: colors.ink,
    fontFamily: fonts.bold,
    fontSize: 15,
    lineHeight: 20,
    fontWeight: '900',
  },
  ticketEventDate: {
    marginTop: 5,
    color: colors.coral,
    fontFamily: fonts.semibold,
    fontSize: 11,
    fontWeight: '800',
  },
  ticketLocationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 5,
  },
  ticketEventLocation: {
    flex: 1,
    color: colors.muted,
    fontFamily: fonts.regular,
    fontSize: 11,
  },
  ticketCardFooter: {
    minHeight: 68,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    backgroundColor: colors.cream,
    borderTopWidth: 1,
    borderTopColor: colors.line,
  },
  ticketCodeLabel: {
    color: colors.muted,
    fontFamily: fonts.bold,
    fontSize: 9,
    fontWeight: '900',
    letterSpacing: 0,
  },
  ticketCodeValue: {
    maxWidth: 160,
    marginTop: 2,
    color: colors.ink,
    fontFamily: fonts.semibold,
    fontSize: 11,
    fontWeight: '800',
  },
  ticketViewButton: {
    minHeight: 40,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: spacing.md,
    borderRadius: radius.pill,
    backgroundColor: colors.ink,
  },
  ticketViewButtonText: {
    color: colors.surface,
    fontFamily: fonts.bold,
    fontSize: 11,
    fontWeight: '900',
  },
  ticketModalBackdrop: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.lg,
    backgroundColor: 'rgba(31, 41, 55, 0.72)',
  },
  ticketModalCard: {
    width: '100%',
    maxWidth: 390,
    alignItems: 'center',
    padding: spacing.xl,
    borderRadius: radius.lg,
    backgroundColor: colors.surface,
    ...shadow.strong,
  },
  ticketModalClose: {
    position: 'absolute',
    top: spacing.md,
    right: spacing.md,
    zIndex: 2,
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 20,
    backgroundColor: colors.cream,
  },
  ticketModalNotch: {
    width: 56,
    height: 7,
    marginBottom: spacing.lg,
    borderRadius: 4,
    backgroundColor: colors.peachSoft,
  },
  ticketModalKicker: {
    color: colors.coral,
    fontFamily: fonts.bold,
    fontSize: 11,
    fontWeight: '900',
  },
  ticketQrWrap: {
    marginTop: spacing.lg,
    padding: spacing.md,
    borderRadius: 20,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.line,
  },
  ticketModalDivider: {
    alignSelf: 'stretch',
    marginVertical: spacing.lg,
    borderTopWidth: 2,
    borderTopColor: colors.line,
    borderStyle: 'dashed',
  },
  ticketModalTitle: {
    color: colors.ink,
    fontFamily: fonts.bold,
    fontSize: 18,
    lineHeight: 23,
    fontWeight: '900',
    textAlign: 'center',
  },
  ticketModalDate: {
    marginTop: spacing.sm,
    color: colors.muted,
    fontFamily: fonts.medium,
    fontSize: 12,
    textAlign: 'center',
  },
  ticketModalCodeRow: {
    alignSelf: 'stretch',
    marginTop: spacing.lg,
    padding: spacing.md,
    borderRadius: radius.md,
    backgroundColor: colors.cream,
  },
  ticketModalCode: {
    marginTop: 4,
    color: colors.ink,
    fontFamily: fonts.bold,
    fontSize: 13,
    fontWeight: '900',
    textAlign: 'center',
  },
  ticketCancelButton: {
    minHeight: 44,
    alignSelf: 'stretch',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: spacing.md,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.coral,
  },
  ticketCancelButtonText: {
    color: colors.coral,
    fontFamily: fonts.bold,
    fontSize: 12,
    fontWeight: '900',
  },
  ticketConfirmCard: {
    width: '100%',
    maxWidth: 380,
    alignItems: 'center',
    padding: spacing.xl,
    borderRadius: radius.lg,
    backgroundColor: colors.surface,
    ...shadow.strong,
  },
  ticketConfirmIcon: {
    width: 62,
    height: 62,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 22,
    backgroundColor: colors.peachSoft,
  },
  accountDeleteIcon: {
    width: 62,
    height: 62,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 22,
    backgroundColor: colors.peachSoft,
  },
  ticketConfirmTitle: {
    marginTop: spacing.lg,
    color: colors.ink,
    fontFamily: fonts.bold,
    fontSize: 20,
    fontWeight: '900',
  },
  ticketConfirmBody: {
    marginTop: spacing.sm,
    color: colors.muted,
    fontFamily: fonts.regular,
    fontSize: 13,
    lineHeight: 19,
    textAlign: 'center',
  },
  ticketConfirmActions: {
    alignSelf: 'stretch',
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: spacing.xl,
  },
  ticketKeepButton: {
    flex: 1,
    minHeight: 46,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.line,
  },
  ticketKeepButtonText: {
    color: colors.ink,
    fontFamily: fonts.bold,
    fontSize: 12,
    fontWeight: '900',
  },
  ticketConfirmCancelButton: {
    flex: 1,
    minHeight: 46,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.pill,
    backgroundColor: colors.coral,
  },
  ticketConfirmCancelText: {
    color: colors.surface,
    fontFamily: fonts.bold,
    fontSize: 12,
    fontWeight: '900',
  },
  publicProfileFriendButton: {
    minHeight: 48,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    marginTop: spacing.lg,
    paddingHorizontal: spacing.xl,
    borderRadius: radius.pill,
    backgroundColor: colors.brand,
  },
  publicProfileFriendButtonPending: {
    backgroundColor: colors.cream,
    borderWidth: 1,
    borderColor: colors.line,
  },
  publicProfileFriendButtonText: {
    color: colors.surface,
    fontFamily: fonts.bold,
    fontSize: 13,
    fontWeight: '900',
  },
  publicProfileFriendButtonTextPending: {
    color: colors.muted,
  },
  shareCard: {
    padding: spacing.xl,
    borderRadius: radius.lg,
    backgroundColor: colors.surface,
    ...shadow.strong,
  },
  shareHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  shareTitle: {
    flex: 1,
    color: colors.ink,
    fontSize: type.h3,
    fontWeight: '900',
    textAlign: 'center',
  },
  shareOptions: {
    marginTop: spacing.xl,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.md,
    justifyContent: 'center',
  },
  shareOption: {
    width: 82,
    alignItems: 'center',
    gap: spacing.sm,
  },
  shareOptionText: {
    color: colors.text,
    fontSize: type.tiny,
    fontWeight: '700',
    textAlign: 'center',
  },
  flyerPreview: {
    overflow: 'hidden',
    padding: spacing.md,
    borderRadius: radius.lg,
    backgroundColor: colors.bg,
    borderWidth: 1,
    borderColor: colors.softLine,
  },
  flyerImage: {
    width: '100%',
    height: 150,
    borderRadius: radius.md,
  },
  flyerTitle: {
    marginTop: spacing.md,
    color: colors.ink,
    fontSize: type.h3,
    fontWeight: '900',
  },
  saveFlyerButton: {
    alignSelf: 'flex-end',
    marginTop: spacing.md,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderRadius: radius.pill,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.line,
  },
  saveFlyerText: {
    color: colors.ink,
    fontSize: type.small,
    fontWeight: '900',
  },
  toast: {
    position: 'absolute',
    left: spacing.lg,
    right: spacing.lg,
    minHeight: 54,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingHorizontal: spacing.lg,
    borderRadius: radius.md,
    ...shadow.strong,
  },
  toastSuccess: {
    backgroundColor: colors.success,
  },
  toastError: {
    backgroundColor: colors.warning,
  },
  toastInfo: {
    backgroundColor: colors.blackButton,
  },
  toastText: {
    flex: 1,
    color: colors.surface,
    fontSize: type.small,
    fontWeight: '900',
  },
});

export default App;
