const { getDefaultConfig } = require('expo/metro-config');

/** @type {import('expo/metro/config').MetroConfig} */
const config = getDefaultConfig(__dirname);

config.resolver.unstable_enablePackageExports = false;

// Add support for react-native-reanimated
config.transformer.babelTransformerPath = require.resolve('react-native-reanimated/plugin');

module.exports = config; 