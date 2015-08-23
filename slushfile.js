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
    inquirer = require('inquirer'),
    fs = require('fs');


gulp.task('default', function (done) {
    inquirer.prompt([
        {type: 'input', name: 'project_name', message: 'Project name:', default: 'slush-jade-stylus-project'}
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
            'src/fonts'
        ]);
    });
});