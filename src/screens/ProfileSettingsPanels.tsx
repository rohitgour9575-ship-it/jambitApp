import React, { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text as NativeText,
  TextInput as NativeTextInput,
  View,
} from 'react-native';
import {
  ArrowLeft,
  Check,
  ChevronDown,
  Eye,
  EyeOff,
  Lock,
  Search,
  X,
} from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { changeCurrentPassword, updateCurrentUser } from '../api/auth';
import { getWorkIndustries } from '../api/content';
import { colors, fonts, radius, shadow, spacing, typography } from '../theme';
import type { InterestCategory, JambitUser } from '../types';

export type ProfileSettingsPanelName = 'account' | 'personal' | 'interests';

type CommonProps = {
  user: JambitUser;
  token: string;
  onBack: () => void;
  onUserUpdated: (user: JambitUser) => Promise<void>;
  onToast: (message: string, tone?: 'success' | 'error' | 'info') => void;
};

type SelectOption = { label: string; value: string };

const Text = React.forwardRef<any, React.ComponentProps<typeof NativeText>>(({ style, ...props }, ref) => (
  <NativeText ref={ref} {...props} style={[typography.defaultTextStyle, style]} />
));
Text.displayName = 'ProfileSettingsText';

const TextInput = React.forwardRef<any, React.ComponentProps<typeof NativeTextInput>>(({ style, ...props }, ref) => (
  <NativeTextInput ref={ref} {...props} style={[typography.defaultInputStyle, style]} />
));
TextInput.displayName = 'ProfileSettingsTextInput';

const lookingForOptions = ['Practice Hobbies', 'Socialize', 'Make Friends', 'Professionally Network'];
const lifeStageOptions = ['Recent Graduate', 'Student', 'New In Town', 'New Empty Nester', 'Newly Retired', 'New Parent', 'Career Change'];
const genderOptions = ['Female', 'Male', 'Non-Binary', 'Not Listed', "I'd prefer not to answer"];
const fallbackIndustries = [
  'Not working',
  'Healthcare',
  'Technology',
  'Manual labor or trades',
  'Retail',
  'Education',
  'Food, hospitality or tourism',
  'Arts, media or entertainment',
  'Business, finance or law',
  'Government or nonprofits',
  'Logistics or transportation',
];
const languageOptions: SelectOption[] = [
  { label: 'English', value: 'en' },
  { label: 'Hindi', value: 'hi' },
  { label: 'Marathi', value: 'mr' },
  { label: 'Bengali', value: 'bn' },
  { label: 'Tamil', value: 'ta' },
  { label: 'Telugu', value: 'te' },
];
const timeZoneOptions: SelectOption[] = [
  { label: 'System time (default)', value: 'system' },
  { label: 'India Standard Time', value: 'Asia/Kolkata' },
  { label: 'Coordinated Universal Time', value: 'UTC' },
  { label: 'Gulf Standard Time', value: 'Asia/Dubai' },
  { label: 'United Kingdom time', value: 'Europe/London' },
  { label: 'US Eastern time', value: 'America/New_York' },
];

function dateToDisplay(value?: string | null) {
  if (!value) return '';
  const parts = String(value).slice(0, 10).split('-');
  return parts.length === 3 ? `${parts[2]}/${parts[1]}/${parts[0]}` : '';
}

function displayDateToIso(value: string) {
  const match = value.trim().match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  if (!match) return '';
  const [, day, month, year] = match;
  const parsed = new Date(`${year}-${month}-${day}T00:00:00.000Z`);
  if (
    Number.isNaN(parsed.getTime()) ||
    parsed.getUTCFullYear() !== Number(year) ||
    parsed.getUTCMonth() + 1 !== Number(month) ||
    parsed.getUTCDate() !== Number(day)
  ) return '';
  return `${year}-${month}-${day}`;
}

function optionLabel(option: NonNullable<InterestCategory['options']>[number]) {
  if (typeof option === 'string') return option.trim();
  return String(option.label || option.name || option.title || option.value || '').trim();
}

