import { useEffect, useRef, useState } from 'react';
import { Animated, Easing, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import {
  subscribeGlobalNotice,
  type NoticePayload,
} from '@/src/shared/notice/noticeCenter';

export default function GlobalNoticeHost() {
  const insets = useSafeAreaInsets();
  const [notice, setNotice] = useState<NoticePayload | null>(null);
  const opacity = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(-8)).current;
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    function clearTimer() {
      if (!timerRef.current) return;
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }

    function animateOut(onEnd?: () => void) {
      Animated.parallel([
        Animated.timing(opacity, {
          toValue: 0,
          duration: 160,
          easing: Easing.out(Easing.quad),
          useNativeDriver: true,
        }),
        Animated.timing(translateY, {
          toValue: -8,
          duration: 160,
          easing: Easing.out(Easing.quad),
          useNativeDriver: true,
        }),
      ]).start(() => {
        onEnd?.();
      });
    }

    const unsubscribe = subscribeGlobalNotice((payload) => {
      clearTimer();
      if (notice) {
        animateOut(() => {
          setNotice(payload);
          opacity.setValue(0);
          translateY.setValue(-8);
          Animated.parallel([
            Animated.timing(opacity, {
              toValue: 1,
              duration: 180,
              easing: Easing.out(Easing.quad),
              useNativeDriver: true,
            }),
            Animated.timing(translateY, {
              toValue: 0,
              duration: 180,
              easing: Easing.out(Easing.quad),
              useNativeDriver: true,
            }),
          ]).start();
          timerRef.current = setTimeout(() => {
            animateOut(() => setNotice(null));
          }, payload.durationMs);
        });
        return;
      }

      setNotice(payload);
      opacity.setValue(0);
      translateY.setValue(-8);
      Animated.parallel([
        Animated.timing(opacity, {
          toValue: 1,
          duration: 180,
          easing: Easing.out(Easing.quad),
          useNativeDriver: true,
        }),
        Animated.timing(translateY, {
          toValue: 0,
          duration: 180,
          easing: Easing.out(Easing.quad),
          useNativeDriver: true,
        }),
      ]).start();
      timerRef.current = setTimeout(() => {
        animateOut(() => setNotice(null));
      }, payload.durationMs);
    });

    return () => {
      clearTimer();
      unsubscribe();
    };
  }, [notice, opacity, translateY]);

  if (!notice) return null;

  return (
    <View
      pointerEvents="none"
      style={[
        styles.root,
        {
          top: insets.top + 10,
        },
      ]}
    >
      <Animated.View
        style={[
          styles.notice,
          {
            opacity,
            transform: [{ translateY }],
          },
        ]}
      >
        <Text style={styles.noticeText}>{notice.message}</Text>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    position: 'absolute',
    left: 0,
    right: 0,
    alignItems: 'center',
    zIndex: 999,
  },
  notice: {
    maxWidth: '88%',
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 8,
    backgroundColor: 'rgba(17,24,39,0.92)',
  },
  noticeText: {
    color: '#ffffff',
    fontSize: 13,
    lineHeight: 18,
  },
});
