import { useEffect, useState, useRef } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Animated, AppState } from 'react-native';
import * as Clipboard from 'expo-clipboard';

const MAPS_PATTERN = /https?:\/\/(maps\.app\.goo\.gl|www\.google\.com\/maps|tabelog\.com)\S*/;

interface Props {
  onAddUrl: (url: string) => void;
}

export default function ClipboardBanner({ onAddUrl }: Props) {
  const [url, setUrl] = useState<string | null>(null);
  const slideAnim = useRef(new Animated.Value(-80)).current;

  const show = (detectedUrl: string) => {
    setUrl(detectedUrl);
    Animated.spring(slideAnim, { toValue: 0, useNativeDriver: true, tension: 80 }).start();
  };

  const hide = () => {
    Animated.timing(slideAnim, { toValue: -80, duration: 200, useNativeDriver: true }).start(() => setUrl(null));
  };

  const checkClipboard = async () => {
    try {
      const text = await Clipboard.getStringAsync();
      if (text && MAPS_PATTERN.test(text)) show(text);
    } catch { /* 権限なしは無視 */ }
  };

  useEffect(() => {
    // 初回チェック
    checkClipboard();
    // アプリがフォアグラウンドに戻った時もチェック
    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'active') checkClipboard();
    });
    return () => sub.remove();
  }, []);

  if (!url) return null;

  return (
    <Animated.View style={[styles.banner, { transform: [{ translateY: slideAnim }] }]}>
      <View style={styles.content}>
        <Text style={styles.icon}>📍</Text>
        <View style={styles.textArea}>
          <Text style={styles.title}>マップのURLが見つかりました</Text>
          <Text style={styles.url} numberOfLines={1}>{url}</Text>
        </View>
      </View>
      <View style={styles.actions}>
        <TouchableOpacity
          style={styles.addBtn}
          onPress={() => { onAddUrl(url); hide(); Clipboard.setStringAsync(''); }}
        >
          <Text style={styles.addBtnText}>追加</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.dismissBtn} onPress={hide}>
          <Text style={styles.dismissBtnText}>無視</Text>
        </TouchableOpacity>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  banner: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    backgroundColor: '#1f2937',
    paddingHorizontal: 16,
    paddingVertical: 12,
    zIndex: 100,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 8,
  },
  content: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 8 },
  icon: { fontSize: 20 },
  textArea: { flex: 1 },
  title: { fontSize: 13, fontWeight: '600', color: '#fff' },
  url: { fontSize: 11, color: '#9ca3af', marginTop: 2 },
  actions: { flexDirection: 'row', gap: 8, justifyContent: 'flex-end' },
  addBtn: {
    backgroundColor: '#2563eb',
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 8,
  },
  addBtnText: { color: '#fff', fontSize: 13, fontWeight: '700' },
  dismissBtn: {
    backgroundColor: '#374151',
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 8,
  },
  dismissBtnText: { color: '#9ca3af', fontSize: 13 },
});
