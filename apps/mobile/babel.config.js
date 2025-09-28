// apps/mobile/babel.config.js
module.exports = function (api) {
  api.cache(true);
  return {
    presets: ["babel-preset-expo"], // expo-router is included via the preset on SDK 50
    // plugins: []                  // keep empty for the first test
  };
};
