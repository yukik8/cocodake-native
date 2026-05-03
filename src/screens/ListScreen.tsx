import { useState, useCallback } from 'react';
import {
  View, Text, TextInput, FlatList, TouchableOpacity,
  Image, StyleSheet, RefreshControl,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import type { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import type { TabParamList } from '../navigation/TabNavigator';
import type { Place } from '../types';
import ConfirmDialog from '../components/ConfirmDialog';
import { deletePlace } from '../lib/api';

interface Props {
  places: Place[];
  selectedIds: Set<string>;
  onToggleSelect: (id: string) => void;
  sessionId: string;
  onPlacesChange: (places: Place[]) => void;
  onRefresh: () => Promise<void>;
  onFocusPlace: (place: Place) => void;
}

type SortKey = 'recent' | 'name' | 'rating';

export default function ListScreen({ places, selectedIds, onToggleSelect, sessionId, onPlacesChange, onRefresh, onFocusPlace }: Props) {
  const navigation = useNavigation<BottomTabNavigationProp<TabParamList>>();
  const [search, setSearch] = useState('');
  const [sortBy, setSortBy] = useState<SortKey>('recent');
  const [refreshing, setRefreshing] = useState(false);
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    await onRefresh();
    setRefreshing(false);
  }, [onRefresh]);

  const displayed = places
    .filter((p) => {
      if (!search) return true;
      const q = search.toLowerCase();
      return (
        p.name?.toLowerCase().includes(q) ||
        p.category?.toLowerCase().includes(q) ||
        p.address?.toLowerCase().includes(q)
      );
    })
    .sort((a, b) => {
      if (sortBy === 'name') return (a.name ?? '').localeCompare(b.name ?? '');
      if (sortBy === 'rating') return (b.rating ?? 0) - (a.rating ?? 0);
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    });

  const handleDelete = useCallback((id: string) => {
    setPendingDeleteId(id);
  }, []);

  const handleConfirmDelete = useCallback(async () => {
    if (!pendingDeleteId) return;
    const id = pendingDeleteId;
    setPendingDeleteId(null);
    await deletePlace(id, sessionId);
    onPlacesChange(places.filter((p) => p.id !== id));
  }, [pendingDeleteId, sessionId, places, onPlacesChange]);

  return (
    <View style={styles.container}>
      <ConfirmDialog
        visible={pendingDeleteId !== null}
        title="削除"
        message="このスポットを削除しますか？"
        onConfirm={handleConfirmDelete}
        onCancel={() => setPendingDeleteId(null)}
      />
      {/* 検索・ソート */}
      <View style={styles.header}>
        <TextInput
          style={styles.searchInput}
          placeholder="店名・カテゴリで検索..."
          value={search}
          onChangeText={setSearch}
          clearButtonMode="while-editing"
        />
        <View style={styles.sortRow}>
          {(['recent', 'name', 'rating'] as SortKey[]).map((key) => (
            <TouchableOpacity
              key={key}
              onPress={() => setSortBy(key)}
              style={[styles.sortBtn, sortBy === key && styles.sortBtnActive]}
            >
              <Text style={[styles.sortText, sortBy === key && styles.sortTextActive]}>
                {key === 'recent' ? '追加順' : key === 'name' ? '名前順' : '評価順'}
              </Text>
            </TouchableOpacity>
          ))}
          <Text style={styles.countText}>{displayed.length}件</Text>
        </View>
      </View>

      {/* リスト */}
      <FlatList
        data={displayed}
        keyExtractor={(p) => p.id}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor="#2563eb" />
        }
        renderItem={({ item }) => (
          <PlaceRow
            place={item}
            isSelected={selectedIds.has(item.id)}
            onToggle={() => onToggleSelect(item.id)}
            onDelete={() => handleDelete(item.id)}
            onFocus={() => {
              onFocusPlace(item);
              navigation.navigate('Map');
            }}
          />
        )}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={styles.emptyText}>
              {places.length === 0 ? 'まだスポットがありません' : '検索結果がありません'}
            </Text>
          </View>
        }
      />
    </View>
  );
}

