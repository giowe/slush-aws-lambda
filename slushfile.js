/*
 * slush-jade-stylus
 * https://github.com/SoluzioniFutura/slush-jade-stylus
 *
 * Copyright (c) 2015, Giovanni Bruno
 * Licensed under the MIT license.
 */

'use strict';
require('colors');
var gulp = require('gulp'),
    install = require('gulp-install'),
    replace = require('gulp-replace'),
    inquirer = require('inquirer'),
    del = require('del'),
    fs = require('fs');

gulp.task('default', function (done) {

    try {
        var userDefaults = require('./user_defaults.json');
    } catch(err) {
        userDefaults = null;
    }

    inquirer.prompt([
        {type: 'input', name: 'project_name', message: 'Project name:', default: 'slush-jade-stylus-project'},
        {type: 'input', name: 'project_version', message: 'Project version:', default: '0.0.0'},
        {type: 'input', name: 'project_description', message: 'Project description:'},
        {type: 'input', name: 'project_author_name', message: 'Project author name:', default: userDefaults? userDefaults.project_author_name:null},
        {type: 'input', name: 'project_author_email', message: 'Project author email:', default: userDefaults? userDefaults.project_author_email : null}





    ], function (project_answers) {
		userDefaults = {
			project_author_name : project_answers.project_author_name,
			project_author_email : project_answers.project_author_email,
			project_repo_type : project_answers.project_repo_type
		};

        fs.writeFile(__dirname+'/user_defaults.json', JSON.stringify(userDefaults, null, 4), function(err) {
            if(err) console.log(err.red);
        });

        var folderName = project_answers.project_name;
        var folders = [
            'src'
        ];

        function scaffold() {
            fs.mkdirSync(folderName);
            for (var i = 0; i < folders.length; i++) {
                fs.mkdirSync(folderName + '/' + folders[i])
            }

            gulp.src(__dirname + '/templates/.gitignore').pipe(gulp.dest(folderName));
            gulp.src(__dirname + '/templates/gulpfile.js').pipe(gulp.dest(folderName));
            gulp.src(__dirname + '/templates/src/**/*').pipe(gulp.dest(folderName + '/src/'));
            gulp.src(__dirname + '/templates/package.json')
                .pipe(replace(/%name%/g, project_answers.project_name))
                .pipe(replace(/%version%/g, project_answers.project_version))
                .pipe(replace(/%description%/g, project_answers.project_description))
                .pipe(replace(/%author_name%/g, project_answers.project_author_name))
                .pipe(replace(/%author_email%/g, project_answers.project_author_email))
                .pipe(replace(/%repoType%/g, project_answers.project_repo_type))
                .pipe(replace(/%repoUrl%/g, project_answers.project_repo_url))
                .pipe(replace(/%license%/g, project_answers.project_license))
                .pipe(replace(/%s3_bucket%/g, project_answers.project_s3_bucket))
                .pipe(replace(/%webserver_port%/g, project_answers.project_webserver_port))
                .pipe(gulp.dest(folderName)).pipe(install());
            gulp.src(__dirname + '/templates/README.MD')
                .pipe(replace(/%name%/g, project_answers.project_name))
                .pipe(gulp.dest(folderName));
        }

        try {
            scaffold()
        } catch(err) {
            console.log("["+"!".red +"]", "'"+project_answers.project_name.cyan + "' folder already exists!");
            inquirer.prompt({ type: "confirm", name: 'delete_folder', message: 'Do you want to delete it and continue with the new project?:', default: false}, function(delete_answer){
                if (delete_answer.delete_folder){
                    del.sync(project_answers.project_name, {force:true});
                    scaffold();
                }
                else {
                    console.log("!".red, "Scaffolding process aborted.")
                }
            })
        }
    });
});