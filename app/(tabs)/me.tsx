import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
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
import { AppNavigator } from '@/src/navigation/appNavigator';

type MeTab = 0 | 1 | 2;

type ReadingHistoryItem = {
  id: string;
  title: string;
  coverSource: number;
  description: string;
};

type MyCharacterItem = {
  id: string;
  name: string;
  avatarSource: number;
  quote: string;
  time: string;
  isInteracted: boolean;
};

type EncounterCharacterItem = {
  id: string;
  avatarSource: number;
};

const readingHistory: ReadingHistoryItem[] = [
  {
    id: '1',
    title: '合租危情夜',
    coverSource: require('../../assets/story/me/history_1.png'),
    description:
      '故事 | 你是向北，爱森公寓的高薪解说员，合租生活的核心。但一通派出所电话打破平静：警察室友李俊昊因斗殴被拘留。现在，你必须在舆...',
  },
  {
    id: '2',
    title: '顾时夜 | ABO | 军校 | 追求未果后我着急了',
    coverSource: require('../../assets/story/me/history_2.png'),
    description:
      '故事 | 我，军校Omega，追求顶级Alpha顾时夜。他冷若冰霜却暗藏暧昧，我下药想逼他失控。谁知药效让他占有欲爆发，我反被折磨得泪眼求...',
  },
  {
    id: '3',
    title: '【橙色恐怖屋】回家过年，餐桌上有另一个你',
    coverSource: require('../../assets/story/me/history_3.png'),
    description:
      '故事 | 你推开门，发现一家人正在其乐融融地吃饭，而餐桌上坐着一个和你长得一模一样的人。你的丈夫厉泽言，弟弟徐闻也在。你的父母正...',
  },
  {
    id: '4',
    title: '枕边香',
    coverSource: require('../../assets/story/me/history_4.png'),
    description:
      '故事 | 你一直以为女友沈薇抢枕头只是小怪癖，直到有一天深夜你醒来，发现她在枕...',
  },
];

const myCharacters: MyCharacterItem[] = [
  {
    id: 'story_001_char_002',
    name: '赵秉入',
    isInteracted: true,
    avatarSource: require('../../assets/story/avatars/avatar_zhaobingru.png'),
    quote: '纤微，我身负储君千钧重任，机关算尽，唯独漏算了对你的真心。',
    time: '2小时前',
  },
  {
    id: 'story_001_char_003',
    name: '赵秉承',
    isInteracted: true,
    avatarSource: require('../../assets/story/avatars/avatar_zhaobingcheng.png'),
    quote: '微微，我一无所有，唯有一颗真心，敢为你倾尽所有。',
    time: '刚刚',
  },
  {
    id: 'story_001_char_004',
    name: '暗卫十五',
    isInteracted: true,
    avatarSource: require('../../assets/story/avatars/avatar_guard15.png'),
    quote: '卑职身份低微，不配言爱，……小姐，卑职是想说，我心悦你。',
    time: '30分钟前',
  },
  {
    id: 'char_001',
    name: '秦彻',
    isInteracted: false,
    avatarSource: require('../../assets/story/me/role_1.png'),
    quote: '你没发消息的这些时间里，我都在想你。',
    time: '1小时前',
  },
  {
    id: 'char_002',
    name: '林晓',
    isInteracted: false,
    avatarSource: require('../../assets/story/me/role_2.png'),
    quote: '站在悬崖边缘，墨色长发随风飘扬。',
    time: '2小时前',
  },
];

const moreEncounterCharacters: EncounterCharacterItem[] = [
  { id: 'char_003', avatarSource: require('../../assets/story/me/encounter_1.png') },
  { id: 'char_004', avatarSource: require('../../assets/story/me/encounter_2.png') },
  { id: 'char_005', avatarSource: require('../../assets/story/me/encounter_3.png') },
  { id: 'char_006', avatarSource: require('../../assets/story/me/encounter_4.png') },
  { id: 'char_007', avatarSource: require('../../assets/story/me/encounter_5.png') },
  { id: 'char_008', avatarSource: require('../../assets/story/me/encounter_6.png') },
  { id: 'char_009', avatarSource: require('../../assets/story/me/encounter_7.png') },
];

