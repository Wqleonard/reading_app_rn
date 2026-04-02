import { Link } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { useAppStore } from '@/src/state/appStore';

export default function MeScreen() {
  const { t } = useTranslation();
  const language = useAppStore((state) => state.language);
  const setLanguage = useAppStore((state) => state.setLanguage);

  return (
    <View style={styles.container}>
      <Text style={styles.title}>{t('tabs.me')}</Text>
      <Text style={styles.subtitle}>Lang: {language}</Text>
      <View style={styles.row}>
        <Pressable style={styles.button} onPress={() => setLanguage('zh-CN')}>
          <Text style={styles.buttonText}>中文</Text>
        </Pressable>
        <Pressable style={styles.button} onPress={() => setLanguage('en-US')}>
          <Text style={styles.buttonText}>English</Text>
        </Pressable>
      </View>
      <Link href="/character/story_001_char_002" style={styles.link}>
        Go Character Detail
      </Link>
      <Link href="/chat/story_001_char_002" style={styles.link}>
        Go Character Chat
      </Link>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
  },
  subtitle: {
    color: '#666',
  },
  row: {
    flexDirection: 'row',
    gap: 10,
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
  link: {
    marginTop: 6,
    color: '#2563eb',
  },
});
