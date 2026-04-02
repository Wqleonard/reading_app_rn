import { useLocalSearchParams } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';

export default function ReaderScreen() {
  const { storyId } = useLocalSearchParams<{ storyId: string }>();

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Reader</Text>
      <Text style={styles.subtitle}>storyId: {storyId}</Text>
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
  subtitle: {
    marginTop: 10,
    color: '#666',
  },
});
