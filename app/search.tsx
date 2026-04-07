import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import {
  Alert,
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

type SearchStory = {
  id: string;
  title: string;
  description: string;
  coverSource: number;
  readCount: number;
};

type RankingCharacter = {
  id: string;
  name: string;
  tags: string;
  popularity: number;
  avatarSource: number;
};

const STORY_COVER_1 = require('../assets/story/square/story_cover_1.png');
const STORY_COVER_2 = require('../assets/story/square/story_cover_2.png');
const STORY_COVER_3 = require('../assets/story/square/story_cover_3.png');
const STORY_COVER_4 = require('../assets/story/square/story_cover_4.png');
const STORY_BANNER_1 = require('../assets/story/square/banner_story_1.png');

const stories: SearchStory[] = [
  {
    id: 'story_001',
    title: '重回高三：这次我选他',
    description: '如果人生可以重来，在那个分岔路口，你会走向谁？',
    coverSource: STORY_COVER_1,
    readCount: 45000,
  },
  {
    id: 'story_002',
    title: '落入凡尘的星光',
    description: '娱乐圈生存法则：是保持初心，还是步步为营？',
    coverSource: STORY_COVER_3,
    readCount: 38000,
  },
  {
    id: 'story_003',
    title: '赛博霓虹：觉醒时刻',
    description: '在机械与灵魂的边缘，你的每一个决定都关乎人类存亡。',
    coverSource: STORY_COVER_2,
    readCount: 22000,
  },
  {
    id: 'story_004',
    title: '仙途：一念成魔',
    description: '修仙路上，是守护苍生，还是唯我独尊？',
    coverSource: STORY_COVER_4,
    readCount: 56000,
  },
  {
    id: 'story_005',
    title: '第七条规则',
    description: '你已经违反了前三条，正在生成第四条规则...',
    coverSource: STORY_BANNER_1,
    readCount: 125000,
  },
  {
    id: 'story_006',
    title: '星际迷航：未知领域',
    description: '在浩瀚宇宙中，探索未知的星系和文明',
    coverSource: STORY_COVER_3,
    readCount: 32000,
  },
  {
    id: 'story_007',
    title: '古墓迷踪：寻宝之旅',
    description: '深入古墓，解开千年之谜，寻找失落的宝藏',
    coverSource: STORY_COVER_2,
    readCount: 28000,
  },
];

const characters: RankingCharacter[] = [
  {
    id: 'char_pop_001',
    name: '秦彻',
    tags: '爹系 · 引导型 · 霸总',
    popularity: 1,
    avatarSource: require('../assets/story/characters/char_1.png'),
  },
  {
    id: 'char_pop_002',
    name: '黎深',
    tags: '智性恋 · 人夫 · 禁欲',
    popularity: 2,
    avatarSource: require('../assets/story/characters/char_2.png'),
  },
  {
    id: 'char_pop_003',
    name: '夏以昼',
    tags: '年上 · 伪骨 · 妹控',
    popularity: 3,
    avatarSource: require('../assets/story/characters/char_3.png'),
  },
  {
    id: 'char_pop_004',
    name: '德拉科·马尔福',
    tags: 'HP · 美强惨 · 口嫌体正直',
    popularity: 4,
    avatarSource: require('../assets/story/characters/char_4.png'),
  },
  {
    id: 'char_pop_005',
    name: '汤姆·里德尔',
    tags: 'HP · 白切黑 · 阴湿男鬼',
    popularity: 5,
    avatarSource: require('../assets/story/characters/char_5.png'),
  },
  {
    id: 'char_pop_006',
    name: '司马懿',
    tags: '权谋 · 反派 · 心狠手辣',
    popularity: 6,
    avatarSource: require('../assets/story/characters/char_6.png'),
  },
  {
    id: 'char_pop_007',
    name: '诸葛亮',
    tags: '军师 · 高智商 · 温柔',
    popularity: 7,
    avatarSource: require('../assets/story/characters/char_7.png'),
  },
  {
    id: 'char_pop_008',
    name: '马嘉祺',
    tags: 'TNT · 年上 · 苏感',
    popularity: 8,
    avatarSource: require('../assets/story/characters/char_8.png'),
  },
  {
    id: 'char_pop_009',
    name: '严浩翔',
    tags: 'TNT · 霸总 · 渣苏',
    popularity: 9,
    avatarSource: require('../assets/story/characters/char_9.png'),
  },
];

function getStoryRankColor(rank: number): string {
  switch (rank) {
    case 1:
      return '#ff4d4d';
    case 2:
      return '#ff6b6b';
    case 3:
      return '#ff8a8a';
    case 4:
      return '#ffb84d';
    case 5:
      return '#ffcc66';
    case 6:
      return '#ffdd88';
    case 7:
      return '#ffeeaa';
    default:
      return '#6b7280';
  }
}

function getCharacterRankColor(rank: number): string {
  switch (rank) {
    case 1:
      return '#ef4444';
    case 2:
      return '#fb923c';
    case 3:
      return '#eab308';
    default:
      return '#f87171';
  }
}

export default function SearchScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { t } = useTranslation();
  const [tabIndex, setTabIndex] = useState(0);
  const [keyword, setKeyword] = useState('');

  const hotStories = useMemo(
    () => [...stories].sort((a, b) => b.readCount - a.readCount),
    []
  );

  function performSearch() {
    Alert.alert('', t('search.notOpen'));
  }

  function goToStoryDetail(storyId: string) {
    Alert.alert('', t('search.gotoStory', { id: storyId }));
  }

  function goToCharacterDetail(characterId: string) {
    Alert.alert('', t('search.gotoCharacter', { id: characterId }));
  }

  return (
    <View style={styles.container}>
      <View style={{ height: insets.top }} />
      <View style={styles.header}>
        <Pressable style={styles.headerBack} onPress={() => router.back()} hitSlop={12}>
          <Ionicons name="chevron-back" size={20} color="#111827" />
        </Pressable>
        <Text style={styles.headerTitle}>{t('search.title')}</Text>
        <View style={styles.headerSpacer} />
      </View>

      <View style={styles.searchBarArea}>
        <View style={styles.searchInputWrap}>
          <Ionicons name="search" size={20} color="#9ca3af" />
          <TextInput
            value={keyword}
            onChangeText={setKeyword}
            style={styles.searchInput}
            placeholder={t('search.placeholder')}
            placeholderTextColor="#9ca3af"
            onSubmitEditing={performSearch}
            returnKeyType="search"
          />
        </View>
        <Pressable onPress={performSearch} hitSlop={8}>
          <Text style={styles.searchButtonText}>{t('search.searchButton')}</Text>
        </Pressable>
      </View>

      <View style={styles.contentPanel}>
        <View style={styles.tabBar}>
          <Pressable onPress={() => setTabIndex(0)} style={styles.tabItem}>
            <Text style={[styles.tabText, tabIndex === 0 && styles.tabTextActive]}>
              {t('search.hotStories')}
            </Text>
            <View style={[styles.tabUnderline, tabIndex === 0 && styles.tabUnderlineActive]} />
          </Pressable>
          <Pressable onPress={() => setTabIndex(1)} style={styles.tabItem}>
            <Text style={[styles.tabText, tabIndex === 1 && styles.tabTextActive]}>
              {t('search.hotCharacters')}
            </Text>
            <View style={[styles.tabUnderline, tabIndex === 1 && styles.tabUnderlineActive]} />
          </Pressable>
        </View>

        {tabIndex === 0 ? (
          <ScrollView style={styles.listArea} contentContainerStyle={styles.listContent}>
            {hotStories.length === 0 ? (
              <View style={styles.emptyWrap}>
                <Text style={styles.emptyText}>{t('search.empty')}</Text>
              </View>
            ) : (
              hotStories.map((story, index) => (
                <View key={story.id}>
                  <Pressable
                    style={styles.storyRow}
                    onPress={() => goToStoryDetail(story.id)}
                  >
                    <View style={styles.storyRankWrap}>
                      <Text style={[styles.storyRankText, { color: getStoryRankColor(index + 1) }]}>
                        {index + 1}
                      </Text>
                    </View>
                    <Image source={story.coverSource} style={styles.storyCover} resizeMode="cover" />
                    <View style={styles.storyInfo}>
                      <Text style={styles.storyTitle} numberOfLines={1}>
                        {story.title}
                      </Text>
                      <Text style={styles.storyDesc} numberOfLines={2}>
                        {story.description}
                      </Text>
                    </View>
                  </Pressable>
                  {index !== hotStories.length - 1 ? <View style={styles.separator} /> : null}
                </View>
              ))
            )}
          </ScrollView>
        ) : (
          <ScrollView style={styles.listArea} contentContainerStyle={styles.listContent}>
            {characters.length === 0 ? (
              <View style={styles.emptyWrap}>
                <Text style={styles.emptyText}>{t('search.empty')}</Text>
              </View>
            ) : (
              characters.map((character, index) => (
                <View key={character.id}>
                  <Pressable
                    style={styles.characterRow}
                    onPress={() => goToCharacterDetail(character.id)}
                  >
                    <View style={styles.characterRankWrap}>
                      <Text
                        style={[
                          styles.characterRankText,
                          { color: getCharacterRankColor(character.popularity) },
                        ]}
                      >
                        {character.popularity}
                      </Text>
                    </View>
                    <Image source={character.avatarSource} style={styles.characterAvatar} resizeMode="cover" />
                    <View style={styles.characterInfo}>
                      <Text style={styles.characterName} numberOfLines={1}>
                        {character.name}
                      </Text>
                      <Text style={styles.characterTags} numberOfLines={1}>
                        {character.tags}
                      </Text>
                    </View>
                  </Pressable>
                  {index !== characters.length - 1 ? <View style={styles.separator} /> : null}
                </View>
              ))
            )}
          </ScrollView>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  header: {
    height: 56,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    backgroundColor: '#ffffff',
  },
  headerBack: {
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    color: '#111827',
    fontSize: 18,
    fontWeight: '700',
  },
  headerSpacer: {
    width: 32,
  },
  searchBarArea: {
    paddingHorizontal: 24,
    paddingTop: 8,
    paddingBottom: 8,
    flexDirection: 'row',
    alignItems: 'center',
  },
  searchInputWrap: {
    flex: 1,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#f9fafb',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
  },
  searchInput: {
    flex: 1,
    marginLeft: 8,
    color: '#111827',
    fontSize: 14,
    paddingVertical: 0,
  },
  searchButtonText: {
    marginLeft: 12,
    color: '#111827',
    fontSize: 15,
  },
  contentPanel: {
    flex: 1,
    marginHorizontal: 24,
    borderRadius: 16,
    backgroundColor: '#f9fafb',
    overflow: 'hidden',
  },
  tabBar: {
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
  },
  tabItem: {
    marginRight: 24,
  },
  tabText: {
    color: '#6b7280',
    fontSize: 15,
    fontWeight: '400',
  },
  tabTextActive: {
    color: '#111827',
    fontWeight: '700',
  },
  tabUnderline: {
    marginTop: 4,
    height: 2,
    backgroundColor: 'transparent',
  },
  tabUnderlineActive: {
    backgroundColor: '#111827',
  },
  listArea: {
    flex: 1,
  },
  listContent: {
    paddingBottom: 16,
  },
  emptyWrap: {
    paddingTop: 48,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 14,
    color: '#6b7280',
  },
  storyRow: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  storyRankWrap: {
    width: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
  },
  storyRankText: {
    fontSize: 18,
    fontWeight: '700',
  },
  storyCover: {
    width: 56,
    height: 74,
    borderRadius: 4,
    marginLeft: 16,
  },
  storyInfo: {
    marginLeft: 12,
    flex: 1,
    paddingTop: 2,
  },
  storyTitle: {
    fontSize: 15,
    color: '#111827',
    fontWeight: '600',
    lineHeight: 20,
  },
  storyDesc: {
    marginTop: 6,
    fontSize: 12,
    color: '#6b7280',
    lineHeight: 17,
  },
  characterRow: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    height: 80,
    flexDirection: 'row',
    alignItems: 'center',
  },
  characterRankWrap: {
    width: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  characterRankText: {
    fontSize: 18,
    fontWeight: '700',
  },
  characterAvatar: {
    width: 48,
    height: 64,
    borderRadius: 4,
    marginLeft: 16,
  },
  characterInfo: {
    marginLeft: 16,
    flex: 1,
    justifyContent: 'center',
  },
  characterName: {
    color: '#111827',
    fontSize: 16,
    fontWeight: '700',
  },
  characterTags: {
    marginTop: 4,
    color: '#6b7280',
    fontSize: 12,
  },
  separator: {
    marginLeft: 52,
    height: StyleSheet.hairlineWidth,
    backgroundColor: '#f3f4f6',
  },
});
