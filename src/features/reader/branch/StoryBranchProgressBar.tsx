import { Ionicons } from '@expo/vector-icons';
import { StyleSheet, Text, View } from 'react-native';

type StoryBranchProgressBarProps = {
  percentage: number;
  barWidth?: number;
};

export default function StoryBranchProgressBar(props: StoryBranchProgressBarProps) {
  const { percentage, barWidth = 115 } = props;
  const safePercentage = Math.max(0, Math.min(100, percentage));
  const checkpoints = [0.24, 0.48, 0.72];

  return (
    <View style={styles.root}>
      <Text style={styles.percentText}>{safePercentage}%</Text>
      <View style={{ width: 12 }} />
      <View style={[styles.barWrap, { width: barWidth }]}>
        <View style={styles.track} />
        <View style={[styles.fill, { width: `${safePercentage}%` }]} />
        {checkpoints.map((position) => (
          <View key={position} style={[styles.checkpointWrap, { left: `${position * 100}%` }]}>
            <View style={styles.checkpoint}>
              <Ionicons name="checkmark" size={8} color="#D4AF37" />
            </View>
          </View>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  percentText: {
    color: '#111827',
    fontSize: 12,
    fontWeight: '600',
  },
  barWrap: {
    height: 16,
    justifyContent: 'center',
    position: 'relative',
  },
  track: {
    height: 5,
    borderRadius: 2.5,
    backgroundColor: '#F3F4F6',
  },
  fill: {
    position: 'absolute',
    left: 0,
    top: 5.5,
    height: 5,
    borderRadius: 2.5,
    backgroundColor: '#9CA3AF',
  },
  checkpointWrap: {
    position: 'absolute',
    top: 3,
    marginLeft: -5,
  },
  checkpoint: {
    width: 10,
    height: 10,
    borderRadius: 5,
    borderWidth: 0.33,
    borderColor: '#D4AF37',
    backgroundColor: '#3D2B1F',
    alignItems: 'center',
    justifyContent: 'center',
  },
});
