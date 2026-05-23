# cocodake — iOS / Android

> **ここだけ** — 自分が保存したスポットから、行きたいエリアだけを切り取って友達に送れるアプリのネイティブアプリ。

Webアプリ → [cocodake/map](https://github.com/yukik8/map)

**App Store**: [apps.apple.com/jp/app/cocodake/id6766069547](https://apps.apple.com/jp/app/cocodake/id6766069547)

---

## このリポジトリについて

WebアプリとSupabaseバックエンドを共有するReact Native / Expoアプリ。  
iOSのシェアエクステンション（Swift）とAndroidのインテントフィルター（Kotlin）をカスタム実装しており、SafariやGoogle Mapsなど他のアプリから直接スポットを追加できる。

---

## Native固有の機能

- **シェアエクステンション（iOS）** — 他アプリのシェアシートからURLを受け取り、cocodakeに直接追加。Swift製カスタムExpoプラグインで実装
- **インテントフィルター（Android）** — Kotlin製カスタムプラグインで同様の動作を実現
- **コールドローンチ対応** — シェアエクステンション経由で起動した際のセッション読み込みレース条件を処理
- **App Groups** — iOSシェアエクステンションとメインアプリ間でセッション情報を共有コンテナで受け渡し
- **GPSロケーション** — 現在地の取得と地図への反映

---

## Tech Stack

| | |
|---|---|
| Framework | React Native 0.81 / Expo 54 |
| Language | TypeScript |
| State | Riverpod（AsyncNotifier） |
| Map | MapLibre React Native · Supercluster |
| Auth | Firebase Auth（Apple Sign-In / Google） |
| Native Bridge | Swift（iOS share extension）· Kotlin（Android intent） |
| Build | EAS（Expo Application Services） |
| Backend | Supabase / PostgreSQL + PostGIS（webアプリと共有） |

---

## セットアップ

### 1. 依存関係のインストール

```bash
npm install
```

### 2. 環境変数を設定

```bash
cp .env.example .env
# .env を編集
```

必要な変数:
- `EXPO_PUBLIC_SUPABASE_URL`
- `EXPO_PUBLIC_SUPABASE_ANON_KEY`

### 3. 開発用ビルド

```bash
# iOS
npx expo run:ios

# Android
npx expo run:android
```

### 4. EASビルド（本番）

```bash
eas build --platform ios
eas build --platform android
```
