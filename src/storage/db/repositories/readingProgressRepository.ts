import { getDb } from '@/src/storage/db/client';
import type {
  ReadingProgressRow,
  UpsertReadingProgressInput,
} from '@/src/storage/db/types';

export const readingProgressRepository = {
  async getByStoryId(storyId: string): Promise<ReadingProgressRow | null> {
    const db = await getDb();
    const row = await db.getFirstAsync<ReadingProgressRow>(
      `SELECT * FROM reading_progress WHERE story_id = ? LIMIT 1`,
      [storyId]
    );
    return row ?? null;
  },

  async upsert(input: UpsertReadingProgressInput): Promise<void> {
    const db = await getDb();
    await db.runAsync(
      `INSERT INTO reading_progress
      (story_id, current_node_id, choice_history, visited_node_ids, last_read_at, read_duration, scroll_position, page_index, progress_percentage)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(story_id) DO UPDATE SET
        current_node_id = excluded.current_node_id,
        choice_history = excluded.choice_history,
        visited_node_ids = excluded.visited_node_ids,
        last_read_at = excluded.last_read_at,
        read_duration = excluded.read_duration,
        scroll_position = excluded.scroll_position,
        page_index = excluded.page_index,
        progress_percentage = excluded.progress_percentage`,
      [
        input.storyId,
        input.currentNodeId,
        input.choiceHistoryJson,
        input.visitedNodeIdsJson,
        input.lastReadAtMs,
        input.readDuration,
        input.scrollPosition,
        input.pageIndex,
        input.progressPercentage,
      ]
    );
  },

  async clearByStoryId(storyId: string): Promise<void> {
    const db = await getDb();
    await db.runAsync(`DELETE FROM reading_progress WHERE story_id = ?`, [storyId]);
  },
};
