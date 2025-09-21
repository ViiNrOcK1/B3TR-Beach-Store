module.exports = function override(config) {
  // Suppress source map warnings for specific modules
  config.module.rules.forEach((rule) => {
    if (rule.loader && rule.loader.includes('source-map-loader')) {
      rule.exclude = [
        /@vechain\/picasso/,
        /@vechain\/sdk-core/,
        /@vechain\/sdk-network/,
        /@walletconnect/
      ];
    }
  });
  // Suppress all source map warnings
  config.ignoreWarnings = config.ignoreWarnings || [];
  config.ignoreWarnings.push({
    message: /Failed to parse source map/
  });
  return config;
};