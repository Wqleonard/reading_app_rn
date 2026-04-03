import { useEffect, useMemo, useState } from 'react';
import { useLocalSearchParams } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { getStoryById } from '@/src/data/story/storyService';
import type { StoryChoice, StoryNode, StoryWithNodes } from '@/src/data/story/types';
import { readingProgressRepository } from '@/src/storage/db/repositories/readingProgressRepository';

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
  const pureMode = mode === 'pure';
  const { t } = useTranslation();
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
  const [showDebug, setShowDebug] = useState(false);
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

  useEffect(() => {
    let mounted = true;
    async function bootstrapReader() {
      if (!storyId || !story) return;
      setHydrated(false);
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

      const built = buildContentFromProgress(story, nodeMap, baseProgress, pureMode);
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
  }, [nodeMap, pureMode, story, storyId]);

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

  async function restartReading() {
    if (!story) return;
    await readingProgressRepository.clearByStoryId(story.id);
    const baseProgress: ReaderProgressState = {
      currentNodeId: story.startNodeId,
      choiceHistory: [],
      visitedNodeIds: [],
    };
    const built = buildContentFromProgress(story, nodeMap, baseProgress, pureMode);
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
      pureMode
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
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.title}>{t('reader.title')}</Text>
      <Text style={styles.subtitle}>
        {t('reader.storyId')}: {story.id}
      </Text>
      <Text style={styles.subtitle}>
        {t('reader.currentNode')}: {progressState.currentNodeId}
      </Text>
      <Text style={styles.subtitle}>
        {t('reader.nodeType')}: {currentNode?.type ?? '-'}
      </Text>
      <Text style={styles.subtitle}>
        {t('reader.choiceCount')}: {currentNode?.choices?.length ?? 0}
      </Text>
      <Text style={styles.subtitle}>
        {t('reader.mode')}: {pureMode ? t('reader.modePure') : t('reader.modeInteractive')}
      </Text>
      <Text style={styles.subtitle}>
        {t('reader.progressPercent')}: {progressPercentage}%
      </Text>
      <Text style={styles.subtitle}>
        {t('reader.restoredFrom')}:{' '}
        {restoredFromProgress ? t('reader.restoredProgress') : t('reader.restoredStart')}
      </Text>

      <Pressable style={styles.restartButton} onPress={() => void restartReading()}>
        <Text style={styles.restartButtonText}>{t('reader.startOver')}</Text>
      </Pressable>
      {__DEV__ ? (
        <Pressable style={styles.debugToggleButton} onPress={() => setShowDebug((prev) => !prev)}>
          <Text style={styles.debugToggleText}>{showDebug ? 'Hide debug' : 'Show debug'}</Text>
        </Pressable>
      ) : null}

      {displayedNodeIds.map((nodeId) => {
        const node = nodeMap.get(nodeId);
        if (!node) return null;
        return (
          <View key={node.id} style={styles.nodeCard}>
            {showDebug ? (
              <Text style={styles.nodeDebugTitle}>
                {node.id} · {node.type}
              </Text>
            ) : null}
            <Text style={styles.nodeContent}>{getFullContent(node.content)}</Text>

            {node.type === 'choice' && node.choices && node.choices.length > 0 ? (
              <View style={styles.choiceBox}>
                {!pureMode ? (
                  <>
                    <Text style={styles.choiceTitle}>{t('reader.choosePrompt')}</Text>
                    {node.choices.map((choice) => (
                      <Pressable
                        key={choice.id}
                        style={styles.choiceButton}
                        onPress={() => handleChoice(choice)}
                      >
                        <Text style={styles.choiceText}>{choice.text}</Text>
                      </Pressable>
                    ))}
                  </>
                ) : (
                  <Text style={styles.subtitle}>{t('reader.chooseHintPure')}</Text>
                )}
              </View>
            ) : null}
          </View>
        );
      })}

      {currentNode?.type === 'ending' ? (
        <Text style={styles.endingText}>{t('reader.endingReached')}</Text>
      ) : null}

      {__DEV__ && showDebug ? (
        <View style={styles.debugBox}>
          <Text style={styles.debugTitle}>DEBUG (Flutter alignment)</Text>
          <Text style={styles.debugText}>db.current_node_id: {rawProgressDebug.currentNodeId ?? 'null'}</Text>
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
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  content: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 42,
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
  debugToggleButton: {
    marginTop: 8,
    alignSelf: 'flex-start',
    paddingVertical: 4,
  },
  debugToggleText: {
    color: '#2563eb',
    fontSize: 12,
  },
  nodeCard: {
    marginTop: 20,
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
});
