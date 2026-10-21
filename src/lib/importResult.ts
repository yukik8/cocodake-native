import type { ImportEvent, NotFoundPlace } from './api';

export type ImportDone = Extract<ImportEvent, { type: 'done' }>;

// Takeout インポート完了時のメッセージ。
// 旧サーバーは parsed / duplicates / geocodeFailed を返さないので、無い項目は省く。
export function importResultMessage(done: ImportDone): string {
  const details: string[] = [];
  if ((done.duplicates ?? 0) > 0) details.push(`重複 ${done.duplicates}件スキップ`);
  if ((done.geocodeFailed ?? 0) > 0) details.push(`座標取得失敗 ${done.geocodeFailed}件`);
  const suffix = details.length > 0 ? `（${details.join('、')}）` : '';
  // 全部が重複・座標取得失敗だったときは「0件を新規追加しました」と書かない
  const added = done.imported > 0 ? `${done.imported}件を新規追加しました` : '新規追加はありませんでした';
  const prefix = typeof done.parsed === 'number' ? `ファイル内 ${done.parsed}件中${done.imported > 0 ? ' ' : '、'}` : '';
  return `${prefix}${added}${suffix}`;
}

// 見つからなかったスポット。リンクから1件ずつ追加してもらう。サーバーが送るのは最大100件で、
// 残りは more に数える。リンクは http(s) のものだけ残す
export function notFoundPlaces(done: ImportDone): { places: NotFoundPlace[]; more: number } {
  const places = (done.notFound ?? []).map((p) => ({
    name: p.name,
    url: p.url && /^https?:\/\//i.test(p.url) ? p.url : null,
  }));
  return { places, more: Math.max(0, (done.geocodeFailed ?? 0) - places.length) };
}
