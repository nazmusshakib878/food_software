const proxy = require('./_proxy');

module.exports = proxy;
module.exports.config = {
    api: {
        bodyParser: { sizeLimit: '4mb' }
    }
};
