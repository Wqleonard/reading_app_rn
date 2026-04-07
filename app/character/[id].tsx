import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useLocalSearchParams } from 'expo-router';
import { useMemo, useState } from 'react';
import {
  Alert,
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { resolveStoryImageSource } from '@/src/utils/storyImageResolver';
import {
  formatPopularity,
  getCharacterDetailById,
} from '@/src/data/character/characterDetailService';
import { AppNavigator } from '@/src/navigation/appNavigator';

export default function CharacterDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const [isFollowed, setIsFollowed] = useState(false);
  const character = useMemo(() => (id ? getCharacterDetailById(id) : null), [id]);

  if (!character) {
    return (
      <View style={styles.notFoundContainer}>
        <Text style={styles.notFoundTitle}>{t('characterDetail.title')}</Text>
        <Text style={styles.notFoundText}>{t('characterDetail.notFound')}</Text>
      </View>
    );
  }

  const heroSource = resolveStoryImageSource(character.cover);
  const avatarSource = resolveStoryImageSource(character.avatar);

  return (
    <View style={styles.container}>
      <View style={{ height: insets.top }} />
      <View style={styles.headerBar}>
        <Pressable style={styles.backButton} onPress={() => AppNavigator.back()} hitSlop={10}>
          <Ionicons name="chevron-back" size={20} color="#111827" />
        </Pressable>
        <View style={styles.headerInfo}>
          {avatarSource ? (
            <Image source={avatarSource} style={styles.headerAvatar} resizeMode="cover" />
          ) : (
            <View style={styles.headerAvatarFallback} />
          )}
          <Text style={styles.headerName} numberOfLines={1}>
            {character.name}
          </Text>
          <Pressable
            style={styles.followButton}
            onPress={() => setIsFollowed((prev) => !prev)}
            hitSlop={8}
          >
            <Text style={styles.followButtonText}>
              {isFollowed ? t('characterDetail.followed') : t('characterDetail.follow')}
            </Text>
          </Pressable>
        </View>
      </View>
      <ScrollView contentContainerStyle={styles.content}>


        <View style={styles.heroWrap}>
          {heroSource ? (
            <Image source={heroSource} style={styles.heroImage} resizeMode="cover" />
          ) : (
            <View style={styles.heroFallback} />
          )}
          <LinearGradient
            colors={['rgba(255,255,255,0)', 'rgba(255,255,255,0)', 'rgba(255,255,255,0.8)', '#ffffff']}
            locations={[0, 0.5, 0.85, 1]}
            style={styles.heroGradient}
          />
        </View>

        <View style={styles.mainContent}>
          <View style={styles.characterHeaderRow}>
            <View style={styles.characterBadge}>
              <Ionicons name="person" size={12} color="#ffffff" />
              <Text style={styles.characterBadgeText}>{t('characterDetail.role')}</Text>
            </View>
            <Text style={styles.characterName}>{character.name}</Text>
          </View>

          {character.tags.length > 0 ? (
            <View style={styles.tagsWrap}>
              {character.tags.map((tag) => (
                <View key={tag} style={styles.tagItem}>
                  <Text style={styles.tagText}>{tag}</Text>
                </View>
              ))}
            </View>
          ) : null}

          <View style={styles.popularityRow}>
            <Ionicons name="flame" size={14} color="#ef4444" />
            <Text style={styles.popularityText}>
              {t('characterDetail.encountered', { count: character.encounterCount })}
            </Text>
          </View>

          <View style={styles.descriptionBlock}>
            {character.subtitle ? <Text style={styles.subtitle}>{character.subtitle}</Text> : null}
            {character.quote ? <Text style={styles.quote}>{character.quote}</Text> : null}
          </View>

          <View style={styles.worksSection}>
            <Text style={styles.sectionTitle}>{t('characterDetail.worksTitle')}</Text>
            <View style={styles.worksList}>
              {character.works.map((work) => {
                const workCover = resolveStoryImageSource(work.cover);
                return (
                  <View key={work.id} style={styles.workCard}>
                    <View style={styles.workTitleRow}>
                      <Text style={styles.workTitle} numberOfLines={1}>
                        {work.title}
                      </Text>
                      <View style={styles.workPopularity}>
                        <Ionicons name="star" size={10} color="#fbbf24" />
                        <Text style={styles.workPopularityText}>
                          {formatPopularity(work.popularity ?? 0)}
                        </Text>
                      </View>
                    </View>
                    <View style={styles.workContentRow}>
                      {workCover ? (
                        <Image source={workCover} style={styles.workCover} resizeMode="cover" />
                      ) : (
                        <View style={styles.workCoverFallback}>
                          <Ionicons name="book-outline" size={24} color="#9ca3af" />
                        </View>
                      )}
                      <Text style={styles.workDesc} numberOfLines={5}>
                        {work.description ?? ''}
                      </Text>
                    </View>
                  </View>
                );
              })}
            </View>
            <Text style={styles.bottomHint}>{t('characterDetail.bottomReached')}</Text>
          </View>
        </View>
      </ScrollView>

      <View style={styles.bottomBar}>
        <LinearGradient
          colors={['rgba(255,255,255,0)', 'rgba(255,255,255,0.6)', '#ffffff']}
          locations={[0, 0.596, 1]}
          style={StyleSheet.absoluteFillObject}
          pointerEvents="none"
        />
        <Pressable
          style={styles.chatButton}
          onPress={() => Alert.alert('', t('characterDetail.chatPending'))}
        >
          <Ionicons name="chatbubble-outline" size={20} color="#ffffff" />
          <Text style={styles.chatButtonText}>{t('characterDetail.chatWithHim')}</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  content: {
    paddingBottom: 140,
  },
  notFoundContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#ffffff',
  },
  notFoundTitle: {
    color: '#111827',
    fontSize: 18,
    fontWeight: '700',
  },
  notFoundText: {
    marginTop: 8,
    color: '#6b7280',
    fontSize: 14,
  },
  headerBar: {
    height: 56,
    paddingLeft: 8,
    paddingRight: 16,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
  },
  backButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerInfo: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerAvatar: {
    width: 24,
    height: 24,
    borderRadius: 12,
  },
  headerAvatarFallback: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#f3f4f6',
  },
  headerName: {
    marginLeft: 6,
    marginRight: 8,
    maxWidth: 120,
    color: '#111827',
    fontSize: 14,
    fontWeight: '500',
  },
  followButton: {
    borderRadius: 9999,
    borderWidth: 1,
    borderColor: '#f3f4f6',
    backgroundColor: '#f3f4f6',
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  followButtonText: {
    color: '#6b7280',
    fontSize: 10,
    lineHeight: 14,
  },
  heroWrap: {
    width: '100%',
    height: 479,
  },
  heroImage: {
    width: '100%',
    height: '100%',
  },
  heroFallback: {
    width: '100%',
    height: '100%',
    backgroundColor: '#f3f4f6',
  },
  heroGradient: {
    ...StyleSheet.absoluteFillObject,
  },
  mainContent: {
    paddingHorizontal: 20,
  },
  characterHeaderRow: {
    marginTop: 16,
    flexDirection: 'row',
    alignItems: 'center',
  },
  characterBadge: {
    borderRadius: 4,
    backgroundColor: '#1f2937',
    paddingHorizontal: 8,
    paddingVertical: 4,
    flexDirection: 'row',
    alignItems: 'center',
  },
  characterBadgeText: {
    marginLeft: 4,
    color: '#ffffff',
    fontSize: 10,
    lineHeight: 14,
  },
  characterName: {
    marginLeft: 8,
    color: '#111827',
    fontSize: 24,
    fontWeight: '700',
    lineHeight: 32,
  },
  tagsWrap: {
    marginTop: 12,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  tagItem: {
    borderRadius: 9999,
    backgroundColor: '#f3f4f6',
    borderWidth: 1,
    borderColor: '#f3f4f6',
    paddingHorizontal: 11,
    paddingVertical: 5,
  },
  tagText: {
    color: '#6b7280',
    fontSize: 11,
    lineHeight: 15,
  },
  popularityRow: {
    marginTop: 14,
    flexDirection: 'row',
    alignItems: 'center',
  },
  popularityText: {
    marginLeft: 6,
    color: '#6b7280',
    fontSize: 11,
    lineHeight: 15,
  },
  descriptionBlock: {
    marginTop: 29,
  },
  subtitle: {
    color: '#1f2937',
    fontSize: 14,
    fontWeight: '700',
    lineHeight: 19,
  },
  quote: {
    marginTop: 24,
    color: '#6b7280',
    fontSize: 14,
    lineHeight: 19,
  },
  worksSection: {
    marginTop: 22,
  },
  sectionTitle: {
    color: '#111827',
    fontSize: 16,
    fontWeight: '700',
    lineHeight: 21,
  },
  worksList: {
    marginTop: 16,
    gap: 12,
  },
  workCard: {
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#f3f4f6',
    backgroundColor: '#f3f4f6',
    padding: 12,
  },
  workTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  workTitle: {
    flex: 1,
    color: '#1f2937',
    fontSize: 14,
    fontWeight: '700',
    lineHeight: 19,
  },
  workPopularity: {
    marginLeft: 8,
    flexDirection: 'row',
    alignItems: 'center',
  },
  workPopularityText: {
    marginLeft: 2,
    color: '#9ca3af',
    fontSize: 10,
    lineHeight: 14,
  },
  workContentRow: {
    marginTop: 8,
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  workCover: {
    width: 64,
    height: 80,
    borderRadius: 8,
  },
  workCoverFallback: {
    width: 64,
    height: 80,
    borderRadius: 8,
    backgroundColor: '#e5e7eb',
    alignItems: 'center',
    justifyContent: 'center',
  },
  workDesc: {
    flex: 1,
    marginLeft: 12,
    color: '#6b7280',
    fontSize: 11,
    lineHeight: 15,
  },
  bottomHint: {
    marginTop: 24,
    marginBottom: 16,
    textAlign: 'center',
    color: '#d1d5db',
    fontSize: 10,
    lineHeight: 14,
  },
  bottomBar: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    height: 116,
    alignItems: 'center',
    justifyContent: 'center',
  },
  chatButton: {
    width: '92%',
    height: 56,
    borderRadius: 9999,
    backgroundColor: 'rgba(0,0,0,0.8)',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000000',
    shadowOpacity: 0.1,
    shadowRadius: 15,
    shadowOffset: { width: 0, height: 10 },
  },
  chatButtonText: {
    marginLeft: 7,
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
    lineHeight: 21,
  },
});
