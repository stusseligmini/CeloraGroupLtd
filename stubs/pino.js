// Lightweight pino stub to avoid pulling in thread-stream & test dependencies.
// Provides a minimal interface used by downstream WalletConnect packages.
function pino() {
  return console; // info, warn, error, debug pass through
}

pino.transport = function transport() {
  return {}; // No-op transport configuration
};

// Support common usage patterns
pino.levels = { values: { info: 30, warn: 40, error: 50, debug: 20 } };

module.exports = pino;
module.exports.default = pino;
