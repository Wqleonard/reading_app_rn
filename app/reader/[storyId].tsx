import { useEffect, useMemo, useRef, useState } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import {
  Alert,
  Animated,
  Modal,
  Image,
  type ImageSourcePropType,
  PanResponder,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { getStoryById } from '@/src/data/story/storyService';
import type { StoryChoice, StoryNode, StoryWithNodes } from '@/src/data/story/types';
import StoryBranchMap, {
  getApproxBranchColumnWidth,
} from '@/src/features/reader/branch/StoryBranchMap';
import StoryBranchProgressBar from '@/src/features/reader/branch/StoryBranchProgressBar';
import {
  buildBranchColumns,
  buildBranchEdges,
} from '@/src/features/reader/branch/storyBranchBuilder';
import { resolveStoryImageSource } from '@/app/storyImageResolver';
import { readingProgressRepository } from '@/src/storage/db/repositories/readingProgressRepository';
import { kv } from '@/src/storage/kv/kv';

type ChoiceRecord = {
  nodeId: string;
  choiceId: string;
  timestamp: number;
};

type ReaderProgressState = {
  currentNodeId: string;
  choiceHistory: ChoiceRecord[];
  visitedNodeIds: string[];
};

type ReaderSettings = {
  fontSize: number;
  lineHeight: number;
  horizontalPadding: number;
  backgroundColor: string;
  backgroundImageUrl: string | null;
  collectedHighlightImages: string[];
  brightness: number;
  mainlineOnly: boolean;
};

const READER_SETTINGS_KEY = 'reader_settings_v1';
const PANEL_CHAR_1_SOURCE = require('../../assets/story/reader_panel/panel_char_1.png');
const PANEL_CHAR_2_SOURCE = require('../../assets/story/reader_panel/panel_char_2.png');
const PANEL_LOCKED_SOURCE = require('../../assets/story/reader_panel/panel_locked_bg.png');
const CHARACTER_AVATAR_SOURCE_BY_ID: Record<string, ImageSourcePropType> = {
  story_001_char_002: require('../../assets/story/avatars/avatar_zhaobingru.png'),
  story_001_char_003: require('../../assets/story/avatars/avatar_zhaobingcheng.png'),
  story_001_char_004: require('../../assets/story/avatars/avatar_guard15.png'),
};

const DEFAULT_READER_SETTINGS: ReaderSettings = {
  fontSize: 18,
  lineHeight: 1.85,
  horizontalPadding: 20,
  backgroundColor: '#ffffff',
  backgroundImageUrl: null,
  collectedHighlightImages: [],
  brightness: 1,
  mainlineOnly: false,
};

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function hexToRgb(hex: string): { r: number; g: number; b: number } {
  const clean = hex.replace('#', '').trim();
  if (clean.length === 3) {
    const r = parseInt(`${clean[0]}${clean[0]}`, 16);
    const g = parseInt(`${clean[1]}${clean[1]}`, 16);
    const b = parseInt(`${clean[2]}${clean[2]}`, 16);
    return { r, g, b };
  }
  const normalized = clean.padEnd(6, '0').slice(0, 6);
  const r = parseInt(normalized.slice(0, 2), 16);
  const g = parseInt(normalized.slice(2, 4), 16);
  const b = parseInt(normalized.slice(4, 6), 16);
  return { r, g, b };
}

function withAlpha(hex: string, alpha: number): string {
  const { r, g, b } = hexToRgb(hex);
  return `rgba(${r}, ${g}, ${b}, ${clamp(alpha, 0, 1)})`;
}

function getReadableTextColor(backgroundColor: string): string {
  const { r, g, b } = hexToRgb(backgroundColor);
  const toLinear = (channel: number) => {
    const c = channel / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  };
  const luminance = 0.2126 * toLinear(r) + 0.7152 * toLinear(g) + 0.0722 * toLinear(b);
  return luminance > 0.5 ? '#111827' : '#ffffff';
}

function isEvenHash(text: string): boolean {
  let hash = 0;
  for (let i = 0; i < text.length; i += 1) {
    hash = (hash * 31 + text.charCodeAt(i)) | 0;
  }
  return Math.abs(hash) % 2 === 0;
}

type TrackSliderProps = {
  value: number;
  min: number;
  max: number;
  onChange: (value: number) => void;
  leftLabel: string;
  rightLabel: string;
};

function TrackSlider(props: TrackSliderProps) {
  const { value, min, max, onChange, leftLabel, rightLabel } = props;
  const [trackWidth, setTrackWidth] = useState(0);
  const thumbX = useRef(new Animated.Value(0)).current;
  const draftValueRef = useRef(value);
  const thumbStartXRef = useRef(0);

  function getThumbLeftByValue(targetValue: number, width: number): number {
    const ratio = clamp((targetValue - min) / (max - min), 0, 1);
    return clamp(ratio * (width - 20), 0, width - 20);
  }

  useEffect(() => {
    draftValueRef.current = value;
    if (trackWidth > 0) {
      thumbX.setValue(getThumbLeftByValue(value, trackWidth));
    }
  }, [value, trackWidth, thumbX]);

  const panResponder = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => true,
        onMoveShouldSetPanResponder: () => true,
        onPanResponderGrant: (event) => {
          if (trackWidth <= 0) return;
          const currentLeft = getThumbLeftByValue(draftValueRef.current, trackWidth);
          thumbStartXRef.current = currentLeft;
          // Keep current position on touch-down to avoid first-frame jump artifacts.
          thumbX.setValue(currentLeft);
        },
        onPanResponderMove: (_event, gestureState) => {
          if (trackWidth <= 0) return;
          const nextLeft = clamp(
            thumbStartXRef.current + gestureState.dx,
            0,
            Math.max(0, trackWidth - 20)
          );
          thumbX.setValue(nextLeft);
          const t = nextLeft / Math.max(1, trackWidth - 20);
          draftValueRef.current = min + (max - min) * t;
        },
        onPanResponderRelease: (event, gestureState) => {
          if (trackWidth <= 0) return;
          const isTap =
            Math.abs(gestureState.dx) < 2 && Math.abs(gestureState.dy) < 2;
          if (isTap) {
            const touchX = clamp(event.nativeEvent.locationX, 0, trackWidth);
            const tappedValue = min + (max - min) * (touchX / Math.max(1, trackWidth));
            draftValueRef.current = tappedValue;
            thumbX.setValue(getThumbLeftByValue(tappedValue, trackWidth));
            onChange(tappedValue);
            return;
          }
          onChange(draftValueRef.current);
        },
        onPanResponderTerminate: () => onChange(draftValueRef.current),
      }),
    [max, min, onChange, thumbX, trackWidth]
  );

  return (
    <View style={styles.sliderRow}>
      <Text style={styles.sliderEdgeLabel}>{leftLabel}</Text>
      <View
        style={styles.sliderTrackWrap}
        onLayout={(event) => setTrackWidth(event.nativeEvent.layout.width)}
        {...panResponder.panHandlers}
      >
        <View style={styles.sliderTrack} />
        <Animated.View
          style={[
            styles.sliderThumb,
            {
              left: thumbX,
            },
          ]}
        />
      </View>
      <Text style={styles.sliderEdgeLabel}>{rightLabel}</Text>
    </View>
  );
}

function getNodeMap(story: StoryWithNodes): Map<string, StoryNode> {
  return new Map(story.nodes.map((node) => [node.id, node]));
}

function getFullContent(content: string): string {
  return content.trim();
}

function parseChoiceHistory(raw: string | null): ChoiceRecord[] {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    const records: ChoiceRecord[] = [];
    for (const item of parsed) {
      if (!item) continue;
      if (typeof item === 'string') {
        records.push({ nodeId: '', choiceId: item, timestamp: Date.now() });
        continue;
      }
      if (typeof item === 'object') {
        const row = item as Record<string, unknown>;
        const nodeId = String(row.node_id ?? row.nodeId ?? '');
        const choiceId = String(row.choice_id ?? row.choiceId ?? '');
        if (!choiceId) continue;
        records.push({
          nodeId,
          choiceId,
          timestamp: Number(row.timestamp ?? Date.now()),
        });
      }
    }
    return records;
  } catch {
    return [];
  }
}

