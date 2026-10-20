import { useEffect, useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity,
  StyleSheet, Alert, ActivityIndicator, ScrollView, Linking,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as DocumentPicker from 'expo-document-picker';
import * as WebBrowser from 'expo-web-browser';
import { addPlace, importTakeoutFile, enrichPlaces, AuthError } from '../lib/api';
import { mapWithConcurrency } from '../lib/concurrency';
import { importResultMessage, type ImportDone } from '../lib/importResult';

const TAKEOUT_URL = 'https://takeout.google.com/';
// 画像つきの手順（GitHub Pages、docs/takeout.html）。Google の画面が変わってもアプリの更新なしで直せる
const TAKEOUT_GUIDE_URL = 'https://yukik8.github.io/cocodake-native/takeout.html';

// 複数URLを同時に何件まで追加するか（サーバーと Google API に負荷をかけすぎない数）
const URL_ADD_CONCURRENCY = 3;

interface Props {
  sessionId: string;
  onImportComplete: () => void;
}

export default function ImportScreen({ sessionId, onImportComplete }: Props) {
  const [mode, setMode] = useState<'url' | 'file'>('url');
  const [url, setUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState<string | null>(null);
  // 取り込みを始めた時刻。経過秒数を1秒ごとに出して、止まっていないことが分かるようにする
  const [startedAt, setStartedAt] = useState<number | null>(null);
  const [, setTick] = useState(0);

  useEffect(() => {
    if (startedAt == null) return;
    const id = setInterval(() => setTick((t) => t + 1), 1000);
    return () => clearInterval(id);
  }, [startedAt]);

  const elapsedSec = startedAt != null ? Math.floor((Date.now() - startedAt) / 1000) : 0;
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // URL追加（複数対応・最大3件ずつ並行）
  const handleAddUrl = async () => {
    const urls = url.split('\n').map(u => u.trim()).filter(u => u.length > 0);
    if (urls.length === 0 || !sessionId) return;
    setLoading(true);
    setMessage(null);
    setProgress(null);

    let done = 0;
    if (urls.length > 1) setProgress(`0 / ${urls.length} 件処理中...`);
    const results = await mapWithConcurrency(urls, URL_ADD_CONCURRENCY, async (u) => {
      const result = await addPlace({ url: u });
      done++;
      if (urls.length > 1) setProgress(`${done} / ${urls.length} 件処理中...`);
      return result;
    });

    const added = results.filter((r) => !r.error).length;
    const alreadyExists = results.filter((r) => r.error === 'already_exists').length;
    const unauthorized = results.find((r) => r.error === 'unauthorized');
    const errors = results.length - added - alreadyExists;

    setProgress(null);

    const parts: string[] = [];
    if (added > 0) parts.push(`${added}件追加しました`);
    if (alreadyExists > 0) parts.push(`${alreadyExists}件はすでに登録済み`);
    if (errors > 0) parts.push(unauthorized?.message ?? `${errors}件エラー`);

    setMessage({
      type: errors === urls.length ? 'error' : 'success',
      text: parts.join('、'),
    });

    if (added > 0) {
      setUrl('');
      onImportComplete();
    }

    setLoading(false);
  };

  // Takeoutファイルインポート
  const handleFilePick = async () => {
    if (!sessionId) return;
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: ['application/json', 'text/csv', 'text/plain', '*/*'],
        copyToCacheDirectory: true,
      });
      if (result.canceled) return;

      const asset = result.assets[0];
      setLoading(true);
      setMessage(null);
      setProgress('ファイルを送信中...');
      setStartedAt(Date.now());

      let doneEvent: ImportDone | null = null;
      await importTakeoutFile(
        { uri: asset.uri, name: asset.name, type: asset.mimeType ?? 'application/octet-stream' },
        (event) => {
          if (event.type === 'progress') {
            if (event.phase === 'parsing') setProgress('ファイルを解析中...');
            else if (event.phase === 'geocoding') setProgress(`座標を取得中... ${event.current} / ${event.total}件`);
            else if (event.phase === 'saving') setProgress('データを保存中...');
          } else if (event.type === 'done') {
            doneEvent = event;
          } else if (event.type === 'error') {
            setMessage({ type: 'error', text: event.message ?? 'インポートに失敗しました' });
          }
        },
      );

      const finished = doneEvent as ImportDone | null;
      if (finished) {
        setProgress(null);
        setMessage({ type: 'success', text: `${finished.imported}件を取り込み中... 写真・評価を取得しています` });
        onImportComplete();
        try {
          await enrichPlaces(50);
        } catch { /* 無視 */ }
        setMessage({ type: 'success', text: importResultMessage(finished) });
        onImportComplete();
      }
    } catch (e) {
      setMessage({ type: 'error', text: e instanceof AuthError ? e.message : String(e) });
    } finally {
      setProgress(null);
      setStartedAt(null);
      setLoading(false);
    }
  };

  return (
    <ScrollView style={styles.container} keyboardShouldPersistTaps="handled">
      {/* タブ */}
      <View style={styles.tabRow}>
        {(['url', 'file'] as const).map((m) => (
          <TouchableOpacity
            key={m}
            style={[styles.tab, mode === m && styles.tabActive]}
            onPress={() => { setMode(m); setMessage(null); }}
          >
            <Text style={[styles.tabText, mode === m && styles.tabTextActive]}>
              {m === 'url' ? 'URL直接追加' : 'Takeoutファイル'}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {mode === 'url' ? (
        <View style={styles.section}>
          <Text style={styles.label}>Googleマップまたは食べログのURL</Text>
          <TextInput
            style={styles.textArea}
            value={url}
            onChangeText={setUrl}
            placeholder={
              'URLを1行に1件貼り付け（複数可）\n例: https://maps.app.goo.gl/xxx\n例: https://tabelog.com/tokyo/.../13123456/'
            }
            multiline
            numberOfLines={4}
            autoCapitalize="none"
            autoCorrect={false}
          />
          <TouchableOpacity
            style={[styles.primaryBtn, (!url.trim() || loading) && styles.btnDisabled]}
            onPress={handleAddUrl}
            disabled={!url.trim() || loading}
          >
            {loading
              ? <ActivityIndicator size="small" color="#fff" />
              : <Text style={styles.primaryBtnText}>追加</Text>
            }
          </TouchableOpacity>
          {progress && (
            <Text style={styles.progressText}>
              {progress}
              {startedAt != null ? `（${elapsedSec}秒経過）` : ''}
            </Text>
          )}
        </View>
      ) : (
        <View style={styles.section}>
          <TouchableOpacity
            style={[styles.fileBtn, loading && styles.btnDisabled]}
            onPress={handleFilePick}
            disabled={loading}
            activeOpacity={0.7}
          >
            {loading ? (
              <ActivityIndicator size="large" color="#2563eb" />
            ) : (
              <>
                <Ionicons name="folder-open-outline" size={40} color="#2563eb" />
                <Text style={styles.fileBtnTitle}>ファイルを選択</Text>
                <Text style={styles.fileBtnSub}>JSON / CSV（Google Takeout形式）</Text>
              </>
            )}
          </TouchableOpacity>

          {progress && (
            <Text style={styles.progressText}>
              {progress}
              {startedAt != null ? `（${elapsedSec}秒経過）` : ''}
            </Text>
          )}

          <View style={styles.howTo}>
            <Text style={styles.howToTitle}>Google Takeoutの使い方</Text>
            <Text style={styles.howToStep}>
              1.{' '}
              <Text style={styles.link} onPress={() => Linking.openURL(TAKEOUT_URL)} accessibilityRole="link">
                takeout.google.com
              </Text>
              {' '}を開く
            </Text>
            <Text style={styles.howToStep}>2. 「選択をすべて解除」→「Saved」だけにチェック</Text>
            <Text style={styles.howToStep}>3. エクスポート → メールのリンクからダウンロード</Text>
            <Text style={styles.howToStep}>4. 解凍して好きなCSV（例:「行ってみたい.csv」）またはJSONを選択</Text>
            <Text
              style={[styles.howToStep, styles.link, styles.guideLink]}
              onPress={() => WebBrowser.openBrowserAsync(TAKEOUT_GUIDE_URL)}
              accessibilityRole="link"
            >
              画像つきの詳しい手順はこちら
            </Text>
          </View>
        </View>
      )}

      {/* メッセージ */}
      {message && (
        <View style={[styles.msg, message.type === 'success' ? styles.msgSuccess : styles.msgError]}>
          <Text style={[styles.msgText, message.type === 'success' ? styles.msgTextSuccess : styles.msgTextError]}>
            {message.text}
          </Text>
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  tabRow: {
    flexDirection: 'row',
    margin: 16,
    borderRadius: 10,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  tab: { flex: 1, paddingVertical: 10, alignItems: 'center', backgroundColor: '#fff' },
  tabActive: { backgroundColor: '#2563eb' },
  tabText: { fontSize: 13, fontWeight: '600', color: '#6b7280' },
  tabTextActive: { color: '#fff' },
  section: { paddingHorizontal: 16, gap: 12 },
  label: { fontSize: 13, fontWeight: '600', color: '#374151' },
  textArea: {
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 10,
    padding: 12,
    fontSize: 13,
    color: '#111827',
    minHeight: 100,
    textAlignVertical: 'top',
  },
  primaryBtn: {
    backgroundColor: '#2563eb',
    borderRadius: 10,
    paddingVertical: 13,
    alignItems: 'center',
  },
  btnDisabled: { opacity: 0.5 },
  primaryBtnText: { color: '#fff', fontSize: 15, fontWeight: '700' },
  fileBtn: {
    borderWidth: 2,
    borderColor: '#d1d5db',
    borderStyle: 'dashed',
    borderRadius: 14,
    paddingVertical: 36,
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#f9fafb',
  },
fileBtnTitle: { fontSize: 15, fontWeight: '600', color: '#374151' },
  fileBtnSub: { fontSize: 12, color: '#9ca3af' },
  howTo: {
    backgroundColor: '#f9fafb',
    borderRadius: 10,
    padding: 14,
    gap: 4,
  },
  howToTitle: { fontSize: 13, fontWeight: '700', color: '#374151', marginBottom: 4 },
  howToStep: { fontSize: 12, color: '#6b7280', lineHeight: 20 },
  link: { color: '#2563eb', textDecorationLine: 'underline' },
  guideLink: { marginTop: 6 },
  progressText: { fontSize: 13, color: '#6b7280', textAlign: 'center' },
  msg: { margin: 16, padding: 12, borderRadius: 10 },
  msgSuccess: { backgroundColor: '#f0fdf4', borderWidth: 1, borderColor: '#86efac' },
  msgError: { backgroundColor: '#fef2f2', borderWidth: 1, borderColor: '#fca5a5' },
  msgText: { fontSize: 13 },
  msgTextSuccess: { color: '#166534' },
  msgTextError: { color: '#991b1b' },
});
