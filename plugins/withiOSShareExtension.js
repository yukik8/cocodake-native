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
    extractSharedUrl { [weak self] urlString in
      guard let self else { return }
      guard let urlString else { self.complete(); return }
      self.pendingUrl = urlString
      DispatchQueue.main.async { self.showLoading() }
      self.resolveUrl(urlString) { [weak self] resolved in
        guard let self else { return }
        let defaults = UserDefaults(suiteName: self.appGroupId)
        let cachedIds = defaults?.stringArray(forKey: "cachedPlaceIds") ?? []
        let cachedUrls = defaults?.stringArray(forKey: "cachedPlaceUrls") ?? []
        let placeId = self.extractPlaceId(from: resolved)
        let alreadyAdded = (placeId != nil && cachedIds.contains(placeId!))
          || cachedUrls.contains(resolved)
          || cachedUrls.contains(urlString)
        DispatchQueue.main.async { self.setupUI(urlString: urlString, alreadyAdded: alreadyAdded) }
      }
    }
  }

  private func showLoading() {
    view.backgroundColor = .systemBackground
    let indicator = UIActivityIndicatorView(style: .medium)
    indicator.translatesAutoresizingMaskIntoConstraints = false
    indicator.startAnimating()
    view.addSubview(indicator)
    NSLayoutConstraint.activate([
      indicator.centerXAnchor.constraint(equalTo: view.centerXAnchor),
      indicator.centerYAnchor.constraint(equalTo: view.centerYAnchor),
    ])
  }

  private func resolveUrl(_ urlString: String, completion: @escaping (String) -> Void) {
    guard let url = URL(string: urlString) else { completion(urlString); return }
    var request = URLRequest(url: url)
    request.httpMethod = "HEAD"
    request.timeoutInterval = 5
    URLSession.shared.dataTask(with: request) { _, response, _ in
      completion((response as? HTTPURLResponse)?.url?.absoluteString ?? urlString)
    }.resume()
  }

  private func extractPlaceId(from url: String) -> String? {
    // !1sChIJ... パターン（Google Maps データパラメータ）
    if let range = url.range(of: "!1s(ChIJ[^!]+)", options: .regularExpression) {
      return String(url[range]).replacingOccurrences(of: "!1s", with: "")
    }
    // q=place_id:ChIJ... パターン
    if let range = url.range(of: "(?:q=place_id:|place_id=)(ChIJ[^&!/ ]+)", options: .regularExpression) {
      let match = String(url[range])
      return match.components(separatedBy: ":").last ?? match.components(separatedBy: "=").last
    }
    return nil
  }

  private func setupUI(urlString: String, alreadyAdded: Bool) {
    view.subviews.forEach { $0.removeFromSuperview() }
    view.backgroundColor = .systemBackground
    let isAlreadyAdded = alreadyAdded

    let titleLabel = makeLabel("cocodake", font: .systemFont(ofSize: 17, weight: .bold), color: .label)
    let urlLabel = makeLabel(urlString, font: .systemFont(ofSize: 12), color: .secondaryLabel)
    urlLabel.numberOfLines = 3
    urlLabel.lineBreakMode = .byTruncatingMiddle

    let cancelButton = UIButton(type: .system)
    cancelButton.setTitle("キャンセル", for: .normal)
    cancelButton.setTitleColor(.secondaryLabel, for: .normal)
    cancelButton.translatesAutoresizingMaskIntoConstraints = false
    cancelButton.addTarget(self, action: #selector(didTapCancel), for: .touchUpInside)

    var views: [UIView] = [titleLabel, urlLabel]

    if isAlreadyAdded {
      let badge = makeLabel("すでにリストにあります", font: .systemFont(ofSize: 14), color: .secondaryLabel)
      badge.textAlignment = .center
      views.append(contentsOf: [badge, cancelButton])

      views.forEach { view.addSubview($0) }
      let guide = view.safeAreaLayoutGuide
      NSLayoutConstraint.activate([
        titleLabel.topAnchor.constraint(equalTo: guide.topAnchor, constant: 28),
        titleLabel.centerXAnchor.constraint(equalTo: view.centerXAnchor),
        urlLabel.topAnchor.constraint(equalTo: titleLabel.bottomAnchor, constant: 16),
        urlLabel.leadingAnchor.constraint(equalTo: view.leadingAnchor, constant: 20),
        urlLabel.trailingAnchor.constraint(equalTo: view.trailingAnchor, constant: -20),
        badge.topAnchor.constraint(equalTo: urlLabel.bottomAnchor, constant: 24),
        badge.centerXAnchor.constraint(equalTo: view.centerXAnchor),
        cancelButton.topAnchor.constraint(equalTo: badge.bottomAnchor, constant: 20),
        cancelButton.centerXAnchor.constraint(equalTo: view.centerXAnchor),
      ])
    } else {
      let addButton = UIButton(type: .system)
      addButton.setTitle("リストに追加", for: .normal)
      addButton.backgroundColor = UIColor(red: 0.145, green: 0.388, blue: 0.925, alpha: 1)
      addButton.setTitleColor(.white, for: .normal)
      addButton.titleLabel?.font = .systemFont(ofSize: 15, weight: .semibold)
      addButton.layer.cornerRadius = 10
      addButton.translatesAutoresizingMaskIntoConstraints = false
      addButton.addTarget(self, action: #selector(didTapAdd), for: .touchUpInside)

      views.append(contentsOf: [addButton, cancelButton])
      views.forEach { view.addSubview($0) }
      let guide = view.safeAreaLayoutGuide
      NSLayoutConstraint.activate([
        titleLabel.topAnchor.constraint(equalTo: guide.topAnchor, constant: 28),
        titleLabel.centerXAnchor.constraint(equalTo: view.centerXAnchor),
        urlLabel.topAnchor.constraint(equalTo: titleLabel.bottomAnchor, constant: 16),
        urlLabel.leadingAnchor.constraint(equalTo: view.leadingAnchor, constant: 20),
        urlLabel.trailingAnchor.constraint(equalTo: view.trailingAnchor, constant: -20),
        addButton.topAnchor.constraint(equalTo: urlLabel.bottomAnchor, constant: 28),
        addButton.leadingAnchor.constraint(equalTo: view.leadingAnchor, constant: 20),
        addButton.trailingAnchor.constraint(equalTo: view.trailingAnchor, constant: -20),
        addButton.heightAnchor.constraint(equalToConstant: 50),
        cancelButton.topAnchor.constraint(equalTo: addButton.bottomAnchor, constant: 14),
        cancelButton.centerXAnchor.constraint(equalTo: view.centerXAnchor),
      ])
    }
  }

  @objc private func didTapAdd() {
    if let url = pendingUrl {
      UserDefaults(suiteName: appGroupId)?.set(url, forKey: "pendingShareUrl")
      UserDefaults(suiteName: appGroupId)?.synchronize()
    }
    complete()
  }

  @objc private func didTapCancel() {
    complete()
  }

  private func extractSharedUrl(completion: @escaping (String?) -> Void) {
    guard let item = extensionContext?.inputItems.first as? NSExtensionItem,
          let attachment = item.attachments?.first else {
      completion(nil)
      return
    }
    let urlId: String
    let textId: String
    if #available(iOS 14.0, *) {
      urlId = UTType.url.identifier
      textId = UTType.plainText.identifier
    } else {
      urlId = kUTTypeURL as String
      textId = kUTTypePlainText as String
    }
    if attachment.hasItemConformingToTypeIdentifier(urlId) {
      attachment.loadItem(forTypeIdentifier: urlId) { data, _ in
        completion((data as? URL)?.absoluteString ?? data as? String)
      }
    } else if attachment.hasItemConformingToTypeIdentifier(textId) {
      attachment.loadItem(forTypeIdentifier: textId) { data, _ in
        completion(data as? String)
      }
    } else {
      completion(nil)
    }
  }

  private func complete() {
    extensionContext?.completeRequest(returningItems: nil, completionHandler: nil)
  }

  private func makeLabel(_ text: String, font: UIFont, color: UIColor) -> UILabel {
    let label = UILabel()
    label.text = text
    label.font = font
    label.textColor = color
    label.translatesAutoresizingMaskIntoConstraints = false
    return label
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

    // 既にターゲットが追加済みならスキップ
    if (xcodeProject.pbxTargetByName(EXTENSION_TARGET_NAME)) {
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
        cfg.buildSettings['MARKETING_VERSION'] = config.version || '1.0.0';
        cfg.buildSettings['CURRENT_PROJECT_VERSION'] = String(config.ios?.buildNumber ?? '1');
        cfg.buildSettings['SWIFT_VERSION'] = '"5.0"';
        cfg.buildSettings['IPHONEOS_DEPLOYMENT_TARGET'] = '15.1';
        cfg.buildSettings['TARGETED_DEVICE_FAMILY'] = '"1,2"';
        cfg.buildSettings['CODE_SIGN_STYLE'] = 'Manual';
        cfg.buildSettings['DEVELOPMENT_TEAM'] = developmentTeam;
        cfg.buildSettings['CODE_SIGN_IDENTITY'] = '"Apple Distribution"';
        cfg.buildSettings['PROVISIONING_PROFILE'] = '98044b0e-eb6b-4771-885c-3f63ef32bca3';
        cfg.buildSettings['CODE_SIGN_ENTITLEMENTS'] =
          '"ShareExtension/ShareExtension.entitlements"';
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
