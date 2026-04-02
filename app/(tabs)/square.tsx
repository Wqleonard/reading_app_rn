import { Link } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';

export default function SquareScreen() {
  const { t } = useTranslation();

  return (
    <View style={styles.container}>
      <Text style={styles.title}>{t('tabs.square')}</Text>
      <Link href="/story/story_001" style={styles.link}>
        Go Story Detail
      </Link>
      <Link href="/reader/story_001" style={styles.link}>
        Go Reader
      </Link>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
  },
  link: {
    marginTop: 10,
    color: '#2563eb',
  },
});
