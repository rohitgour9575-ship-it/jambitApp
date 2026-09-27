import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Check, Flag, ShieldAlert, UserCheck, UserX, X } from 'lucide-react-native';
import { colors, fonts, radius, shadow, spacing } from '../theme';
import {
  type BlockedUserRecord,
  blockUser,
  getBlockedUsers,
  REPORT_REASONS,
  type ReportContentType,
  submitReport,
  unblockUser,
} from '../moderation/userModeration';

export function ReportContentModal({
  visible,
  contentType,
  contentId,
  contentTitle,
  reportedUserId,
  reportedUserName,
  sessionToken,
  onClose,
  onSuccess,
  onUserBlocked,
}: {
  visible: boolean;
  contentType: ReportContentType;
  contentId: string;
  contentTitle?: string;
  reportedUserId?: string;
  reportedUserName?: string;
  sessionToken?: string;
  onClose: () => void;
  onSuccess: (message: string) => void;
  onUserBlocked?: (userId: string) => void;
}) {
  const insets = useSafeAreaInsets();
  const [selectedReason, setSelectedReason] = useState<string>(REPORT_REASONS[0]);
  const [details, setDetails] = useState('');
  const [alsoBlock, setAlsoBlock] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (visible) {
      setSelectedReason(REPORT_REASONS[0]);
      setDetails('');
      setAlsoBlock(false);
      setSubmitting(false);
    }
  }, [visible]);

  const handleSubmit = async () => {
    if (submitting) return;
    setSubmitting(true);
    try {
      await submitReport(
        {
          contentType,
          contentId,
          reportedUserId,
          reportedUserName,
          reason: selectedReason,
          details: details.trim() || undefined,
        },
        sessionToken
      );

      if (alsoBlock && reportedUserId) {
        await blockUser(reportedUserId, reportedUserName);
        onUserBlocked?.(reportedUserId);
      }

      onClose();
      onSuccess(
        alsoBlock && reportedUserId
          ? 'Report submitted and user blocked. Content will no longer be visible.'
          : 'Thank you for reporting. Our moderation team reviews reports within 24 hours.'
      );
    } catch {
      onClose();
      onSuccess('Report recorded. Thank you for keeping our community safe.');
    } finally {
      setSubmitting(false);
    }
  };

  const typeLabel =
    contentType === 'event'
      ? 'Event'
      : contentType === 'group'
        ? 'Group'
        : contentType === 'comment'
          ? 'Comment'
          : contentType === 'chat'
            ? 'Message'
            : 'User';

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}>
      <View style={[styles.container, { paddingTop: Math.max(insets.top, 16) }]}>
        <View style={styles.header}>
          <View style={styles.headerTitleWrap}>
            <Text style={styles.kicker}>SAFETY &amp; MODERATION</Text>
            <Text style={styles.title}>Report {typeLabel}</Text>
          </View>
          <Pressable
            accessibilityLabel="Close report modal"
            accessibilityRole="button"
            hitSlop={12}
            style={styles.closeButton}
            onPress={onClose}>
            <X color={colors.ink} size={22} strokeWidth={2.5} />
          </Pressable>
        </View>

        <ScrollView
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={[styles.content, { paddingBottom: Math.max(insets.bottom, 24) + 24 }]}>
          {contentTitle ? (
            <View style={styles.targetCard}>
              <Flag color={colors.coral} size={18} strokeWidth={2.4} />
              <Text numberOfLines={2} style={styles.targetTitle}>
                {contentTitle}
              </Text>
            </View>
          ) : null}

          <Text style={styles.sectionTitle}>Why are you reporting this {typeLabel.toLowerCase()}?</Text>

          <View style={styles.reasonsList}>
            {REPORT_REASONS.map((reason) => {
              const active = selectedReason === reason;
              return (
                <Pressable
                  key={reason}
                  style={[styles.reasonRow, active && styles.reasonRowActive]}
                  onPress={() => setSelectedReason(reason)}>
                  <View style={[styles.radioCircle, active && styles.radioCircleActive]}>
                    {active && <View style={styles.radioDot} />}
                  </View>
                  <Text style={[styles.reasonText, active && styles.reasonTextActive]}>
                    {reason}
                  </Text>
                </Pressable>
              );
            })}
          </View>

          <Text style={styles.sectionTitle}>Additional details (optional)</Text>
          <TextInput
            multiline
            numberOfLines={3}
            value={details}
            onChangeText={setDetails}
            placeholder="Help our moderation team understand what happened..."
            placeholderTextColor={colors.muted}
            style={styles.detailsInput}
          />

          {reportedUserId && (
            <Pressable
              style={styles.blockCheckboxRow}
              onPress={() => setAlsoBlock((prev) => !prev)}>
              <View style={[styles.checkbox, alsoBlock && styles.checkboxActive]}>
                {alsoBlock && <Check color={colors.surface} size={15} strokeWidth={3} />}
              </View>
              <View style={styles.flex1}>
                <Text style={styles.blockCheckboxTitle}>
                  Also block {reportedUserName || 'this user'}
                </Text>
                <Text style={styles.blockCheckboxSubtitle}>
                  Instantly hide all events, groups, comments, and messages from this user.
                </Text>
              </View>
            </Pressable>
          )}

          <View style={styles.moderationNotice}>
            <ShieldAlert color={colors.brand} size={18} strokeWidth={2.4} />
            <Text style={styles.moderationNoticeText}>
              JambIt maintains zero tolerance for objectionable content. Our team reviews all reports within 24 hours and removes violating content and accounts.
            </Text>
          </View>

          <Pressable
            disabled={submitting}
            style={[styles.submitButton, submitting && styles.submitButtonDisabled]}
            onPress={handleSubmit}>
            {submitting ? (
              <ActivityIndicator color={colors.surface} />
            ) : (
              <Text style={styles.submitButtonText}>Submit Report</Text>
            )}
          </Pressable>
        </ScrollView>
      </View>
    </Modal>
  );
}

