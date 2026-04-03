export type StoryNodeType =
  | 'normal'
  | 'choice'
  | 'ending'
  | 'branch'
  | 'merge'
  | 'virtual';

export type StoryChoice = {
  id: string;
  text: string;
  description?: string | null;
  targetNodeId: string;
  isMainline: boolean;
  timeLimit?: number | null;
  condition?: Record<string, unknown> | null;
  effect?: Record<string, unknown> | null;
};

export type StoryIconicScene = {
  content: string;
  imageUrl: string;
};

export type StoryNode = {
  id: string;
  storyId: string;
  type: StoryNodeType;
  content: string;
  isMainline: boolean;
  choices: StoryChoice[] | null;
  nextNodeId: string | null;
  unlockCondition: Record<string, unknown> | null;
  metadata: Record<string, unknown> | null;
  iconicScene: StoryIconicScene | null;
};

export type StoryCharacterWork = {
  id: string;
  title: string;
  cover?: string;
  description?: string;
  popularity?: number;
};

export type StoryCharacter = {
  id: string;
  name: string;
  identity?: string;
  position?: string;
  avatar?: string;
  cover?: string;
  tags?: string[] | string;
  quote?: string;
  profile?: string;
  subtitle?: string;
  isInteracted?: boolean;
  encounterCount?: number;
  popularity?: number;
  time?: string;
  works?: StoryCharacterWork[];
};

export type StoryComment = {
  id: string;
  userAvatar: string;
  userName: string;
  content: string;
  likeCount: number;
  isLiked: boolean;
  time: string;
};

export type StoryBranchGraphNodeDef = {
  id: string;
  title: string;
  isStart: boolean;
  isEnd: boolean;
  isLocked: boolean;
  imageUrl: string | null;
};

export type StoryBranchGraphColumn = {
  columnIndex: number;
  nodes: StoryBranchGraphNodeDef[];
};

export type StoryBranchGraphCharacterCard = {
  name: string;
  imageUrl: string | null;
};

export type StoryBranchGraphEdgeDef = {
  fromId: string;
  toId: string;
  isDashed: boolean;
  characterCard: StoryBranchGraphCharacterCard | null;
};

export type StoryBranchGraph = {
  columns: StoryBranchGraphColumn[];
  edges: StoryBranchGraphEdgeDef[];
};

export type StoryWithNodes = {
  id: string;
  title: string;
  cover: string;
  description: string;
  startNodeId: string;
  author?: string;
  avatar?: string;
  tags: string[];
  isFollowedAuthor?: boolean;
  isLiked?: boolean;
  likeCount?: number;
  isBookmarked?: boolean;
  bookmarkCount?: number;
  totalCommentCount?: number;
  comments: StoryComment[];
  mainCharacters: StoryCharacter[];
  metadata: Record<string, unknown>;
  nodes: StoryNode[];
  branchGraph: StoryBranchGraph | null;
};
