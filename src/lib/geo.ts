// [west, south, east, north]
export type Bounds = [number, number, number, number];

export function isInBounds(p: { lat: number; lng: number }, [west, south, east, north]: Bounds): boolean {
  return p.lng >= west && p.lng <= east && p.lat >= south && p.lat <= north;
}

export function placesInBounds<T extends { lat: number; lng: number }>(places: T[], bounds: Bounds): T[] {
  return places.filter((p) => isInBounds(p, bounds));
}

// 表示範囲を上下左右に ratio 分だけ広げる（少しのパンでクラスターを作り直さないため）
export function padBounds([west, south, east, north]: Bounds, ratio: number): Bounds {
  const dx = (east - west) * ratio;
  const dy = (north - south) * ratio;
  return [west - dx, Math.max(-90, south - dy), east + dx, Math.min(90, north + dy)];
}

function contains(outer: Bounds, inner: Bounds): boolean {
  return inner[0] >= outer[0] && inner[1] >= outer[1] && inner[2] <= outer[2] && inner[3] <= outer[3];
}

export interface ClusterRegion {
  zoom: number; // 整数ズーム（Supercluster に渡す値）
  bounds: Bounds; // クラスターを計算した（広げた）範囲
}

// 新しい表示範囲でクラスターを計算し直す必要があるか。
// 整数ズームが変わったか、表示範囲が前回計算した範囲からはみ出したときだけ true。
export function nextClusterRegion(prev: ClusterRegion | null, view: Bounds, zoom: number, padRatio = 0.5): ClusterRegion | null {
  const z = Math.floor(zoom);
  if (prev && prev.zoom === z && contains(prev.bounds, view)) return null;
  return { zoom: z, bounds: padBounds(view, padRatio) };
}
