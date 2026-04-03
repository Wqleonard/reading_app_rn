import { useEffect, useMemo, useState } from 'react';
import { useLocalSearchParams } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { getStoryById } from '@/src/data/story/storyService';
import { readingProgressRepository } from '@/src/storage/db/repositories/readingProgressRepository';
import type { ReadingProgressRow } from '@/src/storage/db/types';
import type { StoryChoice, StoryNode, StoryWithNodes } from '@/src/data/story/types';

function parseJsonArray(raw: string | null): string[] {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed.map((item) => String(item));
  } catch {
    return [];
  }
}

function getNodeMap(story: StoryWithNodes): Map<string, StoryNode> {
  return new Map(story.nodes.map((node) => [node.id, node]));
}

function collectLinearNodes(
  nodeMap: Map<string, StoryNode>,
  startNodeId: string,
  seen: Set<string>,
  includeStart: boolean
): string[] {
  const collected: string[] = [];
  let cursorId: string | null = startNodeId;

  if (!includeStart) {
    const startNode = nodeMap.get(startNodeId);
    cursorId = startNode?.nextNodeId ?? null;
  }

  while (cursorId) {
    if (seen.has(cursorId)) break;
    const node = nodeMap.get(cursorId);
    if (!node) break;

    collected.push(cursorId);
    seen.add(cursorId);

    if (node.type === 'choice' || node.type === 'ending' || !node.nextNodeId) {
      break;
    }
    cursorId = node.nextNodeId;
  }

  return collected;
}

function reconstructPathFromProgress(
  story: StoryWithNodes,
  nodeMap: Map<string, StoryNode>,
  restoredCurrentNodeId: string,
  restoredChoiceIds: string[]
): { displayedNodeIds: string[]; currentNodeId: string } {
  const seen = new Set<string>();
  let displayedNodeIds = collectLinearNodes(nodeMap, story.startNodeId, seen, true);

  for (const choiceId of restoredChoiceIds) {
    const cursorId = displayedNodeIds[displayedNodeIds.length - 1];
    const cursorNode = cursorId ? nodeMap.get(cursorId) : null;
    if (!cursorNode || cursorNode.type !== 'choice') break;
    const matchedChoice = cursorNode.choices?.find((choice) => choice.id === choiceId);
    if (!matchedChoice) break;
    const appended = collectLinearNodes(nodeMap, matchedChoice.targetNodeId, seen, true);
    displayedNodeIds = [...displayedNodeIds, ...appended];
  }

  if (!seen.has(restoredCurrentNodeId)) {
    const appended = collectLinearNodes(nodeMap, restoredCurrentNodeId, seen, true);
    displayedNodeIds = [...displayedNodeIds, ...appended];
  }

  const currentId = displayedNodeIds[displayedNodeIds.length - 1] ?? story.startNodeId;
  return { displayedNodeIds, currentNodeId: currentId };
}

function getContentPreview(content: string): string {
  const normalized = content.replace(/\n+/g, '\n').trim();
  if (normalized.length <= 280) return normalized;
  return `${normalized.slice(0, 280)}...`;
}

