package com.offlinemate.openmpenv

import android.app.Application
import android.content.Context
import android.system.ErrnoException
import android.system.Os
import android.util.Log
import expo.modules.core.interfaces.ApplicationLifecycleListener
import expo.modules.core.interfaces.Package

/**
 * Sets OpenMP environment variables when the app process starts, before react-native-executorch
 * loads libRnExecutorch.so (that happens later, the first time JS touches the ExecuTorch module).
 *
 * libRnExecutorch.so bundles LLVM's OpenMP runtime, and a static constructor calls
 * omp_get_max_threads() as the library loads. That makes OpenMP detect the CPU layout. On
 * ChromeOS (Android apps run in the ARCVM virtual machine, e.g. Intel Jasper Lake Chromebooks)
 * the virtual CPU reports a layout with no core or thread level, OpenMP's
 * kmp_topology_t::_set_globals() assertion fails and the process aborts with no error shown.
 *
 * KMP_TOPOLOGY_METHOD=flat makes OpenMP treat every CPU as its own package/core/thread instead of
 * reading CPUID. The layout only matters for thread pinning, which OpenMP doesn't do by default,
 * so thread counts and speed stay the same.
 */
class OpenMpEnvPackage : Package {
  override fun createApplicationLifecycleListeners(context: Context): List<ApplicationLifecycleListener> =
    listOf(
      object : ApplicationLifecycleListener {
        override fun onCreate(application: Application) {
          applyOpenMpEnv()
        }
      },
    )
}

internal const val TAG = "OfflineMateOpenMP"

internal fun applyOpenMpEnv() {
  try {
    // overwrite = false: a value set some other way (for example while debugging) wins.
    Os.setenv("KMP_TOPOLOGY_METHOD", "flat", false)
    Log.i(TAG, "KMP_TOPOLOGY_METHOD=${Os.getenv("KMP_TOPOLOGY_METHOD")}")
  } catch (e: ErrnoException) {
    Log.w(TAG, "Could not set OpenMP environment", e)
  }
}
