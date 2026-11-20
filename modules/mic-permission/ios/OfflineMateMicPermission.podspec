Pod::Spec.new do |s|
  s.name           = 'OfflineMateMicPermission'
  s.version        = '1.0.0'
  s.summary        = 'Microphone (record) permission check and request for OfflineMate voice input.'
  s.description    = 'Local Expo module that reads and asks for record permission with AVAudioApplication.'
  s.license        = 'MIT'
  s.author         = 'OfflineMate'
  s.homepage       = 'https://github.com/KingPegasus/OfflineMate'
  # Same minimum as the app; AVAudioApplication's record permission API is iOS 17+.
  s.platforms      = { :ios => '17.0' }
  s.swift_version  = '5.9'
  s.source         = { git: '' }
  s.static_framework = true

  s.dependency 'ExpoModulesCore'
  s.frameworks = 'AVFAudio'

  s.pod_target_xcconfig = {
    'DEFINES_MODULE' => 'YES',
  }

  s.source_files = '**/*.swift'
end
