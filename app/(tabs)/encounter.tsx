import { StyleSheet, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';

export default function EncounterScreen() {
  const { t } = useTranslation();

  return (
    <View style={styles.container}>
      <Text style={styles.title}>{t('tabs.encounter')}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#090909',
  },
  title: {
    color: '#fff',
    fontSize: 24,
    fontWeight: '700',
  },
});