function parseVisitedNodeIds(raw: string | null): string[] {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed.map((item) => String(item));
  } catch {
    return [];
  }
}

function normalizeReaderSettings(
  raw: Partial<ReaderSettings> | null | undefined
): ReaderSettings {
  return {
    fontSize:
      typeof raw?.fontSize === 'number'
        ? Math.min(28, Math.max(14, raw.fontSize))
        : DEFAULT_READER_SETTINGS.fontSize,
    lineHeight:
      typeof raw?.lineHeight === 'number'
        ? Math.min(2.4, Math.max(1.4, raw.lineHeight))
        : DEFAULT_READER_SETTINGS.lineHeight,
    horizontalPadding:
      typeof raw?.horizontalPadding === 'number'
        ? Math.min(36, Math.max(12, raw.horizontalPadding))
        : DEFAULT_READER_SETTINGS.horizontalPadding,
    backgroundColor:
      typeof raw?.backgroundColor === 'string'
        ? raw.backgroundColor
        : DEFAULT_READER_SETTINGS.backgroundColor,
    backgroundImageUrl:
      typeof raw?.backgroundImageUrl === 'string' && raw.backgroundImageUrl.trim().length > 0
        ? raw.backgroundImageUrl
        : null,
    collectedHighlightImages: Array.isArray(raw?.collectedHighlightImages)
      ? raw.collectedHighlightImages
          .map((item) => String(item))
          .filter((item) => item.trim().length > 0)
      : DEFAULT_READER_SETTINGS.collectedHighlightImages,
    brightness:
      typeof raw?.brightness === 'number'
        ? Math.min(1, Math.max(0.35, raw.brightness))
        : DEFAULT_READER_SETTINGS.brightness,
    mainlineOnly:
      typeof raw?.mainlineOnly === 'boolean'
        ? raw.mainlineOnly
        : DEFAULT_READER_SETTINGS.mainlineOnly,
  };
}

function findChoiceRecord(
  choiceHistory: ChoiceRecord[],
  nodeId: string,
  fromTail = false
): ChoiceRecord | null {
  if (fromTail) {
    for (let i = choiceHistory.length - 1; i >= 0; i -= 1) {
      if (choiceHistory[i].nodeId === nodeId) return choiceHistory[i];
    }
    return null;
  }
  for (const record of choiceHistory) {
    if (record.nodeId === nodeId) return record;
  }
  return null;
}

function resolveChoice(
  node: StoryNode,
  choiceRecord: ChoiceRecord | null
): StoryChoice | null {
  if (!node.choices || node.choices.length === 0) return null;
  if (!choiceRecord?.choiceId) return null;
  return node.choices.find((item) => item.id === choiceRecord.choiceId) ?? null;
}

function chooseMainline(node: StoryNode): StoryChoice | null {
  if (!node.choices || node.choices.length === 0) return null;
  return node.choices.find((item) => item.isMainline) ?? node.choices[0];
}

function buildContentFromProgress(
  story: StoryWithNodes,
  nodeMap: Map<string, StoryNode>,
  baseProgress: ReaderProgressState,
  pureMode: boolean
): { displayedNodeIds: string[]; progress: ReaderProgressState } {
  const displayedNodeIds: string[] = [];
  const visitedNodeSet = new Set(baseProgress.visitedNodeIds);
  let currentNodeIdInProgress = baseProgress.currentNodeId;

  let cursorId: string | null = story.startNodeId;
  const visitedInThisSession = new Set<string>();

  while (cursorId && !visitedInThisSession.has(cursorId)) {
    const node = nodeMap.get(cursorId);
    if (!node) break;

    visitedInThisSession.add(cursorId);
    displayedNodeIds.push(node.id);
    visitedNodeSet.add(node.id);

    if (node.id === currentNodeIdInProgress) {
      cursorId = node.nextNodeId ?? null;
      if (node.type === 'choice') {
        const record = findChoiceRecord(baseProgress.choiceHistory, node.id, true);
        const selectedChoice = resolveChoice(node, record);
        if (selectedChoice) {
          const filtered = displayedNodeIds.filter((id) => id !== node.id);
          displayedNodeIds.splice(0, displayedNodeIds.length, ...filtered);
          cursorId = selectedChoice.targetNodeId;
          continue;
        }
        if (pureMode) {
          const mainlineChoice = chooseMainline(node);
          if (mainlineChoice) {
            const filtered = displayedNodeIds.filter((id) => id !== node.id);
            displayedNodeIds.splice(0, displayedNodeIds.length, ...filtered);
            currentNodeIdInProgress = mainlineChoice.targetNodeId;
            visitedNodeSet.add(mainlineChoice.targetNodeId);
            cursorId = mainlineChoice.targetNodeId;
            continue;
          }
        }
        break;
      }
      continue;
    }

    if (node.type === 'choice') {
      const record = findChoiceRecord(baseProgress.choiceHistory, node.id);
      const selectedChoice = resolveChoice(node, record);
      if (selectedChoice) {
        const filtered = displayedNodeIds.filter((id) => id !== node.id);
        displayedNodeIds.splice(0, displayedNodeIds.length, ...filtered);
        cursorId = selectedChoice.targetNodeId;
        continue;
      }

      if (pureMode) {
        const mainlineChoice = chooseMainline(node);
        if (mainlineChoice) {
          const filtered = displayedNodeIds.filter((id) => id !== node.id);
          displayedNodeIds.splice(0, displayedNodeIds.length, ...filtered);
          currentNodeIdInProgress = mainlineChoice.targetNodeId;
          visitedNodeSet.add(mainlineChoice.targetNodeId);
          cursorId = mainlineChoice.targetNodeId;
          continue;
        }
      }
      break;
    }

    if (node.type === 'ending') break;
    cursorId = node.nextNodeId ?? null;
  }

  return {
    displayedNodeIds,
    progress: {
      currentNodeId: currentNodeIdInProgress,
      choiceHistory: baseProgress.choiceHistory,
      visitedNodeIds: Array.from(visitedNodeSet),
    },
  };
}

function loadNextNodes(
  nodeMap: Map<string, StoryNode>,
  displayedNodeIds: string[],
  progress: ReaderProgressState,
  startNodeId: string,
  pureMode: boolean
): { displayedNodeIds: string[]; progress: ReaderProgressState } {
  const nextDisplayed = [...displayedNodeIds];
  const visitedNodeSet = new Set(progress.visitedNodeIds);
  let currentNodeIdInProgress = progress.currentNodeId;

  let cursorId: string | null = startNodeId;
  const visitedInThisSession = new Set<string>();

  while (cursorId && !visitedInThisSession.has(cursorId)) {
    const node = nodeMap.get(cursorId);
    if (!node) break;

    visitedInThisSession.add(cursorId);
    nextDisplayed.push(node.id);
    visitedNodeSet.add(node.id);

    if (node.type === 'choice') {
      if (pureMode) {
        const mainlineChoice = chooseMainline(node);
        if (mainlineChoice) {
          const filtered = nextDisplayed.filter((id) => id !== node.id);
          nextDisplayed.splice(0, nextDisplayed.length, ...filtered);
          currentNodeIdInProgress = mainlineChoice.targetNodeId;
          visitedNodeSet.add(mainlineChoice.targetNodeId);
          cursorId = mainlineChoice.targetNodeId;
          continue;
        }
      }
      break;
    }

    if (node.type === 'ending') break;
    cursorId = node.nextNodeId ?? null;
  }

  return {
    displayedNodeIds: nextDisplayed,
    progress: {
      ...progress,
      currentNodeId: currentNodeIdInProgress,
      visitedNodeIds: Array.from(visitedNodeSet),
    },
  };
}

