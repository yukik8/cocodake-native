// Google マップの URL から place_id（ChIJ…）を取り出す。
// Web（parseTakeout.ts）・Share Extension（Swift）と同じ規則にそろえている:
//   query_place_id=ChIJ… / place_id=ChIJ… / place_id:ChIJ… を優先し、なければ !1sChIJ…
//   !1s0x…:0x…（フィーチャーID）は place_id ではないので null
const PARAM_RE = /place_id[=:](ChIJ[A-Za-z0-9_-]+)/;
const DATA_RE = /!1s(ChIJ[A-Za-z0-9_-]+)/;

export function extractPlaceIdFromUrl(url: string): string | null {
  if (!url) return null;
  return url.match(PARAM_RE)?.[1] ?? url.match(DATA_RE)?.[1] ?? null;
}
