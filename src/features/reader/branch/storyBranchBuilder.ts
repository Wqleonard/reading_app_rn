import type { StoryWithNodes } from '@/src/data/story/types';

export type BranchMapNode = {
  id: string;
  title: string;
  isVisited: boolean;
  isLocked: boolean;
  isStart: boolean;
  isEnd: boolean;
  imageUrl: string | null;
};

export type BranchMapEdgeCard = {
  label: string;
  imageUrl: string | null;
};

export type BranchMapEdge = {
  fromId: string;
  toId: string;
  isDashed: boolean;
  card: BranchMapEdgeCard | null;
};

// Flutter 对应：StoryBranchBuilder.buildColumns()
export function buildBranchColumns(
  story: StoryWithNodes,
  visitedNodeIds: Set<string>
): BranchMapNode[][] {
  const graph = story.branchGraph;
  if (!graph) return [];
  const sortedColumns = [...graph.columns].sort((a, b) => a.columnIndex - b.columnIndex);
  return sortedColumns.map((column) =>
    column.nodes.map((nodeDef) => ({
      id: nodeDef.id,
      title: nodeDef.title,
      isVisited: nodeDef.isLocked ? false : visitedNodeIds.has(nodeDef.id),
      isLocked: nodeDef.isLocked,
      isStart: nodeDef.isStart,
      isEnd: nodeDef.isEnd,
      imageUrl: nodeDef.imageUrl ?? null,
    }))
  );
}

// Flutter 对应：StoryBranchBuilder.buildEdges()
export function buildBranchEdges(story: StoryWithNodes): BranchMapEdge[] {
  const graph = story.branchGraph;
  if (!graph) return [];
  return graph.edges.map((edgeDef) => ({
    fromId: edgeDef.fromId,
    toId: edgeDef.toId,
    isDashed: edgeDef.isDashed,
    card: edgeDef.characterCard
      ? {
          label: edgeDef.characterCard.name,
          imageUrl: edgeDef.characterCard.imageUrl ?? null,
        }
      : null,
  }));
}
