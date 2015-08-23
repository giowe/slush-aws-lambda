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
    fs = require('fs');


gulp.task('default', function (done) {
    inquirer.prompt([
        {type: 'input', name: 'project_name', message: 'Project name:', default: 'slush-jade-stylus-project'},
        {type: 'input', name: 'project_version', message: 'Project version:', default: '0.0.0'},
        {type: 'input', name: 'project_description', message: 'Project description:'},
        {type: 'input', name: 'project_author_name', message: 'Project author name:'},
        {type: 'input', name: 'project_author_email', message: 'Project author email:'},
        {type: 'input', name: 'project_author_email', message: 'Project license:', default: "MIT"},
        {type: 'input', name: 'project_s3_buket', message: 'Project AWS s3 buket name (to store distributable .zip pakage file):'},
        {type: 'input', name: 'project_webserver_port', message: 'Project webserver port:', default: "8080"}
    ],
    function (answers) {
        var folderName = answers.project_name;
        fs.mkdirSync(folderName);

        function createDirectory(folders){
            for(var i = 0; i < folders.length; i++){
                fs.mkdirSync(folderName + '/' + folders[i])
            }   
        }

        createDirectory([
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
        ]);

        gulp.src(__dirname + '/templates/.gitignore').pipe(gulp.dest(folderName));
        gulp.src(__dirname + '/templates/gulpfile.js').pipe(gulp.dest(folderName));
        gulp.src(__dirname + '/templates/src/**/*').pipe(gulp.dest(folderName + '/src/'));

        gulp.src(__dirname + '/templates/package.json')
            .pipe(replace(/%name%/g, answers.project_name))
            .pipe(replace(/%version%/g, answers.project_version))
            .pipe(replace(/%description%/g, answers.project_description))
            .pipe(replace(/%author_name%/g, answers.project_author_name))
            .pipe(replace(/%author_email%/g, answers.project_author_email))
            .pipe(replace(/%license%/g, answers.project_license))
            .pipe(replace(/%s3_buket%/g, answers.project_s3_buket))
            .pipe(replace(/%webserver_port%/g, answers.project_webserver_port))
            .pipe(gulp.dest(folderName)).pipe(install());
    });
});