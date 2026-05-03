import 'react-native-url-polyfill/auto';
import { NavigationContainer } from '@react-navigation/native';
import { StatusBar } from 'expo-status-bar';
import { useState, useCallback, useEffect, useRef } from 'react';
import { View, StyleSheet, Alert, ActivityIndicator } from 'react-native';
import type { Session } from '@supabase/supabase-js';
import { supabase } from './src/lib/supabase';
import { fetchPlaces, addPlace } from './src/lib/api';
import TabNavigator from './src/navigation/TabNavigator';
import LoginScreen from './src/screens/LoginScreen';
import ShareModal from './src/components/ShareModal';
import SettingsScreen from './src/screens/SettingsScreen';
import ClipboardBanner from './src/components/ClipboardBanner';
import { useShareIntent } from './src/hooks/useShareIntent';
import { setPlaceData, setUserSession } from './modules/share-intent';
import type { Place } from './src/types';

function extractPlaceIdFromUrl(url: string): string | null {
  const m1 = url.match(/place_id[=:](ChIJ[^&!/ ]+)/);
  if (m1) return m1[1];
  const m2 = url.match(/!1s(ChIJ[^!]+)/);
  if (m2) return m2[1];
  return null;
}

export default function App() {
  const [session, setSession] = useState<Session | null | undefined>(undefined); // undefined = loading
  const [places, setPlaces] = useState<Place[]>([]);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [showShare, setShowShare] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const pendingShareUrlRef = useRef<string | null>(null);

  const handleSignOut = useCallback(async () => {
    await supabase.auth.signOut();
  }, []);

  // Auth
  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSession(data.session));
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_e, s) => setSession(s));
    return () => subscription.unsubscribe();
  }, []);

  const sessionId = session?.user.id ?? '';

  // Placesロード
  const loadPlaces = useCallback(async () => {
    if (!sessionId) return;
    try {
      const data = await fetchPlaces(sessionId);
      setPlaces(data);
    } catch (e) {
      console.error('fetchPlaces error:', e);
      Alert.alert('エラー', 'リストの取得に失敗しました。サーバーが起動しているか確認してください。');
    }
  }, [sessionId]);

  useEffect(() => { loadPlaces(); }, [loadPlaces]);

  // Share Extensionが使えるようにセッション情報をApp Groupに書き込む
  useEffect(() => {
    if (sessionId) {
      const apiUrl = process.env.EXPO_PUBLIC_API_URL ?? '';
      setUserSession(sessionId, apiUrl).catch(() => {});
    }
  }, [sessionId]);

  useEffect(() => {
    const ids = places.map((p) => p.place_id).filter((id): id is string => !!id);
    const urls = places.map((p) => p.url).filter((u): u is string => !!u);
    setPlaceData(ids, urls).catch(() => {});
  }, [places]);

  const handleToggleSelect = useCallback((id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }, []);

  const handleClearAll = useCallback(() => {
    setSelectedIds(new Set());
  }, []);

  // クリップボードURLを受け取って場所追加
  const handleClipboardUrl = useCallback(async (url: string) => {
    if (!sessionId) {
      // Session not loaded yet (cold launch race) — save and retry when ready
      pendingShareUrlRef.current = url;
      return;
    }
    const extractedPlaceId = extractPlaceIdFromUrl(url);
    const isDuplicate =
      places.some((p) => p.url === url) ||
      (extractedPlaceId != null && places.some((p) => p.place_id === extractedPlaceId));
    if (isDuplicate) {
      Alert.alert('追加済み', 'すでにリストにあります');
      return;
    }
    const result = await addPlace({ url, session: sessionId });
    if (result.error === 'already_exists') {
      Alert.alert('追加済み', result.message ?? 'すでにリストにあります');
    } else if (result.error) {
      Alert.alert('エラー', result.error);
    } else {
      Alert.alert('追加しました', `「${result.place?.name}」をリストに追加しました`);
      loadPlaces();
    }
  }, [sessionId, loadPlaces, places]);

  // Share Extension / Android インテント経由で受け取ったURLを処理
  useShareIntent(handleClipboardUrl);

  // Cold-launch race fix: process any URL that arrived before session was ready
  useEffect(() => {
    if (sessionId && pendingShareUrlRef.current) {
      const url = pendingShareUrlRef.current;
      pendingShareUrlRef.current = null;
      handleClipboardUrl(url);
    }
  }, [sessionId, handleClipboardUrl]);

  const selectedPlaces = places.filter((p) => selectedIds.has(p.id));

  // 認証ロード中
  if (session === undefined) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator size="large" color="#2563eb" />
      </View>
    );
  }

  // 未ログイン
  if (!session) {
    return (
      <>
        <StatusBar style="dark" />
        <LoginScreen />
      </>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar style="dark" />
      <NavigationContainer>
        <TabNavigator
          places={places}
          selectedIds={selectedIds}
          sessionId={sessionId}
          onToggleSelect={handleToggleSelect}
          onClearAll={handleClearAll}
          onPlaceAdded={loadPlaces}
          onPlacesChange={setPlaces}
          selectedCount={selectedIds.size}
          onOpenShare={() => setShowShare(true)}
          onOpenSettings={() => setShowSettings(true)}
          onSignOut={handleSignOut}
          avatarUrl={session.user.user_metadata?.avatar_url ?? null}
          userName={session.user.user_metadata?.full_name ?? session.user.email ?? null}
        />
      </NavigationContainer>

      {/* クリップボードURL検出バナー */}
      <ClipboardBanner onAddUrl={handleClipboardUrl} />

      {/* 共有モーダル */}
      <ShareModal
        visible={showShare}
        selectedPlaces={selectedPlaces}
        onClose={() => setShowShare(false)}
      />

      {/* 設定モーダル */}
      <SettingsScreen
        visible={showSettings}
        onClose={() => setShowSettings(false)}
        onSignOut={handleSignOut}
        avatarUrl={session.user.user_metadata?.avatar_url ?? null}
        userName={session.user.user_metadata?.full_name ?? null}
        userEmail={session.user.email ?? null}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  loading: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#fff' },
});
