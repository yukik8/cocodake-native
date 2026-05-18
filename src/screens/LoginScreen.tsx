import { useState } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet,
  ActivityIndicator, Alert, SafeAreaView, Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as WebBrowser from 'expo-web-browser';
import * as AppleAuthentication from 'expo-apple-authentication';
import { supabase } from '../lib/supabase';
import LegalScreen from './LegalScreen';
import { TERMS, PRIVACY_POLICY } from '../lib/legalContent';

WebBrowser.maybeCompleteAuthSession();

const STEPS = [
  {
    icon: 'bookmark-outline' as const,
    color: '#f97316',
    bg: '#fff7ed',
    app: 'Google Maps・食べログ',
    label: '場所を登録',
  },
  {
    icon: 'map-outline' as const,
    color: '#8b5cf6',
    bg: '#f5f3ff',
    app: 'cocodake',
    label: 'エリアで絞り込む',
  },
  {
    icon: 'paper-plane-outline' as const,
    color: '#06b6d4',
    bg: '#ecfeff',
    app: '友達・グループに',
    label: 'まとめてシェア',
  },
];

export default function LoginScreen() {
  const [loading, setLoading] = useState(false);
  const [appleLoading, setAppleLoading] = useState(false);
  const [legalDoc, setLegalDoc] = useState<'terms' | 'privacy' | null>(null);

  const handleGoogleLogin = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: 'cocodake://auth-callback',
          skipBrowserRedirect: true,
          queryParams: { prompt: 'select_account' },
        },
      });
      if (error || !data.url) throw error ?? new Error('No URL');

      const result = await WebBrowser.openAuthSessionAsync(data.url, 'cocodake://auth-callback');

      if (result.type === 'success' && result.url) {
        const url = new URL(result.url);
        const code = url.searchParams.get('code');
        if (code) {
          const { error: sessionError } = await supabase.auth.exchangeCodeForSession(code);
          if (sessionError) throw sessionError;
        } else {
          const hash = url.hash.replace('#', '');
          const params = new URLSearchParams(hash);
          const access_token = params.get('access_token');
          const refresh_token = params.get('refresh_token');
          if (access_token && refresh_token) {
            await supabase.auth.setSession({ access_token, refresh_token });
          }
        }
      } else if (result.type === 'cancel' || result.type === 'dismiss') {
        const { data } = await supabase.auth.getSession();
        if (!data.session) {
          // 本当にキャンセル
        }
      }
    } catch (e) {
      Alert.alert('ログインエラー', String(e));
    } finally {
      setLoading(false);
    }
  };

  const handleAppleLogin = async () => {
    setAppleLoading(true);
    try {
      const credential = await AppleAuthentication.signInAsync({
        requestedScopes: [
          AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
          AppleAuthentication.AppleAuthenticationScope.EMAIL,
        ],
      });
      if (!credential.identityToken) throw new Error('No identity token');
      const { error } = await supabase.auth.signInWithIdToken({
        provider: 'apple',
        token: credential.identityToken,
      });
      if (error) throw error;
    } catch (e: any) {
      if (e?.code !== 'ERR_REQUEST_CANCELED') {
        Alert.alert('ログインエラー', String(e?.message ?? e));
      }
    } finally {
      setAppleLoading(false);
    }
  };

  return (
    <>
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
    <SafeAreaView style={styles.root}>
      {/* ヒーロー */}
      <View style={styles.hero}>
        <View style={styles.logoMark}>
          <Ionicons name="map" size={28} color="#f97316" />
        </View>
        <Text style={styles.appName}>cocodake</Text>
        <Text style={styles.heroSub}>
          行きたい場所を集めて{'\n'}エリアで切り取ってシェア
        </Text>
      </View>

      {/* 3ステップフロー */}
      <View style={styles.steps}>
        {STEPS.map((step, i) => (
          <View key={step.icon} style={styles.stepItem}>
            <View style={[styles.stepIconWrap, { backgroundColor: step.bg }]}>
              <Ionicons name={step.icon} size={22} color={step.color} />
            </View>
            <Text style={styles.stepApp}>{step.app}</Text>
            <Text style={styles.stepLabel}>{step.label}</Text>
            {i < STEPS.length - 1 && (
              <Ionicons name="chevron-forward" size={14} color="#d1d5db" style={styles.stepArrow} />
            )}
          </View>
        ))}
      </View>

      {/* ログインエリア */}
      <View style={styles.loginArea}>
        <TouchableOpacity
          style={[styles.googleBtn, loading && styles.googleBtnDisabled]}
          onPress={handleGoogleLogin}
          disabled={loading || appleLoading}
          activeOpacity={0.85}
        >
          {loading ? (
            <ActivityIndicator size="small" color="#374151" />
          ) : (
            <>
              <Text style={styles.googleG}>G</Text>
              <Text style={styles.googleBtnText}>Googleでログイン</Text>
            </>
          )}
        </TouchableOpacity>

        {Platform.OS === 'ios' && (
          <AppleAuthentication.AppleAuthenticationButton
            buttonType={AppleAuthentication.AppleAuthenticationButtonType.SIGN_IN}
            buttonStyle={AppleAuthentication.AppleAuthenticationButtonStyle.BLACK}
            cornerRadius={14}
            style={styles.appleBtn}
            onPress={handleAppleLogin}
          />
        )}

        <Text style={styles.terms}>
          ログインすることで
          <Text style={styles.termsLink} onPress={() => setLegalDoc('terms')}>利用規約</Text>
          ・
          <Text style={styles.termsLink} onPress={() => setLegalDoc('privacy')}>プライバシーポリシー</Text>
          に同意したものとみなします
        </Text>
      </View>
    </SafeAreaView>
    </>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#fafafa',
  },

  // ヒーロー
  hero: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: 32,
    gap: 12,
  },
  logoMark: {
    width: 52,
    height: 52,
    borderRadius: 14,
    backgroundColor: '#fff7ed',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  appName: {
    fontSize: 38,
    fontWeight: '800',
    color: '#111827',
    letterSpacing: -1,
  },
  heroSub: {
    fontSize: 15,
    color: '#6b7280',
    lineHeight: 23,
  },

  // 3ステップ
  steps: {
    flexDirection: 'row',
    marginHorizontal: 24,
    marginBottom: 32,
    backgroundColor: '#fff',
    borderRadius: 20,
    paddingVertical: 20,
    paddingHorizontal: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
  },
  stepItem: {
    flex: 1,
    alignItems: 'center',
    gap: 6,
  },
  stepIconWrap: {
    width: 48,
    height: 48,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepApp: {
    fontSize: 9,
    color: '#9ca3af',
    textAlign: 'center',
    lineHeight: 13,
  },
  stepLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#111827',
    textAlign: 'center',
    lineHeight: 16,
  },
  stepArrow: {
    position: 'absolute',
    right: -4,
    top: 17,
  },

  // ログインエリア
  loginArea: {
    paddingHorizontal: 24,
    paddingBottom: 32,
    gap: 14,
  },
  googleBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    paddingVertical: 15,
    borderRadius: 14,
    backgroundColor: '#fff',
    borderWidth: 1.5,
    borderColor: '#e5e7eb',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
  },
  googleBtnDisabled: { opacity: 0.5 },
  googleG: { fontSize: 16, fontWeight: '700', color: '#4285F4' },
  googleBtnText: { fontSize: 15, fontWeight: '600', color: '#111827' },
  appleBtn: {
    width: '100%',
    height: 50,
  },

  terms: {
    fontSize: 11,
    color: '#9ca3af',
    textAlign: 'center',
    lineHeight: 16,
  },
  termsLink: {
    color: '#6b7280',
    textDecorationLine: 'underline',
  },
});
