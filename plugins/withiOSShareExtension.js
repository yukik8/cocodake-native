const {
  withXcodeProject,
  withEntitlementsPlist,
} = require('@expo/config-plugins');
const path = require('path');
const fs = require('fs');

const APP_GROUP_ID = 'group.com.cocodake.app';
const EXTENSION_TARGET_NAME = 'CocodakeShareExtension';
const EXTENSION_BUNDLE_ID = 'com.cocodake.app.ShareExtension';

// ─── ファイル内容 ───────────────────────────────────────────────

const SHARE_VIEW_CONTROLLER_SWIFT = `import UIKit
import UniformTypeIdentifiers
import MobileCoreServices

class ShareViewController: UIViewController {
  private let appGroupId = "${APP_GROUP_ID}"
  private var pendingUrl: String?

  override func viewDidLoad() {
    super.viewDidLoad()
    view.backgroundColor = .systemBackground
    showLoading()
    extractSharedUrl { [weak self] urlString in
      guard let self else { return }
      guard let urlString else {
        DispatchQueue.main.async { self.showError() }
        return
      }
      let cleanUrl = self.stripTrackingParams(urlString)
      self.resolveUrl(cleanUrl) { [weak self] resolved in
        guard let self else { return }
        self.pendingUrl = resolved
        let placeId = self.extractPlaceId(from: resolved)
        let cachedIds = UserDefaults(suiteName: self.appGroupId)?.stringArray(forKey: "cachedPlaceIds") ?? []
        let alreadyAdded = placeId != nil && cachedIds.contains(placeId!)
        DispatchQueue.main.async { self.setupUI(urlString: cleanUrl, alreadyAdded: alreadyAdded) }
      }
    }
  }

  private func showLoading() {
    view.subviews.forEach { $0.removeFromSuperview() }
    let indicator = UIActivityIndicatorView(style: .medium)
    indicator.translatesAutoresizingMaskIntoConstraints = false
    indicator.startAnimating()
    view.addSubview(indicator)
    NSLayoutConstraint.activate([
      indicator.centerXAnchor.constraint(equalTo: view.centerXAnchor),
      indicator.centerYAnchor.constraint(equalTo: view.centerYAnchor),
    ])
  }

  private func showError() {
    view.subviews.forEach { $0.removeFromSuperview() }

    let iconView = UIImageView(image: UIImage(systemName: "exclamationmark.circle.fill"))
    iconView.tintColor = .systemGray3
    iconView.contentMode = .scaleAspectFit
    iconView.translatesAutoresizingMaskIntoConstraints = false

    let titleLabel = makeLabel("URLを取得できませんでした", font: .systemFont(ofSize: 15, weight: .semibold), color: .label)
    titleLabel.textAlignment = .center

    let subLabel = makeLabel("Googleマップのリンクを共有してください", font: .systemFont(ofSize: 13), color: .secondaryLabel)
    subLabel.textAlignment = .center
    subLabel.numberOfLines = 2

    let closeButton = makeRoundedButton("閉じる", background: .secondarySystemBackground, foreground: .label)
    closeButton.addTarget(self, action: #selector(didTapCancel), for: .touchUpInside)

    [iconView, titleLabel, subLabel, closeButton].forEach { view.addSubview($0) }
    let guide = view.safeAreaLayoutGuide
    NSLayoutConstraint.activate([
      iconView.topAnchor.constraint(equalTo: guide.topAnchor, constant: 40),
      iconView.centerXAnchor.constraint(equalTo: view.centerXAnchor),
      iconView.widthAnchor.constraint(equalToConstant: 44),
      iconView.heightAnchor.constraint(equalToConstant: 44),
      titleLabel.topAnchor.constraint(equalTo: iconView.bottomAnchor, constant: 16),
      titleLabel.centerXAnchor.constraint(equalTo: view.centerXAnchor),
      subLabel.topAnchor.constraint(equalTo: titleLabel.bottomAnchor, constant: 8),
      subLabel.leadingAnchor.constraint(equalTo: view.leadingAnchor, constant: 40),
      subLabel.trailingAnchor.constraint(equalTo: view.trailingAnchor, constant: -40),
      closeButton.topAnchor.constraint(equalTo: subLabel.bottomAnchor, constant: 28),
      closeButton.leadingAnchor.constraint(equalTo: view.leadingAnchor, constant: 20),
      closeButton.trailingAnchor.constraint(equalTo: view.trailingAnchor, constant: -20),
      closeButton.heightAnchor.constraint(equalToConstant: 50),
    ])
  }

  private func setupUI(urlString: String, alreadyAdded: Bool) {
    view.subviews.forEach { $0.removeFromSuperview() }

    let iconView = UIImageView(image: UIImage(systemName: "mappin.circle.fill"))
    iconView.tintColor = UIColor(red: 0.145, green: 0.388, blue: 0.925, alpha: 1)
    iconView.contentMode = .scaleAspectFit
    iconView.translatesAutoresizingMaskIntoConstraints = false

    let placeName = extractDisplayName(from: urlString)
    let nameLabel = makeLabel(placeName, font: .systemFont(ofSize: 16, weight: .semibold), color: .label)
    nameLabel.numberOfLines = 2
    nameLabel.textAlignment = .center

    let domainLabel = makeLabel(friendlySource(from: urlString), font: .systemFont(ofSize: 12), color: .tertiaryLabel)
    domainLabel.textAlignment = .center

    let cancelButton = UIButton(type: .system)
    cancelButton.setTitle("キャンセル", for: .normal)
    cancelButton.setTitleColor(.secondaryLabel, for: .normal)
    cancelButton.translatesAutoresizingMaskIntoConstraints = false
    cancelButton.addTarget(self, action: #selector(didTapCancel), for: .touchUpInside)

    let guide = view.safeAreaLayoutGuide

    if alreadyAdded {
      let badge = makeLabel("すでにリストにあります", font: .systemFont(ofSize: 14), color: .secondaryLabel)
      badge.textAlignment = .center

      [iconView, nameLabel, domainLabel, badge, cancelButton].forEach { view.addSubview($0) }
      NSLayoutConstraint.activate([
        iconView.topAnchor.constraint(equalTo: guide.topAnchor, constant: 32),
        iconView.centerXAnchor.constraint(equalTo: view.centerXAnchor),
        iconView.widthAnchor.constraint(equalToConstant: 40),
        iconView.heightAnchor.constraint(equalToConstant: 40),
        nameLabel.topAnchor.constraint(equalTo: iconView.bottomAnchor, constant: 12),
        nameLabel.leadingAnchor.constraint(equalTo: view.leadingAnchor, constant: 20),
        nameLabel.trailingAnchor.constraint(equalTo: view.trailingAnchor, constant: -20),
        domainLabel.topAnchor.constraint(equalTo: nameLabel.bottomAnchor, constant: 4),
        domainLabel.centerXAnchor.constraint(equalTo: view.centerXAnchor),
        badge.topAnchor.constraint(equalTo: domainLabel.bottomAnchor, constant: 24),
        badge.centerXAnchor.constraint(equalTo: view.centerXAnchor),
        cancelButton.topAnchor.constraint(equalTo: badge.bottomAnchor, constant: 16),
        cancelButton.centerXAnchor.constraint(equalTo: view.centerXAnchor),
      ])
    } else {
      let addButton = makeRoundedButton(
        "リストに追加",
        background: UIColor(red: 0.145, green: 0.388, blue: 0.925, alpha: 1),
        foreground: .white
      )
      addButton.addTarget(self, action: #selector(didTapAdd), for: .touchUpInside)

      [iconView, nameLabel, domainLabel, addButton, cancelButton].forEach { view.addSubview($0) }
      NSLayoutConstraint.activate([
        iconView.topAnchor.constraint(equalTo: guide.topAnchor, constant: 32),
        iconView.centerXAnchor.constraint(equalTo: view.centerXAnchor),
        iconView.widthAnchor.constraint(equalToConstant: 40),
        iconView.heightAnchor.constraint(equalToConstant: 40),
        nameLabel.topAnchor.constraint(equalTo: iconView.bottomAnchor, constant: 12),
        nameLabel.leadingAnchor.constraint(equalTo: view.leadingAnchor, constant: 20),
        nameLabel.trailingAnchor.constraint(equalTo: view.trailingAnchor, constant: -20),
        domainLabel.topAnchor.constraint(equalTo: nameLabel.bottomAnchor, constant: 4),
        domainLabel.centerXAnchor.constraint(equalTo: view.centerXAnchor),
        addButton.topAnchor.constraint(equalTo: domainLabel.bottomAnchor, constant: 28),
        addButton.leadingAnchor.constraint(equalTo: view.leadingAnchor, constant: 20),
        addButton.trailingAnchor.constraint(equalTo: view.trailingAnchor, constant: -20),
        addButton.heightAnchor.constraint(equalToConstant: 50),
        cancelButton.topAnchor.constraint(equalTo: addButton.bottomAnchor, constant: 14),
        cancelButton.centerXAnchor.constraint(equalTo: view.centerXAnchor),
      ])
    }
  }

  @objc private func didTapAdd() {
    let trimmedUrl = pendingUrl?.trimmingCharacters(in: .whitespacesAndNewlines) ?? ""
    guard !trimmedUrl.isEmpty else { showApiError("URL: empty (raw: \\(pendingUrl ?? "nil"))"); return }
    let defaults = UserDefaults(suiteName: appGroupId)
    guard let userId = defaults?.string(forKey: "userId"), !userId.isEmpty,
          let apiUrl  = defaults?.string(forKey: "apiUrl"),  !apiUrl.isEmpty else {
      showLoginRequired()
      return
    }
    showLoading()
    callAddPlace(url: trimmedUrl, userId: userId, apiUrl: apiUrl)
  }

  @objc private func didTapCancel() {
    complete()
  }

  private func callAddPlace(url: String, userId: String, apiUrl: String) {
    guard let endpoint = URL(string: "\\(apiUrl)/api/places/add") else {
      showApiError("APIのURLが無効です")
      return
    }
    var req = URLRequest(url: endpoint)
    req.httpMethod = "POST"
    req.setValue("application/json", forHTTPHeaderField: "Content-Type")
    req.timeoutInterval = 15
    var body: [String: String] = ["url": url, "session": userId]
    if let placeId = extractPlaceId(from: url) { body["place_id"] = placeId }
    req.httpBody = try? JSONSerialization.data(withJSONObject: body)
    URLSession.shared.dataTask(with: req) { [weak self] data, response, error in
      DispatchQueue.main.async {
        guard let self else { return }
        if let error = error { self.showApiError(error.localizedDescription); return }
        let status = (response as? HTTPURLResponse)?.statusCode ?? 0
        if status == 409 {
          self.showAlreadyExists()
        } else if (200..<300).contains(status) {
          self.showAdded()
        } else {
          let msg = data
            .flatMap { try? JSONSerialization.jsonObject(with: $0) as? [String: Any] }
            .flatMap { $0["error"] as? String } ?? "エラー \\(status)"
          self.showApiError(msg)
        }
      }
    }.resume()
  }

  private func showAdded() {
    view.subviews.forEach { $0.removeFromSuperview() }
    let checkView = UIImageView(image: UIImage(systemName: "checkmark.circle.fill"))
    checkView.tintColor = UIColor(red: 0.145, green: 0.388, blue: 0.925, alpha: 1)
    checkView.contentMode = .scaleAspectFit
    checkView.translatesAutoresizingMaskIntoConstraints = false
    let label = makeLabel("リストに追加しました", font: .systemFont(ofSize: 15, weight: .semibold), color: .label)
    label.textAlignment = .center
    view.addSubview(checkView)
    view.addSubview(label)
    NSLayoutConstraint.activate([
      checkView.centerXAnchor.constraint(equalTo: view.centerXAnchor),
      checkView.centerYAnchor.constraint(equalTo: view.centerYAnchor, constant: -20),
      checkView.widthAnchor.constraint(equalToConstant: 50),
      checkView.heightAnchor.constraint(equalToConstant: 50),
      label.topAnchor.constraint(equalTo: checkView.bottomAnchor, constant: 12),
      label.centerXAnchor.constraint(equalTo: view.centerXAnchor),
    ])
    DispatchQueue.main.asyncAfter(deadline: .now() + 1.2) { [weak self] in self?.complete() }
  }

  private func showAlreadyExists() {
    view.subviews.forEach { $0.removeFromSuperview() }
    let badge = makeLabel("すでにリストにあります", font: .systemFont(ofSize: 14), color: .secondaryLabel)
    badge.textAlignment = .center
    let closeButton = makeRoundedButton("閉じる", background: .secondarySystemBackground, foreground: .label)
    closeButton.addTarget(self, action: #selector(didTapCancel), for: .touchUpInside)
    [badge, closeButton].forEach { view.addSubview($0) }
    NSLayoutConstraint.activate([
      badge.centerXAnchor.constraint(equalTo: view.centerXAnchor),
      badge.centerYAnchor.constraint(equalTo: view.centerYAnchor, constant: -30),
      closeButton.topAnchor.constraint(equalTo: badge.bottomAnchor, constant: 24),
      closeButton.leadingAnchor.constraint(equalTo: view.leadingAnchor, constant: 20),
      closeButton.trailingAnchor.constraint(equalTo: view.trailingAnchor, constant: -20),
      closeButton.heightAnchor.constraint(equalToConstant: 50),
    ])
  }

  private func showLoginRequired() {
    view.subviews.forEach { $0.removeFromSuperview() }
    let label = makeLabel("cocodakeにログインしてから\\nお試しください", font: .systemFont(ofSize: 15), color: .label)
    label.textAlignment = .center
    label.numberOfLines = 2
    let closeButton = makeRoundedButton("閉じる", background: .secondarySystemBackground, foreground: .label)
    closeButton.addTarget(self, action: #selector(didTapCancel), for: .touchUpInside)
    [label, closeButton].forEach { view.addSubview($0) }
    NSLayoutConstraint.activate([
      label.centerXAnchor.constraint(equalTo: view.centerXAnchor),
      label.centerYAnchor.constraint(equalTo: view.centerYAnchor, constant: -30),
      label.leadingAnchor.constraint(equalTo: view.leadingAnchor, constant: 20),
      label.trailingAnchor.constraint(equalTo: view.trailingAnchor, constant: -20),
      closeButton.topAnchor.constraint(equalTo: label.bottomAnchor, constant: 24),
      closeButton.leadingAnchor.constraint(equalTo: view.leadingAnchor, constant: 20),
      closeButton.trailingAnchor.constraint(equalTo: view.trailingAnchor, constant: -20),
      closeButton.heightAnchor.constraint(equalToConstant: 50),
    ])
  }

  private func showApiError(_ message: String) {
    view.subviews.forEach { $0.removeFromSuperview() }
    let iconView = UIImageView(image: UIImage(systemName: "exclamationmark.circle.fill"))
    iconView.tintColor = .systemGray3
    iconView.contentMode = .scaleAspectFit
    iconView.translatesAutoresizingMaskIntoConstraints = false
    let label = makeLabel(message, font: .systemFont(ofSize: 13), color: .secondaryLabel)
    label.textAlignment = .center
    label.numberOfLines = 3
    let closeButton = makeRoundedButton("閉じる", background: .secondarySystemBackground, foreground: .label)
    closeButton.addTarget(self, action: #selector(didTapCancel), for: .touchUpInside)
    [iconView, label, closeButton].forEach { view.addSubview($0) }
    let guide = view.safeAreaLayoutGuide
    NSLayoutConstraint.activate([
      iconView.topAnchor.constraint(equalTo: guide.topAnchor, constant: 40),
      iconView.centerXAnchor.constraint(equalTo: view.centerXAnchor),
      iconView.widthAnchor.constraint(equalToConstant: 40),
      iconView.heightAnchor.constraint(equalToConstant: 40),
      label.topAnchor.constraint(equalTo: iconView.bottomAnchor, constant: 12),
      label.leadingAnchor.constraint(equalTo: view.leadingAnchor, constant: 24),
      label.trailingAnchor.constraint(equalTo: view.trailingAnchor, constant: -24),
      closeButton.topAnchor.constraint(equalTo: label.bottomAnchor, constant: 24),
      closeButton.leadingAnchor.constraint(equalTo: view.leadingAnchor, constant: 20),
      closeButton.trailingAnchor.constraint(equalTo: view.trailingAnchor, constant: -20),
      closeButton.heightAnchor.constraint(equalToConstant: 50),
    ])
  }

  private func extractSharedUrl(completion: @escaping (String?) -> Void) {
    let items = (extensionContext?.inputItems as? [NSExtensionItem]) ?? []
    let attachments = items.flatMap { $0.attachments ?? [] }
    guard !attachments.isEmpty else { completion(nil); return }

    let urlId: String
    let textId: String
    if #available(iOS 14.0, *) {
      urlId = UTType.url.identifier
      textId = UTType.plainText.identifier
    } else {
      urlId = kUTTypeURL as String
      textId = kUTTypePlainText as String
    }

    // URL型を全 attachment から探す（URLが2番目以降に入るアプリ対応）
    for attachment in attachments {
      if attachment.hasItemConformingToTypeIdentifier(urlId) {
        attachment.loadItem(forTypeIdentifier: urlId) { data, _ in
          let s = ((data as? URL)?.absoluteString ?? data as? String ?? "")
            .trimmingCharacters(in: .whitespacesAndNewlines)
          completion(s.isEmpty ? nil : s)
        }
        return
      }
    }
    // フォールバック: テキスト型から URL を探す
    // 食べログは「店名\\n電話\\n住所\\nURL」形式のプレーンテキストでシェアするため
    // テキスト中から URL だけを抽出する
    for attachment in attachments {
      if attachment.hasItemConformingToTypeIdentifier(textId) {
        attachment.loadItem(forTypeIdentifier: textId) { data, _ in
          let text = (data as? String ?? "").trimmingCharacters(in: .whitespacesAndNewlines)
          let words = text.components(separatedBy: .whitespacesAndNewlines)
          let tabelogUrl = words.first(where: { $0.contains("tabelog.com") && $0.hasPrefix("http") })
          let anyUrl    = words.first(where: { $0.hasPrefix("https://") || $0.hasPrefix("http://") })
          let found = tabelogUrl ?? anyUrl
          completion(found?.isEmpty == false ? found : (text.isEmpty ? nil : text))
        }
        return
      }
    }
    completion(nil)
  }

  private func stripTrackingParams(_ urlString: String) -> String {
    guard var comps = URLComponents(string: urlString) else { return urlString }
    comps.queryItems = comps.queryItems?.filter { $0.name != "g_st" }
    if comps.queryItems?.isEmpty == true { comps.queryItems = nil }
    return comps.url?.absoluteString ?? urlString
  }

  private func resolveUrl(_ urlString: String, completion: @escaping (String) -> Void) {
    guard let url = URL(string: urlString) else { completion(urlString); return }
    var request = URLRequest(url: url)
    request.httpMethod = "GET"
    request.timeoutInterval = 5
    URLSession.shared.dataTask(with: request) { _, response, _ in
      completion((response as? HTTPURLResponse)?.url?.absoluteString ?? urlString)
    }.resume()
  }

  private func extractPlaceId(from url: String) -> String? {
    if let range = url.range(of: "!1s(ChIJ[^!]+)", options: .regularExpression) {
      return String(url[range]).replacingOccurrences(of: "!1s", with: "")
    }
    if let range = url.range(of: "(?:q=place_id:|place_id=)(ChIJ[^&!/ ]+)", options: .regularExpression) {
      let match = String(url[range])
      return match.components(separatedBy: ":").last ?? match.components(separatedBy: "=").last
    }
    return nil
  }

  private func extractDisplayName(from urlString: String) -> String {
    if let url = URL(string: urlString) {
      let parts = url.pathComponents
      if let idx = parts.firstIndex(of: "place"), idx + 1 < parts.count {
        let raw = parts[idx + 1]
        let decoded = raw.removingPercentEncoding ?? raw
        if !decoded.isEmpty && decoded != "/" { return decoded }
      }
    }
    return urlString.removingPercentEncoding ?? urlString
  }

  private func friendlySource(from urlString: String) -> String {
    guard let host = URL(string: urlString)?.host else { return "Google マップ" }
    if host.contains("google.com") || host.contains("goo.gl") { return "Google マップ" }
    return host.replacingOccurrences(of: "www.", with: "")
  }

  private func makeLabel(_ text: String, font: UIFont, color: UIColor) -> UILabel {
    let label = UILabel()
    label.text = text
    label.font = font
    label.textColor = color
    label.translatesAutoresizingMaskIntoConstraints = false
    return label
  }

  private func makeRoundedButton(_ title: String, background: UIColor, foreground: UIColor) -> UIButton {
    let button = UIButton(type: .system)
    button.setTitle(title, for: .normal)
    button.backgroundColor = background
    button.setTitleColor(foreground, for: .normal)
    button.titleLabel?.font = .systemFont(ofSize: 15, weight: .semibold)
    button.layer.cornerRadius = 12
    button.translatesAutoresizingMaskIntoConstraints = false
    return button
  }

  private func complete() {
    extensionContext?.completeRequest(returningItems: nil, completionHandler: nil)
  }
}
`;

