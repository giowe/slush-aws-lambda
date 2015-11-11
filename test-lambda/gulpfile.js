'use strict';

require('colors');
var gulp = require('gulp'),
    del = require('del'),
    fs = require('fs'),
    path = require('path'),
    zip = require('gulp-zip'),
    uglify = require('gulp-uglify'),
    inquirer = require('inquirer'),
    AWS = require('aws-sdk');

try {
    var lambda_config = require(path.join(__dirname,'lambda_config.json'));
} catch(err) {
    lambda_config = null;
}

gulp.task("default", ['configure'], function(){

});

gulp.task('clean', function(){
    del.sync(src[i]+'/dist', {force:true});
});

gulp.task('zip', function(next){
    gulp.src(["/src/**/*"])
        .pipe(zip(lambda_config.ConfigOptions.FunctionName+".zip"))
        .pipe(gulp.dest(src[i]+"/dist"))
});

gulp.task('build', function(next){

});

gulp.task('configure', function(){
    inquirer.prompt([
        {type: 'input', name: 'FunctionName', message: 'Function name:', default: lambda_config? lambda_config.ConfigOptions.FunctionName:'my-lambda'},
        {type: 'input', name: 'Region', message: 'Region:',  default: lambda_config? lambda_config.ConfigOptions.Region:"eu-west-1"},
        {type: 'input', name: 'Description', message: 'Description:',  default: lambda_config? lambda_config.ConfigOptions.Description:null},
        {type: 'input', name: 'Role', message: 'Role arn:',  default: lambda_config? lambda_config.ConfigOptions.Role:null},
        {type: 'input', name: 'Handler', message: 'Handler:',  default: lambda_config? lambda_config.ConfigOptions.Handler:"index.js"},
        {type: 'input', name: 'MemorySize', message: 'MemorySize:',  default: lambda_config? lambda_config.ConfigOptions.MemorySize:"128"},
        {type: 'input', name: 'Timeout', message: 'Timeout:',  default: lambda_config? lambda_config.ConfigOptions.Timeout:"3"}
    ], function (config_answers) {
        lambda_config = {
            Region: config_answers.Region,
            ConfigOptions: {
                FunctionName: config_answers.FunctionName,
                Description: config_answers.Description,
                Role: config_answers.Role,
                Handler: config_answers.Handler,
                MemorySize: config_answers.MemorySize,
                Timeout: config_answers.Timeout,
                Runtime: 'nodejs'
            }
        };

        fs.writeFile(__dirname + '/lambda_config.json', JSON.stringify(lambda_config, null, 4), function (err) {
            if (err) console.log(err.red);
            else console.log('\n',lambda_config,'\n\n',"Lambda configuration saved.".green);
        });
    });
});

gulp.task("create", function(){
    checkConfig();
    var params = lambda_config.ConfigOptions;
    var lambda = new AWS.Lambda({ region: lambda_config.Region });
    params.Code = {
        ZipFile: fs.readFileSync(src[i]+"/dist/"+config[i].FunctionName+".zip")
    };

    lambda.createFunction(params, function(err, data) {
        if (err){
            console.log("FAILED".red, "-", err.message.red);
            console.log(err, err.stack);
        }
        else console.log("SUCCESS".green, "- lambda", data.FunctionName.cyan, "created");
    });
});

gulp.task("update", ["update-config","update-code"]);

gulp.task("update-config", function(){
    checkConfig();
    var lambda = new AWS.Lambda({ region: lambda_config.Region });

    lambda.updateFunctionConfiguration(lambda_config.ConfigOptions, function(err, data) {
        if (err){
            console.log("FAILED".red, "-", err.message.red);
            console.log(err, err.stack);
        }
        else {
            console.log("SUCCESS".green, "- lambda", data.FunctionName.cyan, "config updated");
            console.log(data);
        }
    });
});

gulp.task("update-code", function(){
    var params = {
        FunctionName: lambda_config.ConfigOptions.FunctionName,
        ZipFile: fs.readFileSync(src[i]+"/dist/"+config[i].FunctionName+".zip")
    };
    lambda.updateFunctionCode(params, function(err, data) {
        if (err){
            console.log("FAILED".red, "-", err.message.red);
            console.log(err, err.stack);
        }
        else {
            console.log("SUCCESS".green, "- lambda", data.FunctionName.cyan, "code updated");
            console.log(data);
        }
    });
});

gulp.task('delete', function(){
    checkConfig();
    var lambda = new AWS.Lambda({ region: lambda_config.Region });
    lambda.deleteFunction({ FunctionName: lambda_config.ConfigOptions.FunctionName }, function(err) {
        if (err){
            console.log("FAILED".red, "-", err.message.red);
            console.log(err);
        }
        else {
            console.log("SUCCESS".green, "- lambda deleted");
        }
    });
});

function checkConfig(){
    if (!lambda_config) {
        console.log("lambda_config.json".red, "not found!", '\nRun "' + "gulp configure".cyan + '" task to set up your lambda details.' )
        process.exit();
    }
}