import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Image,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { getStoryById } from '@/src/data/story/storyService';
import StoryBranchMap from '@/src/features/reader/branch/StoryBranchMap';
import StoryBranchProgressBar from '@/src/features/reader/branch/StoryBranchProgressBar';
import {
  buildBranchColumns,
  buildBranchEdges,
} from '@/src/features/reader/branch/storyBranchBuilder';
import { resolveStoryImageSource } from '@/app/storyImageResolver';
import { readingProgressRepository } from '@/src/storage/db/repositories/readingProgressRepository';
import type { StoryComment } from '@/src/data/story/types';

function parseVisitedNodeIds(raw: string | null | undefined): string[] {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed.map((item) => String(item));
  } catch {
    return [];
  }
}

type StoryDetailCharacter = {
  id: string;
  name: string;
  avatar: string;
  quote: string | null;
  encounterCountW: string | null;
  unlocked: boolean;
};

const LOCKED_CHARACTERS: StoryDetailCharacter[] = [
  {
    id: 'char_locked_001',
    name: '???',
    avatar: 'assets/mock/我心归处是良人/images/reader_panel/panel_locked_bg.png',
    quote: null,
    encounterCountW: '3.5',
    unlocked: false,
  },
  {
    id: 'char_locked_002',
    name: '???',
    avatar: 'assets/mock/我心归处是良人/images/reader_panel/panel_locked_bg.png',
    quote: null,
    encounterCountW: '3.5',
    unlocked: false,
  },
  {
    id: 'char_locked_003',
    name: '???',
    avatar: 'assets/mock/我心归处是良人/images/reader_panel/panel_locked_bg.png',
    quote: null,
    encounterCountW: '3.5',
    unlocked: false,
  },
];
const CHARACTER_POSTER_ASPECT_RATIO = 2 / 3;

const EXTRA_COMMENTS: StoryComment[] = [
  {
    id: 'comment_more_1',
    userAvatar: 'https://picsum.photos/seed/user004/100/100',
    userName: '夜雨声烦',
    content: '这个故事的世界观设定太棒了，每个角色都有自己的故事线',
    likeCount: 89,
    isLiked: false,
    time: '5小时前',
  },
  {
    id: 'comment_more_2',
    userAvatar: 'https://picsum.photos/seed/user005/100/100',
    userName: '清风徐来',
    content: '剧情分支太多了，每次选择都好纠结',
    likeCount: 67,
    isLiked: false,
    time: '6小时前',
  },
  {
    id: 'comment_more_3',
    userAvatar: 'https://picsum.photos/seed/user006/100/100',
    userName: '星辰大海',
    content: '期待后续更新！',
    likeCount: 45,
    isLiked: false,
    time: '8小时前',
  },
];

