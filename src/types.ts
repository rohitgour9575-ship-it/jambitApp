export type JambitUser = {
  id?: string;
  name: string;
  email: string;
  avatarUrl?: string;
  bio?: string;
  provider?: 'email' | 'google';
  hasPassword?: boolean;
  location?: {
    city?: string;
    description?: string;
  };
  onboarding?: {
    interests?: string[];
    completedAt?: string | null;
    birthDate?: string | null;
    gender?: string;
  };
  personalInfo?: {
    birthDate?: string | null;
    gender?: string;
    lookingFor?: string[];
    industry?: string;
    lifeStages?: string[];
  };
  accountSettings?: {
    language?: string;
    timeZone?: string;
  };
  privacy?: {
    allowFriendRequests?: boolean;
    showGroups?: boolean;
    showInterests?: boolean;
    showIndustry?: boolean;
  };
};

export type AuthSession = {
  token: string;
  user: JambitUser;
  client?: 'app' | 'web';
  lastActiveAt: number;
  savedAt: number;
};

export type JambitNotification = {
  id: string;
  type: string;
  title: string;
  body: string;
  data?: Record<string, string>;
  readAt?: string | null;
  createdAt: string;
};

export type JambitEvent = {
  id?: string;
  _id?: string;
  title: string;
  groupName?: string;
  groupSlug?: string;
  image?: string;
  type?: string;
  price?: string;
  ticketAmount?: number;
  isPaid?: boolean;
  startAt?: string;
  endAt?: string;
  date?: string;
  time?: string;
  fullDate?: string;
  location?: string | {
    description?: string;
    venue?: string;
  };
  venue?: string;
  attendees?: number;
  attendeeProfiles?: Array<{
    id?: string;
    name?: string;
    image?: string;
  }>;
  capacity?: number;
  description?: string;
  topics?: string[];
  status?: string;
  remainingSpots?: number;
  canAttend?: boolean;
  canEdit?: boolean;
  isGoing?: boolean;
  canEditEvent?: boolean;
  editLocked?: boolean;
  requiredHostChecks?: HostVerificationCheckType[];
  verificationTier?: 'free' | 'small' | 'big';
};

export type JambitPayment = {
  orderId: string;
  provider: 'razorpay';
  status: 'created' | 'paid' | 'failed' | 'dropped' | 'review_required';
  amount: number;
  amountSubunits: number;
  currency: 'INR';
  settlementStatus:
    | 'pending_payment'
    | 'route_pending'
    | 'transfer_pending'
    | 'transfer_processing'
    | 'transfer_failed'
    | 'refund_required'
    | 'refund_processing'
    | 'refund_failed'
    | 'refunded'
    | 'released';
  failureReason?: string;
  keyId?: string;
  providerOrderId?: string;
  environment?: 'TEST' | 'LIVE';
  razorpayOrderStatus?: string;
  razorpayPaymentStatus?: string;
  booked?: boolean;
  customer?: {
    name: string;
    email: string;
    phone: string;
  };
  ticket?: {
    ticketId: string;
    status: string;
  } | null;
  event?: {
    id: string;
    title?: string;
    hostName?: string;
    attendees?: number;
    remainingSpots?: number;
  };
};

export type JambitEventComment = {
  id: string;
  parentId?: string | null;
  body: string;
  createdAt: string;
  author: {
    id: string;
    name: string;
    avatarUrl?: string;
  };
};

export type JambitEventAttendee = {
  id: string;
  name: string;
  avatarUrl?: string;
};

export type JambitGroup = {
  id?: string;
  _id?: string;
  name: string;
  slug?: string;
  description?: string;
  summary?: string;
  image?: string;
  topics?: string[];
  organizer?: string;
  organizerName?: string;
  canEdit?: boolean;
  isMember?: boolean;
  city?: string;
  members?: number;
  location?: {
    city?: string;
    description?: string;
  };
  memberIds?: string[];
  memberCount?: number;
  stats?: string[];
  status?: string;
  createdAt?: string;
  updatedAt?: string;
};

export type PublicUserProfilePayload = {
  user: {
    id: string;
    name: string;
    avatarUrl?: string;
    bio?: string;
    city?: string;
    joinedAt?: string;
    interests?: string[];
    allowFriendRequests?: boolean;
    work?: string;
  };
  visibility?: {
    showGroups?: boolean;
    showInterests?: boolean;
    showIndustry?: boolean;
  };
  hostedGroups?: JambitGroup[];
  memberGroups?: JambitGroup[];
  hostedEvents?: JambitEvent[];
  friendship?: {
    status: 'none' | 'pending-sent' | 'pending-received' | 'accepted';
    id?: string;
  };
  chatEligibility?: {
    canChat: boolean;
    contexts?: Array<{
      type: 'group' | 'event';
      id: string;
      name: string;
      slug?: string;
    }>;
  };
};

export type JambitTicket = {
  id: string;
  ticketId: string;
  status: 'active' | 'cancelled';
  bookingType: 'free' | 'paid';
  bookedAt: string;
  qrPayload: string;
  event: JambitEvent;
};

export type JambitFriend = {
  id: string;
  name: string;
  avatarUrl?: string;
  city?: string;
  friendshipId?: string;
  since?: string | null;
};

export type JambitChatMessage = {
  id: string;
  conversationId: string;
  senderId: string;
  recipientId: string;
  text: string;
  createdAt: string;
  readBy?: string[];
};

export type JambitChatConversation = {
  id: string;
  friend: JambitFriend;
  latestMessage?: JambitChatMessage | null;
  unreadCount?: number;
};

export type InterestCategory = {
  id?: string;
  _id?: string;
  name: string;
  icon?: string;
  options?: Array<string | { label?: string; name?: string; title?: string; value?: string; slug?: string }>;
  interests?: string[];
};

export type HostVerificationCheckType = 'aadhaar' | 'pan' | 'bank' | 'gst';

export type HostVerificationCheck = {
  status: 'missing' | 'pending' | 'verified' | 'failed';
  maskedValue?: string;
  provider?: string;
  verifiedAt?: string | null;
  failureReason?: string;
};

export type EventVerificationPayload = {
  ticketAmount: number;
  threshold: number;
  tier: 'free' | 'small' | 'big';
  requiredChecks: HostVerificationCheckType[];
  missingChecks: HostVerificationCheckType[];
  verifiedChecks: HostVerificationCheckType[];
  labels: Record<HostVerificationCheckType, string>;
  hostVerification: Record<HostVerificationCheckType, HostVerificationCheck>;
  payoutVendor?: {
    status: string;
    providerStatus?: string;
    maskedPhone?: string;
    failureReason?: string;
    ready: boolean;
  };
};