export default function MeScreen() {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const [tabIndex, setTabIndex] = useState<MeTab>(0);

  function openCharacter(item: MyCharacterItem) {
    if (item.isInteracted) {
      AppNavigator.toCharacterDetail(item.id);
      return;
    }
    Alert.alert('', t('me.characterLocked'));
  }

  function gotoEncounter() {
    AppNavigator.toEncounterTab();
  }

  return (
    <View style={styles.container}>
      <View style={[styles.profileHeader, { paddingTop: insets.top + 12 }]}>
        <View style={styles.profileAvatar}>
          <Text style={styles.profileAvatarEmoji}>🐸</Text>
        </View>
        <View style={styles.profileInfo}>
          <View style={styles.profileNameRow}>
            <Text style={styles.profileName}>{t('me.userName')}</Text>
            <Pressable onPress={() => Alert.alert('', t('me.editPending'))} hitSlop={10}>
              <Ionicons name="create-outline" size={18} color="#9ca3af" />
            </Pressable>
          </View>
          <Text style={styles.profileSignature}>{t('me.userSignature')}</Text>
        </View>
      </View>

      <View style={styles.mainPanel}>
        <View style={styles.tabBar}>
          {[t('me.tabHistory'), t('me.tabFavorites'), t('me.tabCharacters')].map((label, index) => {
            const selected = tabIndex === index;
            return (
              <Pressable
                key={label}
                onPress={() => setTabIndex(index as MeTab)}
                style={styles.tabItem}
              >
                <Text style={[styles.tabText, selected && styles.tabTextActive]}>{label}</Text>
                <View style={[styles.tabIndicator, selected && styles.tabIndicatorActive]} />
              </Pressable>
            );
          })}
        </View>

        {tabIndex === 0 ? (
          <ScrollView style={styles.list} contentContainerStyle={styles.listContent}>
            {readingHistory.length === 0 ? (
              <EmptyTab message={t('me.emptyHistory')} />
            ) : (
              readingHistory.map((item, index) => (
                <View key={item.id}>
                  <View style={styles.historyCard}>
                    <View style={styles.historyTitleRow}>
                      <Text style={styles.historyTitle} numberOfLines={2}>
                        {item.title}
                      </Text>
                      <Ionicons name="ellipsis-vertical" size={16} color="#9ca3af" />
                    </View>
                    <View style={styles.historyContentRow}>
                      <Image source={item.coverSource} style={styles.historyCover} resizeMode="cover" />
                      <Text style={styles.historyDescription} numberOfLines={5}>
                        {item.description}
                      </Text>
                    </View>
                  </View>
                  {index < readingHistory.length - 1 ? <View style={styles.historySeparator} /> : null}
                </View>
              ))
            )}
          </ScrollView>
        ) : null}

        {tabIndex === 1 ? <EmptyTab message={t('me.emptyFavorites')} /> : null}

        {tabIndex === 2 ? (
          <ScrollView style={styles.list} contentContainerStyle={styles.listContent}>
            {myCharacters.length === 0 ? (
              <EmptyTab message={t('me.emptyCharacters')} />
            ) : (
              <>
                {myCharacters.map((item) => (
                  <View key={item.id}>
                    <Pressable style={styles.characterCard} onPress={() => openCharacter(item)}>
                      <Image source={item.avatarSource} style={styles.characterAvatar} resizeMode="cover" />
                      <View style={styles.characterInfo}>
                        <Text style={styles.characterName}>{item.name}</Text>
                        <Text style={styles.characterQuote} numberOfLines={1}>
                          {item.quote}
                        </Text>
                        <Text style={styles.characterTime}>{item.time}</Text>
                      </View>
                      <Ionicons name="ellipsis-vertical" size={16} color="#9ca3af" />
                    </Pressable>
                    {item !== myCharacters[myCharacters.length - 1] ? (
                      <View style={styles.characterSeparator} />
                    ) : null}
                  </View>
                ))}
                <View style={styles.moreEncounterWrap}>
                  <View style={styles.moreEncounterTitleRow}>
                    <Text style={styles.moreEncounterTitle}>{t('me.moreEncounter')}</Text>
                    <Pressable style={styles.moreEncounterButton} onPress={gotoEncounter}>
                      <Text style={styles.moreEncounterButtonText}>{t('me.gotoEncounter')}</Text>
                    </Pressable>
                  </View>
                  <Text style={styles.moreEncounterDesc}>{t('me.moreEncounterDesc')}</Text>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.encounterList}>
                    {moreEncounterCharacters.map((item, index) => (
                      <Pressable
                        key={item.id}
                        style={[styles.encounterItem, index !== moreEncounterCharacters.length - 1 && styles.encounterItemGap]}
                        onPress={gotoEncounter}
                      >
                        <Image source={item.avatarSource} style={styles.encounterAvatar} resizeMode="cover" />
                      </Pressable>
                    ))}
                  </ScrollView>
                </View>
              </>
            )}
          </ScrollView>
        ) : null}
      </View>
    </View>
  );
}

