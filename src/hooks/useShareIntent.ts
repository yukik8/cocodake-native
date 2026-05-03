import { useEffect, useCallback, useRef } from 'react';
import { AppState, type AppStateStatus } from 'react-native';
import { getPendingShareUrl } from '../../modules/share-intent';

export function useShareIntent(onShareUrl: (url: string) => void) {
  const onShareUrlRef = useRef(onShareUrl);
  onShareUrlRef.current = onShareUrl;
  const processingRef = useRef(false);

  const check = useCallback(async () => {
    if (processingRef.current) return;
    processingRef.current = true;
    try {
      const url = await getPendingShareUrl();
      if (url) onShareUrlRef.current(url);
    } catch {
      // ネイティブモジュール未ロード時（Expo Go等）は無視
    } finally {
      processingRef.current = false;
    }
  }, []);

  useEffect(() => {
    check();

    const handleAppStateChange = (state: AppStateStatus) => {
      if (state === 'active') check();
    };

    const sub = AppState.addEventListener('change', handleAppStateChange);
    return () => sub.remove();
  }, [check]);
}