function sameStringSet(left: string[], right: string[]) {
  return [...left].sort().join('|') === [...right].sort().join('|');
}

export function ProfileSettingsPanel({
  panel,
  categories,
  ...props
}: CommonProps & { panel: ProfileSettingsPanelName; categories: InterestCategory[] }) {
  if (panel === 'interests') return <InterestsPanel {...props} categories={categories} />;
  if (panel === 'personal') return <PersonalInfoPanel {...props} />;
  return <AccountManagementPanel {...props} />;
}

function PanelShell({
  title,
  subtitle,
  onBack,
  children,
}: {
  title: string;
  subtitle: string;
  onBack: () => void;
  children: React.ReactNode;
}) {
  const insets = useSafeAreaInsets();

  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 12 : 0}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={[styles.screen, { paddingTop: insets.top + spacing.md }]}>
        <View style={styles.header}>
          {Platform.OS === 'ios' && (
            <Pressable accessibilityLabel="Back to profile" hitSlop={10} style={styles.backButton} onPress={onBack}>
              <ArrowLeft color={colors.ink} size={23} strokeWidth={2.5} />
            </Pressable>
          )}
          <View style={styles.headerCopy}>
            <Text style={styles.kicker}>Your profile</Text>
            <Text style={styles.title}>{title}</Text>
          </View>
        </View>
        <Text style={styles.subtitle}>{subtitle}</Text>
        {children}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

function Section({ title, note, children }: { title: string; note?: string; children: React.ReactNode }) {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{title}</Text>
      {note ? <Text style={styles.sectionNote}>{note}</Text> : null}
      {children}
    </View>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <View style={styles.field}>
      <Text style={styles.fieldLabel}>{label}</Text>
      {children}
    </View>
  );
}

function ChoiceChip({
  label,
  selected,
  onPress,
}: {
  label: string;
  selected: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable style={[styles.choiceChip, selected && styles.choiceChipSelected]} onPress={onPress}>
      <Text style={[styles.choiceChipText, selected && styles.choiceChipTextSelected]}>{label}</Text>
      {selected ? <Check color={colors.purple} size={15} strokeWidth={3} /> : null}
    </Pressable>
  );
}

function SaveButton({ label = 'Save changes', busy, disabled, onPress }: { label?: string; busy: boolean; disabled?: boolean; onPress: () => void }) {
  return (
    <Pressable style={[styles.saveButton, (busy || disabled) && styles.saveButtonDisabled]} disabled={busy || disabled} onPress={onPress}>
      {busy ? <ActivityIndicator color={colors.surface} size="small" /> : <Text style={styles.saveButtonText}>{label}</Text>}
    </Pressable>
  );
}

function SelectField({ label, value, placeholder, onPress }: { label: string; value?: string; placeholder: string; onPress: () => void }) {
  return (
    <Field label={label}>
      <Pressable style={styles.selectField} onPress={onPress}>
        <Text numberOfLines={1} style={[styles.selectText, !value && styles.placeholderText]}>{value || placeholder}</Text>
        <ChevronDown color={colors.muted} size={20} strokeWidth={2.4} />
      </Pressable>
    </Field>
  );
}

