import { StyleSheet, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';

export default function RecommendScreen() {
  const { t } = useTranslation();

  return (
    <View style={styles.container}>
      <Text style={styles.title}>{t('tabs.recommend')}</Text>
      <Text style={styles.subtitle}>Phase 1 scaffold ready</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#111',
  },
  title: {
    color: '#fff',
    fontSize: 24,
    fontWeight: '700',
  },
  subtitle: {
    color: '#999',
    marginTop: 12,
  },
});