function PlaceRow({
  place, isSelected, onToggle, onDelete, onFocus,
}: {
  place: Place;
  isSelected: boolean;
  onToggle: () => void;
  onDelete: () => void;
  onFocus: () => void;
}) {
  return (
    <View style={[styles.row, isSelected && styles.rowSelected]}>
      {/* チェックボックスだけ選択トグル */}
      <TouchableOpacity
        style={[styles.checkbox, isSelected && styles.checkboxChecked]}
        onPress={onToggle}
        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
      >
        {isSelected && <Text style={styles.checkmark}>✓</Text>}
      </TouchableOpacity>

      {/* それ以外を押すとマップへ */}
      <TouchableOpacity style={styles.rowContent} onPress={onFocus} activeOpacity={0.7}>
        {/* 写真 */}
        {place.photo_url ? (
          <Image source={{ uri: place.photo_url }} style={styles.photo} />
        ) : (
          <View style={styles.photoPlaceholder}>
            <Ionicons name="location" size={22} color="#9ca3af" />
          </View>
        )}

        {/* テキスト */}
        <View style={styles.textArea}>
          <Text style={styles.name} numberOfLines={1}>{place.name ?? '名称不明'}</Text>
          {place.category && (
            <Text style={styles.category} numberOfLines={1}>{place.category}</Text>
          )}
          {place.address && (
            <Text style={styles.address} numberOfLines={1}>{place.address}</Text>
          )}
          {place.rating != null && (
            <View style={styles.ratingRow}>
              <Ionicons name="star" size={11} color="#d97706" />
              <Text style={styles.rating}>{place.rating}</Text>
            </View>
          )}
          {place.note ? (
            <Text style={styles.note} numberOfLines={1}>{place.note}</Text>
          ) : null}
        </View>
      </TouchableOpacity>

      {/* 削除 */}
      <TouchableOpacity onPress={onDelete} style={styles.deleteBtn} hitSlop={8}>
        <Ionicons name="trash-outline" size={18} color="#9ca3af" />
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  header: {
    padding: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#e5e7eb',
    gap: 8,
  },
  searchInput: {
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 14,
    color: '#111827',
  },
  sortRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  sortBtn: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
    backgroundColor: '#f3f4f6',
  },
  sortBtnActive: { backgroundColor: '#dbeafe' },
  sortText: { fontSize: 12, color: '#6b7280' },
  sortTextActive: { color: '#1d4ed8', fontWeight: '600' },
  countText: { fontSize: 12, color: '#9ca3af', marginLeft: 'auto' },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#f3f4f6',
  },
  rowContent: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  rowSelected: { backgroundColor: '#eff6ff' },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 4,
    borderWidth: 2,
    borderColor: '#d1d5db',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  checkboxChecked: { backgroundColor: '#2563eb', borderColor: '#2563eb' },
  checkmark: { color: '#fff', fontSize: 13, fontWeight: 'bold' },
  photo: { width: 52, height: 52, borderRadius: 10, flexShrink: 0 },
  photoPlaceholder: {
    width: 52,
    height: 52,
    borderRadius: 10,
    backgroundColor: '#f3f4f6',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  textArea: { flex: 1 },
  name: { fontSize: 14, fontWeight: '600', color: '#111827' },
  category: { fontSize: 12, color: '#2563eb', marginTop: 1 },
  address: { fontSize: 11, color: '#9ca3af', marginTop: 1 },
  ratingRow: { flexDirection: 'row', alignItems: 'center', gap: 3, marginTop: 2 },
  rating: { fontSize: 11, color: '#d97706' },
  note: { fontSize: 11, color: '#6b7280', marginTop: 2, fontStyle: 'italic' },
  deleteBtn: { padding: 4, flexShrink: 0 },
  deleteText: { fontSize: 18 },
  empty: { padding: 40, alignItems: 'center' },
  emptyText: { fontSize: 14, color: '#9ca3af' },
});
