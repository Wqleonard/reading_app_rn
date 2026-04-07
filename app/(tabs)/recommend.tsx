import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { BlurView } from 'expo-blur';
import { useVideoPlayer, VideoView } from 'expo-video';
import { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';

const MAIN_VIDEO_SOURCE = require('../../assets/video/1_main.mp4');
const BLOCK_VIDEO_SOURCE = require('../../assets/video/1_block.mp4');
const DECISION_THRESHOLD_SECONDS = 2;
const END_EPSILON_SECONDS = 0.08;

type RecommendAssetKey = 'main' | 'block';

function isPlayerCompleted(player: ReturnType<typeof useVideoPlayer>): boolean {
  const duration = Number.isFinite(player.duration) ? player.duration : 0;
  if (duration <= 0) return false;
  return player.currentTime >= duration - END_EPSILON_SECONDS;
}

function isPlayerPlayingSafely(player: ReturnType<typeof useVideoPlayer>): boolean {
  try {
    return player.playing;
  } catch {
    return false;
  }
}

function GlassButton({
  label,
  onPress,
  enabled,
}: {
  label: string;
  onPress?: () => void;
  enabled: boolean;
}) {
  return (
    <Pressable
      disabled={!enabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.glassButtonOuter,
        !enabled && styles.glassButtonDisabled,
        pressed && enabled && styles.glassButtonPressed,
      ]}
    >
      <BlurView intensity={30} tint="light" style={styles.glassButtonBlur}>
        <View style={styles.glassButtonInner}>
          <Text style={[styles.glassButtonText, !enabled && styles.glassButtonTextDisabled]}>
            {label}
          </Text>
        </View>
      </BlurView>
    </Pressable>
  );
}