function EmptyTab({ message }: { message: string }) {
  const { t } = useTranslation();

  return (
    <View style={styles.emptyWrap}>
      <Ionicons name="file-tray-outline" size={64} color="#9ca3af" />
      <Text style={styles.emptyText}>{message}</Text>
      <Pressable
        style={styles.testButton}
        onPress={() => Alert.alert('', t('me.quickTestPending'))}
      >
        <Ionicons name="git-branch-outline" size={16} color="#ffffff" />
        <Text style={styles.testButtonText}>{t('me.quickTest')}</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f9fafb',
  },
  profileHeader: {
    paddingHorizontal: 20,
    paddingBottom: 24,
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  profileAvatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    borderWidth: 4,
    borderColor: '#ffffff',
    backgroundColor: '#dfff00',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000000',
    shadowOpacity: 0.05,
    shadowRadius: 2,
    shadowOffset: { width: 0, height: 1 },
  },
  profileAvatarEmoji: {
    fontSize: 36,
  },
  profileInfo: {
    flex: 1,
    marginLeft: 16,
    paddingTop: 12,
  },
  profileNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  profileName: {
    color: '#111827',
    fontSize: 24,
    fontWeight: '700',
    lineHeight: 32,
    marginRight: 7,
  },
  profileSignature: {
    marginTop: 4,
    color: '#9ca3af',
    fontSize: 14,
    lineHeight: 19,
  },
  mainPanel: {
    flex: 1,
    backgroundColor: '#ffffff',
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    overflow: 'hidden',
  },
  tabBar: {
    paddingTop: 20,
    paddingRight: 20,
    paddingBottom: 10,
    paddingLeft: 27,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
    flexDirection: 'row',
  },
  tabItem: {
    marginRight: 26,
    alignItems: 'center',
  },
  tabText: {
    color: '#6b7280',
    fontSize: 16,
    fontWeight: '500',
  },
  tabTextActive: {
    color: '#111827',
    fontWeight: '600',
  },
  tabIndicator: {
    marginTop: 7.5,
    width: 16,
    height: 4,
    backgroundColor: 'transparent',
  },
  tabIndicatorActive: {
    backgroundColor: '#111827',
  },
  list: {
    flex: 1,
  },
  listContent: {
    paddingBottom: 20,
  },
  historyCard: {
    padding: 20,
  },
  historySeparator: {
    height: 1,
    marginHorizontal: 16,
    backgroundColor: '#f3f4f6',
  },
  historyTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  historyTitle: {
    flex: 1,
    color: '#111827',
    fontSize: 16,
    fontWeight: '700',
    lineHeight: 21,
  },
  historyContentRow: {
    marginTop: 12,
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  historyCover: {
    width: 80,
    height: 112,
    borderRadius: 6,
  },
  historyDescription: {
    flex: 1,
    marginLeft: 12,
    color: '#6b7280',
    fontSize: 14,
    lineHeight: 19,
  },
  emptyWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingBottom: 24,
  },
  emptyText: {
    marginTop: 16,
    color: '#6b7280',
    fontSize: 14,
  },
  testButton: {
    marginTop: 32,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#6750a4',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 10,
  },
  testButtonText: {
    marginLeft: 8,
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '600',
  },
  characterCard: {
    paddingHorizontal: 20,
    paddingVertical: 14,
    flexDirection: 'row',
    alignItems: 'center',
  },
  characterSeparator: {
    height: 1,
    marginLeft: 92,
    marginRight: 20,
    backgroundColor: '#f3f4f6',
  },
  characterAvatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
  },
  characterInfo: {
    flex: 1,
    marginLeft: 16,
  },
  characterName: {
    color: '#111827',
    fontSize: 16,
    fontWeight: '700',
    lineHeight: 21,
  },
  characterQuote: {
    marginTop: 4,
    color: '#6b7280',
    fontSize: 14,
    lineHeight: 19,
  },
  characterTime: {
    marginTop: 4,
    color: '#9ca3af',
    fontSize: 10,
    lineHeight: 14,
  },
  moreEncounterWrap: {
    margin: 20,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#f3f4f6',
    backgroundColor: '#ffffff',
    padding: 16,
    shadowColor: '#000000',
    shadowOpacity: 0.05,
    shadowRadius: 2,
    shadowOffset: { width: 0, height: 1 },
  },
  moreEncounterTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  moreEncounterTitle: {
    color: '#111827',
    fontSize: 16,
    fontWeight: '700',
  },
  moreEncounterButton: {
    backgroundColor: '#111827',
    borderRadius: 9999,
    paddingHorizontal: 12,
    paddingVertical: 4,
  },
  moreEncounterButtonText: {
    color: '#ffffff',
    fontSize: 10,
    lineHeight: 14,
  },
  moreEncounterDesc: {
    marginTop: 8,
    color: '#9ca3af',
    fontSize: 11,
    lineHeight: 15,
  },
  encounterList: {
    marginTop: 16,
  },
  encounterItem: {
    borderRadius: 6,
    overflow: 'hidden',
  },
  encounterItemGap: {
    marginRight: 8,
  },
  encounterAvatar: {
    width: 40,
    height: 48,
  },
});
