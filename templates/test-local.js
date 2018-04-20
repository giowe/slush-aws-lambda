const clc = require('cli-color');
const path = require('path');

module.exports = next => {
  let lambdaConfig;
  try {
    lambdaConfig = require(path.join(__dirname, 'lambda-config.js'));
  } catch (err) {
    return console.log('WARNING! lambda config not found, run command', clc.cyan('gulp configure'));
  }
  const { Handler, Environment } = lambdaConfig.ConfigOptions;

  let payload;
  try {
    payload = require('./test-payload.json');
  } catch (err) {
    return console.log('WARNING! "test-payload.json" not found!');
  }

  const fail = err => {
    console.log({ errorMessage: err });
    next();
    process.exit();
  };

  const succeed = data => {
    if(data) console.log(data);
    next();
    process.exit();
  };

  const done = (err, data) => {
    if (err) fail(err);
    else succeed(data);
    next();
    process.exit();
  };

  const context = { fail, succeed, done };

  const callback = (err, data) => {
    if (err) return fail(err);
    succeed(data);
  };

  const handler = Handler.split('.');
  if (Environment && Environment.Variables) {
    Object.assign(process.env, Environment.Variables);
  }
  const lambda = require(path.join(__dirname, 'src', handler[0]))[handler[1]];

  lambda(payload, context, callback);
};
