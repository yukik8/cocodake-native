import { useState } from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import {
  Text, TouchableOpacity, Image, View, StyleSheet,
  Modal, Pressable, Animated, Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import MapScreen from '../screens/MapScreen';
import ListScreen from '../screens/ListScreen';
import ImportScreen from '../screens/ImportScreen';
import type { Place } from '../types';

export type TabParamList = {
  Map: undefined;
  List: undefined;
  Import: undefined;
};

const Tab = createBottomTabNavigator<TabParamList>();

interface Props {
  places: Place[];
  selectedIds: Set<string>;
  sessionId: string;
  onToggleSelect: (id: string) => void;
  onClearAll: () => void;
  onPlaceAdded: () => void;
  onPlacesChange: (places: Place[]) => void;
  selectedCount: number;
  onOpenShare: () => void;
  onSignOut: () => void;
  onOpenSettings: () => void;
  avatarUrl: string | null;
  userName: string | null;
}

export default function TabNavigator({
  places, selectedIds, sessionId,
  onToggleSelect, onClearAll, onPlaceAdded, onPlacesChange,
  selectedCount, onOpenShare, onSignOut, onOpenSettings, avatarUrl, userName,
}: Props) {
  const [focusedPlace, setFocusedPlace] = useState<Place | null>(null);
  const [menuVisible, setMenuVisible] = useState(false);
  const [shareSelectMode, setShareSelectMode] = useState(false);

  const handleSharePress = () => {
    if (selectedCount > 0) {
      setShareSelectMode(false);
      onOpenShare();
    } else if (shareSelectMode) {
      setShareSelectMode(false);
    } else {
      setShareSelectMode(true);
    }
  };

  const shareHeaderRight = () => (
    <TouchableOpacity onPress={handleSharePress} style={{ marginRight: 16 }}>
      <Text style={{ fontSize: 14, fontWeight: '700', color: '#2563eb' }}>
        {selectedCount > 0 ? `${selectedCount}件をシェア` : shareSelectMode ? 'キャンセル' : 'シェア'}
      </Text>
    </TouchableOpacity>
  );

  const profileHeaderLeft = () => (
    <TouchableOpacity style={{ marginLeft: 16 }} onPress={() => setMenuVisible(true)}>
      {avatarUrl ? (
        <Image source={{ uri: avatarUrl }} style={styles.avatar} />
      ) : (
        <Ionicons name="person-circle-outline" size={26} color="#6b7280" />
      )}
    </TouchableOpacity>
  );

  const handleSignOut = () => {
    setMenuVisible(false);
    Alert.alert('ログアウト', 'ログアウトしますか？', [
      { text: 'キャンセル', style: 'cancel' },
      { text: 'ログアウト', style: 'destructive', onPress: onSignOut },
    ]);
  };

  return (
    <>
      <Tab.Navigator
        screenOptions={{
          headerStyle: { backgroundColor: '#ffffff' },
          headerTitleStyle: { fontWeight: 'bold', fontSize: 17 },
          tabBarActiveTintColor: '#2563eb',
          tabBarInactiveTintColor: '#9ca3af',
          tabBarStyle: { borderTopColor: '#e5e7eb', backgroundColor: '#ffffff' },
        }}
      >
        <Tab.Screen
          name="Map"
          options={{
            title: 'マップ',
            headerTitle: 'cocodake',
            headerLeft: profileHeaderLeft,
            headerRight: shareHeaderRight,
            tabBarIcon: ({ focused, color }) => (
              <Ionicons name={focused ? 'map' : 'map-outline'} size={24} color={color} />
            ),
          }}
        >
          {() => (
            <MapScreen
              places={places}
              selectedIds={selectedIds}
              sessionId={sessionId}
              onToggleSelect={onToggleSelect}
              onClearAll={onClearAll}
              onPlaceAdded={onPlaceAdded}
              focusedPlace={focusedPlace}
              onClearFocus={() => setFocusedPlace(null)}
              shareSelectMode={shareSelectMode}
              onEnterShareSelectMode={() => setShareSelectMode(true)}
            />
          )}
        </Tab.Screen>

        <Tab.Screen
          name="List"
          options={{
            title: 'リスト',
            headerTitle: 'スポット一覧',
            headerRight: shareHeaderRight,
            tabBarIcon: ({ focused, color }) => (
              <Ionicons name={focused ? 'list' : 'list-outline'} size={24} color={color} />
            ),
          }}
        >
          {() => (
            <ListScreen
              places={places}
              selectedIds={selectedIds}
              onToggleSelect={onToggleSelect}
              sessionId={sessionId}
              onPlacesChange={onPlacesChange}
              onRefresh={onPlaceAdded}
              onFocusPlace={setFocusedPlace}
            />
          )}
        </Tab.Screen>

        <Tab.Screen
          name="Import"
          options={{
            title: '追加',
            headerTitle: '追加・インポート',
            tabBarIcon: ({ focused, color }) => (
              <Ionicons name={focused ? 'add-circle' : 'add-circle-outline'} size={24} color={color} />
            ),
          }}
        >
          {() => (
            <ImportScreen
              sessionId={sessionId}
              onImportComplete={onPlaceAdded}
            />
          )}
        </Tab.Screen>
      </Tab.Navigator>

      {/* ドロップダウンメニュー */}
      <Modal visible={menuVisible} transparent animationType="fade">
        <Pressable style={styles.overlay} onPress={() => setMenuVisible(false)}>
          <Pressable style={styles.menu} onPress={(e) => e.stopPropagation()}>
            {/* アバター＋名前エリア（オプション：後で追加可） */}
            <View style={styles.menuHeader}>
              {avatarUrl ? (
                <Image source={{ uri: avatarUrl }} style={styles.menuAvatar} />
              ) : (
                <Ionicons name="person-circle-outline" size={36} color="#9ca3af" />
              )}
              {userName && (
                <Text style={styles.menuUserName} numberOfLines={1}>{userName}</Text>
              )}
            </View>

            <View style={styles.divider} />

            <TouchableOpacity style={styles.menuItem} onPress={() => { setMenuVisible(false); onOpenSettings(); }}>
              <Ionicons name="settings-outline" size={18} color="#374151" />
              <Text style={styles.menuItemText}>設定</Text>
            </TouchableOpacity>

            <View style={styles.divider} />

            <TouchableOpacity style={styles.menuItem} onPress={handleSignOut}>
              <Ionicons name="log-out-outline" size={18} color="#ef4444" />
              <Text style={[styles.menuItemText, styles.menuItemDestructive]}>ログアウト</Text>
            </TouchableOpacity>
          </Pressable>
        </Pressable>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  avatar: {
    width: 28,
    height: 28,
    borderRadius: 14,
  },

  // オーバーレイ
  overlay: {
    flex: 1,
    backgroundColor: 'transparent',
  },

  // ドロップダウンカード
  menu: {
    position: 'absolute',
    top: 96,
    left: 16,
    width: 200,
    backgroundColor: '#fff',
    borderRadius: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 16,
    elevation: 8,
    overflow: 'hidden',
  },
  menuHeader: {
    padding: 16,
    alignItems: 'flex-start',
  },
  menuAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
  },
  menuUserName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#111827',
    marginTop: 8,
  },
  divider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: '#f3f4f6',
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  menuItemText: {
    fontSize: 15,
    color: '#111827',
  },
  menuItemDestructive: {
    color: '#ef4444',
  },
});
