module.exports = function offMainThreadStub() {
    return {
        name: 'off-main-thread-stub',
        resolveId() {
            return null;
        },
        load() {
            return null;
        },
    };
};

module.exports.default = module.exports;

