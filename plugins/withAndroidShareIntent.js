const { withAndroidManifest, withMainActivity } = require('@expo/config-plugins');

// AndroidManifest.xml に ACTION_SEND インテントフィルタを追加
function withShareIntentFilter(config) {
  return withAndroidManifest(config, (config) => {
    const manifest = config.modResults;
    const mainActivity = manifest.manifest.application?.[0]?.activity?.find(
      (a) => a.$?.['android:name'] === '.MainActivity'
    );

    if (!mainActivity) return config;

    const existingFilters = mainActivity['intent-filter'] ?? [];
    const alreadyAdded = existingFilters.some(
      (f) => f.action?.[0]?.$?.['android:name'] === 'android.intent.action.SEND'
    );

    if (!alreadyAdded) {
      mainActivity['intent-filter'] = [
        ...existingFilters,
        {
          action: [{ $: { 'android:name': 'android.intent.action.SEND' } }],
          category: [{ $: { 'android:name': 'android.intent.category.DEFAULT' } }],
          data: [{ $: { 'android:mimeType': 'text/plain' } }],
        },
      ];
    }

    return config;
  });
}

// MainActivity.kt に Intent.EXTRA_TEXT の読み取り処理を注入
function withShareIntentMainActivity(config) {
  return withMainActivity(config, (config) => {
    let contents = config.modResults.contents;

    if (contents.includes('handleShareIntent')) {
      return config; // 既に適用済み
    }

    // import を追加（android.os.Bundle の前に挿入）
    contents = contents.replace(
      'import android.os.Bundle',
      'import android.content.Intent\nimport android.os.Bundle'
    );

    // onCreate 内の super.onCreate(...) の直後に handleShareIntent を呼び出す
    contents = contents.replace(
      /super\.onCreate\(.*?\)\n/,
      (match) => match + '    handleShareIntent(intent)\n'
    );

    // クラス末尾に onNewIntent と handleShareIntent を追加
    const methods = `
  override fun onNewIntent(intent: Intent) {
    super.onNewIntent(intent)
    handleShareIntent(intent)
  }

  private fun handleShareIntent(intent: Intent?) {
    if (intent?.action == Intent.ACTION_SEND && intent.type?.startsWith("text/") == true) {
      val sharedText = intent.getStringExtra(Intent.EXTRA_TEXT) ?: return
      getSharedPreferences("share_intent", MODE_PRIVATE)
        .edit()
        .putString("pending_url", sharedText)
        .apply()
    }
  }
`;

    contents = contents.replace(/\n}\s*$/, methods + '\n}\n');

    config.modResults.contents = contents;
    return config;
  });
}

module.exports = (config) => {
  config = withShareIntentFilter(config);
  config = withShareIntentMainActivity(config);
  return config;
};
