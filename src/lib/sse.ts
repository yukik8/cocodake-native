// /api/import の Server-Sent Events を1行ずつ読む。
// React Native の fetch は応答を最後まで受け取ってから渡すので、取り込みは XMLHttpRequest で
// 届いた分ずつ読む（createSseTextConsumer）。
export function parseSseLines(lines: string[]): unknown[] {
  const events: unknown[] = [];
  for (const line of lines) {
    if (!line.startsWith('data: ')) continue;
    try {
      events.push(JSON.parse(line.slice(6)));
    } catch {
      // 壊れた行は無視
    }
  }
  return events;
}

export function parseSseEvents(text: string): unknown[] {
  return parseSseLines(text.split('\n'));
}

// XMLHttpRequest の responseText は届いた分だけ伸びていく。そのたびに全文を push すると、
// 新しく届いた完全な行のイベントだけを返す（行の途中で切れていたら、続きが届いてから読む）
export function createSseTextConsumer() {
  let seen = 0;
  let pending = '';
  return {
    push(fullText: string): unknown[] {
      if (fullText.length <= seen) return [];
      pending += fullText.slice(seen);
      seen = fullText.length;
      const lines = pending.split('\n');
      pending = lines.pop() ?? '';
      return parseSseLines(lines);
    },
    end(): unknown[] {
      const rest = pending;
      pending = '';
      return parseSseEvents(rest);
    },
  };
}