function SelectModal({
  visible,
  title,
  options,
  value,
  onSelect,
  onClose,
}: {
  visible: boolean;
  title: string;
  options: SelectOption[];
  value: string;
  onSelect: (value: string) => void;
  onClose: () => void;
}) {
  const insets = useSafeAreaInsets();

  return (
    <Modal visible={visible} transparent animationType="slide" statusBarTranslucent onRequestClose={onClose}>
      <Pressable style={styles.modalOverlay} onPress={onClose}>
        <Pressable style={[styles.modalSheet, { paddingBottom: Math.max(insets.bottom, spacing.lg) }]} onPress={() => undefined}>
          <View style={styles.modalHandle} />
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>{title}</Text>
            <Pressable accessibilityLabel="Close" style={styles.modalClose} onPress={onClose}>
              <X color={colors.ink} size={20} strokeWidth={2.5} />
            </Pressable>
          </View>
          <ScrollView style={styles.modalList} showsVerticalScrollIndicator={false}>
            {options.map((option) => {
              const selected = option.value === value;
              return (
                <Pressable
                  key={option.value}
                  style={[styles.modalOption, selected && styles.modalOptionSelected]}
                  onPress={() => {
                    onSelect(option.value);
                    onClose();
                  }}>
                  <Text style={[styles.modalOptionText, selected && styles.modalOptionTextSelected]}>{option.label}</Text>
                  {selected ? <Check color={colors.purple} size={18} strokeWidth={3} /> : null}
                </Pressable>
              );
            })}
          </ScrollView>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

function InterestsPanel({ user, token, categories, onBack, onUserUpdated, onToast }: CommonProps & { categories: InterestCategory[] }) {
  const initialInterests = user.onboarding?.interests || [];
  const [selected, setSelected] = useState<string[]>(initialInterests);
  const [activeCategory, setActiveCategory] = useState('All');
  const [search, setSearch] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => setSelected(user.onboarding?.interests || []), [user.onboarding?.interests]);

  const options = useMemo(() => {
    const source = activeCategory === 'All'
      ? categories
      : categories.filter((category) => category.name === activeCategory);
    const labels = source.flatMap((category) => (category.options || []).map(optionLabel));
    return [...new Set(labels.filter(Boolean))];
  }, [activeCategory, categories]);
  const filteredOptions = options.filter((label) => label.toLowerCase().includes(search.trim().toLowerCase()));
  const changed = !sameStringSet(initialInterests, selected);

  const toggle = (label: string) => {
    setSelected((current) => current.includes(label) ? current.filter((item) => item !== label) : [...current, label]);
  };

  const save = async () => {
    if (!changed || saving) return;
    setSaving(true);
    try {
      const result = await updateCurrentUser(token, { onboarding: { interests: selected } });
      await onUserUpdated(result.user);
      onToast('Interests saved.', 'success');
    } catch (error) {
      onToast(error instanceof Error ? error.message : 'Interests could not be saved.', 'error');
    } finally {
      setSaving(false);
    }
  };

  return (
    <PanelShell title="Interests" subtitle="Choose the activities and communities you want Jambit to recommend." onBack={onBack}>
      <Section title="Your interests" note="Select any number. These options are managed by Jambit.">
        {selected.length ? (
          <View style={styles.chipCloud}>
            {selected.map((label) => <ChoiceChip key={label} label={label} selected onPress={() => toggle(label)} />)}
          </View>
        ) : <Text style={styles.emptyText}>No interests selected yet.</Text>}
      </Section>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.categoryRow}>
        {['All', ...categories.map((category) => category.name)].map((category) => {
          const active = category === activeCategory;
          return (
            <Pressable key={category} style={[styles.categoryPill, active && styles.categoryPillActive]} onPress={() => setActiveCategory(category)}>
              <Text style={[styles.categoryPillText, active && styles.categoryPillTextActive]}>{category}</Text>
            </Pressable>
          );
        })}
      </ScrollView>

      <View style={styles.searchField}>
        <Search color={colors.muted} size={19} strokeWidth={2.4} />
        <TextInput
          value={search}
          style={styles.searchInput}
          placeholder="Search interests"
          placeholderTextColor={colors.muted}
          onChangeText={setSearch}
        />
      </View>

      <View style={styles.chipCloud}>
        {filteredOptions.map((label) => <ChoiceChip key={label} label={label} selected={selected.includes(label)} onPress={() => toggle(label)} />)}
      </View>
      {!filteredOptions.length ? <Text style={styles.emptyText}>No interests match this search.</Text> : null}

      <SaveButton busy={saving} disabled={!changed} onPress={save} />
    </PanelShell>
  );
}

