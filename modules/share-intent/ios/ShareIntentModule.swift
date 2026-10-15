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

    AsyncFunction("setUserSession") { (userId: String, apiUrl: String, accessToken: String) in
      guard let defaults = UserDefaults(suiteName: self.appGroupId) else { return }
      defaults.set(userId, forKey: "userId")
      defaults.set(apiUrl, forKey: "apiUrl")
      defaults.set(accessToken, forKey: "accessToken")
      defaults.synchronize()
    }

    AsyncFunction("clearUserSession") { () -> Void in
      guard let defaults = UserDefaults(suiteName: self.appGroupId) else { return }
      defaults.removeObject(forKey: "userId")
      defaults.removeObject(forKey: "accessToken")
      defaults.removeObject(forKey: "cachedPlaceIds")
      defaults.removeObject(forKey: "cachedPlaceUrls")
      defaults.synchronize()
    }

    AsyncFunction("setPlaceData") { (ids: [String], urls: [String]) in
      guard let defaults = UserDefaults(suiteName: self.appGroupId) else { return }
      defaults.set(ids, forKey: "cachedPlaceIds")
      defaults.set(urls, forKey: "cachedPlaceUrls")
      defaults.synchronize()
    }
  }
}
