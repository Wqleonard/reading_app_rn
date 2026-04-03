import type {
  StoryBranchGraph,
  StoryBranchGraphCharacterCard,
  StoryBranchGraphColumn,
  StoryBranchGraphEdgeDef,
  StoryBranchGraphNodeDef,
  StoryChoice,
  StoryIconicScene,
  StoryNode,
  StoryNodeType,
  StoryWithNodes,
} from '@/src/data/story/types';

const nodeTypes: Set<StoryNodeType> = new Set([
  'normal',
  'choice',
  'ending',
  'branch',
  'merge',
  'virtual',
]);

function toRecord(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  return value as Record<string, unknown>;
}

function parseChoice(raw: unknown): StoryChoice {
  const row = toRecord(raw);
  if (!row) throw new Error('Invalid story choice row');

  return {
    id: String(row.id ?? ''),
    text: String(row.text ?? ''),
    description:
      typeof row.description === 'string' ? row.description : (row.description as null),
    targetNodeId: String(row.target_node_id ?? ''),
    isMainline: Boolean(row.is_mainline),
    timeLimit: typeof row.time_limit === 'number' ? row.time_limit : null,
    condition: toRecord(row.condition),
    effect: toRecord(row.effect),
  };
}

function parseIconicScene(raw: unknown): StoryIconicScene | null {
  const row = toRecord(raw);
  if (!row) return null;

  return {
    content: String(row.content ?? ''),
    imageUrl: String(row.image_url ?? ''),
  };
}

function parseNode(raw: unknown): StoryNode {
  const row = toRecord(raw);
  if (!row) throw new Error('Invalid story node row');

  const rawType = String(row.type ?? 'normal') as StoryNodeType;
  const type: StoryNodeType = nodeTypes.has(rawType) ? rawType : 'normal';

  const choices = Array.isArray(row.choices)
    ? row.choices.map(parseChoice)
    : null;

  return {
    id: String(row.id ?? ''),
    storyId: String(row.story_id ?? ''),
    type,
    content: String(row.content ?? ''),
    isMainline: Boolean(row.is_mainline),
    choices,
    nextNodeId:
      typeof row.next_node_id === 'string' ? row.next_node_id : null,
    unlockCondition: toRecord(row.unlock_condition),
    metadata: toRecord(row.metadata),
    iconicScene: parseIconicScene(row.iconic_scene),
  };
}

function parseGraphNode(raw: unknown): StoryBranchGraphNodeDef {
  const row = toRecord(raw);
  if (!row) throw new Error('Invalid branch graph node row');

  return {
    id: String(row.id ?? ''),
    title: String(row.title ?? ''),
    isStart: Boolean(row.is_start),
    isEnd: Boolean(row.is_end),
    isLocked: Boolean(row.is_locked),
    imageUrl: typeof row.image_url === 'string' ? row.image_url : null,
  };
}

function parseGraphColumn(raw: unknown): StoryBranchGraphColumn {
  const row = toRecord(raw);
  if (!row) throw new Error('Invalid branch graph column row');

  return {
    columnIndex: Number(row.column_index ?? 0),
    nodes: Array.isArray(row.nodes) ? row.nodes.map(parseGraphNode) : [],
  };
}

function parseEdgeCard(raw: unknown): StoryBranchGraphCharacterCard | null {
  const row = toRecord(raw);
  if (!row) return null;

  return {
    name: String(row.name ?? ''),
    imageUrl: typeof row.image_url === 'string' ? row.image_url : null,
  };
}

function parseGraphEdge(raw: unknown): StoryBranchGraphEdgeDef {
  const row = toRecord(raw);
  if (!row) throw new Error('Invalid branch graph edge row');

  return {
    fromId: String(row.from_id ?? ''),
    toId: String(row.to_id ?? ''),
    isDashed: Boolean(row.is_dashed),
    characterCard: parseEdgeCard(row.character_card),
  };
}

function parseBranchGraph(raw: unknown): StoryBranchGraph | null {
  const row = toRecord(raw);
  if (!row) return null;

  return {
    columns: Array.isArray(row.columns) ? row.columns.map(parseGraphColumn) : [],
    edges: Array.isArray(row.edges) ? row.edges.map(parseGraphEdge) : [],
  };
}

export function parseStoryWithNodes(raw: unknown): StoryWithNodes {
  const row = toRecord(raw);
  if (!row) {
    throw new Error('Invalid story JSON: root must be object');
  }

  const nodes = Array.isArray(row.nodes) ? row.nodes.map(parseNode) : [];
  const comments = Array.isArray(row.comments)
    ? (row.comments as StoryWithNodes['comments'])
    : [];
  const mainCharacters = Array.isArray(row.main_characters)
    ? (row.main_characters as StoryWithNodes['mainCharacters'])
    : [];
  const tags = Array.isArray(row.tags)
    ? row.tags.map((v) => String(v))
    : [];

  const parsed: StoryWithNodes = {
    id: String(row.id ?? ''),
    title: String(row.title ?? ''),
    cover: String(row.cover ?? ''),
    description: String(row.description ?? ''),
    startNodeId: String(row.start_node_id ?? ''),
    author: typeof row.author === 'string' ? row.author : undefined,
    avatar: typeof row.avatar === 'string' ? row.avatar : undefined,
    tags,
    isFollowedAuthor: Boolean(row.isFollowedAuthor),
    isLiked: Boolean(row.isLiked),
    likeCount: Number(row.likeCount ?? 0),
    isBookmarked: Boolean(row.isBookmarked),
    bookmarkCount: Number(row.bookmarkCount ?? 0),
    totalCommentCount: Number(row.totalCommentCount ?? comments.length),
    comments,
    mainCharacters,
    metadata: toRecord(row.metadata) ?? {},
    nodes,
    branchGraph: parseBranchGraph(row.branch_graph),
  };

  if (!parsed.id || !parsed.startNodeId || parsed.nodes.length === 0) {
    throw new Error('Invalid story JSON: missing required core fields');
  }

  return parsed;
}
