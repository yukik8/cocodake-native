import { useState } from 'react';
import {
  View, Text, TouchableOpacity, Image, StyleSheet,
  ScrollView, Modal, SafeAreaView, Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Constants from 'expo-constants';
import LegalScreen from './LegalScreen';
import { TERMS, PRIVACY_POLICY } from '../lib/legalContent';

interface Props {
  visible: boolean;
  onClose: () => void;
  onSignOut: () => void;
  onDeleteAccount: () => void;
  avatarUrl: string | null;
  userName: string | null;
  userEmail: string | null;
}

export default function SettingsScreen({ visible, onClose, onSignOut, onDeleteAccount, avatarUrl, userName, userEmail }: Props) {
  const version = Constants.expoConfig?.version ?? '—';
  const [legalDoc, setLegalDoc] = useState<'terms' | 'privacy' | null>(null);

  const handleSignOut = () => {
    Alert.alert('ログアウト', 'ログアウトしますか？', [
      { text: 'キャンセル', style: 'cancel' },
      { text: 'ログアウト', style: 'destructive', onPress: () => { onClose(); onSignOut(); } },
    ]);
  };

  const handleDeleteAccount = () => {
    Alert.alert(
      'アカウントを削除',
      'アカウントとすべてのデータを削除します。この操作は取り消せません。',
      [
        { text: 'キャンセル', style: 'cancel' },
        { text: '削除する', style: 'destructive', onPress: () => { onClose(); onDeleteAccount(); } },
      ]
    );
  };


  return (
    <>
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet">
      <SafeAreaView style={styles.root}>
        {/* ヘッダー */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>設定</Text>
          <TouchableOpacity onPress={onClose} hitSlop={8}>
            <Ionicons name="close" size={24} color="#6b7280" />
          </TouchableOpacity>
        </View>

        <ScrollView contentContainerStyle={styles.content}>
          {/* アカウント */}
          <Text style={styles.sectionLabel}>アカウント</Text>
          <View style={styles.card}>
            <View style={styles.profileRow}>
              {avatarUrl ? (
                <Image source={{ uri: avatarUrl }} style={styles.avatar} />
              ) : (
                <View style={styles.avatarFallback}>
                  <Ionicons name="person" size={24} color="#9ca3af" />
                </View>
              )}
              <View style={styles.profileText}>
                {userName && <Text style={styles.profileName}>{userName}</Text>}
                {userEmail && <Text style={styles.profileEmail}>{userEmail}</Text>}
              </View>
            </View>
          </View>

          {/* 情報 */}
          <Text style={styles.sectionLabel}>情報</Text>
          <View style={styles.card}>
            <View style={styles.row}>
              <View style={styles.rowLeft}>
                <Ionicons name="information-circle-outline" size={20} color="#6b7280" />
                <Text style={styles.rowLabel}>バージョン</Text>
              </View>
              <Text style={styles.rowValue}>{version}</Text>
            </View>

            <View style={styles.separator} />

            <TouchableOpacity style={styles.row} onPress={() => setLegalDoc('terms')}>
              <View style={styles.rowLeft}>
                <Ionicons name="document-text-outline" size={20} color="#6b7280" />
                <Text style={styles.rowLabel}>利用規約</Text>
              </View>
              <Ionicons name="chevron-forward" size={16} color="#d1d5db" />
            </TouchableOpacity>

            <View style={styles.separator} />

            <TouchableOpacity style={styles.row} onPress={() => setLegalDoc('privacy')}>
              <View style={styles.rowLeft}>
                <Ionicons name="shield-checkmark-outline" size={20} color="#6b7280" />
                <Text style={styles.rowLabel}>プライバシーポリシー</Text>
              </View>
              <Ionicons name="chevron-forward" size={16} color="#d1d5db" />
            </TouchableOpacity>
          </View>

          {/* ログアウト・アカウント削除 */}
          <View style={styles.card}>
            <TouchableOpacity style={styles.row} onPress={handleSignOut}>
              <View style={styles.rowLeft}>
                <Ionicons name="log-out-outline" size={20} color="#ef4444" />
                <Text style={styles.rowLabelDestructive}>ログアウト</Text>
              </View>
            </TouchableOpacity>

            <View style={styles.separator} />

            <TouchableOpacity style={styles.row} onPress={handleDeleteAccount}>
              <View style={styles.rowLeft}>
                <Ionicons name="trash-outline" size={20} color="#ef4444" />
                <Text style={styles.rowLabelDestructive}>アカウントを削除</Text>
              </View>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </SafeAreaView>
      <LegalScreen
        visible={legalDoc === 'terms'}
        onClose={() => setLegalDoc(null)}
        title="利用規約"
        content={TERMS}
      />
      <LegalScreen
        visible={legalDoc === 'privacy'}
        onClose={() => setLegalDoc(null)}
        title="プライバシーポリシー"
        content={PRIVACY_POLICY}
      />
    </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#f3f4f6' },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 14,
    backgroundColor: '#fff',
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#e5e7eb',
  },
  headerTitle: { fontSize: 17, fontWeight: '700', color: '#111827' },

  content: { padding: 20, gap: 8, paddingBottom: 48 },

  sectionLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#6b7280',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 4,
    marginTop: 8,
    paddingHorizontal: 4,
  },

  card: {
    backgroundColor: '#fff',
    borderRadius: 14,
    overflow: 'hidden',
  },

  // プロフィール行
  profileRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    padding: 16,
  },
  avatar: { width: 48, height: 48, borderRadius: 24 },
  avatarFallback: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#f3f4f6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  profileText: { flex: 1, gap: 2 },
  profileName: { fontSize: 15, fontWeight: '600', color: '#111827' },
  profileEmail: { fontSize: 13, color: '#9ca3af' },

  // 汎用行
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  rowLeft: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  rowLabel: { fontSize: 15, color: '#111827' },
  rowLabelDestructive: { fontSize: 15, color: '#ef4444' },
  rowValue: { fontSize: 14, color: '#9ca3af' },
  separator: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: '#f3f4f6',
    marginLeft: 48,
  },
});
