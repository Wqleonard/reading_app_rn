import { Ionicons } from '@expo/vector-icons';
import { Image as ExpoImage } from 'expo-image';
import { useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useMemo, useState } from 'react';
import Markdown from 'react-native-markdown-display';
import {
  Animated,
  Easing,
  type ImageSourcePropType,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import {
  Bubble,
  Composer,
  GiftedChat,
  InputToolbar,
  Send,
  SystemMessage,
  type BubbleProps,
  type ComposerProps,
  type IMessage,
  type InputToolbarProps,
  type SendProps,
  type SystemMessageProps,
} from 'react-native-gifted-chat';
import Svg, { Circle, Path } from 'react-native-svg';
import { useTranslation } from 'react-i18next';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { getCharacterDetailById } from '@/src/data/character/characterDetailService';
import { AppNavigator } from '@/src/navigation/appNavigator';
import { chatWithQwenStream, type ChatHistoryItem } from '@/src/network/qwenAiService';
import { chatRepository } from '@/src/storage/db/repositories/chatRepository';
import { resolveStoryImageSource } from '@/src/utils/storyImageResolver';

const USER_ID = 'user_001';

type ChatUiMessage = IMessage & {
  statusTag?: 'sending' | 'sent' | 'error';
  introCard?: boolean;
};

function formatCharacterTags(tags: string[] | undefined): string {
  if (!tags || tags.length === 0) return '';
  return tags.map((tag) => String(tag).trim()).filter(Boolean).join(' · ');
}

function toGiftedAvatar(source: ImageSourcePropType | null): string | number | undefined {
  if (!source) return undefined;
  if (typeof source === 'number') return source;
  if (typeof source === 'object' && source && 'uri' in source) {
    const uri = source.uri;
    return typeof uri === 'string' ? uri : undefined;
  }
  return undefined;
}

function buildAiHistory(messages: ChatUiMessage[], characterId: string): ChatHistoryItem[] {
  return [...messages]
    .filter((message) => !message.system && typeof message.text === 'string' && message.text.trim())
    .sort(
      (a, b) =>
        new Date(a.createdAt ?? 0).getTime() - new Date(b.createdAt ?? 0).getTime()
    )
    .map((message) => {
      const role =
        String(message.user._id) === USER_ID || String(message.user._id) === characterId
          ? String(message.user._id) === USER_ID
            ? 'user'
            : 'assistant'
          : null;
      if (!role) return null;
      return { role, content: String(message.text) } as ChatHistoryItem;
    })
    .filter((item): item is ChatHistoryItem => item !== null)
    .slice(-40);
}

function TypingDotsBubble() {
  const dotOpacities = useMemo(
    () => [new Animated.Value(0.35), new Animated.Value(0.35), new Animated.Value(0.35)],
    []
  );

  useEffect(() => {
    const animations = dotOpacities.map((opacity, index) =>
      Animated.loop(
        Animated.sequence([
          Animated.delay(index * 140),
          Animated.timing(opacity, {
            toValue: 1,
            duration: 320,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
          Animated.timing(opacity, {
            toValue: 0.35,
            duration: 320,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
          Animated.delay(220),
        ])
      )
    );
    animations.forEach((animation) => animation.start());
    return () => {
      animations.forEach((animation) => animation.stop());
    };
  }, [dotOpacities]);

  return (
    <View style={styles.typingBubble}>
      <View style={styles.typingDotsRow}>
        {dotOpacities.map((opacity, index) => (
          <Animated.View key={`typing_dot_${index}`} style={[styles.typingDot, { opacity }]} />
        ))}
      </View>
    </View>
  );
}

export default function CharacterChatScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const character = useMemo(() => (id ? getCharacterDetailById(id) : null), [id]);
  const [messages, setMessages] = useState<ChatUiMessage[]>([]);
  const [isHydrating, setIsHydrating] = useState(true);
  const [isGenerating, setIsGenerating] = useState(false);

  const characterAvatarSource = useMemo(
    () => resolveStoryImageSource(character?.avatar),
    [character?.avatar]
  );
  const characterAvatar = useMemo(
    () => toGiftedAvatar(characterAvatarSource),
    [characterAvatarSource]
  );
  const backgroundSource = useMemo(
    () => resolveStoryImageSource(character?.cover ?? character?.avatar),
    [character?.avatar, character?.cover]
  );

  useEffect(() => {
    let mounted = true;
    async function bootstrap() {
      if (!id || !character) {
        if (mounted) {
          setMessages([]);
          setIsHydrating(false);
        }
        return;
      }
      setIsHydrating(true);
      const rows = await chatRepository.listByCharacterId(id);
      if (!mounted) return;

      if (rows.length === 0) {
        const now = Date.now();
        const introId = `intro_${now}`;
        const welcomeId = `welcome_${now + 1}`;
        const tags = formatCharacterTags(character.tags);
        const introText = `${tags || t('chat.defaultIntroTags')}\n${
          character.quote || t('chat.defaultIntroDescription')
        }`;
        const welcomeText = t('chat.defaultWelcome', { name: character.name });

        await chatRepository.insert({
          characterId: id,
          messageId: introId,
          authorId: 'system',
          text: introText,
          createdAtMs: now,
          status: 'sent',
        });
        await chatRepository.insert({
          characterId: id,
          messageId: welcomeId,
          authorId: id,
          text: welcomeText,
          createdAtMs: now + 1,
          status: 'sent',
        });

        if (!mounted) return;
        setMessages([
          {
            _id: welcomeId,
            text: welcomeText,
            createdAt: new Date(now + 1),
            user: {
              _id: id,
              name: character.name,
              avatar: characterAvatar,
            },
            sent: true,
            received: true,
            statusTag: 'sent',
          },
          {
            _id: introId,
            text: introText,
            createdAt: new Date(now),
            user: { _id: 'system', name: 'system' },
            system: true,
            introCard: true,
            statusTag: 'sent',
          },
        ]);
        setIsHydrating(false);
        return;
      }

      const hydrated = rows
        .map((row) => {
          const isSystem = row.author_id === 'system';
          const isMe = row.author_id === USER_ID;
          return {
            _id: row.message_id,
            text: row.text,
            createdAt: new Date(row.created_at),
            user: {
              _id: row.author_id,
              name: isMe ? t('chat.me') : character.name,
              avatar: !isMe && !isSystem ? characterAvatar : undefined,
            },
            system: isSystem,
            introCard: isSystem && row.message_id.startsWith('intro_'),
            pending: row.status === 'sending',
            sent: row.status === 'sent',
            received: row.status === 'sent',
            statusTag: row.status,
          } as ChatUiMessage;
        })
        .sort(
          (a, b) =>
            new Date(b.createdAt ?? 0).getTime() - new Date(a.createdAt ?? 0).getTime()
        );

      setMessages(hydrated);
      setIsHydrating(false);
    }

    void bootstrap();
    return () => {
      mounted = false;
    };
  }, [character, characterAvatar, id, t]);

  const onSend = useCallback(
    async (newMessages: IMessage[] = []) => {
      if (!id || !character || newMessages.length === 0 || isGenerating) return;

      const base = newMessages[0];
      const text = String(base.text ?? '').trim();
      if (!text) return;
      const userMessageId = `user_${Date.now()}`;
      const now = Date.now();
      const aiMessageId = `ai_${Date.now()}_stream`;

      const userMessage: ChatUiMessage = {
        ...base,
        _id: userMessageId,
        text,
        createdAt: new Date(now),
        user: { _id: USER_ID, name: t('chat.me') },
        pending: true,
        statusTag: 'sending',
      };

      const historyBeforeSend = buildAiHistory(messages, id);
      setMessages((prev) => GiftedChat.append(prev, [userMessage]));
      await chatRepository.insert({
        characterId: id,
        messageId: userMessageId,
        authorId: USER_ID,
        text,
        createdAtMs: now,
        status: 'sending',
      });

      await chatRepository.updateStatus(userMessageId, 'sent');
      setMessages((prev) =>
        prev.map((msg) =>
          msg._id === userMessageId
            ? { ...msg, pending: false, sent: true, received: true, statusTag: 'sent' }
            : msg
        )
      );

      const aiPlaceholder: ChatUiMessage = {
        _id: aiMessageId,
        text: '',
        createdAt: new Date(now + 1),
        user: {
          _id: id,
          name: character.name,
          avatar: characterAvatar,
        },
        pending: true,
        statusTag: 'sending',
      };
      setMessages((prev) => GiftedChat.append(prev, [aiPlaceholder]));
      setIsGenerating(true);

      let fullText = '';
      try {
        for await (const delta of chatWithQwenStream({
          characterName: character.name,
          characterTags: formatCharacterTags(character.tags),
          characterDescription: character.quote,
          history: historyBeforeSend,
          userMessage: text,
        })) {
          fullText += delta;
          setMessages((prev) =>
            prev.map((msg) =>
              msg._id === aiMessageId ? { ...msg, text: fullText } : msg
            )
          );
        }

        const finalText = fullText.trim() || t('chat.emptyAiReplyFallback');
        await chatRepository.insert({
          characterId: id,
          messageId: aiMessageId,
          authorId: id,
          text: finalText,
          createdAtMs: now + 1,
          status: 'sent',
        });
        setMessages((prev) =>
          prev.map((msg) =>
            msg._id === aiMessageId
              ? {
                  ...msg,
                  text: finalText,
                  pending: false,
                  sent: true,
                  received: true,
                  statusTag: 'sent',
                }
              : msg
          )
        );
      } catch (error) {
        console.error('[chat][send] failed', {
          characterId: id,
          messageId: aiMessageId,
          error: error instanceof Error ? error.message : String(error),
        });
        const fallbackText = t('chat.aiReplyFailed');
        await chatRepository.insert({
          characterId: id,
          messageId: aiMessageId,
          authorId: id,
          text: fallbackText,
          createdAtMs: now + 1,
          status: 'error',
        });
        setMessages((prev) =>
          prev.map((msg) =>
            msg._id === aiMessageId
              ? {
                  ...msg,
                  text: fallbackText,
                  pending: false,
                  sent: false,
                  received: false,
                  statusTag: 'error',
                }
              : msg
          )
        );
      } finally {
        setIsGenerating(false);
      }
    },
    [character, characterAvatar, id, isGenerating, messages, t]
  );

  if (!character) {
    return (
      <View style={styles.notFound}>
        <Text style={styles.notFoundTitle}>{t('chat.notFoundTitle')}</Text>
        <Text style={styles.notFoundDesc}>{t('chat.notFoundDesc')}</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {backgroundSource ? (
        <ExpoImage source={backgroundSource} contentFit="cover" style={styles.bg} />
      ) : (
        <View style={styles.bgFallback} />
      )}

      <View
        style={[
          styles.header,
          {
            height: insets.top + 56,
            paddingTop: insets.top,
          },
        ]}
      >
        <Pressable style={styles.headerAction} onPress={() => AppNavigator.back()}>
          <Ionicons name="chevron-back" size={22} color="#111827" />
        </Pressable>
        <Text style={styles.headerTitle} numberOfLines={1}>
          {character.name}
        </Text>
        <View style={styles.headerRightSpacer} />
      </View>
      {isHydrating && messages.length === 0 ? (
        <View style={styles.loadingWrap}>
          <Text style={styles.loadingText}>{t('common.loading')}</Text>
        </View>
      ) : null}

      <GiftedChat
        messages={messages}
        onSend={onSend}
        user={{ _id: USER_ID, name: t('chat.me') }}
        isSendButtonAlwaysVisible
        isAvatarOnTop
        listProps={{ keyboardShouldPersistTaps: 'handled' }}
        renderBubble={(props: BubbleProps<IMessage>) => {
          const message = props.currentMessage as ChatUiMessage;
          const isSentByMe = String(message?.user?._id ?? '') === USER_ID;
          const isTypingPlaceholder =
            !isSentByMe &&
            message?.statusTag === 'sending' &&
            String(message?.text ?? '').trim().length === 0;
          const isError = message?.statusTag === 'error';
          if (isTypingPlaceholder) {
            return <TypingDotsBubble />;
          }
          return (
            <Bubble
              {...props}
              renderTicks={() => null}
              wrapperStyle={{
                left: [
                  styles.bubbleLeft,
                  isError ? styles.bubbleError : null,
                ],
                right: styles.bubbleRight,
              }}
              textStyle={{
                left: styles.bubbleTextLeft,
                right: styles.bubbleTextRight,
              }}
            />
          );
        }}
        renderMessageText={(props) => {
          const text = String(props.currentMessage?.text ?? '').trim();
          if (!text) return null;
          const isSentByMe =
            String((props.currentMessage as IMessage)?.user?._id ?? '') === USER_ID;
          return (
            <View style={styles.markdownWrap}>
              <Markdown style={isSentByMe ? markdownStylesRight : markdownStylesLeft}>
                {text}
              </Markdown>
            </View>
          );
        }}
        renderTime={() => null}
        renderDay={() => null}
        renderSystemMessage={(props: SystemMessageProps<IMessage>) => {
          const message = props.currentMessage as ChatUiMessage;
          if (!message?.introCard) {
            return <SystemMessage {...props} />;
          }
          const rawText = String(message.text ?? '');
          const lines = rawText.split('\n');
          const tagLine = lines[0] ?? '';
          const description = lines.slice(1).join('\n');
          return (
            <View style={styles.introCard}>
              <Text style={styles.introTags}>{tagLine}</Text>
              {description ? <Text style={styles.introDesc}>{description}</Text> : null}
            </View>
          );
        }}
        renderInputToolbar={(props: InputToolbarProps<IMessage>) => (
          <InputToolbar
            {...props}
            containerStyle={styles.inputToolbar}
            primaryStyle={styles.inputToolbarPrimary}
          />
        )}
        renderComposer={(props: ComposerProps) => (
          <Composer
            {...props}
            composerHeight={37}
            textInputProps={{
              ...props.textInputProps,
              style: [styles.composerInput, props.textInputProps?.style],
              placeholder: t('chat.inputPlaceholder'),
              placeholderTextColor: '#9ca3af',
            }}
          />
        )}
        renderSend={(props: SendProps<IMessage>) => (
          <Send {...props} containerStyle={styles.sendContainer}>
            <View style={styles.sendWrap}>
              {isGenerating ? (
                <Svg width={20} height={20} viewBox="0 0 20 20" fill="none">
                  <Circle cx="10" cy="10" r="8" stroke="#D1D5DB" strokeWidth="2" />
                  <Path
                    d="M18 10A8 8 0 0 1 10 18"
                    stroke="#111827"
                    strokeWidth="2"
                    strokeLinecap="round"
                  />
                </Svg>
              ) : (
                <Ionicons name="send" size={20} color="#111827" />
              )}
            </View>
          </Send>
        )}
        renderChatFooter={() => (
          <View style={styles.hintWrap}>
            <Text style={styles.hintText}>
              {t('chat.aiHintPrefix')}
              <Text style={styles.hintStrong}>{t('chat.aiHintStrong')}</Text>
            </Text>
          </View>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  bg: {
    ...StyleSheet.absoluteFillObject,
  },
  bgFallback: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#f3f4f6',
  },
  header: {
    paddingHorizontal: 8,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    zIndex: 2,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(17,24,39,0.06)',
  },
  headerAction: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerRightSpacer: {
    width: 40,
    height: 40,
  },
  headerTitle: {
    flex: 1,
    textAlign: 'center',
    marginHorizontal: 8,
    color: '#111827',
    fontSize: 16,
    fontWeight: '700',
  },
  bubbleLeft: {
    backgroundColor: 'rgba(255,255,255,0.96)',
    borderTopLeftRadius: 6,
    borderTopRightRadius: 16,
    borderBottomLeftRadius: 16,
    borderBottomRightRadius: 16,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  bubbleRight: {
    backgroundColor: '#1f2937',
    borderTopLeftRadius: 16,
    borderTopRightRadius: 6,
    borderBottomLeftRadius: 16,
    borderBottomRightRadius: 16,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  bubbleError: {
    backgroundColor: '#fef2f2',
    borderWidth: 1,
    borderColor: '#fecaca',
  },
  typingBubble: {
    alignSelf: 'flex-start',
    minWidth: 56,
    height: 36,
    borderRadius: 16,
    borderTopLeftRadius: 4,
    backgroundColor: 'rgba(255,255,255,0.96)',
    paddingHorizontal: 14,
    justifyContent: 'center',
  },
  typingDotsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  typingDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#9ca3af',
  },
  bubbleTextLeft: {
    color: '#1f2937',
    fontSize: 14,
    lineHeight: 20,
  },
  bubbleTextRight: {
    color: '#ffffff',
    fontSize: 14,
    lineHeight: 20,
  },
  markdownWrap: {
    paddingHorizontal: 8,
  },
  introCard: {
    marginVertical: 8,
    marginHorizontal: 16,
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.85)',
  },
  introTags: {
    color: '#111827',
    fontSize: 12,
    fontWeight: '700',
    lineHeight: 18,
  },
  introDesc: {
    marginTop: 4,
    color: '#4b5563',
    fontSize: 12,
    lineHeight: 18,
  },
  inputToolbar: {
    borderTopWidth: 0,
    backgroundColor: '#ffffff',
    minHeight: 70,
    paddingHorizontal: 16,
    paddingTop: 20,
    paddingBottom: 20,
  },
  inputToolbarPrimary: {
    alignItems: 'center',
  },
  composerInput: {
    height: 37,
    borderRadius: 999,
    paddingHorizontal: 16,
    paddingVertical: 8,
    marginLeft: 0,
    backgroundColor: '#f3f4f6',
    color: '#1f2937',
    fontSize: 14,
    lineHeight: 20,
    textAlignVertical: 'center',
  },
  sendContainer: {
    height: 37,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 12,
    marginRight: 0,
  },
  sendWrap: {
    width: 24,
    height: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  hintWrap: {
    height: 32,
    marginHorizontal: 28,
    marginBottom: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  hintText: {
    color: '#9ca3af',
    fontSize: 10,
    lineHeight: 14,
  },
  hintStrong: {
    fontWeight: '700',
  },
  loadingWrap: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
  },
  loadingText: {
    color: '#6b7280',
    fontSize: 12,
  },
  notFound: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#ffffff',
  },
  notFoundTitle: {
    color: '#111827',
    fontSize: 18,
    fontWeight: '700',
  },
  notFoundDesc: {
    marginTop: 8,
    color: '#6b7280',
    fontSize: 14,
  },
});

const markdownStylesLeft = {
  body: {
    marginTop: 0,
    marginBottom: 0,
    color: '#1f2937',
    fontSize: 14,
    lineHeight: 20,
  },
  strong: {
    fontWeight: '700' as const,
  },
  code_inline: {
    backgroundColor: '#e5e7eb',
    borderRadius: 4,
    paddingHorizontal: 4,
  },
  code_block: {
    backgroundColor: '#111827',
    color: '#ffffff',
    borderRadius: 8,
    padding: 10,
  },
  fence: {
    backgroundColor: '#111827',
    color: '#ffffff',
    borderRadius: 8,
    padding: 10,
  },
  link: {
    color: '#2563eb',
    textDecorationLine: 'underline' as const,
  },
};

const markdownStylesRight = {
  body: {
    marginTop: 0,
    marginBottom: 0,
    color: '#ffffff',
    fontSize: 14,
    lineHeight: 20,
  },
  strong: {
    fontWeight: '700' as const,
    color: '#ffffff',
  },
  code_inline: {
    backgroundColor: 'rgba(255,255,255,0.2)',
    color: '#ffffff',
    borderRadius: 4,
    paddingHorizontal: 4,
  },
  code_block: {
    backgroundColor: 'rgba(0,0,0,0.35)',
    color: '#ffffff',
    borderRadius: 8,
    padding: 10,
  },
  fence: {
    backgroundColor: 'rgba(0,0,0,0.35)',
    color: '#ffffff',
    borderRadius: 8,
    padding: 10,
  },
  link: {
    color: '#dbeafe',
    textDecorationLine: 'underline' as const,
  },
};
