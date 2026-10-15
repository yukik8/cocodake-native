import { defineConfig } from 'vitest/config';

// テストは react-native に依存しない純粋なモジュール（src/lib）だけを対象にする
export default defineConfig({
  test: {
    include: ['src/**/*.test.ts'],
    environment: 'node',
  },
});
