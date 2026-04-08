import { Ionicons } from '@expo/vector-icons';
import { Asset } from 'expo-asset';
import { useMemo, useState } from 'react';
import {
  Modal,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  ViewStyle,
  View,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { SvgUri } from 'react-native-svg';

import { showGlobalNotice } from '@/src/shared/notice/noticeCenter';

type CreateMode = 'free' | 'fixed';
type TemplateMode = 'adventure' | 'romance';

type GenreCard = {
  id: string;
  emoji: string;
  label: string;
  iconBg: string;
};

const BASE_GENRES: GenreCard[] = [
  { id: 'mystery', emoji: '🔍', label: '悬疑', iconBg: '#FACC15' },
  { id: 'romance', emoji: '💕', label: '恋爱', iconBg: '#FECDD3' },
  { id: 'fantasy', emoji: '🔮', label: '奇幻', iconBg: '#DDD6FE' },
  { id: 'campus', emoji: '🏫', label: '校园', iconBg: '#BBF7D0' },
  { id: 'scifi', emoji: '🚀', label: '科幻', iconBg: '#BFDBFE' },
  { id: 'urban', emoji: '🌃', label: '都市', iconBg: '#FED7AA' },
  { id: 'xianxia', emoji: '⚔️', label: '仙侠', iconBg: '#FECACA' },
];

const MORE_GENRES: GenreCard[] = [
  ...BASE_GENRES,
  { id: 'history', emoji: '📜', label: '历史', iconBg: '#FED7AA' },
  { id: 'idea', emoji: '💡', label: '脑洞', iconBg: '#E9D5FF' },
];

export default function EncounterScreen() {
  const { t, i18n } = useTranslation();
  const insets = useSafeAreaInsets();
  const [mode, setMode] = useState<CreateMode>('free');
  const [template, setTemplate] = useState<TemplateMode>('adventure');
  const [inspiration, setInspiration] = useState('');
  const [endingGoal, setEndingGoal] = useState('');
  const [selectedGenreIds, setSelectedGenreIds] = useState<string[]>(['mystery']);
  const [showModeDropdown, setShowModeDropdown] = useState(false);
  const [showMoreGenres, setShowMoreGenres] = useState(false);
  const [showPcHint, setShowPcHint] = useState(false);
  const [isBlindBoxLoading, setIsBlindBoxLoading] = useState(false);
  const [showBlindBoxLoadingPanel, setShowBlindBoxLoadingPanel] = useState(false);
  const [showInspirationError, setShowInspirationError] = useState(false);
  const [showGoalError, setShowGoalError] = useState(false);

  const inspirationLength = inspiration.length;
  const modeTitle =
    mode === 'free' ? t('create.headerModeFreeTitle') : t('create.headerModeFixedTitle');
  const isZh = i18n.language.toLowerCase().startsWith('zh');

  const selectedGenreText = t('create.selectedGenreCount', {
    count: selectedGenreIds.length,
  });

  const visibleGenres = useMemo(() => BASE_GENRES, []);

  function toggleGenre(genreId: string) {
    setSelectedGenreIds((prev) => {
      if (prev.includes(genreId)) return prev.filter((id) => id !== genreId);
      return [...prev, genreId];
    });
  }

  function runBlindBox() {
    if (isBlindBoxLoading) return;
    setIsBlindBoxLoading(true);
    setShowBlindBoxLoadingPanel(true);
    setTimeout(() => {
      setShowBlindBoxLoadingPanel(false);
      setIsBlindBoxLoading(false);
      showGlobalNotice(t('create.blindBoxPending'));
    }, 1400);
  }

  function handleModePick(next: 'free' | 'fixed' | 'outline') {
    setShowModeDropdown(false);
    if (next === 'outline') {
      setShowPcHint(true);
      return;
    }
    setMode(next);
  }

  function handleGenerate() {
    const inspirationMissing = inspiration.trim().length === 0;
    const goalMissing = mode === 'fixed' && endingGoal.trim().length === 0;
    setShowInspirationError(inspirationMissing);
    setShowGoalError(mode === 'fixed' ? goalMissing : false);
    if (inspirationMissing || goalMissing) return;
    showGlobalNotice(t('create.generatePending'));
  }

  return (
    <View style={styles.screen}>
      <View style={{ height: insets.top }} />

      <View style={styles.header}>
        <Pressable style={styles.headerMode} onPress={() => setShowModeDropdown(true)}>
          <Text style={styles.headerModeText}>{modeTitle}</Text>
          <Text style={styles.headerModeArrow}>▼</Text>
        </Pressable>
      </View>

      <View style={styles.content}>
        <View style={styles.formCard}>
          <Text style={styles.sectionTitle}>{t('create.inspirationLabel')}</Text>

          <View style={[styles.ideaInputCard, showInspirationError && styles.errorBorder]}>
            <Text style={styles.counterText}>{`${inspirationLength}/80`}</Text>

            <Pressable style={styles.blindBoxButton} onPress={runBlindBox}>
              <Text style={styles.blindBoxText}>
                {isBlindBoxLoading ? t('create.blindBoxGenerating') : t('create.tryBlindBox')}
              </Text>
              <BlindboxSparkIcon />
            </Pressable>

            {showBlindBoxLoadingPanel ? (
              <View style={styles.blindBoxLoadingPanel}>
                <Text style={styles.blindBoxLoadingTitle}>{t('create.blindBoxLoadingTitle')}</Text>
                <Text style={styles.blindBoxLoadingDesc}>{t('create.blindBoxLoadingDesc')}</Text>
                <View style={styles.spinnerRing} />
              </View>
            ) : null}

            <TextInput
              value={inspiration}
              onChangeText={(text) => {
                setInspiration(text);
                if (text.trim().length > 0) setShowInspirationError(false);
              }}
              multiline
              maxLength={80}
              textAlignVertical="top"
              style={styles.ideaInput}
              placeholder={t('create.inspirationPlaceholder')}
              placeholderTextColor="#9CA3AF"
            />

            <View style={styles.genreBottomArea}>
              <Text style={styles.genreLabel}>{t('create.genreLabel')}</Text>
              <View style={styles.genreRow}>
                {visibleGenres.map((genre) => {
                  const selected = selectedGenreIds.includes(genre.id);
                  return (
                    <Pressable
                      key={genre.id}
                      style={[styles.genreChip, selected && styles.genreChipSelected]}
                      onPress={() => toggleGenre(genre.id)}
                    >
                      <Text style={[styles.genreChipText, selected && styles.genreChipTextSelected]}>
                        {genre.label}
                      </Text>
                    </Pressable>
                  );
                })}
                <Pressable style={[styles.genreChip, styles.genreChipMore]} onPress={() => setShowMoreGenres(true)}>
                  <Text style={styles.genreChipText}>{t('create.moreGenres')}</Text>
                </Pressable>
              </View>
            </View>
          </View>

          {showInspirationError ? (
            <Text style={styles.errorText}>{t('create.inspirationRequired')}</Text>
          ) : null}

          {mode === 'free' ? (
            <>
              <Text style={[styles.sectionTitle, styles.templateTitleSpacing]}>
                {t('create.templateLabel')}
              </Text>
              <View style={styles.templateRow}>
                <Pressable
                  style={getTemplateCardStyle(template === 'adventure')}
                  onPress={() => setTemplate('adventure')}
                >
                  <View style={[styles.templateBadge, template === 'adventure' && styles.templateBadgeSelected]}>
                    <Text style={styles.templateBadgeText}>⚔️</Text>
                  </View>
                  <Text style={[styles.templateName, template === 'adventure' && styles.templateNameSelected]}>
                    {t('create.templateAdventure')}
                  </Text>
                  <Text style={[styles.templateHint, template === 'adventure' && styles.templateHintSelected]}>
                    {template === 'adventure'
                      ? t('create.templateSelected')
                      : t('create.templateTapToChoose')}
                  </Text>
                </Pressable>

                <Pressable
                  style={getTemplateCardStyle(template === 'romance')}
                  onPress={() => setTemplate('romance')}
                >
                  <View
                    style={[
                      styles.templateBadge,
                      styles.templateBadgeAlt,
                      template === 'romance' && styles.templateBadgeSelected,
                    ]}
                  >
                    <Text style={styles.templateBadgeText}>💗</Text>
                  </View>
                  <Text style={[styles.templateName, template === 'romance' && styles.templateNameSelected]}>
                    {t('create.templateRomance')}
                  </Text>
                  <Text style={[styles.templateHint, template === 'romance' && styles.templateHintSelected]}>
                    {template === 'romance'
                      ? t('create.templateSelected')
                      : t('create.templateTapToChoose')}
                  </Text>
                </Pressable>
              </View>
            </>
          ) : (
            <>
              <View style={styles.goalTitleRow}>
                <Text style={styles.sectionTitle}>{t('create.endingGoalLabel')}</Text>
                <Text style={styles.goalHint}>{t('create.endingGoalHint')}</Text>
              </View>
              <View style={[styles.goalInputCard, showGoalError && styles.goalInputCardError]}>
                <TextInput
                  value={endingGoal}
                  onChangeText={(text) => {
                    setEndingGoal(text);
                    if (text.trim().length > 0) setShowGoalError(false);
                  }}
                  multiline
                  textAlignVertical="top"
                  style={styles.goalInput}
                  placeholder={t('create.endingGoalPlaceholder')}
                  placeholderTextColor="#9CA3AF"
                />
              </View>
              {/* {showInspirationError ? (
                <Text style={styles.errorText}>{t('create.inspirationRequiredForFixed')}</Text>
              ) : null} */}
              {showGoalError ? (
                <Text style={styles.errorText}>{t('create.endingGoalRequired')}</Text>
              ) : null}
            </>
          )}

          <Pressable style={styles.generateButton} onPress={handleGenerate}>
            <Text style={styles.generateButtonText}>{t('create.generateStory')}</Text>
          </Pressable>
        </View>
      </View>

      <Modal
        visible={showModeDropdown}
        transparent
        animationType="fade"
        onRequestClose={() => setShowModeDropdown(false)}
      >
        <View style={styles.modeOverlayRoot}>
          <Pressable style={styles.overlayDismiss} onPress={() => setShowModeDropdown(false)} />
          <View style={[styles.modeDropdownCard, { top: insets.top + 54 }]}>
            <Pressable style={styles.modeOption} onPress={() => handleModePick('free')}>
              <Text style={[styles.modeOptionText, mode === 'free' && styles.modeOptionTextActive]}>
                {mode === 'free'
                  ? `${t('create.modeFree')}${isZh ? '（当前）' : ' (Current)'}`
                  : t('create.modeFree')}
              </Text>
            </Pressable>
            <Pressable style={styles.modeOption} onPress={() => handleModePick('fixed')}>
              <Text style={[styles.modeOptionText, mode === 'fixed' && styles.modeOptionTextActive]}>
                {mode === 'fixed' ? t('create.modeFixedCurrent') : t('create.modeFixed')}
              </Text>
            </Pressable>
            <Pressable style={styles.modeOption} onPress={() => handleModePick('outline')}>
              <Text style={styles.modeOptionText}>{t('create.modeOutline')}</Text>
            </Pressable>
          </View>
        </View>
      </Modal>

      <Modal
        visible={showMoreGenres}
        transparent
        animationType="fade"
        onRequestClose={() => setShowMoreGenres(false)}
      >
        <View style={styles.overlayRoot}>
          <Pressable style={styles.moreOverlay} onPress={() => setShowMoreGenres(false)} />
          <View style={styles.moreModal}>
            <View style={styles.moreHeaderRow}>
              <Text style={styles.moreTitle}>{t('create.moreGenresTitle')}</Text>
              <Text style={styles.moreSubtitle}>{selectedGenreText}</Text>
            </View>
            <View style={styles.genreGrid}>
              {MORE_GENRES.map((genre) => {
                const selected = selectedGenreIds.includes(genre.id);
                return (
                  <Pressable
                    key={genre.id}
                    style={[styles.genreCard, selected && styles.genreCardSelected]}
                    onPress={() => toggleGenre(genre.id)}
                  >
                    <Text style={[styles.genreCardLabel, selected && styles.genreCardLabelSelected]}>
                      {genre.label}
                    </Text>
                    <View
                      style={[
                        styles.genreCardEmojiWrap,
                        { backgroundColor: genre.iconBg },
                        selected && styles.genreCardEmojiWrapSelected,
                      ]}
                    >
                      <Text style={styles.genreCardEmoji}>{genre.emoji}</Text>
                    </View>
                  </Pressable>
                );
              })}
            </View>
            <View style={styles.genreListBottomGap} />
            <Pressable style={styles.moreConfirmButton} onPress={() => setShowMoreGenres(false)}>
              <Text style={styles.moreConfirmText}>{t('common.confirm')}</Text>
            </Pressable>
          </View>
        </View>
      </Modal>

      <Modal
        visible={showPcHint}
        transparent
        animationType="fade"
        onRequestClose={() => setShowPcHint(false)}
      >
        <View style={styles.overlayRoot}>
          <Pressable style={styles.overlayDismiss} onPress={() => setShowPcHint(false)} />
          <View style={styles.pcDialog}>
            <View style={styles.pcIconWrap}>
              <Text style={styles.pcIcon}>💻</Text>
            </View>
            <Text style={styles.pcTitle}>{t('create.pcHintTitle')}</Text>
            <Text style={styles.pcDesc}>{t('create.pcHintDescription')}</Text>
            <Pressable style={styles.pcBtn} onPress={() => setShowPcHint(false)}>
              <Text style={styles.pcBtnText}>{t('create.gotIt')}</Text>
            </Pressable>
          </View>
        </View>
      </Modal>
    </View>
  );
}

function BlindboxSparkIcon() {
  const source = Asset.fromModule(require('@/assets/create/create_blindbox_spark.svg')).uri;
  return (
    <SvgUri width={10} height={10} uri={source} />
  );
}

function getTemplateCardStyle(selected: boolean): ViewStyle[] {
  return [styles.templateCard, selected ? styles.templateCardSelected : styles.templateCardUnselected];
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#FFFFFF' },
  header: { height: 56, justifyContent: 'center', alignItems: 'center' },
  headerMode: { flexDirection: 'row', alignItems: 'center' },
  headerModeText: { color: '#111827', fontSize: 18, fontWeight: '500' },
  headerModeArrow: { marginLeft: 4, color: '#111827', fontSize: 12, fontWeight: '700' },
  content: { flex: 1, paddingBottom: 8 },
  formCard: {
    flex: 1,
    marginTop: 2,
    marginHorizontal: 24,
    borderRadius: 20,
    backgroundColor: '#F3F4F6',
    borderWidth: 1,
    borderColor: '#E7E5E4',
    paddingHorizontal: 16,
    paddingTop: 18,
    paddingBottom: 14,
  },
  sectionTitle: { color: '#111827', fontSize: 14, fontWeight: '600' },
  ideaInputCard: {
    marginTop: 11,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#E7E5E4',
    backgroundColor: '#FFFFFF',
    flex: 1,
    minHeight: 0,
    paddingTop: 13,
    paddingHorizontal: 12,
    paddingBottom: 12,
  },
  counterText: { color: '#9CA3AF', fontSize: 11 },
  blindBoxButton: {
    position: 'absolute',
    top: 13,
    right: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  blindBoxText: { color: '#9CA3AF', fontSize: 10, fontWeight: '600' },
  blindBoxLoadingPanel: {
    marginTop: 10,
    borderRadius: 999,
    alignItems: 'center',
    paddingVertical: 10,
    backgroundColor: '#FFFFFF',
  },
  blindBoxLoadingTitle: { color: '#111827', fontSize: 16, fontWeight: '700' },
  blindBoxLoadingDesc: {
    marginTop: 4,
    color: '#9CA3AF',
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 18,
  },
  spinnerRing: {
    marginTop: 8,
    width: 24,
    height: 24,
    borderRadius: 999,
    borderWidth: 4,
    borderColor: '#FACC15',
  },
  ideaInput: {
    marginTop: 16,
    color: '#111827',
    fontSize: 13,
    lineHeight: 16,
    flex: 1,
    minHeight: 0,
    padding: 0,
  },
  genreBottomArea: {
    marginTop: 'auto',
  },
  genreLabel: { marginTop: 10, color: '#9CA3AF', fontSize: 14, fontWeight: '500' },
  genreRow: { marginTop: 8, flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', rowGap: 10 },
  genreChip: {
    width: '22%',
    height: 30,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  genreChipMore: {
    backgroundColor: '#fff',
  },
  genreChipSelected: { backgroundColor: '#111827', borderColor: '#111827' },
  genreChipText: { color: '#4B5563', fontSize: 13, fontWeight: '500' },
  genreChipTextSelected: { color: '#FFFFFF' },
  templateTitleSpacing: { marginTop: 20 },
  templateRow: { marginTop: 11, flexDirection: 'row', gap: 12, paddingHorizontal: 0 },
  templateCard: {
    flex: 1,
    height: 67,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    backgroundColor: '#F5F5F4',
    paddingLeft: 44,
    paddingTop: 12,
  },
  templateCardSelected: { backgroundColor: '#111827', borderColor: '#111827' },
  templateCardUnselected: { backgroundColor: '#F5F5F4', borderColor: '#E5E7EB' },
  templateBadge: {
    position: 'absolute',
    left: 12,
    top: 12,
    width: 22,
    height: 22,
    borderRadius: 999,
    backgroundColor: '#E5E7EB',
    alignItems: 'center',
    justifyContent: 'center',
  },
  templateBadgeAlt: { backgroundColor: '#D6D3D1' },
  templateBadgeSelected: { backgroundColor: '#FACC15' },
  templateBadgeText: { fontSize: 12 },
  templateName: { color: '#111827', fontSize: 16, fontWeight: '600' },
  templateNameSelected: { color: '#FFFFFF' },
  templateHint: { marginTop: 2, color: '#6B7280', fontSize: 12 },
  templateHintSelected: { color: '#FACC15' },
  goalTitleRow: { marginTop: 20, flexDirection: 'row', alignItems: 'center' },
  goalHint: { marginLeft: 8, color: '#A16207', fontSize: 11, fontWeight: '500' },
  goalInputCard: {
    marginTop: 11,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#E7E5E4',
    backgroundColor: '#FFFFFF',
    minHeight: 67,
    padding: 8,
  },
  goalInputCardError: {
    borderColor: '#EF4444',
  },
  goalInput: { color: '#111827', fontSize: 10, lineHeight: 12, minHeight: 50, padding: 0 },
  generateButton: {
    marginTop: 21,
    width: 310,
    height: 44,
    borderRadius: 9999,
    backgroundColor: '#FACC15',
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.25,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 4 },
  },
  generateButtonText: { color: '#1F2937', fontSize: 16, fontWeight: '700' },
  errorBorder: { borderColor: '#EF4444' },
  errorText: { marginTop: 3, marginLeft: 4, color: '#EF4444', fontSize: 12 },
  overlayRoot: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  modeOverlayRoot: { flex: 1, alignItems: 'center' },
  overlayDismiss: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.35)' },
  modeDropdownCard: {
    position: 'absolute',
    width: 158,
    height: 110,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E7E5E4',
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  modeOption: { height: 26, justifyContent: 'center' },
  modeOptionText: { color: '#6B7280', fontSize: 13, fontWeight: '500', textAlign: 'center' },
  modeOptionTextActive: { color: '#000000' },
  modeOptionTextMuted: { color: '#6B7280' },
  moreOverlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.40)' },
  moreModal: {
    width: 390,
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    paddingHorizontal: 24,
    paddingTop: 18,
    paddingBottom: 12,
  },
  moreHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  moreTitle: { color: '#111827', fontSize: 16, fontWeight: '700' },
  moreSubtitle: { color: '#6B7280', fontSize: 12 },
  genreGrid: {
    marginTop: 14,
    width: 343,
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    rowGap: 12,
    alignSelf: 'center',
  },
  genreCard: {
    width: 105,
    height: 56,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#E7E5E4',
    backgroundColor: '#F5F5F4',
    justifyContent: 'center',
    alignItems: 'center'
  },
  genreCardSelected: { backgroundColor: '#111827', borderColor: '#111827' },
  genreCardLabel: { color: '#111827', fontSize: 14, fontWeight: '600' },
  genreCardLabelSelected: { color: '#FACC15' },
  genreCardEmojiWrap: {
    width: 20,
    height: 20,
    borderRadius: 8,
    marginTop: 3,
    backgroundColor: '#E7E5E4',
    alignItems: 'center',
    justifyContent: 'center',
  },
  genreCardEmojiWrapSelected: { backgroundColor: '#FACC15' },
  genreCardEmoji: { fontSize: 11 },
  moreConfirmButton: {
    width: 342,
    height: 48,
    borderRadius: 12,
    backgroundColor: '#111827',
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'center',
  },
  moreConfirmText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
  genreListBottomGap: {
    height: 244,
  },
  pcDialog: {
    width: 280,
    height: 240,
    borderRadius: 20,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    paddingTop: 24,
  },
  pcIconWrap: {
    width: 60,
    height: 60,
    borderRadius: 14,
    backgroundColor: '#F5F5F4',
    alignItems: 'center',
    justifyContent: 'center',
  },
  pcIcon: { fontSize: 28 },
  pcTitle: { marginTop: 16, color: '#111827', fontSize: 18, fontWeight: '700' },
  pcDesc: {
    marginTop: 12,
    color: '#6B7280',
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 18,
  },
  pcBtn: {
    marginTop: 12,
    width: 232,
    height: 40,
    borderRadius: 12,
    backgroundColor: '#111827',
    alignItems: 'center',
    justifyContent: 'center',
  },
  pcBtnText: { color: '#FFFFFF', fontSize: 14, fontWeight: '700' },
});
