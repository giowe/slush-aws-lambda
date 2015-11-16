'use strict';

require('colors');
var gulp = require('gulp'),
    data = require('gulp-data'),
    fs = require('fs'),
    path = require('path'),
    zip = require('gulp-zip'),
    uglify = require('gulp-uglify'),
    filter = require('gulp-filter'),
    inquirer = require('inquirer'),
    AWS = require('aws-sdk');

try {
    var lambda_config = require(path.join(__dirname,'lambda_config.json'));
} catch(err) {
    lambda_config = null;
}

gulp.task("default", ['configure']);

gulp.task('configure', function(next){
    inquirer.prompt([
        {type: 'input', name: 'FunctionName', message: 'Function name:', default: lambda_config? lambda_config.ConfigOptions.FunctionName:'my-lambda'},
        {type: 'input', name: 'Region', message: 'Region:',  default: lambda_config? lambda_config.Region:"eu-west-1"},
        {type: 'input', name: 'Description', message: 'Description:',  default: lambda_config? lambda_config.ConfigOptions.Description:null},
        {type: 'input', name: 'Role', message: 'Role arn:',  default: lambda_config? lambda_config.ConfigOptions.Role:null},
        {type: 'input', name: 'Handler', message: 'Handler:',  default: lambda_config? lambda_config.ConfigOptions.Handler:"index.handler"},
        {type: 'input', name: 'MemorySize', message: 'MemorySize:',  default: lambda_config? lambda_config.ConfigOptions.MemorySize:"128"},
        {type: 'input', name: 'Timeout', message: 'Timeout:',  default: lambda_config? lambda_config.ConfigOptions.Timeout:"3"}
    ], function (config_answers) {
        lambda_config = {
            Region: config_answers.Region,
            Runtime: 'nodejs',
            ConfigOptions: {
                FunctionName: config_answers.FunctionName,
                Description: config_answers.Description,
                Role: config_answers.Role,
                Handler: config_answers.Handler,
                MemorySize: config_answers.MemorySize,
                Timeout: config_answers.Timeout
            }
        };

        var lambdaPackage = require(path.join(__dirname,'src/package.json'));
        lambdaPackage.name = config_answers.FunctionName;
        lambdaPackage.description = config_answers.Description;
        fs.writeFileSync(__dirname + '/src/package.json', JSON.stringify(lambdaPackage, null, 4));
        fs.writeFileSync(__dirname + '/lambda_config.json', JSON.stringify(lambda_config, null, 4));
        console.log('\n',lambda_config,'\n\n',"Lambda configuration saved.".green);

        next();
    });
});

gulp.task("create", function(next){
    checkConfig();

    buildLambdaZip(function(zip){
        var params = lambda_config.ConfigOptions;
        var lambda = new AWS.Lambda({ region: lambda_config.Region });
        params.Code = { ZipFile: zip };
        params.Runtime = lambda_config.Runtime;

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
    var lambda = new AWS.Lambda({ region: lambda_config.Region });

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
        var lambda = new AWS.Lambda({ region: lambda_config.Region });
        var params = {
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
    var lambda = new AWS.Lambda({ region: lambda_config.Region });
    lambda.deleteFunction({ FunctionName: lambda_config.ConfigOptions.FunctionName }, function(err) {
        if (err){
            console.log("FAILED".red, "-", err.message.red);
            console.log(err);
        }
        else console.log("SUCCESS".green, "- lambda deleted");

        next();
    });
});

function checkConfig(){
    if (!lambda_config) {
        console.log("lambda_config.json".red, "not found!", '\nRun "' + "gulp configure".cyan + '" task to set up your lambda details.' );
        process.exit();
    }
}

function buildLambdaZip(next){
    var jsFilter = filter('**/*.js', {restore:true});
    gulp.src("src/**/*")
        .pipe(jsFilter)
        .pipe(uglify())
        .pipe(jsFilter.restore)
        .pipe(zip(lambda_config.ConfigOptions.FunctionName+".zip"))
        .pipe(data(function(data) {
            next(data.contents);
        }));
}