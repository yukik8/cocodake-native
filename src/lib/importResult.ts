import type { ImportEvent } from './api';

export type ImportDone = Extract<ImportEvent, { type: 'done' }>;

// Takeout インポート完了時のメッセージ。
// 旧サーバーは parsed / duplicates / geocodeFailed を返さないので、無い項目は省く。
export function importResultMessage(done: ImportDone): string {
  const details: string[] = [];
  if ((done.duplicates ?? 0) > 0) details.push(`重複 ${done.duplicates}件スキップ`);
  if ((done.geocodeFailed ?? 0) > 0) details.push(`座標取得失敗 ${done.geocodeFailed}件`);
  const suffix = details.length > 0 ? `（${details.join('、')}）` : '';
  const prefix = typeof done.parsed === 'number' ? `ファイル内 ${done.parsed}件中 ` : '';
  return `${prefix}${done.imported}件を新規追加しました${suffix}`;
}
