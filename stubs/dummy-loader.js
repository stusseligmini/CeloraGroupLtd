// Simple webpack loader that replaces module content with an empty export.
module.exports = function () {
  return 'module.exports = {};';
};
