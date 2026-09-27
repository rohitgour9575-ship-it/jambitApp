import React from 'react';
import {
  Linking,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ExternalLink, ShieldAlert, X } from 'lucide-react-native';
import { colors, fonts, radius, shadow, spacing } from '../theme';

export const ZERO_TOLERANCE_EULA_TEXT =
  'Zero-Tolerance Policy for Objectionable Content and Abusive Users: JambIt maintains a strict zero-tolerance policy against objectionable, harmful, abusive, harassing, hateful, threatening, sexually explicit, or unlawful content and behavior. Any user who posts objectionable content or engages in abusive behavior will have their content removed immediately and their account permanently ejected from the JambIt platform. JambIt moderates and acts on all objectionable content reports within 24 hours.';

export function TermsOfUseModal({
  visible,
  onClose,
  onAccept,
  showAcceptButton = false,
}: {
  visible: boolean;
  onClose: () => void;
  onAccept?: () => void;
  showAcceptButton?: boolean;
}) {
  const insets = useSafeAreaInsets();

  const openWebTerms = () => {
    Linking.openURL('https://jambit.in/terms-and-conditions').catch(() => undefined);
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
            <Text style={styles.kicker}>LEGAL AGREEMENT</Text>
            <Text style={styles.title}>Terms of Use (EULA)</Text>
          </View>
          <Pressable
            accessibilityLabel="Close terms"
            accessibilityRole="button"
            hitSlop={12}
            style={styles.closeButton}
            onPress={onClose}>
            <X color={colors.ink} size={22} strokeWidth={2.5} />
          </Pressable>
        </View>

        <ScrollView
          showsVerticalScrollIndicator={true}
          contentContainerStyle={[styles.content, { paddingBottom: Math.max(insets.bottom, 24) + 20 }]}>
          
          {/* CRITICAL CALLOUT FOR APPLE REVIEW */}
          <View style={styles.alertBox}>
            <View style={styles.alertHeader}>
              <ShieldAlert color={colors.brand} size={22} strokeWidth={2.4} />
              <Text style={styles.alertTitle}>Zero-Tolerance Policy</Text>
            </View>
            <Text style={styles.alertText}>{ZERO_TOLERANCE_EULA_TEXT}</Text>
          </View>

          <Pressable style={styles.webLinkRow} onPress={openWebTerms}>
            <Text style={styles.webLinkText}>View full Terms online (jambit.in)</Text>
            <ExternalLink color={colors.purple} size={16} strokeWidth={2.2} />
          </Pressable>

          <Text style={styles.sectionHeading}>1. Acceptance of Terms & EULA</Text>
          <Text style={styles.paragraph}>
            By downloading, accessing, or using the JambIt mobile application, you enter into a binding End User License Agreement (EULA) with JambIt. If you do not agree to these terms, you must not access or use JambIt.
          </Text>

          <Text style={styles.sectionHeading}>2. Prohibited Content & Zero Tolerance</Text>
          <Text style={styles.paragraph}>
            JambIt is a community platform for real people to meet, discover groups, and attend local events. You agree that you will NEVER post, upload, publish, or transmit any user-generated content that:
          </Text>
          <View style={styles.bulletList}>
            <Text style={styles.bulletItem}>• Is sexually explicit, pornographic, obscene, or indecent.</Text>
            <Text style={styles.bulletItem}>• Promotes hate speech, discrimination, bigotry, racism, or violence against any individual or group.</Text>
            <Text style={styles.bulletItem}>• Harasses, bullies, defames, threatens, stalks, or abuses any user.</Text>
            <Text style={styles.bulletItem}>• Contains fraudulent schemes, impersonation, scams, spam, or malicious solicitations.</Text>
            <Text style={styles.bulletItem}>• Infringes intellectual property, privacy, or proprietary rights of others.</Text>
          </View>

          <Text style={styles.sectionHeading}>3. In-App Flagging and User Blocking</Text>
          <Text style={styles.paragraph}>
            JambIt provides interactive safety mechanisms on every event, group, comment, chat conversation, and user profile:
          </Text>
          <View style={styles.bulletList}>
            <Text style={styles.bulletItem}>• <Text style={styles.bold}>Flag / Report Content:</Text> Any user can immediately report objectionable content. Reports are prioritized for human review.</Text>
            <Text style={styles.bulletItem}>• <Text style={styles.bold}>Block Abusive Users:</Text> Any user can block abusive individuals. Blocking instantly hides all events, groups, comments, and messages from that individual from your feed and prevents them from contacting you.</Text>
          </View>

          <Text style={styles.sectionHeading}>4. 24-Hour Moderation & Ejection Commitment</Text>
          <Text style={styles.paragraph}>
            JambIt developers and moderation team actively monitor reported content and enforce a strict 24-hour SLA. Upon receiving a report of objectionable content or abusive behavior, our moderation team will review and take decisive action within 24 hours, including removing the offending content and permanently ejecting the offending user from the JambIt platform.
          </Text>

          <Text style={styles.sectionHeading}>5. Safety & Community Rules</Text>
          <Text style={styles.paragraph}>
            Event hosts and group organizers are expected to maintain welcoming, safe, and respectful atmospheres for all attendees. Violators will lose hosting privileges and face account termination.
          </Text>

          <Text style={styles.sectionHeading}>6. Contact Support</Text>
          <Text style={styles.paragraph}>
            For urgent safety concerns, grievances, or moderation appeals, please contact our safety team at support@jambit.in.
          </Text>

          {showAcceptButton && (
            <Pressable
              style={styles.acceptButton}
              onPress={() => {
                onAccept?.();
                onClose();
              }}>
              <Text style={styles.acceptButtonText}>I Agree to Terms of Use (EULA)</Text>
            </Pressable>
          )}
        </ScrollView>
      </View>
    </Modal>
  );
}

