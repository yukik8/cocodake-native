import ExpoModulesCore

public class ShareIntentModule: Module {
  private let appGroupId = "group.com.cocodake.app"

  public func definition() -> ModuleDefinition {
    Name("ShareIntent")

    AsyncFunction("getAndClearPendingUrl") { () -> String? in
      guard let defaults = UserDefaults(suiteName: self.appGroupId) else { return nil }
      let url = defaults.string(forKey: "pendingShareUrl")
      if url != nil {
        defaults.removeObject(forKey: "pendingShareUrl")
        defaults.synchronize()
      }
      return url
    }

    AsyncFunction("setPlaceData") { (ids: [String], urls: [String]) in
      guard let defaults = UserDefaults(suiteName: self.appGroupId) else { return }
      defaults.set(ids, forKey: "cachedPlaceIds")
      defaults.set(urls, forKey: "cachedPlaceUrls")
      defaults.synchronize()
    }
  }
}
