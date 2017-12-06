const clc = require('cli-color');
const path = require('path');

module.exports = function(next){
  let lambda_config;
  try {
    lambda_config = require(path.join(__dirname, 'lambda-config.json'));
  } catch (err) {
    return console.log('WARNING! lambda config not found, run command', clc.cyan('gulp configure'));
  }

  let payload;
  try {
    payload = require('./test-payload.json');
  } catch (err) {
    return console.log('WARNING! "test-payload.json" not found!');
  }

  const fail = function(err) {
    console.log({ errorMessage: err });
    next();
    process.exit();
  };

  const succeed = function(data) {
    if(data) console.log(data);
    next();
    process.exit();
  };

  const done = function(err, data) {
    if (err) fail(err);
    else succeed(data);
    next();
    process.exit();
  };

  const context = {
    fail,
    succeed,
    done
  };

  const callback = function(err, data) {
    if (err) return fail(err);
    succeed(data);
  };

  const handler = lambda_config.ConfigOptions.Handler.split('.');
  const lambda = require(path.join(__dirname, 'src', handler[0]))[handler[1]];

  lambda(payload, context, callback);
};
