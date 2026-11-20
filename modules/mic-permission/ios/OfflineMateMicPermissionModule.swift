import AVFAudio
import ExpoModulesCore

/// Record permission for voice input. The audio stream library (react-native-audio-pcm-stream)
/// opens an AudioQueue without asking, so with the mic denied it just records silence and the app
/// said "No speech detected" instead of pointing to Settings. JS asks here first, on a mic press.
public class OfflineMateMicPermissionModule: Module {
  public func definition() -> ModuleDefinition {
    Name("OfflineMateMicPermission")

    /// "granted" | "denied" | "undetermined". Never prompts.
    Function("getStatus") { () -> String in
      switch AVAudioApplication.shared.recordPermission {
      case .granted:
        return "granted"
      case .denied:
        return "denied"
      default:
        return "undetermined"
      }
    }

    /// Shows the system prompt if the user hasn't answered yet; otherwise returns the saved answer.
    AsyncFunction("request") { () async -> Bool in
      await AVAudioApplication.requestRecordPermission()
    }
  }
}
