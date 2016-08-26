'use strict';

require('colors');
const gulp     = require('gulp');
const data     = require('gulp-data');
const fs       = require('fs');
const path     = require('path');
const zip      = require('gulp-zip');
const filter   = require('gulp-filter');
const inquirer = require('inquirer');
const AWS      = require('aws-sdk');

let CwLogs;
let lambda_config;

try {
  lambda_config = require(path.join(__dirname,'lambda_config.json'));
  CwLogs = require('./cw-logs');
} catch(err) {
  if (process.argv[2] && process.argv[2] !== "configure") {
    console.log('WARNING! lambda config not found, run command "gulp configure"');
    process.exit();
  }
  lambda_config = null;
}

gulp.task("default", ['configure']);

gulp.task('configure', function(){
  inquirer.prompt([
    {type: 'input', name: 'FunctionName', message: 'Function name:', default: lambda_config? lambda_config.ConfigOptions.FunctionName:'my-lambda'},
    {type: 'input', name: 'Region', message: 'Region:',  default: lambda_config? lambda_config.Region:"eu-west-1"},
    {type: 'input', name: 'Description', message: 'Description:',  default: lambda_config? lambda_config.ConfigOptions.Description:null},
    {type: 'input', name: 'Role', message: 'Role arn:',  default: lambda_config? lambda_config.ConfigOptions.Role:null},
    {type: 'input', name: 'Handler', message: 'Handler:',  default: lambda_config? lambda_config.ConfigOptions.Handler:"index.handler"},
    {type: 'input', name: 'MemorySize', message: 'MemorySize:',  default: lambda_config? lambda_config.ConfigOptions.MemorySize:"128"},
    {type: 'input', name: 'Timeout', message: 'Timeout:',  default: lambda_config? lambda_config.ConfigOptions.Timeout:"3"},
    {type: 'input', name: 'Runtime', message: 'Runtime:',  default: lambda_config? lambda_config.ConfigOptions.Timeout:"nodejs4.3"}
  ]).then( function (config_answers) {
    lambda_config = {
      Region: config_answers.Region,
      ConfigOptions: {
        FunctionName: config_answers.FunctionName,
        Description: config_answers.Description,
        Role: config_answers.Role,
        Handler: config_answers.Handler,
        MemorySize: config_answers.MemorySize,
        Timeout: config_answers.Timeout,
        Runtime: config_answers.Runtime
      }
    };

    const lambdaPackage = require(path.join(__dirname,'src/package.json'));
    lambdaPackage.name = config_answers.FunctionName;
    lambdaPackage.description = config_answers.Description;
    fs.writeFileSync(__dirname + '/src/package.json', JSON.stringify(lambdaPackage, null, 4));
    fs.writeFileSync(__dirname + '/lambda_config.json', JSON.stringify(lambda_config, null, 4));
    console.log('\n',lambda_config,'\n\n',"Lambda configuration saved.".green);
  });
});

gulp.task("create", function(next){
  checkConfig();

  buildLambdaZip(function(zip){
    const params = lambda_config.ConfigOptions;
    const lambda = new AWS.Lambda({ region: lambda_config.Region });
    params.Code = { ZipFile: zip };

    lambda.createFunction(params, function(err, data) {
      if (err){
        console.log("FAILED".red, "-", err.message.red);
        console.log(err);
      }
      else console.log("SUCCESS".green, "- lambda", data.FunctionName.cyan, "created");
      next();
    });
  });
});

gulp.task("update", ["update-config","update-code"]);

gulp.task("update-config", function(next){
  checkConfig();
  const lambda = new AWS.Lambda({ region: lambda_config.Region });

  lambda.updateFunctionConfiguration(lambda_config.ConfigOptions, function(err, data) {
    if (err){
      console.log("FAILED".red, "-", err.message.red);
      console.log(err);
    }
    else {
      console.log("SUCCESS".green, "- lambda", data.FunctionName.cyan, "config updated");
      console.log(data);
    }
    next();
  });
});

gulp.task("update-code", function(next){
  buildLambdaZip(function(zip) {
    const lambda = new AWS.Lambda({ region: lambda_config.Region });
    const params = {
      FunctionName: lambda_config.ConfigOptions.FunctionName,
      ZipFile: zip
    };
    lambda.updateFunctionCode(params, function(err, data) {
      if (err){
        console.log("FAILED".red, "-", err.message.red);
        console.log(err);
      }
      else {
        console.log("SUCCESS".green, "- lambda", data.FunctionName.cyan, "code updated");
        console.log(data);
      }
      next();
    });
  });
});

gulp.task('delete',function(next){
  checkConfig();
  const lambda = new AWS.Lambda({ region: lambda_config.Region });
  lambda.deleteFunction({ FunctionName: lambda_config.ConfigOptions.FunctionName }, function(err) {
    if (err){
      console.log("FAILED".red, "-", err.message.red);
      console.log(err);
    }
    else console.log("SUCCESS".green, "- lambda deleted");

    next();
  });
});

gulp.task('logs', function(){
  setInterval(CwLogs.printLogs, 2000);
});

function checkConfig(){
  if (!lambda_config) {
    console.log("lambda_config.json".red, "not found!", '\nRun "' + "gulp configure".cyan + '" task to set up your lambda details.' );
    process.exit();
  }
}

function buildLambdaZip(next){
  const jsFilter = filter('**/*.js', {restore:true});
  gulp.src("src/**/*")
    .pipe(jsFilter)
    .pipe(jsFilter.restore)
    .pipe(zip(lambda_config.ConfigOptions.FunctionName+".zip"))
    .pipe(data(function(data) {
      next(data.contents);
    }));
}
