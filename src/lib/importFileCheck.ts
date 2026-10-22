// 取り込むファイルの問題を、アップロードする前に名前とサイズだけで見つける。
// 文言はサーバー（cocodake の src/lib/importFileCheck.ts）と同じ。中身の確認はサーバーが行う

export const IMPORT_MAX_BYTES = 10 * 1024 * 1024;

export const IMPORT_FILE_ERRORS = {
  tooLarge: 'ファイルが大きすぎます（10MBまで）',
  zip: 'zipファイルのままです。解凍して、中のCSV（例:「行ってみたい.csv」）かJSONを選んでください',
  unsupported: '対応していないファイル形式です。Google TakeoutのCSVかJSONを選んでください',
} as const;

const TEXT_EXTENSIONS = ['json', 'csv', 'txt'];

// 拡張子のない名前は通す（中身はサーバーが見る）
export function checkImportFileName(name: string, size: number): string | null {
  if (size > IMPORT_MAX_BYTES) return IMPORT_FILE_ERRORS.tooLarge;
  const ext = name.toLowerCase().match(/\.([a-z0-9]+)$/)?.[1];
  if (ext === 'zip') return IMPORT_FILE_ERRORS.zip;
  if (ext && !TEXT_EXTENSIONS.includes(ext)) return IMPORT_FILE_ERRORS.unsupported;
  return null;
}
