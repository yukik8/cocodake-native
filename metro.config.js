const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');

const config = getDefaultConfig(__dirname);

// expo/src/Expo.fx.tsx が expo-constants を import する際、
// Metro が expo/node_modules/expo-constants を参照してしまい ENOENT になる問題を修正
const originalResolveRequest = config.resolver.resolveRequest;

config.resolver.resolveRequest = (context, moduleName, platform) => {
  if (moduleName === 'expo-constants') {
    return {
      type: 'sourceFile',
      filePath: require.resolve('expo-constants'),
    };
  }
  if (originalResolveRequest) {
    return originalResolveRequest(context, moduleName, platform);
  }
  return context.resolveRequest(context, moduleName, platform);
};

module.exports = config;
