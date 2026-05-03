import { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, Modal,
  StyleSheet, ActivityIndicator, Share, ScrollView, Alert,
} from 'react-native';
import * as Clipboard from 'expo-clipboard';
import type { Place } from '../types';

const API_URL = process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:3000';

interface Props {
  visible: boolean;
  selectedPlaces: Place[];
  onClose: () => void;
}

export default function ShareModal({ visible, selectedPlaces, onClose }: Props) {
  const [title, setTitle] = useState('');
  const [expiresIn, setExpiresIn] = useState(30);
  const [loading, setLoading] = useState(false);
  const [shareUrl, setShareUrl] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const handleCreate = async () => {
    if (selectedPlaces.length === 0) return;
    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/api/share`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          place_ids: selectedPlaces.map((p) => p.id),
          title: title || undefined,
          expires_in_days: expiresIn,
        }),
      });
      const data = await res.json();
      if (!res.ok) { Alert.alert('エラー', data.error); return; }
      setShareUrl(`${API_URL}/share/${data.share.id}`);
    } catch {
      Alert.alert('エラー', '通信エラーが発生しました');
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = async () => {
    if (!shareUrl) return;
    await Clipboard.setStringAsync(shareUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleNativeShare = async () => {
    if (!shareUrl) return;
    await Share.share({ message: shareUrl, url: shareUrl });
  };

  const handleClose = () => {
    setShareUrl(null);
    setTitle('');
    onClose();
  };

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={handleClose}>
      <View style={styles.container}>
        {/* ヘッダー */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>共有リストを作成</Text>
          <TouchableOpacity onPress={handleClose} style={styles.closeBtn}>
            <Text style={styles.closeBtnText}>✕</Text>
          </TouchableOpacity>
        </View>

        <ScrollView style={styles.body} contentContainerStyle={{ gap: 16 }}>
          {!shareUrl ? (
            <>
              {/* 対象スポット */}
              <View style={styles.placesSummary}>
                <Text style={styles.sectionLabel}>
                  <Text style={styles.bold}>{selectedPlaces.length}件</Text>のスポットを共有
                </Text>
                {selectedPlaces.slice(0, 5).map((p) => (
                  <Text key={p.id} style={styles.placeItem} numberOfLines={1}>• {p.name}</Text>
                ))}
                {selectedPlaces.length > 5 && (
                  <Text style={styles.placeMore}>...他 {selectedPlaces.length - 5}件</Text>
                )}
              </View>

              {/* タイトル */}
              <View style={styles.field}>
                <Text style={styles.fieldLabel}>タイトル（任意）</Text>
                <TextInput
                  style={styles.input}
                  value={title}
                  onChangeText={setTitle}
                  placeholder="例: 渋谷のランチ候補"
                />
              </View>

              {/* 有効期限 */}
              <View style={styles.field}>
                <Text style={styles.fieldLabel}>有効期限</Text>
                <View style={styles.expiryRow}>
                  {[7, 30, 90, 0].map((days) => (
                    <TouchableOpacity
                      key={days}
                      style={[styles.expiryBtn, expiresIn === days && styles.expiryBtnActive]}
                      onPress={() => setExpiresIn(days)}
                    >
                      <Text style={[styles.expiryText, expiresIn === days && styles.expiryTextActive]}>
                        {days === 0 ? '無期限' : `${days}日`}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              <TouchableOpacity
                style={[styles.createBtn, (loading || selectedPlaces.length === 0) && styles.btnDisabled]}
                onPress={handleCreate}
                disabled={loading || selectedPlaces.length === 0}
              >
                {loading
                  ? <ActivityIndicator size="small" color="#fff" />
                  : <Text style={styles.createBtnText}>共有URLを生成</Text>
                }
              </TouchableOpacity>
            </>
          ) : (
            /* 生成完了 */
            <>
              <View style={styles.successIcon}>
                <Text style={{ fontSize: 40 }}>🔗</Text>
              </View>
              <Text style={styles.successTitle}>共有リンクが生成されました</Text>

              <View style={styles.urlRow}>
                <Text style={styles.urlText} numberOfLines={1}>{shareUrl}</Text>
              </View>

              <TouchableOpacity style={styles.copyBtn} onPress={handleCopy}>
                <Text style={styles.copyBtnText}>{copied ? 'コピー済 ✓' : 'URLをコピー'}</Text>
              </TouchableOpacity>

              <TouchableOpacity style={styles.shareBtn} onPress={handleNativeShare}>
                <Text style={styles.shareBtnText}>共有する...</Text>
              </TouchableOpacity>

              <Text style={styles.note}>
                URLを知っている人ならログインなしで閲覧できます
                {expiresIn > 0 ? `（${expiresIn}日間有効）` : '（無期限）'}
              </Text>
            </>
          )}
        </ScrollView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 20,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#e5e7eb',
  },
  headerTitle: { fontSize: 17, fontWeight: '700', color: '#111827' },
  closeBtn: { padding: 4 },
  closeBtnText: { fontSize: 18, color: '#9ca3af' },
  body: { padding: 20 },
  placesSummary: {
    backgroundColor: '#f9fafb',
    borderRadius: 12,
    padding: 14,
    gap: 4,
  },
  sectionLabel: { fontSize: 14, color: '#374151', marginBottom: 4 },
  bold: { fontWeight: '700' },
  placeItem: { fontSize: 12, color: '#6b7280' },
  placeMore: { fontSize: 12, color: '#9ca3af' },
  field: { gap: 6 },
  fieldLabel: { fontSize: 13, fontWeight: '600', color: '#374151' },
  input: {
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    color: '#111827',
  },
  expiryRow: { flexDirection: 'row', gap: 8 },
  expiryBtn: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    alignItems: 'center',
  },
  expiryBtnActive: { backgroundColor: '#dbeafe', borderColor: '#93c5fd' },
  expiryText: { fontSize: 13, color: '#6b7280' },
  expiryTextActive: { color: '#1d4ed8', fontWeight: '600' },
  createBtn: {
    backgroundColor: '#2563eb',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
  },
  btnDisabled: { opacity: 0.5 },
  createBtnText: { color: '#fff', fontSize: 15, fontWeight: '700' },
  successIcon: { alignItems: 'center', paddingVertical: 16 },
  successTitle: { fontSize: 16, fontWeight: '700', color: '#111827', textAlign: 'center' },
  urlRow: {
    backgroundColor: '#f3f4f6',
    borderRadius: 10,
    padding: 12,
  },
  urlText: { fontSize: 12, color: '#4b5563' },
  copyBtn: {
    backgroundColor: '#f0f9ff',
    borderWidth: 1,
    borderColor: '#7dd3fc',
    borderRadius: 12,
    paddingVertical: 13,
    alignItems: 'center',
  },
  copyBtnText: { color: '#0369a1', fontSize: 15, fontWeight: '600' },
  shareBtn: {
    backgroundColor: '#2563eb',
    borderRadius: 12,
    paddingVertical: 13,
    alignItems: 'center',
  },
  shareBtnText: { color: '#fff', fontSize: 15, fontWeight: '700' },
  note: { fontSize: 12, color: '#9ca3af', textAlign: 'center' },
});
