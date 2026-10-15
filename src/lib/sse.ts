// /api/import の Server-Sent Events を1行ずつ読む。
// React Native の fetch はレスポンスをストリームで読めないので、
// 全文を受け取ってから parseSseEvents で取り出す経路もある。
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