function PersonalInfoPanel({ user, token, onBack, onUserUpdated, onToast }: CommonProps) {
  const personal = user.personalInfo || {};
  const savedIndustry = personal.industry || '';
  const [birthDate, setBirthDate] = useState(dateToDisplay(personal.birthDate || user.onboarding?.birthDate));
  const [gender, setGender] = useState(personal.gender || user.onboarding?.gender || '');
  const [lookingFor, setLookingFor] = useState(personal.lookingFor || []);
  const [lifeStages, setLifeStages] = useState(personal.lifeStages || []);
  const [industries, setIndustries] = useState(fallbackIndustries);
  const [industry, setIndustry] = useState(fallbackIndustries.includes(savedIndustry) ? savedIndustry : savedIndustry ? 'Other' : '');
  const [otherIndustry, setOtherIndustry] = useState(savedIndustry && !fallbackIndustries.includes(savedIndustry) ? savedIndustry : '');
  const [selector, setSelector] = useState<'gender' | 'industry' | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    getWorkIndustries()
      .then((payload) => {
        const next = payload.industries.map((item) => item.label.trim()).filter(Boolean);
        if (!next.length) return;
        setIndustries(next);
        if (savedIndustry) {
          setIndustry(next.includes(savedIndustry) ? savedIndustry : 'Other');
          setOtherIndustry(next.includes(savedIndustry) ? '' : savedIndustry);
        }
      })
      .catch(() => undefined);
  }, [savedIndustry]);

  const toggleList = (setter: React.Dispatch<React.SetStateAction<string[]>>, value: string) => {
    setter((current) => current.includes(value) ? current.filter((item) => item !== value) : [...current, value]);
  };

  const save = async () => {
    const isoBirthDate = birthDate ? displayDateToIso(birthDate) : '';
    if (birthDate && !isoBirthDate) {
      onToast('Use DD/MM/YYYY for birthdate.', 'error');
      return;
    }
    const customIndustry = otherIndustry.trim();
    if (industry === 'Other' && !customIndustry) {
      onToast('Write your work industry when Other is selected.', 'error');
      return;
    }

    setSaving(true);
    try {
      const result = await updateCurrentUser(token, {
        personalInfo: {
          birthDate: isoBirthDate || null,
          gender,
          lookingFor,
          industry: industry === 'Other' ? customIndustry : industry,
          lifeStages,
        },
      });
      await onUserUpdated(result.user);
      onToast('Personal info saved.', 'success');
    } catch (error) {
      onToast(error instanceof Error ? error.message : 'Personal info could not be saved.', 'error');
    } finally {
      setSaving(false);
    }
  };

  const industryOptions = [...new Set([...industries, 'Other'])].map((label) => ({ label, value: label }));
  const selectorOptions = selector === 'gender'
    ? genderOptions.map((label) => ({ label, value: label }))
    : industryOptions;

  return (
    <PanelShell title="Personal info" subtitle="These details improve recommendations. Gender and birthdate stay private." onBack={onBack}>
      <Section title="Basic details">
        <Field label="Birthdate">
          <TextInput
            value={birthDate}
            style={styles.textField}
            placeholder="DD/MM/YYYY"
            placeholderTextColor={colors.muted}
            keyboardType="number-pad"
            maxLength={10}
            onChangeText={setBirthDate}
          />
        </Field>
        <SelectField label="Gender" value={gender} placeholder="Select gender" onPress={() => setSelector('gender')} />
      </Section>

      <Section title="What are you looking for?">
        <View style={styles.chipCloud}>
          {lookingForOptions.map((label) => <ChoiceChip key={label} label={label} selected={lookingFor.includes(label)} onPress={() => toggleList(setLookingFor, label)} />)}
        </View>
      </Section>

      <Section title="Work">
        <SelectField label="Work industry" value={industry} placeholder="Select your industry" onPress={() => setSelector('industry')} />
        {industry === 'Other' ? (
          <Field label="Write your industry *">
            <TextInput
              value={otherIndustry}
              style={styles.textField}
              placeholder="For example, event production"
              placeholderTextColor={colors.muted}
              onChangeText={setOtherIndustry}
            />
          </Field>
        ) : null}
      </Section>

      <Section title="Life stages">
        <View style={styles.chipCloud}>
          {lifeStageOptions.map((label) => <ChoiceChip key={label} label={label} selected={lifeStages.includes(label)} onPress={() => toggleList(setLifeStages, label)} />)}
        </View>
      </Section>

      <SaveButton busy={saving} onPress={save} />
      <SelectModal
        visible={selector !== null}
        title={selector === 'gender' ? 'Select gender' : 'Select work industry'}
        options={selectorOptions}
        value={selector === 'gender' ? gender : industry}
        onSelect={(value) => selector === 'gender' ? setGender(value) : setIndustry(value)}
        onClose={() => setSelector(null)}
      />
    </PanelShell>
  );
}

