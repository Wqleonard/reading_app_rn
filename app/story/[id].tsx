import { Link, useLocalSearchParams } from 'expo-router';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { getStoryById } from '@/src/data/story/storyService';

export default function StoryDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { t } = useTranslation();
  const story = id ? getStoryById(id) : null;

  if (!story) {
    return (
      <View style={styles.container}>
        <Text style={styles.title}>{t('storyDetail.title')}</Text>
        <Text style={styles.subtitle}>{t('storyDetail.notFound')}</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.title}>{t('storyDetail.title')}</Text>
      <Text style={styles.subtitle}>
        {t('storyDetail.storyId')}: {story.id}
      </Text>
      <Text style={styles.subtitle}>
        {t('storyDetail.author')}: {story.author ?? '-'}
      </Text>
      <Text style={styles.sectionTitle}>{t('storyDetail.description')}</Text>
      <Text style={styles.desc}>{story.description}</Text>
      <Text style={styles.sectionTitle}>{t('storyDetail.tags')}</Text>
      <Text style={styles.subtitle}>{story.tags.join(' / ')}</Text>

      <View style={styles.row}>
        <Link href={`/reader/${story.id}?mode=interactive`} style={styles.link}>
          {t('storyDetail.readInteractive')}
        </Link>
        <Link href={`/reader/${story.id}?mode=pure`} style={styles.link}>
          {t('storyDetail.readPure')}
        </Link>
      </View>

      <Text style={styles.sectionTitle}>{t('storyDetail.characters')}</Text>
      {story.mainCharacters.map((character) => (
        <View key={character.id} style={styles.characterCard}>
          <Text style={styles.characterName}>{character.name}</Text>
          <Text style={styles.subtitle}>{character.identity ?? '-'}</Text>
          <Link href={`/character/${character.id}`} style={styles.link}>
            {t('storyDetail.viewCharacter')}
          </Link>
        </View>
      ))}

      <Text style={styles.sectionTitle}>Debug</Text>
      <Text style={styles.subtitle}>
        {t('storyDetail.nodeCount')}: {story.nodes.length}
      </Text>
      <Text style={styles.subtitle}>
        {t('storyDetail.characterCount')}: {story.mainCharacters.length}
      </Text>
      <Text style={styles.subtitle}>
        {t('storyDetail.branchColumns')}: {story.branchGraph?.columns.length ?? 0}
      </Text>
      <Text style={styles.subtitle}>
        {t('storyDetail.branchEdges')}: {story.branchGraph?.edges.length ?? 0}
      </Text>

      <Text style={styles.sectionTitle}>{t('storyDetail.comments')}</Text>
      {story.comments.map((comment) => (
        <View key={comment.id} style={styles.commentCard}>
          <Text style={styles.commentUser}>{comment.userName}</Text>
          <Text style={styles.commentContent}>{comment.content}</Text>
          <Text style={styles.commentMeta}>
            {comment.time} · {t('storyDetail.likes')}: {comment.likeCount}
          </Text>
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
    paddingBottom: 28,
  },
  title: {
    fontSize: 22,
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
  desc: {
    color: '#111827',
    lineHeight: 22,
  },
  row: {
    marginTop: 12,
    flexDirection: 'row',
    gap: 12,
  },
  link: {
    color: '#2563eb',
    marginTop: 6,
  },
  characterCard: {
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 12,
    padding: 12,
    marginBottom: 10,
  },
  characterName: {
    fontWeight: '700',
    fontSize: 15,
  },
  commentCard: {
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 12,
    padding: 12,
    marginBottom: 10,
  },
  commentUser: {
    fontWeight: '700',
  },
  commentContent: {
    marginTop: 6,
    color: '#111827',
    lineHeight: 20,
  },
  commentMeta: {
    marginTop: 8,
    color: '#6b7280',
    fontSize: 12,
  },
});