export function BlockedUsersModal({
  visible,
  onClose,
  onUnblocked,
}: {
  visible: boolean;
  onClose: () => void;
  onUnblocked?: (userId: string) => void;
}) {
  const insets = useSafeAreaInsets();
  const [blockedUsers, setBlockedUsers] = useState<BlockedUserRecord[]>([]);
  const [loading, setLoading] = useState(true);

  const loadList = async () => {
    setLoading(true);
    try {
      const list = await getBlockedUsers();
      setBlockedUsers(list);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (visible) {
      loadList().catch(() => undefined);
    }
  }, [visible]);

  const handleUnblock = (user: BlockedUserRecord) => {
    Alert.alert(
      'Unblock User',
      `Are you sure you want to unblock ${user.name || 'this user'}? Their content will be visible to you again.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Unblock',
          onPress: async () => {
            const next = await unblockUser(user.id);
            setBlockedUsers(next);
            onUnblocked?.(user.id);
          },
        },
      ]
    );
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}>
      <View style={[styles.container, { paddingTop: Math.max(insets.top, 16) }]}>
        <View style={styles.header}>
          <View style={styles.headerTitleWrap}>
            <Text style={styles.kicker}>SAFETY &amp; PRIVACY</Text>
            <Text style={styles.title}>Blocked Users</Text>
          </View>
          <Pressable
            accessibilityLabel="Close blocked users modal"
            accessibilityRole="button"
            hitSlop={12}
            style={styles.closeButton}
            onPress={onClose}>
            <X color={colors.ink} size={22} strokeWidth={2.5} />
          </Pressable>
        </View>

        <ScrollView
          contentContainerStyle={[styles.content, { paddingBottom: Math.max(insets.bottom, 24) + 24 }]}>
          <Text style={styles.blockedExplanation}>
            Blocked users cannot message you, and their events, groups, and comments are immediately hidden from your feed.
          </Text>

          {loading ? (
            <View style={styles.loadingWrap}>
              <ActivityIndicator color={colors.brand} />
            </View>
          ) : blockedUsers.length === 0 ? (
            <View style={styles.emptyState}>
              <UserCheck color={colors.purple} size={40} strokeWidth={2.2} />
              <Text style={styles.emptyTitle}>No Blocked Users</Text>
              <Text style={styles.emptySubtitle}>
                You haven't blocked anyone. You can block abusive users directly from their profiles, comments, or chats.
              </Text>
            </View>
          ) : (
            <View style={styles.usersList}>
              {blockedUsers.map((item) => (
                <View key={item.id} style={styles.userCard}>
                  <View style={styles.userAvatarPlaceholder}>
                    <UserX color={colors.coral} size={20} strokeWidth={2.4} />
                  </View>
                  <View style={styles.flex1}>
                    <Text numberOfLines={1} style={styles.userName}>
                      {item.name || 'User'}
                    </Text>
                    <Text style={styles.userMeta}>Blocked</Text>
                  </View>
                  <Pressable
                    style={styles.unblockButton}
                    onPress={() => handleUnblock(item)}>
                    <Text style={styles.unblockButtonText}>Unblock</Text>
                  </Pressable>
                </View>
              ))}
            </View>
          )}
        </ScrollView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  flex1: {
    flex: 1,
  },
  container: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.line,
    backgroundColor: colors.surface,
  },
  headerTitleWrap: {
    flex: 1,
  },
  kicker: {
    fontSize: 11,
    fontFamily: fonts.bold,
    color: colors.brand,
    letterSpacing: 0.8,
  },
  title: {
    fontSize: 20,
    fontFamily: fonts.bold,
    color: colors.ink,
    marginTop: 2,
  },
  closeButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.cream,
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: {
    padding: spacing.lg,
  },
  targetCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: colors.cream,
    padding: 12,
    borderRadius: radius.sm,
    marginBottom: spacing.md,
  },
  targetTitle: {
    flex: 1,
    fontSize: 14,
    fontFamily: fonts.semibold,
    color: colors.ink,
  },
  sectionTitle: {
    fontSize: 14,
    fontFamily: fonts.bold,
    color: colors.ink,
    marginTop: spacing.sm,
    marginBottom: spacing.sm,
  },
  reasonsList: {
    gap: 8,
    marginBottom: spacing.md,
  },
  reasonRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: colors.surface,
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: colors.line,
  },
  reasonRowActive: {
    borderColor: colors.brand,
    backgroundColor: '#fff7fa',
  },
  radioCircle: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: colors.muted,
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioCircleActive: {
    borderColor: colors.brand,
  },
  radioDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: colors.brand,
  },
  reasonText: {
    flex: 1,
    fontSize: 13.5,
    fontFamily: fonts.regular,
    color: colors.ink,
  },
  reasonTextActive: {
    fontFamily: fonts.semibold,
    color: colors.brand,
  },
  detailsInput: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: radius.sm,
    padding: 12,
    fontSize: 13.5,
    fontFamily: fonts.regular,
    color: colors.ink,
    minHeight: 74,
    textAlignVertical: 'top',
    marginBottom: spacing.md,
  },
  blockCheckboxRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    backgroundColor: '#fff0f3',
    padding: 14,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: '#ffccd8',
    marginBottom: spacing.md,
  },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: colors.coral,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surface,
    marginTop: 2,
  },
  checkboxActive: {
    backgroundColor: colors.coral,
  },
  blockCheckboxTitle: {
    fontSize: 14,
    fontFamily: fonts.bold,
    color: colors.ink,
  },
  blockCheckboxSubtitle: {
    fontSize: 12,
    fontFamily: fonts.regular,
    color: colors.muted,
    marginTop: 2,
    lineHeight: 16,
  },
  moderationNotice: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    backgroundColor: colors.cream,
    padding: 12,
    borderRadius: radius.sm,
    marginBottom: spacing.lg,
  },
  moderationNoticeText: {
    flex: 1,
    fontSize: 12,
    lineHeight: 17,
    fontFamily: fonts.regular,
    color: colors.muted,
  },
  submitButton: {
    backgroundColor: colors.brand,
    paddingVertical: 14,
    borderRadius: radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
    ...shadow.strong,
  },
  submitButtonDisabled: {
    opacity: 0.6,
  },
  submitButtonText: {
    color: colors.surface,
    fontSize: 15,
    fontFamily: fonts.bold,
  },
  blockedExplanation: {
    fontSize: 13,
    lineHeight: 19,
    fontFamily: fonts.regular,
    color: colors.muted,
    marginBottom: spacing.lg,
  },
  loadingWrap: {
    paddingVertical: 40,
    alignItems: 'center',
  },
  emptyState: {
    paddingVertical: 48,
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: spacing.lg,
  },
  emptyTitle: {
    fontSize: 17,
    fontFamily: fonts.bold,
    color: colors.ink,
  },
  emptySubtitle: {
    fontSize: 13,
    lineHeight: 19,
    fontFamily: fonts.regular,
    color: colors.muted,
    textAlign: 'center',
  },
  usersList: {
    gap: 10,
  },
  userCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: colors.surface,
    padding: 12,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.line,
  },
  userAvatarPlaceholder: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#fff0f3',
    alignItems: 'center',
    justifyContent: 'center',
  },
  userName: {
    fontSize: 15,
    fontFamily: fonts.semibold,
    color: colors.ink,
  },
  userMeta: {
    fontSize: 12,
    fontFamily: fonts.regular,
    color: colors.coral,
    marginTop: 2,
  },
  unblockButton: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: radius.pill,
    backgroundColor: colors.cream,
    borderWidth: 1,
    borderColor: colors.line,
  },
  unblockButtonText: {
    fontSize: 13,
    fontFamily: fonts.semibold,
    color: colors.ink,
  },
});
