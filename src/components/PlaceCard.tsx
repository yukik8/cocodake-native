import {
  View, Text, Image, TouchableOpacity,
  ActivityIndicator, StyleSheet,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { PreviewResult } from '../lib/api';

interface Props {
  preview: PreviewResult & { loading: boolean; saving: boolean };
  onSave: () => void;
  onSaveAndShare: () => void;
  onClose: () => void;
  isExisting?: boolean;
  onDelete?: () => void;
  hasSelection?: boolean;
}

export default function PlaceCard({ preview, onSave, onSaveAndShare, onClose, isExisting, onDelete, hasSelection }: Props) {
  return (
    <View style={styles.card}>
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

          {isExisting ? (
            <View style={styles.actions}>
              <TouchableOpacity style={styles.closeBtn} onPress={onClose}>
                <Text style={styles.closeText}>閉じる</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.deleteBtn} onPress={onDelete} disabled={!onDelete}>
                <Text style={styles.deleteText}>リストから削除</Text>
              </TouchableOpacity>
            </View>
          ) : (
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
          )}
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    position: 'absolute',
    bottom: 24,
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
  closeText: { fontSize: 15, color: '#6b7280' },
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
