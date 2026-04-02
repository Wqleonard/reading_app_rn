export type ChatMessageRow = {
  id: number;
  character_id: string;
  message_id: string;
  author_id: string;
  text: string;
  created_at: number;
  status: 'sending' | 'sent' | 'error';
};

export type ReadingProgressRow = {
  id: number;
  story_id: string;
  current_node_id: string;
  choice_history: string | null;
  visited_node_ids: string | null;
  last_read_at: number | null;
  read_duration: number;
  scroll_position: number;
  page_index: number;
  progress_percentage: number;
};

export type UpsertReadingProgressInput = {
  storyId: string;
  currentNodeId: string;
  choiceHistoryJson: string;
  visitedNodeIdsJson: string;
  lastReadAtMs: number;
  readDuration: number;
  scrollPosition: number;
  pageIndex: number;
  progressPercentage: number;
};
