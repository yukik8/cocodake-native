import { useRef, useState, useCallback, useEffect, useMemo } from 'react';
import Supercluster from 'supercluster';
import {
  StyleSheet, View, Text, TouchableOpacity,
  TextInput, FlatList, ActivityIndicator,
  Image, Linking, Keyboard,
  type NativeSyntheticEvent,
} from 'react-native';
import {
  Map, Camera, GeoJSONSource, Layer,
  type MapRef, type CameraRef, type PressEvent, type PressEventWithFeatures,
  type ViewStateChangeEvent,
} from '@maplibre/maplibre-react-native';
import * as Location from 'expo-location';
import type { Place } from '../types';
import { previewByCoords, previewByPlaceId, addPlace, searchPlaces, deletePlace, updateNote } from '../lib/api';
import type { PreviewResult, SearchResult } from '../lib/api';
import PlaceCard from '../components/PlaceCard';
import Toast from '../components/Toast';
import ConfirmDialog from '../components/ConfirmDialog';
import { Ionicons } from '@expo/vector-icons';

const MAPTILER_KEY = process.env.EXPO_PUBLIC_MAPTILER_KEY ?? '';
const STYLE_URL = MAPTILER_KEY
  ? `https://api.maptiler.com/maps/streets-v2/style.json?key=${MAPTILER_KEY}`
  : 'https://demotiles.maplibre.org/style.json';

interface MapScreenProps {
  places: Place[];
  selectedIds: Set<string>;
  onToggleSelect: (id: string) => void;
  onClearAll: () => void;
  sessionId: string;
  onPlaceAdded: () => void;
  focusedPlace?: Place | null;
  onClearFocus?: () => void;
  shareSelectMode?: boolean;
  onEnterShareSelectMode?: () => void;
}

