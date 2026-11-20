package com.offlinemate.windowposture

import android.app.Activity
import androidx.window.layout.FoldingFeature
import androidx.window.layout.WindowInfoTracker
import androidx.window.layout.WindowLayoutInfo
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition
import kotlinx.coroutines.Job
import kotlinx.coroutines.launch

/**
 * Reports folds and hinges in the app window (Jetpack WindowManager), so JS can keep content
 * off the hinge when a foldable is half-opened (book or tabletop posture).
 *
 * Bounds are in dp, relative to the app window, which is the same space as React Native's
 * window dimensions and `measureInWindow`.
 */
class WindowPostureModule : Module() {
  private var job: Job? = null
  private var trackedActivity: Activity? = null
  private var latest: Map<String, Any?> = mapOf("features" to emptyList<Map<String, Any?>>())

  override fun definition() = ModuleDefinition {
    Name("OfflineMateWindowPosture")

    Events("onChange")

    Function("getState") { latest }

    OnCreate { track() }
    OnActivityEntersForeground { track() }
    OnActivityDestroys { untrack() }
    OnDestroy { untrack() }
  }

  private fun track() {
    val activity = appContext.currentActivity ?: return
    if (activity === trackedActivity && job?.isActive == true) return
    untrack()
    trackedActivity = activity
    job = appContext.mainQueue.launch {
      WindowInfoTracker.getOrCreate(activity).windowLayoutInfo(activity).collect { info ->
        latest = toState(activity, info)
        sendEvent("onChange", latest)
      }
    }
  }

  private fun untrack() {
    job?.cancel()
    job = null
    trackedActivity = null
  }

  private fun toState(activity: Activity, info: WindowLayoutInfo): Map<String, Any?> {
    val density = activity.resources.displayMetrics.density
    val features = info.displayFeatures.filterIsInstance<FoldingFeature>().map { f ->
      val b = f.bounds
      mapOf(
        "state" to if (f.state == FoldingFeature.State.HALF_OPENED) "halfOpened" else "flat",
        "orientation" to if (f.orientation == FoldingFeature.Orientation.VERTICAL) "vertical" else "horizontal",
        "isSeparating" to f.isSeparating,
        "occludesContent" to (f.occlusionType == FoldingFeature.OcclusionType.FULL),
        "x" to b.left / density,
        "y" to b.top / density,
        "width" to b.width() / density,
        "height" to b.height() / density,
      )
    }
    return mapOf("features" to features)
  }
}
