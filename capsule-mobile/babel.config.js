//  RIGHT
module.exports = function (api) {
  api.cache(true);
  return {
    presets: [
      ["babel-preset-expo", { jsxImportSource: "nativewind" }]
    ],
    plugins: [
      // Keep any other actual plugins here (like reanimated), 
      // but do NOT put nativewind/babel here!
    ],
  };
};