function PasswordField({ value, placeholder, visible, onChangeText, onToggle }: { value: string; placeholder: string; visible: boolean; onChangeText: (value: string) => void; onToggle: () => void }) {
  const Icon = visible ? EyeOff : Eye;
  return (
    <View style={styles.passwordField}>
      <TextInput
        value={value}
        style={styles.passwordInput}
        placeholder={placeholder}
        placeholderTextColor={colors.muted}
        secureTextEntry={!visible}
        autoCapitalize="none"
        onChangeText={onChangeText}
      />
      <Pressable accessibilityLabel={visible ? 'Hide password' : 'Show password'} hitSlop={8} style={styles.eyeButton} onPress={onToggle}>
        <Icon color={colors.muted} size={20} strokeWidth={2.4} />
      </Pressable>
    </View>
  );
}

function AccountManagementPanel({ user, token, onBack, onUserUpdated, onToast }: CommonProps) {
  const hasPassword = user.hasPassword ?? user.provider !== 'google';
  const [language, setLanguage] = useState(user.accountSettings?.language || 'en');
  const [timeZone, setTimeZone] = useState(user.accountSettings?.timeZone || 'system');
  const [selector, setSelector] = useState<'language' | 'timezone' | null>(null);
  const [saving, setSaving] = useState(false);
  const [changingPassword, setChangingPassword] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const saveSettings = async () => {
    setSaving(true);
    try {
      const result = await updateCurrentUser(token, { accountSettings: { language, timeZone } });
      await onUserUpdated(result.user);
      onToast('Account settings saved.', 'success');
    } catch (error) {
      onToast(error instanceof Error ? error.message : 'Account settings could not be saved.', 'error');
    } finally {
      setSaving(false);
    }
  };

  const savePassword = async () => {
    if (hasPassword && !currentPassword) {
      onToast('Enter your current password.', 'error');
      return;
    }
    if (newPassword.length < 10) {
      onToast('New password must be at least 10 characters.', 'error');
      return;
    }
    if (newPassword !== confirmPassword) {
      onToast('New passwords do not match.', 'error');
      return;
    }

    setChangingPassword(true);
    try {
      const result = await changeCurrentPassword(token, currentPassword, newPassword);
      await onUserUpdated(result.user);
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      onToast(result.message || (hasPassword ? 'Password updated.' : 'Password created.'), 'success');
    } catch (error) {
      onToast(error instanceof Error ? error.message : 'Password could not be updated.', 'error');
    } finally {
      setChangingPassword(false);
    }
  };

  const languageLabel = languageOptions.find((option) => option.value === language)?.label || language;
  const timeZoneLabel = timeZoneOptions.find((option) => option.value === timeZone)?.label || timeZone;
  const selectorOptions = selector === 'language' ? languageOptions : timeZoneOptions;

  return (
    <PanelShell title="Account management" subtitle="Manage account preferences and sign-in security." onBack={onBack}>
      <Section title="Account settings">
        <Field label="Your email">
          <View style={styles.readOnlyField}><Text style={styles.readOnlyText}>{user.email}</Text></View>
        </Field>
        <SelectField label="Language" value={languageLabel} placeholder="Select language" onPress={() => setSelector('language')} />
        <SelectField label="Primary time zone" value={timeZoneLabel} placeholder="Select time zone" onPress={() => setSelector('timezone')} />
        <Text style={styles.helperText}>Your time-zone choice controls how event times are displayed.</Text>
        <SaveButton busy={saving} onPress={saveSettings} />
      </Section>

      <View style={styles.divider} />

      <Section
        title={hasPassword ? 'Change your password' : 'Create an email password'}
        note={hasPassword
          ? 'Use at least 10 characters for your new password.'
          : `Create a password for ${user.email} so you can sign in with Google or email.`}>
        <View style={styles.passwordHeading}>
          <View style={styles.passwordIcon}><Lock color={colors.purple} size={19} strokeWidth={2.6} /></View>
          <Text style={styles.passwordHeadingText}>Password security</Text>
        </View>
        {hasPassword ? (
            <PasswordField value={currentPassword} placeholder="Current password" visible={showCurrent} onChangeText={setCurrentPassword} onToggle={() => setShowCurrent((current) => !current)} />
        ) : null}
        <PasswordField value={newPassword} placeholder="New password" visible={showNew} onChangeText={setNewPassword} onToggle={() => setShowNew((current) => !current)} />
        <PasswordField value={confirmPassword} placeholder="Confirm new password" visible={showConfirm} onChangeText={setConfirmPassword} onToggle={() => setShowConfirm((current) => !current)} />
        <SaveButton
          label={hasPassword ? 'Change password' : 'Create password'}
          busy={changingPassword}
          disabled={(hasPassword && !currentPassword) || !newPassword || !confirmPassword}
          onPress={savePassword}
        />
      </Section>

      <SelectModal
        visible={selector !== null}
        title={selector === 'language' ? 'Select language' : 'Select time zone'}
        options={selectorOptions}
        value={selector === 'language' ? language : timeZone}
        onSelect={(value) => selector === 'language' ? setLanguage(value) : setTimeZone(value)}
        onClose={() => setSelector(null)}
      />
    </PanelShell>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: colors.bg },
  screen: { paddingHorizontal: spacing.lg, paddingBottom: 138, backgroundColor: colors.bg },
  header: { minHeight: 56, flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  backButton: { width: 42, height: 42, alignItems: 'center', justifyContent: 'center', borderRadius: 21, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.softLine },
  headerCopy: { flex: 1 },
  kicker: { color: colors.coral, fontFamily: fonts.semibold, fontSize: 11, lineHeight: 15, textTransform: 'uppercase' },
  title: { color: colors.ink, fontFamily: fonts.bold, fontSize: 24, lineHeight: 31 },
  subtitle: { marginTop: 7, marginBottom: spacing.lg, color: colors.muted, fontFamily: fonts.medium, fontSize: 13, lineHeight: 19 },
  section: { marginBottom: spacing.lg, padding: spacing.lg, borderRadius: radius.md, borderWidth: 1, borderColor: colors.softLine, backgroundColor: colors.surface, ...shadow.card },
  sectionTitle: { color: colors.ink, fontFamily: fonts.bold, fontSize: 17, lineHeight: 23 },
  sectionNote: { marginTop: 4, marginBottom: spacing.md, color: colors.muted, fontFamily: fonts.medium, fontSize: 12, lineHeight: 18 },
  field: { marginTop: spacing.md },
  fieldLabel: { marginBottom: 7, color: colors.ink, fontFamily: fonts.semibold, fontSize: 12, lineHeight: 17 },
  textField: { minHeight: 50, paddingHorizontal: 14, borderRadius: 14, borderWidth: 1, borderColor: colors.line, backgroundColor: '#fffdfb', color: colors.ink, fontFamily: fonts.medium, fontSize: 14 },
  selectField: { minHeight: 50, flexDirection: 'row', alignItems: 'center', gap: spacing.sm, paddingHorizontal: 14, borderRadius: 14, borderWidth: 1, borderColor: colors.line, backgroundColor: '#fffdfb' },
  selectText: { flex: 1, color: colors.ink, fontFamily: fonts.medium, fontSize: 14 },
  placeholderText: { color: colors.muted },
  chipCloud: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: spacing.md },
  choiceChip: { minHeight: 38, flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 12, borderRadius: radius.pill, borderWidth: 1, borderColor: colors.line, backgroundColor: colors.surface },
  choiceChipSelected: { borderColor: colors.purple, backgroundColor: colors.purpleSoft },
  choiceChipText: { color: colors.text, fontFamily: fonts.semibold, fontSize: 12, lineHeight: 17 },
  choiceChipTextSelected: { color: '#4933a8' },
  categoryRow: { gap: 8, paddingBottom: spacing.md },
  categoryPill: { minHeight: 36, justifyContent: 'center', paddingHorizontal: 13, borderRadius: radius.pill, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.line },
  categoryPillActive: { borderColor: colors.coral, backgroundColor: '#fff0ea' },
  categoryPillText: { color: colors.muted, fontFamily: fonts.semibold, fontSize: 11 },
  categoryPillTextActive: { color: colors.coral },
  searchField: { minHeight: 50, flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginBottom: spacing.sm, paddingHorizontal: 14, borderRadius: 15, backgroundColor: '#f3eee9' },
  searchInput: { flex: 1, color: colors.ink, fontFamily: fonts.medium, fontSize: 14, paddingVertical: 0 },
  emptyText: { marginTop: spacing.md, color: colors.muted, fontFamily: fonts.medium, fontSize: 12, lineHeight: 18 },
  saveButton: { minHeight: 52, alignItems: 'center', justifyContent: 'center', marginTop: spacing.lg, borderRadius: radius.pill, backgroundColor: colors.coral, ...shadow.strong },
  saveButtonDisabled: { opacity: 0.42, shadowOpacity: 0, elevation: 0 },
  saveButtonText: { color: colors.surface, fontFamily: fonts.bold, fontSize: 15, lineHeight: 21 },
  modalOverlay: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(31,41,55,0.42)' },
  modalSheet: { maxHeight: '72%', paddingHorizontal: spacing.lg, paddingTop: 10, borderTopLeftRadius: 28, borderTopRightRadius: 28, backgroundColor: colors.surface },
  modalHandle: { alignSelf: 'center', width: 42, height: 4, marginBottom: spacing.md, borderRadius: 2, backgroundColor: colors.line },
  modalHeader: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, marginBottom: spacing.sm },
  modalTitle: { flex: 1, color: colors.ink, fontFamily: fonts.bold, fontSize: 19, lineHeight: 25 },
  modalClose: { width: 38, height: 38, alignItems: 'center', justifyContent: 'center', borderRadius: 19, backgroundColor: colors.cream },
  modalList: { flexGrow: 0 },
  modalOption: { minHeight: 52, flexDirection: 'row', alignItems: 'center', gap: spacing.sm, paddingHorizontal: 13, borderRadius: 13 },
  modalOptionSelected: { backgroundColor: colors.purpleSoft },
  modalOptionText: { flex: 1, color: colors.text, fontFamily: fonts.medium, fontSize: 14 },
  modalOptionTextSelected: { color: '#4933a8', fontFamily: fonts.semibold },
  readOnlyField: { minHeight: 50, justifyContent: 'center', paddingHorizontal: 14, borderRadius: 14, backgroundColor: '#f3eee9' },
  readOnlyText: { color: colors.muted, fontFamily: fonts.medium, fontSize: 14 },
  helperText: { marginTop: spacing.sm, color: colors.muted, fontFamily: fonts.medium, fontSize: 11, lineHeight: 17 },
  divider: { height: 1, marginVertical: spacing.sm, backgroundColor: colors.line },
  passwordHeading: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginTop: spacing.md, marginBottom: spacing.sm },
  passwordIcon: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center', borderRadius: 18, backgroundColor: colors.purpleSoft },
  passwordHeadingText: { color: colors.ink, fontFamily: fonts.semibold, fontSize: 13 },
  passwordField: { minHeight: 50, flexDirection: 'row', alignItems: 'center', marginTop: spacing.sm, paddingLeft: 14, paddingRight: 7, borderRadius: 14, borderWidth: 1, borderColor: colors.line, backgroundColor: '#fffdfb' },
  passwordInput: { flex: 1, color: colors.ink, fontFamily: fonts.medium, fontSize: 14, paddingVertical: 0 },
  eyeButton: { width: 38, height: 38, alignItems: 'center', justifyContent: 'center', borderRadius: 19 },
});
