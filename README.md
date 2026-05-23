*日本語は下に記載しています。*

# cocodake — iOS / Android

> Native companion app for [cocodake](https://github.com/yukik8/map) — crop any area from your saved spots and share just those places with friends.

Shares the same Supabase backend as the web app. Includes custom Swift/Kotlin share extensions for adding spots directly from the OS share sheet.

**App Store**: [apps.apple.com/jp/app/cocodake/id6766069547](https://apps.apple.com/jp/app/cocodake/id6766069547)

---

## Native-specific features

- **Share Extension (iOS)** — Receives URLs from any app's share sheet and adds them directly to cocodake. Built as a custom Expo plugin in Swift
- **Intent Filter (Android)** — Same behavior on Android via a custom Kotlin Expo plugin
- **Cold launch handling** — Manages the session loading race condition when a URL arrives via share extension before auth completes
- **App Groups** — Passes session info between the share extension and the main app via a shared iOS container
- **GPS location** — Fetches current location and reflects it on the map

---

## Tech Stack

| | |
|---|---|
| Framework | React Native 0.81 / Expo 54 |
| Language | TypeScript |
| State | Riverpod (AsyncNotifier) |
| Map | MapLibre React Native · Supercluster |
| Auth | Firebase Auth (Apple Sign-In / Google) |
| Native Bridge | Swift (iOS share extension) · Kotlin (Android intent) |
| Build | EAS (Expo Application Services) |
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

> [cocodake](https://github.com/yukik8/map) のネイティブアプリ — 自分が保存したスポットから、行きたいエリアだけを切り取って友達に送れるアプリ。

WebアプリとSupabaseバックエンドを共有。iOSのシェアエクステンション（Swift）とAndroidのインテントフィルター（Kotlin）をカスタム実装しており、他のアプリから直接スポットを追加できる。

---

## Native固有の機能

- **シェアエクステンション（iOS）** — 他アプリのシェアシートからURLを受け取り、cocodakeに直接追加。Swift製カスタムExpoプラグインで実装
- **インテントフィルター（Android）** — Kotlin製カスタムプラグインで同様の動作を実現
- **コールドローンチ対応** — シェアエクステンション経由で起動した際のセッション読み込みレース条件を処理
- **App Groups** — iOSシェアエクステンションとメインアプリ間でセッション情報を共有コンテナで受け渡し
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
