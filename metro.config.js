const { getDefaultConfig } = require("expo/metro-config");
const { withUniwindConfig } = require("uniwind/metro");

const config = getDefaultConfig(__dirname);

// Add .bin and .mil extensions for whisper.rn model files
config.resolver.assetExts = [...config.resolver.assetExts, "bin", "mil"];

module.exports = withUniwindConfig(config, {
  cssEntryFile: "./global.css",
});
