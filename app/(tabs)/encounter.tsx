import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { getStoryById } from '@/src/data/story/storyService';
import { useEncounterStore } from '@/src/features/encounter/useEncounterStore';
import { AppNavigator } from '@/src/navigation/appNavigator';

export default function EncounterScreen() {
  const { t } = useTranslation();
  const mode = useEncounterStore((state) => state.mode);
  const singleResultId = useEncounterStore((state) => state.singleResultId);
  const tenResultIds = useEncounterStore((state) => state.tenResultIds);
  const drawSingle = useEncounterStore((state) => state.drawSingle);
  const drawTen = useEncounterStore((state) => state.drawTen);
  const reset = useEncounterStore((state) => state.reset);
  const story = getStoryById('story_001');
  const characterPool = (story?.mainCharacters ?? [])
    .filter((char) => char.id !== 'story_001_char_001')
    .map((char) => char.id);
  const characterNameMap = new Map((story?.mainCharacters ?? []).map((char) => [char.id, char.name]));

  return (
    <View style={styles.container}>
      <Text style={styles.title}>{t('encounter.title')}</Text>
      <Text style={styles.subtitle}>{t('encounter.subtitle')}</Text>

      {mode === 'main' ? (
        <View style={styles.row}>
          <Pressable style={styles.button} onPress={() => drawSingle(characterPool)}>
            <Text style={styles.buttonText}>{t('encounter.singleDraw')}</Text>
          </Pressable>
          <Pressable style={[styles.button, styles.secondary]} onPress={() => drawTen(characterPool)}>
            <Text style={styles.buttonText}>{t('encounter.tenDraw')}</Text>
          </Pressable>
        </View>
      ) : null}

      {mode === 'singleResult' && singleResultId ? (
        <View style={styles.resultBox}>
          <Text style={styles.resultTitle}>{t('encounter.singleResult')}</Text>
          <Text style={styles.resultName}>{characterNameMap.get(singleResultId) ?? singleResultId}</Text>
          <Pressable onPress={() => AppNavigator.toCharacterDetail(singleResultId)}>
            <Text style={styles.link}>
            {t('encounter.goCharacter')}
            </Text>
          </Pressable>
        </View>
      ) : null}

      {mode === 'tenResult' ? (
        <View style={styles.resultBox}>
          <Text style={styles.resultTitle}>{t('encounter.tenResult')}</Text>
          <View style={styles.tenGrid}>
            {tenResultIds.map((id, index) => (
              <Text key={`${id}-${index}`} style={styles.tenItem}>
                {index + 1}. {characterNameMap.get(id) ?? id}
              </Text>
            ))}
          </View>
        </View>
      ) : null}

      {mode !== 'main' ? (
        <Pressable style={styles.resetButton} onPress={reset}>
          <Text style={styles.buttonText}>{t('encounter.drawAgain')}</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    paddingTop: 20,
    paddingHorizontal: 16,
    backgroundColor: '#090909',
  },
  title: {
    color: '#fff',
    fontSize: 22,
    fontWeight: '700',
  },
  subtitle: {
    color: '#9ca3af',
    marginTop: 6,
    marginBottom: 16,
  },
  row: {
    flexDirection: 'row',
    gap: 12,
  },
  button: {
    backgroundColor: '#7c3aed',
    borderRadius: 8,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  secondary: {
    backgroundColor: '#2563eb',
  },
  buttonText: {
    color: '#fff',
    fontWeight: '700',
  },
  resultBox: {
    marginTop: 20,
    width: '100%',
    borderWidth: 1,
    borderColor: '#2a2a2a',
    borderRadius: 12,
    padding: 12,
    backgroundColor: '#141414',
  },
  resultTitle: {
    color: '#e5e7eb',
    fontWeight: '700',
    marginBottom: 10,
  },
  resultName: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
  },
  tenGrid: {
    gap: 6,
  },
  tenItem: {
    color: '#d1d5db',
  },
  resetButton: {
    marginTop: 16,
    borderRadius: 8,
    backgroundColor: '#374151',
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  link: {
    color: '#60a5fa',
    marginTop: 4,
  },
});
