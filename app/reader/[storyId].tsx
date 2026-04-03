import { useEffect, useMemo, useState } from 'react';
import { useLocalSearchParams } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { getStoryById } from '@/src/data/story/storyService';
import { readingProgressRepository } from '@/src/storage/db/repositories/readingProgressRepository';
import type { ReadingProgressRow } from '@/src/storage/db/types';

export default function ReaderScreen() {
  const { storyId, mode } = useLocalSearchParams<{
    storyId: string;
    mode?: 'interactive' | 'pure';
  }>();
  const { t } = useTranslation();
  const [progress, setProgress] = useState<ReadingProgressRow | null>(null);
  const story = storyId ? getStoryById(storyId) : null;

  useEffect(() => {
    let mounted = true;
    async function loadProgress() {
      if (!storyId) return;
      const row = await readingProgressRepository.getByStoryId(storyId);
      if (mounted) {
        setProgress(row);
      }
    }
    void loadProgress();
    return () => {
      mounted = false;
    };
  }, [storyId]);

  const currentNodeId = useMemo(() => {
    if (!story) return null;
    return progress?.current_node_id ?? story.startNodeId;
  }, [progress?.current_node_id, story]);

  const currentNode = useMemo(() => {
    if (!story || !currentNodeId) return null;
    return story.nodes.find((node) => node.id === currentNodeId) ?? null;
  }, [currentNodeId, story]);

  if (!story) {
    return (
      <View style={styles.container}>
        <Text style={styles.title}>{t('reader.title')}</Text>
        <Text style={styles.subtitle}>{t('reader.notFound')}</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>{t('reader.title')}</Text>
      <Text style={styles.subtitle}>
        {t('reader.storyId')}: {story.id}
      </Text>
      <Text style={styles.subtitle}>
        {t('reader.currentNode')}: {currentNode?.id ?? '-'}
      </Text>
      <Text style={styles.subtitle}>
        {t('reader.nodeType')}: {currentNode?.type ?? '-'}
      </Text>
      <Text style={styles.subtitle}>
        {t('reader.choiceCount')}: {currentNode?.choices?.length ?? 0}
      </Text>
      <Text style={styles.subtitle}>
        {t('reader.mode')}:{' '}
        {mode === 'pure' ? t('reader.modePure') : t('reader.modeInteractive')}
      </Text>
      <Text style={styles.subtitle}>
        {t('reader.progressPercent')}: {Math.round(progress?.progress_percentage ?? 0)}%
      </Text>
      <Text style={styles.subtitle}>
        {t('reader.restoredFrom')}:{' '}
        {progress ? t('reader.restoredProgress') : t('reader.restoredStart')}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
  },
  subtitle: {
    marginTop: 10,
    color: '#666',
  },
});
