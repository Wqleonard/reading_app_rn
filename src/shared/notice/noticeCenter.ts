type NoticePayload = {
  id: number;
  message: string;
  durationMs: number;
};

type NoticeListener = (payload: NoticePayload) => void;

const listeners = new Set<NoticeListener>();
let seed = 0;

export function showGlobalNotice(message: string, durationMs = 1800): void {
  const text = message.trim();
  if (!text) return;
  const payload: NoticePayload = {
    id: ++seed,
    message: text,
    durationMs,
  };
  listeners.forEach((listener) => listener(payload));
}

export function subscribeGlobalNotice(listener: NoticeListener): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export type { NoticePayload };