const INFO_PLIST = `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>CFBundleDisplayName</key>
  <string>cocodake</string>
  <key>CFBundleExecutable</key>
  <string>$(EXECUTABLE_NAME)</string>
  <key>CFBundleIdentifier</key>
  <string>$(PRODUCT_BUNDLE_IDENTIFIER)</string>
  <key>CFBundleInfoDictionaryVersion</key>
  <string>6.0</string>
  <key>CFBundleName</key>
  <string>$(PRODUCT_NAME)</string>
  <key>CFBundlePackageType</key>
  <string>$(PRODUCT_BUNDLE_PACKAGE_TYPE)</string>
  <key>CFBundleShortVersionString</key>
  <string>$(MARKETING_VERSION)</string>
  <key>CFBundleVersion</key>
  <string>$(CURRENT_PROJECT_VERSION)</string>
  <key>NSExtension</key>
  <dict>
    <key>NSExtensionAttributes</key>
    <dict>
      <key>NSExtensionActivationRule</key>
      <dict>
        <key>NSExtensionActivationSupportsText</key>
        <true/>
        <key>NSExtensionActivationSupportsWebURLWithMaxCount</key>
        <integer>1</integer>
      </dict>
    </dict>
    <key>NSExtensionPrincipalClass</key>
    <string>$(PRODUCT_MODULE_NAME).ShareViewController</string>
    <key>NSExtensionPointIdentifier</key>
    <string>com.apple.share-services</string>
  </dict>
</dict>
</plist>
`;

