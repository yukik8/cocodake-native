import 'react-native-url-polyfill/auto';
import { NavigationContainer } from '@react-navigation/native';
import { StatusBar } from 'expo-status-bar';
import { useState, useCallback, useEffect, useRef, useMemo } from 'react';
import { View, StyleSheet, Alert, ActivityIndicator, AppState } from 'react-native';
import type { Session } from '@supabase/supabase-js';
import { supabase } from './src/lib/supabase';
import { fetchPlaces, addPlace, deleteAccount, AuthError } from './src/lib/api';
import { extractPlaceIdFromUrl } from './src/lib/placeId';
import TabNavigator from './src/navigation/TabNavigator';
import LoginScreen from './src/screens/LoginScreen';
import ShareModal from './src/components/ShareModal';
import SettingsScreen from './src/screens/SettingsScreen';
import { useShareIntent } from './src/hooks/useShareIntent';
import { setPlaceData, setUserSession, clearUserSession } from './modules/share-intent';
import type { Place } from './src/types';

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
  const accessToken = session?.access_token ?? '';

  const handleDeleteAccount = useCallback(async () => {
    if (!sessionId) return;
    try {
      await deleteAccount();
      await supabase.auth.signOut();
    } catch (e: unknown) {
      Alert.alert('エラー', e instanceof Error ? e.message : 'アカウント削除に失敗しました');
    }
  }, [sessionId]);

  // Placesロード
  const loadPlaces = useCallback(async () => {
    if (!sessionId) return;
    try {
      const data = await fetchPlaces();
      setPlaces(data);
    } catch (e) {
      console.error('fetchPlaces error:', e);
      Alert.alert('エラー', e instanceof AuthError ? e.message : 'リストの取得に失敗しました。サーバーが起動しているか確認してください。');
    }
  }, [sessionId]);

  useEffect(() => { loadPlaces(); }, [loadPlaces]);

  // フォアグラウンドに戻ったとき（Share Extension経由での追加を反映）
  // 前面にいる間だけトークンを自動更新する（Supabase の React Native 向けの推奨）
  useEffect(() => {
    if (AppState.currentState === 'active') supabase.auth.startAutoRefresh();
    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'active') {
        supabase.auth.startAutoRefresh();
        loadPlaces();
      } else {
        supabase.auth.stopAutoRefresh();
      }
    });
    return () => sub.remove();
  }, [loadPlaces]);

  // Share Extensionが使えるようにセッション情報（アクセストークンを含む）をApp Groupに書き込む。
  // トークンが更新されるたび（TOKEN_REFRESHED）に書き直し、ログアウトしたら消す
  useEffect(() => {
    if (session === undefined) return;
    if (sessionId && accessToken) {
      const apiUrl = process.env.EXPO_PUBLIC_API_URL ?? '';
      setUserSession(sessionId, apiUrl, accessToken).catch(() => {});
    } else {
      clearUserSession().catch(() => {});
    }
  }, [session, sessionId, accessToken]);

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
    const result = await addPlace({ url });
    if (result.error === 'already_exists') {
      Alert.alert('追加済み', result.message ?? 'すでにリストにあります');
    } else if (result.error) {
      Alert.alert('エラー', result.message ?? result.error);
    } else if (result.place) {
      const added = result.place;
      Alert.alert('追加しました', `「${added.name}」をリストに追加しました`);
      setPlaces((prev) => [added, ...prev.filter((p) => p.id !== added.id)]);
    }
  }, [sessionId, places]);

  // 1件の追加・削除・メモ更新は、全件を取り直さずに手元の状態だけ更新する
  const handlePlaceCreated = useCallback((place: Place) => {
    setPlaces((prev) => [place, ...prev.filter((p) => p.id !== place.id)]);
  }, []);

  const handlePlaceRemoved = useCallback((id: string) => {
    setPlaces((prev) => prev.filter((p) => p.id !== id));
    setSelectedIds((prev) => {
      if (!prev.has(id)) return prev;
      const next = new Set(prev);
      next.delete(id);
      return next;
    });
  }, []);

  const handlePlaceNoteChanged = useCallback((id: string, note: string | null) => {
    setPlaces((prev) => prev.map((p) => (p.id === id ? { ...p, note } : p)));
  }, []);

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

  const selectedPlaces = useMemo(() => places.filter((p) => selectedIds.has(p.id)), [places, selectedIds]);

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
          onPlaceCreated={handlePlaceCreated}
          onPlaceRemoved={handlePlaceRemoved}
          onPlaceNoteChanged={handlePlaceNoteChanged}
          selectedCount={selectedIds.size}
          onOpenShare={() => setShowShare(true)}
          onOpenSettings={() => setShowSettings(true)}
          onSignOut={handleSignOut}
          avatarUrl={session.user.user_metadata?.avatar_url ?? null}
          userName={session.user.user_metadata?.full_name ?? session.user.email ?? null}
        />
      </NavigationContainer>

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
        onDeleteAccount={handleDeleteAccount}
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