export default function ReaderScreen() {
  const { storyId, mode } = useLocalSearchParams<{
    storyId: string;
    mode?: 'interactive' | 'pure';
  }>();
  const { t } = useTranslation();
  const [hydrated, setHydrated] = useState(false);
  const [progress, setProgress] = useState<ReadingProgressRow | null>(null);
  const [displayedNodeIds, setDisplayedNodeIds] = useState<string[]>([]);
  const [choiceHistoryIds, setChoiceHistoryIds] = useState<string[]>([]);
  const [currentNodeId, setCurrentNodeId] = useState<string | null>(null);
  const story = storyId ? getStoryById(storyId) : null;
  const nodeMap = useMemo(() => (story ? getNodeMap(story) : new Map<string, StoryNode>()), [story]);

  useEffect(() => {
    let mounted = true;
    async function bootstrapReader() {
      if (!storyId || !story) return;
      setHydrated(false);
      const row = await readingProgressRepository.getByStoryId(storyId);

      if (!mounted) return;
      setProgress(row);

      const validNodeIds = new Set(story.nodes.map((node) => node.id));
      const restoredCurrentNodeId =
        row?.current_node_id && validNodeIds.has(row.current_node_id)
          ? row.current_node_id
          : story.startNodeId;
      const restoredChoiceIds = parseJsonArray(row?.choice_history ?? null);

      let nextDisplayedIds: string[] = [];
      let nextCurrentNodeId = restoredCurrentNodeId;

      if (row) {
        const reconstructed = reconstructPathFromProgress(
          story,
          nodeMap,
          restoredCurrentNodeId,
          restoredChoiceIds
        );
        nextDisplayedIds = reconstructed.displayedNodeIds;
        nextCurrentNodeId = reconstructed.currentNodeId;
      } else {
        const freshSeen = new Set<string>();
        nextDisplayedIds = collectLinearNodes(nodeMap, story.startNodeId, freshSeen, true);
        nextCurrentNodeId = nextDisplayedIds[nextDisplayedIds.length - 1] ?? story.startNodeId;
      }

      setChoiceHistoryIds(restoredChoiceIds);
      setDisplayedNodeIds(nextDisplayedIds);
      setCurrentNodeId(nextCurrentNodeId);
      setHydrated(true);
    }
    void bootstrapReader();
    return () => {
      mounted = false;
    };
  }, [nodeMap, story, storyId]);

  async function restartReading() {
    if (!story) return;
    await readingProgressRepository.clearByStoryId(story.id);
    setProgress(null);
    setChoiceHistoryIds([]);
    const freshSeen = new Set<string>();
    const freshDisplayed = collectLinearNodes(nodeMap, story.startNodeId, freshSeen, true);
    setDisplayedNodeIds(freshDisplayed);
    setCurrentNodeId(freshDisplayed[freshDisplayed.length - 1] ?? story.startNodeId);
  }

  function followChoice(choice: StoryChoice) {
    if (!story) return;
    const seen = new Set(displayedNodeIds);
    const appendedIds = collectLinearNodes(nodeMap, choice.targetNodeId, seen, true);
    const nextDisplayedIds = [...displayedNodeIds, ...appendedIds];
    setDisplayedNodeIds(nextDisplayedIds);
    setCurrentNodeId(nextDisplayedIds[nextDisplayedIds.length - 1] ?? choice.targetNodeId);
    setChoiceHistoryIds((prev) => [...prev, choice.id]);
  }

  const currentNode = useMemo(() => {
    if (!currentNodeId) return null;
    return nodeMap.get(currentNodeId) ?? null;
  }, [currentNodeId, nodeMap]);

  useEffect(() => {
    if (!hydrated || !story || !currentNode || mode !== 'pure' || currentNode.type !== 'choice') {
      return;
    }
    const mainlineChoice =
      currentNode.choices?.find((choice) => choice.isMainline) ?? currentNode.choices?.[0];
    if (mainlineChoice) {
      followChoice(mainlineChoice);
    }
  }, [currentNode, hydrated, mode, story]);

  useEffect(() => {
    if (!hydrated || !story || !currentNodeId) return;
    const progressPercentage =
      story.nodes.length > 0 ? Math.min(100, Math.round((displayedNodeIds.length / story.nodes.length) * 100)) : 0;
    void readingProgressRepository.upsert({
      storyId: story.id,
      currentNodeId,
      choiceHistoryJson: JSON.stringify(choiceHistoryIds),
      visitedNodeIdsJson: JSON.stringify(displayedNodeIds),
      lastReadAtMs: Date.now(),
      readDuration: progress?.read_duration ?? 0,
      scrollPosition: progress?.scroll_position ?? 0,
      pageIndex: progress?.page_index ?? 0,
      progressPercentage,
    });
  }, [choiceHistoryIds, currentNodeId, displayedNodeIds, hydrated, progress?.page_index, progress?.read_duration, progress?.scroll_position, story]);

  if (!story) {
    return (
      <View style={styles.container}>
        <Text style={styles.title}>{t('reader.title')}</Text>
        <Text style={styles.subtitle}>{t('reader.notFound')}</Text>
      </View>
    );
  }

  if (!hydrated) {
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
        {t('reader.currentNode')}: {currentNode?.id ?? '-'}
      </Text>
      <Text style={styles.subtitle}>
        {t('reader.nodeType')}: {currentNode?.type ?? '-'}
      </Text>
      <Text style={styles.subtitle}>
        {t('reader.choiceCount')}: {currentNode?.choices?.length ?? 0}
      </Text>
      <Text style={styles.subtitle}>
        {t('reader.mode')}:{' '}
        {mode === 'pure' ? t('reader.modePure') : t('reader.modeInteractive')}
      </Text>
      <Text style={styles.subtitle}>
        {t('reader.progressPercent')}: {Math.round(progress?.progress_percentage ?? 0)}%
      </Text>
      <Text style={styles.subtitle}>
        {t('reader.restoredFrom')}:{' '}
        {progress ? t('reader.restoredProgress') : t('reader.restoredStart')}
      </Text>

      <Pressable style={styles.restartButton} onPress={() => void restartReading()}>
        <Text style={styles.restartButtonText}>{t('reader.startOver')}</Text>
      </Pressable>

      {displayedNodeIds.map((nodeId) => {
        const node = nodeMap.get(nodeId);
        if (!node) return null;
        return (
          <View key={node.id} style={styles.nodeCard}>
            <Text style={styles.nodeTitle}>
              {node.id} · {node.type}
            </Text>
            <Text style={styles.nodeLabel}>{t('reader.content')}</Text>
            <Text style={styles.nodeContent}>{getContentPreview(node.content)}</Text>
          </View>
        );
      })}

      {currentNode?.type === 'choice' && mode !== 'pure' ? (
        <View style={styles.choiceBox}>
          <Text style={styles.choiceTitle}>{t('reader.choosePrompt')}</Text>
          {currentNode.choices?.map((choice) => (
            <Pressable key={choice.id} style={styles.choiceButton} onPress={() => followChoice(choice)}>
              <Text style={styles.choiceText}>{choice.text}</Text>
            </Pressable>
          ))}
        </View>
      ) : null}

      {currentNode?.type === 'choice' && mode === 'pure' ? (
        <Text style={styles.subtitle}>{t('reader.chooseHintPure')}</Text>
      ) : null}

      {currentNode?.type === 'ending' ? (
        <Text style={styles.endingText}>{t('reader.endingReached')}</Text>
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
    padding: 16,
    paddingBottom: 30,
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
  nodeCard: {
    marginTop: 12,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 12,
    padding: 12,
  },
  nodeTitle: {
    fontWeight: '700',
    color: '#111827',
  },
  nodeLabel: {
    marginTop: 8,
    fontSize: 12,
    color: '#6b7280',
    fontWeight: '600',
  },
  nodeContent: {
    marginTop: 6,
    color: '#111827',
    lineHeight: 20,
  },
  choiceBox: {
    marginTop: 16,
    borderWidth: 1,
    borderColor: '#dbeafe',
    borderRadius: 12,
    padding: 12,
    backgroundColor: '#eff6ff',
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
});