const ENTITLEMENTS_PLIST = `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>com.apple.security.application-groups</key>
  <array>
    <string>${APP_GROUP_ID}</string>
  </array>
</dict>
</plist>
`;

// ─── プラグイン本体 ─────────────────────────────────────────────

// ① メインアプリのエンタイトルメントに App Group を追加
function withAppGroupEntitlements(config) {
  return withEntitlementsPlist(config, (config) => {
    const groups = config.modResults['com.apple.security.application-groups'] ?? [];
    if (!groups.includes(APP_GROUP_ID)) {
      config.modResults['com.apple.security.application-groups'] = [...groups, APP_GROUP_ID];
    }
    return config;
  });
}

// ② Xcode プロジェクトに Share Extension ターゲットを追加（ファイル生成も含む）
function withShareExtensionTarget(config) {
  return withXcodeProject(config, (config) => {
    const xcodeProject = config.modResults;
    const projectRoot = config.modRequest.projectRoot;
    const iosRoot = path.join(projectRoot, 'ios');
    const extDir = path.join(iosRoot, 'ShareExtension');

    // --- ios/ShareExtension/ にファイルを生成 ---
    if (!fs.existsSync(extDir)) fs.mkdirSync(extDir, { recursive: true });
    fs.writeFileSync(path.join(extDir, 'ShareViewController.swift'), SHARE_VIEW_CONTROLLER_SWIFT, 'utf8');
    fs.writeFileSync(path.join(extDir, 'Info.plist'), INFO_PLIST, 'utf8');
    fs.writeFileSync(path.join(extDir, 'ShareExtension.entitlements'), ENTITLEMENTS_PLIST, 'utf8');

    // バージョン同期スクリプト（EASが親アプリのInfo.plistを直接書き換えるため、
    // extensionのInfo.plistにも同じ値をコピーするrun script）
    const syncScript = `#!/bin/sh
PARENT="$SRCROOT/cocodake/Info.plist"
V=$(/usr/libexec/PlistBuddy -c "Print :CFBundleVersion" "$PARENT" 2>/dev/null)
if [ -n "$V" ]; then
  /usr/libexec/PlistBuddy -c "Set :CFBundleVersion $V" "$SRCROOT/$INFOPLIST_FILE"
fi
M=$(/usr/libexec/PlistBuddy -c "Print :CFBundleShortVersionString" "$PARENT" 2>/dev/null)
if [ -n "$M" ]; then
  /usr/libexec/PlistBuddy -c "Set :CFBundleShortVersionString $M" "$SRCROOT/$INFOPLIST_FILE"
fi
`;
    fs.writeFileSync(path.join(iosRoot, 'sync-extension-version.sh'), syncScript, { mode: 0o755 });

    const existingTarget = xcodeProject.pbxTargetByName(EXTENSION_TARGET_NAME);

    // 既存ターゲットでもビルド設定は毎回更新する
    if (existingTarget) {
      const developmentTeam =
        process.env.APPLE_TEAM_ID ||
        config.ios?.appleTeamId ||
        '';
      const configListKey = existingTarget.buildConfigurationList;
      const configListSection = xcodeProject.hash.project.objects['XCConfigurationList'] ?? {};
      const configList = configListSection[configListKey];
      if (configList?.buildConfigurations) {
        const buildConfigSection = xcodeProject.pbxXCBuildConfigurationSection();
        configList.buildConfigurations.forEach((configRef) => {
          const cfg = buildConfigSection[configRef.value];
          if (!cfg?.buildSettings) return;
          cfg.buildSettings['CODE_SIGN_STYLE'] = 'Manual';
          cfg.buildSettings['DEVELOPMENT_TEAM'] = developmentTeam;
          cfg.buildSettings['CODE_SIGN_IDENTITY'] = '"Apple Distribution"';
          cfg.buildSettings['CODE_SIGN_ENTITLEMENTS'] =
            '"ShareExtension/ShareExtension.entitlements"';
          cfg.buildSettings['PROVISIONING_PROFILE'] =
            '"9c761d1a-c8b9-440c-adcb-67eab659305b"';
          cfg.buildSettings['PROVISIONING_PROFILE_SPECIFIER'] =
            '"*[expo] com.cocodake.app.ShareExtension AppStore 2026-05-03T13:41:47.617Z"';
        });
      }
      return config;
    }

    // --- 1. ShareExtension グループを作成して Main Group に追加 ---
    const extGroup = xcodeProject.addPbxGroup([], 'ShareExtension', 'ShareExtension');
    const groupUuid = extGroup.uuid;
    const mainGroupKey = xcodeProject.getFirstProject().firstProject.mainGroup;
    xcodeProject.addToPbxGroup(groupUuid, mainGroupKey);

    // --- 2. ターゲットを追加 ---
    const target = xcodeProject.addTarget(
      EXTENSION_TARGET_NAME,
      'app_extension',
      'ShareExtension',
      EXTENSION_BUNDLE_ID
    );
    if (!target) {
      console.warn('[withiOSShareExtension] addTarget failed');
      return config;
    }
    const targetUuid = target.uuid;

    // --- 3. Build Phase を先に作成（addTarget は buildPhases を空で作る）---
    // 先に作成しないと addSourceFile が main target の Sources phase に追加してしまう
    xcodeProject.addBuildPhase([], 'PBXSourcesBuildPhase', 'Sources', targetUuid);

    // バージョン同期スクリプト（Resources の前に実行する必要がある）
    const syncPhaseUuid = xcodeProject.generateUuid();
    const shellScriptObjects = xcodeProject.hash.project.objects['PBXShellScriptBuildPhase'] =
      xcodeProject.hash.project.objects['PBXShellScriptBuildPhase'] || {};
    shellScriptObjects[syncPhaseUuid] = {
      isa: 'PBXShellScriptBuildPhase',
      buildActionMask: 2147483647,
      files: [],
      inputFileListPaths: [],
      inputPaths: ['"$(SRCROOT)/cocodake/Info.plist"'],
      name: '"Sync Version with Parent App"',
      outputFileListPaths: [],
      outputPaths: ['"$(SRCROOT)/ShareExtension/Info.plist"'],
      runOnlyForDeploymentPostprocessing: 0,
      shellPath: '/bin/sh',
      shellScript: '"bash \\"$SRCROOT/sync-extension-version.sh\\""',
    };
    shellScriptObjects[`${syncPhaseUuid}_comment`] = 'Sync Version with Parent App';
    const pbxNativeTargets = xcodeProject.hash.project.objects['PBXNativeTarget'];
    if (pbxNativeTargets[targetUuid]) {
      pbxNativeTargets[targetUuid].buildPhases.push({
        value: syncPhaseUuid,
        comment: 'Sync Version with Parent App',
      });
    }

    xcodeProject.addBuildPhase([], 'PBXResourcesBuildPhase', 'Resources', targetUuid);
    xcodeProject.addBuildPhase([], 'PBXFrameworksBuildPhase', 'Frameworks', targetUuid);

    // --- 4. Swift ソースをグループ + extension の Sources Build Phase に追加 ---
    // グループが path:'ShareExtension' なのでファイル名だけ渡す（フルパスにすると二重になる）
    xcodeProject.addSourceFile(
      'ShareViewController.swift',
      { target: targetUuid },
      groupUuid
    );

    // --- 5. Info.plist はファイル参照のみ（INFOPLIST_FILE build setting で参照するため build phase 不要）---
    xcodeProject.addFile(
      'Info.plist',
      groupUuid,
      { lastKnownFileType: 'text.plist.xml' }
    );

    // --- 5. このターゲット専用のビルド設定を直接書き換え ---
    // EAS Build は expo prebuild 前に APPLE_TEAM_ID を環境変数にセットする
    const developmentTeam =
      process.env.APPLE_TEAM_ID ||
      config.ios?.appleTeamId ||
      '';

    const configListKey = target.pbxNativeTarget.buildConfigurationList;
    const configListSection = xcodeProject.hash.project.objects['XCConfigurationList'] ?? {};
    const configList = configListSection[configListKey];

    if (configList?.buildConfigurations) {
      const buildConfigSection = xcodeProject.pbxXCBuildConfigurationSection();
      configList.buildConfigurations.forEach((configRef) => {
        const cfg = buildConfigSection[configRef.value];
        if (!cfg?.buildSettings) return;
        cfg.buildSettings['PRODUCT_BUNDLE_IDENTIFIER'] = EXTENSION_BUNDLE_ID;
        cfg.buildSettings['INFOPLIST_FILE'] = '"ShareExtension/Info.plist"';
        cfg.buildSettings['SWIFT_VERSION'] = '"5.0"';
        cfg.buildSettings['IPHONEOS_DEPLOYMENT_TARGET'] = '15.1';
        cfg.buildSettings['TARGETED_DEVICE_FAMILY'] = '"1,2"';
        cfg.buildSettings['CODE_SIGN_STYLE'] = 'Manual';
        cfg.buildSettings['DEVELOPMENT_TEAM'] = developmentTeam;
        cfg.buildSettings['CODE_SIGN_IDENTITY'] = '"Apple Distribution"';
        cfg.buildSettings['CODE_SIGN_ENTITLEMENTS'] =
          '"ShareExtension/ShareExtension.entitlements"';
        cfg.buildSettings['PROVISIONING_PROFILE'] =
          '"9c761d1a-c8b9-440c-adcb-67eab659305b"';
        cfg.buildSettings['PROVISIONING_PROFILE_SPECIFIER'] =
          '"*[expo] com.cocodake.app.ShareExtension AppStore 2026-05-03T13:41:47.617Z"';
      });
    }

    return config;
  });
}

module.exports = (config) => {
  config = withAppGroupEntitlements(config);
  config = withShareExtensionTarget(config);
  return config;
};
