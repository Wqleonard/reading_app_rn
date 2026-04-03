import { Link } from 'expo-router';
import { useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { getStoryById } from '@/src/data/story/storyService';
import { useAppStore } from '@/src/state/appStore';

type MeTab = 'history' | 'favorites' | 'characters';

export default function MeScreen() {
  const { t } = useTranslation();
  const language = useAppStore((state) => state.language);
  const setLanguage = useAppStore((state) => state.setLanguage);
  const [activeTab, setActiveTab] = useState<MeTab>('history');
  const story = getStoryById('story_001');
  const characterList = useMemo(
    () => (story?.mainCharacters ?? []).filter((char) => char.id !== 'story_001_char_001'),
    [story]
  );

  return (
    <View style={styles.container}>
      <Text style={styles.title}>{t('me.title')}</Text>
      <Text style={styles.subtitle}>
        {t('me.language')}: {language}
      </Text>

      <View style={styles.row}>
        <Pressable style={styles.button} onPress={() => setLanguage('zh-CN')}>
          <Text style={styles.buttonText}>中文</Text>
        </Pressable>
        <Pressable style={styles.button} onPress={() => setLanguage('en-US')}>
          <Text style={styles.buttonText}>English</Text>
        </Pressable>
      </View>

      <View style={styles.tabRow}>
        <Pressable
          style={[styles.tabBtn, activeTab === 'history' && styles.tabBtnActive]}
          onPress={() => setActiveTab('history')}
        >
          <Text style={styles.tabBtnText}>{t('me.tabHistory')}</Text>
        </Pressable>
        <Pressable
          style={[styles.tabBtn, activeTab === 'favorites' && styles.tabBtnActive]}
          onPress={() => setActiveTab('favorites')}
        >
          <Text style={styles.tabBtnText}>{t('me.tabFavorites')}</Text>
        </Pressable>
        <Pressable
          style={[styles.tabBtn, activeTab === 'characters' && styles.tabBtnActive]}
          onPress={() => setActiveTab('characters')}
        >
          <Text style={styles.tabBtnText}>{t('me.tabCharacters')}</Text>
        </Pressable>
      </View>

      {activeTab === 'history' ? (
        <View style={styles.panel}>
          <Text style={styles.emptyText}>{t('me.emptyHistory')}</Text>
        </View>
      ) : null}

      {activeTab === 'favorites' ? (
        <View style={styles.panel}>
          <Text style={styles.emptyText}>{t('me.emptyFavorites')}</Text>
        </View>
      ) : null}

      {activeTab === 'characters' ? (
        <View style={styles.panel}>
          {characterList.map((char) => (
            <View key={char.id} style={styles.characterRow}>
              <Text style={styles.characterName}>{char.name}</Text>
              <View style={styles.characterActions}>
                <Link href={`/character/${char.id}`} style={styles.link}>
                  {t('me.characterDetail')}
                </Link>
                <Link href={`/chat/${char.id}`} style={styles.link}>
                  {t('me.characterChat')}
                </Link>
              </View>
            </View>
          ))}
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingTop: 20,
    paddingHorizontal: 16,
    gap: 10,
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
  },
  subtitle: {
    color: '#666',
  },
  row: {
    flexDirection: 'row',
    gap: 10,
  },
  tabRow: {
    marginTop: 4,
    flexDirection: 'row',
    gap: 8,
    flexWrap: 'wrap',
  },
  tabBtn: {
    borderRadius: 999,
    borderWidth: 1,
    borderColor: '#d1d5db',
    paddingVertical: 6,
    paddingHorizontal: 10,
  },
  tabBtnActive: {
    backgroundColor: '#111827',
    borderColor: '#111827',
  },
  tabBtnText: {
    fontSize: 12,
    color: '#374151',
  },
  button: {
    borderRadius: 8,
    paddingVertical: 8,
    paddingHorizontal: 12,
    backgroundColor: '#111',
  },
  buttonText: {
    color: '#fff',
    fontWeight: '600',
  },
  panel: {
    marginTop: 6,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 12,
    padding: 12,
    minHeight: 120,
  },
  emptyText: {
    color: '#6b7280',
  },
  characterRow: {
    borderBottomWidth: 1,
    borderColor: '#f3f4f6',
    paddingBottom: 10,
    marginBottom: 10,
  },
  characterName: {
    fontWeight: '700',
    marginBottom: 4,
  },
  characterActions: {
    flexDirection: 'row',
    gap: 12,
  },
  link: {
    color: '#2563eb',
  },
});
