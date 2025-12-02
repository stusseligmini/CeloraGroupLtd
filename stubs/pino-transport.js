// Stub for pino/lib/transport.js to avoid pulling in thread-stream.
module.exports = function transport() {
  return { targets: [] };
};
module.exports.default = module.exports;