export default function RecommendScreen() {
  const { t } = useTranslation();
  const [ready, setReady] = useState(false);
  const [showDecisionButtons, setShowDecisionButtons] = useState(false);
  const [waitingForRestart, setWaitingForRestart] = useState(false);
  const [showCenterPlayOverlay, setShowCenterPlayOverlay] = useState(false);
  const [currentAsset, setCurrentAsset] = useState<RecommendAssetKey>('main');
  const [isSwitching, setIsSwitching] = useState(false);
  const pausedByTabSwitchRef = useRef(false);
  const pendingAutoplayAfterSwitchRef = useRef(false);

  const player = useVideoPlayer(MAIN_VIDEO_SOURCE, (videoPlayer) => {
    videoPlayer.loop = false;
    videoPlayer.muted = false;
    videoPlayer.volume = 1;
    videoPlayer.timeUpdateEventInterval = 0.2;
    videoPlayer.play();
  });

  const switchAsset = useCallback(
    async (asset: RecommendAssetKey, autoplay: boolean) => {
      if (isSwitching) return;
      setIsSwitching(true);
      try {
        const source = asset === 'main' ? MAIN_VIDEO_SOURCE : BLOCK_VIDEO_SOURCE;
        await player.replaceAsync(source);
        player.loop = false;
        player.muted = false;
        player.volume = 1;
        player.currentTime = 0;
        setCurrentAsset(asset);
        setShowDecisionButtons(false);
        setWaitingForRestart(false);
        setShowCenterPlayOverlay(false);
        setReady(true);
        pendingAutoplayAfterSwitchRef.current = autoplay;
        if (autoplay) {
          if (player.status === 'readyToPlay') {
            player.play();
            pendingAutoplayAfterSwitchRef.current = false;
          }
        } else {
          player.pause();
          pendingAutoplayAfterSwitchRef.current = false;
        }
      } finally {
        setIsSwitching(false);
      }
    },
    [isSwitching, player]
  );

  const togglePlayPause = useCallback(() => {
    if (waitingForRestart) return;
    if (player.playing) {
      player.pause();
      setShowCenterPlayOverlay(true);
      return;
    }
    if (isPlayerCompleted(player)) {
      player.currentTime = 0;
    }
    player.play();
    setShowCenterPlayOverlay(false);
  }, [player, waitingForRestart]);

  const playBlockVideo = useCallback(async () => {
    await switchAsset('block', true);
  }, [switchAsset]);

  const restartFlow = useCallback(async () => {
    await switchAsset('main', true);
  }, [switchAsset]);

  useFocusEffect(
    useCallback(() => {
      if (pausedByTabSwitchRef.current) {
        pausedByTabSwitchRef.current = false;
        if (!isPlayerCompleted(player)) {
          try {
            player.play();
          } catch {
            // Player may be invalid during native teardown.
          }
        }
      }
      return () => {
        if (isPlayerPlayingSafely(player)) {
          pausedByTabSwitchRef.current = true;
          try {
            player.pause();
          } catch {
            // Player may already be disposed when screen blurs.
          }
        }
      };
    }, [player])
  );

  useEffect(() => {
    const timer = setInterval(() => {
      const isReady = player.status === 'readyToPlay';
      if (isReady) {
        setReady(true);
        if (pendingAutoplayAfterSwitchRef.current) {
          player.play();
          pendingAutoplayAfterSwitchRef.current = false;
        }
      }
      if (!isReady) return;
      if (currentAsset === 'main') {
        const duration = Number.isFinite(player.duration) ? player.duration : 0;
        if (duration <= 0) return;
        const shouldShow = duration - player.currentTime <= DECISION_THRESHOLD_SECONDS;
        setShowDecisionButtons((prev) => (prev === shouldShow ? prev : shouldShow));
        return;
      }
      if (currentAsset === 'block' && !waitingForRestart && isPlayerCompleted(player)) {
        setWaitingForRestart(true);
        setShowDecisionButtons(false);
        setShowCenterPlayOverlay(false);
      }
    }, 200);
    return () => clearInterval(timer);
  }, [currentAsset, player, waitingForRestart]);

  if (!ready) {
    return (
      <View style={styles.loadingRoot}>
        <ActivityIndicator color="#ffffff" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Pressable style={styles.videoTapArea} onPress={togglePlayPause}>
        <VideoView player={player} style={styles.video} contentFit="cover" nativeControls={false} />
      </Pressable>
      {showCenterPlayOverlay ? (
        <View pointerEvents="none" style={styles.centerPlayOverlayWrap}>
          <View style={styles.centerPlayOverlay}>
            <Ionicons name="play" size={44} color="#ffffff" />
          </View>
        </View>
      ) : null}
      {currentAsset === 'main' && showDecisionButtons ? (
        <View style={styles.decisionButtonsWrap}>
          <GlassButton label={t('recommend.noBlock')} enabled={false} />
          <View style={styles.buttonGap} />
          <GlassButton label={t('recommend.block')} enabled onPress={playBlockVideo} />
        </View>
      ) : null}
      {currentAsset === 'block' && waitingForRestart ? (
        <View style={styles.restartButtonWrap}>
          <GlassButton label={t('recommend.restartFlow')} enabled onPress={restartFlow} />
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  loadingRoot: {
    flex: 1,
    backgroundColor: '#000000',
    alignItems: 'center',
    justifyContent: 'center',
  },
  container: {
    flex: 1,
    backgroundColor: '#000000',
  },
  videoTapArea: {
    ...StyleSheet.absoluteFillObject,
  },
  video: {
    ...StyleSheet.absoluteFillObject,
  },
  centerPlayOverlayWrap: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
  },
  centerPlayOverlay: {
    width: 76,
    height: 76,
    borderRadius: 38,
    backgroundColor: 'rgba(0,0,0,0.35)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  decisionButtonsWrap: {
    position: 'absolute',
    right: 16,
    bottom: 22,
    alignItems: 'center',
  },
  restartButtonWrap: {
    position: 'absolute',
    right: 16,
    bottom: 22,
  },
  buttonGap: {
    height: 10,
  },
  glassButtonOuter: {
    width: 104,
    borderRadius: 22,
    overflow: 'hidden',
  },
  glassButtonDisabled: {
    opacity: 0.9,
  },
  glassButtonPressed: {
    opacity: 0.75,
  },
  glassButtonBlur: {
    borderRadius: 22,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.35)',
    backgroundColor: 'rgba(255,255,255,0.2)',
  },
  glassButtonInner: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
  },
  glassButtonText: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '600',
  },
  glassButtonTextDisabled: {
    color: 'rgba(255,255,255,0.5)',
  },
});
