export type ChatHistoryItem = {
  role: 'user' | 'assistant';
  content: string;
};

type QwenChatParams = {
  characterName: string;
  characterTags?: string;
  characterDescription?: string;
  history: ChatHistoryItem[];
  userMessage: string;
};

const DASHSCOPE_BASE_URL = 'https://dashscope.aliyuncs.com/compatible-mode/v1';
const DEFAULT_MODEL = process.env.EXPO_PUBLIC_DASHSCOPE_MODEL ?? 'qwen-turbo';
const DASHSCOPE_API_KEY = process.env.EXPO_PUBLIC_DASHSCOPE_API_KEY ?? '';
// Keep parity with Flutter baseline: env key takes priority, fallback key keeps local debug usable.
const DASHSCOPE_FALLBACK_API_KEY = 'sk-be336edee16e4334880bb8fd1e501e77';

function assertApiKey(): string {
  const apiKey = DASHSCOPE_API_KEY.trim() || DASHSCOPE_FALLBACK_API_KEY.trim();
  if (!apiKey) {
    console.error('[qwen] api key missing: EXPO_PUBLIC_DASHSCOPE_API_KEY');
    throw new Error('Missing EXPO_PUBLIC_DASHSCOPE_API_KEY');
  }
  return apiKey;
}

function buildSystemPrompt(
  characterName: string,
  characterTags?: string,
  characterDescription?: string
): string {
  const lines: string[] = [];
  lines.push(`你现在扮演一个名叫「${characterName}」的角色，与用户进行对话。`);
  if (characterTags?.trim()) {
    lines.push(`角色特质：${characterTags.trim()}`);
  }
  if (characterDescription?.trim()) {
    lines.push(`角色简介：${characterDescription.trim()}`);
  }
  lines.push('');
  lines.push('输出要求：');
  lines.push('- 始终以第一人称扮演该角色，不要跳出角色');
  lines.push('- 回复风格符合角色特质，语气自然亲切');
  lines.push('- 可以使用 Markdown（例如加粗、列表、代码块）');
  lines.push('- 优先输出纯文本/Markdown，不要输出 JSON 包裹结构');
  lines.push('- 不要提及自己是 AI 或语言模型');
  return lines.join('\n');
}

function buildMessages(params: QwenChatParams) {
  return [
    {
      role: 'system',
      content: buildSystemPrompt(
        params.characterName,
        params.characterTags,
        params.characterDescription
      ),
    },
    ...params.history.map((item) => ({ role: item.role, content: item.content })),
    { role: 'user', content: params.userMessage },
  ];
}

function parseContent(data: unknown): string {
  const payload = data as
    | {
        choices?: Array<{
          message?: { content?: string };
        }>;
      }
    | undefined;
  const content = payload?.choices?.[0]?.message?.content;
  return typeof content === 'string' ? content.trim() : '';
}

function parseSseDelta(line: string): string {
  if (!line.startsWith('data:')) return '';
  const body = line.slice(5).trim();
  if (!body || body === '[DONE]') return '';
  try {
    const json = JSON.parse(body) as {
      choices?: Array<{ delta?: { content?: string } }>;
    };
    const delta = json.choices?.[0]?.delta?.content;
    return typeof delta === 'string' ? delta : '';
  } catch {
    return '';
  }
}

export async function chatWithQwen(params: QwenChatParams): Promise<string> {
  const apiKey = assertApiKey();
  console.log('[qwen] chat request', {
    model: DEFAULT_MODEL,
    historySize: params.history.length,
    hasTags: Boolean(params.characterTags),
    hasDescription: Boolean(params.characterDescription),
  });
  const response = await fetch(`${DASHSCOPE_BASE_URL}/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: DEFAULT_MODEL,
      messages: buildMessages(params),
      max_tokens: 600,
      temperature: 0.9,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error('[qwen] chat failed', {
      status: response.status,
      body: errorText,
    });
    throw new Error(`DashScope request failed (${response.status}): ${errorText}`);
  }

  const data = (await response.json()) as unknown;
  const content = parseContent(data);
  if (!content) {
    console.error('[qwen] chat empty content', { data });
    throw new Error('DashScope returned empty content');
  }
  return content;
}

export async function* chatWithQwenStream(
  params: QwenChatParams
): AsyncGenerator<string> {
  const apiKey = assertApiKey();
  console.log('[qwen] stream request', {
    model: DEFAULT_MODEL,
    historySize: params.history.length,
    hasTags: Boolean(params.characterTags),
    hasDescription: Boolean(params.characterDescription),
  });
  const response = await fetch(`${DASHSCOPE_BASE_URL}/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'text/event-stream',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: DEFAULT_MODEL,
      messages: buildMessages(params),
      max_tokens: 600,
      temperature: 0.9,
      stream: true,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error('[qwen] stream failed', {
      status: response.status,
      body: errorText,
    });
    throw new Error(`DashScope stream failed (${response.status}): ${errorText}`);
  }

  // Fallback: environments without streaming body support.
  if (!response.body || typeof response.body.getReader !== 'function') {
    console.warn('[qwen] stream unsupported body; fallback to non-stream');
    const content = await chatWithQwen(params);
    if (content) yield content;
    return;
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder('utf-8');
  let buffer = '';
  let hasYielded = false;

  while (true) {
    const { value, done } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split('\n');
    buffer = lines.pop() ?? '';

    for (const line of lines) {
      const trimmed = line.trim();
      if (trimmed === 'data: [DONE]') return;
      const delta = parseSseDelta(trimmed);
      if (delta) {
        hasYielded = true;
        yield delta;
      }
    }
  }

  // Some RN runtimes can return a completed stream without usable chunks.
  if (!hasYielded) {
    console.warn('[qwen] stream completed without delta; fallback to non-stream');
    const content = await chatWithQwen(params);
    if (content) yield content;
  }
}
