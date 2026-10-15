*日本語は下に記載しています。*

# cocodake — iOS / Android

> Native companion app for [cocodake](https://github.com/yukik8/cocodake) — crop any area from your saved spots and share just those places with friends.

Shares the same Supabase backend as the web app. Includes custom Swift/Kotlin share extensions for adding spots directly from the OS share sheet.

**App Store**: [apps.apple.com/jp/app/cocodake/id6766069547](https://apps.apple.com/jp/app/cocodake/id6766069547)

---

## Native-specific features

- **Share Extension (iOS)** — Receives URLs from any app's share sheet and adds them directly to cocodake. Built as a custom Expo plugin in Swift
- **Intent Filter (Android)** — Same behavior on Android via a custom Kotlin Expo plugin
- **Cold launch handling** — Manages the session loading race condition when a URL arrives via share extension before auth completes
- **App Groups** — The main app writes the user's access token to a shared iOS container so the share extension can call the API; if the token is missing or expired, the extension hands the URL to the app, which adds it on next launch
- **GPS location** — Fetches current location and reflects it on the map

---

## Tech Stack

| | |
|---|---|
| Framework | React Native 0.81 / Expo 54 |
| Language | TypeScript |
| State | React hooks (useState / useMemo) |
| Map | MapLibre React Native · Supercluster |
| Auth | Supabase Auth (Sign in with Apple / Google) — API calls send the Supabase access token |
| Native Bridge | Swift (iOS share extension) · Kotlin (Android intent) |
| Build | EAS (Expo Application Services) |
| Tests / CI | Vitest (pure logic in `src/lib`) · GitHub Actions (typecheck + tests) |
| Backend | Supabase / PostgreSQL + PostGIS (shared with web) |

---

## Setup

### Install dependencies

```bash
npm install
```

### Set environment variables

```bash
cp .env.example .env
# Fill in the values
```

Required:
- `EXPO_PUBLIC_SUPABASE_URL`
- `EXPO_PUBLIC_SUPABASE_ANON_KEY`
- `EXPO_PUBLIC_API_URL` (the web app's URL; the native app calls its API)

### Tests

```bash
npm run typecheck
npm test
```

### Development build

```bash
# iOS
npx expo run:ios

# Android
npx expo run:android
```

### Production build (EAS)

```bash
eas build --platform ios
eas build --platform android
```

---

---
---

# cocodake — iOS / Android（日本語）

> [cocodake](https://github.com/yukik8/cocodake) のネイティブアプリ — 自分が保存したスポットから、行きたいエリアだけを切り取って友達に送れるアプリ。

WebアプリとSupabaseバックエンドを共有。iOSのシェアエクステンション（Swift）とAndroidのインテントフィルター（Kotlin）をカスタム実装しており、他のアプリから直接スポットを追加できる。

---

## Native固有の機能

- **シェアエクステンション（iOS）** — 他アプリのシェアシートからURLを受け取り、cocodakeに直接追加。Swift製カスタムExpoプラグインで実装
- **インテントフィルター（Android）** — Kotlin製カスタムプラグインで同様の動作を実現
- **コールドローンチ対応** — シェアエクステンション経由で起動した際のセッション読み込みレース条件を処理
- **App Groups** — メインアプリがアクセストークンを共有コンテナに書き込み、シェアエクステンションはそれでAPIを呼ぶ。トークンが無い・期限切れのときはURLをアプリに預け、次にアプリを開いたときに追加する
- **GPSロケーション** — 現在地の取得と地図への反映

---

## セットアップ

### 依存関係のインストール

```bash
npm install
```

### 環境変数

```bash
cp .env.example .env
```

必要な変数:
- `EXPO_PUBLIC_SUPABASE_URL`
- `EXPO_PUBLIC_SUPABASE_ANON_KEY`
- `EXPO_PUBLIC_API_URL`（WebアプリのURL。ネイティブアプリはこのAPIを呼ぶ）

### テスト

```bash
npm run typecheck
npm test
```

### 開発用ビルド

```bash
npx expo run:ios
npx expo run:android
```

### 本番ビルド（EAS）

```bash
eas build --platform ios
eas build --platform android
```
