/*
 * slush-jade-stylus
 * https://github.com/SoluzioniFutura/slush-jade-stylus
 *
 * Copyright (c) 2015, Giovanni Bruno
 * Licensed under the MIT license.
 */

'use strict';

var gulp = require('gulp'),
    install = require('gulp-install'),
    replace = require('gulp-replace'),
    inquirer = require('inquirer'),
    del = require('del'),
    colors = require('colors'),
    fs = require('fs');

gulp.task('default', function (done) {
    inquirer.prompt([
        {type: 'input', name: 'project_name', message: 'Project name:', default: 'slush-jade-stylus-project'},
        {type: 'input', name: 'project_version', message: 'Project version:', default: '0.0.0'},
        {type: 'input', name: 'project_description', message: 'Project description:'},
        {type: 'input', name: 'project_author_name', message: 'Project author name:'},
        {type: 'input', name: 'project_author_email', message: 'Project author email:'},
        {type: 'input', name: 'project_repo_type', message: 'Project repo type:', default: 'git'},
        {type: 'input', name: 'project_repo_url', message: 'Project repo url:'},
        {type: 'input', name: 'project_author_email', message: 'Project author email:'},
        {type: 'input', name: 'project_license', message: 'Project license:', default: "MIT"},
        {type: 'input', name: 'project_s3_bucket', message: 'Project AWS s3 bucket name (in case you want to store distributable .zip package file):'},
        {type: 'input', name: 'project_webserver_port', message: 'Project webserver port:', default: "8080"}
    ], function (project_answers) {
        var folderName = project_answers.project_name;
        var folders = [
            'src',
            'src/views',
            'src/views/pages',
            'src/views/includes',
            'src/styles/',
            'src/styles/vendor',
            'src/styles/blocks',
            'src/scripts',
            'src/scripts/vendor',
            'src/fonts',
            'src/images'
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
                    console.log("["+"!".red +"]", "Scaffolding process aborted.")
                }
            })
        }
    });
});