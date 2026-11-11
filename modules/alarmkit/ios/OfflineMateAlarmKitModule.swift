import ExpoModulesCore
#if canImport(AlarmKit)
import AlarmKit
import SwiftUI
#endif

/// Schedules one-time system alarms with AlarmKit (iOS 26+). They ring through silent mode and
/// Focus and show on the Lock Screen with a Stop button. On iOS 17-25 `isAvailable` is false and
/// the other functions report "unavailable", so JS falls back to reminders.
///
/// Alert-only on purpose: a snooze countdown needs a Live Activity widget extension.
public class OfflineMateAlarmKitModule: Module {
  public func definition() -> ModuleDefinition {
    Name("OfflineMateAlarmKit")

    Function("isAvailable") { () -> Bool in
      #if canImport(AlarmKit)
      if #available(iOS 26.0, *) {
        return true
      }
      #endif
      return false
    }

    /// "authorized" | "denied" | "notDetermined" | "unavailable". Prompts the first time.
    AsyncFunction("requestAuthorization") { () async -> String in
      #if canImport(AlarmKit)
      if #available(iOS 26.0, *) {
        return await OfflineMateAlarms.requestAuthorization()
      }
      #endif
      return "unavailable"
    }

    /// Schedules a one-time alarm and returns its id. Rejects if AlarmKit is unavailable,
    /// not authorized, or scheduling fails.
    AsyncFunction("scheduleAlarm") { (epochSeconds: Double, title: String, stopLabel: String) async throws -> String in
      #if canImport(AlarmKit)
      if #available(iOS 26.0, *) {
        return try await OfflineMateAlarms.schedule(epochSeconds: epochSeconds, title: title, stopLabel: stopLabel)
      }
      #endif
      throw AlarmKitUnavailableException()
    }
  }
}

final class AlarmKitUnavailableException: Exception, @unchecked Sendable {
  override var reason: String {
    "Alarms need iOS 26 or newer"
  }
}

final class AlarmKitNotAuthorizedException: Exception, @unchecked Sendable {
  override var reason: String {
    "Alarm permission is off. Turn it on in Settings > OfflineMate"
  }
}

#if canImport(AlarmKit)
@available(iOS 26.0, *)
struct OfflineMateAlarmMetadata: AlarmMetadata {}

@available(iOS 26.0, *)
enum OfflineMateAlarms {
  static func describe(_ state: AlarmManager.AuthorizationState) -> String {
    switch state {
    case .authorized: return "authorized"
    case .denied: return "denied"
    case .notDetermined: return "notDetermined"
    @unknown default: return "notDetermined"
    }
  }

  static func requestAuthorization() async -> String {
    let manager = AlarmManager.shared
    if manager.authorizationState != .notDetermined {
      return describe(manager.authorizationState)
    }
    do {
      return describe(try await manager.requestAuthorization())
    } catch {
      return "denied"
    }
  }

  static func schedule(epochSeconds: Double, title: String, stopLabel: String) async throws -> String {
    // JS asks for permission first (requestAuthorization); this only reads the saved state,
    // so scheduling doesn't make a second request to the alarm service.
    guard AlarmManager.shared.authorizationState == .authorized else {
      throw AlarmKitNotAuthorizedException()
    }

    let stopButton = AlarmButton(
      text: LocalizedStringResource(stringLiteral: stopLabel),
      textColor: .white,
      systemImageName: "stop.circle"
    )
    let alert = AlarmPresentation.Alert(
      title: LocalizedStringResource(stringLiteral: title),
      stopButton: stopButton
    )
    let attributes = AlarmAttributes<OfflineMateAlarmMetadata>(
      presentation: AlarmPresentation(alert: alert),
      metadata: OfflineMateAlarmMetadata(),
      tintColor: Color(red: 0.145, green: 0.388, blue: 0.922) // #2563eb, the app's accent
    )
    let configuration = AlarmManager.AlarmConfiguration<OfflineMateAlarmMetadata>(
      schedule: .fixed(Date(timeIntervalSince1970: epochSeconds)),
      attributes: attributes
    )

    let id = UUID()
    _ = try await AlarmManager.shared.schedule(id: id, configuration: configuration)
    return id.uuidString
  }
}
#endif
