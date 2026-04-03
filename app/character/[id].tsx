import { Link, useLocalSearchParams } from 'expo-router';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { getCharacterById } from '@/src/data/story/storyService';

export default function CharacterDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { t } = useTranslation();
  const data = id ? getCharacterById(id) : null;

  if (!data) {
    return (
      <View style={styles.container}>
        <Text style={styles.title}>{t('character.title')}</Text>
        <Text style={styles.subtitle}>{t('character.notFound')}</Text>
      </View>
    );
  }

  const { story, character } = data;
  const tags = Array.isArray(character.tags)
    ? character.tags
    : character.tags
      ? [character.tags]
      : [];

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.title}>{t('character.title')}</Text>
      <Text style={styles.subtitle}>
        {t('character.characterId')}: {character.id}
      </Text>
      <Text style={styles.subtitle}>
        {t('character.fromStory')}: {story.title}
      </Text>

      <Text style={styles.name}>{character.name}</Text>
      <Text style={styles.subtitle}>
        {t('character.identity')}: {character.identity ?? '-'}
      </Text>
      <Text style={styles.subtitle}>
        {t('character.position')}: {character.position ?? '-'}
      </Text>

      <Text style={styles.sectionTitle}>{t('character.tags')}</Text>
      <Text style={styles.subtitle}>{tags.length > 0 ? tags.join(' / ') : '-'}</Text>

      <Text style={styles.sectionTitle}>{t('character.profile')}</Text>
      <Text style={styles.profile}>{character.profile ?? '-'}</Text>

      <Text style={styles.sectionTitle}>{t('character.works')}</Text>
      {(character.works ?? []).length > 0 ? (
        character.works?.map((work) => (
          <View key={work.id} style={styles.workCard}>
            <Text style={styles.workTitle}>{work.title}</Text>
            <Text style={styles.subtitle}>{work.description ?? '-'}</Text>
            <Link href={`/story/${work.id}`} style={styles.link}>
              {t('character.openStory')}
            </Link>
          </View>
        ))
      ) : (
        <Text style={styles.subtitle}>-</Text>
      )}

      <View style={styles.row}>
        <Link href={`/chat/${character.id}`} style={styles.link}>
          {t('character.openChat')}
        </Link>
        <Link href={`/story/${story.id}`} style={styles.link}>
          {t('character.openStory')}
        </Link>
      </View>
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
    paddingBottom: 28,
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
  },
  name: {
    marginTop: 12,
    fontSize: 18,
    fontWeight: '700',
  },
  sectionTitle: {
    marginTop: 14,
    marginBottom: 6,
    fontWeight: '700',
    fontSize: 16,
  },
  subtitle: {
    marginTop: 8,
    color: '#666',
  },
  profile: {
    color: '#111827',
    lineHeight: 22,
  },
  row: {
    marginTop: 14,
    flexDirection: 'row',
    gap: 12,
  },
  link: {
    color: '#2563eb',
  },
  workCard: {
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 12,
    padding: 12,
    marginBottom: 10,
  },
  workTitle: {
    fontWeight: '700',
  },
});