export default function MapScreen({
  places,
  selectedIds,
  onToggleSelect,
  onClearAll,
  sessionId,
  onPlaceAdded,
  focusedPlace,
  onClearFocus,
  shareSelectMode = false,
  onEnterShareSelectMode,
}: MapScreenProps) {
  const mapRef = useRef<MapRef>(null);
  const cameraRef = useRef<CameraRef>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [searchFocused, setSearchFocused] = useState(false);
  const searchTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const searchInputRef = useRef<TextInput>(null);

  const handleSearchCancel = useCallback(() => {
    setSearchQuery('');
    setSearchResults([]);
    setSearchFocused(false);
    Keyboard.dismiss();
  }, []);

  // タッププレビュー
  const [preview, setPreview] = useState<(PreviewResult & { loading: boolean; saving: boolean; isExisting?: boolean; existingId?: string; note?: string | null }) | null>(null);

  // リストからフォーカスされた場所へ飛ぶ
  useEffect(() => {
    if (!focusedPlace) return;
    cameraRef.current?.flyTo({
      center: [focusedPlace.lng, focusedPlace.lat],
      zoom: 16,
      duration: 600,
    });
    // 情報カードを表示（リスト済みなので追加ボタンは出さない）
    setPreview({
      lat: focusedPlace.lat,
      lng: focusedPlace.lng,
      name: focusedPlace.name,
      address: focusedPlace.address,
      category: focusedPlace.category,
      rating: focusedPlace.rating,
      photo_url: focusedPlace.photo_url,
      place_id: null,
      loading: false,
      saving: false,
      isExisting: true,
      existingId: focusedPlace.id,
      note: focusedPlace.note,
    });
    onClearFocus?.();
  }, [focusedPlace]);

  // リスト済み場所の削除
  const [deleteConfirmVisible, setDeleteConfirmVisible] = useState(false);

  const handleDeleteExisting = useCallback(() => {
    if (!preview?.existingId) return;
    setDeleteConfirmVisible(true);
  }, [preview]);

  const handleConfirmDeleteExisting = useCallback(async () => {
    if (!preview?.existingId) return;
    const id = preview.existingId;
    setDeleteConfirmVisible(false);
    await deletePlace(id, sessionId);
    setPreview(null);
    onPlaceAdded();
  }, [preview, sessionId, onPlaceAdded]);

  // トースト
  const [toastMsg, setToastMsg] = useState<string | null>(null);
  const showToast = (msg: string) => setToastMsg(msg);

  // エリア選択モード
  const [selectionMode, setSelectionMode] = useState(false);
  const [selectionCount, setSelectionCount] = useState(0);

  const countInBounds = useCallback(async () => {
    const bounds = await mapRef.current?.getBounds();
    if (!bounds) return;
    const [west, south, east, north] = bounds;
    const count = places.filter(
      (p) => p.lng >= west && p.lng <= east && p.lat >= south && p.lat <= north
    ).length;
    setSelectionCount(count);
  }, [places]);

  const handleEnterSelectionMode = useCallback(() => {
    setPreview(null);
    setSelectionMode(true);
    countInBounds();
  }, [countInBounds]);

  const handleConfirmSelection = useCallback(async () => {
    const bounds = await mapRef.current?.getBounds();
    if (!bounds) return;
    const [west, south, east, north] = bounds;
    places
      .filter((p) => p.lng >= west && p.lng <= east && p.lat >= south && p.lat <= north)
      .forEach((p) => { if (!selectedIds.has(p.id)) onToggleSelect(p.id); });
    setSelectionMode(false);
  }, [places, selectedIds, onToggleSelect]);

  // 現在地に移動
  const goToCurrentLocation = useCallback(async () => {
    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== 'granted') return;
    const loc = await Location.getCurrentPositionAsync({});
    cameraRef.current?.flyTo({
      center: [loc.coords.longitude, loc.coords.latitude],
      zoom: 15,
      duration: 600,
    });
  }, []);

  // マップタップで場所プレビュー
  const handleMapPress = useCallback(async (
    event: NativeSyntheticEvent<PressEvent | PressEventWithFeatures>,
  ) => {
    const { lngLat, point } = event.nativeEvent;
    const lng = lngLat[0];
    const lat = lngLat[1];

    Keyboard.dismiss();
    setPreview({ lat, lng, name: null, address: null, category: null, rating: null, photo_url: null, place_id: null, loading: true, saving: false });
    setSearchResults([]);

    try {
      // タップ位置のPOI名をマップタイルから取得（Webアプリと同じ方式）
      let poiName: string | undefined;
      try {
        const features = await mapRef.current?.queryRenderedFeatures(point);
        const poiFeature = features?.find(
          (f) => f.properties?.name && f.geometry.type === 'Point'
        );
        if (poiFeature?.properties?.name) {
          poiName = poiFeature.properties.name as string;
        }
      } catch { /* POI名取得失敗は無視 */ }

      const data = await previewByCoords(lat, lng, poiName);
      if (data.place_id) {
        const existing = places.find((p) => p.place_id === data.place_id);
        if (existing) {
          setPreview({
            lat: existing.lat, lng: existing.lng,
            name: existing.name, address: existing.address,
            category: existing.category, rating: existing.rating,
            photo_url: existing.photo_url, place_id: null,
            loading: false, saving: false,
            isExisting: true, existingId: existing.id,
            note: existing.note,
          });
          return;
        }
        setPreview((p) => p ? { ...p, name: data.name, address: data.address, place_id: data.place_id, loading: true } : null);
        const details = await previewByPlaceId(data.place_id);
        setPreview((p) => p ? { ...p, ...details, loading: false } : null);
      } else {
        setPreview((p) => p ? { ...p, ...data, loading: false } : null);
      }
    } catch (e) {
      // エラー時もピンの位置だけ表示する
      setPreview((p) => p ? { ...p, loading: false } : null);
    }
  }, []);

  // ピンタップ → クラスターなら拡大、個別ピンなら選択トグル
  const handlePinPress = useCallback(async (
    event: NativeSyntheticEvent<PressEventWithFeatures>,
  ) => {
    event.stopPropagation?.();
    const feature = event.nativeEvent.features[0];
    if (!feature) return;

    if (feature.properties?.cluster) {
      const clusterId = feature.properties.cluster_id as number;
      const coords = (feature.geometry as GeoJSON.Point).coordinates;
      const zoom = sc.getClusterExpansionZoom(clusterId);
      cameraRef.current?.flyTo({
        center: [coords[0], coords[1]],
        zoom,
        duration: 400,
      });
      return;
    }

    const id = feature.properties?.id as string | undefined;
    if (!id) return;

    if (shareSelectMode) {
      setPreview(null);
      onToggleSelect(id);
      return;
    }

    const place = places.find((p) => p.id === id);
    if (!place) return;
    setPreview({
      lat: place.lat, lng: place.lng,
      name: place.name, address: place.address,
      category: place.category, rating: place.rating,
      photo_url: place.photo_url, place_id: null,
      loading: false, saving: false,
      isExisting: true, existingId: place.id,
      note: place.note,
    });
  }, [onToggleSelect, shareSelectMode, places]);

  // 検索
  const handleSearch = useCallback((q: string) => {
    setSearchQuery(q);
    if (searchTimerRef.current) clearTimeout(searchTimerRef.current);
    if (!q.trim()) { setSearchResults([]); return; }
    setSearchLoading(true);
    searchTimerRef.current = setTimeout(async () => {
      try {
        const center = await mapRef.current?.getCenter();
        const results = await searchPlaces(q, center?.[1], center?.[0]);
        setSearchResults(results);
      } finally {
        setSearchLoading(false);
      }
    }, 500);
  }, []);

  const handleSearchSelect = useCallback(async (result: SearchResult) => {
    Keyboard.dismiss();
    setSearchQuery('');
    setSearchResults([]);
    cameraRef.current?.flyTo({
      center: [result.lng, result.lat],
      zoom: 16,
      duration: 500,
    });
    const existing = places.find((p) => p.place_id === result.id);
    if (existing) {
      // リスト済み → 削除ボタン付きカードを表示
      setPreview({
        lat: existing.lat, lng: existing.lng,
        name: existing.name, address: existing.address,
        category: existing.category, rating: existing.rating,
        photo_url: existing.photo_url, place_id: null,
        loading: false, saving: false,
        isExisting: true, existingId: existing.id,
        note: existing.note,
      });
      return;
    }
    setPreview({ lat: result.lat, lng: result.lng, name: result.name, address: result.address, category: null, rating: null, photo_url: null, place_id: result.id, loading: true, saving: false });
    try {
      const details = await previewByPlaceId(result.id);
      setPreview((p) => p ? { ...p, ...details, loading: false } : null);
    } catch {
      setPreview((p) => p ? { ...p, loading: false } : null);
    }
  }, [places]);

  // 保存（共通処理）
  const doSave = useCallback(async (): Promise<{ id?: string; name?: string; error?: string }> => {
    if (!preview || !sessionId) return { error: 'no preview' };
    setPreview((p) => p ? { ...p, saving: true } : null);
    const result = await addPlace({
      session: sessionId,
      lat: preview.lat,
      lng: preview.lng,
      place_id: preview.place_id ?? undefined,
      name: preview.name ?? undefined,
      address: preview.address ?? undefined,
      category: preview.category ?? undefined,
      rating: preview.rating ?? undefined,
      photo_url: preview.photo_url ?? undefined,
    });
    if (result.error === 'already_exists') {
      setPreview(null);
      return { error: 'already_exists' };
    } else if (result.error) {
      setPreview((p) => p ? { ...p, saving: false } : null);
      return { error: result.error };
    }
    setPreview(null);
    onPlaceAdded();
    return { id: result.place?.id, name: result.place?.name };
  }, [preview, sessionId, onPlaceAdded]);

  // リストに追加のみ
  const handleSave = useCallback(async () => {
    const res = await doSave();
    if (res.error === 'already_exists') {
      showToast('すでにリストに追加済みです');
    } else if (res.error) {
      showToast(`エラー: ${res.error}`);
    } else {
      showToast(`「${res.name}」をリストに追加しました`);
    }
  }, [doSave]);

  // リスト＋シェアに追加
  const handleSaveAndShare = useCallback(async () => {
    const res = await doSave();
    if (res.error === 'already_exists') {
      showToast('すでにリストに追加済みです');
    } else if (res.error) {
      showToast(`エラー: ${res.error}`);
    } else {
      if (res.id) onToggleSelect(res.id);
      showToast(`「${res.name}」をリスト＋シェアに追加しました`);
    }
  }, [doSave, onToggleSelect]);

  // Supercluster（10件以上でのみクラスター化）
  const sc = useMemo(() => {
    const index = new Supercluster({ radius: 60, maxZoom: 16, minPoints: 10 });
    index.load(places.map((p) => ({
      type: 'Feature' as const,
      geometry: { type: 'Point' as const, coordinates: [p.lng, p.lat] },
      properties: { id: p.id, name: p.name ?? '', selected: selectedIds.has(p.id) },
    })));
    return index;
  }, [places, selectedIds]);

  const [mapRegion, setMapRegion] = useState<{ zoom: number; bounds: [number, number, number, number] } | null>(null);

  const geojson: GeoJSON.FeatureCollection = useMemo(() => {
    if (!mapRegion) {
      return {
        type: 'FeatureCollection',
        features: places.map((p) => ({
          type: 'Feature' as const,
          id: p.id,
          geometry: { type: 'Point' as const, coordinates: [p.lng, p.lat] },
          properties: { id: p.id, name: p.name ?? '', selected: selectedIds.has(p.id) },
        })),
      };
    }
    return {
      type: 'FeatureCollection',
      features: sc.getClusters(mapRegion.bounds, Math.floor(mapRegion.zoom)) as GeoJSON.Feature[],
    };
  }, [sc, mapRegion, places, selectedIds]);

  return (
    <View style={styles.container}>
      <Map
        ref={mapRef}
        style={styles.map}
        mapStyle={STYLE_URL}
        onPress={selectionMode ? undefined : handleMapPress}
        onRegionDidChange={async (e) => {
          Keyboard.dismiss();
          if (selectionMode) { countInBounds(); return; }
          const bounds = await mapRef.current?.getBounds();
          const zoom = await mapRef.current?.getZoom();
          if (bounds && zoom != null) {
            setMapRegion({ zoom, bounds: [bounds[0], bounds[1], bounds[2], bounds[3]] });
          }
        }}
      >
        <Camera
          ref={cameraRef}
          initialViewState={{ center: [139.6917, 35.6895], zoom: 12 }}
        />

        {/* プレビューピン（タップ/検索で選択中の場所） */}
        {preview && (
          <GeoJSONSource
            id="preview-pin"
            data={{
              type: 'FeatureCollection',
              features: [{
                type: 'Feature',
                geometry: { type: 'Point', coordinates: [preview.lng, preview.lat] },
                properties: {},
              }],
            }}
          >
            <Layer
              id="preview-circle"
              type="circle"
              paint={{
                'circle-radius': 12,
                'circle-color': '#f59e0b',
                'circle-stroke-width': 3,
                'circle-stroke-color': '#ffffff',
              }}
            />
          </GeoJSONSource>
        )}

        {/* ピン */}
        <GeoJSONSource id="places" data={geojson} onPress={handlePinPress}>
          {/* クラスター円（Superclusterが10件以上を集約） */}
          <Layer
            id="cluster-circles"
            type="circle"
            filter={['has', 'point_count'] as unknown as string}
            paint={{
              'circle-color': '#3b82f6',
              'circle-radius': ['step', ['get', 'point_count'], 20, 30, 26, 100, 32] as unknown as number,
              'circle-stroke-width': 2,
              'circle-stroke-color': '#ffffff',
            }}
          />
          <Layer
            id="cluster-count"
            type="symbol"
            filter={['has', 'point_count'] as unknown as string}
            layout={{
              'text-field': ['get', 'point_count_abbreviated'] as unknown as string,
              'text-size': 12,
              'text-font': ['Open Sans Bold'],
            }}
            paint={{
              'text-color': '#ffffff',
            }}
          />
          {/* 個別ピン */}
          <Layer
            id="place-circles"
            type="circle"
            filter={['!', ['has', 'point_count']] as unknown as string}
            paint={{
              'circle-radius': 8,
              'circle-color': ['case', ['get', 'selected'], '#10b981', '#ef4444'] as unknown as string,
              'circle-stroke-width': 2,
              'circle-stroke-color': '#ffffff',
            }}
          />
          <Layer
            id="place-labels"
            type="symbol"
            filter={['!', ['has', 'point_count']] as unknown as string}
            layout={{
              'text-field': ['get', 'name'] as unknown as string,
              'text-size': 12,
              'text-offset': [0, 1.5],
              'text-anchor': 'top',
              'text-font': ['Open Sans Bold'],
            }}
            paint={{
              'text-halo-color': '#ffffff',
              'text-halo-width': 2,
              'text-color': ['case', ['get', 'selected'], '#059669', '#dc2626'] as unknown as string,
            }}
          />
        </GeoJSONSource>
      </Map>

      {/* 検索バー */}
      <View style={styles.searchContainer}>
        <View style={styles.searchRow}>
          <View style={styles.searchBar}>
            <TextInput
              ref={searchInputRef}
              style={styles.searchInput}
              placeholder="場所を検索..."
              value={searchQuery}
              onChangeText={handleSearch}
              onFocus={() => setSearchFocused(true)}
              onBlur={() => setSearchFocused(false)}
              returnKeyType="search"
              clearButtonMode="while-editing"
            />
            {searchLoading && <ActivityIndicator size="small" color="#2563eb" style={styles.searchSpinner} />}
          </View>
          {(searchFocused || searchQuery.length > 0) && (
            <TouchableOpacity onPress={handleSearchCancel} style={styles.searchCancelBtn}>
              <Text style={styles.searchCancelText}>キャンセル</Text>
            </TouchableOpacity>
          )}
        </View>
        {searchResults.length > 0 && (
          <View style={styles.searchDropdown}>
            <FlatList
              data={searchResults}
              keyExtractor={(r) => r.id}
              keyboardShouldPersistTaps="handled"
              renderItem={({ item }) => (
                <TouchableOpacity style={styles.searchItem} onPress={() => handleSearchSelect(item)}>
                  <Text style={styles.searchItemName} numberOfLines={1}>{item.name}</Text>
                  <Text style={styles.searchItemAddress} numberOfLines={1}>{item.address}</Text>
                </TouchableOpacity>
              )}
            />
          </View>
        )}
      </View>

      {/* コンパスボタン */}
      <TouchableOpacity
        style={styles.compassBtn}
        onPress={() => cameraRef.current?.setStop({ bearing: 0, duration: 300 })}
      >
        <Ionicons name="compass-outline" size={24} color="#374151" />
      </TouchableOpacity>

      {/* 現在地ボタン */}
      <TouchableOpacity style={styles.locationBtn} onPress={goToCurrentLocation}>
        <Text style={styles.locationBtnText}>◎</Text>
      </TouchableOpacity>

      {/* 拡大縮小ボタン */}
      <View style={styles.zoomBtns}>
        <TouchableOpacity style={styles.zoomBtn} onPress={async () => {
          const zoom = await mapRef.current?.getZoom() ?? 12;
          cameraRef.current?.zoomTo(Math.min(zoom + 1, 22), { duration: 200 });
        }}>
          <Text style={styles.zoomBtnText}>＋</Text>
        </TouchableOpacity>
        <View style={styles.zoomDivider} />
        <TouchableOpacity style={styles.zoomBtn} onPress={async () => {
          const zoom = await mapRef.current?.getZoom() ?? 12;
          cameraRef.current?.zoomTo(Math.max(zoom - 1, 1), { duration: 200 });
        }}>
          <Text style={styles.zoomBtnText}>－</Text>
        </TouchableOpacity>
      </View>

      {/* エリア選択ボタン（通常時） */}
      {!selectionMode && !preview && (
        <TouchableOpacity style={styles.areaBtn} onPress={handleEnterSelectionMode}>
          <Text style={styles.areaBtnText}>⊞ エリア選択</Text>
        </TouchableOpacity>
      )}

      {/* エリア選択モード オーバーレイ */}
      {selectionMode && (
        <>
          {/* 4辺の暗いパネル */}
          <View style={styles.overlayTop} pointerEvents="none" />
          <View style={styles.overlayBottom} pointerEvents="none" />
          <View style={styles.overlayLeft} pointerEvents="none" />
          <View style={styles.overlayRight} pointerEvents="none" />

          {/* 枠線コーナー */}
          <View style={[styles.corner, styles.cornerTL]} pointerEvents="none" />
          <View style={[styles.corner, styles.cornerTR]} pointerEvents="none" />
          <View style={[styles.corner, styles.cornerBL]} pointerEvents="none" />
          <View style={[styles.corner, styles.cornerBR]} pointerEvents="none" />

          {/* カウントバッジ */}
          <View style={styles.selectionBadge} pointerEvents="none">
            <Text style={styles.selectionBadgeText}>
              エリア内: {selectionCount}件
            </Text>
          </View>

          {/* 下部ボタン */}
          <View style={styles.selectionActions}>
            <TouchableOpacity
              style={styles.cancelSelBtn}
              onPress={() => setSelectionMode(false)}
            >
              <Text style={styles.cancelSelBtnText}>キャンセル</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.confirmSelBtn, selectionCount === 0 && styles.confirmSelBtnDisabled]}
              onPress={handleConfirmSelection}
              disabled={selectionCount === 0}
            >
              <Text style={styles.confirmSelBtnText}>
                {selectionCount}件を選択
              </Text>
            </TouchableOpacity>
          </View>
        </>
      )}

      {/* タッププレビューカード */}
      {preview && (
        <PlaceCard
          preview={preview}
          onSave={handleSave}
          onSaveAndShare={handleSaveAndShare}
          onClose={() => setPreview(null)}
          isExisting={preview.isExisting}
          onDelete={preview.existingId ? handleDeleteExisting : undefined}
          hasSelection={selectedIds.size > 0}
          onNoteChange={preview.existingId ? async (note) => {
            await updateNote(preview.existingId!, note, sessionId);
            onPlaceAdded();
          } : undefined}
          onAddToShare={preview.existingId ? () => {
            onToggleSelect(preview.existingId!);
            onEnterShareSelectMode?.();
            setPreview(null);
          } : undefined}
        />
      )}

      <Toast message={toastMsg} onHide={() => setToastMsg(null)} />

      <ConfirmDialog
        visible={deleteConfirmVisible}
        title="削除"
        message="このスポットをリストから削除しますか？"
        onConfirm={handleConfirmDeleteExisting}
        onCancel={() => setDeleteConfirmVisible(false)}
      />

      {/* 選択中スポット トレイ */}
      {!preview && (selectedIds.size > 0 || shareSelectMode) && (
        <View style={styles.tray}>
          <View style={styles.trayHeader}>
            <Text style={styles.trayCount}>
              {selectedIds.size > 0 ? `${selectedIds.size}件選択中` : 'ピンをタップして追加'}
            </Text>
            {selectedIds.size > 0 && (
              <TouchableOpacity onPress={onClearAll} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                <Text style={styles.trayClrAll}>全解除</Text>
              </TouchableOpacity>
            )}
          </View>
          {selectedIds.size > 0 && <FlatList
            horizontal
            data={places.filter((p) => selectedIds.has(p.id))}
            keyExtractor={(p) => p.id}
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.trayScroll}
            keyboardShouldPersistTaps="handled"
            renderItem={({ item: p }) => (
              <View key={p.id} style={styles.trayCard}>
                <TouchableOpacity
                  style={styles.trayCardInner}
                  activeOpacity={0.7}
                  onPressIn={() => cameraRef.current?.flyTo({
                    center: [p.lng, p.lat],
                    zoom: 16,
                    duration: 500,
                  })}
                >
                  {p.photo_url ? (
                    <Image source={{ uri: p.photo_url }} style={styles.trayPhoto} />
                  ) : (
                    <View style={styles.trayPhotoPlaceholder}>
                      <Text style={styles.trayPhotoEmoji}>📍</Text>
                    </View>
                  )}
                  <View style={styles.trayCardBody}>
                    <Text style={styles.trayCardName} numberOfLines={1}>{p.name ?? '不明'}</Text>
                    {p.category ? (
                      <Text style={styles.trayCardCategory} numberOfLines={1}>{p.category}</Text>
                    ) : null}
                    {p.rating ? (
                      <Text style={styles.trayCardRating}>★ {p.rating.toFixed(1)}</Text>
                    ) : null}
                    {p.note ? (
                      <Text style={styles.trayCardNote} numberOfLines={2}>{p.note}</Text>
                    ) : null}
                    <TouchableOpacity
                      style={styles.trayCardMapLink}
                      onPress={async () => {
                        if (p.url) { Linking.openURL(p.url); return; }
                        const googleApp = `comgooglemaps://?q=${p.lat},${p.lng}`;
                        const canOpen = await Linking.canOpenURL(googleApp);
                        Linking.openURL(canOpen ? googleApp : `https://maps.apple.com/?ll=${p.lat},${p.lng}`);
                      }}
                    >
                      <Ionicons name="map-outline" size={11} color="#2563eb" />
                      <Text style={styles.trayCardMapLinkText}>Google Maps</Text>
                    </TouchableOpacity>
                  </View>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.trayCardRemove}
                  onPressIn={() => onToggleSelect(p.id)}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                >
                  <Text style={styles.trayCardRemoveText}>✕</Text>
                </TouchableOpacity>
              </View>
            )}
          />}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  map: { flex: 1 },
  searchContainer: {
    position: 'absolute',
    top: 12,
    left: 12,
    right: 12,
    zIndex: 10,
  },
  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  searchBar: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 12,
    paddingHorizontal: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12,
    shadowRadius: 6,
    elevation: 4,
  },
  searchInput: { flex: 1, height: 44, fontSize: 15, color: '#1f2937' },
  searchSpinner: { marginLeft: 8 },
  searchCancelBtn: { paddingVertical: 8, paddingHorizontal: 4 },
  searchCancelText: { fontSize: 15, color: '#2563eb', fontWeight: '600' },
  searchDropdown: {
    marginTop: 4,
    backgroundColor: '#fff',
    borderRadius: 12,
    maxHeight: 220,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 5,
    overflow: 'hidden',
  },
  searchItem: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#f3f4f6',
  },
  searchItemName: { fontSize: 14, fontWeight: '600', color: '#1f2937' },
  searchItemAddress: { fontSize: 12, color: '#9ca3af', marginTop: 2 },
  compassBtn: {
    position: 'absolute',
    bottom: 256,
    right: 16,
    width: 44,
    height: 44,
    backgroundColor: '#fff',
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 4,
  },
  locationBtn: {
    position: 'absolute',
    bottom: 200,
    right: 16,
    width: 44,
    height: 44,
    backgroundColor: '#fff',
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 4,
  },
  locationBtnText: { fontSize: 22 },

  // 拡大縮小ボタン
  zoomBtns: {
    position: 'absolute',
    right: 16,
    bottom: 308,
    backgroundColor: '#fff',
    borderRadius: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 4,
    overflow: 'hidden',
  },
  zoomBtn: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  zoomBtnText: { fontSize: 22, color: '#374151', lineHeight: 26 },
  zoomDivider: { height: StyleSheet.hairlineWidth, backgroundColor: '#e5e7eb' },

  // エリア選択ボタン
  areaBtn: {
    position: 'absolute',
    bottom: 24,
    alignSelf: 'center',
    backgroundColor: '#1f2937',
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
    elevation: 5,
  },
  areaBtnText: { color: '#fff', fontSize: 14, fontWeight: '600' },

  // エリア選択オーバーレイ
  overlayTop: {
    position: 'absolute', top: 0, left: 0, right: 0,
    height: '20%', backgroundColor: 'rgba(0,0,0,0.35)',
  },
  overlayBottom: {
    position: 'absolute', top: '80%', bottom: 80, left: 0, right: 0,
    backgroundColor: 'rgba(0,0,0,0.35)',
  },
  overlayLeft: {
    position: 'absolute', top: '20%', bottom: '20%',
    left: 0, width: '8%', backgroundColor: 'rgba(0,0,0,0.35)',
  },
  overlayRight: {
    position: 'absolute', top: '20%', bottom: '20%',
    right: 0, width: '8%', backgroundColor: 'rgba(0,0,0,0.35)',
  },
  corner: {
    position: 'absolute',
    width: 20, height: 20,
    borderColor: '#fff',
  },
  cornerTL: { top: '20%', left: '8%', borderTopWidth: 3, borderLeftWidth: 3 },
  cornerTR: { top: '20%', right: '8%', borderTopWidth: 3, borderRightWidth: 3 },
  cornerBL: { bottom: '20%', left: '8%', borderBottomWidth: 3, borderLeftWidth: 3 },
  cornerBR: { bottom: '20%', right: '8%', borderBottomWidth: 3, borderRightWidth: 3 },
  selectionBadge: {
    position: 'absolute',
    top: '18%',
    alignSelf: 'center',
    backgroundColor: '#2563eb',
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 14,
  },
  selectionBadgeText: { color: '#fff', fontSize: 13, fontWeight: '700' },
  selectionActions: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 80,
    backgroundColor: '#fff',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingBottom: 16,
    gap: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 8,
  },
  cancelSelBtn: {
    flex: 1,
    paddingVertical: 13,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    alignItems: 'center',
  },
  cancelSelBtnText: { fontSize: 15, fontWeight: '600', color: '#6b7280' },
  confirmSelBtn: {
    flex: 2,
    paddingVertical: 13,
    borderRadius: 12,
    backgroundColor: '#2563eb',
    alignItems: 'center',
  },
  confirmSelBtnDisabled: { opacity: 0.4 },
  confirmSelBtnText: { fontSize: 15, fontWeight: '700', color: '#fff' },

  // 選択トレイ
  tray: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#fff',
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    paddingBottom: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 10,
  },
  trayHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#f3f4f6',
  },
  trayCount: { fontSize: 12, fontWeight: '600', color: '#6b7280' },
  trayClrAll: { fontSize: 14, fontWeight: '600', color: '#ef4444' },
  trayScroll: { paddingHorizontal: 12, paddingVertical: 10, gap: 10 },
  trayCard: {
    width: 160,
    backgroundColor: '#f9fafb',
    borderRadius: 12,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  trayCardInner: { width: '100%' },
  trayPhoto: { width: '100%', height: 80 },
  trayPhotoPlaceholder: {
    width: '100%',
    height: 80,
    backgroundColor: '#e5e7eb',
    alignItems: 'center',
    justifyContent: 'center',
  },
  trayPhotoEmoji: { fontSize: 28 },
  trayCardBody: { padding: 8, gap: 2 },
  trayCardName: { fontSize: 13, fontWeight: '600', color: '#111827' },
  trayCardCategory: { fontSize: 11, color: '#6b7280' },
  trayCardRating: { fontSize: 11, color: '#f59e0b', fontWeight: '600' },
  trayCardNote: { fontSize: 11, color: '#6b7280', fontStyle: 'italic', marginTop: 2 },
  trayCardMapLink: { flexDirection: 'row', alignItems: 'center', gap: 3, marginTop: 4 },
  trayCardMapLinkText: { fontSize: 11, color: '#2563eb', fontWeight: '600' },
  trayCardRemove: {
    position: 'absolute',
    top: 6,
    right: 6,
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: 'rgba(0,0,0,0.45)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  trayCardRemoveText: { color: '#fff', fontSize: 11, fontWeight: '700' },
});
