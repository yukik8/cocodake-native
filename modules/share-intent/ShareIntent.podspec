Pod::Spec.new do |s|
  s.name           = 'ShareIntent'
  s.version        = '1.0.0'
  s.summary        = 'Reads pending share URL from App Group UserDefaults'
  s.authors        = { 'MapShare' => 'dev@mapshare.app' }
  s.homepage       = 'https://github.com/mapshare/share-intent'
  s.license        = { :type => 'MIT' }
  s.platform       = :ios, '15.1'
  s.source         = { :git => 'https://github.com/mapshare/share-intent.git', :tag => s.version.to_s }
  s.static_framework = true

  s.dependency 'ExpoModulesCore'

  s.source_files = 'ios/**/*.{h,m,mm,swift}'
end
