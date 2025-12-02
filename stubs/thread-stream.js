// Minimal stub for thread-stream so any direct import resolves safely.
module.exports = function ThreadStream() {
  return {
    write() {},
    end() {},
  };
};
module.exports.default = module.exports;
