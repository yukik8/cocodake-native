import { useState, useEffect, useRef } from 'react';
import {
  Animated, View, Text, Image, TouchableOpacity,
  ActivityIndicator, StyleSheet, TextInput,
  Keyboard, Linking, type KeyboardEvent,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { PreviewResult } from '../lib/api';

interface Props {
  preview: PreviewResult & { loading: boolean; saving: boolean; note?: string | null };
  onSave: () => void;
  onSaveAndShare: () => void;
  onClose: () => void;
  isExisting?: boolean;
  onDelete?: () => void;
  hasSelection?: boolean;
  onNoteChange?: (note: string | null) => void;
  onAddToShare?: () => void;
}

export default function PlaceCard({ preview, onSave, onSaveAndShare, onClose, isExisting, onDelete, hasSelection, onNoteChange, onAddToShare }: Props) {
  const [editingNote, setEditingNote] = useState(false);
  const [noteText, setNoteText] = useState(preview.note ?? '');
  const bottomAnim = useRef(new Animated.Value(24)).current;

  useEffect(() => {
    const show = Keyboard.addListener('keyboardWillShow', (e: KeyboardEvent) => {
      Animated.timing(bottomAnim, {
        toValue: 24 + e.endCoordinates.height,
        duration: e.duration ?? 250,
        useNativeDriver: false,
      }).start();
    });
    const hide = Keyboard.addListener('keyboardWillHide', (e: KeyboardEvent) => {
      Animated.timing(bottomAnim, {
        toValue: 24,
        duration: e.duration ?? 250,
        useNativeDriver: false,
      }).start();
    });
    return () => { show.remove(); hide.remove(); };
  }, [bottomAnim]);

  const handleNoteSave = () => {
    setEditingNote(false);
    onNoteChange?.(noteText.trim() || null);
  };

  return (
    <Animated.View style={[styles.card, { bottom: bottomAnim }]}>
      {preview.loading ? (
        <View style={styles.loadingRow}>
          <ActivityIndicator size="small" color="#2563eb" />
          <Text style={styles.loadingText}>スポットを検索中...</Text>
        </View>
      ) : (
        <>
          <View style={styles.infoRow}>
            {preview.photo_url ? (
              <Image source={{ uri: preview.photo_url }} style={styles.photo} />
            ) : (
              <View style={styles.photoPlaceholder}>
                <Ionicons name="location" size={28} color="#9ca3af" />
              </View>
            )}
            <View style={styles.textArea}>
              <Text style={styles.name} numberOfLines={2}>
                {preview.name ?? '名称不明'}
              </Text>
              {preview.category && (
                <View style={styles.categoryBadge}>
                  <Text style={styles.categoryText}>{preview.category}</Text>
                </View>
              )}
              {preview.address && (
                <Text style={styles.address} numberOfLines={2}>{preview.address}</Text>
              )}
              {preview.rating != null && (
                <View style={styles.ratingRow}>
                  <Ionicons name="star" size={12} color="#d97706" />
                  <Text style={styles.rating}>{preview.rating}</Text>
                </View>
              )}
            </View>
          </View>

          {/* メモ（既存スポットのみ） */}
          {isExisting && (
            <View style={styles.noteArea}>
              {editingNote ? (
                <View style={styles.noteEditRow}>
                  <TextInput
                    style={styles.noteInput}
                    value={noteText}
                    onChangeText={setNoteText}
                    placeholder="メモを入力..."
                    multiline
                    autoFocus
                    placeholderTextColor="#9ca3af"
                  />
                  <TouchableOpacity style={styles.noteSaveBtn} onPress={handleNoteSave}>
                    <Text style={styles.noteSaveBtnText}>保存</Text>
                  </TouchableOpacity>
                </View>
              ) : (
                <TouchableOpacity style={styles.noteReadRow} onPress={() => setEditingNote(true)}>
                  <Ionicons name="pencil-outline" size={13} color="#9ca3af" />
                  <Text style={[styles.noteReadText, !noteText && styles.noteReadPlaceholder]} numberOfLines={2}>
                    {noteText || 'メモを追加...'}
                  </Text>
                </TouchableOpacity>
              )}
            </View>
          )}

          {isExisting ? (
            <View>
              <View style={styles.actions}>
                <TouchableOpacity style={styles.deleteBtn} onPress={onDelete} disabled={!onDelete}>
                  <Text style={styles.deleteText}>リストから削除</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.shareAddBtn} onPress={onAddToShare} disabled={!onAddToShare}>
                  <Text style={styles.shareAddText}>シェアに追加</Text>
                </TouchableOpacity>
              </View>
              <TouchableOpacity
                style={styles.mapsLinkBtn}
                onPress={() => {
                  const url = preview.url
                    ?? (preview.place_id
                      ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(preview.name ?? '')}&query_place_id=${preview.place_id}`
                      : `https://www.google.com/maps?q=${preview.lat},${preview.lng}`);
                  Linking.openURL(url);
                }}
              >
                <Ionicons name="map-outline" size={14} color="#2563eb" />
                <Text style={styles.mapsLinkText}>Google Mapsで開く</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.closeBtnFull} onPress={onClose}>
                <Text style={styles.closeText}>閉じる</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <View>
              <View style={styles.actions}>
                <TouchableOpacity style={styles.closeBtn} onPress={onClose}>
                  <Text style={styles.closeText}>閉じる</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.saveBtn, preview.saving && styles.saveBtnDisabled]}
                  onPress={hasSelection ? onSaveAndShare : onSave}
                  disabled={preview.saving}
                >
                  {preview.saving
                    ? <ActivityIndicator size="small" color="#fff" />
                    : <Text style={styles.saveText}>{hasSelection ? '追加してシェア' : '追加'}</Text>
                  }
                </TouchableOpacity>
              </View>
              <TouchableOpacity
                style={styles.mapsLinkBtn}
                onPress={() => {
                  const url = preview.url
                    ?? (preview.place_id
                      ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(preview.name ?? '')}&query_place_id=${preview.place_id}`
                      : `https://www.google.com/maps?q=${preview.lat},${preview.lng}`);
                  Linking.openURL(url);
                }}
              >
                <Ionicons name="map-outline" size={14} color="#2563eb" />
                <Text style={styles.mapsLinkText}>Google Mapsで開く</Text>
              </TouchableOpacity>
            </View>
          )}
        </>
      )}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  card: {
    position: 'absolute',
    left: 16,
    right: 16,
    backgroundColor: '#fff',
    borderRadius: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 16,
    elevation: 10,
    overflow: 'hidden',
  },
  loadingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 20,
  },
  loadingText: { fontSize: 14, color: '#6b7280' },
  infoRow: {
    flexDirection: 'row',
    gap: 12,
    padding: 16,
    paddingBottom: 12,
  },
  photo: { width: 72, height: 72, borderRadius: 12 },
  photoPlaceholder: {
    width: 72,
    height: 72,
    borderRadius: 12,
    backgroundColor: '#f3f4f6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  textArea: { flex: 1 },
  name: { fontSize: 15, fontWeight: '700', color: '#111827', marginBottom: 4 },
  categoryBadge: {
    alignSelf: 'flex-start',
    backgroundColor: '#dbeafe',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
    marginBottom: 4,
  },
  categoryText: { fontSize: 11, color: '#1d4ed8', fontWeight: '600' },
  address: { fontSize: 12, color: '#9ca3af', lineHeight: 16 },
  ratingRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 4 },
  rating: { fontSize: 12, color: '#d97706' },

  // メモ
  noteArea: {
    marginHorizontal: 16,
    marginBottom: 10,
    backgroundColor: '#f9fafb',
    borderRadius: 10,
    overflow: 'hidden',
  },
  noteReadRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 6,
    padding: 10,
  },
  noteReadText: { flex: 1, fontSize: 13, color: '#374151', lineHeight: 18 },
  noteReadPlaceholder: { color: '#9ca3af' },
  noteEditRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 8,
    padding: 10,
  },
  noteInput: {
    flex: 1,
    fontSize: 13,
    color: '#111827',
    lineHeight: 18,
    minHeight: 40,
    maxHeight: 80,
  },
  noteSaveBtn: {
    backgroundColor: '#2563eb',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  noteSaveBtnText: { fontSize: 13, fontWeight: '700', color: '#fff' },

  actions: {
    flexDirection: 'row',
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: '#f3f4f6',
  },
  closeBtn: {
    flex: 1,
    paddingVertical: 14,
    alignItems: 'center',
  },
  closeBtnFull: {
    paddingVertical: 14,
    alignItems: 'center',
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: '#f3f4f6',
  },
  closeText: { fontSize: 15, color: '#6b7280' },
  mapsLinkBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 12,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: '#f3f4f6',
  },
  mapsLinkText: { fontSize: 13, color: '#2563eb' },
  shareAddBtn: {
    flex: 1,
    paddingVertical: 14,
    alignItems: 'center',
    backgroundColor: '#2563eb',
  },
  shareAddText: { fontSize: 15, fontWeight: '700', color: '#fff' },
  saveBtn: {
    flex: 1,
    paddingVertical: 14,
    alignItems: 'center',
    backgroundColor: '#2563eb',
  },
  saveBtnDisabled: { opacity: 0.6 },
  saveText: { fontSize: 15, fontWeight: '700', color: '#fff' },
  deleteBtn: {
    flex: 1,
    paddingVertical: 14,
    alignItems: 'center',
    backgroundColor: '#fef2f2',
  },
  deleteText: { fontSize: 15, fontWeight: '600', color: '#dc2626' },
});
