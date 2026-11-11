Pod::Spec.new do |s|
  s.name           = 'OfflineMateAlarmKit'
  s.version        = '1.0.0'
  s.summary        = 'One-time AlarmKit alarms for OfflineMate (iOS 26+, no-op below).'
  s.description    = 'Local Expo module that schedules system alarms with AlarmKit on iOS 26 and newer.'
  s.license        = 'MIT'
  s.author         = 'OfflineMate'
  s.homepage       = 'https://github.com/KingPegasus/OfflineMate'
  # Same minimum as the app. AlarmKit is only used behind `#available(iOS 26.0, *)`.
  s.platforms      = { :ios => '17.0' }
  s.swift_version  = '5.9'
  s.source         = { git: '' }
  s.static_framework = true

  s.dependency 'ExpoModulesCore'
  # Weak-link so the app still launches on iOS 17-25, where AlarmKit doesn't exist.
  s.weak_frameworks = 'AlarmKit'

  s.pod_target_xcconfig = {
    'DEFINES_MODULE' => 'YES',
  }

  s.source_files = '**/*.swift'
end
