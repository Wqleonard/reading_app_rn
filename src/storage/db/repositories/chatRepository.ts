import { getDb } from '@/src/storage/db/client';
import type { ChatMessageRow } from '@/src/storage/db/types';

export type InsertChatMessageInput = {
  characterId: string;
  messageId: string;
  authorId: string;
  text: string;
  createdAtMs: number;
  status: 'sending' | 'sent' | 'error';
};

export const chatRepository = {
  async listByCharacterId(characterId: string): Promise<ChatMessageRow[]> {
    const db = await getDb();
    const rows = await db.getAllAsync<ChatMessageRow>(
      `SELECT * FROM chat_messages WHERE character_id = ? ORDER BY created_at ASC`,
      [characterId]
    );
    return rows;
  },

  async insert(input: InsertChatMessageInput): Promise<void> {
    const db = await getDb();
    await db.runAsync(
      `INSERT INTO chat_messages
      (character_id, message_id, author_id, text, created_at, status)
      VALUES (?, ?, ?, ?, ?, ?)`,
      [
        input.characterId,
        input.messageId,
        input.authorId,
        input.text,
        input.createdAtMs,
        input.status,
      ]
    );
  },

  async updateStatus(
    messageId: string,
    status: 'sending' | 'sent' | 'error'
  ): Promise<void> {
    const db = await getDb();
    await db.runAsync(`UPDATE chat_messages SET status = ? WHERE message_id = ?`, [
      status,
      messageId,
    ]);
  },

  async clearByCharacterId(characterId: string): Promise<void> {
    const db = await getDb();
    await db.runAsync(`DELETE FROM chat_messages WHERE character_id = ?`, [
      characterId,
    ]);
  },
};
