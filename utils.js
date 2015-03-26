module.exports = {
    isEmptyObject: function(obj) {
        return !Object.keys(obj).length;
    },
    isUndefined: function(obj) {
        return typeof obj === 'undefined';
    }
};