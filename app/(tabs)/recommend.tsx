import { useEffect } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { getStoryById } from '@/src/data/story/storyService';
import { useRecommendStore } from '@/src/features/recommend/useRecommendStore';

export default function RecommendScreen() {
  const { t } = useTranslation();
  const mode = useRecommendStore((state) => state.mode);
  const playing = useRecommendStore((state) => state.playing);
  const progress = useRecommendStore((state) => state.progress);
  const chosenChoiceText = useRecommendStore((state) => state.chosenChoiceText);
  const tick = useRecommendStore((state) => state.tick);
  const togglePlay = useRecommendStore((state) => state.togglePlay);
  const chooseBranch = useRecommendStore((state) => state.chooseBranch);
  const restart = useRecommendStore((state) => state.restart);
  const story = getStoryById('story_001');
  const firstChoiceNode = story?.nodes.find((node) => node.type === 'choice');
  const choices = firstChoiceNode?.choices ?? [];

  useEffect(() => {
    const timer = setInterval(() => {
      tick();
    }, 500);
    return () => clearInterval(timer);
  }, [tick]);

  return (
    <View style={styles.container}>
      <Text style={styles.title}>{t('recommend.title')}</Text>
      <Text style={styles.subtitle}>
        {mode === 'main'
          ? t('recommend.modeMain')
          : mode === 'decision'
            ? t('recommend.modeDecision')
            : t('recommend.modeBranch')}
      </Text>

      <View style={styles.videoCard}>
        <Text style={styles.videoText}>
          {t('recommend.progress')}: {progress}%
        </Text>
        <View style={styles.progressTrack}>
          <View style={[styles.progressFill, { width: `${progress}%` }]} />
        </View>
        <Text style={styles.videoStatus}>
          {playing ? t('recommend.playing') : t('recommend.paused')}
        </Text>
      </View>

      <View style={styles.row}>
        <Pressable style={styles.button} onPress={togglePlay}>
          <Text style={styles.buttonText}>
            {playing ? t('recommend.pause') : t('recommend.play')}
          </Text>
        </Pressable>
        <Pressable style={[styles.button, styles.secondary]} onPress={restart}>
          <Text style={styles.buttonText}>{t('recommend.restart')}</Text>
        </Pressable>
      </View>

      {mode === 'decision' ? (
        <View style={styles.decisionBox}>
          <Text style={styles.decisionTitle}>{t('recommend.choosePrompt')}</Text>
          {choices.map((choice) => (
            <Pressable
              key={choice.id}
              style={styles.choiceButton}
              onPress={() => chooseBranch(choice.text)}
            >
              <Text style={styles.choiceText}>{choice.text}</Text>
            </Pressable>
          ))}
        </View>
      ) : null}

      {mode === 'branchResult' ? (
        <Text style={styles.branchResult}>
          {t('recommend.chosen')}: {chosenChoiceText}
        </Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: 16,
    paddingTop: 20,
    backgroundColor: '#111',
  },
  title: {
    color: '#fff',
    fontSize: 22,
    fontWeight: '700',
  },
  subtitle: {
    color: '#999',
    marginTop: 8,
    marginBottom: 16,
  },
  videoCard: {
    borderRadius: 12,
    backgroundColor: '#1f1f1f',
    padding: 16,
    borderWidth: 1,
    borderColor: '#2c2c2c',
  },
  videoText: {
    color: '#fff',
    fontWeight: '600',
  },
  videoStatus: {
    marginTop: 8,
    color: '#9ca3af',
  },
  progressTrack: {
    marginTop: 12,
    width: '100%',
    height: 8,
    borderRadius: 999,
    backgroundColor: '#2b2b2b',
    overflow: 'hidden',
  },
  progressFill: {
    height: 8,
    backgroundColor: '#22c55e',
  },
  row: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 16,
  },
  button: {
    backgroundColor: '#2563eb',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 8,
  },
  secondary: {
    backgroundColor: '#374151',
  },
  buttonText: {
    color: '#fff',
    fontWeight: '700',
  },
  decisionBox: {
    marginTop: 20,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#2c2c2c',
    padding: 12,
  },
  decisionTitle: {
    color: '#d1d5db',
    marginBottom: 8,
    fontWeight: '600',
  },
  choiceButton: {
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#3f3f46',
    padding: 10,
    marginBottom: 8,
    backgroundColor: '#18181b',
  },
  choiceText: {
    color: '#f3f4f6',
  },
  branchResult: {
    marginTop: 20,
    color: '#86efac',
    fontWeight: '600',
  },
});
