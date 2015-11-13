var AWS = require('aws-sdk');

exports.handler = function(params, context) {
    context.succeed(params);
};