export function PrivacyPolicyModal({
  visible,
  onClose,
}: {
  visible: boolean;
  onClose: () => void;
}) {
  const insets = useSafeAreaInsets();

  const openWebPrivacy = () => {
    Linking.openURL('https://jambit.in/privacy-policy').catch(() => undefined);
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
            <Text style={styles.kicker}>USER PRIVACY</Text>
            <Text style={styles.title}>Privacy Policy</Text>
          </View>
          <Pressable
            accessibilityLabel="Close privacy policy"
            accessibilityRole="button"
            hitSlop={12}
            style={styles.closeButton}
            onPress={onClose}>
            <X color={colors.ink} size={22} strokeWidth={2.5} />
          </Pressable>
        </View>

        <ScrollView
          showsVerticalScrollIndicator={true}
          contentContainerStyle={[styles.content, { paddingBottom: Math.max(insets.bottom, 24) + 20 }]}>
          <Pressable style={styles.webLinkRow} onPress={openWebPrivacy}>
            <Text style={styles.webLinkText}>View full Privacy Policy online (jambit.in)</Text>
            <ExternalLink color={colors.purple} size={16} strokeWidth={2.2} />
          </Pressable>

          <Text style={styles.sectionHeading}>1. Information We Collect</Text>
          <Text style={styles.paragraph}>
            We collect the information you provide when creating an account (name, email, city, interests) and information generated through your use of JambIt (events attended, groups joined, chats).
          </Text>

          <Text style={styles.sectionHeading}>2. How We Use Your Information</Text>
          <Text style={styles.paragraph}>
            Your information is used strictly to provide, improve, and personalize JambIt services, facilitate social connections, send critical event updates, and protect community safety.
          </Text>

          <Text style={styles.sectionHeading}>3. Account and Data Deletion</Text>
          <Text style={styles.paragraph}>
            You have full control over your data. You may update your profile or permanently schedule your account for deletion at any time via Profile &gt; Account Management &gt; Delete Account.
          </Text>

          <Text style={styles.sectionHeading}>4. Safety and Security</Text>
          <Text style={styles.paragraph}>
            We implement administrative and technical safeguards to secure your personal data against unauthorized access, loss, or misuse.
          </Text>

          <Text style={styles.sectionHeading}>5. Contact Us</Text>
          <Text style={styles.paragraph}>
            If you have questions about your privacy, please email us at support@jambit.in.
          </Text>
        </ScrollView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
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
  alertBox: {
    backgroundColor: '#fff0f4',
    borderWidth: 1.5,
    borderColor: '#ffd0df',
    borderRadius: radius.md,
    padding: spacing.md,
    marginBottom: spacing.lg,
    ...shadow.card,
  },
  alertHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 6,
  },
  alertTitle: {
    fontSize: 15,
    fontFamily: fonts.bold,
    color: colors.brand,
  },
  alertText: {
    fontSize: 13,
    lineHeight: 19,
    fontFamily: fonts.medium,
    color: colors.ink,
  },
  webLinkRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.purpleSoft,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: radius.sm,
    marginBottom: spacing.lg,
  },
  webLinkText: {
    fontSize: 13,
    fontFamily: fonts.semibold,
    color: colors.purple,
  },
  sectionHeading: {
    fontSize: 16,
    fontFamily: fonts.bold,
    color: colors.ink,
    marginTop: spacing.md,
    marginBottom: 6,
  },
  paragraph: {
    fontSize: 13.5,
    lineHeight: 20,
    fontFamily: fonts.regular,
    color: colors.text,
    marginBottom: 8,
  },
  bulletList: {
    paddingLeft: 6,
    marginBottom: spacing.sm,
    gap: 6,
  },
  bulletItem: {
    fontSize: 13,
    lineHeight: 19,
    fontFamily: fonts.regular,
    color: colors.text,
  },
  bold: {
    fontFamily: fonts.bold,
    color: colors.ink,
  },
  acceptButton: {
    backgroundColor: colors.brand,
    paddingVertical: 14,
    borderRadius: radius.pill,
    alignItems: 'center',
    marginTop: spacing.xl,
    ...shadow.strong,
  },
  acceptButtonText: {
    color: colors.surface,
    fontSize: 15,
    fontFamily: fonts.bold,
  },
});
