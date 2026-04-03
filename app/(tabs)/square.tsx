import { Link } from 'expo-router';
import { useFocusEffect } from '@react-navigation/native';
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useTranslation } from 'react-i18next';

import { listStories } from '@/src/data/story/storyService';
import { readingProgressRepository } from '@/src/storage/db/repositories/readingProgressRepository';
import type { ReadingProgressRow } from '@/src/storage/db/types';

const categoryKeys = ['all', '古风', '乙女向', '修罗场'] as const;

export default function SquareScreen() {
  const { t } = useTranslation();
  const [selectedCategory, setSelectedCategory] =
    useState<(typeof categoryKeys)[number]>('all');
  const [progress, setProgress] = useState<ReadingProgressRow | null>(null);
  const stories = useMemo(() => listStories(), []);

  const filteredStories = useMemo(() => {
    if (selectedCategory === 'all') return stories;
    return stories.filter((story) => story.tags.includes(selectedCategory));
  }, [selectedCategory, stories]);

  async function loadProgress() {
    const row = await readingProgressRepository.getByStoryId('story_001');
    setProgress(row);
  }

  async function createDemoProgress() {
    await readingProgressRepository.upsert({
      storyId: 'story_001',
      currentNodeId: 'node_009_choice2',
      choiceHistoryJson: JSON.stringify(['choice_001_save_emperor']),
      visitedNodeIdsJson: JSON.stringify([
        'node_001',
        'node_002_choice',
        'node_003_main',
        'node_009_choice2',
      ]),
      lastReadAtMs: Date.now(),
      readDuration: 360,
      scrollPosition: 420,
      pageIndex: 2,
      progressPercentage: 38,
    });
    await loadProgress();
  }

  async function resetProgress() {
    await readingProgressRepository.clearByStoryId('story_001');
    await loadProgress();
  }

  useEffect(() => {
    void loadProgress();
  }, []);

  useFocusEffect(
    useCallback(() => {
      void loadProgress();
    }, [])
  );

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.title}>{t('square.title')}</Text>

      <Text style={styles.sectionTitle}>{t('square.featured')}</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
        {stories.map((story) => (
          <View key={story.id} style={styles.featuredCard}>
            <Text style={styles.cardTitle}>{story.title}</Text>
            <Text numberOfLines={2} style={styles.cardDesc}>
              {story.description}
            </Text>
          </View>
        ))}
      </ScrollView>

      <Text style={styles.sectionTitle}>{t('square.categories')}</Text>
      <View style={styles.categoryRow}>
        {categoryKeys.map((category) => (
          <Pressable
            key={category}
            style={[
              styles.categoryChip,
              selectedCategory === category && styles.categoryChipActive,
            ]}
            onPress={() => setSelectedCategory(category)}
          >
            <Text
              style={[
                styles.categoryChipText,
                selectedCategory === category && styles.categoryChipTextActive,
              ]}
            >
              {category === 'all' ? t('square.all') : category}
            </Text>
          </Pressable>
        ))}
      </View>

      <Text style={styles.sectionTitle}>{t('square.continueReading')}</Text>
      {progress ? (
        <View style={styles.progressCard}>
          <Text style={styles.cardTitle}>story_001</Text>
          <Text style={styles.cardDesc}>
            {t('square.progressLabel')}: {Math.round(progress.progress_percentage)}%
          </Text>
          <Link href="/reader/story_001" style={styles.link}>
            {t('square.openReader')}
          </Link>
          <Pressable style={styles.demoButton} onPress={() => void resetProgress()}>
            <Text style={styles.demoButtonText}>{t('square.resetProgress')}</Text>
          </Pressable>
        </View>
      ) : (
        <View style={styles.progressCard}>
          <Text style={styles.cardDesc}>{t('square.noProgress')}</Text>
          <Pressable style={styles.demoButton} onPress={() => void createDemoProgress()}>
            <Text style={styles.demoButtonText}>{t('square.createDemoProgress')}</Text>
          </Pressable>
        </View>
      )}

      <Text style={styles.sectionTitle}>{t('square.storyList')}</Text>
      {filteredStories.map((story) => (
        <View key={story.id} style={styles.storyRow}>
          <View style={styles.storyMeta}>
            <Text style={styles.storyTitle}>{story.title}</Text>
            <Text style={styles.storyTagText}>{story.tags.join(' / ')}</Text>
          </View>
          <View style={styles.storyActions}>
            <Link href={`/story/${story.id}`} style={styles.link}>
              {t('square.openDetail')}
            </Link>
            <Link href={`/reader/${story.id}`} style={styles.link}>
              {t('square.openReader')}
            </Link>
          </View>
        </View>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  content: {
    padding: 16,
    paddingBottom: 32,
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    marginTop: 18,
    marginBottom: 10,
  },
  featuredCard: {
    width: 240,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    padding: 12,
    marginRight: 12,
  },
  cardTitle: {
    fontWeight: '700',
    fontSize: 15,
    marginBottom: 6,
  },
  cardDesc: {
    color: '#6b7280',
    fontSize: 13,
  },
  categoryRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  categoryChip: {
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6,
    backgroundColor: '#fff',
  },
  categoryChipActive: {
    backgroundColor: '#111827',
    borderColor: '#111827',
  },
  categoryChipText: {
    color: '#374151',
    fontSize: 12,
  },
  categoryChipTextActive: {
    color: '#fff',
  },
  progressCard: {
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 12,
    padding: 12,
  },
  demoButton: {
    marginTop: 10,
    borderRadius: 8,
    backgroundColor: '#111827',
    paddingHorizontal: 12,
    paddingVertical: 8,
    alignSelf: 'flex-start',
  },
  demoButtonText: {
    color: '#fff',
    fontWeight: '600',
  },
  storyRow: {
    borderBottomWidth: 1,
    borderColor: '#f3f4f6',
    paddingVertical: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
  },
  storyMeta: {
    flex: 1,
  },
  storyTitle: {
    fontWeight: '700',
    marginBottom: 6,
  },
  storyTagText: {
    color: '#6b7280',
    fontSize: 12,
  },
  storyActions: {
    alignItems: 'flex-end',
    justifyContent: 'center',
    gap: 4,
  },
  link: {
    color: '#2563eb',
    fontSize: 13,
  },
});