export default function StoryDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { t } = useTranslation();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const story = id ? getStoryById(id) : null;
  const [visitedNodeIds, setVisitedNodeIds] = useState<string[]>([]);
  const [progressPercentage, setProgressPercentage] = useState(0);
  const [isFollowedAuthor, setIsFollowedAuthor] = useState(false);
  const [isLiked, setIsLiked] = useState(false);
  const [isBookmarked, setIsBookmarked] = useState(false);
  const [showMoreComments, setShowMoreComments] = useState(false);
  const [commentInputVisible, setCommentInputVisible] = useState(false);
  const [pendingComment, setPendingComment] = useState('');
  const [comments, setComments] = useState<StoryComment[]>([]);
  const [commentLikeStatus, setCommentLikeStatus] = useState<Record<string, boolean>>({});
  const [descriptionExpanded, setDescriptionExpanded] = useState(false);

  const loadProgress = useCallback(async () => {
    if (!story) return;
    const row = await readingProgressRepository.getByStoryId(story.id);
    const visited = parseVisitedNodeIds(row?.visited_node_ids);
    setVisitedNodeIds(visited);
    setProgressPercentage(
      row?.progress_percentage ??
      (story.nodes.length > 0 ? Math.round((visited.length / story.nodes.length) * 100) : 0)
    );
  }, [story]);

  useEffect(() => {
    if (!story) return;
    setIsFollowedAuthor(Boolean(story.isFollowedAuthor));
    setIsLiked(Boolean(story.isLiked));
    setIsBookmarked(Boolean(story.isBookmarked));
    setComments(story.comments);
    setCommentLikeStatus({});
    setDescriptionExpanded(false);
  }, [story]);

  useEffect(() => {
    let mounted = true;
    async function load() {
      if (!story || !mounted) return;
      await loadProgress();
    }
    void load();
    return () => {
      mounted = false;
    };
  }, [loadProgress, story]);

  useFocusEffect(
    useCallback(() => {
      void loadProgress();
    }, [loadProgress])
  );

  const visitedSet = useMemo(() => new Set(visitedNodeIds), [visitedNodeIds]);
  const branchColumns = useMemo(() => {
    if (!story) return [];
    return buildBranchColumns(story, visitedSet);
  }, [story, visitedSet]);
  const branchEdges = useMemo(() => {
    if (!story) return [];
    return buildBranchEdges(story);
  }, [story]);
  const detailCharacters = useMemo<StoryDetailCharacter[]>(() => {
    if (!story) return [];
    const unlocked = story.mainCharacters
      .filter((item) => item.isInteracted)
      .map((item) => ({
        id: item.id,
        name: item.name,
        avatar: item.avatar ?? '',
        quote: item.quote ?? item.subtitle ?? null,
        encounterCountW:
          typeof item.encounterCount === 'number' && item.encounterCount > 0
            ? (item.encounterCount / 10000).toFixed(1)
            : null,
        unlocked: true,
      }));
    return [...unlocked, ...LOCKED_CHARACTERS];
  }, [story]);
  const unlockedCount = useMemo(
    () => detailCharacters.filter((item) => item.unlocked).length,
    [detailCharacters]
  );
  const resolvedCover = useMemo(
    () => resolveStoryImageSource(story?.cover ?? '') ?? null,
    [story?.cover]
  );
  const resolvedAuthorAvatar = useMemo(
    () => resolveStoryImageSource(story?.avatar ?? '') ?? null,
    [story?.avatar]
  );

  function formatEncounterTextW(value: string | null): string {
    if (!value) return t('storyDetail.encounterDefault');
    return t('storyDetail.encounterW', { count: value });
  }

  function openCharacter(character: StoryDetailCharacter) {
    if (!character.unlocked) {
      Alert.alert('', t('storyDetail.characterLockedTip'));
      return;
    }
    router.push(`/character/${character.id}`);
  }

  function toggleCommentLike(comment: StoryComment) {
    const liked = commentLikeStatus[comment.id] ?? false;
    setCommentLikeStatus((prev) => ({ ...prev, [comment.id]: !liked }));
    setComments((prev) =>
      prev.map((item) =>
        item.id === comment.id
          ? { ...item, likeCount: liked ? item.likeCount - 1 : item.likeCount + 1 }
          : item
      )
    );
  }

  function sendComment() {
    const text = pendingComment.trim();
    if (!text) return;
    const newComment: StoryComment = {
      id: `comment_${Date.now()}`,
      userAvatar: 'https://picsum.photos/seed/user_current/100/100',
      userName: t('storyDetail.currentUser'),
      content: text,
      likeCount: 0,
      isLiked: false,
      time: t('storyDetail.justNow'),
    };
    setComments((prev) => [newComment, ...prev]);
    setCommentInputVisible(false);
    setPendingComment('');
    Alert.alert('', t('storyDetail.commentSent'));
  }

  if (!story) {
    return (
      <View style={styles.container}>
        <Text style={styles.title}>{t('storyDetail.title')}</Text>
        <Text style={styles.subtitle}>{t('storyDetail.notFound')}</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={{ height: insets.top }} />
      <View style={styles.headerBar}>
        <Pressable
          onPress={() => router.back()}
          style={styles.headerIconButton}
          hitSlop={12}
        >
          <Ionicons name="chevron-back" size={20} color="#111827" />
        </Pressable>
        <View style={styles.headerAuthorRow}>
          <View style={styles.headerAvatarWrap}>
            {resolvedAuthorAvatar ? (
              <Image source={resolvedAuthorAvatar} style={styles.headerAvatar} resizeMode="cover" />
            ) : (
              <View style={styles.headerAvatarFallback}>
                <Ionicons name="person" size={16} color="#9ca3af" />
              </View>
            )}
          </View>
          <Text style={styles.headerAuthorName}>{story.author ?? '-'}</Text>
          <Pressable
            onPress={() => setIsFollowedAuthor((prev) => !prev)}
            style={styles.followButton}
          >
            <Text style={styles.followButtonText}>
              {isFollowedAuthor ? t('storyDetail.followed') : t('storyDetail.follow')}
            </Text>
          </Pressable>
        </View>
      </View>
      <ScrollView contentContainerStyle={styles.content}>


        <View style={styles.coverWrap}>
          {resolvedCover ? (
            <Image source={resolvedCover} style={styles.coverImage} resizeMode="cover" />
          ) : (
            <View style={styles.coverFallback} />
          )}
          <LinearGradient
            colors={['rgba(0,0,0,0)', 'rgba(0,0,0,0)', 'rgba(0,0,0,0.6)']}
            locations={[0, 0.5, 1]}
            style={styles.coverDarkFade}
          />
          <LinearGradient
            colors={['rgba(255,255,255,0)', 'rgba(255,255,255,1)']}
            locations={[0, 1]}
            style={styles.coverBottomFade}
          />
          <Text style={styles.coverTitle} numberOfLines={2}>
            {story.title}
          </Text>
        </View>

        <View style={styles.tagsAndActions}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <View style={styles.tagsRow}>
              {story.tags.map((tag) => (
                <View key={tag} style={styles.tagPill}>
                  <Text style={styles.tagPillText}>{tag}</Text>
                </View>
              ))}
            </View>
          </ScrollView>
          <View style={styles.actionsRow}>
            <Pressable onPress={() => setIsLiked((prev) => !prev)} style={styles.actionIconButton}>
              <Ionicons
                name={isLiked ? 'heart' : 'heart-outline'}
                size={18}
                color={isLiked ? '#ef4444' : '#6b7280'}
              />
            </Pressable>
            <Pressable onPress={() => setIsBookmarked((prev) => !prev)} style={styles.actionIconButton}>
              <Ionicons
                name={isBookmarked ? 'bookmark' : 'bookmark-outline'}
                size={18}
                color={isBookmarked ? '#fbbf24' : '#6b7280'}
              />
            </Pressable>
            <Pressable onPress={() => Alert.alert('', t('storyDetail.sharePending'))} style={styles.actionIconButton}>
              <Ionicons name="share-social-outline" size={18} color="#6b7280" />
            </Pressable>
          </View>
        </View>

        <View style={styles.descriptionWrap}>
          <Text
            style={styles.descriptionText}
            numberOfLines={descriptionExpanded ? undefined : 4}
          >
            {story.description}
          </Text>
          <Pressable onPress={() => setDescriptionExpanded((prev) => !prev)}>
            <Text style={styles.expandText}>
              {descriptionExpanded ? t('storyDetail.collapse') : t('storyDetail.expand')}
            </Text>
          </Pressable>
        </View>

        <View style={styles.divider} />

        <View style={styles.sectionWrap}>
          <View style={styles.sectionHeaderRow}>
            <Text style={styles.sectionTitle}>{t('storyDetail.storyCharacters')}</Text>
            <Text style={styles.sectionCountText}>{`${unlockedCount}/${detailCharacters.length}`}</Text>
          </View>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.charactersScroll}
          >
            {detailCharacters.map((character, index) => {
              const imageSource = resolveStoryImageSource(character.avatar);
              return (
                <Pressable key={character.id} style={styles.characterCardWrap} onPress={() => openCharacter(character)}>
                  <View
                    style={[
                      styles.characterPoster,
                      character.unlocked
                        ? index === 0
                          ? styles.characterPosterPrimary
                          : styles.characterPosterUnlocked
                        : styles.characterPosterLocked,
                    ]}
                  >
                    {imageSource ? (
                      <Image
                        source={imageSource}
                        style={[
                          styles.characterPosterImage,
                          !character.unlocked && styles.characterPosterImageLocked,
                        ]}
                        resizeMode="cover"
                      />
                    ) : null}
                    {!character.unlocked ? (
                      <View style={styles.characterLockWrap}>
                        <Ionicons name="lock-closed-outline" size={30} color="#9ca3af" />
                      </View>
                    ) : null}
                    <View style={styles.characterGradientOverlay} />
                    <View style={styles.characterMetaRow}>
                      <Ionicons name="heart" size={10} color="#fde047" />
                      <Text style={styles.characterMetaText}>
                        {formatEncounterTextW(character.encounterCountW)}
                      </Text>
                    </View>
                    <Text style={styles.characterNameText}>{character.name}</Text>
                  </View>
                  {!character.unlocked ? (
                    <Text style={styles.characterSubText}>{t('storyDetail.locked')}</Text>
                  ) : character.quote ? (
                    <Text style={styles.characterSubText} numberOfLines={2}>
                      {character.quote}
                    </Text>
                  ) : (
                    <Text style={styles.characterSubText}>{t('storyDetail.characterDefaultQuote')}</Text>
                  )}
                </Pressable>
              );
            })}
          </ScrollView>
        </View>

        <View style={styles.divider} />

        <View style={styles.sectionWrap}>
          <Text style={styles.branchSectionTitle}>{t('storyDetail.branchTitle')}</Text>
          <View style={styles.branchMapWrap}>
            {branchColumns.length > 0 && branchEdges.length > 0 ? (
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.branchMapScroll}
              >
                <StoryBranchMap
                  columns={branchColumns}
                  edges={branchEdges}
                  resolveImageSource={resolveStoryImageSource}
                />
              </ScrollView>
            ) : (
              <Text style={styles.branchEmpty}>{t('reader.branchMapEmpty')}</Text>
            )}
          </View>
          <View style={styles.branchProgressWrap}>
            <StoryBranchProgressBar percentage={progressPercentage} />
          </View>
        </View>

        <View style={styles.divider} />

        <View style={styles.commentsSection}>
          <Text style={styles.commentsTitle}>
            {`${t('storyDetail.comments')} ${story.totalCommentCount ?? comments.length}`}
          </Text>
          <Pressable style={styles.commentInputStub} onPress={() => setCommentInputVisible(true)}>
            <View style={styles.commentInputAvatar}>
              <Ionicons name="person" size={20} color="#ffffff" />
            </View>
            <View style={styles.commentInputField}>
              <Text style={styles.commentInputHint}>{t('storyDetail.commentHint')}</Text>
            </View>
          </Pressable>

          {[...comments, ...(showMoreComments ? EXTRA_COMMENTS : [])].map((comment) => {
            const liked = commentLikeStatus[comment.id] ?? false;
            return (
              <View key={comment.id} style={styles.commentItem}>
                <Image
                  source={{ uri: comment.userAvatar }}
                  style={styles.commentAvatar}
                  resizeMode="cover"
                />
                <View style={styles.commentBody}>
                  <View style={styles.commentTopRow}>
                    <Text style={styles.commentUserName}>{comment.userName}</Text>
                    <Pressable onPress={() => toggleCommentLike(comment)} style={styles.commentLikeButton}>
                      <Ionicons
                        name={liked ? 'heart' : 'heart-outline'}
                        size={16}
                        color={liked ? '#ef4444' : '#9ca3af'}
                      />
                      <Text style={[styles.commentLikeText, liked && styles.commentLikeTextLiked]}>
                        {comment.likeCount}
                      </Text>
                    </Pressable>
                  </View>
                  <Text style={styles.commentContentText}>{comment.content}</Text>
                  <View style={styles.commentBottomRow}>
                    <Text style={styles.commentTimeText}>{comment.time}</Text>
                    <Pressable onPress={() => Alert.alert('', t('storyDetail.replyPending'))}>
                      <Text style={styles.commentReplyText}>· {t('storyDetail.reply')}</Text>
                    </Pressable>
                  </View>
                </View>
              </View>
            );
          })}

          {(story.totalCommentCount ?? 0) > comments.length ? (
            <Pressable
              onPress={() => setShowMoreComments((prev) => !prev)}
              style={styles.moreCommentsButton}
            >
              <Text style={styles.moreCommentsText}>
                {showMoreComments ? t('storyDetail.collapseComments') : t('storyDetail.viewMoreComments')}
              </Text>
            </Pressable>
          ) : null}
        </View>

        <View style={styles.bottomSpace} />
      </ScrollView>

      <View style={styles.bottomBarWrap}>
        <LinearGradient
          colors={['rgba(255,255,255,0)', 'rgba(255,255,255,0.95)']}
          locations={[0, 1]}
          style={styles.bottomBarGradient}
          pointerEvents="none"
        />
        <Pressable
          style={styles.bottomActionButton}
          onPress={() => router.push(`/reader/${story.id}?mode=pure`)}
        >
          <Text style={styles.bottomActionText}>{t('storyDetail.readPure')}</Text>
        </Pressable>
        <View style={styles.bottomActionGap} />
        <Pressable
          style={styles.bottomActionButton}
          onPress={() => router.push(`/reader/${story.id}?mode=interactive`)}
        >
          <Text style={styles.bottomActionText}>{t('storyDetail.readInteractive')}</Text>
        </Pressable>
      </View>

      <Modal
        visible={commentInputVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setCommentInputVisible(false)}
      >
        <View style={styles.commentModalBackdrop}>
          <Pressable style={styles.commentModalDismiss} onPress={() => setCommentInputVisible(false)} />
          <View style={styles.commentModalCard}>
            <Text style={styles.commentModalTitle}>{t('storyDetail.commentTitle')}</Text>
            <TextInput
              value={pendingComment}
              onChangeText={setPendingComment}
              multiline
              placeholder={t('storyDetail.commentHint')}
              style={styles.commentModalInput}
              placeholderTextColor="#9ca3af"
            />
            <View style={styles.commentModalActions}>
              <Pressable
                style={styles.commentModalActionButton}
                onPress={() => setCommentInputVisible(false)}
              >
                <Text style={styles.commentModalActionText}>{t('storyDetail.cancel')}</Text>
              </Pressable>
              <Pressable style={styles.commentModalActionButton} onPress={sendComment}>
                <Text style={styles.commentModalActionText}>{t('storyDetail.sendComment')}</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  content: {
    paddingBottom: 126,
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
  },
  subtitle: {
    marginTop: 8,
    color: '#6b7280',
  },
  headerBar: {
    // height: 64,
    paddingBottom: 10,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    backgroundColor: '#ffffff',
  },
  headerIconButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerAuthorRow: {
    marginLeft: 8,
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerAvatarWrap: {
    width: 32,
    height: 32,
    borderRadius: 16,
    overflow: 'hidden',
  },
  headerAvatar: {
    width: 32,
    height: 32,
  },
  headerAvatarFallback: {
    width: 32,
    height: 32,
    backgroundColor: '#f3f4f6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerAuthorName: {
    marginLeft: 8,
    color: '#111827',
    fontSize: 14,
    fontWeight: '500',
  },
  followButton: {
    marginLeft: 8,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    backgroundColor: '#f3f4f6',
  },
  followButtonText: {
    color: '#6b7280',
    fontSize: 10,
  },
  coverWrap: {
    height: 468,
    position: 'relative',
  },
  coverImage: {
    width: '100%',
    height: 468,
  },
  coverFallback: {
    width: '100%',
    height: 468,
    backgroundColor: '#f3f4f6',
  },
  coverDarkFade: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
  },
  coverBottomFade: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    height: 100,
  },
  coverTitle: {
    position: 'absolute',
    left: 24,
    right: 24,
    bottom: 20,
    color: '#111827',
    fontSize: 20,
    fontWeight: '700',
    lineHeight: 27,
  },
  tagsAndActions: {
    paddingLeft: 20,
    paddingRight: 14,
    paddingTop: 12,
    flexDirection: 'row',
    alignItems: 'center',
  },
  tagsRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  tagPill: {
    marginRight: 8,
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 9999,
    backgroundColor: '#f3f4f6',
  },
  tagPillText: {
    color: '#9ca3af',
    fontSize: 12,
  },
  actionsRow: {
    marginLeft: 'auto',
    flexDirection: 'row',
    alignItems: 'center',
  },
  actionIconButton: {
    marginLeft: 8,
    width: 24,
    height: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  descriptionWrap: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 20,
  },
  descriptionText: {
    color: '#4b5563',
    fontSize: 14,
    lineHeight: 22,
  },
  expandText: {
    marginTop: 4,
    color: '#6b7280',
    fontSize: 14,
  },
  divider: {
    height: 1,
    backgroundColor: '#f3f4f6',
  },
  sectionWrap: {
    paddingVertical: 24,
  },
  sectionHeaderRow: {
    paddingHorizontal: 20,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  sectionTitle: {
    color: '#111827',
    fontSize: 18,
    fontWeight: '600',
  },
  branchSectionTitle: {
    paddingHorizontal: 20,
    color: '#111827',
    fontSize: 18,
    fontWeight: '600',
  },
  sectionCountText: {
    color: '#9ca3af',
    fontSize: 12,
  },
  charactersScroll: {
    marginTop: 16,
    paddingHorizontal: 20,
  },
  characterCardWrap: {
    width: 98,
    marginRight: 8,
  },
  characterPoster: {
    width: 98,
    aspectRatio: CHARACTER_POSTER_ASPECT_RATIO,
    borderRadius: 16,
    borderWidth: 2,
    overflow: 'hidden',
    position: 'relative',
    backgroundColor: '#111827',
  },
  characterPosterPrimary: {
    borderColor: '#fde047',
  },
  characterPosterUnlocked: {
    borderColor: '#ffffff',
  },
  characterPosterLocked: {
    borderColor: '#ffffff',
    backgroundColor: '#f3f4f6',
  },
  characterPosterImage: {
    width: '100%',
    height: '100%',
  },
  characterPosterImageLocked: {
    opacity: 0.4,
  },
  characterLockWrap: {
    position: 'absolute',
    left: '50%',
    top: '50%',
    marginLeft: -15,
    marginTop: -15,
    width: 30,
    height: 30,
    alignItems: 'center',
    justifyContent: 'center',
  },
  characterGradientOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.35)',
  },
  characterMetaRow: {
    position: 'absolute',
    left: 10,
    bottom: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  characterMetaText: {
    color: '#fde047',
    fontSize: 8,
    lineHeight: 14,
  },
  characterNameText: {
    position: 'absolute',
    left: 10,
    bottom: 32,
    color: '#ffffff',
    fontSize: 18,
    fontWeight: '700',
  },
  characterSubText: {
    marginTop: 8,
    marginLeft: 4,
    color: '#6b7280',
    fontSize: 12,
    lineHeight: 16,
  },
  branchMapWrap: {
    marginTop: 16,
  },
  branchMapScroll: {
    paddingHorizontal: 20,
  },
  branchEmpty: {
    paddingHorizontal: 20,
    color: '#6b7280',
    fontSize: 13,
  },
  branchProgressWrap: {
    marginTop: 16,
    paddingHorizontal: 20,
  },
  commentsSection: {
    paddingHorizontal: 16,
    paddingTop: 24,
  },
  commentsTitle: {
    color: '#111827',
    fontSize: 16,
    fontWeight: '700',
  },
  commentInputStub: {
    marginTop: 24,
    flexDirection: 'row',
    alignItems: 'center',
  },
  commentInputAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#a3e635',
    alignItems: 'center',
    justifyContent: 'center',
  },
  commentInputField: {
    marginLeft: 12,
    flex: 1,
    height: 40,
    borderRadius: 9999,
    backgroundColor: '#f9fafb',
    justifyContent: 'center',
    paddingHorizontal: 16,
  },
  commentInputHint: {
    color: '#9ca3af',
    fontSize: 14,
  },
  commentItem: {
    marginTop: 20,
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  commentAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#f3f4f6',
  },
  commentBody: {
    marginLeft: 12,
    flex: 1,
  },
  commentTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  commentUserName: {
    color: '#6b7280',
    fontSize: 14,
    fontWeight: '500',
  },
  commentLikeButton: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  commentLikeText: {
    marginLeft: 4,
    color: '#9ca3af',
    fontSize: 12,
  },
  commentLikeTextLiked: {
    color: '#ef4444',
  },
  commentContentText: {
    marginTop: 6,
    color: '#111827',
    fontSize: 14,
    lineHeight: 21,
  },
  commentBottomRow: {
    marginTop: 6,
    flexDirection: 'row',
    alignItems: 'center',
  },
  commentTimeText: {
    color: '#9ca3af',
    fontSize: 11,
  },
  commentReplyText: {
    color: '#9ca3af',
    fontSize: 11,
  },
  moreCommentsButton: {
    width: '100%',
    paddingVertical: 16,
    alignItems: 'center',
  },
  moreCommentsText: {
    color: '#6b7280',
    fontSize: 14,
    fontWeight: '500',
  },
  bottomSpace: {
    height: 20,
  },
  bottomBarWrap: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 32,
    flexDirection: 'row',
    overflow: 'hidden',
  },
  bottomBarGradient: {
    ...StyleSheet.absoluteFillObject,
  },
  bottomActionGap: {
    width: 15,
  },
  bottomActionButton: {
    flex: 1,
    height: 48,
    borderRadius: 20,
    backgroundColor: 'rgba(0,0,0,0.8)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  bottomActionText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '700',
  },
  commentModalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.35)',
    justifyContent: 'center',
    paddingHorizontal: 20,
  },
  commentModalDismiss: {
    ...StyleSheet.absoluteFillObject,
  },
  commentModalCard: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 16,
  },
  commentModalTitle: {
    color: '#111827',
    fontSize: 16,
    fontWeight: '700',
  },
  commentModalInput: {
    marginTop: 12,
    minHeight: 96,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    textAlignVertical: 'top',
    color: '#111827',
  },
  commentModalActions: {
    marginTop: 12,
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 10,
  },
  commentModalActionButton: {
    borderRadius: 999,
    borderWidth: 1,
    borderColor: '#d1d5db',
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  commentModalActionText: {
    color: '#374151',
    fontSize: 13,
  },
});
