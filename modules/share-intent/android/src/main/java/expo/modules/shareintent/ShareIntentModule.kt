package expo.modules.shareintent

import android.content.Context
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition

class ShareIntentModule : Module() {
  override fun definition() = ModuleDefinition {
    Name("ShareIntent")

    AsyncFunction("getAndClearPendingUrl") {
      val context = appContext.reactContext ?: return@AsyncFunction null
      val prefs = context.getSharedPreferences("share_intent", Context.MODE_PRIVATE)
      val url = prefs.getString("pending_url", null)
      if (url != null) {
        prefs.edit().remove("pending_url").apply()
      }
      url
    }
  }
}