export default function ReaderScreen() {
  const { storyId, mode } = useLocalSearchParams<{
    storyId: string;
    mode?: 'interactive' | 'pure';
  }>();
  const router = useRouter();
  const routePureMode = mode === 'pure';
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const story = storyId ? getStoryById(storyId) : null;
  const nodeMap = useMemo(
    () => (story ? getNodeMap(story) : new Map<string, StoryNode>()),
    [story]
  );

  const [hydrated, setHydrated] = useState(false);
  const [restoredFromProgress, setRestoredFromProgress] = useState(false);
  const [progressPercentage, setProgressPercentage] = useState(0);
  const [displayedNodeIds, setDisplayedNodeIds] = useState<string[]>([]);
  const [progressState, setProgressState] = useState<ReaderProgressState | null>(
    null
  );
  const [settings, setSettings] = useState<ReaderSettings>(DEFAULT_READER_SETTINGS);
  const [showSettings, setShowSettings] = useState(false);
  const [showToolbar, setShowToolbar] = useState(false);
  const [activePanel, setActivePanel] = useState<'settings' | 'branch' | 'characters' | null>(
    null
  );
  const branchScrollRef = useRef<ScrollView>(null);
  const [showDebug, setShowDebug] = useState(false);
  const [iconicModalNodeId, setIconicModalNodeId] = useState<string | null>(null);
  const tapStartRef = useRef<{ x: number; y: number; ts: number } | null>(null);
  const [rawProgressDebug, setRawProgressDebug] = useState<{
    currentNodeId: string | null;
    choiceHistoryRaw: string | null;
    visitedNodeIdsRaw: string | null;
  }>({
    currentNodeId: null,
    choiceHistoryRaw: null,
    visitedNodeIdsRaw: null,
  });

  const currentNode = useMemo(() => {
    if (!progressState) return null;
    return nodeMap.get(progressState.currentNodeId) ?? null;
  }, [nodeMap, progressState]);
  const visitedNodeSet = useMemo(
    () => new Set(progressState?.visitedNodeIds ?? []),
    [progressState?.visitedNodeIds]
  );
  const branchColumns = useMemo(() => {
    if (!story || !progressState) return [];
    return buildBranchColumns(story, visitedNodeSet);
  }, [progressState, story, visitedNodeSet]);
  const branchEdges = useMemo(() => {
    if (!story) return [];
    return buildBranchEdges(story);
  }, [story]);
  const currentNodeColumnIndex = useMemo(() => {
    if (!progressState) return -1;
    return branchColumns.findIndex((column) =>
      column.some((item) => item.id === progressState.currentNodeId)
    );
  }, [branchColumns, progressState]);
  const characterCards = useMemo(() => {
    if (!story) return [];
    const unlocked = story.mainCharacters
      .filter((item) => item.isInteracted)
      .slice(0, 6)
      .map((item, index) => ({
        fallbackSource: isEvenHash(item.id) ? PANEL_CHAR_1_SOURCE : PANEL_CHAR_2_SOURCE,
        id: item.id,
        isPrimary: index === 0,
        name: item.name,
        imageSource:
          CHARACTER_AVATAR_SOURCE_BY_ID[item.id] ??
          resolveStoryImageSource(item.avatar ?? '') ??
          (isEvenHash(item.id) ? PANEL_CHAR_1_SOURCE : PANEL_CHAR_2_SOURCE),
        subText: t('reader.characterViewStory'),
        encounterText:
          typeof item.encounterCount === 'number' && item.encounterCount > 0
            ? item.encounterCount >= 10000
              ? t('reader.characterEncounterW', {
                  count: (item.encounterCount / 10000).toFixed(1),
                })
              : t('reader.characterEncounter', { count: item.encounterCount })
            : t('reader.characterEncounterW', { count: '3.5' }),
        unlocked: true,
      }));
    while (unlocked.length < 6) {
      unlocked.push({
        id: `locked_${unlocked.length}`,
        isPrimary: false,
        name: '???',
        imageSource: PANEL_LOCKED_SOURCE,
        fallbackSource: PANEL_LOCKED_SOURCE,
        subText: t('reader.characterLocked'),
        encounterText: t('reader.characterEncounterW', { count: '3.5' }),
        unlocked: false,
      });
    }
    return unlocked;
  }, [story, t]);
  const readerTextColor = useMemo(
    () => getReadableTextColor(settings.backgroundColor),
    [settings.backgroundColor]
  );
  const readerMutedTextColor = useMemo(
    () => withAlpha(readerTextColor, 0.65),
    [readerTextColor]
  );
  const readerBorderColor = useMemo(
    () => withAlpha(readerTextColor, 0.18),
    [readerTextColor]
  );
  const hasBackgroundImage = Boolean(settings.backgroundImageUrl);
  const backgroundImageSource = useMemo(
    () => resolveStoryImageSource(settings.backgroundImageUrl),
    [settings.backgroundImageUrl]
  );
  const effectiveMainlineOnly = routePureMode || settings.mainlineOnly;
  const isPanelOpen = showToolbar && activePanel !== null;
  const topBarHeight = insets.top + 48;
  const bottomBarHeight = insets.bottom + 72;

  useEffect(() => {
    let mounted = true;
    async function bootstrapReader() {
      if (!storyId || !story) return;
      setHydrated(false);
      const savedSettings = await kv.getJson<Partial<ReaderSettings>>(READER_SETTINGS_KEY);
      const normalizedSettings = normalizeReaderSettings(savedSettings);
      setSettings(normalizedSettings);
      const row = await readingProgressRepository.getByStoryId(storyId);
      if (!mounted) return;
      setRawProgressDebug({
        currentNodeId: row?.current_node_id ?? null,
        choiceHistoryRaw: row?.choice_history ?? null,
        visitedNodeIdsRaw: row?.visited_node_ids ?? null,
      });

      const validNodeIds = new Set(story.nodes.map((node) => node.id));
      const currentNodeId =
        row?.current_node_id && validNodeIds.has(row.current_node_id)
          ? row.current_node_id
          : story.startNodeId;

      const baseProgress: ReaderProgressState = {
        currentNodeId,
        choiceHistory: parseChoiceHistory(row?.choice_history ?? null),
        visitedNodeIds: parseVisitedNodeIds(row?.visited_node_ids ?? null).filter((id) =>
          validNodeIds.has(id)
        ),
      };

      const built = buildContentFromProgress(
        story,
        nodeMap,
        baseProgress,
        routePureMode || normalizedSettings.mainlineOnly
      );
      setDisplayedNodeIds(built.displayedNodeIds);
      setProgressState(built.progress);
      setRestoredFromProgress(Boolean(row));
      setProgressPercentage(
        row?.progress_percentage ??
          (story.nodes.length > 0
            ? Math.round((built.progress.visitedNodeIds.length / story.nodes.length) * 100)
            : 0)
      );
      setHydrated(true);
    }

    void bootstrapReader();
    return () => {
      mounted = false;
    };
  }, [nodeMap, routePureMode, story, storyId]);

  useEffect(() => {
    if (!hydrated || !story || !progressState) return;
    const percentage =
      story.nodes.length > 0
        ? Math.min(
            100,
            Math.round(
              (progressState.visitedNodeIds.length / story.nodes.length) * 100
            )
          )
        : 0;
    setProgressPercentage(percentage);
    void readingProgressRepository.upsert({
      storyId: story.id,
      currentNodeId: progressState.currentNodeId,
      choiceHistoryJson: JSON.stringify(
        progressState.choiceHistory.map((record) => ({
          node_id: record.nodeId,
          choice_id: record.choiceId,
          timestamp: record.timestamp,
        }))
      ),
      visitedNodeIdsJson: JSON.stringify(progressState.visitedNodeIds),
      lastReadAtMs: Date.now(),
      readDuration: 0,
      scrollPosition: 0,
      pageIndex: 0,
      progressPercentage: percentage,
    });
  }, [hydrated, progressState, story]);

  useEffect(() => {
    const timer = setTimeout(() => {
      void kv.setJson(READER_SETTINGS_KEY, settings);
    }, 180);
    return () => clearTimeout(timer);
  }, [settings]);

  useEffect(() => {
    if (!hydrated || !story || !progressState) return;
    const rebuilt = buildContentFromProgress(
      story,
      nodeMap,
      progressState,
      effectiveMainlineOnly
    );
    setDisplayedNodeIds(rebuilt.displayedNodeIds);
    setProgressState(rebuilt.progress);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [effectiveMainlineOnly]);

  useEffect(() => {
    if (!showToolbar) {
      setShowSettings(false);
      setActivePanel(null);
    }
  }, [showToolbar]);

  useEffect(() => {
    if (showToolbar && activePanel === 'branch' && currentNodeColumnIndex >= 0) {
      const timer = setTimeout(() => {
        branchScrollRef.current?.scrollTo({
          x: currentNodeColumnIndex * getApproxBranchColumnWidth(),
          animated: false,
        });
      }, 0);
      return () => clearTimeout(timer);
    }
    return undefined;
  }, [activePanel, currentNodeColumnIndex, showToolbar]);

  function rollbackToNode(targetNodeId: string): boolean {
    if (!story || !progressState) return false;
    if (targetNodeId === progressState.currentNodeId) return false;
    if (!progressState.visitedNodeIds.includes(targetNodeId)) return false;

    const rebuiltHistory: ChoiceRecord[] = [];
    const rebuiltVisited = new Set<string>();
    let cursorId: string | null = story.startNodeId;
    const safety = new Set<string>();

    while (cursorId && !safety.has(cursorId)) {
      safety.add(cursorId);
      rebuiltVisited.add(cursorId);
      if (cursorId === targetNodeId) break;

      const node = nodeMap.get(cursorId);
      if (!node) break;
      if (node.type === 'choice' && node.choices && node.choices.length > 0) {
        const record = findChoiceRecord(progressState.choiceHistory, node.id);
        if (!record) break;
        const selected = resolveChoice(node, record);
        if (!selected) break;
        rebuiltHistory.push(record);
        cursorId = selected.targetNodeId;
      } else {
        cursorId = node.nextNodeId ?? null;
      }
    }

    if (!rebuiltVisited.has(targetNodeId)) return false;

    const rebuilt = buildContentFromProgress(
      story,
      nodeMap,
      {
        currentNodeId: targetNodeId,
        choiceHistory: rebuiltHistory,
        visitedNodeIds: Array.from(rebuiltVisited),
      },
      effectiveMainlineOnly
    );
    setDisplayedNodeIds(rebuilt.displayedNodeIds);
    setProgressState(rebuilt.progress);
    return true;
  }

  function confirmRollbackToNode(targetNodeId: string, title: string) {
    Alert.alert(
      t('reader.rollbackConfirmTitle'),
      t('reader.rollbackConfirmContent', { node: title || targetNodeId }),
      [
        { text: t('reader.closeSettings'), style: 'cancel' },
        {
          text: t('reader.rollbackConfirmAction'),
          onPress: () => {
            const ok = rollbackToNode(targetNodeId);
            if (ok) {
              setActivePanel(null);
            }
          },
        },
      ]
    );
  }

  function collectHighlightImage(imageUrl: string) {
    if (!imageUrl) return;
    setSettings((prev) => {
      if (prev.collectedHighlightImages.includes(imageUrl)) return prev;
      return {
        ...prev,
        collectedHighlightImages: [...prev.collectedHighlightImages, imageUrl],
      };
    });
  }

  function setHighlightAsBackground(imageUrl: string) {
    if (!imageUrl) return;
    setSettings((prev) => ({
      ...prev,
      backgroundImageUrl: imageUrl,
      collectedHighlightImages: prev.collectedHighlightImages.includes(imageUrl)
        ? prev.collectedHighlightImages
        : [...prev.collectedHighlightImages, imageUrl],
    }));
  }

  function openIconicModal(node: StoryNode) {
    if (!node.iconicScene?.imageUrl) return;
    setIconicModalNodeId(node.id);
  }

  function closeIconicModal() {
    setIconicModalNodeId(null);
  }

  function renderNodeContent(node: StoryNode) {
    const baseTextStyle = [
      styles.nodeContent,
      {
        fontSize: settings.fontSize,
        lineHeight: settings.fontSize * settings.lineHeight,
        color: readerTextColor,
      },
    ];

    const source = getFullContent(node.content);
    const iconic = node.iconicScene;
    if (!iconic || !iconic.content || !iconic.imageUrl) {
      return <Text style={baseTextStyle}>{source}</Text>;
    }

    const target = iconic.content.trim();
    if (!target) return <Text style={baseTextStyle}>{source}</Text>;
    const index = source.indexOf(target);
    if (index < 0) return <Text style={baseTextStyle}>{source}</Text>;

    const before = source.slice(0, index);
    const matched = source.slice(index, index + target.length);
    const after = source.slice(index + target.length);

    return (
      <View>
        {before ? <Text style={baseTextStyle}>{before}</Text> : null}
        <Pressable
          style={[
            styles.iconicInlineBlock,
            { backgroundColor: withAlpha(readerTextColor, 0.12) },
          ]}
          onPress={() => openIconicModal(node)}
        >
          <Text style={baseTextStyle}>{matched}</Text>
        </Pressable>
        {after ? <Text style={baseTextStyle}>{after}</Text> : null}
      </View>
    );
  }

  function handleReaderTouchStart(event: {
    nativeEvent: { pageX: number; pageY: number };
  }) {
    if (isPanelOpen) return;
    tapStartRef.current = {
      x: event.nativeEvent.pageX,
      y: event.nativeEvent.pageY,
      ts: Date.now(),
    };
  }

  function handleReaderTouchEnd(event: {
    nativeEvent: { pageX: number; pageY: number };
  }) {
    if (isPanelOpen) return;
    const start = tapStartRef.current;
    tapStartRef.current = null;
    if (!start) return;
    const moveX = Math.abs(event.nativeEvent.pageX - start.x);
    const moveY = Math.abs(event.nativeEvent.pageY - start.y);
    const duration = Date.now() - start.ts;
    const isTap = moveX < 8 && moveY < 8 && duration < 250;
    if (isTap) {
      setShowToolbar((prev) => !prev);
    }
  }

  async function restartReading() {
    if (!story) return;
    await readingProgressRepository.clearByStoryId(story.id);
    const baseProgress: ReaderProgressState = {
      currentNodeId: story.startNodeId,
      choiceHistory: [],
      visitedNodeIds: [],
    };
    const built = buildContentFromProgress(
      story,
      nodeMap,
      baseProgress,
      effectiveMainlineOnly
    );
    setDisplayedNodeIds(built.displayedNodeIds);
    setProgressState(built.progress);
    setRestoredFromProgress(false);
  }

  function handleChoice(choice: StoryChoice) {
    if (!progressState || !story) return;
    const lastNodeId = displayedNodeIds[displayedNodeIds.length - 1];
    const currentChoiceNode = lastNodeId ? nodeMap.get(lastNodeId) : null;
    if (!currentChoiceNode || currentChoiceNode.type !== 'choice') return;

    const record: ChoiceRecord = {
      nodeId: currentChoiceNode.id,
      choiceId: choice.id,
      timestamp: Date.now(),
    };

    const nextProgress: ReaderProgressState = {
      currentNodeId: choice.targetNodeId,
      choiceHistory: [...progressState.choiceHistory, record],
      visitedNodeIds: Array.from(
        new Set([...progressState.visitedNodeIds, choice.targetNodeId])
      ),
    };

    const withoutChoiceNodes = displayedNodeIds.filter((nodeId) => {
      const node = nodeMap.get(nodeId);
      return node?.type !== 'choice';
    });

    const loaded = loadNextNodes(
      nodeMap,
      withoutChoiceNodes,
      nextProgress,
      choice.targetNodeId,
      effectiveMainlineOnly
    );
    setDisplayedNodeIds(loaded.displayedNodeIds);
    setProgressState(loaded.progress);
  }

  if (!story) {
    return (
      <View style={styles.container}>
        <Text style={styles.title}>{t('reader.title')}</Text>
        <Text style={styles.subtitle}>{t('reader.notFound')}</Text>
      </View>
    );
  }

  if (!hydrated || !progressState) {
    return (
      <View style={styles.container}>
        <Text style={styles.title}>{t('reader.title')}</Text>
        <Text style={styles.subtitle}>{t('reader.loadingProgress')}</Text>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: settings.backgroundColor }]}>
      {hasBackgroundImage && backgroundImageSource ? (
        <View pointerEvents="none" style={styles.backgroundImageLayer}>
          <Image
            source={backgroundImageSource}
            resizeMode="cover"
            style={styles.backgroundImage}
          />
          <View style={styles.backgroundImageMask} />
        </View>
      ) : null}
      <View style={styles.readerLayer}>
        <ScrollView
          style={styles.readerScroll}
          scrollEnabled={!isPanelOpen}
          onTouchStart={handleReaderTouchStart}
          onTouchEnd={handleReaderTouchEnd}
          contentContainerStyle={[
            styles.content,
            {
              paddingHorizontal: settings.horizontalPadding,
              // Keep reader content layout stable; toolbars are absolute overlays.
              paddingTop: insets.top + 14,
              paddingBottom: insets.bottom + 30,
            },
          ]}
        >
            {displayedNodeIds.map((nodeId) => {
              const node = nodeMap.get(nodeId);
              if (!node) return null;
              return (
                <View key={node.id} style={styles.nodeCard}>
                  {showDebug ? (
                    <Text style={[styles.nodeDebugTitle, { color: readerMutedTextColor }]}>
                      {node.id} · {node.type}
                    </Text>
                  ) : null}
                  {renderNodeContent(node)}

                  {node.type === 'choice' && node.choices && node.choices.length > 0 ? (
                    <View
                      style={[
                        styles.choiceBox,
                        {
                          backgroundColor: settings.backgroundColor,
                          borderColor: readerBorderColor,
                        },
                      ]}
                    >
                      {!effectiveMainlineOnly ? (
                        <>
                          <Text style={[styles.choiceTitle, { color: readerMutedTextColor }]}>
                            {t('reader.choosePrompt')}
                          </Text>
                          {node.choices.map((choice) => (
                            <Pressable
                              key={choice.id}
                              style={[
                                styles.choiceButton,
                                {
                                  backgroundColor: settings.backgroundColor,
                                  borderColor: readerBorderColor,
                                },
                              ]}
                              onPress={() => handleChoice(choice)}
                            >
                              <Text style={[styles.choiceText, { color: readerTextColor }]}>
                                {choice.text}
                              </Text>
                            </Pressable>
                          ))}
                        </>
                      ) : (
                        <Text style={[styles.subtitle, { color: readerMutedTextColor }]}>
                          {t('reader.chooseHintPure')}
                        </Text>
                      )}
                    </View>
                  ) : null}
                </View>
              );
            })}

            {currentNode?.type === 'ending' ? (
              <Text style={[styles.endingText, { color: withAlpha(readerTextColor, 0.8) }]}>
                {t('reader.endingReached')}
              </Text>
            ) : null}

            {__DEV__ && showDebug ? (
              <View style={styles.debugBox}>
                <Text style={styles.debugTitle}>DEBUG (Flutter alignment)</Text>
                <Text style={styles.debugText}>
                  db.current_node_id: {rawProgressDebug.currentNodeId ?? 'null'}
                </Text>
                <Text style={styles.debugText}>
                  db.choice_history: {rawProgressDebug.choiceHistoryRaw ?? 'null'}
                </Text>
                <Text style={styles.debugText}>
                  db.visited_node_ids: {rawProgressDebug.visitedNodeIdsRaw ?? 'null'}
                </Text>
                <Text style={styles.debugText}>
                  parsed.choiceHistory: {JSON.stringify(progressState.choiceHistory)}
                </Text>
                <Text style={styles.debugText}>
                  parsed.displayedNodeIds: {JSON.stringify(displayedNodeIds)}
                </Text>
              </View>
            ) : null}
        </ScrollView>

        <View
          pointerEvents={showToolbar ? 'auto' : 'none'}
          style={[
            styles.topToolbar,
            {
              height: topBarHeight,
              paddingTop: insets.top,
              backgroundColor: settings.backgroundColor,
              borderColor: readerBorderColor,
            },
            !showToolbar && styles.toolbarHidden,
          ]}
        >
            <Pressable onPress={() => router.back()} hitSlop={10}>
              <Ionicons name="chevron-back" size={24} color={readerTextColor} />
            </Pressable>
            <Text style={[styles.topToolbarTitle, { color: readerTextColor }]} numberOfLines={1}>
              {story.title}
            </Text>
            <View style={styles.topToolbarRight}>
              {__DEV__ ? (
                <Pressable
                  style={styles.debugToggleButton}
                  onPress={() => setShowDebug((prev) => !prev)}
                >
                  <Text style={styles.debugToggleText}>
                    {showDebug ? t('reader.hideDebug') : t('reader.showDebug')}
                  </Text>
                </Pressable>
              ) : null}
              <Pressable onPress={() => void restartReading()} hitSlop={10}>
                <Ionicons name="refresh" size={20} color={readerTextColor} />
              </Pressable>
            </View>
        </View>

        <View
          pointerEvents={showToolbar ? 'auto' : 'none'}
          style={[
            styles.bottomToolbar,
            {
              height: bottomBarHeight,
              paddingBottom: insets.bottom + 8,
              backgroundColor: settings.backgroundColor,
              borderColor: readerBorderColor,
            },
            !showToolbar && styles.toolbarHidden,
          ]}
        >
            <Pressable
              style={styles.toolbarButton}
              onPress={() => {
                setShowSettings(false);
                setActivePanel('branch');
              }}
            >
              <Ionicons name="git-branch-outline" size={22} color={readerTextColor} />
              <Text style={[styles.toolbarButtonText, { color: readerTextColor }]}>
                {t('reader.toolbarBranch')}
              </Text>
            </Pressable>
            <Pressable
              style={styles.toolbarButton}
              onPress={() => {
                setShowSettings(false);
                setActivePanel('characters');
              }}
            >
              <Ionicons name="people-outline" size={22} color={readerTextColor} />
              <Text style={[styles.toolbarButtonText, { color: readerTextColor }]}>
                {t('reader.toolbarCharacters')}
              </Text>
            </Pressable>
            <Pressable
              style={styles.toolbarButton}
              onPress={() => {
                setActivePanel('settings');
                setShowSettings(true);
              }}
            >
              <Ionicons name="settings-outline" size={22} color={readerTextColor} />
              <Text style={[styles.toolbarButtonText, { color: readerTextColor }]}>
                {t('reader.toolbarSettings')}
              </Text>
            </Pressable>
        </View>
      </View>

      {isPanelOpen ? (
        <Pressable
          style={styles.panelBackdrop}
          onPress={() => {
            setShowSettings(false);
            setActivePanel(null);
          }}
        />
      ) : null}

      {showSettings && activePanel === 'settings' ? (
        <View style={[styles.settingsPanel, { paddingBottom: insets.bottom + 12 }]}>
          <View style={styles.panelGrabber} />
          <View style={styles.settingsHeader}>
            <Text style={styles.settingsPanelTitle}>{t('reader.settingsTitle')}</Text>
            <Pressable onPress={() => setSettings(DEFAULT_READER_SETTINGS)}>
              <Text style={styles.resetText}>{t('reader.resetSettings')}</Text>
            </Pressable>
          </View>

          <View style={styles.settingSection}>
            <Text style={styles.settingLabel}>{t('reader.fontSize')}</Text>
            <TrackSlider
              value={settings.fontSize}
              min={14}
              max={28}
              leftLabel="A"
              rightLabel="A"
              onChange={(next) =>
                setSettings((prev) => ({
                  ...prev,
                  fontSize: Number(next.toFixed(1)),
                }))
              }
            />
          </View>

          <View style={styles.settingTwoCol}>
            <View style={styles.settingSectionCol}>
              <Text style={styles.settingLabel}>{t('reader.horizontalPadding')}</Text>
              <TrackSlider
                value={settings.horizontalPadding}
                min={12}
                max={36}
                leftLabel="S"
                rightLabel="L"
                onChange={(next) =>
                  setSettings((prev) => ({
                    ...prev,
                    horizontalPadding: Number(next.toFixed(1)),
                  }))
                }
              />
            </View>
            <View style={styles.settingSectionCol}>
              <Text style={styles.settingLabel}>{t('reader.lineHeight')}</Text>
              <TrackSlider
                value={settings.lineHeight}
                min={1.4}
                max={2.4}
                leftLabel="-"
                rightLabel="+"
                onChange={(next) =>
                  setSettings((prev) => ({
                    ...prev,
                    lineHeight: Number(next.toFixed(2)),
                  }))
                }
              />
            </View>
          </View>

          <View style={styles.panelDivider} />

          <View style={styles.settingSection}>
            <Text style={styles.settingLabel}>{t('reader.brightness')}</Text>
            <TrackSlider
              value={settings.brightness}
              min={0.35}
              max={1}
              leftLabel="◐"
              rightLabel="◑"
              onChange={(next) =>
                setSettings((prev) => ({
                  ...prev,
                  brightness: Number(next.toFixed(2)),
                }))
              }
            />
          </View>

          <View style={styles.settingSection}>
            <Text style={styles.settingLabel}>{t('reader.background')}</Text>
            <View style={styles.colorRow}>
              {['#ffffff', '#f7f3e9', '#e8f0ff', '#111827'].map((color) => (
                <Pressable
                  key={color}
                  onPress={() =>
                    setSettings((prev) => ({
                      ...prev,
                      backgroundColor: color,
                      backgroundImageUrl: null,
                    }))
                  }
                  style={[
                    styles.colorChipRect,
                    { backgroundColor: color },
                    settings.backgroundImageUrl === null &&
                      settings.backgroundColor === color &&
                      styles.colorChipRectActive,
                  ]}
                />
              ))}
            </View>
            {settings.collectedHighlightImages.length > 0 ? (
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.backgroundImageList}
              >
                {settings.collectedHighlightImages.map((imageUrl) => (
                  <Pressable
                    key={imageUrl}
                    onPress={() =>
                      setSettings((prev) => ({
                        ...prev,
                        backgroundImageUrl: imageUrl,
                      }))
                    }
                    style={[
                      styles.backgroundImageItem,
                      settings.backgroundImageUrl === imageUrl && styles.backgroundImageItemActive,
                    ]}
                  >
                    {resolveStoryImageSource(imageUrl) ? (
                      <Image
                        source={resolveStoryImageSource(imageUrl) as ImageSourcePropType}
                        style={styles.backgroundImagePreview}
                      />
                    ) : (
                      <View style={styles.backgroundImagePreviewFallback}>
                        <Text style={styles.backgroundImagePreviewFallbackText}>N/A</Text>
                      </View>
                    )}
                  </Pressable>
                ))}
              </ScrollView>
            ) : null}
          </View>

          <View style={styles.panelDivider} />

          <View style={styles.pureRow}>
            <Text style={[styles.settingLabel, routePureMode && styles.settingDisabled]}>
              {t('reader.mainlineOnly')}
            </Text>
            <Pressable
              disabled={routePureMode}
              style={[
                styles.toggleTrack,
                effectiveMainlineOnly && styles.toggleTrackActive,
                routePureMode && styles.toggleTrackDisabled,
              ]}
              onPress={() =>
                setSettings((prev) => ({
                  ...prev,
                  mainlineOnly: !prev.mainlineOnly,
                }))
              }
            >
              <View
                style={[
                  styles.toggleThumb,
                  effectiveMainlineOnly && styles.toggleThumbActive,
                ]}
              />
            </Pressable>
          </View>
        </View>
      ) : null}

      {settings.brightness < 1 ? (
        <View
          pointerEvents="none"
          style={[
            styles.brightnessMask,
            { opacity: 1 - settings.brightness },
          ]}
        />
      ) : null}
      {showToolbar && activePanel === 'branch' ? (
        <View style={[styles.branchPanel, { paddingBottom: insets.bottom + 8 }]}>
          <View style={styles.branchPanelTitleRow}>
            <Text style={styles.branchPanelTitle}>{t('reader.toolbarBranch')}</Text>
            <Text style={styles.branchPanelPercentText}>{progressPercentage}%</Text>
          </View>
          <View style={styles.branchPanelMapWrap}>
            {branchColumns.length === 0 || branchEdges.length === 0 ? (
              <Text style={styles.placeholderText}>{t('reader.branchMapEmpty')}</Text>
            ) : (
              <ScrollView
                ref={branchScrollRef}
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.branchMapScrollContent}
              >
                <StoryBranchMap
                  columns={branchColumns}
                  edges={branchEdges}
                  resolveImageSource={resolveStoryImageSource}
                  onNodeTap={(node) => {
                    if (node.id === progressState.currentNodeId) return;
                    if (!progressState.visitedNodeIds.includes(node.id)) {
                      Alert.alert('', t('reader.rollbackUnreadable'));
                      return;
                    }
                    confirmRollbackToNode(node.id, node.title);
                  }}
                />
              </ScrollView>
            )}
          </View>
          <View style={styles.branchPanelBottomRow}>
            <StoryBranchProgressBar percentage={progressPercentage} />
            <View style={styles.branchPanelBottomRight}>
              <Pressable
                style={styles.branchLocateInline}
                onPress={() => {
                  if (currentNodeColumnIndex >= 0) {
                    branchScrollRef.current?.scrollTo({
                      x: currentNodeColumnIndex * getApproxBranchColumnWidth(),
                      animated: true,
                    });
                  }
                }}
              >
                <Ionicons name="locate-outline" size={14} color="#6b7280" />
                <Text style={styles.branchLocateInlineText}>{t('reader.locateCurrentNode')}</Text>
              </Pressable>
            </View>
          </View>
        </View>
      ) : null}
      {showToolbar && activePanel === 'characters' ? (
        <View style={[styles.characterPanel, { paddingBottom: insets.bottom + 8 }]}>
          <View style={styles.characterPanelTitleRow}>
            <Text style={styles.characterPanelTitle}>{t('reader.characterOverview')}</Text>
            <Text style={styles.characterPanelCountText}>
              {`${Math.min(6, story.mainCharacters.filter((item) => item.isInteracted).length)}/6`}
            </Text>
          </View>
          <View style={styles.characterListWrap}>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.characterListScroll}
            >
              {characterCards.map((character) => {
                return (
                  <Pressable
                    key={character.id}
                    style={styles.characterCardItem}
                    onPress={() => {
                      if (!character.unlocked) {
                        Alert.alert('', t('reader.characterLockedToast'));
                        return;
                      }
                      router.push(`/character/${character.id}`);
                    }}
                  >
                    <View
                      style={[
                        styles.characterPoster,
                        character.unlocked
                          ? character.isPrimary
                            ? styles.characterPosterPrimary
                            : styles.characterPosterUnlocked
                          : styles.characterPosterLocked,
                      ]}
                    >
                      <Image
                        source={character.imageSource}
                        style={[
                          styles.characterPosterImage,
                          !character.unlocked && styles.characterPosterImageLocked,
                        ]}
                        resizeMode="cover"
                      />
                      {character.unlocked ? (
                        <LinearGradient
                          colors={['rgba(0,0,0,0)', 'rgba(0,0,0,0)', 'rgba(0,0,0,0.8)']}
                          locations={[0, 0.5, 1]}
                          style={styles.characterPosterOverlay}
                        />
                      ) : null}
                      <View style={styles.characterPosterMetaRow}>
                        <Ionicons name="heart" size={10} color="#fde047" />
                        <Text style={styles.characterPosterMetaText}>{character.encounterText}</Text>
                      </View>
                      <Text style={[styles.characterPosterName, !character.unlocked && styles.characterPosterNameLocked]}>
                        {character.name}
                      </Text>
                      {!character.unlocked ? (
                        <View style={styles.characterPosterLockBadge}>
                          <Ionicons name="lock-closed" size={30} color="#9ca3af" />
                        </View>
                      ) : null}
                    </View>
                    <Text
                      style={[
                        styles.characterPosterSubText,
                        !character.unlocked && styles.characterPosterSubTextLocked,
                      ]}
                      numberOfLines={1}
                    >
                      {character.subText}
                    </Text>
                  </Pressable>
                );
              })}
            </ScrollView>
          </View>
        </View>
      ) : null}
      <Modal
        visible={iconicModalNodeId !== null}
        transparent
        animationType="fade"
        onRequestClose={closeIconicModal}
      >
        <View style={styles.iconicModalRoot}>
          <Pressable style={styles.iconicModalBackdrop} onPress={closeIconicModal} />
          {iconicModalNodeId ? (
            <View style={styles.iconicModalCenter}>
              {(() => {
                const node = nodeMap.get(iconicModalNodeId) ?? null;
                const imageUrl = node?.iconicScene?.imageUrl ?? '';
                const collected = settings.collectedHighlightImages.includes(imageUrl);
                const resolvedImageSource = resolveStoryImageSource(imageUrl);
                return (
                  <>
                    <View style={styles.iconicModalImageCard}>
                      {resolvedImageSource ? (
                        <Image
                          source={resolvedImageSource}
                          style={styles.iconicModalImage}
                          resizeMode="cover"
                        />
                      ) : (
                        <View style={styles.iconicModalPlaceholder}>
                          <Text style={styles.iconicModalPlaceholderText}>
                            {t('reader.iconicNoPreview')}
                          </Text>
                        </View>
                      )}
                    </View>
                    {!collected ? (
                      <View style={styles.iconicModalActions}>
                        <Pressable
                          style={styles.iconicModalActionButton}
                          onPress={() => {
                            setHighlightAsBackground(imageUrl);
                            closeIconicModal();
                          }}
                        >
                          <Text style={styles.iconicModalActionText}>
                            {t('reader.setAsBackground')}
                          </Text>
                        </Pressable>
                        <Pressable
                          style={styles.iconicModalActionButton}
                          onPress={() => {
                            collectHighlightImage(imageUrl);
                            closeIconicModal();
                          }}
                        >
                          <Text style={styles.iconicModalActionText}>
                            {t('reader.collectHighlight')}
                          </Text>
                        </Pressable>
                      </View>
                    ) : null}
                  </>
                );
              })()}
            </View>
          ) : null}
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  content: {
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 32,
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
  },
  subtitle: {
    marginTop: 8,
    color: '#666',
  },
  restartButton: {
    marginTop: 12,
    backgroundColor: '#111827',
    alignSelf: 'flex-start',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  restartButtonText: {
    color: '#fff',
    fontWeight: '700',
  },
  settingsButton: {
    marginTop: 8,
    alignSelf: 'flex-start',
    paddingVertical: 4,
  },
  settingsButtonText: {
    color: '#2563eb',
    fontSize: 12,
  },
  debugToggleButton: {
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#d1d5db',
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  debugToggleText: {
    color: '#2563eb',
    fontSize: 11,
  },
  readerLayer: {
    flex: 1,
  },
  backgroundImageLayer: {
    ...StyleSheet.absoluteFillObject,
  },
  backgroundImage: {
    ...StyleSheet.absoluteFillObject,
    opacity: 0.48,
  },
  backgroundImageMask: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(255,255,255,0.62)',
  },
  readerScroll: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  topToolbar: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 76,
    paddingTop: 0,
    paddingHorizontal: 14,
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderColor: '#e5e7eb',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  topToolbarTitle: {
    flex: 1,
    marginHorizontal: 12,
    fontSize: 16,
    fontWeight: '700',
    color: '#111827',
  },
  topToolbarRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  bottomToolbar: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    height: 92,
    paddingBottom: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    backgroundColor: '#ffffff',
    borderTopWidth: 1,
    borderColor: '#e5e7eb',
  },
  toolbarButton: {
    alignItems: 'center',
    gap: 2,
  },
  toolbarButtonText: {
    fontSize: 11,
    color: '#111827',
  },
  toolbarHidden: {
    opacity: 0,
  },
  nodeCard: {
    marginTop: 20,
  },
  iconicInlineBlock: {
    marginVertical: 6,
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  nodeDebugTitle: {
    fontWeight: '700',
    color: '#6b7280',
    marginBottom: 6,
    fontSize: 12,
  },
  nodeContent: {
    color: '#1f2937',
    fontSize: 18,
    lineHeight: 33,
  },
  choiceBox: {
    marginTop: 20,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 12,
    padding: 12,
    backgroundColor: '#ffffff',
  },
  choiceTitle: {
    fontWeight: '700',
    marginBottom: 8,
  },
  choiceButton: {
    borderRadius: 8,
    backgroundColor: '#2563eb',
    borderWidth: 1,
    borderColor: '#d1d5db',
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 8,
  },
  choiceText: {
    color: '#fff',
    fontWeight: '600',
  },
  endingText: {
    marginTop: 14,
    color: '#16a34a',
    fontWeight: '700',
  },
  debugBox: {
    marginTop: 18,
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 12,
    padding: 12,
    backgroundColor: '#f9fafb',
  },
  debugTitle: {
    fontWeight: '700',
    marginBottom: 8,
  },
  debugText: {
    fontSize: 12,
    color: '#374151',
    marginBottom: 4,
  },
  settingsPanel: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    borderTopWidth: 1,
    borderColor: '#e5e7eb',
    backgroundColor: '#ffffff',
    paddingHorizontal: 20,
    paddingTop: 10,
    zIndex: 20,
  },
  panelBackdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.18)',
    zIndex: 10,
  },
  panelGrabber: {
    alignSelf: 'center',
    width: 64,
    height: 4,
    borderRadius: 999,
    backgroundColor: '#d1d5db',
    marginBottom: 12,
  },
  settingsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  settingsPanelTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#111827',
  },
  resetText: {
    fontSize: 13,
    color: '#6b7280',
  },
  settingSection: {
    marginBottom: 14,
  },
  settingTwoCol: {
    flexDirection: 'row',
    gap: 16,
    marginBottom: 6,
  },
  settingSectionCol: {
    flex: 1,
  },
  settingLabel: {
    color: '#1f2937',
    fontSize: 14,
    marginBottom: 10,
    fontWeight: '500',
  },
  settingDisabled: {
    color: '#9ca3af',
  },
  sliderRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  sliderEdgeLabel: {
    width: 18,
    textAlign: 'center',
    color: '#6b7280',
    fontSize: 12,
  },
  sliderTrackWrap: {
    flex: 1,
    height: 30,
    borderRadius: 999,
    backgroundColor: '#e5e7eb',
    marginHorizontal: 8,
    justifyContent: 'center',
    overflow: 'hidden',
  },
  sliderTrack: {
    height: 30,
    borderRadius: 999,
    backgroundColor: '#e5e7eb',
  },
  sliderThumb: {
    position: 'absolute',
    top: 5,
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#cbd5e1',
  },
  panelDivider: {
    height: 1,
    backgroundColor: '#e5e7eb',
    marginVertical: 8,
  },
  colorRow: {
    flexDirection: 'row',
    gap: 10,
  },
  colorChipRect: {
    width: 56,
    height: 30,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#d1d5db',
  },
  colorChipRectActive: {
    borderWidth: 2,
    borderColor: '#111827',
  },
  backgroundImageList: {
    marginTop: 10,
    gap: 8,
    paddingRight: 6,
  },
  backgroundImageItem: {
    width: 78,
    height: 46,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#d1d5db',
    overflow: 'hidden',
  },
  backgroundImageItemActive: {
    borderWidth: 2,
    borderColor: '#111827',
  },
  backgroundImagePreview: {
    width: '100%',
    height: '100%',
  },
  backgroundImagePreviewFallback: {
    width: '100%',
    height: '100%',
    backgroundColor: '#374151',
    alignItems: 'center',
    justifyContent: 'center',
  },
  backgroundImagePreviewFallbackText: {
    color: '#e5e7eb',
    fontSize: 11,
    fontWeight: '600',
  },
  pureRow: {
    marginTop: 4,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  toggleTrack: {
    width: 48,
    height: 28,
    borderRadius: 999,
    backgroundColor: '#d1d5db',
    padding: 4,
  },
  toggleTrackActive: {
    backgroundColor: '#2563eb',
  },
  toggleTrackDisabled: {
    opacity: 0.6,
  },
  toggleThumb: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#ffffff',
    transform: [{ translateX: 0 }],
  },
  toggleThumbActive: {
    transform: [{ translateX: 20 }],
  },
  settingActions: {
    flexDirection: 'row',
    gap: 8,
  },
  settingActionButton: {
    width: 28,
    height: 28,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#d1d5db',
    alignItems: 'center',
    justifyContent: 'center',
  },
  settingActionText: {
    fontWeight: '700',
    color: '#111827',
  },
  colorChip: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#d1d5db',
  },
  colorChipActive: {
    borderWidth: 2,
    borderColor: '#111827',
  },
  mainlineToggle: {
    marginTop: 2,
  },
  panelBottomRow: {
    marginTop: 4,
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 8,
  },
  brightnessMask: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#000000',
  },
  branchPanel: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    borderTopLeftRadius: 40,
    borderTopRightRadius: 40,
    borderTopWidth: 1,
    borderColor: '#f3f4f6',
    backgroundColor: '#ffffff',
    paddingTop: 8,
    shadowColor: '#000000',
    shadowOpacity: 0.05,
    shadowRadius: 30,
    shadowOffset: { width: 0, height: -10 },
    zIndex: 20,
  },
  characterPanel: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    borderTopWidth: 1,
    borderColor: '#f3f4f6',
    backgroundColor: '#f9fafb',
    shadowColor: '#000000',
    shadowOpacity: 0.05,
    shadowRadius: 30,
    shadowOffset: { width: 0, height: -10 },
    zIndex: 20,
  },
  branchPanelTitleRow: {
    marginTop: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
  },
  branchPanelTitle: {
    color: '#111827',
    fontSize: 18,
    fontWeight: '600',
  },
  branchPanelPercentText: {
    color: '#6b7280',
    fontSize: 12,
  },
  branchPanelMapWrap: {
    marginTop: 14,
  },
  branchMapScrollContent: {
    paddingHorizontal: 20,
  },
  branchPanelBottomRow: {
    marginTop: 12,
    paddingHorizontal: 20,
    flexDirection: 'row',
    alignItems: 'center',
  },
  branchPanelBottomRight: {
    marginLeft: 'auto',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  branchLocateInline: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 6,
    paddingVertical: 4,
    borderRadius: 8,
  },
  branchLocateInlineText: {
    marginLeft: 4,
    color: '#6b7280',
    fontSize: 12,
  },
  branchSummaryRow: {
    marginTop: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  branchSummaryText: {
    flex: 1,
    fontSize: 12,
    color: '#4b5563',
  },
  placeholderText: {
    fontSize: 13,
    color: '#6b7280',
    marginBottom: 8,
  },
  rollbackList: {
    marginTop: 8,
    maxHeight: 180,
    borderTopWidth: 1,
    borderColor: '#e5e7eb',
    paddingTop: 8,
    gap: 6,
  },
  rollbackItem: {
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#d1d5db',
    backgroundColor: '#f9fafb',
    paddingHorizontal: 10,
    paddingVertical: 7,
  },
  rollbackItemText: {
    color: '#374151',
    fontSize: 12,
    fontWeight: '500',
  },
  characterPanelTitleRow: {
    paddingTop: 24,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingBottom: 12,
  },
  characterPanelTitle: {
    color: '#1f2937',
    fontSize: 18,
    fontWeight: '600',
  },
  characterPanelCountText: {
    color: '#9ca3af',
    fontSize: 12,
    lineHeight: 16,
  },
  characterListWrap: {
    height: 261,
  },
  characterListScroll: {
    paddingHorizontal: 20,
    gap: 4,
  },
  characterCardItem: {
    width: 98,
  },
  characterPoster: {
    width: 98,
    height: 214,
    borderRadius: 16,
    borderWidth: 2,
    borderColor: '#ffffff',
    backgroundColor: 'transparent',
    overflow: 'hidden',
    shadowColor: '#000000',
    shadowOpacity: 0.1,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 6 },
  },
  characterPosterPrimary: {
    borderColor: '#fde047',
  },
  characterPosterUnlocked: {
    borderColor: '#ffffff',
  },
  characterPosterLocked: {
    backgroundColor: '#f3f4f6',
    borderColor: '#ffffff',
  },
  characterPosterImage: {
    ...StyleSheet.absoluteFillObject,
  },
  characterPosterImageLocked: {
    opacity: 0.4,
  },
  characterPosterOverlay: {
    ...StyleSheet.absoluteFillObject,
  },
  characterPosterMetaRow: {
    position: 'absolute',
    left: 10,
    bottom: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  characterPosterMetaText: {
    color: '#fde047',
    fontSize: 8,
    lineHeight: 14,
  },
  characterPosterName: {
    position: 'absolute',
    left: 10,
    bottom: 32,
    color: '#ffffff',
    fontSize: 18,
    fontWeight: '700',
  },
  characterPosterNameLocked: {
    fontSize: 14,
    fontWeight: '500',
  },
  characterPosterLockBadge: {
    position: 'absolute',
    left: '50%',
    top: '50%',
    marginLeft: -15,
    marginTop: -28,
    width: 30,
    height: 30,
    alignItems: 'center',
    justifyContent: 'center',
  },
  characterPosterSubText: {
    marginTop: 8,
    color: '#6b7280',
    fontSize: 12,
    lineHeight: 16,
    textAlign: 'center',
  },
  characterPosterSubTextLocked: {
    color: '#9ca3af',
  },
  iconicModalRoot: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  iconicModalBackdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.45)',
  },
  iconicModalCenter: {
    width: '86%',
    alignItems: 'center',
  },
  iconicModalImageCard: {
    width: '100%',
    aspectRatio: 302 / 402,
    borderRadius: 18,
    overflow: 'hidden',
    backgroundColor: '#111827',
  },
  iconicModalImage: {
    width: '100%',
    height: '100%',
  },
  iconicModalPlaceholder: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 20,
    backgroundColor: '#1f2937',
  },
  iconicModalPlaceholderText: {
    color: '#d1d5db',
    fontSize: 13,
    textAlign: 'center',
  },
  iconicModalActions: {
    marginTop: 16,
    flexDirection: 'row',
    gap: 14,
  },
  iconicModalActionButton: {
    borderRadius: 999,
    borderWidth: 1,
    borderColor: '#d1d5db',
    backgroundColor: 'rgba(255,255,255,0.9)',
    paddingHorizontal: 20,
    paddingVertical: 10,
  },
  iconicModalActionText: {
    color: '#111827',
    fontSize: 14,
    fontWeight: '500',
  },
});
