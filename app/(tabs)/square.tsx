import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import {
  ActivityIndicator,
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { listStories } from '@/src/data/story/storyService';
import { readingProgressRepository } from '@/src/storage/db/repositories/readingProgressRepository';
import { AppNavigator } from '@/src/navigation/appNavigator';
import type { ReadingProgressRow } from '@/src/storage/db/types';

const SQUARE_BANNER_1 = require('../../assets/story/square/banner_story_1.png');
const SQUARE_COVER_1 = require('../../assets/story/square/story_cover_1.png');
const SQUARE_COVER_2 = require('../../assets/story/square/story_cover_2.png');
const SQUARE_COVER_3 = require('../../assets/story/square/story_cover_3.png');
const SQUARE_COVER_4 = require('../../assets/story/square/story_cover_4.png');
const STORY_MAIN_COVER = require('../../assets/story/cover.jpg');
const FEED_DEFAULT_STORY_ID = 'story_001';

type SquareCategory = {
  id: string;
  name: string;
};

type SquareStory = {
  id: string;
  title: string;
  description: string;
  coverSource: number;
  tags: string[];
  categoryId: string;
  readCount: number;
  coreCharacterName: string;
};

type FocusCard = {
  id: string;
  storyId: string;
  imageSource: number;
  title: string;
  subtitle: string;
};

const categories: SquareCategory[] = [
  { id: 'cat_all', name: '全部' },
  { id: 'cat_mystery', name: '解密' },
  { id: 'cat_rules', name: '规则' },
  { id: 'cat_palace', name: '宫廷' },
  { id: 'cat_romance', name: '乙女' },
];

const squareStories: SquareStory[] = [
  {
    id: 'story_001',
    title: '重回高三：这次我选他',
    description: '如果人生可以重来，在那个分岔路口，你会走向谁？',
    coverSource: SQUARE_COVER_1,
    tags: ['校园', '治愈'],
    categoryId: 'cat_romance',
    readCount: 45000,
    coreCharacterName: '姜烨',
  },
  {
    id: 'story_002',
    title: '落入凡尘的星光',
    description: '娱乐圈生存法则：是保持初心，还是步步为营？',
    coverSource: SQUARE_COVER_3,
    tags: ['都市', '逆袭'],
    categoryId: 'cat_all',
    readCount: 38000,
    coreCharacterName: '姜烨',
  },
  {
    id: 'story_003',
    title: '赛博霓虹：觉醒时刻',
    description: '在机械与灵魂的边缘，你的每一个决定都关乎人类存亡。',
    coverSource: SQUARE_COVER_2,
    tags: ['科幻', '悬疑'],
    categoryId: 'cat_mystery',
    readCount: 22000,
    coreCharacterName: '姜烨',
  },
  {
    id: 'story_004',
    title: '仙途：一念成魔',
    description: '修仙路上，是守护苍生，还是唯我独尊？',
    coverSource: SQUARE_COVER_4,
    tags: ['仙侠', '权谋'],
    categoryId: 'cat_all',
    readCount: 56000,
    coreCharacterName: '姜烨',
  },
  {
    id: 'story_005',
    title: '第七条规则',
    description: '你已经违反了前三条，正在生成第四条规则...',
    coverSource: SQUARE_BANNER_1,
    tags: ['规则怪谈', '悬疑'],
    categoryId: 'cat_rules',
    readCount: 125000,
    coreCharacterName: '艾莉娅',
  },
  {
    id: 'story_006',
    title: '星际迷航：未知领域',
    description: '在浩瀚宇宙中，探索未知的星系和文明。',
    coverSource: SQUARE_COVER_3,
    tags: ['科幻', '冒险'],
    categoryId: 'cat_all',
    readCount: 32000,
    coreCharacterName: '姜烨',
  },
  {
    id: 'story_007',
    title: '古墓迷踪：寻宝之旅',
    description: '深入古墓，解开千年之谜，寻找失落的宝藏。',
    coverSource: SQUARE_COVER_2,
    tags: ['冒险', '解谜'],
    categoryId: 'cat_mystery',
    readCount: 28000,
    coreCharacterName: '姜烨',
  },
];

const focusCards: FocusCard[] = [
  {
    id: 'focus_001',
    storyId: 'story_005',
    imageSource: SQUARE_BANNER_1,
    title: '《第七条规则》',
    subtitle: '你已经违反了前三条，正在生成第四条规则...',
  },
  {
    id: 'focus_002',
    storyId: 'story_001',
    imageSource: SQUARE_COVER_1,
    title: '《重回高三：这次我选他》',
    subtitle: '如果人生可以重来，在那个分岔路口，你会走向谁？',
  },
  {
    id: 'focus_003',
    storyId: 'story_002',
    imageSource: SQUARE_COVER_3,
    title: '《落入凡尘的星光》',
    subtitle: '娱乐圈生存法则：是保持初心，还是步步为营？',
  },
];

function formatHotCount(readCount: number): string {
  if (readCount >= 10000) return `${(readCount / 10000).toFixed(1)}w`;
  if (readCount >= 1000) return `${(readCount / 1000).toFixed(1)}k`;
  return String(readCount);
}

function shuffleStories(items: SquareStory[]): SquareStory[] {
  const arr = [...items];
  for (let i = arr.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

type ContinueReadingData = {
  storyId: string;
  storyTitle: string;
  coverSource: number;
  branchChoice: string | null;
  progressPercent: number;
};

export default function SquareScreen() {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const { width: screenWidth } = useWindowDimensions();
  const carouselRef = useRef<ScrollView | null>(null);
  const carouselIndexRef = useRef(0);
  const [currentBannerIndex, setCurrentBannerIndex] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [hasError, setHasError] = useState(false);
  const [selectedCategoryId, setSelectedCategoryId] = useState('cat_all');
  const [displayStories, setDisplayStories] = useState<SquareStory[]>(squareStories);
  const [continueReading, setContinueReading] = useState<ContinueReadingData | null>(null);
  const cardWidth = Math.max(220, screenWidth - 24);

  const storyMeta = useMemo(() => listStories()[0] ?? null, []);
  const storyNodesByChoiceId = useMemo(() => {
    const map = new Map<string, string>();
    if (!storyMeta) return map;
    for (const node of storyMeta.nodes) {
      if (!node.choices) continue;
      for (const choice of node.choices) {
        map.set(choice.id, choice.text);
      }
    }
    return map;
  }, [storyMeta]);

  const bannerCards = useMemo(
    () =>
      focusCards.map((card, index) => (
        <View
          key={card.id}
          style={[
            styles.bannerCardWrap,
            { width: cardWidth },
            index === focusCards.length - 1 && styles.bannerCardWrapLast,
          ]}
        >
          <Pressable
            style={styles.bannerCard}
            onPress={() => openStoryDetail(card.storyId)}
          >
            <Image source={card.imageSource} style={styles.bannerCardImage} resizeMode="cover" />
            <View style={styles.bannerMask} />
            <View style={styles.bannerContent}>
              <Text style={styles.bannerTitle}>{card.title}</Text>
              <Text style={styles.bannerSubtitle} numberOfLines={2}>
                {card.subtitle}
              </Text>
              <View style={styles.bannerAction}>
                <Text style={styles.bannerActionText}>{t('square.enterSpace')}</Text>
              </View>
            </View>
          </Pressable>
        </View>
      )),
    [cardWidth, t]
  );

  const [leftStories, rightStories] = useMemo(() => {
    const left: SquareStory[] = [];
    const right: SquareStory[] = [];
    displayStories.forEach((story, index) => {
      if (index % 2 === 0) left.push(story);
      else right.push(story);
    });
    return [left, right];
  }, [displayStories]);

  const loadReadingProgress = useCallback(async () => {
    const row: ReadingProgressRow | null = await readingProgressRepository.getByStoryId('story_001');
    if (!row || !storyMeta) {
      setContinueReading(null);
      return;
    }
    let branchChoice: string | null = null;
    try {
      const choiceHistoryRaw = JSON.parse(row.choice_history ?? '[]') as Array<{
        choice_id?: string;
      }>;
      const lastChoiceId = choiceHistoryRaw.at(-1)?.choice_id;
      if (lastChoiceId) {
        branchChoice = storyNodesByChoiceId.get(lastChoiceId) ?? null;
      }
    } catch {
      branchChoice = null;
    }
    setContinueReading({
      storyId: 'story_001',
      storyTitle: storyMeta.title,
      coverSource: STORY_MAIN_COVER,
      branchChoice,
      progressPercent: Math.round(row.progress_percentage),
    });
  }, [storyMeta, storyNodesByChoiceId]);

  const loadData = useCallback(async () => {
    setIsLoading(true);
    try {
      await new Promise((resolve) => {
        setTimeout(resolve, 500);
      });
      setDisplayStories(squareStories);
      await loadReadingProgress();
      setHasError(false);
    } catch {
      setHasError(true);
    } finally {
      setIsLoading(false);
    }
  }, [loadReadingProgress]);

  const selectCategory = useCallback((categoryId: string) => {
    setSelectedCategoryId(categoryId);
    if (categoryId === 'cat_all') {
      setDisplayStories(shuffleStories(squareStories));
      return;
    }
    setDisplayStories(
      shuffleStories(squareStories.filter((item) => item.categoryId === categoryId))
    );
  }, []);

  function openReader(storyId: string) {
    AppNavigator.toReader(storyId);
  }

  function openStoryDetail(storyId: string) {
    // TODO(story-feed): when multi-story + UGC feed is enabled,
    // route by the clicked card's actual `storyId`.
    // Currently only one complete story detail exists in RN, so all entries
    // point to the same detail page for consistent QA.
    void storyId;
    AppNavigator.toStoryDetail(FEED_DEFAULT_STORY_ID);
  }

  function renderStoryCard(story: SquareStory): ReactNode {
    const hash = Math.abs(
      story.id.split('').reduce((sum, char) => sum * 31 + char.charCodeAt(0), 0)
    );
    const aspectRatio = 0.65 + (hash % 30) / 100;
    return (
      <Pressable
        key={story.id}
        style={({ pressed }) => [styles.storyCard, pressed && styles.storyCardPressed]}
        onPress={() => openStoryDetail(story.id)}
      >
        <View style={{ aspectRatio }}>
          <Image source={story.coverSource} style={styles.storyCardImage} resizeMode="cover" />
          <View style={styles.storyCharacterBadge}>
            <Ionicons name="person" size={11} color="#ffffff" />
            <Text style={styles.storyCharacterBadgeText}>{story.coreCharacterName}</Text>
          </View>
          <View style={styles.storyCardBottomMask} />
          <View style={styles.storyCardContent}>
            <Text style={styles.storyTitle} numberOfLines={1}>
              {story.title}
            </Text>
            <Text style={styles.storyDescription} numberOfLines={2}>
              {story.description}
            </Text>
            <View style={styles.storyMetaRow}>
              <View style={styles.storyTagBadge}>
                <Text style={styles.storyTagText}>{story.tags.join(' · ')}</Text>
              </View>
              <View style={styles.storyHotRow}>
                <Ionicons name="flame" size={10} color="#ef4444" />
                <Text style={styles.storyHotText}>{formatHotCount(story.readCount)}</Text>
              </View>
            </View>
          </View>
        </View>
      </Pressable>
    );
  }

  useEffect(() => {
    void loadData();
  }, [loadData]);

  useEffect(() => {
    if (focusCards.length <= 1) return undefined;
    const timer = setInterval(() => {
      const nextIndex = (carouselIndexRef.current + 1) % focusCards.length;
      carouselIndexRef.current = nextIndex;
      setCurrentBannerIndex(nextIndex);
      carouselRef.current?.scrollTo({ x: cardWidth * nextIndex, animated: true });
    }, 4000);
    return () => clearInterval(timer);
  }, [cardWidth]);

  useFocusEffect(
    useCallback(() => {
      void loadReadingProgress();
    }, [loadReadingProgress])
  );

  if (isLoading) {
    return (
      <View style={styles.loadingRoot}>
        <ActivityIndicator />
      </View>
    );
  }

  if (hasError) {
    return (
      <View style={styles.errorRoot}>
        <Text style={styles.errorText}>{t('square.loadFailed')}</Text>
        <Pressable style={styles.retryButton} onPress={() => void loadData()}>
          <Text style={styles.retryText}>{t('common.retry')}</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={[styles.header, { marginTop: insets.top }]}>
        <Pressable style={styles.searchButton} onPress={() => AppNavigator.toSearch()}>
          <Ionicons name="search" size={20} color="#6b7280" />
        </Pressable>
        <Text style={styles.headerTitle}>{t('square.playgroundTitle')}</Text>
        <View style={styles.headerRightPlaceholder} />
      </View>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.bannerSection}>
          <ScrollView
            ref={carouselRef}
            horizontal
            pagingEnabled
            showsHorizontalScrollIndicator={false}
            snapToInterval={cardWidth}
            decelerationRate="fast"
            onMomentumScrollEnd={(event) => {
              const nextIndex = Math.round(event.nativeEvent.contentOffset.x / cardWidth);
              carouselIndexRef.current = nextIndex;
              setCurrentBannerIndex(nextIndex);
            }}
          >
            {bannerCards}
          </ScrollView>
          <View style={styles.bannerDots}>
            {focusCards.map((item, index) => (
              <View key={item.id} style={[styles.bannerDot, index === currentBannerIndex && styles.bannerDotActive]} />
            ))}
          </View>
        </View>

        {continueReading ? (
          <>
            <View style={styles.continueCard}>
              <Image source={continueReading.coverSource} style={styles.continueCover} resizeMode="cover" />
              <View style={styles.continueTextWrap}>
                <Text style={styles.continueHint}>{t('square.continueExplore')}</Text>
                <Text style={styles.continueTitle} numberOfLines={2}>
                  {`《${continueReading.storyTitle}》${continueReading.branchChoice
                      ? ` · ${t('square.choicePicked', { choice: continueReading.branchChoice })}`
                      : ''
                    }`}
                </Text>
              </View>
              <Pressable style={styles.continueButton} onPress={() => openReader(continueReading.storyId)}>
                <Text style={styles.continueButtonText}>{t('square.continueButton')}</Text>
              </Pressable>
            </View>
            <View style={styles.sectionGap} />
          </>
        ) : null}

        <View style={styles.categorySection}>
          <Text style={styles.sectionTitle}>{t('square.moreStories')}</Text>
          <View style={styles.categoryRow}>
            {categories.map((category) => {
              const isSelected = selectedCategoryId === category.id;
              return (
                <Pressable
                  key={category.id}
                  style={styles.categoryItem}
                  onPress={() => selectCategory(category.id)}
                >
                  <Text style={[styles.categoryText, isSelected && styles.categoryTextSelected]}>
                    {category.name}
                  </Text>
                  <View style={[styles.categoryUnderline, isSelected && styles.categoryUnderlineSelected]} />
                </Pressable>
              );
            })}
          </View>
        </View>

        {displayStories.length === 0 ? (
          <View style={styles.emptyWrap}>
            <Text style={styles.emptyText}>{t('square.emptyStories')}</Text>
          </View>
        ) : (
          <View style={styles.storyColumns}>
            <View style={styles.storyColumn}>{leftStories.map((item) => renderStoryCard(item))}</View>
            <View style={styles.storyColumn}>{rightStories.map((item) => renderStoryCard(item))}</View>
          </View>
        )}
        <View style={styles.bottomSpacer} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  loadingRoot: {
    flex: 1,
    backgroundColor: '#f9fafb',
    alignItems: 'center',
    justifyContent: 'center',
  },
  errorRoot: {
    flex: 1,
    backgroundColor: '#f9fafb',
    alignItems: 'center',
    justifyContent: 'center',
  },
  errorText: {
    color: '#111827',
    fontSize: 14,
  },
  retryButton: {
    marginTop: 16,
    backgroundColor: '#111827',
    borderRadius: 999,
    paddingHorizontal: 18,
    paddingVertical: 8,
  },
  retryText: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '600',
  },
  container: {
    flex: 1,
    backgroundColor: '#f9fafb',
  },
  header: {
    height: 56,
    paddingHorizontal: 16,
    alignItems: 'center',
    flexDirection: 'row',
  },
  searchButton: {
    width: 20,
    height: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    marginLeft: 'auto',
    marginRight: 'auto',
    fontSize: 18,
    fontWeight: '500',
    color: '#111827',
    lineHeight: 24,
  },
  headerRightPlaceholder: {
    width: 20,
  },
  content: {
    paddingBottom: 16,
  },
  bannerSection: {
    paddingHorizontal: 12,
    paddingTop: 16,
  },
  bannerCardWrap: {
    width: '100%',
    paddingRight: 0,
  },
  bannerCardWrapLast: {
    paddingRight: 0,
  },
  bannerCard: {
    height: 220,
    borderRadius: 20,
    overflow: 'hidden',
  },
  bannerCardImage: {
    ...StyleSheet.absoluteFillObject,
  },
  bannerMask: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.25)',
  },
  bannerContent: {
    position: 'absolute',
    left: 20,
    right: 20,
    bottom: 30,
  },
  bannerTitle: {
    color: '#ffffff',
    fontSize: 24,
    fontWeight: '700',
  },
  bannerSubtitle: {
    marginTop: 6,
    color: '#d1d5db',
    fontSize: 14,
    lineHeight: 20,
  },
  bannerAction: {
    marginTop: 14,
    alignSelf: 'flex-start',
    paddingHorizontal: 20,
    paddingVertical: 8,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.76)',
    backgroundColor: 'rgba(255,255,255,0.1)',
  },
  bannerActionText: {
    color: '#ffffff',
    fontSize: 14,
  },
  bannerDots: {
    position: 'absolute',
    bottom: 10,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'center',
  },
  bannerDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginHorizontal: 3,
    backgroundColor: 'rgba(255,255,255,0.4)',
  },
  bannerDotActive: {
    backgroundColor: '#ffffff',
  },
  continueCard: {
    marginTop: 16,
    marginHorizontal: 12,
    borderRadius: 20,
    backgroundColor: '#f3f4f6',
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
  },
  continueCover: {
    width: 56,
    height: 56,
    borderRadius: 8,
  },
  continueTextWrap: {
    flex: 1,
    marginLeft: 12,
    marginRight: 12,
  },
  continueHint: {
    fontSize: 12,
    color: '#9ca3af',
    lineHeight: 16,
  },
  continueTitle: {
    marginTop: 4,
    fontSize: 14,
    fontWeight: '700',
    color: '#374151',
    lineHeight: 19,
  },
  continueButton: {
    borderRadius: 999,
    paddingHorizontal: 16,
    paddingVertical: 6,
    backgroundColor: '#111827',
  },
  continueButtonText: {
    fontSize: 12,
    color: '#ffffff',
    lineHeight: 16,
  },
  sectionGap: {
    height: 16,
  },
  categorySection: {
    paddingHorizontal: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '500',
    color: '#111827',
    lineHeight: 24,
  },
  categoryRow: {
    marginTop: 18,
    flexDirection: 'row',
    alignItems: 'center',
  },
  categoryItem: {
    marginRight: 20,
  },
  categoryText: {
    fontSize: 14,
    color: '#9ca3af',
    lineHeight: 19,
  },
  categoryTextSelected: {
    color: '#111827',
  },
  categoryUnderline: {
    marginTop: 4,
    height: 1,
    backgroundColor: 'transparent',
  },
  categoryUnderlineSelected: {
    backgroundColor: '#111827',
  },
  emptyWrap: {
    padding: 32,
    alignItems: 'center',
  },
  emptyText: {
    color: '#6b7280',
    fontSize: 14,
  },
  storyColumns: {
    paddingHorizontal: 16,
    paddingTop: 16,
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
  },
  storyColumn: {
    width: '48.4%',
  },
  storyCard: {
    marginBottom: 16,
    borderRadius: 12,
    overflow: 'hidden',
    elevation: 2,
    shadowColor: '#000000',
    shadowOpacity: 0.12,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    backgroundColor: '#000000',
  },
  storyCardPressed: {
    transform: [{ scale: 0.95 }],
  },
  storyCardImage: {
    ...StyleSheet.absoluteFillObject,
  },
  storyCharacterBadge: {
    position: 'absolute',
    top: 5,
    left: 6,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 10,
    backgroundColor: 'rgba(107,114,128,0.74)',
    flexDirection: 'row',
    alignItems: 'center',
  },
  storyCharacterBadgeText: {
    marginLeft: 2,
    color: '#ffffff',
    fontSize: 8,
    lineHeight: 14,
  },
  storyCardBottomMask: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.42)',
  },
  storyCardContent: {
    position: 'absolute',
    left: 12,
    right: 12,
    bottom: 12,
  },
  storyTitle: {
    fontWeight: '700',
    marginBottom: 8,
    color: '#ffffff',
    fontSize: 14,
    lineHeight: 19,
  },
  storyDescription: {
    color: '#ffffff',
    fontSize: 11,
    lineHeight: 15,
  },
  storyMetaRow: {
    marginTop: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  storyTagBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2.5,
    borderRadius: 4,
    backgroundColor: 'rgba(107,114,128,0.56)',
  },
  storyTagText: {
    color: '#ffffff',
    fontSize: 10,
    lineHeight: 14,
  },
  storyHotRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  storyHotText: {
    marginLeft: 2,
    color: '#ffffff',
    fontSize: 10,
    lineHeight: 14,
  },
  bottomSpacer: {
    height: 16,
  },
});
